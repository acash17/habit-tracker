import React from 'react';
import ReactDOM from 'react-dom/client';
import { IOSDevice } from './ios-frame.jsx';
import { App } from './app.jsx';
import './styles.css';

function Mount() {
  return (
    <IOSDevice width={402} height={874}>
      <App />
    </IOSDevice>
  );
}

// ?bare=1 — hide marketing blurb (kept for parity with old Cadence.html)
if (new URLSearchParams(location.search).get('bare') === '1') {
  const b = document.querySelector('.blurb');
  if (b) b.remove();
  const s = document.querySelector('.stage');
  if (s) s.style.justifyContent = 'center';
}

ReactDOM.createRoot(document.getElementById('phone-mount')).render(<Mount />);
