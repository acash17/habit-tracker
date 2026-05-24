import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';

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
        {sub && <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.55)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
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
        fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase',
        color: 'rgba(31,27,22,0.5)', padding: '0 4px 8px',
      }}>{header}</div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </div>
  );
}

function SettingsScreen({ onOpenEnergy, onReplay }) {
  const [local, setLocal] = React.useState(true);
  const [calendar, setCalendar] = React.useState(false);
  const [voice, setVoice] = React.useState(true);
  const [streaks, setStreaks] = React.useState(false);
  const [haptics, setHaptics] = React.useState(true);
  const [paused, setPaused] = React.useState(false);

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.5)', textTransform: 'uppercase', marginBottom: 6,
        }}>You</div>
        <H size={32}>Settings</H>
      </div>

      {/* Profile card */}
      <Card style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 999, background: 'var(--terra)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: -0.5,
        }}>A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3 }}>Alex Morgan</div>
          <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>Free plan · 14 days of bloom</div>
        </div>
        <Btn variant="ghost" size="sm">Upgrade</Btn>
      </Card>

      <Section header="Privacy">
        <Row
          title="Local-first storage"
          sub="Sequences live on this device. Sync is opt-in and end-to-end encrypted."
          control={<Toggle on={local} onChange={setLocal} />}
        />
        <Row
          title="Self-hosted AI"
          sub="Route sequence generation to your own server. Lifetime plan only."
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
          title="Voice input"
          sub="Capture goals and notes by voice."
          control={<Toggle on={voice} onChange={setVoice} />}
        />
        <Row
          title="Pause everything"
          sub={paused ? 'All sequences paused. Resume anytime.' : 'Take a break without losing your bloom.'}
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
          title="Replay onboarding"
          sub="See the 6-screen intro again."
          control={<button onClick={onReplay} style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer' }}><Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/></button>}
          last
        />
      </Section>

      <div style={{
        fontSize: 11.5, color: 'rgba(31,27,22,0.45)', textAlign: 'center',
        padding: '8px 24px', lineHeight: 1.5, letterSpacing: -0.05,
      }}>
        Cadence v0.4 · Local-first by default<br/>
        Built for real brains and real life.
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });

export { Row, Toggle, Section, SettingsScreen };
