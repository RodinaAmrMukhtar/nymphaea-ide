const fs = require("fs");

const path = "src-tauri/tauri.conf.json";
const config = JSON.parse(fs.readFileSync(path, "utf8"));

config.productName = "Nymphaea IDE";

if (config.app && Array.isArray(config.app.windows)) {
  config.app.windows = config.app.windows.map((win) => ({
    ...win,
    title: "Nymphaea IDE"
  }));
}

fs.writeFileSync(path, JSON.stringify(config, null, 2), "utf8");
console.log("Done: renamed app/window title to Nymphaea IDE.");
