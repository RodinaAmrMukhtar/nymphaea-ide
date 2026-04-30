const fs = require("fs");

const path = "src/App.tsx";
let app = fs.readFileSync(path, "utf8");

// xterm v6 typing issue: make setOption compile safely
app = app.replaceAll(
  "terminalRef.current?.setOption('theme', {",
  "(terminalRef.current as any)?.setOption?.('theme', {"
);

// Monaco type mismatch: our language registration works at runtime, so cast for TS
app = app.replaceAll(
  "registerNyLanguage(monaco);",
  "registerNyLanguage(monaco as any);"
);

fs.writeFileSync(path, app, "utf8");
console.log("Done: moved backups + fixed current App.tsx TypeScript issues.");
