const fs = require("fs");

const config = {
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Nymphaea IDE",
  "version": "1.0.0",
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "publisher": "Rodina Amr Mukhtar",
    "copyright": "Copyright © 2026 Rodina Amr Mukhtar",
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper",
        "silent": true
      },
      "wix": {
        "language": "en-US"
      },
      "nsis": {
        "installMode": "both",
        "displayLanguageSelector": false,
        "languages": ["English"],
        "startMenuFolder": "Nymphaea IDE"
      }
    }
  }
};

fs.writeFileSync(
  "src-tauri/tauri.windows.conf.json",
  JSON.stringify(config, null, 2),
  "utf8"
);

console.log("Clean tauri.windows.conf.json written.");
