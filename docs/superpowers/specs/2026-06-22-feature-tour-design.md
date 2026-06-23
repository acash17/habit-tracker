# Pacely Feature Tour — floating-cloud coachmarks

**Date:** 2026-06-22
**Status:** Approved

## Goal
Teach every key feature to a new user via a guided spotlight tour of "floating
cloud" coachmarks. Auto-run once after onboarding; replayable anytime.

## Engine
Repurpose the existing `TourOverlay` (spotlight cutout + `cadence-tour-action`
bus that switches tabs / opens sheets). Parametrize it so it accepts a `steps`
array and per-variant labels, so the **investor tour (`?tour=1`) keeps working
unchanged** and the new **user feature tour** is a separate step set
(`FEATURE_TOUR_STEPS`).

## The cloud
- Soft rounded bubble, warm `--paper` bg, soft shadow.
- A pointer **tail** toward the spotlighted element (flips above/below by
  placement). Centered steps have no tail.
- Gentle float-in + subtle idle bob (CSS keyframes).
- Serif title + sans body (current type system), terra Next, progress dots, Skip.

## Steps (anchored via `data-tour`, switches tabs as needed)
1. Welcome (center)
2. Today timeline (`today-timeline`)
3. Energy dial (`energy-card`) — existing anchor
4. Why this order (`why-button`) — existing anchor
5. Quick actions row (`quick-actions`) — Voice / Library / Life-happened
6. New goal FAB (`fab-new`) — AI → editable steps
7. Goals tab (`tab-goals`) — inline edit
8. Insights tab (`tab-insights`) — patterns not scores
9. You tab (`tab-you`) — privacy / sync
10. Finish (center) — "replay anytime via ?"

## Triggers
- **Auto-run once:** after `finishOnboarding`, if `localStorage
  'pacely:feature-tour-seen' !== '1'`, start the tour. Mark seen on finish/skip.
- **Replay:** floating `?` Help bubble above the tab bar on every main screen,
  plus a "Replay feature tour" row in You/Settings. Replay ignores the flag.

## Files
- `tour.jsx` — parametrize `TourOverlay({ steps, label, onExit })`; add
  `FEATURE_TOUR_STEPS`; add cloud tail + bob.
- `app.jsx` — feature-tour state + auto-run-after-onboarding; floating `?`
  button; `data-tour` anchors on nav tabs + FAB; replay event listener.
- `screen-today.jsx` — `data-tour` anchors on timeline + quick-actions row.
- `screen-settings.jsx` — "Replay feature tour" row.
- `styles.css` — `tour-bob` keyframes (reuse existing `tour-pop`).

## Non-goals / won't break
- Investor `?tour=1` flow stays intact.
- No user data touched. Persistence is a single localStorage flag.
- No per-screen `?` icons (header clutter).
