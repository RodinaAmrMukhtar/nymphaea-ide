const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

/* Make theme effect update Monaco + xterm safely */
const oldEffect = `  useEffect(() => {
    applyThemeVars(currentTheme);
    localStorage.setItem('nymphaea-pty-theme', currentTheme.id);
    terminalRef.current?.setOption('theme', {
      background: currentTheme.vars['--terminal-bg'],
      foreground: currentTheme.vars['--terminal-fg'],
      cursor: currentTheme.accent2,
      selectionBackground: 'rgba(120, 170, 255, 0.22)'
    });
  }, [currentTheme]);`;

const newEffect = `  useEffect(() => {
    document.documentElement.classList.add('theme-switching');

    applyThemeVars(currentTheme);
    localStorage.setItem('nymphaea-pty-theme', currentTheme.id);

    try {
      monacoRef.current?.editor?.setTheme?.(currentTheme.mode === 'dark' ? 'vs-dark' : 'vs-light');
    } catch (error) {
      console.warn('Monaco theme update failed', error);
    }

    try {
      terminalRef.current?.setOption('theme', {
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
  }, [currentTheme]);`;

if (app.includes(oldEffect)) {
  app = app.replace(oldEffect, newEffect);
} else {
  console.log("WARN: theme effect exact block not found, App.tsx not changed.");
}

fs.writeFileSync(appPath, app, "utf8");

const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== THEME TRANSITION FIX ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

/* Smooth theme transitions without flashing the whole app black */
html,
body,
#root,
.app-shell,
.topbar,
.sidebar,
.sidebar-rail,
.sidebar-panel,
.editor-zone,
.inspector,
.terminal-panel,
.problems-panel,
.neo-card,
.neo-card-soft,
.menu-dropdown,
.menu-button,
.soft-action,
.primary-button,
.mode-card,
.metric-card,
.info-card,
.file-card,
.status-card,
.theme-card,
.sidebar-theme-card,
.rail-tab,
.tab-chip,
.tiny-badge,
.font-control,
.editor-frame,
.problems-wrap {
  transition:
    background-color 220ms ease,
    background 220ms ease,
    color 180ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease,
    outline-color 220ms ease !important;
}

/* Do NOT animate Monaco/xterm internals too much; that causes ugly flashes */
.monaco-editor,
.monaco-editor-background,
.xterm,
.xterm-viewport,
.xterm-screen {
  transition: background-color 120ms ease, color 120ms ease !important;
}

/* Keep editor/terminal backgrounds stable during theme switch */
.editor-frame {
  background: var(--editor-bg) !important;
}

.terminal-host,
.xterm,
.xterm-viewport,
.xterm-screen {
  background: var(--terminal-bg) !important;
}

/* Prevent accidental white/black full-screen flash */
html.theme-switching body,
html.theme-switching #root,
html.theme-switching .app-shell {
  background: var(--bg) !important;
}

/* Make theme cards feel smoother */
.theme-menu-item,
.sidebar-theme-card {
  will-change: transform, background, box-shadow !important;
}

.theme-menu-item:hover,
.sidebar-theme-card:hover {
  transform: translateY(-1px) !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");

console.log("Theme transition fix applied.");
