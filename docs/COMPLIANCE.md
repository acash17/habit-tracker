# Cadence — Compliance record (India / DPDP Act 2023)

This is the Data Fiduciary's operational compliance record for Cadence. Keep it
current; review at least every 6 months and after any feature that changes data
handling.

> **Not legal advice.** Confirm posture with a qualified professional before/while
> operating in market. Items marked **[ACTION]** require a human, not code.

---

## 1. Roles & contacts

- **Data Fiduciary:** the Cadence developer/operator.  **[ACTION]** confirm legal entity / registration.
- **Grievance Officer / DPO contact:** grievance@vinkashis.com  **[ACTION]** ensure this inbox is monitored.
- **Escalation:** Data Protection Board of India.

## 2. What personal data we process, and why

| Data | Source | Purpose | Legal basis |
|---|---|---|---|
| Account ID + email | Google sign-in | Account, sync | Consent |
| Name (display) | Google sign-in | Personalisation | Consent |
| Goals / sub-habits | User input | Core feature | Consent |
| Completion history (+ timestamps) | User action | Heatmap, rhythm insights | Consent |
| Profile / settings / timezone | User | Feature behaviour | Consent |
| Consent record | Consent gate | Proof of consent | Legal obligation |

**Not collected:** phone, precise location, contacts, photos, files, advertising ID,
device identifiers. **No analytics/ads SDKs.** Goal text for sequence generation
stays on-device (no LLM call in the shipped app).

## 3. Consent (DPDP §6)

- **Captured before collection:** the consent gate (`ConsentGate` / `ConsentSheet`)
  appears before Google sign-in. Two required tick-boxes:
  1. Agreement to Privacy Policy + Terms of Service.
  2. Age declaration (18+, or parent/guardian consent).
- **Recorded:** locally (`cadence:consent`) **and** server-side in the `consents`
  table (`user_id, policy_version, items, agreed_at`) — the fiduciary's provable
  ledger. Migration: `supabase/migrations/005_consents.sql`.
- **Re-consent:** bump `CONSENT_VERSION` in `src/consent.js` after any material
  policy change → all users are re-prompted.
- **Withdrawal:** Settings → "Erase all my data" deletes everything incl. the
  consent record — as easy to withdraw as to give.

## 4. Data principal rights (DPDP §11–14)

| Right | How it's served |
|---|---|
| Access | Settings → "Download my data" (JSON incl. cloud goals, logs, profile, consents) |
| Correction | Edit any data in-app |
| Erasure | Settings → "Erase all my data" deletes the **account itself** (`delete_my_account()` RPC, migration 006 — cascades to goals, logs, profile, consents, rhythm_cache, and the auth user/email) + public page `/delete-account.html` |
| Withdraw consent | Same as erasure |
| Grievance | Settings → "Grievance officer" (email) + privacy/terms |
| Nominate | Stated in Privacy Policy (email to register a nominee) |

## 5. Children (DPDP §9)

- "Child" = under 18. **Cadence is for users 18+ only** — it is not directed at, and not
  to be used by, anyone under 18.
- **Age assurance:** a required self-declaration checkbox at consent ("I am 18 years of
  age or older"). Both the policy and terms state the 18+ restriction.
  **[ACTION/RISK]** this is self-declared age assurance (industry norm for a low-risk
  productivity app), not hard age verification. Because we admit no minors and process
  no child data, DPDP §9's verifiable-parental-consent obligation is avoided by design.
  If a minor is discovered, delete their data. No behavioural tracking or targeted ads.

## 6. Security (DPDP §8(5))

- Transport: HTTPS everywhere; Android manifest additionally sets
  `usesCleartextTraffic=false`.
- At rest: encrypted by Supabase (managed Postgres).
- Isolation: Row-Level Security — every table scoped to `auth.uid()` (migrations
  002, 005, 006). Verified: 15+ RLS policies.
- Auth: Google OAuth via PKCE **only**; deep-link `cadence://auth-callback`. The
  legacy `#access_token` implicit-flow handler was removed — a forged deep link
  from another app can no longer set a session (session-fixation defence).
- WebView hardening: a build-time Content-Security-Policy on the app shell limits
  network egress to the app + Supabase, blocks foreign scripts/objects.
- No production source maps in the APK; release builds are minified.
- Fonts are bundled in the app (no runtime requests to Google Fonts from the APK,
  so no IP/user-agent leak to a third party on launch).
- Android: `allowBackup=false` (auth tokens not auto-backed-up).
- Known limitation: the Supabase session token lives in WebView `localStorage`
  (app-sandboxed, not OS-encrypted). Acceptable for non-sensitive data; consider a
  secure-storage adapter if data sensitivity grows.
- **Not** end-to-end encrypted (provider can read rows) — stated honestly in policy.

## 7. Retention

- Retained while the account is active and the purpose is served.
- On erasure/withdrawal: account + all cloud rows deleted immediately (single transaction); local data cleared.
- Email-requested deletion: completed within **30 days** (`/delete-account.html`).

## 8. Breach response  **[ACTION — process, keep ready]**

Full plan: **`docs/BREACH_RESPONSE.md`** (detect → contain → assess → notify the
Data Protection Board of India + affected users → remediate → review, with incident
log and user-notification templates). Summary:

1. **Detect & log** — open an incident log the moment a breach is suspected.
2. **Contain** — rotate Supabase/GitHub keys, cut access, preserve logs.
3. **Assess** — what data, whose, how, likely harm, is it reportable.
4. **Notify** — Board of India + affected Data Principals, promptly.
5. **Remediate** — fix root cause; add a control/test.
6. **Review** — blameless post-incident review; update this doc.

## 9. Google Play Data Safety — declaration mapping

- Collects: Name, Email (Personal info); Goals + completion history (App activity →
  other user-generated content). **Optional** (works local-first without sign-in).
- Shared with third parties: **No.** Sold: **No.** Used for ads: **No.**
- Encrypted in transit: **Yes.** User can request deletion: **Yes** → `/delete-account.html`.

## 10. Open operational items  **[ACTION]**

- [ ] Host privacy.html, terms.html, delete-account.html at a **public URL** (Vercel).
- [ ] Confirm grievance inbox is monitored with response SLAs.
- [ ] Legal entity / Data Fiduciary registration as applicable.
- [ ] Decide final age-assurance stance; align with Play content rating.
- [ ] Keep this document reviewed every 6 months.
