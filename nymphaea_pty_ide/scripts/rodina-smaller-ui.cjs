const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Make default editor font smaller safely
app = app.replace(
  /const \[fontSize, setFontSize\] = useState\(\(\) => Number\(localStorage\.getItem\('nymphaea-pty-font-size'\) \|\| \d+\)\);/,
  "const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('nymphaea-pty-font-size') || 13));"
);

// Make terminal font smaller if xterm config has fontSize
app = app.replace(/fontSize:\s*14,/g, "fontSize: 12,");
app = app.replace(/fontSize:\s*13,/g, "fontSize: 12,");

fs.writeFileSync(appPath, app, "utf8");

const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== RODINA SMALLER UI FINAL ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

html, body, #root {
  font-size: 11px !important;
}

.app-shell {
  padding: 5px !important;
  gap: 5px !important;
}

.topbar {
  height: 54px !important;
  min-height: 54px !important;
  padding: 6px 10px !important;
  border-radius: 16px !important;
  gap: 8px !important;
}

.logo-chip {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  border-radius: 12px !important;
  font-size: .75rem !important;
}

.brand-block {
  display: none !important;
}

.menu-row {
  gap: 7px !important;
}

.menu-button {
  min-width: 84px !important;
  height: 32px !important;
  min-height: 32px !important;
  padding: 0 12px !important;
  border-radius: 12px !important;
  font-size: .72rem !important;
}

.topbar-actions {
  display: none !important;
}

.workbench {
  gap: 5px !important;
  grid-template-columns: 175px minmax(0, 1fr) 175px !important;
  grid-template-rows: minmax(0, 1fr) 135px !important;
}

.sidebar,
.inspector,
.editor-zone,
.terminal-panel,
.problems-panel {
  padding: 6px !important;
  border-radius: 14px !important;
}

.sidebar h2,
.inspector h2,
.terminal-panel h2,
.problems-panel h2 {
  font-size: .68rem !important;
  margin: 3px 0 6px !important;
}

.eyebrow {
  font-size: .55rem !important;
  letter-spacing: .18em !important;
}

.sidebar button,
.inspector button,
.soft-action,
.primary-button {
  min-height: 28px !important;
  padding: 0 8px !important;
  border-radius: 10px !important;
  font-size: .66rem !important;
}

.mode-card,
.metric-card,
.info-card,
.file-card,
.status-card,
.theme-card {
  padding: 5px !important;
  border-radius: 11px !important;
}

.mode-card strong,
.metric-card strong,
.info-card strong,
.file-card strong,
.theme-card strong {
  font-size: .66rem !important;
}

.mode-card small,
.metric-card span,
.info-card span,
.info-card small,
.file-card small,
.theme-card small {
  font-size: .56rem !important;
}

.editor-topbar {
  min-height: 30px !important;
  gap: 5px !important;
}

.tab-chip,
.tiny-badge,
.font-control {
  font-size: .62rem !important;
  min-height: 26px !important;
  padding: 0 8px !important;
}

.editor-frame,
.terminal-wrap,
.problems-wrap {
  border-radius: 12px !important;
}

.monaco-editor,
.monaco-editor *,
.view-line,
.view-line span {
  font-size: 13px !important;
}

.terminal-host,
.xterm,
.xterm * {
  font-size: 11px !important;
}

.problems-wrap table,
.problems-wrap th,
.problems-wrap td {
  font-size: .62rem !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");

console.log("Done: UI made smaller.");
