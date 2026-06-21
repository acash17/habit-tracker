import React from 'react';
import { Icon, Bloom, Chip, Btn, Card, H, blockKindStyle } from './ui.jsx';
import { useAuth } from './use-auth.js';
import { requestSignIn } from './consent.js';
import { cloudEnabled } from './supabase.js';

// 7-screen onboarding flow
// 1. Welcome  2. Sign in (required)  3. Energy  4. First goals  5. Preview  6. Tour  7. First win
// Sign-in sits right after "Get started" and is a HARD GATE — you cannot advance to
// the rest of the app until you sign in (no skip, no "maybe later").

function OnboardingFlow({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [energy, setEnergy] = React.useState({ morning: 'high', afternoon: 'medium', evening: 'low' });
  const [goalText, setGoalText] = React.useState('Gym, 2 hours deep work, emails');
  const [generated, setGenerated] = React.useState(null);

  const steps = ['welcome', 'signin', 'energy', 'goals', 'preview', 'tour', 'win'];
  const screen = steps[step];

  function next() { setStep(s => Math.min(steps.length - 1, s + 1)); }
  function back() { setStep(s => Math.max(0, s - 1)); }

  // Pre-generate the sequence when arriving at preview
  React.useEffect(() => {
    if (screen === 'preview' && !generated) {
      // Hard-coded realistic preview to keep onboarding deterministic + fast
      setGenerated([
        { label: 'Lace up + 20 min gym', est: 20, kind: 'body', why: 'Movement lifts your morning peak.' },
        { label: 'Shower + transition',  est: 12, kind: 'self', why: 'Buffer between modes.' },
        { label: 'Deep work · part 1',   est: 55, kind: 'focus', why: 'Highest-stakes work in your peak.' },
        { label: 'Walk + water',         est: 10, kind: 'rest', why: 'Protects part 2.' },
        { label: 'Deep work · part 2',   est: 55, kind: 'focus', why: 'Pair-block pattern.' },
        { label: 'Email triage',         est: 25, kind: 'self', why: 'Lower-stakes work in the dip.' },
      ]);
    }
  }, [screen]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      background: 'var(--paper)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Status bar safe area */}
      <div style={{ height: 54, flexShrink: 0 }}/>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '0 18px 12px' }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 22 : 6, height: 6, borderRadius: 999,
            background: i <= step ? 'var(--terra)' : 'rgba(31,27,22,0.12)',
            transition: 'all 280ms cubic-bezier(.2,.8,.2,1)',
          }}/>
        ))}
      </div>

      {/* Skip button — hidden on the sign-in step so login can't be bypassed. */}
      <div style={{ position: 'absolute', top: 60, right: 18, zIndex: 10 }}>
        {step > 0 && step < steps.length - 1 && screen !== 'signin' && (
          <button onClick={onDone} style={{
            background: 'transparent', border: 'none', padding: 6,
            fontFamily: 'inherit', fontSize: 13, color: 'rgba(31,27,22,0.5)',
            cursor: 'pointer',
          }}>Skip</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {screen === 'welcome'  && <WelcomeScreen onNext={next}/>}
        {screen === 'signin'   && <SignInScreen onAuthed={next}/>}
        {screen === 'energy'   && <EnergyScreen value={energy} onChange={setEnergy}/>}
        {screen === 'goals'    && <GoalsScreenOnboard value={goalText} onChange={setGoalText}/>}
        {screen === 'preview'  && <PreviewScreen steps={generated}/>}
        {screen === 'tour'     && <TourScreen/>}
        {screen === 'win'      && <WinScreen onStart={onDone}/>}
      </div>

      {/* Footer CTA — sign-in has its own CTA (and no Back, so users can't slip past). */}
      {screen !== 'welcome' && screen !== 'win' && screen !== 'signin' && (
        <div style={{
          padding: '12px 24px 34px', display: 'flex', gap: 10,
          background: 'var(--paper)', borderTop: '0.5px solid rgba(31,27,22,0.05)',
        }}>
          <Btn variant="ghost" size="lg" onClick={back}><Icon name="back" size={14}/></Btn>
          <Btn variant="terra" size="lg" full onClick={next}>
            {screen === 'goals' ? 'Organise my day' : screen === 'preview' ? 'Looks good · save it' : screen === 'tour' ? 'Got it' : 'Next'}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────
function WelcomeScreen({ onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 60, gap: 28 }}>
      <Bloom value={0.85} size={140} color="var(--terra)"/>
      <div>
        <H size={44} style={{ maxWidth: 320 }}>Finally, a planner that plans for you.</H>
        <div style={{ fontSize: 15, color: 'rgba(31,27,22,0.65)', marginTop: 14, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
          Tell us your goals. We'll organise your day into a realistic plan that survives real life.
        </div>
      </div>
      <div style={{ width: '100%', marginTop: 24, paddingBottom: 34 }}>
        <Btn variant="terra" size="lg" full onClick={onNext}>Get started</Btn>
        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.45)', marginTop: 14 }}>
          Set up in under a minute
        </div>
      </div>
    </div>
  );
}

// Brand-accurate 4-color Google "G" (mirrors the one in screen-settings.jsx).
function GoogleLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 36.3 44 30.6 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

// ─── Step 2: Sign in (required, right after "Get started") ───
// HARD GATE: no skip, no "maybe later". The only way forward is to sign in.
// When auth succeeds (user becomes set), we auto-advance to the next step.
function SignInScreen({ onAuthed }) {
  const { user, ready } = useAuth();

  // Auto-advance the moment we're authenticated (e.g. after the OAuth round-trip).
  React.useEffect(() => { if (user) onAuthed(); }, [user]);

  // Same design as the Welcome / "Get started" page: centered Bloom, centered
  // serif headline + subtext, full-width CTA, small caption underneath.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 60, gap: 28 }}>
      <Bloom value={0.85} size={140} color="var(--terra)"/>
      <div>
        <H size={44} style={{ maxWidth: 320 }}>Create your account to continue.</H>
        <div style={{ fontSize: 15, color: 'rgba(31,27,22,0.65)', marginTop: 14, lineHeight: 1.5, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
          Sign in to save your goals and sync them across your devices. It takes one tap.
        </div>
      </div>
      <div style={{ width: '100%', marginTop: 24, paddingBottom: 34 }}>
        {cloudEnabled ? (
          // Same terra button as "Get started"; the Google "G" sits in a white chip
          // so it stays legible on the orange fill.
          <Btn variant="terra" size="lg" full onClick={() => requestSignIn()} disabled={!ready}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 999, background: '#fff', flexShrink: 0,
            }}>
              <GoogleLogo size={16}/>
            </span>
            Continue with Google
          </Btn>
        ) : (
          // Safety hatch: if cloud isn't configured there's no way to sign in, so we
          // must not brick onboarding. Let the user continue local-only.
          <Btn variant="terra" size="lg" full onClick={onAuthed}>Continue</Btn>
        )}

        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.5)', marginTop: 14, lineHeight: 1.5 }}>
          By continuing you agree to our{' '}
          <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: 'var(--terra)' }}>Terms</a>
          {' '}&amp;{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: 'var(--terra)' }}>Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Energy profile ──────────────────────────────────
function EnergyScreen({ value, onChange }) {
  const periods = [
    { id: 'morning',   label: 'Morning',   sub: '6am – 12pm' },
    { id: 'afternoon', label: 'Afternoon', sub: '12pm – 6pm' },
    { id: 'evening',   label: 'Evening',   sub: '6pm – 11pm' },
  ];
  const levels = ['low', 'medium', 'high'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 12 }}>
      <div>
        <H size={32}>When's your brain at its best?</H>
        <div style={{ fontSize: 14, color: 'rgba(31,27,22,0.6)', marginTop: 10, lineHeight: 1.5 }}>
          We'll route focus work into your peaks and lighter tasks into your dips. You can adjust this anytime.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {periods.map(p => (
          <Card key={p.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{p.label}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>{p.sub}</div>
              </div>
              <Chip tone={value[p.id] === 'high' ? 'terra' : value[p.id] === 'medium' ? 'butter' : 'ink'}>
                {value[p.id]}
              </Chip>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {levels.map(l => (
                <button key={l} onClick={() => onChange({ ...value, [p.id]: l })} style={{
                  flex: 1, padding: '10px 0',
                  background: value[p.id] === l ? 'var(--ink)' : 'transparent',
                  color: value[p.id] === l ? 'var(--paper)' : 'rgba(31,27,22,0.7)',
                  border: `1px solid ${value[p.id] === l ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
                  borderRadius: 999, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}>{l}</button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Goals ──────────────────────────────────────
function GoalsScreenOnboard({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 12 }}>
      <div>
        <H size={32}>What would you like help organising?</H>
        <div style={{ fontSize: 14, color: 'rgba(31,27,22,0.6)', marginTop: 10, lineHeight: 1.5 }}>
          One sentence. Goals, tasks, energy, time available — say it however you want.
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.1)',
          borderRadius: 18, padding: '16px 18px',
          fontFamily: 'inherit', fontSize: 16, color: 'var(--ink)',
          lineHeight: 1.45, resize: 'none', outline: 'none',
          boxShadow: '0 4px 18px -12px rgba(31,27,22,0.2)',
        }}
      />

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(31,27,22,0.5)', marginBottom: 10 }}>
          Or try
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Write a chapter, walk the dog, and answer 10 emails — low energy, 3 hours',
            'Workout, focused study block, dinner prep — medium energy',
            'Pack for tomorrow, finish proposal, sleep early',
          ].map((s, i) => (
            <button key={i} onClick={() => onChange(s)} style={{
              padding: 12, textAlign: 'left', background: 'var(--card)',
              border: '0.5px solid rgba(31,27,22,0.08)', borderRadius: 14,
              fontFamily: 'inherit', fontSize: 13, color: 'rgba(31,27,22,0.7)',
              cursor: 'pointer', lineHeight: 1.4,
            }}>{s}</button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 14, background: 'rgba(155,138,196,0.08)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="mic" size={16} color="var(--lav)"/>
          <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.65)' }}>
            Or speak it — voice planning lives on Today.
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 4: Sequence preview ──────────────────────────────
function PreviewScreen({ steps }) {
  const total = (steps || []).reduce((s, x) => s + x.est, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 6 }}>
          Drafted in 3 seconds
        </div>
        <H size={32}>Your day, in order.</H>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <Chip tone="paper">{steps?.length || 0} steps</Chip>
          <Chip tone="paper">~{total} min</Chip>
          <Chip tone="lav">Suggested</Chip>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(steps || []).map((s, i) => {
          const k = blockKindStyle(s.kind);
          return (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: 12,
              background: 'var(--card)', borderRadius: 14,
              border: '0.5px solid rgba(31,27,22,0.06)',
              animation: `slideup 320ms cubic-bezier(.2,.8,.2,1) ${i * 60}ms both`,
            }}>
              <div style={{ width: 4, borderRadius: 2, background: k.bar, flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'rgba(31,27,22,0.55)' }}>{s.est}m</div>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 4, lineHeight: 1.4 }}>{s.why}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Tour ──────────────────────────────────────
function TourScreen() {
  const cards = [
    { icon: 'check', tone: 'sage', title: 'Tap to complete', sub: 'Just a tap. No comment required. No score, no shame.' },
    { icon: 'leaf', tone: 'terra', title: 'Life happened?', sub: 'One big button reshapes the day in three seconds. No streak punishments.' },
    { icon: 'sparkle', tone: 'lav', title: 'We learn your patterns', sub: 'Each day teaches the planner. Insights show what works for you — never failure rates.' },
  ];
  const toneMap = {
    sage:   { bg: 'rgba(107,142,90,0.12)', fg: 'var(--sage)' },
    terra:  { bg: 'rgba(200,96,47,0.10)',  fg: 'var(--terra)' },
    lav:    { bg: 'rgba(155,138,196,0.16)',fg: 'var(--lav)' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 12 }}>
      <H size={32}>Three things to know.</H>
      {cards.map((c, i) => {
        const t = toneMap[c.tone];
        return (
          <Card key={i} style={{ padding: 18, animation: `slideup 320ms cubic-bezier(.2,.8,.2,1) ${i * 100}ms both` }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: t.bg, color: t.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name={c.icon} size={20}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.62)', marginTop: 6, lineHeight: 1.5 }}>{c.sub}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Step 6: First win ──────────────────────────────────
function WinScreen({ onStart }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 36, gap: 22, paddingBottom: 24 }}>
      <Confetti/>
      <Bloom value={1} size={130} color="var(--terra)"/>
      <H size={36} style={{ maxWidth: 300 }}>Your first plan is ready.</H>
      <div style={{ fontSize: 14.5, color: 'rgba(31,27,22,0.65)', maxWidth: 280, lineHeight: 1.5 }}>
        Start whenever feels right. The bloom only grows — even on the days you don't.
      </div>
      <div style={{ width: '100%', marginTop: 16, paddingBottom: 16 }}>
        <Btn variant="terra" size="lg" full onClick={onStart}>Start using Pacely</Btn>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = [...Array(14)].map((_, i) => {
    const colors = ['var(--terra)', 'var(--sage)', 'var(--lav)', '#c89a3a'];
    return {
      left: 10 + Math.random() * 80,
      delay: Math.random() * 0.3,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
    };
  });
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 240,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -16, left: `${p.left}%`,
          width: p.size, height: p.size * 0.4, background: p.color, borderRadius: 1,
          animation: `confetti-fall 2.4s cubic-bezier(.2,.6,.4,1) ${p.delay}s 1`,
          animationFillMode: 'forwards',
        }}/>
      ))}
    </div>
  );
}

Object.assign(window, { OnboardingFlow });

export { OnboardingFlow, WelcomeScreen, SignInScreen, EnergyScreen, GoalsScreenOnboard, PreviewScreen, TourScreen, WinScreen, Confetti };
