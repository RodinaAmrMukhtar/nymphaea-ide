const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

/* Add new Görünüm settings states */
if (!app.includes("const [uiScale, setUiScale]")) {
  app = app.replace(
    "  const [showLineNumbers, setShowLineNumbers] = useState(true);",
    `  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(() => localStorage.getItem('nymphaea-pty-show-whitespace') === '1');
  const [uiScale, setUiScale] = useState(() => Number(localStorage.getItem('nymphaea-pty-ui-scale') || 90));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => localStorage.getItem('nymphaea-pty-auto-save') === '1');
  const [autoSaveDelay, setAutoSaveDelay] = useState(() => Number(localStorage.getItem('nymphaea-pty-auto-save-delay') || 900));`
  );
}

/* Persist/apply new settings */
if (!app.includes("nymphaea-pty-ui-scale")) {
  console.log("WARN: UI scale state marker missing.");
}

if (!app.includes("document.documentElement.style.setProperty('--ui-scale'")) {
  app = app.replace(
    "  useEffect(() => {\n    localStorage.setItem('nymphaea-pty-font-size', String(fontSize));\n  }, [fontSize]);",
    `  useEffect(() => {
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
  }, [autoSaveEnabled, autoSaveDelay, code, currentFilePath, isRunning]);`
  );
}

/* Add whitespace option to Monaco */
if (!app.includes("renderWhitespace: showWhitespace")) {
  app = app.replace(
    "                wordWrap: wordWrap ? 'on' : 'off',",
    "                wordWrap: wordWrap ? 'on' : 'off',\n                renderWhitespace: showWhitespace ? 'all' : 'none',"
  );
}

/* Replace Görünüm dropdown with settings menu */
const viewBlockRegex = /        \{openMenu === 'view' && \([\s\S]*?\n        \)\}\n\n        \{openMenu === 'run' && \(/;

const newViewBlock = `        {openMenu === 'view' && (
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

        {openMenu === 'run' && (`;

if (!viewBlockRegex.test(app)) {
  console.error("Could not find Görünüm dropdown block. No changes made.");
  process.exit(1);
}

app = app.replace(viewBlockRegex, newViewBlock);

fs.writeFileSync(appPath, app, "utf8");

const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== GORUNUM SETTINGS MENU ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

/* make UI scale actually affect the app */
.app-shell {
  transform: scale(var(--ui-scale, 0.9)) !important;
  transform-origin: top left !important;
  width: calc(100% / var(--ui-scale, 0.9)) !important;
  height: calc(100vh / var(--ui-scale, 0.9)) !important;
}

/* settings-style Görünüm dropdown */
.view-settings-menu {
  width: 560px !important;
  max-height: calc(100vh - 110px) !important;
  padding: 10px !important;
  overflow: auto !important;
}

.view-setting-row {
  width: 100% !important;
  min-height: 58px !important;
  padding: 9px 10px !important;
  margin-bottom: 8px !important;
  border-radius: 16px !important;
  border: 1px solid var(--line) !important;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--panel-strong) 86%, var(--accent) 6%),
      color-mix(in srgb, var(--panel-soft) 88%, var(--accent-2) 6%)
    ) !important;
  color: var(--text) !important;
  display: grid !important;
  grid-template-columns: 30px minmax(150px, 1fr) auto 150px auto !important;
  align-items: center !important;
  gap: 10px !important;
  box-shadow:
    inset 1px 1px 0 var(--shadow-hi),
    5px 5px 15px var(--shadow-lo) !important;
}

.view-setting-row:has(.view-switch) {
  grid-template-columns: 30px minmax(150px, 1fr) auto !important;
}

.view-setting-icon {
  width: 24px !important;
  height: 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 8px !important;
  color: var(--accent) !important;
  font-size: .64rem !important;
  font-weight: 900 !important;
  background: color-mix(in srgb, var(--accent) 13%, transparent) !important;
}

.view-setting-copy strong {
  display: block !important;
  font-size: .78rem !important;
  line-height: 1.15 !important;
  color: var(--text) !important;
}

.view-setting-copy small {
  display: block !important;
  margin-top: 3px !important;
  font-size: .64rem !important;
  line-height: 1.2 !important;
  color: var(--muted) !important;
}

.view-setting-value {
  color: var(--accent) !important;
  font-size: .82rem !important;
  min-width: 54px !important;
  text-align: right !important;
}

.view-setting-range {
  width: 150px !important;
  accent-color: var(--accent) !important;
}

.view-reset-button {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  background: var(--panel-soft) !important;
  color: var(--text) !important;
  cursor: pointer !important;
}

.view-switch {
  width: 48px !important;
  height: 28px !important;
  position: relative !important;
  display: inline-flex !important;
  justify-self: end !important;
}

.view-switch input {
  display: none !important;
}

.view-switch span {
  position: absolute !important;
  inset: 0 !important;
  border-radius: 999px !important;
  border: 1px solid var(--line) !important;
  background: var(--panel-soft) !important;
  box-shadow: inset 1px 1px 4px var(--shadow-lo) !important;
  cursor: pointer !important;
}

.view-switch span::before {
  content: "" !important;
  position: absolute !important;
  width: 22px !important;
  height: 22px !important;
  top: 2px !important;
  left: 3px !important;
  border-radius: 999px !important;
  background: var(--panel-strong) !important;
  box-shadow: 3px 3px 8px var(--shadow-lo) !important;
  transition: transform 180ms ease, background 180ms ease !important;
}

.view-switch input:checked + span {
  background: color-mix(in srgb, var(--accent) 24%, var(--panel-soft)) !important;
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border)) !important;
}

.view-switch input:checked + span::before {
  transform: translateX(19px) !important;
  background: var(--accent-2) !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");

console.log("Done: Görünüm settings menu added.");
