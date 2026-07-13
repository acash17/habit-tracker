// Records the Cadence feature-tour video (docs/demo/cadence-tour.webm).
//
// It boots the real app (index.html?skip=1), seeds a realistic set of goals +
// today blocks + a Pro entitlement into localStorage, then drives the phone
// through every feature using the built-in `cadence:demo` event bus (the same
// bus demo.html uses). Branded caption cards fade in between sections.
//
// Prereqs:
//   npm run dev                 # vite on http://localhost:5173 (separate shell)
//   npx playwright install chromium
// Run:
//   node scripts/record-demo.mjs
//
// GIF (optional, needs a full ffmpeg with the gif encoder):
//   ffmpeg -i docs/demo/cadence-tour.webm -vf "fps=8,scale=264:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" docs/demo/cadence-tour.gif

import { chromium } from 'playwright';
import { readFileSync, renameSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'docs', 'demo');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const seed = readFileSync(join(__dirname, 'demo-seed.js'), 'utf8');
const BASE = process.env.DEMO_URL || 'http://localhost:5173';
const W = 402, H = 874;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  recordVideo: { dir: outDir, size: { width: W, height: H } },
});
const p = await ctx.newPage();

await p.addInitScript(seed + `
  try {
    localStorage.setItem('cadence:goals', JSON.stringify(window.__SEED.goals));
    localStorage.setItem('cadence:blocks', JSON.stringify(window.__SEED.blocks));
    localStorage.setItem('cadence-onboarded', '1');
    localStorage.setItem('cadence:demo-purged-v1', '1');
    localStorage.setItem('pacely:feature-tour-seen', '1');
    localStorage.setItem('cadence:entitlement', JSON.stringify({ plan: 'pro', source: 'demo', expiresAt: null }));
  } catch (e) {}
`);

await p.addInitScript(() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function ensure() {
    let el = document.getElementById('__cap');
    if (el) return el;
    el = document.createElement('div');
    el.id = '__cap';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
      'text-align:center', 'padding:0 42px', 'gap:14px',
      'background:linear-gradient(160deg,#F6F1E8 0%,#EFE8DA 100%)',
      'opacity:0', 'transition:opacity .45s ease', 'pointer-events:none',
      "font-family:'Fraunces','Instrument Serif',Georgia,serif",
    ].join(';');
    el.innerHTML =
      '<div id="__cap_kicker" style="font-family:Geist,system-ui,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#C26A38;font-weight:600"></div>' +
      '<div id="__cap_title" style="font-size:34px;line-height:1.12;color:#1F1B16;letter-spacing:-0.5px"></div>' +
      '<div id="__cap_sub" style="font-family:Geist,system-ui,sans-serif;font-size:15px;line-height:1.5;color:rgba(31,27,22,0.62);max-width:300px;font-weight:400"></div>';
    document.body.appendChild(el);
    return el;
  }
  window.__capShow = async (kicker, title, sub, hold = 650) => {
    const el = ensure();
    el.querySelector('#__cap_kicker').textContent = kicker || '';
    el.querySelector('#__cap_title').textContent = title || '';
    el.querySelector('#__cap_sub').textContent = sub || '';
    el.style.opacity = '1';
    await wait(350 + hold);
  };
  window.__capHide = async () => {
    const el = document.getElementById('__cap');
    if (!el) return;
    el.style.opacity = '0';
    await wait(400);
  };
});

await p.goto(`${BASE}/index.html?skip=1`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

const fire = (detail) => p.evaluate((d) => window.dispatchEvent(new CustomEvent('cadence:demo', { detail: d })), detail);
const cap = (k, t, s, hold) => p.evaluate(({ k, t, s, hold }) => window.__capShow(k, t, s, hold), { k, t, s, hold });
const uncap = () => p.evaluate(() => window.__capHide());
const hold = (ms) => p.waitForTimeout(ms);

// A tight cut: the 8 strongest features. To include Library (05) and the
// Energy profile (10) for a longer tour, add them back and lengthen the holds.
const FEATURE = 1550;
const SECTIONS = [
  { detail: { tab: 'today' },                    k: 'Today',      t: 'Your day,\npre-planned',  s: 'Time-estimated blocks, already ordered.' },
  { detail: { tab: 'today', sheet: 'new-goal' }, k: 'New goal',   t: 'Goal in,\nplan out',      s: '"Run a 5K" → twelve realistic micro-steps.' },
  { detail: { tab: 'today', sheet: 'why' },      k: 'Planner',    t: 'Why this\norder?',        s: 'Energy, dependencies, deadlines — exposed.' },
  { detail: { tab: 'today', sheet: 'life' },     k: 'Resilience', t: 'When life\nhappens',      s: 'Missed a day? It rebalances. No broken streaks.' },
  { detail: { tab: 'today', sheet: 'voice' },    k: 'Voice',      t: 'Speak\nyour intent',      s: '"I want to write more." → a drafted plan.' },
  { detail: { tab: 'goals' },                    k: 'Goals',      t: 'Every plan,\none place',  s: 'Cards, not lists. Filter by rhythm.', filter: true },
  { detail: { tab: 'goals', editGoalIndex: 0 },  k: 'Editable',   t: 'Tap to\nshape it',        s: 'Rename, recolor, reorder sub-habits by hand.', closeEditor: true },
  { detail: { tab: 'insights' },                 k: 'Insights',   t: 'Patterns,\nnot pressure', s: 'What works, what stalls — never a scold.' },
];

// Intro
await cap('Cadence', 'The planner\nthat plans for you', 'Vague goals → tiny, time-estimated steps.', 1450);
await uncap();

for (const sec of SECTIONS) {
  await cap(sec.k, sec.t, sec.s, 650);
  await uncap();
  await fire(sec.detail);
  await hold(FEATURE);
  if (sec.filter) {
    try { await p.getByText('Daily', { exact: false }).first().click({ timeout: 1200 }); } catch {}
    await hold(1100);
  }
  if (sec.closeEditor) { await fire({ editGoalClose: true }); await hold(250); }
}

// Outro
await fire({ close: 'all', tab: 'today' });
await cap('Cadence', 'Progress\nwithout punishment', 'For real brains and real life.', 1450);
await hold(400);

await ctx.close();
await browser.close();

const webm = readdirSync(outDir).filter((f) => f.endsWith('.webm')).sort();
if (webm.length) {
  renameSync(join(outDir, webm[webm.length - 1]), join(outDir, 'cadence-tour.webm'));
  console.log('Wrote docs/demo/cadence-tour.webm');
}
