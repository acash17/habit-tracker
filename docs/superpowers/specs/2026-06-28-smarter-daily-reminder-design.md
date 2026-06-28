# Smarter daily reminder — design (autonomous loop, item 1)

**Date:** 2026-06-28
**Status:** Built autonomously by the loop — for user review at the PR
**Backlog item:** "Smarter daily reminder" from `memory/pacely-backlog-post-testing.md`

## Problem

The opt-in daily local notification fires the same generic line every day
("A gentle nudge — open today's plan…"). The user wants it to say *what they're
doing today* — surface the current plan so the reminder is useful, not wallpaper.

## Constraint that shapes the design

A repeating Capacitor local notification is scheduled once and **cannot read live app
state at fire time**. So the body can't be recomputed each morning from inside a
sleeping app. Two honest options:

- **A (chosen): bake the body in, refresh on launch.** Compute the body from today's
  blocks when the reminder is (re)scheduled, and reschedule on every app launch
  (`rescheduleOnLaunch`, already called from `main.jsx`). The body reflects the plan as
  of the last time the app was opened — correct for a daily habit app the user opens
  daily, zero new moving parts.
- B: pre-schedule N distinct one-off notifications with per-day bodies. More delivery
  control but complex, and still can't reflect edits made after scheduling. Rejected
  (YAGNI).

## Design

- New pure helper `src/daily-reminder-body.js` → `dailyReminderBody(blocks)`:
  - empty day → "A clean slate — open Pacely and plan your day. 🌱"
  - all done → "All done today — nice work. 🌿"
  - otherwise → "`N` left today: First task, Second task …" (first two undone labels,
    each clipped to 24 chars, trailing " …" when more than two remain).
- `src/notifications.js` `scheduleDaily` now sets `body = dailyReminderBody(load('blocks', []))`
  instead of the static string. Everything else (id, time, repeats, permission, web
  no-op) is unchanged, so the existing enable/disable/reschedule paths just work.

## Testing

- Unit (`src/daily-reminder-body.test.js`): empty / all-done / one / two / three+ /
  long-label-clip. 6 cases, all green.
- Native (manual, later): enable the reminder with tasks on Today, confirm the
  notification body lists them; complete tasks, reopen, confirm the body updates on the
  next scheduled fire.

## Notes / limits (for the reviewer)

- Native-only behaviour; on web `scheduleDaily` is a no-op (the body helper is still
  unit-tested in isolation).
- Body freshness is "as of last app open" by design — documented above. A future
  enhancement could reschedule whenever `blocks` change during a session, but that's out
  of scope for this item.
