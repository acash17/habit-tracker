# Paywall + entitlement + feature gating (Build 1) — design

**Date:** 2026-06-28
**Status:** Approved for plan
**Scope:** Build 1 of 2. Build 2 (Cashfree web checkout + Edge Function) is a separate spec.

## Problem

Pacely can't take money — there's no notion of a paid user and nothing is gated. We need
a **Pro entitlement** and a **paywall** that gates the right features, so that once Build 2
wires Cashfree (web checkout), paying users get unlocked. Build 1 delivers everything
*except* the payment call, so the gating and UX are testable immediately and carry zero
Play-Store policy risk (no in-app purchase on Android).

## Decisions (locked in brainstorming)

- **Payment path:** Cashfree on the **web app only** (Build 2). The Android app never shows
  in-app purchase — it only *reads* whether the account is Pro (Play-compliant).
- **Free vs Pro:**
  - Free: up to **3 goals**, Today timeline, basic recovery.
  - Pro: **unlimited goals**, **Insights (Rhythm + Calendar history)**, **due-day reminders**.
  - Cloud sync **stays free in Build 1** — gating it cleanly is messy (the whole app syncs)
    and risks core breakage; deferred as a later refinement.
- **Products:** **Lifetime ₹1299** (hero) and **Annual ₹999**.

## Architecture

### 1. Entitlement model — `src/entitlement.js` (new, pure + cached)

```
entitlement = { plan: 'free' | 'pro', source: 'lifetime' | 'annual' | null, expiresAt: string | null }

freeEntitlement(): entitlement            // { plan:'free', source:null, expiresAt:null }
isPro(ent, now = Date.now()): boolean     // plan==='pro' AND (expiresAt == null OR Date.parse(expiresAt) > now)
loadEntitlement(): entitlement            // localStorage cadence:entitlement, fallback freeEntitlement()
saveEntitlement(ent): void                // cache to localStorage
```

`isPro` + `freeEntitlement` are pure (Node-tested). Lifetime → `expiresAt: null`;
Annual → an ISO date 1 year out (set by Build 2's webhook). Until Build 2 exists the cache
defaults to free; Pro can be exercised in tests / dev by writing the cache directly.

### 2. Cloud source of truth — Supabase `entitlements` table

- Migration `supabase/migrations/<ts>_entitlements.sql`: table `entitlements`
  (`user_id uuid pk references auth.users`, `plan text`, `source text`, `expires_at timestamptz`,
  `updated_at timestamptz`), RLS so a user reads only their own row.
- `src/entitlement-sync.js` (new): `pullEntitlement(userId)` selects the row →
  `{ plan, source, expiresAt }` (or free when absent); writes it to the local cache.
- Wired into the existing sign-in bootstrap (`useCloudSync` already runs on `user.id`):
  after goals pull, also `pullEntitlement(user.id)` and cache. No-op when `cloudEnabled`
  is false. Build 2's webhook is what writes rows; Build 1 only reads.

### 3. Entitlement in React — `src/use-entitlement.js` (new)

`useEntitlement()` → `{ ent, pro }` where `pro = isPro(ent)`. Backed by a small shared
store (same `useSyncExternalStore` pattern as the habit-log store) so a future unlock
re-renders all gates live. Seeded from `loadEntitlement()`; updated when
`pullEntitlement` writes the cache (dispatch a `cadence:entitlement-changed` event the
store listens for).

### 4. Gating points

| Gate | Free behaviour | Where |
|---|---|---|
| **Goal cap (3)** | Creating a 4th goal opens the Paywall instead of creating | `app.jsx` `commitNewGoal` + `applyPlan` (every goal-creating path), guarded by `goalLimitReached(goals.length, ent)` |
| **Insights Rhythm + Calendar** | Locked overlay with a single Upgrade CTA covering those cards | `screen-insights.jsx` |
| **Due-day reminders** | Reminder section shows an Upgrade CTA instead of the controls | `screen-goals.jsx` `GoalDetail` |

`goalLimitReached(count, ent)` is pure (`!isPro(ent) && count >= 3`), Node-tested. The free
cap is the constant `FREE_GOAL_LIMIT = 3` exported from `entitlement.js`.

### 5. Paywall UI — `src/sheet-paywall.jsx` (new)

- A `PaywallSheet` (reuses `SheetShell`) — warm, on-brand: a short value list, the two
  plans as cards (**Lifetime ₹1299** highlighted, **Annual ₹999**), and an **Upgrade** CTA.
- Build 1: the CTA opens an inline "Checkout opens in the Pacely web app — coming next"
  state (placeholder). Build 2 replaces this with the Cashfree web checkout handoff.
- Opened from: the goal-cap block, the Insights lock, the reminder lock, and a "Pacely Pro"
  row in Settings. A single `openPaywall(reason)` in `app.jsx` controls it (like the other
  sheets), so every entry point is one call.

## Data flow

```
Sign in ─► useCloudSync ─► pullEntitlement(userId) ─► cache + notify store
App reads pro = isPro(ent):
  · create 4th goal while free ─► openPaywall('goals')
  · Insights while free ─► locked overlay ─► openPaywall('insights')
  · reminder toggle while free ─► openPaywall('reminders')
PaywallSheet (Build 1) ─► "coming on web" placeholder
(Build 2: webhook writes entitlements row ─► next pull flips pro=true ─► gates unlock)
```

## Error handling / edge cases

- Signed out / `cloudEnabled` false → entitlement is the local cache (free by default);
  gates apply, nothing throws. Existing users keep working — they just see the free caps.
- A user already over 3 goals (created before gating) → **never delete or hide their data.**
  `goalLimitReached` only blocks *creating new* goals; all existing goals stay visible and
  editable. (Pro unlock removes the create-block.)
- Pull failure → keep the cached entitlement; never downgrade a Pro user to free on a
  transient network error (only an explicit free/expired row downgrades).
- Annual expiry in the past → `isPro` returns false → gates re-apply (renewal handled later).

## Testing

**Unit (vitest, Node):**
- `entitlement.test.js`: `isPro` (free, pro-no-expiry, pro-future-expiry, pro-past-expiry);
  `goalLimitReached` (free <3, free ==3, free >3, pro always false); `loadEntitlement`
  round-trips and falls back to free.

**Manual (web preview):**
- Default (free): create goals — 4th opens the paywall; Insights shows the lock; reminder
  toggle shows Upgrade. Existing >3-goal data still fully visible.
- Simulate Pro by writing `cadence:entitlement = {plan:'pro',source:'lifetime',expiresAt:null}`
  → reload → all gates open, paywall not triggered.
- Paywall sheet renders both plans + CTA placeholder; no console errors.

## Out of scope (Build 2 — separate spec)

- Cashfree Edge Function (create order with secret, verify webhook signature).
- Web checkout flow + return/verify page that writes the `entitlements` row.
- Cross-device cloud-sync gating.
- Restore-purchase / receipt management beyond reading the entitlements row.
