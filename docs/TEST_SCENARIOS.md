# Cadence — End-to-End Test Scenarios

A structured catalogue of test scenarios for the Cadence habit-sequence planner,
covering functional flows, data persistence, privacy/DPDP rights, authentication
security, the Android build, and the static legal pages. Each scenario lists its
preconditions, steps, and expected result so it can be run manually or automated
(the repo automates many via Playwright; see `/tmp/qa/*.mjs` during a QA run).

Legend: **[F]** functional · **[P]** persistence · **[S]** security/privacy ·
**[A]** Android/build · **[X]** edge/negative probe.

---

## 1. Onboarding

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| ON-1 | F | First launch (no `cadence:onboarded`) | Onboarding carousel shows |
| ON-2 | F | Tap "Get started" through all carousel dots | Advances; final step lands on Today |
| ON-3 | P | Complete onboarding, reload | `cadence:onboarded` set; onboarding not shown again |
| ON-4 | F | URL `?skip=1` / `?bare=1` / `?tour=1` | Onboarding bypassed |
| ON-5 | F | Settings → "Replay onboarding" | Onboarding shows again on next load |
| ON-6 | X | Reload mid-onboarding | No crash; resumes or restarts cleanly |

## 2. Goals — create / edit / delete

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| GO-1 | F | Tap "+", create goal (title, cadence, color) | Appears in Goals tab |
| GO-2 | P | Reload after create | Goal persists (`cadence:goals`) |
| GO-3 | F | Cadence filter pills (Daily/Weekly/Monthly) | Filters goal list correctly |
| GO-4 | F | Open goal, edit title, add sub-habit steps, save | Edits reflected; persist on reload |
| GO-5 | F | Delete a goal | Removed from list; gone after reload |
| GO-6 | X | Empty title | Defaults to "Untitled" (no blank/crash) |
| GO-7 | X | 500+ char title | Stored/rendered without layout break or crash |
| GO-8 | S | Title `<script>alert(1)</script>` | Rendered as literal text, NOT executed (React escapes; no XSS) |
| GO-9 | X | Create 20+ goals | List scrolls; no perf collapse |
| GO-10 | X | Rapid double-tap "+" | No duplicate/garbage goal |
| GO-11 | X | Emoji / RTL / unicode in title | Stored and displayed correctly |

## 3. Today screen + completion logging

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| TD-1 | F | Today renders timeline blocks | Blocks visible |
| TD-2 | F | Tap-to-complete a habit (effort bloom / heatmap cell) | Completion recorded; visual updates |
| TD-3 | P | Reload after completion | State persists locally |
| TD-4 | F | Cycle a cell level 0→1→2→3→0 | Level cycles; level 0 unlogs |
| TD-5 | F | "Life happened" sheet | Opens and applies non-punitive adjustment |
| TD-6 | X | Complete with no goals | Empty state, no crash |

## 4. Insights

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| IN-1 | F | Insights with no data | Empty/zero state, no crash |
| IN-2 | F | Insights with seeded completion logs | Heatmap + rhythm chart populate |
| IN-3 | F | Energy profile sheet opens | 24-hour curve editable |
| IN-4 | F | Sign-in CTA when signed out | Routes through consent gate |

## 5. Settings + toggles

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| SE-1 | F | All sections render (profile, privacy, adapt-to-me, data & privacy) | Present |
| SE-2 | P | Flip each toggle (calendar, voice, pause, local-first), reload | State persists |
| SE-3 | F | Privacy Policy / Terms / Delete-account links | Open correct pages |
| SE-4 | F | Grievance officer mailto | `mailto:grievance@vinkashis.com` |
| SE-5 | F | Cloud disabled (no env) | Shows "This device only" local badge |

## 6. Data rights (DPDP §11–14)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| DR-1 | S | "Download my data" | Downloads `cadence-my-data-<date>.json` |
| DR-2 | S | Export JSON structure | `exportedAt`, `app`, `local{}`, `cloud` keys; local data present |
| DR-3 | X | Export with no data | Valid JSON, empty `local` |
| DR-4 | S | "Erase all my data" + confirm | All `cadence:*` local keys wiped; app reloads clean |
| DR-5 | S | Erase while signed in | Calls `delete_my_account()` RPC (account-level deletion) |
| DR-6 | X | Erase with no data | No crash |
| DR-7 | S | Erase = consent withdrawal | Consent record also removed |

## 7. Consent gate (DPDP §6)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| CO-1 | S | Click "Continue with Google", no prior consent | Consent sheet "Before you sign in" shows FIRST |
| CO-2 | S | "Agree & continue" with 0 boxes ticked | Disabled |
| CO-3 | S | With only 1 of 2 boxes ticked | Still disabled |
| CO-4 | S | Both boxes ticked | Enabled |
| CO-5 | S | Agree → consent written before redirect | `cadence:consent` persisted pre-navigation |
| CO-6 | S | Re-sign-in with consent on record | No re-prompt; straight to OAuth |
| CO-7 | S | Bump `CONSENT_VERSION` | Everyone re-prompted |

## 8. Authentication + session (security-critical)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| AU-1 | S | Agree & continue → OAuth URL | Navigates to Supabase `/authorize?provider=google` |
| AU-2 | S | OAuth uses PKCE | URL has `code_challenge` + `code_challenge_method=s256` |
| AU-3 | S | Two sign-in attempts | Distinct `code_challenge` each time (no verifier reuse) |
| AU-4 | F | Valid stored session, cold load | Auto signed in; no login prompt |
| AU-5 | F | Reload again | Still signed in (`persistSession`) |
| AU-6 | X | Expired session, offline | Clean fallback to signed-out; token-refresh retried; no crash |
| AU-7 | S | Session-fixation defense | No `setSession()` from `#access_token` deep-link path — PKCE `exchangeCodeForSession` only |
| AU-8 | X | Corrupted session JSON | No crash; signed-out |
| AU-9 | F | Sign out | Clears local cloud cache; reloads to local state |
| AU-10 | S | Forged `cadence://auth-callback` with attacker tokens | Ignored (no session set) |

## 9. WebView / build security (PR #2)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| WB-1 | S | `dist/index.html` CSP meta tag | Present; `connect-src` self + `*.supabase.co`; `object-src 'none'`; `script-src 'self'` |
| WB-2 | S | Other HTML files | No CSP meta (they need Google Fonts) |
| WB-3 | S | Source maps | No `*.map` files in `dist/` |
| WB-4 | S | App-shell fonts | Self-hosted `/fonts/`; index.html has no `fonts.googleapis.com` |
| WB-5 | S | App shell network on load | Zero requests to Google Fonts |
| WB-6 | S | Secret leakage | No real anon key in `dist/` beyond build-env placeholder |

## 10. Android config (review)

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| AN-1 | A | AndroidManifest | `usesCleartextTraffic="false"`, `allowBackup="false"`, only `INTERNET` |
| AN-2 | A | Deep-link intent-filter | `cadence://auth-callback` present |
| AN-3 | A | FileProvider | `exported="false"` |
| AN-4 | A | build.gradle release | `minifyEnabled` + `shrinkResources` true; signing from keystore/env |
| AN-5 | A | capacitor.config | `androidScheme: https`, appId `com.acash.cadence` |

## 11. Static legal pages

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| ST-1 | F | `/privacy.html` renders (desktop + phone) | OK |
| ST-2 | S | No contradictory "under 13" section | Removed; DPDP 18+ section authoritative |
| ST-3 | S | Internet-permission text | Mentions sync, not "font loading" |
| ST-4 | F | `/terms.html` renders | OK |
| ST-5 | F | `/delete-account.html` | In-app steps + email option; "account itself" deleted |
| ST-6 | F | Cross-page links | privacy ↔ terms ↔ delete work |

## 12. Cross-cutting

| ID | Type | Scenario | Expected |
|----|------|----------|----------|
| CC-1 | F | Error boundary wired | Render error shows recovery card, not blank |
| CC-2 | F | Responsiveness 360 / 430 / 768 px | No layout breakage |
| CC-3 | F | A11y: tab buttons labelled, "+" aria-label, img alt, viewport meta | Present |
| CC-4 | X | Unknown route `/nonexistent.html` | Graceful (no app crash) |
| CC-5 | F | `npm test` unit suite | 39/39 pass |

---

_Network note: in the CI/sandbox environment, live calls to `*.supabase.co` are
blocked (ERR_FAILED / 403 host_not_allowed). All cloud-dependent scenarios are
validated up to the point of the correctly-formed request; completing real Google
login requires a device with network and the Supabase redirect allowlist
configured._
