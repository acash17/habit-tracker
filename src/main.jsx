import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IOSDevice } from './ios-frame.jsx';
import { App } from './app.jsx';
import { ErrorBoundary } from './error-boundary.jsx';
import { initNativeAuthHandler } from './use-auth.js';
import './styles.css';

// Arm Capacitor deep-link handler before mount so the OAuth callback isn't dropped.
// No-op on web (and when cloud env vars aren't set).
initNativeAuthHandler();

// In the installed app (Capacitor native) the device IS the phone, so render the
// app full-screen — no simulated phone frame, no marketing blurb beside it. The
// framed/blurb layout is only for the web/demo landing page.
const isNative = (() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })();

function Mount() {
  if (isNative) {
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

// Hide the marketing blurb on native (or ?bare=1 for web parity).
if (isNative || new URLSearchParams(location.search).get('bare') === '1') {
  const b = document.querySelector('.blurb');
  if (b) b.remove();
  const s = document.querySelector('.stage');
  if (s) s.style.justifyContent = 'center';
}

// Native: make the stage + mount fill the whole screen so the app is edge-to-edge.
if (isNative) {
  const s = document.querySelector('.stage');
  if (s) { s.style.padding = '0'; s.style.gap = '0'; }
  const m = document.getElementById('phone-mount');
  if (m) {
    m.style.position = 'fixed';
    m.style.inset = '0';
    m.style.width = '100%';
    m.style.height = '100%';
  }
}

ReactDOM.createRoot(document.getElementById('phone-mount')).render(<Mount />);
