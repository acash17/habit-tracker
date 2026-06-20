import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IOSDevice } from './ios-frame.jsx';
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

// The app fills the whole screen — like a real phone app — both in the installed
// Capacitor build AND in the browser. The old framed phone-on-a-landing-page view
// (simulated bezel + marketing blurb) is now opt-in via ?frame=1, kept only for
// marketing screenshots.
const isNative = (() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })();
const wantsFrame = (() => { try { return new URLSearchParams(location.search).get('frame') === '1'; } catch { return false; } })();
const fullScreen = isNative || !wantsFrame;

function Mount() {
  if (fullScreen) {
    return (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }
  return (
    <IOSDevice width={402} height={874}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </IOSDevice>
  );
}

// Drop the marketing blurb whenever we're full-screen (or ?bare=1).
if (fullScreen || new URLSearchParams(location.search).get('bare') === '1') {
  const b = document.querySelector('.blurb');
  if (b) b.remove();
  const s = document.querySelector('.stage');
  if (s) s.style.justifyContent = 'center';
}

// Full-screen: make the stage + mount fill the whole viewport so the app is edge-to-edge.
if (fullScreen) {
  const s = document.querySelector('.stage');
  if (s) { s.style.padding = '0'; s.style.gap = '0'; s.style.minHeight = '100dvh'; }
  const m = document.getElementById('phone-mount');
  if (m) {
    m.style.position = 'fixed';
    m.style.inset = '0';
    m.style.width = '100%';
    m.style.height = '100%';
  }
}

ReactDOM.createRoot(document.getElementById('phone-mount')).render(<Mount />);
