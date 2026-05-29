import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';

// Goals / Library — list of active sequences

const CADENCE_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', oneoff: 'Project' };

function GoalCard({ g, onOpen }) {
  const done = g.sequence.filter(s => s.done).length;
  const total = g.sequence.length;
  const mins = g.sequence.reduce((s, x) => s + x.est, 0);
  const colorMap = { terracotta: 'var(--terra)', sage: 'var(--sage)', lavender: 'var(--lav)', butter: '#c89a3a' };
  const c = colorMap[g.color] || 'var(--ink)';
  const cad = g.cadence || 'oneoff';
  return (
    <Card onClick={onOpen} style={{ padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
            <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.5)', fontWeight: 500 }}>{g.deadline}</div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999,
              background: cad === 'oneoff' ? 'rgba(31,27,22,0.06)' : 'rgba(107,142,90,0.12)',
              color: cad === 'oneoff' ? 'rgba(31,27,22,0.55)' : 'var(--sage)',
            }}>
              {CADENCE_LABEL[cad]}{g.recurring ? ' · ↻' : ''}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)',
            lineHeight: 1.15, letterSpacing: -0.3, marginBottom: 10,
          }}>{g.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip tone="paper">{total} sub-habit{total === 1 ? '' : 's'}</Chip>
            <Chip tone="paper">{mins}m total</Chip>
            <Chip tone="sage">{done}/{total} done</Chip>
          </div>
        </div>
        <Icon name="chev" size={18} color="rgba(31,27,22,0.3)"/>
      </div>

      {/* mini-progress bar of steps */}
      <div style={{ display: 'flex', gap: 3, marginTop: 14 }}>
        {g.sequence.map(s => (
          <div key={s.id} style={{
            flex: s.est, height: 6, borderRadius: 3,
            background: s.done ? c : s.active ? c : 'rgba(31,27,22,0.08)',
            opacity: s.done ? 1 : s.active ? 0.45 : 1,
          }} />
        ))}
      </div>
    </Card>
  );
}

function GoalsScreen({ goals, openNewGoal, openGoal }) {
  const [filter, setFilter] = React.useState('all'); // all | daily | weekly | monthly | oneoff
  const active = goals.length;
  const counts = React.useMemo(() => {
    const c = { all: goals.length, daily: 0, weekly: 0, monthly: 0, oneoff: 0 };
    for (const g of goals) c[g.cadence || 'oneoff']++;
    return c;
  }, [goals]);
  const visible = filter === 'all' ? goals : goals.filter(g => (g.cadence || 'oneoff') === filter);

  const FILTERS = [
    ['all',     'All'],
    ['daily',   'Daily'],
    ['weekly',  'Weekly'],
    ['monthly', 'Monthly'],
    ['oneoff',  'Projects'],
  ];

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.5)', textTransform: 'uppercase', marginBottom: 6,
        }}>{active} active</div>
        <H size={32}>Sequences</H>
        <div style={{
          marginTop: 6, fontSize: 14, color: 'rgba(31,27,22,0.62)',
          lineHeight: 1.4, textWrap: 'pretty',
        }}>
          Each goal becomes a sequence of micro-steps. Daily, weekly, monthly or one-off — and any goal can hold many sub-habits.
        </div>
      </div>

      <Btn variant="primary" size="md" onClick={openNewGoal} full>
        <Icon name="sparkle" size={16}/> New goal → sequence
      </Btn>

      {/* Cadence filter pills — horizontal scroll on overflow */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        margin: '0 -18px', padding: '2px 18px 4px',
        scrollbarWidth: 'none',
      }} className="phone-scroll">
        {FILTERS.map(([k, label]) => {
          const isActive = filter === k;
          const n = counts[k] ?? 0;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              flexShrink: 0,
              padding: '8px 14px', borderRadius: 999,
              border: `0.5px solid ${isActive ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
              background: isActive ? 'var(--ink)' : 'var(--paper)',
              color: isActive ? 'var(--paper)' : 'var(--ink)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all 160ms ease',
            }}>
              {label}
              <span style={{
                fontSize: 10.5, opacity: 0.7, fontFeatureSettings: '"tnum"',
              }}>{n}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.length === 0 ? (
          <Card style={{ padding: 24, textAlign: 'center', background: 'var(--paper-2)' }}>
            <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.6)' }}>
              No {filter === 'oneoff' ? 'projects' : filter} goals yet.
            </div>
          </Card>
        ) : (
          visible.map(g => <GoalCard key={g.id} g={g} onOpen={() => openGoal(g.id)} />)
        )}
      </div>

      <Card style={{ padding: 16, background: 'var(--paper-2)' }}>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)', lineHeight: 1.5 }}>
          Tip: it’s fine to have many. Filter by cadence to keep today’s view focused.
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { GoalsScreen, GoalCard });

export { GoalCard, GoalsScreen };
