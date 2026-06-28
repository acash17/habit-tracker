# Paywall + Entitlement + Gating (Build 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a free/Pro entitlement, a paywall sheet, and feature-gating (goal cap, Insights, reminders) — everything except the actual Cashfree payment (Build 2).

**Architecture:** A pure `entitlement.js` (isPro / goalLimitReached / cache) feeds a tiny `useEntitlement` shared store. Gates read `pro`; when free hits a wall, `openPaywall(reason)` shows `PaywallSheet`. Entitlement source of truth is a Supabase `entitlements` table pulled on sign-in (read-only here; Build 2 writes it).

**Tech Stack:** React 18, Vite, vitest (Node pure-logic tests), Supabase. No payment SDK in Build 1.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/entitlement.js` | **New.** Pure: `freeEntitlement`, `isPro`, `goalLimitReached`, `FREE_GOAL_LIMIT`, `loadEntitlement`, `saveEntitlement`. |
| `src/entitlement.test.js` | **New.** Unit tests for the pure helpers. |
| `src/use-entitlement.js` | **New.** Shared store + `useEntitlement()` → `{ ent, pro }`; `refreshEntitlement()`. |
| `src/entitlement-sync.js` | **New.** `pullEntitlement(userId)` from Supabase → cache. |
| `src/cloud-sync.js` | Call `pullEntitlement` in the sign-in bootstrap. |
| `src/sheet-paywall.jsx` | **New.** `PaywallSheet` — plans + CTA placeholder. |
| `src/app.jsx` | `openPaywall(reason)` + render sheet; gate `commitNewGoal`/`applyPlan`. |
| `src/screen-insights.jsx` | Lock Rhythm + Calendar for free. |
| `src/screen-goals.jsx` | Lock reminder section for free. |
| `src/screen-settings.jsx` | "Pacely Pro" row → opens paywall. |
| `supabase/migrations/20260628_entitlements.sql` | **New.** `entitlements` table + RLS. |

---

## Task 1: Pure entitlement helpers

**Files:** Create `src/entitlement.js`, `src/entitlement.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/entitlement.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import { freeEntitlement, isPro, goalLimitReached, FREE_GOAL_LIMIT, loadEntitlement, saveEntitlement } from './entitlement.js';

beforeEach(() => {
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
});

describe('isPro', () => {
  const now = Date.parse('2026-06-28T00:00:00Z');
  test('free → false', () => expect(isPro(freeEntitlement(), now)).toBe(false));
  test('pro lifetime (no expiry) → true', () => expect(isPro({ plan: 'pro', source: 'lifetime', expiresAt: null }, now)).toBe(true));
  test('pro annual future expiry → true', () => expect(isPro({ plan: 'pro', source: 'annual', expiresAt: '2027-06-28T00:00:00Z' }, now)).toBe(true));
  test('pro past expiry → false', () => expect(isPro({ plan: 'pro', source: 'annual', expiresAt: '2026-01-01T00:00:00Z' }, now)).toBe(false));
});

describe('goalLimitReached', () => {
  const free = freeEntitlement();
  const pro = { plan: 'pro', source: 'lifetime', expiresAt: null };
  test('free under cap → false', () => expect(goalLimitReached(2, free)).toBe(false));
  test('free at cap → true', () => expect(goalLimitReached(FREE_GOAL_LIMIT, free)).toBe(true));
  test('free over cap → true', () => expect(goalLimitReached(FREE_GOAL_LIMIT + 5, free)).toBe(true));
  test('pro never limited', () => expect(goalLimitReached(999, pro)).toBe(false));
  test('FREE_GOAL_LIMIT is 3', () => expect(FREE_GOAL_LIMIT).toBe(3));
});

describe('cache', () => {
  test('save then load round-trips', () => {
    saveEntitlement({ plan: 'pro', source: 'annual', expiresAt: '2027-01-01T00:00:00Z' });
    expect(loadEntitlement()).toEqual({ plan: 'pro', source: 'annual', expiresAt: '2027-01-01T00:00:00Z' });
  });
  test('empty cache falls back to free', () => {
    expect(loadEntitlement()).toEqual(freeEntitlement());
  });
});
```

- [ ] **Step 2: Run → fail**

Run: `npm test -- src/entitlement.test.js` → FAIL (module missing).

- [ ] **Step 3: Implement**

```js
// src/entitlement.js
// Pure entitlement logic + a local cache. No network, no React.
import { load, save } from './storage.js';

export const FREE_GOAL_LIMIT = 3;
const KEY = 'entitlement';

export function freeEntitlement() {
  return { plan: 'free', source: null, expiresAt: null };
}

export function isPro(ent, now = Date.now()) {
  if (!ent || ent.plan !== 'pro') return false;
  if (!ent.expiresAt) return true;            // lifetime
  return Date.parse(ent.expiresAt) > now;     // annual / timed
}

export function goalLimitReached(count, ent) {
  return !isPro(ent) && count >= FREE_GOAL_LIMIT;
}

export function loadEntitlement() {
  const e = load(KEY, null);
  return e && e.plan ? e : freeEntitlement();
}

export function saveEntitlement(ent) { save(KEY, ent); }
```

- [ ] **Step 4: Run → pass.** `npm test -- src/entitlement.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/entitlement.js src/entitlement.test.js
git commit -m "feat: pure entitlement helpers (isPro, goalLimitReached, cache)"
```

---

## Task 2: Entitlement shared store + hook

**Files:** Create `src/use-entitlement.js`

- [ ] **Step 1: Implement (no unit test — thin React store, verified live)**

```js
// src/use-entitlement.js
// Shared entitlement store so all gates re-render together when it changes.
import React from 'react';
import { loadEntitlement, isPro } from './entitlement.js';

let _ent = null;
const _subs = new Set();
function _init() { if (_ent === null) _ent = loadEntitlement(); return _ent; }

export function getEntitlementSnapshot() { return _init(); }
export function subscribeEntitlement(fn) { _subs.add(fn); return () => _subs.delete(fn); }

// Re-read the cache (call after a pull/unlock) and notify gates.
export function refreshEntitlement() {
  _ent = loadEntitlement();
  _subs.forEach((fn) => fn());
}

// Non-React code (sync layer) dispatches this after caching a fresh entitlement.
if (typeof window !== 'undefined') {
  window.addEventListener('cadence:entitlement-changed', refreshEntitlement);
}

export function useEntitlement() {
  const ent = React.useSyncExternalStore(subscribeEntitlement, getEntitlementSnapshot, getEntitlementSnapshot);
  return { ent, pro: isPro(ent) };
}
```

- [ ] **Step 2: Build check.** `npm run build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/use-entitlement.js
git commit -m "feat: useEntitlement shared store"
```

---

## Task 3: Supabase entitlements table + pull

**Files:** Create `supabase/migrations/20260628_entitlements.sql`, `src/entitlement-sync.js`; modify `src/cloud-sync.js`

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/20260628_entitlements.sql
create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null default 'free',
  source     text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "read own entitlement"  on public.entitlements for select using (auth.uid() = user_id);
create policy "write own entitlement" on public.entitlements for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Pull helper**

```js
// src/entitlement-sync.js
// Read-only in Build 1: pull the user's entitlement row → local cache, then notify.
// Build 2's Cashfree webhook is what writes the row.
import { supabase, cloudEnabled } from './supabase.js';
import { saveEntitlement, freeEntitlement } from './entitlement.js';

export async function pullEntitlement(userId) {
  if (!cloudEnabled || !userId) return;
  const { data, error } = await supabase
    .from('entitlements')
    .select('plan, source, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('[entitlement] pull failed:', error.message); return; } // keep cache; never downgrade on error
  const ent = data
    ? { plan: data.plan || 'free', source: data.source || null, expiresAt: data.expires_at || null }
    : freeEntitlement();
  saveEntitlement(ent);
  try { window.dispatchEvent(new Event('cadence:entitlement-changed')); } catch { /* SSR/none */ }
}
```

- [ ] **Step 3: Wire into sign-in bootstrap.** In `src/cloud-sync.js`, add the import and call it inside the `useCloudSync` bootstrap effect, right after the habit-logs pull:

```js
import { pullEntitlement } from './entitlement-sync.js';
```
```js
      // Pull the user's Pro entitlement into the local cache (read-only here).
      if (!cancelled) await pullEntitlement(user.id);
```
(Place it next to the existing `pullHabitLogs` / `pushConsent` calls in that async bootstrap.)

- [ ] **Step 4: Build check.** `npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260628_entitlements.sql src/entitlement-sync.js src/cloud-sync.js
git commit -m "feat: entitlements table + pull on sign-in (read-only)"
```

---

## Task 4: PaywallSheet

**Files:** Create `src/sheet-paywall.jsx`

- [ ] **Step 1: Implement**

```jsx
// src/sheet-paywall.jsx
import React from 'react';
import { Icon, Btn, H } from './ui.jsx';
import { SheetShell } from './planner.jsx';

const PLANS = [
  { id: 'lifetime', name: 'Lifetime', price: '₹1299', tag: 'Best value', sub: 'Pay once. Yours forever.' },
  { id: 'annual',   name: 'Annual',   price: '₹999',  tag: null,        sub: 'Billed yearly.' },
];
const PERKS = [
  'Unlimited goals',
  'Insights — your rhythm & full calendar history',
  'Due-day reminders for every plan',
];

function PaywallSheet({ onClose, reason }) {
  const [picked, setPicked] = React.useState('lifetime');
  const [info, setInfo] = React.useState(false);
  return (
    <SheetShell title="Pacely Pro" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div>
          <H size={26}>Go further with Pro.</H>
          <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.45 }}>
            {reason === 'goals' ? 'You’ve hit the free limit of 3 goals.' :
             reason === 'insights' ? 'Insights are a Pro feature.' :
             reason === 'reminders' ? 'Due-day reminders are a Pro feature.' :
             'Unlock everything Pacely can do.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PERKS.map((p) => (
            <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--ink)' }}>
              <Icon name="check" size={16} color="var(--sage)" /> {p}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {PLANS.map((pl) => {
            const on = picked === pl.id;
            return (
              <button key={pl.id} onClick={() => setPicked(pl.id)} style={{
                flex: 1, textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 16,
                background: on ? 'rgba(200,96,47,0.08)' : 'var(--card)',
                border: `1.5px solid ${on ? 'var(--terra)' : 'rgba(31,27,22,0.1)'}`,
                fontFamily: 'inherit',
              }}>
                {pl.tag && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--terra)' }}>{pl.tag}</div>}
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{pl.price}</div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>{pl.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)', marginTop: 2 }}>{pl.sub}</div>
              </button>
            );
          })}
        </div>

        <Btn variant="terra" size="lg" full onClick={() => setInfo(true)}>
          <Icon name="sparkle" size={16} /> Upgrade
        </Btn>

        {info && (
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.7)', background: 'var(--paper-2)', borderRadius: 12, padding: '12px 14px', lineHeight: 1.5 }}>
            Checkout opens in the Pacely <b>web app</b> — coming next. Your unlock will sync to this device automatically.
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.45)', textAlign: 'center' }}>
          One-time & yearly options · pay by UPI or card on the web.
        </div>
      </div>
    </SheetShell>
  );
}

Object.assign(window, { PaywallSheet });
export { PaywallSheet };
```

- [ ] **Step 2: Build check.** `npm run build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/sheet-paywall.jsx
git commit -m "feat: PaywallSheet (plans + upgrade CTA placeholder)"
```

---

## Task 5: Wire paywall + goal-cap gate in app.jsx

**Files:** Modify `src/app.jsx`

- [ ] **Step 1: Imports**

```js
import { PaywallSheet } from './sheet-paywall.jsx';
import { useEntitlement } from './use-entitlement.js';
import { goalLimitReached } from './entitlement.js';
```

- [ ] **Step 2: State + helper.** Inside `App`, near the other sheet state:

```js
  const [paywall, setPaywall] = React.useState(null); // null | 'goals' | 'insights' | 'reminders'
  const { ent } = useEntitlement();
  function openPaywall(reason) { setPaywall(reason || 'general'); }
```

- [ ] **Step 3: Gate goal creation.** At the top of BOTH `commitNewGoal` and `applyPlan`, before creating the goal, add:

```js
    if (goalLimitReached(goals.length, ent)) { setSheetOpen(false); setLibraryOpen(false); setVoiceOpen(false); openPaywall('goals'); return; }
```
(For `commitNewGoal` the leading `setSheetOpen(false)` already exists — keep one; the guard's extra closes are harmless idempotent calls.)

- [ ] **Step 4: Render the sheet.** Near the other `{xOpen && <XSheet/>}` blocks:

```js
      {paywall && <PaywallSheet reason={paywall} onClose={() => setPaywall(null)} />}
```

- [ ] **Step 5: Pass `openPaywall` down.** Add `onUpgrade={openPaywall}` to `<InsightsScreen .../>` and to `<GoalsScreen .../>`:

```js
        {tab === 'insights' && <InsightsScreen goals={goals} onUpgrade={openPaywall} />}
```
```js
          <GoalsScreen
            goals={goals}
            onUpgrade={openPaywall}
            /* …existing props… */
```

- [ ] **Step 6: Verify live (web).** preview_start; with default free state, create goals until the 4th — the paywall opens instead of creating. Then in console set Pro and confirm creation works:
```js
localStorage.setItem('cadence:entitlement', JSON.stringify({plan:'pro',source:'lifetime',expiresAt:null})); window.dispatchEvent(new Event('cadence:entitlement-changed'));
```
Expected: 4th goal now creates, no paywall.

- [ ] **Step 7: Commit**

```bash
git add src/app.jsx
git commit -m "feat: paywall sheet + free goal-cap gate (3)"
```

---

## Task 6: Lock Insights for free

**Files:** Modify `src/screen-insights.jsx`

- [ ] **Step 1: Accept `onUpgrade`, gate the data cards.** Change `InsightsScreen({ goals })` → `InsightsScreen({ goals, onUpgrade })`. Replace the `hasGoals ? ( … ) : ( …empty… )` Pro content block so that when **not** Pro, the calendar/rhythm/breakpoint cards are replaced by a single lock card:

```jsx
import { useEntitlement } from './use-entitlement.js';
```
Inside the component:
```jsx
  const { pro } = useEntitlement();
```
Then where it currently renders `<CalendarMonth/> <BreakpointInsight/> <RhythmSection/>` for `hasGoals`, wrap:
```jsx
      {hasGoals ? (
        pro ? (
          <>
            <CalendarMonth goals={goals} />
            <BreakpointInsight goals={goals} />
            <RhythmSection />
          </>
        ) : (
          <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <Bloom value={0.5} size={88} color="var(--terra)" />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 21, color: 'var(--ink)' }}>Insights are a Pro feature.</div>
            <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.64)', lineHeight: 1.5, maxWidth: 270 }}>
              Your rhythm and full calendar history unlock with Pacely Pro.
            </div>
            <Btn variant="terra" size="md" onClick={() => onUpgrade && onUpgrade('insights')}>
              <Icon name="sparkle" size={16} /> Unlock Insights
            </Btn>
          </Card>
        )
      ) : (
```
(Ensure `Btn` is imported from `./ui.jsx` — add it to the existing import if missing.)

- [ ] **Step 2: Verify live.** Free → Insights shows the lock card + Unlock button (opens paywall). Set Pro (console snippet from Task 5) → reload → full Insights render.

- [ ] **Step 3: Commit**

```bash
git add src/screen-insights.jsx
git commit -m "feat: lock Insights behind Pro"
```

---

## Task 7: Lock due-day reminders for free

**Files:** Modify `src/screen-goals.jsx`

- [ ] **Step 1: Accept `onUpgrade` + gate the Reminder section.** Thread `onUpgrade` from `GoalsScreen` into `GoalDetail` (add the prop to both signatures and pass it through where `GoalDetail` is rendered). Add:

```jsx
import { useEntitlement } from './use-entitlement.js';
```
In `GoalDetail`:
```jsx
  const { pro } = useEntitlement();
```
In the existing reminder `<Section label="Reminder">`, when **not** Pro replace the controls with an upgrade row:
```jsx
      {(goal.cadence === 'monthly' || goal.cadence === 'yearly') && (
        <Section label="Reminder">
          {pro ? (
            <>
              {/* …existing toggle + day/month/time controls + caption… */}
            </>
          ) : (
            <button onClick={() => onUpgrade && onUpgrade('reminders')} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              padding: '12px 14px', borderRadius: 12, background: 'var(--paper-2)',
              border: '0.5px solid rgba(31,27,22,0.1)', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="sparkle" size={16} color="var(--terra)" />
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>Due-day reminders are a Pro feature.</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--terra)' }}>Unlock</span>
            </button>
          )}
        </Section>
      )}
```

- [ ] **Step 2: Verify live.** Free → Monthly/Yearly goal shows the "Pro feature · Unlock" row (opens paywall). Set Pro → reload → the real reminder controls return and still work (toggle persists to `cadence:reminders`).

- [ ] **Step 3: Commit**

```bash
git add src/screen-goals.jsx
git commit -m "feat: lock due-day reminders behind Pro"
```

---

## Task 8: Settings "Pacely Pro" row

**Files:** Modify `src/screen-settings.jsx`

- [ ] **Step 1: Add a row that opens the paywall (or shows "Pro" when unlocked).** `SettingsScreen` already receives callbacks from `app.jsx`; pass `onUpgrade` to it and render a row:

In `app.jsx` where `<SettingsScreen .../>` renders, add `onUpgrade={openPaywall}`. In `screen-settings.jsx`, accept `onUpgrade`, read `const { pro } = useEntitlement();` (import it), and add near the top of the settings list:

```jsx
      <button onClick={() => !pro && onUpgrade && onUpgrade('general')} style={{
        width: '100%', textAlign: 'left', cursor: pro ? 'default' : 'pointer',
        padding: '14px 16px', borderRadius: 16, marginBottom: 12,
        background: pro ? 'rgba(107,142,90,0.10)' : 'rgba(200,96,47,0.08)',
        border: `0.5px solid ${pro ? 'rgba(107,142,90,0.35)' : 'rgba(200,96,47,0.25)'}`,
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Icon name="sparkle" size={18} color={pro ? 'var(--sage)' : 'var(--terra)'} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{pro ? 'Pacely Pro · active' : 'Upgrade to Pacely Pro'}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)' }}>{pro ? 'Thanks for your support 🌿' : 'Unlimited goals, Insights, reminders'}</div>
        </div>
        {!pro && <Icon name="chev" size={16} color="rgba(31,27,22,0.3)" />}
      </button>
```
(Import `Icon` + `useEntitlement` if not already imported in the file.)

- [ ] **Step 2: Verify live.** Settings shows "Upgrade to Pacely Pro" → opens paywall. Set Pro → row reads "Pacely Pro · active".

- [ ] **Step 3: Commit**

```bash
git add src/app.jsx src/screen-settings.jsx
git commit -m "feat: Pacely Pro row in Settings"
```

---

## Task 9: Full regression + e2e

**Files:** none

- [ ] **Step 1:** `npm test` → all green (existing + entitlement).
- [ ] **Step 2:** `npm run build` → succeeds.
- [ ] **Step 3 (web e2e):** Free: 4th goal blocked → paywall; Insights locked; reminder locked; Settings shows Upgrade; **existing data with >3 goals stays fully visible/editable**. Flip Pro via console → reload → all gates open, paywall not triggered, Settings shows "active". No console errors.
- [ ] **Step 4:** Final commit if any tweak needed.

---

## Self-Review (vs spec)

- Entitlement model + cache → Task 1; shared store → Task 2; Supabase table + pull → Task 3.
- Paywall UI → Task 4; goal-cap gate + sheet wiring → Task 5; Insights lock → Task 6; reminder lock → Task 7; Settings row → Task 8.
- Edge cases: existing >3 goals never deleted (gate blocks *create* only — Task 5/9); pull failure never downgrades (Task 3 keeps cache); signed-out → free cache, no throw.
- Signatures consistent: `isPro(ent,now)`, `goalLimitReached(count,ent)`, `FREE_GOAL_LIMIT`, `useEntitlement()→{ent,pro}`, `openPaywall(reason)`, `onUpgrade(reason)`, `pullEntitlement(userId)`.
- Out of scope (Cashfree backend/checkout, sync gating) correctly excluded → Build 2.
