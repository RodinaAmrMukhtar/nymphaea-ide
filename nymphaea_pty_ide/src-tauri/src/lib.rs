use portable_pty::{native_pty_system, Child, ChildKiller, CommandBuilder, MasterPty, PtySize, PtySystem};
use regex::Regex;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::{
    env,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter, State};
use tempfile::NamedTempFile;
use thiserror::Error;

#[derive(Default)]
struct SharedState {
    running: Mutex<Option<RunningSession>>,
}

#[derive(Default)]
struct AppState(Arc<SharedState>);

struct RunningSession {
    killer: Arc<Mutex<Box<dyn ChildKiller + Send + Sync>>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
}

#[derive(Debug, Error)]
enum IdeError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for IdeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
struct BootstrapInfo {
    cwd: String,
    detected_binary: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartRunRequest {
    mode: RunMode,
    code: String,
    file_path: Option<String>,
    workspace_root: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
enum RunMode {
    Normal,
    Vm,
    Interp,
    Both,
    Repl,
    Check,
    Tokens,
    Ast,
    Disasm,
    Trace,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcOutputEvent {
    stream: &'static str,
    text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcStartedEvent {
    command_line: String,
    binary_path: String,
    interactive: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcExitEvent {
    exit_code: Option<i32>,
    success: bool,
}

#[derive(Debug, Clone, Serialize)]
struct Problem {
    kind: String,
    line: Option<u32>,
    col: Option<u32>,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
struct SourceFile {
    path: String,
    contents: String,
}

#[derive(Debug, Clone, Serialize)]
struct SaveResult {
    path: String,
}

#[tauri::command]
fn get_bootstrap_info() -> Result<BootstrapInfo, IdeError> {
    let cwd = env::current_dir()?.display().to_string();
    let detected_binary = resolve_language_executable(None)
        .ok()
        .map(|path| path.display().to_string());

    Ok(BootstrapInfo {
        cwd,
        detected_binary,
    })
}

#[tauri::command]
fn choose_workspace_folder() -> Result<Option<String>, IdeError> {
    let picked = FileDialog::new().pick_folder();
    Ok(picked.map(|p| p.display().to_string()))
}

#[tauri::command]
fn open_source_file() -> Result<Option<SourceFile>, IdeError> {
    let Some(path) = FileDialog::new()
        .add_filter("Ny files", &["ny", "dil"])
        .pick_file()
    else {
        return Ok(None);
    };

    let contents = fs::read_to_string(&path)?;
    Ok(Some(SourceFile {
        path: path.display().to_string(),
        contents,
    }))
}

#[tauri::command]
fn save_source_file(path: Option<String>, contents: String) -> Result<Option<SaveResult>, IdeError> {
    let chosen_path = match path {
        Some(existing) => PathBuf::from(existing),
        None => {
            let Some(p) = FileDialog::new()
                .set_file_name("program.ny")
                .add_filter("Ny files", &["ny", "dil"])
                .save_file()
            else {
                return Ok(None);
            };
            p
        }
    };

    fs::write(&chosen_path, contents)?;

    Ok(Some(SaveResult {
        path: chosen_path.display().to_string(),
    }))
}

#[tauri::command]
fn send_stdin(text: String, state: State<'_, AppState>) -> Result<(), IdeError> {
    let shared = state.0.clone();
    let lock = shared.running.lock().map_err(lock_err)?;
    let Some(session) = lock.as_ref() else {
        return Err(IdeError::Message("No process is currently running".into()));
    };

    let mut writer = session.writer.lock().map_err(lock_err)?;
    writer.write_all(text.as_bytes())?;
    writer.flush()?;
    Ok(())
}

#[tauri::command]
fn resize_pty(cols: u16, rows: u16, state: State<'_, AppState>) -> Result<(), IdeError> {
    let shared = state.0.clone();
    let lock = shared.running.lock().map_err(lock_err)?;
    let Some(session) = lock.as_ref() else {
        return Ok(());
    };

    let master = session.master.lock().map_err(lock_err)?;
    master
        .resize(PtySize {
            rows: rows.max(2),
            cols: cols.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(anyhow_err)?;
    Ok(())
}

#[tauri::command]
fn stop_run(state: State<'_, AppState>) -> Result<(), IdeError> {
    let shared = state.0.clone();
    let lock = shared.running.lock().map_err(lock_err)?;
    let Some(session) = lock.as_ref() else {
        return Ok(());
    };

    let mut killer = session.killer.lock().map_err(lock_err)?;
    killer.kill()?;
    Ok(())
}

#[tauri::command]
fn start_run(app: AppHandle, state: State<'_, AppState>, request: StartRunRequest) -> Result<(), IdeError> {
    let shared = state.0.clone();
    {
        let lock = shared.running.lock().map_err(lock_err)?;
        if lock.is_some() {
            return Err(IdeError::Message("A Ny process is already running".into()));
        }
    }

    let workspace_root = request
        .workspace_root
        .as_deref()
        .map(PathBuf::from)
        .unwrap_or(env::current_dir()?);
    let binary = resolve_language_executable(Some(&workspace_root))?;
    let is_ny = binary
        .file_name()
        .and_then(|v| v.to_str())
        .map(|name| name.to_ascii_lowercase().starts_with("ny"))
        .unwrap_or(true);

    let source_path = if matches!(request.mode, RunMode::Repl) {
        None
    } else {
        Some(match request.file_path.clone() {
            Some(path) => {
                let p = PathBuf::from(path);
                fs::write(&p, request.code.as_bytes())?;
                p
            }
            None => {
                let mut temp = NamedTempFile::new_in(&workspace_root).or_else(|_| NamedTempFile::new())?;
                temp.write_all(request.code.as_bytes())?;
                let path = temp.path().with_extension("ny");
                temp.persist(&path).map_err(|e| IdeError::Io(e.error))?;
                path
            }
        })
    };

    let args = build_args(is_ny, request.mode, source_path.as_deref());
    let command_line = format!(
        "$ {} {}\r\n\r\n",
        binary.display(),
        args.iter()
            .map(|s| shell_quote(s))
            .collect::<Vec<_>>()
            .join(" ")
    );

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: request.rows.unwrap_or(28).max(2),
            cols: request.cols.unwrap_or(100).max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(anyhow_err)?;

    let mut cmd = CommandBuilder::new(&binary);
    cmd.args(&args);
    cmd.cwd(&workspace_root);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let mut child = pair.slave.spawn_command(cmd).map_err(anyhow_err)?;
    let killer = child.clone_killer();
    let reader = pair.master.try_clone_reader().map_err(anyhow_err)?;
    let writer = pair.master.take_writer().map_err(anyhow_err)?;
    let master = pair.master;

    let writer = Arc::new(Mutex::new(writer));
    let master = Arc::new(Mutex::new(master));
    let killer = Arc::new(Mutex::new(killer));
    let merged = Arc::new(Mutex::new(String::new()));

    let reader_handle = spawn_reader(reader, app.clone(), merged.clone());

    {
        let mut lock = shared.running.lock().map_err(lock_err)?;
        *lock = Some(RunningSession {
            killer: killer.clone(),
            writer: writer.clone(),
            master: master.clone(),
        });
    }

    app.emit(
        "proc-started",
        ProcStartedEvent {
            command_line: command_line.clone(),
            binary_path: binary.display().to_string(),
            interactive: is_interactive(request.mode),
        },
    )
    .map_err(|e| IdeError::Message(e.to_string()))?;

    app.emit(
        "proc-output",
        ProcOutputEvent {
            stream: "system",
            text: command_line,
        },
    )
    .map_err(|e| IdeError::Message(e.to_string()))?;

    let cleanup_state = shared.clone();
    let cleanup_request = request.clone();
    thread::spawn(move || {
        let status = child.wait();

        if let Ok(mut lock) = cleanup_state.running.lock() {
            *lock = None;
        }

        let _ = reader_handle.join();

        if cleanup_request.file_path.is_none() {
            if let Some(source_path) = source_path.as_ref() {
                let _ = fs::remove_file(source_path);
            }
        }

        let merged_text = merged.lock().ok().map(|s| s.clone()).unwrap_or_default();

        let problems = parse_problems(&merged_text);
        let _ = app.emit("proc-problems", problems);

        match status {
            Ok(status) => {
                let _ = app.emit(
                    "proc-exit",
                    ProcExitEvent {
                        exit_code: Some(i32::try_from(status.exit_code()).unwrap_or(i32::MAX)),
                        success: status.success(),
                    },
                );
            }
            Err(err) => {
                let _ = app.emit("proc-error", err.to_string());
            }
        }
    });

    Ok(())
}

fn build_args(is_ny: bool, mode: RunMode, source_path: Option<&Path>) -> Vec<String> {
    if is_ny {
        match mode {
            RunMode::Repl => vec!["repl".into()],
            RunMode::Normal => vec!["run".into(), source_path.expect("source path required").display().to_string()],
            RunMode::Vm => vec!["run".into(), source_path.expect("source path required").display().to_string(), "--vm".into()],
            RunMode::Interp => vec!["run".into(), source_path.expect("source path required").display().to_string(), "--interp".into()],
            RunMode::Both => vec!["run".into(), source_path.expect("source path required").display().to_string(), "--both".into()],
            RunMode::Check => vec!["check".into(), source_path.expect("source path required").display().to_string()],
            RunMode::Tokens => vec!["tokens".into(), source_path.expect("source path required").display().to_string()],
            RunMode::Ast => vec!["ast".into(), source_path.expect("source path required").display().to_string()],
            RunMode::Disasm => vec!["disasm".into(), source_path.expect("source path required").display().to_string()],
            RunMode::Trace => vec!["trace".into(), source_path.expect("source path required").display().to_string()],
        }
    } else {
        match mode {
            RunMode::Repl => vec!["--repl".into()],
            _ => {
                let mut args = vec![source_path.expect("source path required").display().to_string()];
                match mode {
                    RunMode::Normal => {}
                    RunMode::Vm => args.push("--vm".into()),
                    RunMode::Interp => args.push("--interp".into()),
                    RunMode::Both => args.push("--both".into()),
                    RunMode::Check => args.push("--check".into()),
                    RunMode::Tokens => args.push("--tokens".into()),
                    RunMode::Ast => args.push("--ast".into()),
                    RunMode::Disasm => args.push("--disasm".into()),
                    RunMode::Trace => args.push("--trace".into()),
                    RunMode::Repl => unreachable!(),
                }
                args
            }
        }
    }
}

fn is_interactive(mode: RunMode) -> bool {
    matches!(mode, RunMode::Normal | RunMode::Vm | RunMode::Interp | RunMode::Both | RunMode::Repl)
}

fn spawn_reader<R: Read + Send + 'static>(
    mut reader: R,
    app: AppHandle,
    merged: Arc<Mutex<String>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let mut buf = [0_u8; 4096];
        let mut pending: Vec<u8> = Vec::new();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    pending.extend_from_slice(&buf[..n]);
                    emit_utf8_chunks(&mut pending, &app, &merged);
                }
                Err(err) => {
                    let _ = app.emit("proc-error", format!("pty read failed: {err}"));
                    return;
                }
            }
        }

        if !pending.is_empty() {
            let text = String::from_utf8_lossy(&pending).to_string();
            push_output(&app, &merged, text);
        }
    })
}

fn emit_utf8_chunks(pending: &mut Vec<u8>, app: &AppHandle, merged: &Arc<Mutex<String>>) {
    loop {
        match std::str::from_utf8(pending) {
            Ok(text) => {
                if !text.is_empty() {
                    push_output(app, merged, text.to_string());
                }
                pending.clear();
                break;
            }
            Err(err) => {
                let valid_up_to = err.valid_up_to();
                if valid_up_to > 0 {
                    let text = String::from_utf8_lossy(&pending[..valid_up_to]).to_string();
                    push_output(app, merged, text);
                    pending.drain(..valid_up_to);
                    continue;
                }

                if let Some(error_len) = err.error_len() {
                    let text = String::from_utf8_lossy(&pending[..error_len]).to_string();
                    push_output(app, merged, text);
                    pending.drain(..error_len);
                    continue;
                }

                break;
            }
        }
    }
}

fn push_output(app: &AppHandle, merged: &Arc<Mutex<String>>, text: String) {
    if text.is_empty() {
        return;
    }
    if let Ok(mut all) = merged.lock() {
        all.push_str(&text);
    }
    let _ = app.emit(
        "proc-output",
        ProcOutputEvent {
            stream: "stdout",
            text,
        },
    );
}

fn resolve_language_executable(workspace_root: Option<&Path>) -> Result<PathBuf, IdeError> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(explicit) = env::var("NY_BIN") {
        let p = PathBuf::from(explicit);
        if is_executable(&p) {
            return Ok(p);
        }
    }

    if let Some(root) = workspace_root {
        candidates.push(root.join("ny"));
        candidates.push(root.join("ny.exe"));
        candidates.push(root.join("dil"));
        candidates.push(root.join("dil.exe"));
    }

    if let Ok(current) = env::current_dir() {
        candidates.push(current.join("ny"));
        candidates.push(current.join("ny.exe"));
        candidates.push(current.join("dil"));
        candidates.push(current.join("dil.exe"));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    candidates.extend(find_sidecar_candidates(&manifest_dir.join("binaries")));

    if let Ok(exe) = env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.extend(find_sidecar_candidates(parent));
            candidates.extend(find_sidecar_candidates(&parent.join("../lib")));
            candidates.extend(find_sidecar_candidates(&parent.join("../Resources")));
        }
    }

    for candidate in candidates {
        if is_executable(&candidate) {
            return Ok(candidate);
        }
    }

    if let Some(path_hit) = find_on_path(&["ny", "dil"]) {
        return Ok(path_hit);
    }

    Err(IdeError::Message(
        "Could not find ny or dil. Set NY_BIN, launch from your language repo root, or copy the binary into src-tauri/binaries/".into(),
    ))
}

fn find_sidecar_candidates(dir: &Path) -> Vec<PathBuf> {
    if !dir.exists() {
        return Vec::new();
    }

    let names = [
        "ny",
        "ny.exe",
        "dil",
        "dil.exe",
        "ny-x86_64-unknown-linux-gnu",
        "ny-aarch64-unknown-linux-gnu",
        "ny-x86_64-apple-darwin",
        "ny-aarch64-apple-darwin",
        "ny-x86_64-pc-windows-msvc.exe",
        "dil-x86_64-unknown-linux-gnu",
        "dil-aarch64-unknown-linux-gnu",
        "dil-x86_64-apple-darwin",
        "dil-aarch64-apple-darwin",
        "dil-x86_64-pc-windows-msvc.exe",
    ];

    names.iter().map(|name| dir.join(name)).collect()
}

fn find_on_path(names: &[&str]) -> Option<PathBuf> {
    let path_var = env::var_os("PATH")?;
    env::split_paths(&path_var)
        .flat_map(|dir| names.iter().map(move |name| dir.join(name)))
        .find(|candidate| is_executable(candidate))
}

fn is_executable(path: &Path) -> bool {
    path.is_file()
}

fn parse_problems(text: &str) -> Vec<Problem> {
    let ansi = Regex::new(r"\x1b\[[0-9;?]*[ -/]*[@-~]").unwrap();
    let sanitized = ansi.replace_all(text, "");

    let location_line = Regex::new(r"(?i)^([^:\n]+):(\d+):(\d+):\s*(.+)$").unwrap();
    let old_parse = Regex::new(r"^Parse error at line (\d+), col (\d+):\s*(.+)$").unwrap();
    let prefixed = Regex::new(r"(?i)^(runtime error|type error|parse error):\s*([^:\n]+):(\d+):(\d+):\s*(.+)$").unwrap();
    let mut out = Vec::new();

    for raw_line in sanitized.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        if let Some(caps) = prefixed.captures(line) {
            let prefix = caps
                .get(1)
                .map(|m| m.as_str().to_ascii_lowercase())
                .unwrap_or_default();
            let kind = if prefix.contains("runtime") {
                "Runtime"
            } else if prefix.contains("type") {
                "Type"
            } else {
                "Parse"
            };
            out.push(Problem {
                kind: kind.into(),
                line: caps.get(3).and_then(|m| m.as_str().parse::<u32>().ok()),
                col: caps.get(4).and_then(|m| m.as_str().parse::<u32>().ok()),
                message: caps
                    .get(5)
                    .map(|m| m.as_str().trim().to_string())
                    .unwrap_or_default(),
            });
            continue;
        }

        if let Some(caps) = location_line.captures(line) {
            let lower = line.to_ascii_lowercase();
            if lower.contains("parse error") || lower.contains("type error") || lower.contains("runtime error") {
                let kind = if lower.contains("type error") {
                    "Type"
                } else if lower.contains("runtime error") {
                    "Runtime"
                } else {
                    "Parse"
                };
                out.push(Problem {
                    kind: kind.into(),
                    line: caps.get(2).and_then(|m| m.as_str().parse::<u32>().ok()),
                    col: caps.get(3).and_then(|m| m.as_str().parse::<u32>().ok()),
                    message: caps
                        .get(4)
                        .map(|m| m.as_str().trim().to_string())
                        .unwrap_or_default(),
                });
                continue;
            }
        }

        if let Some(caps) = old_parse.captures(line) {
            out.push(Problem {
                kind: "Parse".into(),
                line: caps.get(1).and_then(|m| m.as_str().parse::<u32>().ok()),
                col: caps.get(2).and_then(|m| m.as_str().parse::<u32>().ok()),
                message: caps
                    .get(3)
                    .map(|m| m.as_str().trim().to_string())
                    .unwrap_or_default(),
            });
            continue;
        }

        if let Some(rest) = line.strip_prefix("Type error:") {
            out.push(Problem {
                kind: "Type".into(),
                line: None,
                col: None,
                message: rest.trim().into(),
            });
            continue;
        }

        if let Some(rest) = line.strip_prefix("Runtime error:") {
            out.push(Problem {
                kind: "Runtime".into(),
                line: None,
                col: None,
                message: rest.trim().into(),
            });
        }
    }

    out
}

fn shell_quote(value: &str) -> String {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || "-_=./".contains(c))
    {
        value.to_string()
    } else {
        format!("\"{}\"", value.replace('"', "\\\""))
    }
}

fn lock_err<T>(err: std::sync::PoisonError<T>) -> IdeError {
    IdeError::Message(format!("State lock poisoned: {err}"))
}

fn anyhow_err(err: impl std::fmt::Display) -> IdeError {
    IdeError::Message(err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            choose_workspace_folder,
            get_bootstrap_info,
            open_source_file,
            resize_pty,
            save_source_file,
            send_stdin,
            start_run,
            stop_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

