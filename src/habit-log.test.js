import { describe, test, expect } from 'vitest';
import { habitLogRow, mergeCloudLogs } from './habit-log.js';

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
