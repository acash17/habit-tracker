import { describe, test, expect } from 'vitest';
import { habitLogRow, mergeCloudLogs, getLogSnapshot, subscribeLog, setSharedLog, dayBreakdown } from './habit-log.js';

describe('habitLogRow', () => {
  test('builds an upsertable habit_logs row (whole-goal, step_id null)', () => {
    const row = habitLogRow('u1', 'g1', '2026-06-02', 2, '2026-06-02T08:30:00.000Z');
    expect(row).toEqual({
      user_id: 'u1',
      goal_id: 'g1',
      step_id: '',
      day: '2026-06-02',
      level: 2,
      done_at: '2026-06-02T08:30:00.000Z',
    });
  });
});

describe('mergeCloudLogs', () => {
  test('merges pulled rows into the local day→level cache', () => {
    const local = { g1: { '2026-06-01': 1 } };
    const merged = mergeCloudLogs(local, [
      { goal_id: 'g1', day: '2026-06-02', level: 3 },
      { goal_id: 'g2', day: '2026-06-02', level: 1 },
    ]);
    expect(merged).toEqual({
      g1: { '2026-06-01': 1, '2026-06-02': 3 },
      g2: { '2026-06-02': 1 },
    });
  });

  test('cloud wins on a same-cell conflict (cloud is bootstrap source of truth)', () => {
    const merged = mergeCloudLogs({ g1: { '2026-06-02': 1 } }, [
      { goal_id: 'g1', day: '2026-06-02', level: 3 },
    ]);
    expect(merged.g1['2026-06-02']).toBe(3);
  });

  test('a level-0 cloud row clears the local cell', () => {
    const merged = mergeCloudLogs({ g1: { '2026-06-02': 2 } }, [
      { goal_id: 'g1', day: '2026-06-02', level: 0 },
    ]);
    expect(merged.g1['2026-06-02']).toBeUndefined();
  });

  test('does not mutate the input log', () => {
    const local = { g1: { '2026-06-01': 1 } };
    mergeCloudLogs(local, [{ goal_id: 'g1', day: '2026-06-02', level: 2 }]);
    expect(local).toEqual({ g1: { '2026-06-01': 1 } });
  });
});

describe('shared log store', () => {
  test('setSharedLog updates the snapshot and notifies subscribers', () => {
    let calls = 0;
    const unsub = subscribeLog(() => { calls++; });
    setSharedLog({ g1: { '2026-06-27': 2 } });
    expect(getLogSnapshot().g1['2026-06-27']).toBe(2);
    expect(calls).toBe(1);
    unsub();
    setSharedLog({ g1: { '2026-06-27': 3 } });
    expect(calls).toBe(1); // no longer subscribed
  });

  test('setSharedLog accepts an updater function', () => {
    setSharedLog({ g1: { d: 1 } });
    setSharedLog(prev => ({ ...prev, g2: { d: 2 } }));
    const snap = getLogSnapshot();
    expect(snap.g1.d).toBe(1);
    expect(snap.g2.d).toBe(2);
  });
});

describe('dayBreakdown', () => {
  test('aggregates each goal level on a given day', () => {
    const log = { g1: { '2026-06-27': 2 }, g2: { '2026-06-27': 1, '2026-06-26': 3 } };
    expect(dayBreakdown(log, '2026-06-27')).toEqual({
      total: 3,
      goals: [{ goalId: 'g1', level: 2 }, { goalId: 'g2', level: 1 }],
    });
  });

  test('ignores zero/absent cells and empty log', () => {
    expect(dayBreakdown({ g1: { '2026-06-27': 0 } }, '2026-06-27')).toEqual({ total: 0, goals: [] });
    expect(dayBreakdown({}, '2026-06-27')).toEqual({ total: 0, goals: [] });
  });
});
