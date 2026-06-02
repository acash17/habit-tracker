// DPDP Act 2023 consent capture. A user must affirmatively agree to the Privacy
// Policy + Terms of Service before any cloud data collection (Google sign-in).
// We persist a consent record locally so we don't re-prompt on every sign-in, and
// so there's a record of who agreed and when (DPDP "records of consent").
import { load, save } from './storage.js';

// Bump when the Privacy Policy or Terms change materially — re-prompts everyone.
export const CONSENT_VERSION = 1;

const KEY = 'consent';

// ── Pure core ────────────────────────────────────────────────────────────────
export function buildConsentRecord(version, now) {
  return { policyVersion: version, agreedAt: now };
}

export function isConsentValid(record, version) {
  return !!record && record.policyVersion === version;
}

// ── localStorage wrappers ─────────────────────────────────────────────────────
export function recordConsent() {
  save(KEY, buildConsentRecord(CONSENT_VERSION, new Date().toISOString()));
}

export function hasValidConsent() {
  return isConsentValid(load(KEY, null), CONSENT_VERSION);
}

// Ask the app-level ConsentGate to start sign-in (prompting for consent if needed).
// Decouples the sign-in CTAs from the gate so any entry point can trigger it.
export function requestSignIn() {
  try { window.dispatchEvent(new CustomEvent('cadence-request-signin')); }
  catch { /* no window — no-op */ }
}
