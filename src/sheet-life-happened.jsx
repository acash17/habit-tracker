import React from 'react';
import { Icon, Btn, Card, H } from './ui.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';

// "Life Happened" sheet — one-tap rescue with 4 options.
// Attacks: rigidity, plan-collapse, shame after a bad day.

function LifeOption({ icon, color, title, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: 16, width: '100%',
      background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.08)',
      borderRadius: 18, cursor: 'pointer', textAlign: 'left',
      fontFamily: 'inherit',
      transition: 'transform 120ms ease, background 120ms ease',
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
      onMouseUp={(e) => e.currentTarget.style.transform = ''}
      onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: color.bg, color: color.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon name={icon} size={18}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.15 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)', marginTop: 4, lineHeight: 1.45 }}>{sub}</div>
      </div>
      <Icon name="chev" size={16} color="rgba(31,27,22,0.3)"/>
    </button>
  );
}

function LifeHappenedSheet({ blocks, onClose, onApply }) {
  const [view, setView] = React.useState('menu'); // menu | recovery
  const remaining = blocks.filter(b => !b.done);
  const focusLeft = remaining.filter(b => b.kind === 'focus').length;

  function delay() {
    // push every remaining block forward by 30 min
    const next = blocks.map(b => b.done ? b : { ...b, startMin: b.startMin + 30 });
    onApply(next, 'Delayed everything by 30 min');
  }
  function simplify() {
    // shrink every focus block to 25 min, keep rest as-is
    const next = blocks.map(b => b.done || b.kind !== 'focus' ? b : { ...b, dur: Math.min(25, b.dur) });
    onApply(next, 'Simplified · focus blocks shrunk to 25m');
  }
  function swap() {
    // drop the lowest-score optional block, replace nothing
    const opt = remaining.filter(b => b.optional && !b.active)
      .sort((a, b) => composite(a.scores) - composite(b.scores))[0];
    if (opt) {
      onApply(blocks.filter(b => b.id !== opt.id), `Swapped out ${opt.label}`);
    } else {
      onApply(blocks, 'Nothing optional to swap — already minimal');
    }
  }

  if (view === 'recovery') {
    return <RecoveryPlan onClose={onClose} onApply={onApply} blocks={blocks}/>;
  }

  return (
    <SheetShell title="Life happened" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <H size={26}>What kind of "happened"?</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
            No explanation needed. Pick the shape of today's recovery — I'll reshape the plan around it.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LifeOption
            icon="arrow-down"
            color={{ bg: 'rgba(200,96,47,0.10)', fg: 'var(--terra)' }}
            title="Delay everything"
            sub="Push the rest of today forward by 30 minutes. Same plan, later."
            onClick={delay}
          />
          <LifeOption
            icon="leaf"
            color={{ bg: 'rgba(107,142,90,0.12)', fg: 'var(--sage)' }}
            title="Simplify the day"
            sub={`Shrink the ${focusLeft} remaining focus block${focusLeft === 1 ? '' : 's'} to 25-min sprints.`}
            onClick={simplify}
          />
          <LifeOption
            icon="shuffle"
            color={{ bg: 'rgba(232,194,107,0.22)', fg: '#a87f1f' }}
            title="Swap one task"
            sub="Drop the lowest-priority optional block. Free up the slot."
            onClick={swap}
          />
          <LifeOption
            icon="sparkle"
            color={{ bg: 'rgba(155,138,196,0.18)', fg: 'var(--lav)' }}
            title="Gentle recovery plan"
            sub="Start over with a tiny, easy sequence. Just enough to feel something move."
            onClick={() => setView('recovery')}
          />
        </div>

        <Card style={{ padding: 14, background: 'rgba(107,142,90,0.06)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="leaf" size={16} color="var(--sage)"/>
            <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.7)', lineHeight: 1.5 }}>
              Nothing resets. Your bloom keeps the days you've already lived in.
            </div>
          </div>
        </Card>
      </div>
    </SheetShell>
  );
}

// Sub-view: gentle recovery sequence (3 tiny steps)
function RecoveryPlan({ blocks, onClose, onApply }) {
  const recoverySteps = [
    { label: '2 min stretch', dur: 2, kind: 'body', why: 'Body before mind.' },
    { label: 'Pick one open tab — close the rest', dur: 5, kind: 'self', why: 'Reduce ambient overwhelm.' },
    { label: '15-min focus on that one thing', dur: 15, kind: 'focus', why: 'Tiny win.' },
  ];

  function apply() {
    // replace remaining blocks with these three
    const now = (typeof Date !== 'undefined') ? new Date() : null;
    let cursor = blocks.find(b => b.active)?.startMin || (10 * 60 + 50);
    const done = blocks.filter(b => b.done);
    const fresh = recoverySteps.map((s, i) => {
      const block = {
        id: 'rec' + i,
        startMin: cursor,
        dur: s.dur,
        label: s.label,
        kind: s.kind,
        done: false,
        active: i === 0,
        scores: { urgency: 0.4, importance: 0.6, energyMatch: 0.9, success: 0.95, effort: 0.15 },
        optional: false,
        deps: [],
      };
      cursor += s.dur;
      return block;
    });
    onApply([...done, ...fresh], 'Gentle recovery · 3 tiny steps');
  }

  return (
    <SheetShell title="Gentle recovery" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <H size={26}>Start with something tiny.</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
            Forget the rest of the day. Three small things to get something moving.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recoverySteps.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: 14,
              background: 'var(--card)', borderRadius: 16,
              border: '0.5px solid rgba(31,27,22,0.06)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: 'var(--sage)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 14,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(31,27,22,0.55)' }}>{s.dur}m</div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.55)', marginTop: 4 }}>{s.why}</div>
              </div>
            </div>
          ))}
        </div>

        <SheetFooter>
          <Btn variant="ghost" size="lg" onClick={onClose}>Not now</Btn>
          <Btn variant="terra" size="lg" full onClick={apply}>Start here</Btn>
        </SheetFooter>
      </div>
    </SheetShell>
  );
}

Object.assign(window, { LifeHappenedSheet });

export { LifeOption, LifeHappenedSheet, RecoveryPlan };
