const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

/* 1) add SidebarTab type */
if (!app.includes("type SidebarTab =")) {
  app = app.replace(
    "type ThemeId = 'rose' | 'nymphaea' | 'luna' | 'mint' | 'graphite' | 'peach';",
    "type ThemeId = 'rose' | 'nymphaea' | 'luna' | 'mint' | 'graphite' | 'peach';\ntype SidebarTab = 'explorer' | 'search' | 'source' | 'run' | 'themes';"
  );
}

/* 2) add sidebar tab state */
if (!app.includes("const [activeSidebarTab, setActiveSidebarTab]")) {
  app = app.replace(
    "  const [themeId, setThemeId] = useState<ThemeId>(() => (localStorage.getItem('nymphaea-pty-theme') as ThemeId) || 'rose');",
    "  const [themeId, setThemeId] = useState<ThemeId>(() => (localStorage.getItem('nymphaea-pty-theme') as ThemeId) || 'rose');\n  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');"
  );
}

/* 3) replace old left sidebar with tabbed rail sidebar */
const newSidebar = `<aside className="sidebar neo-card">
          <div className="sidebar-shell">
            <div className="sidebar-rail">
              <button
                className={\`rail-tab \${activeSidebarTab === 'explorer' ? 'active' : ''}\`}
                onClick={() => setActiveSidebarTab('explorer')}
                title="Gezgin"
                type="button"
              >
                G
              </button>

              <button
                className={\`rail-tab \${activeSidebarTab === 'search' ? 'active' : ''}\`}
                onClick={() => setActiveSidebarTab('search')}
                title="Ara"
                type="button"
              >
                A
              </button>

              <button
                className={\`rail-tab \${activeSidebarTab === 'source' ? 'active' : ''}\`}
                onClick={() => setActiveSidebarTab('source')}
                title="Kaynak"
                type="button"
              >
                K
              </button>

              <button
                className={\`rail-tab \${activeSidebarTab === 'run' ? 'active' : ''}\`}
                onClick={() => setActiveSidebarTab('run')}
                title="Çalıştır"
                type="button"
              >
                Ç
              </button>

              <button
                className={\`rail-tab \${activeSidebarTab === 'themes' ? 'active' : ''}\`}
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
                  <input className="sidebar-input" placeholder="Açık sekmelerde ara..." />
                  <div className="sidebar-empty">Bir şey yaz.</div>
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
                      <button key={item} className={\`mode-card \${mode === item ? 'active' : ''}\`} onClick={() => setMode(item)}>
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
                        className={\`sidebar-theme-card \${theme.id === currentTheme.id ? 'active' : ''}\`}
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
        </aside>`;

const sidebarRegex = /<aside className="sidebar neo-card">[\s\S]*?<\/aside>/;

if (!sidebarRegex.test(app)) {
  console.error("Could not find the old sidebar block.");
  process.exit(1);
}

app = app.replace(sidebarRegex, newSidebar);

fs.writeFileSync(appPath, app, "utf8");
console.log("App.tsx updated with left tab rail.");

/* 4) styles */
const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== LEFT TAB RAIL SIDEBAR ===== */";
const oldIndex = css.indexOf(marker);
if (oldIndex >= 0) css = css.slice(0, oldIndex);

css += `

${marker}

.sidebar {
  padding: 0 !important;
  overflow: hidden !important;
  min-height: 0 !important;
}

.sidebar-shell {
  display: grid !important;
  grid-template-columns: 54px minmax(0, 1fr) !important;
  height: 100% !important;
  min-height: 0 !important;
}

.sidebar-rail {
  border-right: 1px solid var(--line) !important;
  padding: 10px 6px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  align-items: center !important;
  background: color-mix(in srgb, var(--panel) 88%, white 12%) !important;
}

.rail-tab {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  border-radius: 14px !important;
  border: 1px solid var(--line) !important;
  background: var(--panel-soft) !important;
  color: var(--text) !important;
  font-size: .8rem !important;
  font-weight: 800 !important;
  cursor: pointer !important;
  box-shadow:
    inset 1px 1px 0 var(--shadow-hi),
    6px 6px 16px var(--shadow-lo) !important;
}

.rail-tab.active {
  background: color-mix(in srgb, var(--accent) 14%, var(--panel-strong) 86%) !important;
  outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent) !important;
}

.sidebar-panel {
  min-height: 0 !important;
  overflow: auto !important;
  padding: 10px !important;
}

.sidebar-note {
  margin-top: 10px !important;
  font-size: .66rem !important;
  line-height: 1.35 !important;
  color: var(--muted) !important;
  word-break: break-word !important;
}

.sidebar-input {
  width: 100% !important;
  min-height: 34px !important;
  padding: 0 12px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  background: var(--input-bg) !important;
  color: var(--text) !important;
  outline: none !important;
  font-size: .7rem !important;
  margin-bottom: 10px !important;
}

.sidebar-empty {
  font-size: .68rem !important;
  color: var(--muted) !important;
  padding: 4px 0 !important;
}

.sidebar-run-head {
  margin-bottom: 10px !important;
  font-size: .7rem !important;
  color: var(--muted) !important;
}

.sidebar-theme-list {
  display: grid !important;
  gap: 7px !important;
}

.sidebar-theme-card {
  width: 100% !important;
  min-height: 44px !important;
  padding: 7px 8px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  background: var(--panel-soft) !important;
  color: var(--text) !important;
  display: grid !important;
  grid-template-columns: 26px minmax(0, 1fr) !important;
  gap: 8px !important;
  align-items: center !important;
  text-align: left !important;
  cursor: pointer !important;
}

.sidebar-theme-card.active {
  background: var(--panel-strong) !important;
  outline: 2px solid color-mix(in srgb, var(--accent) 40%, transparent) !important;
}

.sidebar-theme-card .theme-dot {
  width: 24px !important;
  height: 24px !important;
  border-radius: 8px !important;
}

.sidebar-theme-card strong {
  display: block !important;
  font-size: .68rem !important;
  line-height: 1.05 !important;
}

.sidebar-theme-card small {
  display: block !important;
  margin-top: 2px !important;
  font-size: .55rem !important;
  line-height: 1.1 !important;
  color: var(--muted) !important;
}

.button-grid {
  display: grid !important;
  gap: 8px !important;
}

.mode-list {
  display: grid !important;
  gap: 8px !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");
console.log("styles.css updated for left tab rail.");
