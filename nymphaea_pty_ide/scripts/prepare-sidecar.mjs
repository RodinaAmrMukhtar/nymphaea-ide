import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run prepare:sidecar -- /absolute/path/to/ny');
  process.exit(1);
}

const source = path.resolve(input);
if (!fs.existsSync(source)) {
  console.error(`Not found: ${source}`);
  process.exit(1);
}

const extension = process.platform === 'win32' ? '.exe' : '';
const targetTriple = execSync('rustc --print host-tuple').toString().trim();
const outDir = path.resolve('src-tauri/binaries');
fs.mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, `ny-${targetTriple}${extension}`);
fs.copyFileSync(source, dest);
if (process.platform !== 'win32') {
  fs.chmodSync(dest, 0o755);
}
console.log(`Copied sidecar to ${dest}`);
