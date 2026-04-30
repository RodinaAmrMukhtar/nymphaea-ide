const fs = require("fs");

const appPath = "src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("const logoLightUrl = new URL('./ny.png'")) {
  const insertBefore = app.indexOf("const starterProgram");
  if (insertBefore === -1) {
    console.error("Could not find const starterProgram.");
    process.exit(1);
  }

  app =
    app.slice(0, insertBefore) +
    `const logoLightUrl = new URL('./ny.png', import.meta.url).href;
const logoDarkUrl = new URL('./nyl.png', import.meta.url).href;

` +
    app.slice(insertBefore);
}

const oldLogo = `<button className="logo-chip" onClick={newFile} title="New file">NY</button>`;

const newLogo = `<button className="logo-chip logo-chip-image" onClick={newFile} title="New file">
            <img
              src={currentTheme.mode === 'dark' ? logoDarkUrl : logoLightUrl}
              alt="Nymphaea"
              className="logo-image"
            />
          </button>`;

if (!app.includes(oldLogo)) {
  console.error("Could not find exact NY logo button. No changes made.");
  process.exit(1);
}

app = app.replace(oldLogo, newLogo);

fs.writeFileSync(appPath, app, "utf8");
console.log("Done: replaced NY button with PNG logo.");
