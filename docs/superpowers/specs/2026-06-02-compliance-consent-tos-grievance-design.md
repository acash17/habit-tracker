# Compliance gap-fill — consent gate, Terms of Service, grievance officer, security copy

Status: approved (design)
Date: 2026-06-02

## Context

A DPDP Act 2023 compliance pass (commit 9efd839) already shipped: a thorough
`privacy.html` (retention, children/age, grievance contact, rights), in-app data
export (`exportMyData`), erasure (`eraseMyData`), and an inline consent line at
sign-in. This spec fills the remaining in-app gaps from the launch checklist.

Out of scope (operational, not code): Google Play Data Safety form, Apple privacy
labels, company registration, external security audit.

## Definition of done

A user tapping "Continue with Google" (from Settings or the Insights tab) sees a
consent dialog with a required "I agree to the Privacy Policy and Terms of Service"
checkbox before any OAuth/data collection. A consent record is persisted locally.
A returning user with a valid record signs in without re-prompting. Settings links
to a real Terms of Service page and shows the grievance officer contact. No copy
overstates security ("end-to-end encrypted" removed).

---

## A. Terms of Service — `terms.html`

New static page mirroring `privacy.html` markup/styling. Sections:
acceptance of terms · what Cadence is · your account & responsibilities ·
acceptable use · **not medical/health advice** · service provided "as is" /
no warranty · limitation of liability · data & privacy (link to privacy.html) ·
changes to these terms · governing law (India) · grievance & contact
(achaurasia994@gmail.com).

## B. Consent gate at sign-in

### `src/consent.js`
- `CONSENT_VERSION` — bump to re-prompt everyone after a material policy change.
- Pure (TDD'd):
  - `buildConsentRecord(version, now)` → `{ policyVersion, agreedAt }`.
  - `isConsentValid(record, version)` → boolean (record exists and version matches).
- Thin localStorage wrappers (`cadence:consent` key):
  - `recordConsent()` → saves `buildConsentRecord(CONSENT_VERSION, new Date().toISOString())`.
  - `hasValidConsent()` → `isConsentValid(load(), CONSENT_VERSION)`.
- `requestSignIn()` → dispatches `window` CustomEvent `cadence-request-signin`.

### `ConsentSheet` component
Purpose statement: "We collect your name and email (via Google), your goals, and
your completion history to create and sync your sequences. We never sell your data."
One **required** checkbox — "I agree to the Privacy Policy and Terms of Service"
(both linked, open in new tab). Continue button disabled until checked. Cancel closes.

### `ConsentGate` (mounted once in `App`)
Listens for `cadence-request-signin`. If `hasValidConsent()` → call
`signInWithGoogle()` directly. Else open `ConsentSheet`; on agree →
`recordConsent()` then `signInWithGoogle()`.

### Wiring
`ProfileCard` (settings) and the Insights `RhythmSection` CTA stop calling
`signInWithGoogle()` directly and call `requestSignIn()` instead.

### Edge cases
- Cloud disabled: CTAs are not shown / no-op (unchanged behavior).
- Sign-in error after consent: consent record still stands (consent ≠ successful auth).
- Withdrawal: existing "Erase all my data" already clears `cadence:*`, including the
  consent record — withdrawing consent is as easy as giving it (DPDP requirement).

## C. Grievance officer in-app

New Row in Settings → "Your data & privacy": title "Grievance officer", sub shows
the contact email and the right to complain to the Data Protection Board of India.
Control: a `mailto:` link.

## D. Security copy fix

Settings "Local-first storage" sub says sync is "end-to-end encrypted" — false
(Supabase can read rows). Change to "encrypted in transit and at rest." Scan for
any other "end-to-end" claims and correct.

---

## Testing

- TDD `consent.js` pure functions (`buildConsentRecord`, `isConsentValid`) with Vitest.
- Browser preview: tap a sign-in CTA → consent sheet appears, Continue disabled until
  checked; ToS link opens; grievance row shows; security copy corrected.
- `npm run build` — no broken imports.

## Work order

1. `consent.js` (TDD pure core + wrappers).
2. `terms.html`.
3. `ConsentSheet` + `ConsentGate`; wire `App`.
4. Re-point `ProfileCard` + `RhythmSection` CTAs to `requestSignIn()`.
5. Grievance row + security copy fix in `screen-settings.jsx`.
