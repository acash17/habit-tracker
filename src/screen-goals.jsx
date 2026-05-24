import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';

// Goals / Library — list of active sequences

function GoalCard({ g, onOpen }) {
  const done = g.sequence.filter(s => s.done).length;
  const total = g.sequence.length;
  const mins = g.sequence.reduce((s, x) => s + x.est, 0);
  const colorMap = { terracotta: 'var(--terra)', sage: 'var(--sage)', lavender: 'var(--lav)', butter: '#c89a3a' };
  const c = colorMap[g.color] || 'var(--ink)';
  return (
    <Card onClick={onOpen} style={{ padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
            <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.5)', fontWeight: 500 }}>{g.deadline}</div>
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)',
            lineHeight: 1.15, letterSpacing: -0.3, marginBottom: 10,
          }}>{g.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Chip tone="paper">{total} steps</Chip>
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
  const active = goals.length;
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
          Each goal becomes a sequence of micro-steps with realistic estimates. Pause anytime — nothing resets.
        </div>
      </div>

      <Btn variant="primary" size="md" onClick={openNewGoal} full>
        <Icon name="sparkle" size={16}/> New goal → sequence
      </Btn>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goals.map(g => <GoalCard key={g.id} g={g} onOpen={() => openGoal(g.id)} />)}
      </div>

      <Card style={{ padding: 16, background: 'var(--paper-2)' }}>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)', lineHeight: 1.5 }}>
          Tip: keep 1–3 active sequences. Users complete 71% more steps when the list is short.
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { GoalsScreen, GoalCard });

export { GoalCard, GoalsScreen };
