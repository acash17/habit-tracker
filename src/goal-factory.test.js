import { describe, test, expect } from 'vitest';
import { makeGoalFromSteps, seedBlocksFromGoal, resolveStep, heatLevel } from './goal-factory.js';

describe('makeGoalFromSteps', () => {
  const steps = [
    { label: 'Warm up', est: 5, kind: 'body', why: 'a' },
    { label: 'Focus', est: 50, kind: 'focus' },
  ];

  test('builds a goal with g_ id, title, color, and a sequence with s_ step ids', () => {
    const g = makeGoalFromSteps('My plan', steps, { colorIndex: 0 });
    expect(g.id.startsWith('g_')).toBe(true);
    expect(g.title).toBe('My plan');
    expect(g.color).toBe('terracotta');
    expect(g.cadence).toBe('oneoff');
    expect(g.sequence).toHaveLength(2);
    expect(g.sequence[0].id.startsWith('s_')).toBe(true);
    expect(g.sequence[0]).toMatchObject({ label: 'Warm up', est: 5, kind: 'body', done: false, active: true });
    expect(g.sequence[1].active).toBe(false);
    expect(g.sequence[1].est).toBe(50);
  });

  test('blank title falls back to "Untitled plan"; missing est defaults to 10', () => {
    const g = makeGoalFromSteps('   ', [{ label: 'x' }]);
    expect(g.title).toBe('Untitled plan');
    expect(g.sequence[0].est).toBe(10);
  });

  test('color cycles by colorIndex; daily cadence sets a recurring-style deadline', () => {
    expect(makeGoalFromSteps('a', steps, { colorIndex: 1 }).color).toBe('sage');
    expect(makeGoalFromSteps('a', steps, { colorIndex: 2 }).color).toBe('lavender');
    const daily = makeGoalFromSteps('a', steps, { cadence: 'daily', recurring: true });
    expect(daily.deadline).toBe('Every day');
    expect(daily.recurring).toBe(true);
  });

  test('oneoff cadence forces recurring false and maps a deadline key to a label', () => {
    const g = makeGoalFromSteps('a', steps, { cadence: 'oneoff', recurring: true, deadline: 'today' });
    expect(g.recurring).toBe(false);
    expect(g.deadline).toBe('Today');
  });

  test('yearly cadence → "Every year" deadline', () => {
    const g = makeGoalFromSteps('a', [{ label: 'x', est: 5 }], { cadence: 'yearly', recurring: true });
    expect(g.deadline).toBe('Every year');
    expect(g.cadence).toBe('yearly');
    expect(g.recurring).toBe(true);
  });
});

describe('seedBlocksFromGoal', () => {
  test('lays steps from 9am on an empty day, tagging goal + stepId', () => {
    const g = makeGoalFromSteps('p', [{ label: 'A', est: 20, kind: 'focus' }, { label: 'B', est: 10, kind: 'rest' }]);
    const blocks = seedBlocksFromGoal(g, []);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ startMin: 540, dur: 20, label: 'A', goal: g.id, stepId: g.sequence[0].id, done: false });
    expect(blocks[1].startMin).toBe(560); // 540 + 20
    expect(blocks[1].stepId).toBe(g.sequence[1].id);
  });

  test('appends after the latest existing block end', () => {
    const g = makeGoalFromSteps('p', [{ label: 'A', est: 15, kind: 'focus' }]);
    const blocks = seedBlocksFromGoal(g, [{ startMin: 600, dur: 30 }]);
    expect(blocks[0].startMin).toBe(630); // max(600+30)
  });
});

describe('resolveStep', () => {
  const g = makeGoalFromSteps('p', [{ label: 'A', est: 5 }, { label: 'B', est: 5 }]);

  test('resolves by stepId first', () => {
    const block = { id: 'x', stepId: g.sequence[1].id, label: 'B', goal: g.id };
    expect(resolveStep(g, block)).toBe(g.sequence[1]);
  });

  test('falls back to label when stepId missing', () => {
    expect(resolveStep(g, { id: 'x', label: 'A' })).toBe(g.sequence[0]);
  });

  test('falls back to trailing index in id when stepId + label miss', () => {
    expect(resolveStep(g, { id: `${g.id}-1`, label: 'gone' })).toBe(g.sequence[1]);
  });

  test('returns null when nothing matches', () => {
    expect(resolveStep(g, { id: 'no-index', label: 'gone' })).toBeNull();
  });
});

describe('heatLevel', () => {
  const mk = (flags) => ({ sequence: flags.map((d, i) => ({ id: 's' + i, done: d })) });
  test('0 done → 0', () => expect(heatLevel(mk([false, false, false, false]))).toBe(0));
  test('partial (<50%) → 1', () => expect(heatLevel(mk([true, false, false, false]))).toBe(1));
  test('half-or-more (<100%) → 2', () => expect(heatLevel(mk([true, true, false, false]))).toBe(2));
  test('all done → 3', () => expect(heatLevel(mk([true, true, true, true]))).toBe(3));
  test('empty sequence → 0', () => expect(heatLevel({ sequence: [] })).toBe(0));
});
