import { describe, test, expect, beforeEach } from 'vitest';
import { loadReminders, getReminder, setReminder, removeReminder } from './reminders.js';

// storage.js uses localStorage; provide a minimal in-memory shim so the store
// persists across calls in the Node test environment.
beforeEach(() => {
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
});

describe('reminders store', () => {
  test('set then get round-trips', () => {
    setReminder('g1', { day: 5, hour: 9, minute: 0 });
    expect(getReminder('g1')).toEqual({ day: 5, hour: 9, minute: 0 });
  });
  test('setReminder(id, null) deletes the key', () => {
    setReminder('g1', { day: 5, hour: 9, minute: 0 });
    setReminder('g1', null);
    expect(getReminder('g1')).toBeUndefined();
  });
  test('removeReminder deletes the key', () => {
    setReminder('g2', { day: 1, hour: 8, minute: 0 });
    removeReminder('g2');
    expect(getReminder('g2')).toBeUndefined();
  });
  test('absent id → undefined; loadReminders is an object', () => {
    expect(getReminder('nope')).toBeUndefined();
    expect(typeof loadReminders()).toBe('object');
  });
});
