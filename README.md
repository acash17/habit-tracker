# Cadence

Habit sequence planner — iOS-style prototype. React + Babel-in-browser, no build step.

## Run

```bash
npm start
```

Opens at http://localhost:5173/Cadence.html

Needs Node (for `npx`). Nothing to install — `serve` fetched on demand.

## Structure

- `Cadence.html` — main app shell, loads all JSX via Babel standalone
- `src/` — React components (JSX, no bundler)
  - `app.jsx` — shell + tab bar
  - `screen-*.jsx` — Today / Goals / Insights / Settings
  - `sheet-*.jsx` — bottom sheets (energy, library, voice, life-happened)
  - `onboarding.jsx`, `planner.jsx`, `tour.jsx`, `ui.jsx`, `data.jsx`, `ios-frame.jsx`
- `standalone/` — alternate HTML entry points
- `Investor Landing.html`, `Pitch Deck.html` — marketing pages
- `Habit_Sequence_Planner_*.pdf` — product docs

## Notes

JSX runs untranspiled via `@babel/standalone` — fine for prototype, slow to load. Migrate to Vite when ready for production.
