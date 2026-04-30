const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const insertAfter = `            <div className="button-grid">
              <button className="soft-action" onClick={doOpen}>Dosya Aç</button>
              <button className="soft-action" onClick={() => void doSave(false)}>Kaydet</button>
              <button className="soft-action" onClick={() => void doSave(true)}>Farklı Kaydet</button>
              <button className="soft-action" onClick={chooseWorkspace}>Klasör Aç</button>
            </div>
          </section>`;

const themesPanel = `            <div className="button-grid">
              <button className="soft-action" onClick={doOpen}>Dosya Aç</button>
              <button className="soft-action" onClick={() => void doSave(false)}>Kaydet</button>
              <button className="soft-action" onClick={() => void doSave(true)}>Farklı Kaydet</button>
              <button className="soft-action" onClick={chooseWorkspace}>Klasör Aç</button>
            </div>
          </section>

          <section className="panel-block sidebar-themes-block">
            <div className="eyebrow">Temalar</div>
            <h2>Temalar</h2>
            <div className="sidebar-theme-list">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  className={\`sidebar-theme-card \${theme.id === currentTheme.id ? 'active' : ''}\`}
                  onClick={() => setThemeId(theme.id)}
                  type="button"
                >
                  <span className="theme-dot" style={{ background: \`linear-gradient(135deg, \${theme.accent}, \${theme.accent2}, \${theme.accent3})\` }} />
                  <span>
                    <strong>{theme.name}</strong>
                    <small>{theme.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>`;

if (!app.includes("sidebar-themes-block")) {
  if (!app.includes(insertAfter)) {
    console.error("Could not find sidebar file section. No changes made.");
    process.exit(1);
  }
  app = app.replace(insertAfter, themesPanel);
  fs.writeFileSync(appPath, app, "utf8");
  console.log("Added Temalar section to the left sidebar.");
} else {
  console.log("Temalar section already exists.");
}

const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== SIDEBAR THEMES PANEL ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

.sidebar-theme-list {
  display: grid !important;
  gap: 7px !important;
}

.sidebar-theme-card {
  width: 100% !important;
  min-height: 42px !important;
  padding: 7px 8px !important;
  border-radius: 13px !important;
  border: 1px solid var(--line) !important;
  background: var(--panel-soft) !important;
  color: var(--text) !important;
  display: grid !important;
  grid-template-columns: 26px minmax(0, 1fr) !important;
  gap: 8px !important;
  align-items: center !important;
  text-align: left !important;
  box-shadow:
    inset 1px 1px 0 var(--shadow-hi),
    6px 6px 18px var(--shadow-lo) !important;
  cursor: pointer !important;
}

.sidebar-theme-card.active {
  outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent) !important;
  background: var(--panel-strong) !important;
}

.sidebar-theme-card .theme-dot {
  width: 24px !important;
  height: 24px !important;
  border-radius: 9px !important;
}

.sidebar-theme-card strong {
  display: block !important;
  font-size: .7rem !important;
  line-height: 1.05 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.sidebar-theme-card small {
  display: block !important;
  margin-top: 2px !important;
  font-size: .56rem !important;
  line-height: 1.1 !important;
  color: var(--muted) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");
console.log("Added sidebar theme styles.");
