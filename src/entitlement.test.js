import { describe, test, expect, beforeEach } from 'vitest';
import { freeEntitlement, isPro, goalLimitReached, FREE_GOAL_LIMIT, loadEntitlement, saveEntitlement } from './entitlement.js';

beforeEach(() => {
  const mem = {};
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
});

describe('isPro', () => {
  const now = Date.parse('2026-06-28T00:00:00Z');
  test('free → false', () => expect(isPro(freeEntitlement(), now)).toBe(false));
  test('pro lifetime (no expiry) → true', () => expect(isPro({ plan: 'pro', source: 'lifetime', expiresAt: null }, now)).toBe(true));
  test('pro annual future expiry → true', () => expect(isPro({ plan: 'pro', source: 'annual', expiresAt: '2027-06-28T00:00:00Z' }, now)).toBe(true));
  test('pro past expiry → false', () => expect(isPro({ plan: 'pro', source: 'annual', expiresAt: '2026-01-01T00:00:00Z' }, now)).toBe(false));
});

describe('goalLimitReached', () => {
  const free = freeEntitlement();
  const pro = { plan: 'pro', source: 'lifetime', expiresAt: null };
  test('free under cap → false', () => expect(goalLimitReached(2, free)).toBe(false));
  test('free at cap → true', () => expect(goalLimitReached(FREE_GOAL_LIMIT, free)).toBe(true));
  test('free over cap → true', () => expect(goalLimitReached(FREE_GOAL_LIMIT + 5, free)).toBe(true));
  test('pro never limited', () => expect(goalLimitReached(999, pro)).toBe(false));
  test('FREE_GOAL_LIMIT is 3', () => expect(FREE_GOAL_LIMIT).toBe(3));
});

describe('cache', () => {
  test('save then load round-trips', () => {
    saveEntitlement({ plan: 'pro', source: 'annual', expiresAt: '2027-01-01T00:00:00Z' });
    expect(loadEntitlement()).toEqual({ plan: 'pro', source: 'annual', expiresAt: '2027-01-01T00:00:00Z' });
  });
  test('empty cache falls back to free', () => {
    expect(loadEntitlement()).toEqual(freeEntitlement());
  });
});
