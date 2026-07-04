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
 * Move an item within a list (pure — returns a new array, never mutates).
 * Out-of-range `from` is a no-op; `to` is clamped into the list. Used by the
 * drag-to-reorder step editor.
 */
export function moveItem(list, from, to) {
  const a = [...(list || [])];
  if (!a.length || from < 0 || from >= a.length) return a;
  const t = Math.max(0, Math.min(a.length - 1, Math.round(to)));
  if (from === t) return a;
  const [item] = a.splice(from, 1);
  a.splice(t, 0, item);
  return a;
}

/**
 * Fire a global toast notification. App.jsx listens for `cadence:toast` events
 * and calls flash(). Use this from non-React code (auth handler, etc.).
 */
export function toast(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cadence:toast', { detail: String(message) }));
}
