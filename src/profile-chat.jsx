import React from 'react';
import { Btn } from './ui.jsx';
import { useAuth } from './use-auth.js';
import { saveProfile, isProfileComplete, isName, isEmail, isPhone } from './profile.js';
import { toast } from './utils.js';

// Conversational, chat-style profile intake shown once after Google sign-in.
// Collects first name, last name, email (prefilled from Google), and phone,
// one question at a time, then saves to the profiles table.

const STEPS = [
  { field: 'first_name', prompt: "Hi! I'm Pacely. Let's set up your profile — what's your first name?", placeholder: 'First name', validate: isName, error: 'Please enter your first name.' },
  { field: 'last_name',  prompt: (a) => `Nice to meet you, ${a.first_name}! And your last name?`,          placeholder: 'Last name',  validate: isName, error: 'Please enter your last name.' },
  { field: 'email',      prompt: "What's the best email to reach you?",                                     placeholder: 'you@example.com', type: 'email', validate: isEmail, error: 'That doesn’t look like a valid email.' },
  { field: 'phone',      prompt: 'Last one — your phone number (with country code)?',                       placeholder: '+91 98765 43210', type: 'tel',   validate: isPhone, error: 'Enter a valid phone number (7–15 digits).' },
];

function Bubble({ from, children }) {
  const me = from === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: 16,
        fontSize: 14.5, lineHeight: 1.45,
        background: me ? 'var(--terra)' : 'var(--card)',
        color: me ? '#fff' : 'var(--ink)',
        border: me ? 'none' : '0.5px solid rgba(31,27,22,0.08)',
        borderBottomRightRadius: me ? 4 : 16,
        borderBottomLeftRadius: me ? 16 : 4,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{children}</div>
    </div>
  );
}

export function ProfileChat({ onDone, initialEmail = '' }) {
  // Conversation log: alternating bot/me bubbles.
  const [log, setLog] = React.useState([{ from: 'bot', text: typeof STEPS[0].prompt === 'function' ? STEPS[0].prompt({}) : STEPS[0].prompt }]);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [input, setInput] = React.useState('');
  const [err, setErr] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const step = STEPS[stepIdx];
  const done = stepIdx >= STEPS.length;

  // Prefill email field when we reach it (from the Google account).
  React.useEffect(() => {
    if (step && step.field === 'email' && initialEmail && !input) setInput(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  React.useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }); }, [log]);
  React.useEffect(() => { inputRef.current?.focus(); }, [stepIdx]);

  async function submit() {
    if (done || saving) return;
    const value = input.trim();
    if (!step.validate(value)) { setErr(step.error); return; }
    setErr('');

    const nextAnswers = { ...answers, [step.field]: value };
    const nextIdx = stepIdx + 1;
    const newLog = [...log, { from: 'me', text: value }];

    if (nextIdx < STEPS.length) {
      const nx = STEPS[nextIdx];
      newLog.push({ from: 'bot', text: typeof nx.prompt === 'function' ? nx.prompt(nextAnswers) : nx.prompt });
      setLog(newLog); setAnswers(nextAnswers); setStepIdx(nextIdx); setInput('');
    } else {
      // All collected → confirm + save.
      newLog.push({ from: 'bot', text: `Got it — saving your details:\n• ${nextAnswers.first_name} ${nextAnswers.last_name}\n• ${nextAnswers.email}\n• ${nextAnswers.phone}` });
      setLog(newLog); setAnswers(nextAnswers); setStepIdx(nextIdx); setInput(''); setSaving(true);
      const res = await saveProfile(nextAnswers);
      setLog((l) => [...l, { from: 'bot', text: res.cloud ? 'All set — your profile is saved to your account. ✅' : 'Saved on this device. (Sign in to sync it to your account.)' }]);
      setSaving(false);
      toast('Profile saved');
      setTimeout(() => onDone?.(), 1200);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 600, background: 'var(--paper)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)',
    }}>
      {/* header */}
      <div style={{ padding: '54px 18px 12px', borderBottom: '0.5px solid rgba(31,27,22,0.08)' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', letterSpacing: -0.3 }}>Your details</div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>
          A few quick questions. Stored securely on your account.
        </div>
      </div>

      {/* conversation */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
        {log.map((m, i) => <Bubble key={i} from={m.from === 'me' ? 'me' : 'bot'}>{m.text}</Bubble>)}
      </div>

      {/* input */}
      {!done && (
        <div style={{ padding: '10px 14px 22px', borderTop: '0.5px solid rgba(31,27,22,0.08)', background: 'var(--paper)' }}>
          {err && <div style={{ color: 'var(--terra)', fontSize: 12, marginBottom: 6, paddingLeft: 4 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={input}
              type={step?.type || 'text'}
              inputMode={step?.field === 'phone' ? 'tel' : step?.field === 'email' ? 'email' : 'text'}
              onChange={(e) => { setInput(e.target.value); if (err) setErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder={step?.placeholder}
              aria-label={step?.placeholder}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14, fontSize: 14.5,
                fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)',
                border: '0.5px solid rgba(31,27,22,0.15)', outline: 'none',
              }}
            />
            <Btn variant="terra" size="md" onClick={submit} disabled={saving}>Send</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// Gate: shows the chat once per account after sign-in (or via ?profile=1 for testing).
export function ProfileGate() {
  const { user, ready } = useAuth();
  const forced = (() => { try { return /[?&]profile=1/.test(location.search); } catch { return false; } })();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (forced) { setOpen(true); return; }
    if (!ready) return;
    if (user && !isProfileComplete(user.id)) setOpen(true);
    else setOpen(false);
  }, [user, ready, forced]);

  if (!open) return null;
  return <ProfileChat initialEmail={user?.email || ''} onDone={() => setOpen(false)} />;
}

Object.assign(window, { ProfileChat, ProfileGate });
