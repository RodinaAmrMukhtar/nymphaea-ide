const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

// Add logo urls near the top if missing
if (!app.includes("logoLightUrl") || !app.includes("logoDarkUrl")) {
  const insertAfter = app.indexOf("const starterProgram");
  if (insertAfter === -1) {
    console.error("Could not find insert place.");
    process.exit(1);
  }

  app =
    app.slice(0, insertAfter) +
    `const logoLightUrl = new URL('./ny.png', import.meta.url).href;
const logoDarkUrl = new URL('./nyl.png', import.meta.url).href;

` +
    app.slice(insertAfter);
}

// Replace any logo-chip that contains NY
const logoRegex = /<div\s+className="logo-chip[^"]*">\s*NY\s*<\/div>/g;

const replacement = `<div className="logo-chip logo-chip-image">
            <img
              src={currentTheme.mode === 'dark' ? logoDarkUrl : logoLightUrl}
              alt="Nymphaea"
              className="logo-image"
            />
          </div>`;

const before = app;
app = app.replace(logoRegex, replacement);

if (before === app) {
  console.error("No logo-chip NY block was replaced. Run: Select-String -Path src\\App.tsx -Pattern \"logo-chip|NY\" -Context 3,5");
  process.exit(1);
}

fs.writeFileSync(appPath, app, "utf8");
console.log("Done: replaced NY with PNG logo.");
