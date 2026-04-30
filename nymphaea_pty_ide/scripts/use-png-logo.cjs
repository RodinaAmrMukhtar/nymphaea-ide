const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Add PNG URLs safely for Vite/Tauri.
if (!app.includes("const logoLightUrl = new URL('./ny.png'")) {
  const marker = "const tokensHelp = [";
  const index = app.indexOf(marker);

  if (index === -1) {
    console.error("Could not find tokensHelp marker.");
    process.exit(1);
  }

  const end = app.indexOf("];", index);
  if (end === -1) {
    console.error("Could not find end of tokensHelp.");
    process.exit(1);
  }

  const insertAt = end + 2;
  app =
    app.slice(0, insertAt) +
    `

const logoLightUrl = new URL('./ny.png', import.meta.url).href;
const logoDarkUrl = new URL('./nyl.png', import.meta.url).href;
` +
    app.slice(insertAt);
}

// Replace NY text logo with image logo.
const logoRegex = /<div className="logo-chip">\s*NY\s*<\/div>/;

if (!logoRegex.test(app)) {
  console.error("Could not find <div className=\"logo-chip\">NY</div>. No changes made.");
  process.exit(1);
}

app = app.replace(
  logoRegex,
  `<div className="logo-chip logo-chip-image">
          <img
            src={currentTheme.mode === 'dark' ? logoDarkUrl : logoLightUrl}
            alt="Nymphaea"
            className="logo-image"
          />
        </div>`
);

fs.writeFileSync(appPath, app, "utf8");
console.log("Done: PNG logo added.");
