// Rasterize assets/icon.svg into the PNG inputs expected by @capacitor/assets.
//   icon.png             (1024x1024) — single solid-bg icon
//   icon-foreground.png  (1024x1024) — adaptive foreground (just the C)
//   icon-background.png  (1024x1024) — adaptive background (paper)
//   splash.png           (2732x2732) — light splash
//   splash-dark.png      (2732x2732) — dark splash
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

await fs.mkdir(OUT, { recursive: true });

// Full icon SVG (already exists).
const iconSvgPath = path.join(OUT, 'icon.svg');
const iconSvg = await fs.readFile(iconSvgPath);

// Foreground-only — same SVG but with bg transparent (replace the paper rect fill).
const fgSvg = iconSvg.toString()
  .replace('<rect width="1024" height="1024" fill="url(#paperGlow)"/>', '<rect width="1024" height="1024" fill="transparent"/>');

// Background-only — paper rect, no C.
const bgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="g" cx="0.3" cy="0.25" r="0.9">
      <stop offset="0%" stop-color="#FBF7EE"/>
      <stop offset="60%" stop-color="#F2EAD7"/>
      <stop offset="100%" stop-color="#E8DDC4"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

// Splash — centered logo on paper, larger margins, both light + dark.
function splashSvg(bgColor, inkColor) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${bgColor}"/>
  <g transform="translate(1366 1180)">
    <g transform="scale(2.4)">
      <path d="
        M 220 -200
        A 240 260 0 1 0 220 200
        L 160 130
        A 170 190 0 1 1 160 -130
        Z
      " fill="${inkColor}"/>
    </g>
  </g>
  <g transform="translate(1366 2090)">
    <text x="0" y="0" text-anchor="middle"
      font-family="Georgia, serif" font-size="120" fill="${inkColor}"
      font-style="italic" opacity="0.85">Cadence</text>
  </g>
</svg>`;
}

const targets = [
  { name: 'icon.png',            svg: iconSvg,                              size: 1024 },
  { name: 'icon-foreground.png', svg: Buffer.from(fgSvg),                   size: 1024 },
  { name: 'icon-background.png', svg: Buffer.from(bgSvg),                   size: 1024 },
  { name: 'splash.png',          svg: Buffer.from(splashSvg('#F6F1E8','#C26A38')), size: 2732 },
  { name: 'splash-dark.png',     svg: Buffer.from(splashSvg('#1F1B16','#D8763F')), size: 2732 },
];

for (const t of targets) {
  const buf = await sharp(t.svg, { density: 384 })
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(OUT, t.name), buf);
  console.log(`✓ ${t.name} (${t.size}×${t.size})`);
}

console.log('Done. Run: npx capacitor-assets generate');
