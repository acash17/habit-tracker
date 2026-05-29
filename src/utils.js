// Tiny shared utilities.

/**
 * Generate a collision-resistant id with a short prefix.
 * Uses crypto.randomUUID() where available (all modern browsers + Capacitor WebView
 * on Android 8+ / iOS 11+) and falls back to a time + 64-bit random hex tail otherwise.
 */
export function newId(prefix = '') {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}${crypto.randomUUID()}`;
    }
  } catch { /* ignore */ }
  // Fallback: timestamp + 64 bits of randomness, base36-encoded.
  const t = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 4; i++) rand += Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}${t}-${rand}`;
}

/**
 * Fire a global toast notification. App.jsx listens for `cadence:toast` events
 * and calls flash(). Use this from non-React code (auth handler, etc.).
 */
export function toast(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cadence:toast', { detail: String(message) }));
}
