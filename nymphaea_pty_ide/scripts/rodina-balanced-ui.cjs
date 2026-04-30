const fs = require("fs");

function write(path, text) {
  fs.writeFileSync(path, text, "utf8");
}

/* ---------- styles.css ---------- */
const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

/* remove only our recent size blocks if they exist */
const markers = [
  "/* ===== RODINA SMALLER UI FINAL ===== */",
  "/* ===== RODINA TINY BIT BIGGER ===== */",
  "/* ===== RODINA BALANCED UI ===== */"
];

let cut = -1;
for (const m of markers) {
  const i = css.indexOf(m);
  if (i >= 0 && (cut === -1 || i < cut)) cut = i;
}
if (cut >= 0) css = css.slice(0, cut);

css += `

/* ===== RODINA BALANCED UI ===== */

html, body, #root {
  font-size: 12px !important;
}

.app-shell {
  padding: 6px !important;
  gap: 6px !important;
}

/* top area a bit bigger than now */
.topbar {
  height: 60px !important;
  min-height: 60px !important;
  padding: 8px 12px !important;
  gap: 10px !important;
}

.logo-chip {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  border-radius: 13px !important;
  font-size: .82rem !important;
}

.menu-row {
  gap: 8px !important;
}

.menu-button {
  min-width: 96px !important;
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 14px !important;
  border-radius: 13px !important;
  font-size: .78rem !important;
}

/* overall layout slightly larger */
.workbench {
  gap: 6px !important;
  grid-template-columns: 190px minmax(0, 1fr) 190px !important;
  grid-template-rows: minmax(0, 1fr) 170px !important;
}

/* panels */
.sidebar,
.inspector,
.editor-zone,
.terminal-panel,
.problems-panel {
  padding: 8px !important;
  border-radius: 15px !important;
  min-height: 0 !important;
}

/* headings */
.sidebar h2,
.inspector h2,
.terminal-panel h2,
.problems-panel h2 {
  font-size: .72rem !important;
  margin: 4px 0 7px !important;
}

.eyebrow {
  font-size: .58rem !important;
  letter-spacing: .2em !important;
}

/* buttons/cards */
.sidebar button,
.inspector button,
.soft-action,
.primary-button {
  min-height: 30px !important;
  padding: 0 9px !important;
  border-radius: 11px !important;
  font-size: .69rem !important;
}

.mode-card,
.metric-card,
.info-card,
.file-card,
.status-card,
.theme-card {
  padding: 6px !important;
  border-radius: 12px !important;
}

.mode-card strong,
.metric-card strong,
.info-card strong,
.file-card strong,
.theme-card strong {
  font-size: .70rem !important;
}

.mode-card small,
.metric-card span,
.info-card span,
.info-card small,
.file-card small,
.theme-card small {
  font-size: .60rem !important;
}

/* -------- editor fixes -------- */
.editor-zone {
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.editor-topbar {
  flex: 0 0 auto !important;
  min-height: 34px !important;
  gap: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding-bottom: 6px !important;
  overflow: hidden !important;
}

.tab-chip,
.tiny-badge,
.font-control {
  font-size: .67rem !important;
  min-height: 28px !important;
  padding: 0 9px !important;
}

.tab-chip {
  max-width: 230px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.font-control {
  min-width: 175px !important;
}

.editor-frame {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  margin-top: 0 !important;
  border-radius: 13px !important;
  overflow: hidden !important;
}

.monaco-editor,
.monaco-editor *,
.view-line,
.view-line span {
  font-size: 14px !important;
}

/* -------- terminal fixes -------- */
.terminal-panel {
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.terminal-panel .status-row {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 6px !important;
}

.terminal-wrap {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: flex !important;
  align-items: stretch !important;
  margin-top: 0 !important;
  padding-top: 0 !important;
  border-radius: 13px !important;
  overflow: hidden !important;
}

.terminal-host {
  flex: 1 1 auto !important;
  min-height: 115px !important;
  height: auto !important;
  margin-top: 0 !important;
  border-radius: 13px !important;
}

.xterm,
.xterm * {
  font-size: 12px !important;
  line-height: 1.3 !important;
}

/* problems */
.problems-wrap {
  overflow: auto !important;
  border-radius: 13px !important;
}

.problems-wrap table,
.problems-wrap th,
.problems-wrap td {
  font-size: .66rem !important;
}
`;

write(cssPath, css);

/* ---------- App.tsx ---------- */
const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

/* make default editor font a little bigger than the tiny version */
app = app.replace(
  /const \[fontSize, setFontSize\] = useState\(\(\) => Number\(localStorage\.getItem\('nymphaea-pty-font-size'\) \|\| \d+\)\);/,
  "const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('nymphaea-pty-font-size') || 14));"
);

/* if xterm config had been shrunk too much */
app = app.replace(/fontSize:\s*12,/g, "fontSize: 13,");

write(appPath, app);

/* ---------- main.tsx ---------- */
/* safe theme-cache reset on startup so black-screen theme state stops sticking */
const mainPath = "src/main.tsx";
let main = fs.readFileSync(mainPath, "utf8");

const themeResetBlock = `
try {
  const badKeys = [
    "nymphaea-theme",
    "nymphaea-selected-theme",
    "theme",
    "active-theme"
  ];
  for (const key of badKeys) {
    const value = localStorage.getItem(key);
    if (value && value.toLowerCase().includes("black")) {
      localStorage.removeItem(key);
    }
  }
} catch {}
`;

if (!main.includes("const badKeys = [")) {
  main = themeResetBlock + "\n" + main;
  write(mainPath, main);
}

console.log("Balanced UI patch applied.");
