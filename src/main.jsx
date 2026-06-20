import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app.jsx';
import { ErrorBoundary } from './error-boundary.jsx';
import { initNativeAuthHandler } from './use-auth.js';
import { rescheduleOnLaunch } from './notifications.js';
import './styles.css';

// Arm Capacitor deep-link handler before mount so the OAuth callback isn't dropped.
// No-op on web (and when cloud env vars aren't set).
initNativeAuthHandler();

// Re-arm the daily reminder on launch if the user enabled it (native only; no-op on web).
rescheduleOnLaunch();

// The app ALWAYS fills the whole screen — like a real phone app — in both the
// installed Capacitor build and the browser. No simulated phone frame, no marketing
// blurb. (The marketing/demo pages have their own entry HTML.)
function Mount() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// Strip any leftover marketing blurb and make the stage + mount fill the viewport
// edge-to-edge so nothing looks like a phone floating on a webpage.
const b = document.querySelector('.blurb');
if (b) b.remove();
const s = document.querySelector('.stage');
if (s) { s.style.padding = '0'; s.style.gap = '0'; s.style.minHeight = '100dvh'; s.style.justifyContent = 'center'; }
const m = document.getElementById('phone-mount');
if (m) {
  m.style.position = 'fixed';
  m.style.inset = '0';
  m.style.width = '100%';
  m.style.height = '100%';
}

ReactDOM.createRoot(m).render(<Mount />);
