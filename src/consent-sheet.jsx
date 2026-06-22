import React from 'react';
import { Btn } from './ui.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';
import { signInWithGoogle } from './use-auth.js';
import { recordConsent, hasValidConsent } from './consent.js';
import { toast } from './utils.js';

// DPDP consent dialog shown before Google sign-in (first time, or after a policy
// version bump). Two required checkboxes gate the Continue button:
// policy/terms agreement and an age declaration (DPDP "child" = under 18).
const checkboxRow = {
  display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
  padding: '14px 16px', borderRadius: 14, background: 'var(--card)',
  border: '0.5px solid rgba(31,27,22,0.1)',
};
const checkboxInput = { width: 18, height: 18, marginTop: 1, accentColor: 'var(--terra)', flexShrink: 0 };
const checkboxText = { fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 };

function ConsentSheet({ onClose, onAgree }) {
  const [agreed, setAgreed] = React.useState(false);
  const [age, setAge] = React.useState(false);

  return (
    <SheetShell title="Before you sign in" onClose={onClose} zIndex={600}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14.5, color: 'rgba(31,27,22,0.78)', lineHeight: 1.55 }}>
          To sync across your devices, Pacely collects your <strong>name, email and phone
          number</strong> (name and email via Google; phone you provide), your <strong>goals</strong>,
          and your <strong>completion history</strong> — only to
          create and sync your plans and show your rhythm. We <strong>never sell your data</strong>,
          and you can export or erase everything anytime in Settings.
        </div>

        <label style={checkboxRow}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={checkboxInput} />
          <span style={checkboxText}>
            I agree to the{' '}
            <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: 'var(--terra)' }}>Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: 'var(--terra)' }}>Terms of Service</a>,
            and consent to Pacely storing my data to provide sync (DPDP Act 2023).
          </span>
        </label>

        <label style={checkboxRow}>
          <input type="checkbox" checked={age} onChange={e => setAge(e.target.checked)} style={checkboxInput} />
          <span style={checkboxText}>
            I confirm I am <strong>18 years of age or older</strong>. Pacely is intended only for adults.
          </span>
        </label>

        <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', lineHeight: 1.5 }}>
          You can withdraw consent at any time via Settings → “Erase all my data”. Withdrawal is as
          easy as giving consent and does not affect processing already done.
        </div>

        <SheetFooter>
          <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
          <Btn variant="terra" size="lg" full disabled={!agreed || !age} onClick={onAgree}>
            Agree &amp; continue
          </Btn>
        </SheetFooter>
      </div>
    </SheetShell>
  );
}

// Mounted once at the app root. Any sign-in CTA dispatches `cadence-request-signin`
// (via consent.js requestSignIn). If consent is already on record for the current
// policy version, sign in straight away; otherwise prompt first.
function ConsentGate() {
  const [open, setOpen] = React.useState(false);

  async function startSignIn() {
    try { await signInWithGoogle(); }
    catch (e) { toast(`Sign-in failed · ${(e?.message || 'unknown error').slice(0, 60)}`); }
  }

  React.useEffect(() => {
    const onReq = () => {
      if (hasValidConsent()) startSignIn();
      else setOpen(true);
    };
    window.addEventListener('cadence-request-signin', onReq);
    return () => window.removeEventListener('cadence-request-signin', onReq);
  }, []);

  function onAgree() {
    recordConsent();
    setOpen(false);
    startSignIn();
  }

  if (!open) return null;
  return <ConsentSheet onClose={() => setOpen(false)} onAgree={onAgree} />;
}

Object.assign(window, { ConsentSheet, ConsentGate });

export { ConsentSheet, ConsentGate };
