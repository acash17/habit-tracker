import { describe, test, expect } from 'vitest';
import { goalReminderId, buildGoalSchedule } from './reminder-schedule.js';

describe('goalReminderId', () => {
  test('deterministic for the same id', () => {
    expect(goalReminderId('g_abc')).toBe(goalReminderId('g_abc'));
  });
  test('distinct for distinct ids, positive, never the global id 1001', () => {
    const ids = ['g_a', 'g_b', 'g_c', 'g_d', 'g_e'].map(goalReminderId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of ids) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(n).not.toBe(1001);
    }
  });
});

describe('buildGoalSchedule', () => {
  const rem = { day: 11, month: 2, hour: 9, minute: 30 };
  test('monthly → on {day,hour,minute}, repeats', () => {
    expect(buildGoalSchedule('monthly', rem)).toEqual({ on: { day: 11, hour: 9, minute: 30 }, repeats: true });
  });
  test('yearly → includes 1-based month', () => {
    expect(buildGoalSchedule('yearly', rem)).toEqual({ on: { month: 3, day: 11, hour: 9, minute: 30 }, repeats: true });
  });
  test('yearly with missing month defaults to January (month 1)', () => {
    expect(buildGoalSchedule('yearly', { day: 1, hour: 9, minute: 0 }).on.month).toBe(1);
  });
  test('no reminder → null', () => {
    expect(buildGoalSchedule('monthly', null)).toBeNull();
  });
  test('non monthly/yearly cadence → null', () => {
    expect(buildGoalSchedule('daily', rem)).toBeNull();
    expect(buildGoalSchedule('weekly', rem)).toBeNull();
    expect(buildGoalSchedule('oneoff', rem)).toBeNull();
  });
});
