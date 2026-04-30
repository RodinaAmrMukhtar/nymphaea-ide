const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// 1) Add search state
if (!app.includes("const [sidebarSearchQuery, setSidebarSearchQuery]")) {
  app = app.replace(
    "  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');",
    "  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');\n  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');"
  );
}

// 2) Add search matches + jump function
if (!app.includes("const searchMatches = useMemo")) {
  app = app.replace(
    "  const wordCount = useMemo(() => code.trim().split(/\\s+/).filter(Boolean).length, [code]);",
    `  const wordCount = useMemo(() => code.trim().split(/\\s+/).filter(Boolean).length, [code]);

  const searchMatches = useMemo(() => {
    const query = sidebarSearchQuery.trim().toLocaleLowerCase('tr');
    if (!query) return [];

    return code
      .split('\\n')
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
  };`
  );
}

// 3) Replace the fake search panel
const oldSearchBlock = `              {activeSidebarTab === 'search' && (
                <section className="panel-block compact">
                  <div className="eyebrow">Ara</div>
                  <h2>Ara</h2>
                  <input className="sidebar-input" placeholder="Açık sekmelerde ara..." />
                  <div className="sidebar-empty">Bir şey yaz.</div>
                </section>
              )}`;

const newSearchBlock = `              {activeSidebarTab === 'search' && (
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
              )}`;

if (app.includes(oldSearchBlock)) {
  app = app.replace(oldSearchBlock, newSearchBlock);
} else {
  console.log("WARN: exact search block not found. No search panel replacement made.");
}

fs.writeFileSync(appPath, app, "utf8");

// 4) CSS polish for chips + search results
const cssPath = "src/styles.css";
let css = fs.readFileSync(cssPath, "utf8");

const marker = "/* ===== RODINA REAL SEARCH + CLEAN CHIPS ===== */";
const old = css.indexOf(marker);
if (old >= 0) css = css.slice(0, old);

css += `

${marker}

/* cleaner top editor pills: unsaved.ny / 11 lines / 25 words */
.editor-topbar {
  align-items: center !important;
  gap: 8px !important;
  padding-bottom: 6px !important;
}

.editor-tools {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
}

.tab-chip,
.editor-tools .tiny-badge,
.problems-panel .tiny-badge,
.font-control {
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 12px !important;
  border-radius: 999px !important;
  font-size: .68rem !important;
  font-weight: 800 !important;
  color: var(--text) !important;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--panel-strong) 82%, var(--accent) 9%),
      color-mix(in srgb, var(--panel-soft) 86%, var(--accent-2) 8%)
    ) !important;
  border: 1px solid color-mix(in srgb, var(--border) 75%, var(--accent) 20%) !important;
  box-shadow:
    inset 1px 1px 0 var(--shadow-hi),
    5px 5px 14px var(--shadow-lo) !important;
}

.tab-chip {
  max-width: 240px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.tab-chip span {
  color: var(--accent-3) !important;
  margin-left: 6px !important;
}

.font-control {
  gap: 8px !important;
  min-width: 170px !important;
}

.font-control input {
  height: 4px !important;
  accent-color: var(--accent) !important;
}

/* problems issue chip */
.problems-panel .tiny-badge {
  min-width: 58px !important;
  justify-content: center !important;
}

/* actual working search panel */
.search-results {
  display: grid !important;
  gap: 7px !important;
  margin-top: 8px !important;
}

.search-result {
  width: 100% !important;
  padding: 8px 9px !important;
  border-radius: 12px !important;
  border: 1px solid var(--line) !important;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--panel-strong) 86%, var(--accent) 7%),
      color-mix(in srgb, var(--panel-soft) 88%, var(--accent-2) 7%)
    ) !important;
  color: var(--text) !important;
  display: grid !important;
  gap: 3px !important;
  text-align: left !important;
  cursor: pointer !important;
  box-shadow:
    inset 1px 1px 0 var(--shadow-hi),
    4px 4px 12px var(--shadow-lo) !important;
}

.search-result:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border)) !important;
  transform: translateY(-1px) !important;
}

.search-line {
  font-size: .62rem !important;
  font-weight: 900 !important;
  color: var(--accent) !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

.search-preview {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
  font-size: .66rem !important;
  color: var(--text) !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.sidebar-input {
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--input-bg) 88%, var(--accent) 6%),
      color-mix(in srgb, var(--input-bg) 88%, var(--accent-2) 6%)
    ) !important;
  color: var(--text) !important;
  border-color: var(--line) !important;
}

.sidebar-input:focus {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border)) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent) !important;
}
`;

fs.writeFileSync(cssPath, css, "utf8");

console.log("Done: search tab works + chips polished.");
