import React from 'react';
import { Icon, Bloom, Chip, Btn, Card, H } from './ui.jsx';
import { ScoreDrawer } from './planner.jsx';
import { minToTime } from './data.jsx';
import { blocksToICS, icsFilename } from './calendar.js';
import { exportICS } from './calendar-export.js';
import { usePersistedState, load, save, dayKey } from './storage.js';

// Today screen — visual timeline + energy + bloom

function EnergyDots({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 28, height: 28, borderRadius: 999, padding: 0,
          background: n <= value ? 'var(--terra)' : 'transparent',
          border: `1.5px solid ${n <= value ? 'var(--terra)' : 'rgba(31,27,22,0.18)'}`,
          cursor: 'pointer',
          transition: 'all 180ms ease',
        }} aria-label={`energy ${n}`} />
      ))}
    </div>
  );
}

function blockKindStyle(kind) {
  switch (kind) {
    case 'focus':   return { bg: 'rgba(194,106,56,0.10)',  bar: '#C26A38', label: 'Focus' };
    case 'rest':    return { bg: 'rgba(107,142,90,0.12)',  bar: '#6B8E5A', label: 'Rest' };
    case 'body':    return { bg: 'rgba(232,194,107,0.22)', bar: '#C89A3A', label: 'Body' };
    case 'reading': return { bg: 'rgba(142,124,184,0.16)', bar: '#8E7CB8', label: 'Read' };
    case 'self':    return { bg: 'rgba(31,27,22,0.05)',    bar: '#6B6359', label: 'Self' };
    default:        return { bg: 'rgba(31,27,22,0.05)',    bar: '#6B6359', label: '' };
  }
}

function catStyle(cat) {
  switch (cat) {
    case 'meeting': return { bg: 'rgba(194,106,56,0.08)', bar: '#C26A38', label: 'Meeting' };
    case 'meal':    return { bg: 'rgba(107,142,90,0.10)', bar: '#6B8E5A', label: 'Meal' };
    case 'errand':  return { bg: 'rgba(232,194,107,0.18)',bar: '#C89A3A', label: 'Errand' };
    default:        return { bg: 'rgba(142,124,184,0.12)',bar: '#8E7CB8', label: 'Event' };
  }
}

function TimelineBlock({ b, expanded, onToggle, onDone, allBlocks, onRunningLong }) {
  const isEvent = b.type === 'event';
  const k = isEvent ? catStyle(b.cat) : blockKindStyle(b.kind);
  const minHeight = Math.max(68, 8 + b.dur * 1.3);

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'stretch',
      opacity: b.done ? 0.5 : 1,
      transition: 'opacity 200ms ease',
    }}>
      {/* time gutter */}
      <div style={{
        width: 52, flexShrink: 0, paddingTop: 9,
        fontFamily: 'var(--mono)', fontSize: 11.5,
        color: 'rgba(31,27,22,0.5)', textAlign: 'right',
      }}>
        <div style={{ fontWeight: 500, color: b.active ? 'var(--terra)' : undefined }}>{minToTime(b.startMin)}</div>
        <div style={{ fontSize: 10.5, marginTop: 2 }}>{b.dur}m</div>
      </div>

      {/* block card */}
      <div onClick={isEvent ? undefined : onToggle} style={{
        flex: 1, position: 'relative',
        background: b.active ? '#fff' : k.bg,
        borderRadius: 18, padding: '13px 14px 13px 18px',
        minHeight, cursor: isEvent ? 'default' : 'pointer',
        border: b.active
          ? `1.5px solid ${k.bar}`
          : isEvent
            ? `0.5px solid ${k.bar}30`
            : '0.5px solid rgba(31,27,22,0.05)',
        boxShadow: b.active ? `0 12px 28px -18px ${k.bar}88` : undefined,
        transition: 'all 220ms ease',
      }}>
        {/* left color bar */}
        <div style={{
          position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
          background: k.bar, borderRadius: 2,
          opacity: b.done ? 0.35 : 1,
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{
                fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: 0.6, color: k.bar,
              }}>{k.label}{b.active ? ' · now' : ''}</span>
              {isEvent && (
                <Icon name="lock" size={10} color={b.anchor === 'hard' ? 'rgba(31,27,22,0.5)' : 'rgba(31,27,22,0.3)'} />
              )}
            </div>
            <div style={{
              fontSize: 15, lineHeight: 1.3, color: 'var(--ink)',
              fontWeight: 500, letterSpacing: -0.15,
              textDecoration: b.done ? 'line-through' : 'none',
            }}>{b.label}</div>
            {/* meta tag for events with reminders */}
            {isEvent && b.reminder > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
                padding: '3px 9px', borderRadius: 999,
                background: 'rgba(31,27,22,0.05)',
                fontSize: 11.5, color: 'rgba(31,27,22,0.6)',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>
                </svg>
                {b.reminder}m before
              </div>
            )}
          </div>

          {/* done button — only for habits */}
          {!isEvent && (
            <button onClick={(e) => { e.stopPropagation(); onDone(); }} style={{
              width: 32, height: 32, borderRadius: 999, padding: 0, flexShrink: 0,
              background: b.done ? 'var(--sage)' : 'transparent',
              border: b.done ? 'none' : '1.5px solid rgba(31,27,22,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: b.done ? '#fff' : 'rgba(31,27,22,0.35)',
              cursor: 'pointer',
            }}>{b.done && <Icon name="check" size={15} strokeWidth={2.5} />}</button>
          )}
        </div>

        {b.active && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" variant="terra" style={{ height: 30 }} onClick={(e) => { e.stopPropagation(); onRunningLong(); }}>
              <Icon name="pause" size={13}/> Running long
            </Btn>
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
    dark:   { bg: '#1F1B16', fg: '#F6F1E8', bd: '#1F1B16' },
  };
  const t = tones[tone] || tones.ink;
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 14px', borderRadius: 999,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`, fontFamily: 'inherit',
      fontSize: 13, fontWeight: 500, letterSpacing: -0.1, cursor: 'pointer',
      transition: 'transform 120ms ease',
      boxShadow: emphasis ? '0 6px 16px -8px rgba(200,96,47,0.5)' : undefined,
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
      onMouseUp={(e) => e.currentTarget.style.transform = ''}
      onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      <Icon name={icon} size={13}/> {label}
    </button>
  );
}

function RecoveryCard({ missedDays, onAccept, onDismiss }) {
  const headline =
    missedDays === 1 ? 'You missed yesterday.' :
    missedDays === 2 ? 'You took two days off.' :
    missedDays <= 6  ? `You've been away for ${missedDays} days.` :
                       "It's been a while.";
  const sub =
    missedDays >= 5
      ? 'No rush, no judgment. One tiny step is enough to get going.'
      : 'Three tiny steps. No streak penalty. Just enough to feel something move.';

  return (
    <Card style={{
      padding: 16,
      background: 'linear-gradient(180deg, rgba(155,138,196,0.08), rgba(155,138,196,0.16))',
      border: '0.5px solid rgba(155,138,196,0.25)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--lav)', marginBottom: 4 }}>
          Welcome back
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', letterSpacing: -0.25, lineHeight: 1.2 }}>
          {headline} Want a soft restart?
        </div>
        <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
          {sub}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Btn variant="terra" size="sm" full onClick={onAccept}>Soft restart</Btn>
        <Btn variant="ghost" size="sm" onClick={onDismiss}>I'm fine</Btn>
      </div>
    </Card>
  );
}

// "Cadence noticed" — adaptive pattern card
function AdaptiveSuggestionCard({ blocks, energy, onApply, onDismiss }) {
  const remaining = blocks.filter(b => !b.done && b.type !== 'event');
  const focusLeft = remaining.filter(b => b.kind === 'focus');
  const backToBack = focusLeft.length >= 2;

  if (energy <= 2 && focusLeft.length > 0) {
    return (
      <div style={{
        padding: 16, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(155,138,196,0.10), rgba(155,138,196,0.18))',
        border: '0.5px solid rgba(155,138,196,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <Icon name="sparkle" size={14} color="var(--lav)"/>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--lav)' }}>Cadence noticed</span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.2, letterSpacing: -0.25, color: 'var(--ink)' }}>
          Low energy today — want me to shrink the focus blocks?
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.62)', marginTop: 6, lineHeight: 1.4 }}>
          {focusLeft.length} focus block{focusLeft.length === 1 ? '' : 's'} left. I'll cap each at 25 min — keeps you moving without the crash.
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={onApply} style={{
            flex: 1, height: 38, borderRadius: 999,
            background: 'var(--lav)', color: '#fff',
            border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Shrink them</button>
          <button onClick={onDismiss} style={{
            height: 38, padding: '0 18px', borderRadius: 999,
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid rgba(31,27,22,0.14)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Keep as is</button>
        </div>
      </div>
    );
  }

  if (backToBack && energy >= 3) {
    return (
      <div style={{
        padding: 16, borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(194,106,56,0.07), rgba(194,106,56,0.13))',
        border: '0.5px solid rgba(194,106,56,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <Icon name="sparkle" size={14} color="var(--terra)"/>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--terra)' }}>Cadence noticed</span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.2, letterSpacing: -0.25, color: 'var(--ink)' }}>
          Two focus blocks back-to-back coming up.
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.62)', marginTop: 6, lineHeight: 1.4 }}>
          A rest break in between lifts your finish rate from 28% to 71%. Add one?
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={onApply} style={{
            flex: 1, height: 38, borderRadius: 999,
            background: 'var(--terra)', color: '#fff',
            border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Add a break</button>
          <button onClick={onDismiss} style={{
            height: 38, padding: '0 18px', borderRadius: 999,
            background: 'transparent', color: 'var(--ink)',
            border: '1px solid rgba(31,27,22,0.14)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Keep as is</button>
        </div>
      </div>
    );
  }

  return null;
}

function ProgressBar({ done, total, minsDone, minsToday }) {
  const pct = total > 0 ? done / total : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px' }}>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
        lineHeight: 1, letterSpacing: -0.3, flexShrink: 0,
      }}>
        {done} <span style={{ color: 'rgba(31,27,22,0.38)' }}>of {total}</span>
      </div>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(31,27,22,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: 'var(--terra)',
          width: `${Math.round(pct * 100)}%`,
          transition: 'width 400ms cubic-bezier(.2,.8,.2,1)',
        }}/>
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11.5,
        color: 'rgba(31,27,22,0.55)', flexShrink: 0, whiteSpace: 'nowrap',
      }}>{minsDone}m done</div>
    </div>
  );
}

function TodayScreen({ blocks, setBlocks, onAdapt, openNewGoal, onRunningLong, onWhy, onLife, onVoice, onLibrary, onAddEvent, missedDays = 0 }) {
  const [energy, setEnergy] = usePersistedState('energy', 3);
  const [expanded, setExpanded] = React.useState(null);
  const [adaptiveDismissed, setAdaptiveDismissed] = React.useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = React.useState(
    () => load('recoveryDismissed', null) === dayKey()
  );

  const showRecovery = missedDays >= 1 && !recoveryDismissed;

  function dismissRecovery() {
    save('recoveryDismissed', dayKey());
    setRecoveryDismissed(true);
  }

  const done = blocks.filter(b => b.done).length;
  const total = blocks.length;
  const minsToday = blocks.reduce((s, b) => s + b.dur, 0);
  const minsDone = blocks.filter(b => b.done).reduce((s, b) => s + b.dur, 0);

  function applyAdaptiveLow() {
    setBlocks(blocks.map(b =>
      !b.done && b.type !== 'event' && b.kind === 'focus'
        ? { ...b, dur: Math.min(25, b.dur) }
        : b
    ));
    setAdaptiveDismissed(true);
  }

  function applyAdaptiveBreak() {
    const firstFocusIdx = blocks.findIndex(b => !b.done && b.kind === 'focus');
    if (firstFocusIdx < 0) { setAdaptiveDismissed(true); return; }
    const anchor = blocks[firstFocusIdx];
    const breakBlock = {
      id: 'brk' + Date.now(),
      type: 'habit',
      startMin: anchor.startMin + anchor.dur,
      dur: 10,
      label: 'Walk + water',
      kind: 'rest',
      done: false,
      scores: { urgency: 0.2, importance: 0.65, energyMatch: 0.9, success: 0.95, effort: 0.1 },
      optional: true,
      deps: [],
    };
    const next = [...blocks];
    next.splice(firstFocusIdx + 1, 0, breakBlock);
    setBlocks(next);
    setAdaptiveDismissed(true);
  }

  const focusLeft = blocks.filter(b => !b.done && b.type !== 'event' && b.kind === 'focus');
  const backToBack = focusLeft.length >= 2;
  const showAdaptive = !adaptiveDismissed && (
    (energy <= 2 && focusLeft.length > 0) ||
    (backToBack && energy >= 3)
  );

  // Greeting date
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Greeting */}
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.5)', textTransform: 'uppercase', marginBottom: 6,
        }}>{dateLabel}</div>
        <H size={32}>Good morning, Alex.</H>
        <div style={{
          marginTop: 6, fontSize: 13.5, color: 'rgba(31,27,22,0.6)',
          lineHeight: 1.45, textWrap: 'pretty',
        }}>
          Fixed plans and gentle habits, side by side. Start anywhere — I'll flow the rest around what's locked.
        </div>
      </div>

      {/* Quick-add chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
        <QuickChip icon="plus" label="Add event" tone="dark" onClick={onAddEvent} />
        <QuickChip icon="mic" label="Voice plan" tone="lav" onClick={onVoice} />
        <QuickChip icon="goals" label="From library" tone="sage" onClick={onLibrary} />
        <QuickChip icon="leaf" label="Life happened" tone="terra" emphasis onClick={onLife} />
      </div>

      {/* Adaptive suggestion */}
      {showAdaptive && (
        <AdaptiveSuggestionCard
          blocks={blocks}
          energy={energy}
          onApply={energy <= 2 ? applyAdaptiveLow : applyAdaptiveBreak}
          onDismiss={() => setAdaptiveDismissed(true)}
        />
      )}

      {/* Recovery card */}
      {showRecovery && <RecoveryCard missedDays={missedDays} onAccept={onLife} onDismiss={dismissRecovery} />}

      {/* Energy + adapt */}
      <Card style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }} data-tour="energy-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>How's your energy?</div>
            <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.5)', marginTop: 2 }}>I'll rebalance habits — not your fixed plans.</div>
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

      {/* Progress strip */}
      <ProgressBar done={done} total={total} minsDone={minsDone} minsToday={minsToday} />

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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

      {/* End-of-day reflection */}
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
          <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>
            One tap. No streak. Just patterns.
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { TodayScreen });

export { EnergyDots, TimelineBlock, QuickChip, RecoveryCard, TodayScreen, blockKindStyle };
