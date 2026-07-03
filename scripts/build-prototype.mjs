// Builds a fully self-contained, clickable prototype: one HTML file with the
// demo app, styles, and self-hosted fonts all inlined — no server, no network.
// Open pacely-prototype.html anywhere (double-click, email it, host it).
//
//   npm run prototype:file
//
// Output: dist-proto/pacely-prototype.html
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-proto');

execSync('npx vite build --config vite.proto.config.mjs', { cwd: root, stdio: 'inherit' });

const html = readFileSync(`${out}/demo.html`, 'utf8');
const jsFile = html.match(/src="\/(assets\/demo-[^"]+\.js)"/)?.[1];
const cssFile = html.match(/href="\/(assets\/demo-[^"]+\.css)"/)?.[1];
if (!jsFile || !cssFile) throw new Error('could not locate built demo assets in dist-proto/demo.html');

const js = readFileSync(`${out}/${jsFile}`, 'utf8').replaceAll('</script', '<\\/script');
const css = readFileSync(`${out}/${cssFile}`, 'utf8');

const font = (file) =>
  `url(data:font/woff2;base64,${readFileSync(`${root}/public/fonts/${file}`).toString('base64')}) format('woff2')`;

const fontFaces = `
@font-face { font-family: 'Geist'; font-style: normal; font-weight: 100 900; font-display: swap; src: ${font('geist-400.woff2')}; }
@font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: 100 900; font-display: swap; src: ${font('geist-mono-400.woff2')}; }
@font-face { font-family: 'Instrument Serif'; font-style: normal; font-weight: 400; font-display: swap; src: ${font('instrument-serif-400.woff2')}; }
@font-face { font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; font-display: swap; src: ${font('instrument-serif-400-italic.woff2')}; }
`;

// If the host page sandbox blocks localStorage, swap in an in-memory
// stand-in so the prototype still runs (state resets on reload).
const storageShim = `
try { window.localStorage.getItem('__probe__'); } catch {
  const mem = new Map();
  const stub = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(String(k), String(v)),
    removeItem: (k) => mem.delete(k),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
    clear: () => mem.clear(),
  };
  try { Object.defineProperty(window, 'localStorage', { value: stub, configurable: true }); } catch {}
}
`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pacely — Clickable Prototype</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
${fontFaces}
${css}
</style>
<script>${storageShim}</script>
</head>
<body>
<div id="demo-mount"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;

writeFileSync(`${out}/pacely-prototype.html`, page);
console.log(`dist-proto/pacely-prototype.html — ${(page.length / 1024).toFixed(0)} KB, fully self-contained`);
