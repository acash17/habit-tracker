import { describe, it, expect } from 'vitest';
import { normalizeSteps } from './voice-plan.js';

describe('normalizeSteps', () => {
  it('passes through valid steps untouched', () => {
    const steps = normalizeSteps([
      { label: 'Gym', est: 20, kind: 'body', why: 'Movement first.' },
    ]);
    expect(steps).toEqual([{ label: 'Gym', est: 20, kind: 'body', why: 'Movement first.' }]);
  });

  it('returns [] for non-array or garbage input', () => {
    expect(normalizeSteps(null)).toEqual([]);
    expect(normalizeSteps('nope')).toEqual([]);
    expect(normalizeSteps([null, 42, { est: 10 }])).toEqual([]);
  });

  it('clamps est into 5-90 and defaults bad values to 25', () => {
    const [a, b, c] = normalizeSteps([
      { label: 'a', est: 300, kind: 'focus', why: 'x' },
      { label: 'b', est: 1, kind: 'focus', why: 'x' },
      { label: 'c', est: 'soon', kind: 'focus', why: 'x' },
    ]);
    expect(a.est).toBe(90);
    expect(b.est).toBe(5);
    expect(c.est).toBe(25);
  });

  it('coerces unknown kinds to self and fills missing why', () => {
    const [s] = normalizeSteps([{ label: 'Emails', est: 25, kind: 'admin' }]);
    expect(s.kind).toBe('self');
    expect(s.why.length).toBeGreaterThan(0);
  });

  it('caps at 9 steps and truncates long labels', () => {
    const raw = Array.from({ length: 12 }, (_, i) => ({
      label: `step ${i} ${'x'.repeat(200)}`, est: 10, kind: 'rest', why: 'y',
    }));
    const steps = normalizeSteps(raw);
    expect(steps).toHaveLength(9);
    expect(steps[0].label.length).toBeLessThanOrEqual(80);
  });
});
