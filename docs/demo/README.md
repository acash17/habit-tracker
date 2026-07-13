# Cadence — feature tour

A ~35-second walkthrough of the app, driven through the real UI. Both files are
under 5 MB.

![Cadence feature tour](./cadence-tour.gif)

- **`cadence-tour.webm`** — higher-quality video (402×874, ~3.5 MB). Crisper text; best for landing pages / stores.
- **`cadence-tour.gif`** — autoplaying GIF (~4.4 MB) for READMEs, Slack, X, and anywhere a video won't embed.

## What it shows

Intro → **Today** (pre-planned time blocks) → **New goal → plan** → **Why this order?** →
**Life happened** → **Voice plan** → **Goals** (with cadence filters) →
**Goal editor** (year heatmap + stats) → **Insights** (calendar + breakpoints) → outro.

The script also has commented-out **Library** and **Energy profile** sections —
add them back and lengthen the holds for a longer tour.

## Regenerating

The recording boots the real app and seeds a realistic dataset into
`localStorage`, then drives the phone through each feature with the built-in
`cadence:demo` event bus (the same one `demo.html` uses). Seed data uses goal
ids `g1`/`g2`/`g3` so `habit-log.js` auto-fills rich heatmap history.

```bash
npm run dev                     # vite on :5173, in a separate shell
npx playwright install chromium # one-time
node scripts/record-demo.mjs    # writes docs/demo/cadence-tour.webm
```

To (re)build the GIF from the video, with a full ffmpeg build:

```bash
ffmpeg -i docs/demo/cadence-tour.webm \
  -vf "fps=8,scale=264:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  docs/demo/cadence-tour.gif
```

Tunable copy/timing lives in `scripts/record-demo.mjs`; seed data in
`scripts/demo-seed.js`.
