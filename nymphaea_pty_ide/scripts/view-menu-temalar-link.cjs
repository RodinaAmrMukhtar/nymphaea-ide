const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

/*
  Replace the big theme list inside Görünüm with one menu item:
  Temalar -> switches left sidebar to the themes tab.
*/
const viewThemeListRegex =
  /            <div className="menu-section-label">Tema<\/div>\s*\{themes\.map\(\(theme\) => \([\s\S]*?<\/button>\s*\)\)\}\s*            <div className="menu-divider" \/>/;

const replacement = `            <button
              className="menu-item menu-item-strong"
              onClick={() => {
                setActiveSidebarTab('themes');
                setOpenMenu(null);
              }}
              type="button"
            >
              Temalar
            </button>
            <div className="menu-divider" />`;

if (!viewThemeListRegex.test(app)) {
  console.error("Could not find the theme list inside Görünüm menu. No changes made.");
  process.exit(1);
}

app = app.replace(viewThemeListRegex, replacement);

fs.writeFileSync(appPath, app, "utf8");
console.log("Done: Görünüm now opens Temalar side tab.");
