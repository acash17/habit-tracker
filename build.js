// Copies the web app into www/ so Capacitor can wrap it.
// Source of truth = Cadence.html + src/. We rename to index.html in www/.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'www');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(OUT);
fs.mkdirSync(OUT);

// Cadence.html -> www/index.html
fs.copyFileSync(path.join(ROOT, 'Cadence.html'), path.join(OUT, 'index.html'));

// src/ -> www/src/
copyDir(path.join(ROOT, 'src'), path.join(OUT, 'src'));

console.log('Built www/ (index.html + src/)');
