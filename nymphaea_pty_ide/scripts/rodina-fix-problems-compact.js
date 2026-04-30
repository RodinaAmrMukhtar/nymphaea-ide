const fs = require("fs");

function save(path, text) {
  fs.writeFileSync(path, text, "utf8");
}

function replaceOrWarn(text, from, to, label) {
  if (!text.includes(from)) {
    console.log("WARN: pattern not found:", label);
    return text;
  }
  return text.replace(from, to);
}

// 1) Fix Problems pane parsing for Windows paths like C:\...\file.ny:8:11:
const libPath = "src-tauri/src/lib.rs";
let lib = fs.readFileSync(libPath, "utf8");

lib = lib.replace(
  /let location_line = Regex::new\(r".*?"\)\.unwrap\(\);/,
  'let location_line = Regex::new(r"(?i)^(.+):(\\\\d+):(\\\\d+):\\\\s*(.+)$").unwrap();'
);

lib = lib.replace(
  /let prefixed = Regex::new\(r"\(\?i\)\^\(runtime error\|type error\|parse error\):.*?"\)\.unwrap\(\);/,
  'let prefixed = Regex::new(r"(?i)^(runtime error|type error|parse error|library error):\\\\s*(.+):(\\\\d+):(\\\\d+):\\\\s*(.+)$").unwrap();'
);

lib = replaceOrWarn(
  lib,
  `            let kind = if prefix.contains("runtime") {
                "Runtime"
            } else if prefix.contains("type") {
                "Type"
            } else {
                "Parse"
            };`,
  `            let kind = if prefix.contains("runtime") {
                "Runtime"
            } else if prefix.contains("type") {
                "Type"
            } else if prefix.contains("library") {
                "Library"
            } else {
                "Parse"
            };`,
  "prefixed kind block"
);

lib = replaceOrWarn(
  lib,
  `            if lower.contains("parse error") || lower.contains("type error") || lower.contains("runtime error") {`,
  `            if lower.contains("parse error") || lower.contains("type error") || lower.contains("runtime error") || lower.contains("library error") {`,
  "lower contains errors"
);

lib = replaceOrWarn(
  lib,
  `                let kind = if lower.contains("type error") {
                    "Type"
                } else if lower.contains("runtime error") {
                    "Runtime"
                } else {
                    "Parse"
                };`,
  `                let kind = if lower.contains("type error") {
                    "Type"
                } else if lower.contains("runtime error") {
                    "Runtime"
                } else if lower.contains("library error") {
                    "Library"
                } else {
                    "Parse"
                };`,
  "location kind block"
);

if (!lib.includes('line.strip_prefix("Library error:")')) {
  lib = lib.replace(
    `        if let Some(rest) = line.strip_prefix("Runtime error:") {
            out.push(Problem {
                kind: "Runtime".into(),
                line: None,
                col: None,
                message: rest.trim().into(),
            });
        }`,
    `        if let Some(rest) = line.strip_prefix("Runtime error:") {
            out.push(Problem {
                kind: "Runtime".into(),
                line: None,
                col: None,
                message: rest.trim().into(),
            });
            continue;
        }

        if let Some(rest) = line.strip_prefix("Library error:") {
            out.push(Problem {
                kind: "Library".into(),
                line: None,
                col: None,
                message: rest.trim().into(),
            });
        }`
  );
}

save(libPath, lib);

// 2) Make editor/terminal default smaller safely
const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

app = app.replace(
  `const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('nymphaea-pty-font-size') || 17));`,
  `const [fontSize, setFontSize] = useState(() => Math.min(14, Number(localStorage.getItem('nymphaea-pty-font-size') || 14)));`
);

app = app.replace(
  `fontSize: 14,`,
  `fontSize: 12,`
);

save(appPath, app);

// 3) Compact CSS
const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* ===== Rodina compact scale + stable problems view ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

html, body, #root {
  font-size: 12px !important;
}

.app-shell {
  padding: 6px !important;
  gap: 6px !important;
}

.topbar {
  height: 62px !important;
  min-height: 62px !important;
  padding: 8px 14px !important;
  border-radius: 18px !important;
  gap: 10px !important;
}

.logo-chip {
  width: 42px !important;
  height: 42px !important;
  min-width: 42px !important;
  border-radius: 14px !important;
}

.menu-button {
  min-width: 96px !important;
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 16px !important;
  border-radius: 14px !important;
  font-size: .78rem !important;
}

.topbar-actions {
  display: none !important;
}

.workbench {
  gap: 6px !important;
  grid-template-columns: 200px minmax(0, 1fr) 200px !important;
  grid-template-rows: minmax(0, 1fr) 155px !important;
}

.sidebar,
.inspector,
.editor-zone,
.terminal-panel,
.problems-panel {
  padding: 8px !important;
  border-radius: 16px !important;
}

.sidebar h2,
.inspector h2,
.terminal-panel h2,
.problems-panel h2 {
  font-size: .78rem !important;
  margin: 4px 0 8px !important;
}

.eyebrow {
  font-size: .62rem !important;
  letter-spacing: .22em !important;
}

.soft-action,
.primary-button,
.mode-card,
.metric-card,
.info-card {
  border-radius: 13px !important;
}

.sidebar button,
.inspector button {
  min-height: 32px !important;
  padding: 0 10px !important;
  font-size: .74rem !important;
}

.mode-card,
.metric-card,
.info-card {
  padding: 7px !important;
}

.mode-card strong,
.metric-card strong,
.info-card strong {
  font-size: .76rem !important;
}

.mode-card small,
.metric-card span,
.info-card span,
.info-card small {
  font-size: .64rem !important;
}

.editor-topbar {
  min-height: 34px !important;
}

.tab-chip,
.tiny-badge,
.font-control {
  font-size: .72rem !important;
  min-height: 30px !important;
}

.editor-frame,
.terminal-wrap,
.problems-wrap {
  border-radius: 14px !important;
}

.terminal-host {
  font-size: 12px !important;
}

.problems-wrap table,
.problems-wrap th,
.problems-wrap td {
  font-size: .72rem !important;
}
`;

save(cssPath, css);

console.log("Done: fixed Windows error parsing + compact UI.");
