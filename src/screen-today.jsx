import React from 'react';
import { Icon, Bloom, Chip, Btn, Card, H, blockKindStyle } from './ui.jsx';
import { ScoreDrawer } from './planner.jsx';
import { minToTime } from './data.jsx';
import { blocksToICS, icsFilename } from './calendar.js';
import { exportICS } from './calendar-export.js';
import { useAuth } from './use-auth.js';
import { loadProfile } from './profile.js';

// Today screen — visual timeline + energy + bloom

// Personalised, time-aware greeting helpers.
function timeGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function todayLabel(d = new Date()) {
  return `${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
// First name from (in order): the profile chat, Google account metadata, email.
function firstNameOf(user, profile) {
  const fromProfile = (profile?.first_name || '').trim();
  if (fromProfile) return fromProfile;
  const meta = user?.user_metadata || {};
  const full = (meta.full_name || meta.name || '').trim();
  if (full) return full.split(/\s+/)[0];
  if (user?.email) return user.email.split('@')[0];
  return '';
}

function EnergyDots({ value, onChange }) {
  // 44px hit area (Apple/Material min) with a 22px visual dot centered inside.
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} aria-label={`energy ${n}`} style={{
          width: 44, height: 44, padding: 0, border: 'none', background: 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999, display: 'block',
            background: n <= value ? 'var(--terra)' : 'transparent',
            border: `1.5px solid ${n <= value ? 'var(--terra)' : 'rgba(31,27,22,0.18)'}`,
            transition: 'all 180ms ease',
          }} />
        </button>
      ))}
    </div>
  );
}

function TimelineBlock({ b, expanded, onToggle, onDone, allBlocks, onRunningLong }) {
  const k = blockKindStyle(b.kind);
  const minHeight = Math.max(72, 8 + b.dur * 1.4);
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'stretch',
      opacity: b.done ? 0.55 : 1,
      transition: 'opacity 200ms ease',
    }}>
      {/* time gutter — mono numerals stay at the --text-xs floor (12px) */}
      <div style={{
        width: 52, flexShrink: 0, paddingTop: 8,
        fontFamily: 'var(--mono)', fontSize: 12,
        color: 'rgba(31,27,22,0.64)', textAlign: 'right',
      }}>
        <div style={{ fontWeight: 500, color: b.active ? 'var(--terra)' : undefined }}>{minToTime(b.startMin)}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>{b.dur}m</div>
      </div>

      {/* block card */}
      <div onClick={onToggle} style={{
        flex: 1, position: 'relative',
        background: b.active ? '#fff' : k.bg,
        borderRadius: 18, padding: '14px 14px 14px 18px',
        minHeight, cursor: 'pointer',
        border: b.active ? `1.5px solid ${k.bar}` : '0.5px solid rgba(31,27,22,0.05)',
        boxShadow: b.active ? '0 12px 28px -18px rgba(200,96,47,0.55)' : undefined,
        transition: 'all 220ms ease',
      }}>
        {/* left color bar */}
        <div style={{
          position: 'absolute', left: 0, top: 14, bottom: 14, width: 3,
          background: k.bar, borderRadius: 2,
          opacity: b.done ? 0.4 : 1,
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: 0.6, color: k.bar, marginBottom: 4,
            }}>{k.label}{b.active ? ' · now' : ''}</div>
            <div style={{
              fontSize: 15.5, lineHeight: 1.3, color: 'var(--ink)',
              fontWeight: 500, letterSpacing: -0.2,
              textDecoration: b.done ? 'line-through' : 'none',
            }}>{b.label}</div>
          </div>

          {/* complete button — 44px hit area, 28px visual circle */}
          <button
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            aria-label={b.done ? `Mark ${b.label} not done` : `Mark ${b.label} done`}
            aria-pressed={b.done}
            style={{
            width: 44, height: 44, padding: 0, margin: '-8px -8px 0 0',
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 999,
              background: b.done ? 'var(--sage)' : 'transparent',
              border: b.done ? 'none' : '1.5px solid rgba(31,27,22,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: b.done ? '#fff' : 'rgba(31,27,22,0.4)',
            }}>{b.done && <Icon name="check" size={16} strokeWidth={2.4} />}</span>
          </button>
        </div>

        {b.active && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" variant="terra" style={{ height: 30 }} onClick={(e) => { e.stopPropagation(); onRunningLong(); }}><Icon name="pause" size={13}/> Running long</Btn>
            <Btn size="sm" variant="ghost" style={{ height: 30 }}>Skip</Btn>
            <Btn size="sm" variant="ghost" style={{ height: 30 }}>Notes</Btn>
          </div>
        )}

        {expanded && <ScoreDrawer block={b} allBlocks={allBlocks} />}
      </div>
    </div>
  );
}

function QuickChip({ icon, label, tone = 'ink', emphasis, onClick }) {
  const tones = {
    ink:    { bg: 'var(--card)', fg: 'var(--ink)', bd: 'rgba(31,27,22,0.10)' },
    terra:  { bg: emphasis ? 'var(--terra)' : 'rgba(200,96,47,0.10)', fg: emphasis ? '#fff' : 'var(--terra)', bd: emphasis ? 'var(--terra)' : 'rgba(200,96,47,0.25)' },
    sage:   { bg: 'rgba(107,142,90,0.12)', fg: 'var(--sage)', bd: 'rgba(107,142,90,0.25)' },
    lav:    { bg: 'rgba(155,138,196,0.16)', fg: 'var(--lav)', bd: 'rgba(155,138,196,0.3)' },
  };
  const t = tones[tone] || tones.ink;
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 999,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`, fontFamily: 'inherit',
      fontSize: 13, fontWeight: 500, letterSpacing: -0.1, cursor: 'pointer',
      transition: 'transform 120ms ease',
      boxShadow: emphasis ? '0 6px 16px -8px rgba(200,96,47,0.5)' : undefined,
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
      onMouseUp={(e) => e.currentTarget.style.transform = ''}
      onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      <Icon name={icon} size={14}/> {label}
    </button>
  );
}

function RecoveryCard({ onAccept }) {
  return (
    <Card style={{
      padding: 16,
      background: 'linear-gradient(180deg, rgba(155,138,196,0.08), rgba(155,138,196,0.16))',
      border: '0.5px solid rgba(155,138,196,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--lav)', marginBottom: 4 }}>
            Welcome back
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', letterSpacing: -0.25, lineHeight: 1.2 }}>
            You took two days off. Want a soft restart?
          </div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.45 }}>
            Three tiny steps. No streak penalty. Just enough to feel something move.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Btn variant="terra" size="sm" full onClick={onAccept}>Soft restart</Btn>
        <Btn variant="ghost" size="sm">I'm fine</Btn>
      </div>
    </Card>
  );
}

function TodayScreen({ blocks, setBlocks, onAdapt, openNewGoal, onRunningLong, onWhy, onLife, onVoice, onLibrary }) {
  const { user } = useAuth();
  const greeting = `${timeGreeting()}${firstNameOf(user, loadProfile()) ? `, ${firstNameOf(user, loadProfile())}` : ''}.`;
  const dateLabel = todayLabel();
  const [energy, setEnergy] = React.useState(3);
  const [expanded, setExpanded] = React.useState(null);
  const [showRecovery, setShowRecovery] = React.useState(false);

  const done = blocks.filter(b => b.done).length;
  const total = blocks.length;
  const minsToday = blocks.reduce((s, b) => s + b.dur, 0);
  const minsDone = blocks.filter(b => b.done).reduce((s, b) => s + b.dur, 0);

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Greeting card */}
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.64)', textTransform: 'uppercase', marginBottom: 6,
        }}>{dateLabel}</div>
        <H size={32}>{greeting}</H>
        <div style={{
          marginTop: 6, fontSize: 14, color: 'rgba(31,27,22,0.64)',
          lineHeight: 1.4, textWrap: 'pretty',
        }}>
          {total === 0
            ? 'A clean slate. Create your first plan to get going.'
            : 'Your day, in gentle order. Start anywhere — I’ll rebalance the rest.'}
        </div>
      </div>

      {total === 0 ? (
        /* Empty state — no demo tasks, just a clear way to create the first plan. */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, paddingTop: 24 }}>
          <Bloom value={0.45} size={120} color="var(--terra)" />
          <div>
            <H size={26}>Nothing planned yet.</H>
            <div style={{ fontSize: 14, color: 'rgba(31,27,22,0.64)', marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}>
              No demo, no clutter. Create your first plan — its steps land here, in order.
            </div>
          </div>
          <Btn variant="terra" size="lg" full onClick={openNewGoal}>
            <Icon name="plus" size={16} /> Create a plan
          </Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            <QuickChip icon="mic" label="Voice plan" tone="lav" onClick={onVoice} />
            <QuickChip icon="goals" label="From library" tone="sage" onClick={onLibrary} />
          </div>
        </div>
      ) : (
      <>
      {/* Energy + adapt */}
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} data-tour="energy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>How’s your energy?</div>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 2 }}>I’ll rebalance the day.</div>
          </div>
          <EnergyDots value={energy} onChange={setEnergy} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="soft" size="sm" full onClick={onAdapt}>
            <Icon name="shuffle" size={14} /> Adapt for today
          </Btn>
          <Btn variant="soft" size="sm" full onClick={onWhy} data-tour="why-button">
            <Icon name="sparkle" size={14} /> Why this order?
          </Btn>
        </div>
        <Btn variant="soft" size="sm" full onClick={() => exportICS(blocksToICS(blocks), icsFilename('cadence-today'))}>
          <Icon name="calendar" size={14} /> Add today to calendar
        </Btn>
      </Card>

      {/* Quick-start chips */}
      <div data-tour="quick-actions" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
        <QuickChip icon="mic" label="Voice plan" tone="lav" onClick={onVoice} />
        <QuickChip icon="goals" label="From library" tone="sage" onClick={onLibrary} />
        <QuickChip icon="leaf" label="Life happened" tone="terra" emphasis onClick={onLife} />
      </div>

      {showRecovery && <RecoveryCard onAccept={onLife} />}

      {/* Today progress strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px' }}>
        <Bloom value={minsDone / Math.max(1, minsToday)} size={56} color="var(--terra)" />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
            lineHeight: 1, letterSpacing: -0.3,
          }}>{done} <span style={{ color: 'rgba(31,27,22,0.4)' }}>of {total}</span></div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 4 }}>
            {minsDone}m done · {minsToday - minsDone}m planned
          </div>
        </div>
        <Chip tone="sage" size="sm">on pace</Chip>
      </div>

      {/* Timeline */}
      <div data-tour="today-timeline" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.map(b => (
          <TimelineBlock
            key={b.id}
            b={b}
            allBlocks={blocks}
            expanded={expanded === b.id}
            onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
            onDone={() => setBlocks(blocks.map(x => x.id === b.id ? { ...x, done: !x.done, active: false } : x))}
            onRunningLong={onRunningLong}
          />
        ))}
      </div>

      {/* End-of-day reflection placeholder */}
      <Card style={{
        padding: 18, display: 'flex', gap: 14, alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(155,138,196,0.06), rgba(155,138,196,0.12))',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'rgba(155,138,196,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--lav)',
        }}><Icon name="leaf" size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>End of day check-in at 6pm</div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 2 }}>
            One tap. No streak. Just patterns.
          </div>
        </div>
      </Card>
      </>
      )}
    </div>
  );
}

Object.assign(window, { TodayScreen });

export { EnergyDots, TimelineBlock, QuickChip, RecoveryCard, TodayScreen };
