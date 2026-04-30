import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import * as monacoEditor from 'monaco-editor';
import '@xterm/xterm/css/xterm.css';
import { registerNyLanguage } from './nyLanguage';

type RunMode = 'normal' | 'vm' | 'interp' | 'both' | 'repl' | 'check' | 'tokens' | 'ast' | 'disasm' | 'trace';
type MenuId = 'file' | 'view' | 'run' | null;
type ThemeId = string;
type SidebarTab = 'explorer' | 'search' | 'source' | 'run' | 'themes';

type OutputEvent = {
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
};

type StartedEvent = {
  commandLine: string;
  binaryPath: string;
  interactive: boolean;
};

type ExitEvent = {
  exitCode: number | null;
  success: boolean;
};

type Problem = {
  kind: string;
  line: number | null;
  col: number | null;
  message: string;
};

type SourceFile = {
  path: string;
  contents: string;
};

type SaveResult = {
  path: string;
};

type BootstrapInfo = {
  cwd: string;
  detectedBinary: string | null;
};

type ThemeConfig = {
  id: ThemeId;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  accent: string;
  accent2: string;
  accent3: string;
  vars: Record<string, string>;
};

const logoLightUrl = new URL('./ny.png', import.meta.url).href;
const logoDarkUrl = new URL('./nyl.png', import.meta.url).href;

const starterProgram = `mat_kütüphanesi kullanılıyor;
metin_kütüphanesi kullanılıyor;

fonksiyon selamla(metin ad) -> metin {
  döndür "Merhaba " + buyuk(ad);
}

değişken isim = girdi("Adın: ");
yazdır selamla(isim);
yazdır sin(1.57);
`;

const modeLabels: Record<RunMode, string> = {
  normal: 'Run',
  vm: 'VM',
  interp: 'Interp',
  both: 'Both',
  repl: 'REPL',
  check: 'Check',
  tokens: 'Tokens',
  ast: 'AST',
  disasm: 'Disasm',
  trace: 'Trace'
};

const modeDescriptions: Record<RunMode, string> = {
  normal: 'Run the current file with the default runner.',
  vm: 'Run the file through the VM backend.',
  interp: 'Run the interpreter backend.',
  both: 'Run both VM and interpreter for comparison.',
  repl: 'Open the interactive REPL in the PTY terminal.',
  check: 'Check syntax/type diagnostics without a normal run.',
  tokens: 'Print lexer tokens for the current source.',
  ast: 'Print the parsed AST tree.',
  disasm: 'Show disassembled bytecode/output.',
  trace: 'Run with execution trace output.'
};

const runGroups: { title: string; items: RunMode[] }[] = [
  { title: 'Run', items: ['normal', 'vm', 'interp', 'both'] },
  { title: 'Inspect', items: ['check', 'tokens', 'ast', 'disasm', 'trace'] },
  { title: 'Interactive', items: ['repl'] }
];

const themeBase = {
  '--radius-xl': '28px',
  '--radius-lg': '22px',
  '--radius-md': '18px',
  '--radius-sm': '14px',
  '--blur': '18px'
};

function lightTheme(
  id: ThemeId,
  name: string,
  description: string,
  accent: string,
  accent2: string,
  accent3: string,
  bg: string,
  bg2: string,
  text: string,
  muted: string
): ThemeConfig {
  return {
    id,
    name,
    description,
    mode: 'light',
    accent,
    accent2,
    accent3,
    vars: {
      ...themeBase,
      '--bg': bg,
      '--bg-2': bg2,
      '--panel': 'rgba(248,250,255,0.78)',
      '--panel-strong': 'rgba(255,255,255,0.94)',
      '--panel-soft': 'rgba(255,255,255,0.62)',
      '--panel-inset': 'rgba(230,236,246,0.92)',
      '--text': text,
      '--muted': muted,
      '--accent': accent,
      '--accent-2': accent2,
      '--accent-3': accent3,
      '--danger': '#e16f87',
      '--line': 'rgba(101,116,151,0.14)',
      '--border': 'rgba(255,255,255,0.98)',
      '--shadow-hi': 'rgba(255,255,255,0.98)',
      '--shadow-lo': 'rgba(157,170,196,0.28)',
      '--editor-bg': '#f8fbff',
      '--editor-fg': text,
      '--input-bg': 'rgba(243,247,255,0.95)',
      '--terminal-bg': '#101621',
      '--terminal-fg': '#e9f1ff',
      '--success': '#41b883'
    }
  };
}

function darkTheme(
  id: ThemeId,
  name: string,
  description: string,
  accent: string,
  accent2: string,
  accent3: string,
  bg: string,
  bg2: string,
  text: string,
  muted: string
): ThemeConfig {
  return {
    id,
    name,
    description,
    mode: 'dark',
    accent,
    accent2,
    accent3,
    vars: {
      ...themeBase,
      '--bg': bg,
      '--bg-2': bg2,
      '--panel': 'rgba(18,22,31,0.80)',
      '--panel-strong': 'rgba(15,19,28,0.92)',
      '--panel-soft': 'rgba(28,34,46,0.72)',
      '--panel-inset': 'rgba(13,17,24,0.96)',
      '--text': text,
      '--muted': muted,
      '--accent': accent,
      '--accent-2': accent2,
      '--accent-3': accent3,
      '--danger': '#ff7f9a',
      '--line': 'rgba(255,255,255,0.08)',
      '--border': 'rgba(255,255,255,0.06)',
      '--shadow-hi': 'rgba(255,255,255,0.025)',
      '--shadow-lo': 'rgba(0,0,0,0.58)',
      '--editor-bg': '#101621',
      '--editor-fg': text,
      '--input-bg': 'rgba(19,24,34,0.98)',
      '--terminal-bg': '#07101f',
      '--terminal-fg': '#e9f1ff',
      '--success': '#3fc48d'
    }
  };
}

const themes: ThemeConfig[] = [
  lightTheme('nymphaea', 'Nymphaea', 'Signature purple glass.', '#7b69f8', '#52c7f3', '#f48ac6', '#edf2fb', '#f8fbff', '#2d3950', '#7e8da4'),
  darkTheme('luna', 'Luna', 'Soft blue night mode.', '#8898ff', '#59d8db', '#f29bdd', '#0f1625', '#161f31', '#e1e8f5', '#95a3bc'),
  lightTheme('aurora', 'Aurora', 'Soft neon aurora.', '#8d5cff', '#21d0d7', '#ff7ac6', '#edf1ff', '#fafbff', '#2f3c5a', '#8794af'),
  lightTheme('rose', 'Rose Quartz', 'Powder pink glass.', '#cc72d1', '#7ed1e4', '#f48bb7', '#f7eef4', '#fdf9fb', '#594c5f', '#9c8ea2'),
  darkTheme('obsidian', 'Obsidian', 'Calm professional dark.', '#8b7cff', '#48d4c8', '#f29bcf', '#0d1118', '#121822', '#dde6ef', '#8a96a8'),
  darkTheme('velvetember', 'Velvet Ember', 'Copper and orchid.', '#ff7b69', '#ffb36a', '#c78cff', '#16121a', '#1f1823', '#f5edf7', '#b9a8bb'),
  lightTheme('matcha', 'Matcha', 'Cream green workspace.', '#6dae64', '#99cf91', '#f0c57c', '#edf6eb', '#f9fcf7', '#38443d', '#7f9082'),
  lightTheme('sakura', 'Sakura Pop', 'Candy pink glass.', '#ff7ec9', '#ad7aff', '#72d4ff', '#fff1f8', '#fff8fc', '#604f64', '#a38fa7'),
  lightTheme('cloudmilk', 'Cloud Milk', 'Soft cloud white.', '#8a98ff', '#73c7ff', '#f6a3c4', '#f4f6fb', '#ffffff', '#37445c', '#8796aa'),
  lightTheme('peachfizz', 'Peach Fizz', 'Peach soda glass.', '#ff9f67', '#ffc37c', '#ff7fb1', '#fff1e9', '#fff8f4', '#5c4a40', '#a1887d'),
  lightTheme('lilacdream', 'Lilac Dream', 'Calm lavender.', '#9a7cff', '#7ac3ff', '#f3a4df', '#f3efff', '#faf7ff', '#433b58', '#9489ab'),
  lightTheme('mintgelato', 'Mint Gelato', 'Fresh mint workspace.', '#53c7a5', '#74dbcf', '#f1b97b', '#ecf8f4', '#f7fcfa', '#364a45', '#83948f'),
  lightTheme('solaris', 'Solaris', 'Golden morning.', '#f0ab3d', '#ffcf66', '#ff8d7a', '#fff6e7', '#fffbf2', '#5a4930', '#a28c62'),
  darkTheme('midnightbloom', 'Midnight Bloom', 'Purple night bloom.', '#9a7bff', '#60d1ff', '#ff8bc5', '#121321', '#17182a', '#eceffd', '#9aa1c6'),
  darkTheme('nebula', 'Nebula', 'Soft space mist.', '#8f6dff', '#57e1d3', '#ff8f9f', '#0d1322', '#111a2d', '#e5ecfb', '#92a0bb'),
  darkTheme('graphite', 'Graphite', 'Charcoal gray.', '#7d8ba5', '#4dc6d6', '#ff8d8d', '#101215', '#15181d', '#e7ebf0', '#9099a7'),
  darkTheme('cybersunset', 'Cyber Sunset', 'Orange neon dark.', '#ff8b45', '#ff5989', '#9d7cff', '#161117', '#211721', '#f8edf7', '#b9a7ba'),
  darkTheme('deepsea', 'Deep Sea', 'Deep blue workspace.', '#55a3ff', '#44d7dc', '#75e3b5', '#09131c', '#0e1a26', '#d9ebf7', '#88a1b2'),
  lightTheme('blueporcelain', 'Blue Porcelain', 'Porcelain blue.', '#6f8cff', '#67c7ff', '#f5a3d1', '#edf3fb', '#fbfdff', '#33465e', '#8193ab'),
  lightTheme('honeycream', 'Honey Cream', 'Honey cream glass.', '#d89a34', '#f4bd57', '#ef8c82', '#fcf5e8', '#fffdf8', '#5d4b31', '#a18c68'),
  lightTheme('cottoncandy', 'Cotton Candy', 'Soft candy colors.', '#ff7bcd', '#76c7ff', '#a788ff', '#fff1fb', '#fff9fd', '#654d69', '#ab93af'),
  lightTheme('icedberry', 'Iced Berry', 'Cool berry tone.', '#b26af6', '#72a8ff', '#ff8ba0', '#f6effb', '#fcf9ff', '#4d435b', '#958ca1'),
  lightTheme('meadow', 'Meadow', 'Soft meadow green.', '#5fb46f', '#8cd28f', '#f0bc72', '#eef8ef', '#fbfefb', '#39473c', '#85938a'),
  lightTheme('lemonsilk', 'Lemon Silk', 'Silky lemon cream.', '#d6b13b', '#ecd76f', '#f49b80', '#fff9e8', '#fffdf5', '#5b5431', '#9f9872'),
  darkTheme('vanta', 'Vanta', 'Ultra dark.', '#7066ff', '#49c8ff', '#ff86c8', '#090b10', '#0d1017', '#e6ecf7', '#818b9d'),
  darkTheme('ember', 'Ember', 'Warm ember dark.', '#ff6a4e', '#ffb25e', '#ff8fa8', '#18100f', '#221513', '#fff0ea', '#c0a6a0'),
  darkTheme('mojito', 'Mojito Night', 'Mint night mode.', '#58d0ad', '#79f0d6', '#8fe7ff', '#0e1715', '#15211d', '#e9f7f1', '#95b7ab'),
  darkTheme('royalviolet', 'Royal Violet', 'Royal purple dark.', '#9f71ff', '#6fb7ff', '#ff95d3', '#130f22', '#1b1430', '#f2ebff', '#a79cc0'),
  darkTheme('terminaljade', 'Terminal Jade', 'Green terminal vibe.', '#45d388', '#7ee0b6', '#a1ffe1', '#0c1713', '#11211b', '#ddf7ee', '#89b5a6'),
  darkTheme('arcticnight', 'Arctic Night', 'Cold blue night.', '#76a2ff', '#88d6ff', '#9af3ff', '#0f1723', '#162131', '#e5eef9', '#92a5ba')
];

const tokensHelp = [
  'değişken', 'sabit', 'fonksiyon', 'döndür', 'yazdır', 'eğer', 'değilse', 'iken', 'için',
  'doğru', 'yanlış', 'boş', 've', 'veya', 'değil', 'mat_kütüphanesi kullanılıyor', 'metin_kütüphanesi kullanılıyor'
];

function basename(path: string) {
  return path.replace(/\\/g, '/').split('/').pop() || path;
}

function applyThemeVars(theme: ThemeConfig) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

function App() {
  const [code, setCode] = useState(starterProgram);
  const [mode, setMode] = useState<RunMode>('normal');
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [detectedBinary, setDetectedBinary] = useState<string | null>(null);
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [themeId, setThemeId] = useState<ThemeId>(() => (localStorage.getItem('nymphaea-pty-theme') as ThemeId) || 'rose');
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('nymphaea-pty-font-size') || 14));
  const [showMinimap, setShowMinimap] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(() => localStorage.getItem('nymphaea-pty-show-whitespace') === '1');
  const [uiScale, setUiScale] = useState(() => Number(localStorage.getItem('nymphaea-pty-ui-scale') || 90));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => localStorage.getItem('nymphaea-pty-auto-save') === '1');
  const [autoSaveDelay, setAutoSaveDelay] = useState(() => Number(localStorage.getItem('nymphaea-pty-auto-save-delay') || 900));
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const terminalHostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isRunningRef = useRef(false);
  const statusRef = useRef('Idle');
  const modeRef = useRef<RunMode>('normal');

  const currentTheme = useMemo(() => themes.find((item) => item.id === themeId) ?? themes[0], [themeId]);
  const title = useMemo(() => currentFilePath ?? (mode === 'repl' ? 'repl' : 'unsaved.ny'), [currentFilePath, mode]);
  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const wordCount = useMemo(() => code.trim().split(/\s+/).filter(Boolean).length, [code]);

  const searchMatches = useMemo(() => {
    const query = sidebarSearchQuery.trim().toLocaleLowerCase('tr');
    if (!query) return [];

    return code
      .split('\n')
      .map((line, index) => ({
        line,
        lineNumber: index + 1
      }))
      .filter((item) => item.line.toLocaleLowerCase('tr').includes(query))
      .slice(0, 50);
  }, [code, sidebarSearchQuery]);

  const jumpToSearchLine = (lineNumber: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    editor.setPosition({ lineNumber, column: 1 });
    editor.revealLineInCenter(lineNumber);
  };

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    document.documentElement.classList.add('theme-switching');

    applyThemeVars(currentTheme);
    localStorage.setItem('nymphaea-pty-theme', currentTheme.id);

    try {
      monacoRef.current?.editor?.setTheme?.(currentTheme.mode === 'dark' ? 'vs-dark' : 'vs-light');
    } catch (error) {
      console.warn('Monaco theme update failed', error);
    }

    try {
      (terminalRef.current as any)?.setOption?.('theme', {
        background: currentTheme.vars['--terminal-bg'],
        foreground: currentTheme.vars['--terminal-fg'],
        cursor: currentTheme.accent2,
        selectionBackground: 'rgba(120, 170, 255, 0.22)'
      });
      fitAddonRef.current?.fit();
    } catch (error) {
      console.warn('Terminal theme update failed', error);
    }

    const timeout = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-switching');
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('nymphaea-pty-font-size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('nymphaea-pty-show-whitespace', showWhitespace ? '1' : '0');
  }, [showWhitespace]);

  useEffect(() => {
    localStorage.setItem('nymphaea-pty-ui-scale', String(uiScale));
    document.documentElement.style.setProperty('--ui-scale', String(uiScale / 100));
  }, [uiScale]);

  useEffect(() => {
    localStorage.setItem('nymphaea-pty-auto-save', autoSaveEnabled ? '1' : '0');
  }, [autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem('nymphaea-pty-auto-save-delay', String(autoSaveDelay));
  }, [autoSaveDelay]);

  useEffect(() => {
    if (!autoSaveEnabled || !currentFilePath || isRunning) return;
    const timer = window.setTimeout(() => {
      void doSave(false);
    }, autoSaveDelay);
    return () => window.clearTimeout(timer);
  }, [autoSaveEnabled, autoSaveDelay, code, currentFilePath, isRunning]);

  const focusEditor = () => {
    editorRef.current?.focus?.();
  };

  const pasteIntoEditor = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const editor = editorRef.current;
      if (!editor) return;
      const selection = editor.getSelection();
      editor.executeEdits('clipboard-paste', [{
        range: selection,
        text,
        forceMoveMarkers: true
      }]);
      focusEditor();
      setStatus(text ? 'Pasted into editor' : 'Clipboard empty');
    } catch (error) {
      setStatus(`Paste failed: ${String(error)}`);
    }
  };

  const pasteIntoTerminal = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setStatus('Clipboard empty');
        return;
      }
      if (!isRunningRef.current) {
        terminalRef.current?.writeln('[IDE] No live process. Start Run or REPL first.');
        setStatus('No live process for terminal paste');
        return;
      }
      await invoke('send_stdin', { text });
      terminalRef.current?.focus();
      setStatus('Pasted into terminal');
    } catch (error) {
      setStatus(`Terminal paste failed: ${String(error)}`);
    }
  };

  useEffect(() => {
    const handleEditorPaste = (event: ClipboardEvent) => {
      const editor = editorRef.current;
      const editorNode = editor?.getDomNode?.();
      if (!editor || !editorNode || !editorNode.contains(document.activeElement)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (text == null) return;
      event.preventDefault();
      const selection = editor.getSelection();
      editor.executeEdits('dom-paste', [{
        range: selection,
        text,
        forceMoveMarkers: true
      }]);
      focusEditor();
      setStatus('Pasted into editor');
    };

    window.addEventListener('paste', handleEditorPaste as EventListener);
    return () => window.removeEventListener('paste', handleEditorPaste as EventListener);
  }, []);

  useEffect(() => {
    const host = terminalHostRef.current;
    if (!host) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: false,
      scrollback: 5000,
      allowProposedApi: false,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: currentTheme.vars['--terminal-bg'],
        foreground: currentTheme.vars['--terminal-fg'],
        cursor: currentTheme.accent2,
        selectionBackground: 'rgba(120, 170, 255, 0.22)'
      }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(host);
    fitAddon.fit();
    term.writeln('PTY terminal ready. Run a file or REPL, then type here.');
    term.writeln('Paste in editor: Ctrl/Cmd+V or the Paste Editor button.');
    term.writeln('Paste in terminal: Ctrl/Cmd+Shift+V or the Paste Terminal button.');
    term.writeln('');

    const resizeToBackend = async () => {
      if (!terminalRef.current || !fitAddonRef.current) return;
      fitAddonRef.current.fit();
      if (!isRunningRef.current) return;
      try {
        await invoke('resize_pty', {
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows
        });
      } catch {
        // ignore resize races during startup/shutdown
      }
    };

    const dataDisposable = term.onData((data) => {
      if (!isRunningRef.current) return;
      void invoke('send_stdin', { text: data }).catch((error) => {
        term.writeln(`\n[IDE] stdin failed: ${String(error)}`);
      });
    });

    const handlePaste = (event: ClipboardEvent) => {
      if (!host.contains(document.activeElement)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      if (!isRunningRef.current) {
        term.writeln('[IDE] No live process. Start Run or REPL first.');
        return;
      }
      void invoke('send_stdin', { text }).catch((error) => {
        term.writeln(`\n[IDE] terminal paste failed: ${String(error)}`);
      });
    };

    const handleTerminalShortcut = (event: KeyboardEvent) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (!ctrlOrMeta) return;
      if (event.shiftKey && event.key.toLowerCase() === 'v') {
        if (host.contains(document.activeElement)) {
          event.preventDefault();
          void pasteIntoTerminal();
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      void resizeToBackend();
    });
    resizeObserver.observe(host);

    const onWindowResize = () => {
      void resizeToBackend();
    };
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('paste', handlePaste as EventListener);
    window.addEventListener('keydown', handleTerminalShortcut);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('paste', handlePaste as EventListener);
      window.removeEventListener('keydown', handleTerminalShortcut);
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const info = await invoke<BootstrapInfo>('get_bootstrap_info');
        if (!mounted) return;
        setWorkspaceRoot(info.cwd);
        setDetectedBinary(info.detectedBinary);
      } catch (error) {
        console.error(error);
      }
    };

    bootstrap();

    const unsubs: Promise<UnlistenFn>[] = [
      listen<OutputEvent>('proc-output', (event) => {
        terminalRef.current?.write(event.payload.text);
      }),
      listen<StartedEvent>('proc-started', async (event) => {
        setIsRunning(true);
        setInteractive(event.payload.interactive);
        setStatus(modeRef.current === 'repl' ? 'REPL running' : `Running · ${event.payload.binaryPath}`);
        setProblems([]);
        terminalRef.current?.focus();
        if (terminalRef.current) {
          try {
            await invoke('resize_pty', {
              cols: terminalRef.current.cols,
              rows: terminalRef.current.rows
            });
          } catch {
            // ignore startup race
          }
        }
      }),
      listen<ExitEvent>('proc-exit', (event) => {
        setIsRunning(false);
        setInteractive(false);
        setStatus(event.payload.success ? 'Finished (OK)' : `Finished (exit=${event.payload.exitCode ?? 'null'})`);
        terminalRef.current?.writeln(`\n[IDE] process finished${event.payload.success ? '' : ` (exit=${event.payload.exitCode ?? 'null'})`}`);
      }),
      listen<Problem[]>('proc-problems', (event) => {
        setProblems(event.payload);
      }),
      listen<string>('proc-error', (event) => {
        setStatus('Error');
        setIsRunning(false);
        setInteractive(false);
        terminalRef.current?.writeln(`\n[IDE] ${event.payload}`);
      })
    ];

    return () => {
      mounted = false;
      void Promise.all(unsubs).then((cleanups) => cleanups.forEach((fn) => fn()));
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const markers = problems.map((problem) => ({
      severity: problem.kind === 'Runtime'
        ? monacoRef.current!.MarkerSeverity.Warning
        : monacoRef.current!.MarkerSeverity.Error,
      startLineNumber: problem.line ?? 1,
      startColumn: problem.col ?? 1,
      endLineNumber: problem.line ?? 1,
      endColumn: (problem.col ?? 1) + 1,
      message: `${problem.kind}: ${problem.message}`
    }));

    monacoRef.current.editor.setModelMarkers(editorRef.current.getModel()!, 'ny-problems', markers);
  }, [problems]);

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (!ctrlOrMeta) return;
      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        void doSave(false);
        return;
      }

      if (key === 'enter') {
        event.preventDefault();
        if (!isRunningRef.current) {
          void run();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [code, currentFilePath, workspaceRoot, mode]);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const onBeforeMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    registerNyLanguage(monaco as any);
  };

  const onMount = (editor: any) => {
    editorRef.current = editor;

    editor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyS, () => {
      void doSave(false);
    });

    editor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.Enter, () => {
      if (!isRunningRef.current) {
        void run();
      }
    });

    editor.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyV, () => {
      void pasteIntoEditor();
    });
  };

  const doOpen = async () => {
    try {
      const file = await invoke<SourceFile | null>('open_source_file');
      if (!file) return;
      setCode(file.contents);
      setCurrentFilePath(file.path);
      setStatus(`Opened ${file.path}`);
    } catch (error) {
      setStatus(`Open failed: ${String(error)}`);
    }
  };

  const doSave = async (saveAs = false) => {
    try {
      const result = await invoke<SaveResult | null>('save_source_file', {
        path: saveAs ? null : currentFilePath,
        contents: code
      });
      if (!result) return;
      setCurrentFilePath(result.path);
      setStatus(`Saved ${result.path}`);
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    }
  };

  const chooseWorkspace = async () => {
    try {
      const path = await invoke<string | null>('choose_workspace_folder');
      if (!path) return;
      setWorkspaceRoot(path);
      setStatus(`Workspace: ${path}`);
    } catch (error) {
      setStatus(`Workspace pick failed: ${String(error)}`);
    }
  };

  const run = async (selectedMode: RunMode = mode) => {
    setProblems([]);
    terminalRef.current?.clear();
    terminalRef.current?.focus();
    try {
      modeRef.current = selectedMode;
      await invoke('start_run', {
        request: {
          mode: selectedMode,
          code,
          filePath: selectedMode === 'repl' ? null : currentFilePath,
          workspaceRoot: workspaceRoot || null,
          cols: terminalRef.current?.cols ?? 100,
          rows: terminalRef.current?.rows ?? 28
        }
      });
    } catch (error) {
      setStatus(`Run failed: ${String(error)}`);
      terminalRef.current?.writeln(`[IDE] ${String(error)}`);
    }
  };

  const runWithMode = async (selectedMode: RunMode) => {
    setMode(selectedMode);
    await run(selectedMode);
  };

  const stop = async () => {
    try {
      await invoke('stop_run');
      setStatus('Stopped');
    } catch (error) {
      setStatus(`Stop failed: ${String(error)}`);
    }
  };

  const newFile = () => {
    setCode(starterProgram);
    setCurrentFilePath(null);
    setMode('normal');
    setStatus('New unsaved file');
    focusEditor();
  };

  const jumpToProblem = (problem: Problem) => {
    if (!problem.line || !editorRef.current) return;
    editorRef.current.revealLineInCenter(problem.line);
    editorRef.current.setPosition({ lineNumber: problem.line, column: problem.col ?? 1 });
    focusEditor();
  };

  const menuButton = (id: Exclude<MenuId, null>, label: string) => (
    <div className="menu-wrap" key={id}>
      <button className={`menu-button ${openMenu === id ? 'active' : ''}`} onClick={() => setOpenMenu((prev) => prev === id ? null : id)}>
        {label}
      </button>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar neo-card" ref={menuRef}>
        <div className="topbar-main">
          <button className="logo-chip logo-chip-image" onClick={newFile} title="New file">
            <img
              src={currentTheme.mode === 'dark' ? logoDarkUrl : logoLightUrl}
              alt="Nymphaea"
              className="logo-image"
            />
          </button>
          <div className="brand-block">
            <div className="brand-kicker">NYMPHAEA IDE</div>
            <div className="brand-title">Türkçe, .nex/.ny odaklı, yumuşak masaüstü IDE</div>
          </div>
        </div>

        <nav className="menu-row">
          {menuButton('file', 'Dosya')}
          {menuButton('view', 'Görünüm')}
          {menuButton('run', 'Çalıştır')}
        </nav>

        <div className="topbar-actions">
          <button className="soft-action" onClick={chooseWorkspace}>Klasör Aç</button>
          <button className="soft-action" onClick={doOpen}>Dosya Aç</button>
          <button className="soft-action" onClick={newFile}>Yeni Dosya</button>
          <button className="primary-button" onClick={() => void run()} disabled={isRunning}>▶ {isRunning ? 'Çalışıyor' : 'Çalıştır'}</button>
        </div>

        {openMenu === 'file' && (
          <div className="menu-dropdown file-menu neo-card-soft">
            <button className="menu-item" onClick={() => { newFile(); setOpenMenu(null); }}>Yeni Dosya</button>
            <button className="menu-item" onClick={() => { void doOpen(); setOpenMenu(null); }}>Dosya Aç</button>
            <button className="menu-item" onClick={() => { void doSave(false); setOpenMenu(null); }}>Kaydet</button>
            <button className="menu-item" onClick={() => { void doSave(true); setOpenMenu(null); }}>Farklı Kaydet</button>
            <button className="menu-item" onClick={() => { void chooseWorkspace(); setOpenMenu(null); }}>Çalışma Klasörü Seç</button>
            <div className="menu-divider" />
            <button className="menu-item" onClick={() => { void pasteIntoEditor(); setOpenMenu(null); }}>Editor’e Yapıştır</button>
            <button className="menu-item" onClick={() => { void pasteIntoTerminal(); setOpenMenu(null); }}>Terminal’e Yapıştır</button>
          </div>
        )}

        {openMenu === 'view' && (
          <div className="menu-dropdown view-menu neo-card-soft view-settings-menu">
            <button
              className="menu-item menu-item-strong"
              onClick={() => {
                setActiveSidebarTab('themes');
                setOpenMenu(null);
              }}
              type="button"
            >
              Temalar
            </button>

            <div className="menu-divider" />

            <div className="view-setting-row">
              <div className="view-setting-icon">UI</div>
              <div className="view-setting-copy">
                <strong>UI Ölçek</strong>
                <small>Ekran DPI farklarında önerilir.</small>
              </div>
              <strong className="view-setting-value">{uiScale}%</strong>
              <input
                className="view-setting-range"
                type="range"
                min={80}
                max={115}
                step={5}
                value={uiScale}
                onChange={(event) => setUiScale(Number(event.target.value))}
              />
              <button className="view-reset-button" type="button" onClick={() => setUiScale(90)}>↻</button>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">AS</div>
              <div className="view-setting-copy">
                <strong>Otomatik Kaydet</strong>
                <small>Kaydedilebilir dosyalarda gecikmeli kaydetme.</small>
              </div>
              <label className="view-switch">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(event) => setAutoSaveEnabled(event.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">MS</div>
              <div className="view-setting-copy">
                <strong>Otomatik Kaydetme Gecikmesi</strong>
                <small>Milisaniye cinsinden.</small>
              </div>
              <strong className="view-setting-value">{autoSaveDelay} ms</strong>
              <input
                className="view-setting-range"
                type="range"
                min={300}
                max={3000}
                step={100}
                value={autoSaveDelay}
                onChange={(event) => setAutoSaveDelay(Number(event.target.value))}
              />
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">T</div>
              <div className="view-setting-copy">
                <strong>Editör Font Boyutu</strong>
                <small>Monaco editörü için.</small>
              </div>
              <strong className="view-setting-value">{fontSize}</strong>
              <input
                className="view-setting-range"
                type="range"
                min={12}
                max={22}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
              />
              <button className="view-reset-button" type="button" onClick={() => setFontSize(14)}>↻</button>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">M</div>
              <div className="view-setting-copy">
                <strong>Minimap</strong>
                <small>Editör sağında küçük önizleme.</small>
              </div>
              <label className="view-switch">
                <input
                  type="checkbox"
                  checked={showMinimap}
                  onChange={(event) => setShowMinimap(event.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">W</div>
              <div className="view-setting-copy">
                <strong>Word Wrap</strong>
                <small>Satırları ekrana sığdır.</small>
              </div>
              <label className="view-switch">
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={(event) => setWordWrap(event.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">#</div>
              <div className="view-setting-copy">
                <strong>Satır Numaraları</strong>
                <small>Editör solunda satır numarası.</small>
              </div>
              <label className="view-switch">
                <input
                  type="checkbox"
                  checked={showLineNumbers}
                  onChange={(event) => setShowLineNumbers(event.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="view-setting-row">
              <div className="view-setting-icon">·</div>
              <div className="view-setting-copy">
                <strong>Boşlukları Göster</strong>
                <small>Whitespace görünürlüğü.</small>
              </div>
              <label className="view-switch">
                <input
                  type="checkbox"
                  checked={showWhitespace}
                  onChange={(event) => setShowWhitespace(event.target.checked)}
                />
                <span />
              </label>
            </div>
          </div>
        )}

        {openMenu === 'run' && (
          <div className="menu-dropdown run-menu neo-card-soft">
            {runGroups.map((group) => (
              <div className="run-menu-group" key={group.title}>
                <div className="menu-section-label">{group.title}</div>
                {group.items.map((item) => (
                  <button key={item} className={`run-menu-item ${mode === item ? 'active' : ''}`} onClick={() => { void runWithMode(item); setOpenMenu(null); }}>
                    <span className="run-short-name">{modeLabels[item]}</span>
                    <span className="run-desc">{modeDescriptions[item]}</span>
                  </button>
                ))}
              </div>
            ))}
            <div className="menu-divider" />
            <button className="menu-item danger-text" onClick={() => { void stop(); setOpenMenu(null); }} disabled={!isRunning}>Durdur</button>
          </div>
        )}
      </header>

      <main className="workbench">
        <aside className="sidebar neo-card">
          <div className="sidebar-shell">
            <div className="sidebar-rail">
              <button
                className={`rail-tab ${activeSidebarTab === 'explorer' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('explorer')}
                title="Gezgin"
                type="button"
              >
                G
              </button>

              <button
                className={`rail-tab ${activeSidebarTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('search')}
                title="Ara"
                type="button"
              >
                A
              </button>

              <button
                className={`rail-tab ${activeSidebarTab === 'source' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('source')}
                title="Kaynak"
                type="button"
              >
                K
              </button>

              <button
                className={`rail-tab ${activeSidebarTab === 'run' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('run')}
                title="Çalıştır"
                type="button"
              >
                Ç
              </button>

              <button
                className={`rail-tab ${activeSidebarTab === 'themes' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('themes')}
                title="Temalar"
                type="button"
              >
                T
              </button>
            </div>

            <div className="sidebar-panel">
              {activeSidebarTab === 'explorer' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Gezgin</div>
                  <h2>Dosyalar</h2>

                  <div className="info-card file-card">
                    <span>Aktif dosya</span>
                    <strong>{basename(title)}</strong>
                    <small>{currentFilePath ?? 'Henüz kaydedilmedi'}</small>
                  </div>

                  <div className="button-grid">
                    <button className="soft-action" onClick={doOpen}>Dosya Aç</button>
                    <button className="soft-action" onClick={() => void doSave(false)}>Kaydet</button>
                    <button className="soft-action" onClick={() => void doSave(true)}>Farklı Kaydet</button>
                    <button className="soft-action" onClick={chooseWorkspace}>Klasör Aç</button>
                  </div>

                  <div className="sidebar-note">
                    <strong>Root:</strong> {workspaceRoot || 'Seçilmedi'}
                  </div>
                </section>
              )}

              {activeSidebarTab === 'search' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Ara</div>
                  <h2>Ara</h2>

                  <input
                    className="sidebar-input"
                    placeholder="Kod içinde ara..."
                    value={sidebarSearchQuery}
                    onChange={(event) => setSidebarSearchQuery(event.target.value)}
                  />

                  {!sidebarSearchQuery.trim() && (
                    <div className="sidebar-empty">Aramak için bir şey yaz.</div>
                  )}

                  {sidebarSearchQuery.trim() && searchMatches.length === 0 && (
                    <div className="sidebar-empty">Sonuç bulunamadı.</div>
                  )}

                  {searchMatches.length > 0 && (
                    <div className="search-results">
                      {searchMatches.map((match) => (
                        <button
                          key={match.lineNumber}
                          type="button"
                          className="search-result"
                          onClick={() => jumpToSearchLine(match.lineNumber)}
                        >
                          <span className="search-line">Line {match.lineNumber}</span>
                          <span className="search-preview">{match.line.trim() || '(empty line)'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeSidebarTab === 'source' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Kaynak</div>
                  <h2>Kaynak Kontrol</h2>

                  <div className="metric-card wide">
                    <span>Repo</span>
                    <strong>{workspaceRoot || 'Seçilmedi'}</strong>
                  </div>

                  <button className="soft-action full" type="button">Yenile (status)</button>

                  <div className="menu-section-label">Değişiklikler</div>
                  <div className="sidebar-empty">Değişiklik yok.</div>

                  <div className="menu-section-label">Commit</div>
                  <input className="sidebar-input" placeholder="Commit mesajı..." />
                  <button className="soft-action full" type="button">Commit (Add -A + Commit)</button>
                </section>
              )}

              {activeSidebarTab === 'run' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Çalıştır</div>
                  <h2>Çalıştır</h2>

                  <div className="sidebar-run-head">
                    Aktif dosya: <strong>{basename(title)}</strong>
                  </div>

                  <div className="mode-list">
                    {runGroups.flatMap((group) => group.items).map((item) => (
                      <button key={item} className={`mode-card ${mode === item ? 'active' : ''}`} onClick={() => setMode(item)}>
                        <strong>{modeLabels[item]}</strong>
                        <small>{modeDescriptions[item]}</small>
                      </button>
                    ))}
                  </div>

                  <button className="primary-button full" onClick={() => void run()} disabled={isRunning}>
                    ▶ {modeLabels[mode]} çalıştır
                  </button>

                  <button className="soft-action full" onClick={() => void stop()} disabled={!isRunning}>
                    Durdur
                  </button>
                </section>
              )}

              {activeSidebarTab === 'themes' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Temalar</div>
                  <h2>Temalar</h2>

                  <div className="sidebar-theme-list">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        className={`sidebar-theme-card ${theme.id === currentTheme.id ? 'active' : ''}`}
                        onClick={() => setThemeId(theme.id)}
                        type="button"
                      >
                        <span
                          className="theme-dot"
                          style={{
                            background:
                              'linear-gradient(135deg, ' +
                              theme.accent +
                              ', ' +
                              theme.accent2 +
                              ', ' +
                              theme.accent3 +
                              ')'
                          }}
                        />
                        <span>
                          <strong>{theme.name}</strong>
                          <small>{theme.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </aside>

        <section className="editor-zone neo-card">
          <div className="editor-topbar">
            <div className="tab-chip">{basename(title)} <span>•</span></div>
            <div className="editor-tools">
              <span className="tiny-badge">{lineCount} lines</span>
              <span className="tiny-badge">{wordCount} words</span>
              <label className="font-control">Font <input type="range" min={13} max={22} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} /></label>
            </div>
          </div>

          <div className="editor-frame">
            <Editor
              height="100%"
              defaultLanguage="ny"
              language="ny"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              beforeMount={onBeforeMount}
              onMount={onMount}
              theme={currentTheme.mode === 'dark' ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: showMinimap },
                fontSize,
                lineNumbers: showLineNumbers ? 'on' : 'off',
                lineNumbersMinChars: 3,
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: wordWrap ? 'on' : 'off',
                renderWhitespace: showWhitespace ? 'all' : 'none',
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                unicodeHighlight: {
                  ambiguousCharacters: false,
                  invisibleCharacters: false,
                  nonBasicASCII: false
                }
              }}
            />
          </div>
        </section>

        <aside className="inspector neo-card">
          <section className="panel-block compact">
            <div className="eyebrow">Çalıştır</div>
            <h2>Yapılandırma</h2>
            <div className="metric-stack">
              <div className="metric-card"><span>Aktif mod</span><strong>{modeLabels[mode]}</strong></div>
              <div className="metric-card"><span>Durum</span><strong>{isRunning ? 'Çalışıyor' : 'Hazır'}</strong></div>
              <div className="metric-card wide"><span>Detected Ny</span><strong>{detectedBinary ? basename(detectedBinary) : 'auto-detect on run'}</strong></div>
            </div>
            <button className="primary-button full" onClick={() => void run()} disabled={isRunning}>▶ {modeLabels[mode]} çalıştır</button>
            <button className="soft-action full" onClick={() => void stop()} disabled={!isRunning}>Durdur</button>
          </section>

          <section className="panel-block compact">
            <div className="eyebrow">Tokens</div>
            <h2>Kısa Kılavuz</h2>
            <div className="token-cloud">
              {tokensHelp.map((token) => <span key={token}>{token}</span>)}
            </div>
          </section>
        </aside>

        <section className="terminal-panel neo-card">
          <div className="pane-header">
            <div>
              <span className="eyebrow">Terminal</span>
              <h2>PTY terminal</h2>
            </div>
            <div className="status-row">
              <span className={`status-dot ${isRunning ? 'running' : 'idle'}`} />
              <span>{status}</span>
              {interactive && <span className="tiny-badge">Terminale direkt yaz</span>}
            </div>
          </div>
          <div className="terminal-wrap">
            <div ref={terminalHostRef} className="terminal-host" tabIndex={0} />
          </div>
        </section>

        <section className="problems-panel neo-card">
          <div className="pane-header">
            <div>
              <span className="eyebrow">Problems</span>
              <h2>Tanılar</h2>
            </div>
            <span className="tiny-badge">{problems.length} issue</span>
          </div>
          <div className="problems-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Line</th>
                  <th>Col</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">No parsed diagnostics yet.</td>
                  </tr>
                ) : problems.map((problem, index) => (
                  <tr key={`${problem.kind}-${problem.line}-${problem.col}-${index}`} onClick={() => jumpToProblem(problem)} className="problem-row">
                    <td>{problem.kind}</td>
                    <td>{problem.line ?? '—'}</td>
                    <td>{problem.col ?? '—'}</td>
                    <td>{problem.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
