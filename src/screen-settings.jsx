import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';
import { useAuth, signOut } from './use-auth.js';
import { cloudEnabled } from './supabase.js';
import { toast } from './utils.js';
import { exportMyData, eraseMyData } from './data-rights.js';
import { requestSignIn } from './consent.js';
import { getReminder, saveReminder, enableReminder, disableReminder } from './notifications.js';
import { useEntitlement } from './use-entitlement.js';

const fmtTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

// Settings — privacy-first, non-punitive controls

function Row({ title, sub, control, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(31,27,22,0.06)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      {control}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 26, borderRadius: 999, padding: 0, border: 'none',
      background: on ? 'var(--sage)' : 'rgba(31,27,22,0.16)',
      position: 'relative', cursor: 'pointer',
      transition: 'background 200ms ease',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        transition: 'left 200ms ease',
      }}/>
    </button>
  );
}

function Section({ header, children }) {
  return (
    <div>
      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
        color: 'rgba(31,27,22,0.64)', padding: '0 4px 8px',
      }}>{header}</div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </div>
  );
}

function GoogleLogo({ size = 16 }) {
  // Brand-accurate 4-color Google "G"
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 36.3 44 30.6 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function ProfileCard() {
  const { user, ready } = useAuth();
  const [busy, setBusy] = React.useState(false);

  function onSignIn() {
    // Routes through the app-level ConsentGate (prompts for consent if needed).
    requestSignIn();
  }
  async function onSignOut() {
    try { setBusy(true); await signOut(); }
    finally { setBusy(false); }
  }

  // Cloud disabled — show a local-only badge instead of a fake profile
  if (!cloudEnabled) {
    return (
      <Card style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 999, background: 'var(--paper-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(31,27,22,0.64)', fontFamily: 'var(--mono)', fontSize: 12,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>local</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3 }}>This device only</div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 2 }}>Cloud sync not configured. See docs/SUPABASE_SETUP.md.</div>
        </div>
      </Card>
    );
  }

  // Signed out — Google sign-in CTA
  if (!user) {
    return (
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3, lineHeight: 1.1 }}>
            Sync your plans
          </div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.5 }}>
            Sign in to back up your goals and pick them up on any device. Local data stays on this device; signing in only mirrors it.
          </div>
        </div>
        <button
          onClick={onSignIn}
          disabled={!ready || busy}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 16px', borderRadius: 12, cursor: busy ? 'wait' : 'pointer',
            background: '#fff', color: '#1F1B16',
            border: '0.5px solid rgba(31,27,22,0.18)',
            boxShadow: '0 1px 2px rgba(31,27,22,0.05)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            opacity: ready ? 1 : 0.6,
          }}>
          <GoogleLogo size={18} />
          <span>{busy ? 'Redirecting…' : 'Continue with Google'}</span>
        </button>
        <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.64)', lineHeight: 1.5, marginTop: 2 }}>
          By continuing you consent to Pacely storing your goals and completion history to
          provide sync, per our{' '}
          <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: 'var(--terra)' }}>Privacy Policy</a>
          {' '}(DPDP Act 2023). Withdraw anytime via “Erase all my data”.
        </div>
      </Card>
    );
  }

  // Signed in
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Signed in';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  const initials = (name || 'U').trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      {avatar ? (
        <img src={avatar} alt="" referrerPolicy="no-referrer" style={{
          width: 48, height: 48, borderRadius: 999, objectFit: 'cover',
          border: '0.5px solid rgba(31,27,22,0.12)',
        }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 999, background: 'var(--terra)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--serif)', fontSize: 20, letterSpacing: -0.4,
        }}>{initials}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', letterSpacing: -0.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--sage)' }} />
          Synced
        </div>
      </div>
      <button onClick={onSignOut} disabled={busy} style={{
        background: 'transparent', border: '0.5px solid rgba(31,27,22,0.15)',
        padding: '7px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13,
        color: 'rgba(31,27,22,0.7)', cursor: busy ? 'wait' : 'pointer',
      }}>Sign out</button>
    </Card>
  );
}

function EraseDataRow() {
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <Row
      title="Erase all my data"
      sub="Permanently delete your goals, logs, and profile — on this device and in the cloud (right to erasure)."
      last
      control={
        !confirm ? (
          <button onClick={() => setConfirm(true)} style={{
            background: 'transparent', border: '0.5px solid rgba(194,106,56,0.4)',
            padding: '7px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13,
            color: 'var(--terra)', cursor: 'pointer',
          }}>Erase</button>
        ) : (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <button onClick={() => setConfirm(false)} disabled={busy} style={{
              background: 'transparent', border: '0.5px solid rgba(31,27,22,0.15)',
              padding: '7px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={async () => { setBusy(true); try { await eraseMyData(); } catch { setBusy(false); } }} disabled={busy} style={{
              background: 'var(--terra)', color: '#fff', border: 'none',
              padding: '7px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: busy ? 'wait' : 'pointer',
            }}>{busy ? '…' : 'Confirm'}</button>
          </span>
        )
      }
    />
  );
}

function SettingsScreen({ onOpenEnergy, onReplay, onUpgrade }) {
  const { pro } = useEntitlement();
  const [local, setLocal] = React.useState(true);
  const [calendar, setCalendar] = React.useState(false);
  const [voice, setVoice] = React.useState(true);
  const [streaks, setStreaks] = React.useState(false);
  const [haptics, setHaptics] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const [reminder, setReminder] = React.useState(() => getReminder());

  async function toggleReminder(on) {
    if (on) {
      const res = await enableReminder(reminder.hour, reminder.minute);
      if (!res.ok) { toast('Allow notifications in system settings to enable'); return; }
      setReminder(r => ({ ...r, enabled: true }));
      toast(res.native ? 'Daily reminder on' : 'Saved — reminders fire in the installed app');
    } else {
      await disableReminder();
      setReminder(r => ({ ...r, enabled: false }));
      toast('Daily reminder off');
    }
  }
  function changeReminderTime(value) {
    const [h, m] = (value || '09:00').split(':').map(Number);
    const next = { ...reminder, hour: h, minute: m };
    setReminder(next);
    saveReminder(next);
    if (next.enabled) enableReminder(h, m); // reschedule at the new time
  }

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.64)', textTransform: 'uppercase', marginBottom: 6,
        }}>You</div>
        <H size={32}>Settings</H>
      </div>

      {/* Profile card — driven by Supabase auth when cloud is enabled */}
      <ProfileCard />

      {/* Pacely Pro */}
      <button onClick={() => !pro && onUpgrade && onUpgrade('general')} style={{
        width: '100%', textAlign: 'left', cursor: pro ? 'default' : 'pointer',
        padding: '14px 16px', borderRadius: 16,
        background: pro ? 'rgba(107,142,90,0.10)' : 'rgba(200,96,47,0.08)',
        border: `0.5px solid ${pro ? 'rgba(107,142,90,0.35)' : 'rgba(200,96,47,0.25)'}`,
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Icon name="sparkle" size={18} color={pro ? 'var(--sage)' : 'var(--terra)'} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{pro ? 'Pacely Pro · active' : 'Upgrade to Pacely Pro'}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)' }}>{pro ? 'Thanks for your support 🌿' : 'Unlimited goals, Insights, reminders'}</div>
        </div>
        {!pro && <Icon name="chev" size={16} color="rgba(31,27,22,0.3)" />}
      </button>

      <Section header="Privacy">
        <Row
          title="Local-first storage"
          sub="Plans live on this device. Sync is opt-in; your cloud data is encrypted in transit and at rest."
          control={<Toggle on={local} onChange={setLocal} />}
        />
        <Row
          title="Self-hosted AI"
          sub="Route plan generation to your own server. Lifetime plan only."
          control={<Chip tone="lav">Lifetime</Chip>}
          last
        />
      </Section>

      <Section header="Adapt to me">
        <Row
          title="Energy profile"
          sub="Your peak hours feed the planner's scoring."
          control={<button onClick={onOpenEnergy} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Chip tone="terra" size="sm">Peak 9am</Chip><Icon name="chev" size={14} color="rgba(31,27,22,0.3)"/></button>}
        />
        <Row
          title="Calendar integration"
          sub="Avoid double-booking with Google or Apple Calendar."
          control={<Toggle on={calendar} onChange={setCalendar} />}
        />
        <Row
          title="Daily reminder"
          sub={reminder.enabled ? `A gentle nudge every day at ${fmtTime(reminder.hour, reminder.minute)}.` : 'A gentle daily nudge to open your plan.'}
          control={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {reminder.enabled && (
                <input
                  type="time"
                  value={fmtTime(reminder.hour, reminder.minute)}
                  onChange={(e) => changeReminderTime(e.target.value)}
                  aria-label="reminder time"
                  style={{
                    fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
                    background: 'rgba(31,27,22,0.04)', border: '0.5px solid rgba(31,27,22,0.12)',
                    borderRadius: 8, padding: '4px 6px', outline: 'none',
                  }}
                />
              )}
              <Toggle on={reminder.enabled} onChange={toggleReminder} />
            </div>
          }
        />
        <Row
          title="Voice input"
          sub="Capture goals and notes by voice."
          control={<Toggle on={voice} onChange={setVoice} />}
        />
        <Row
          title="Pause everything"
          sub={paused ? 'All plans paused. Resume anytime.' : 'Take a break without losing your bloom.'}
          control={<Toggle on={paused} onChange={setPaused} />}
          last
        />
      </Section>

      <Section header="Feedback style">
        <Row
          title="Show streaks"
          sub="Off by default. We use effort patterns, not chains that punish missed days."
          control={<Toggle on={streaks} onChange={setStreaks} />}
        />
        <Row
          title="Gentle haptics"
          sub="Subtle pulse when a block ends."
          control={<Toggle on={haptics} onChange={setHaptics} />}
          last
        />
      </Section>

      <Section header="Help">
        <Row
          title="Replay feature tour"
          sub="Walk through every feature with the floating guide."
          control={<button onClick={() => window.dispatchEvent(new CustomEvent('pacely:start-feature-tour'))} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></button>}
        />
        <Row
          title="Replay onboarding"
          sub="See the 6-screen intro again."
          control={<button onClick={onReplay} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></button>}
          last
        />
      </Section>

      {/* DPDP Act 2023 — data-subject rights */}
      <Section header="Your data & privacy">
        <Row
          title="Download my data"
          sub="Export everything Pacely holds about you as JSON (right to access)."
          control={<button onClick={() => exportMyData().catch(() => toast('Export failed'))} style={{
            background: 'transparent', border: '0.5px solid rgba(31,27,22,0.15)',
            padding: '7px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13,
            color: 'var(--ink)', cursor: 'pointer',
          }}>Export</button>}
        />
        <Row
          title="Privacy policy"
          sub="How your data is handled, under India's DPDP Act 2023."
          control={<a href="/privacy.html" target="_blank" rel="noreferrer" style={{ padding: 4, display: 'inline-flex' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></a>}
        />
        <Row
          title="Terms of service"
          sub="The terms you agree to when using Pacely."
          control={<a href="/terms.html" target="_blank" rel="noreferrer" style={{ padding: 4, display: 'inline-flex' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></a>}
        />
        <Row
          title="Grievance officer"
          sub="Data-protection contact for access, correction, or complaints — also escalate to the Data Protection Board of India."
          control={<a href="mailto:grievance@vinkashis.com" style={{
            padding: '7px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13,
            color: 'var(--ink)', textDecoration: 'none', border: '0.5px solid rgba(31,27,22,0.15)',
          }}>Email</a>}
        />
        <Row
          title="How to delete my account"
          sub="Step-by-step deletion options, including requesting erasure by email."
          control={<a href="/delete-account.html" target="_blank" rel="noreferrer" style={{ padding: 4, display: 'inline-flex' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></a>}
        />
        <EraseDataRow />
      </Section>

      <div style={{
        fontSize: 13, color: 'rgba(31,27,22,0.64)', textAlign: 'center',
        padding: '8px 24px', lineHeight: 1.5, letterSpacing: -0.05,
      }}>
        Pacely v0.5.2 · Local-first by default<br/>
        Built for real brains and real life.
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });

export { Row, Toggle, Section, SettingsScreen };
