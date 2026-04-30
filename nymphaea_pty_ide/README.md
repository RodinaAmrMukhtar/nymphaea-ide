# Nymphaea PTY IDE (all-fixes pass)

Run in WSL:

```bash
cd ~/nymphaea_pty_ide_all_fixed
npm install
NY_BIN=$HOME/turkce_lang_v10_repl_vm_fix_interactive/ny npm run tauri:dev
```

What changed:
- editor paste fixed with Ctrl/Cmd+V and a Paste Editor button
- terminal paste fixed with Ctrl/Cmd+Shift+V and a Paste Terminal button
- REPL mode added to the mode dropdown
- runtime/type/parse problems parsing improved
- Monaco unicode highlight boxes toned down
- Ctrl/Cmd+S saves, Ctrl/Cmd+Enter runs
