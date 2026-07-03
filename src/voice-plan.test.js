import { describe, it, expect } from 'vitest';
import { normalizeSteps, classifyVoicePlanError } from './voice-plan.js';

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

describe('classifyVoicePlanError', () => {
  const invokeError = (status, body) => ({
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify(body), { status }),
  });

  it('maps 422 (no speech / unusable audio) to empty-plan', async () => {
    const err = await classifyVoicePlanError(invokeError(422, { detail: 'no speech detected' }));
    expect(err.message).toBe('empty-plan');
  });

  it('maps 504 (cold start outran the gateway) to backend-warming', async () => {
    const err = await classifyVoicePlanError(invokeError(504, { error: 'backend-timeout' }));
    expect(err.message).toBe('backend-warming');
  });

  it('maps 401 to unauthorized', async () => {
    const err = await classifyVoicePlanError(invokeError(401, { error: 'unauthorized' }));
    expect(err.message).toBe('unauthorized');
  });

  it('keeps the upstream detail on generic failures', async () => {
    const err = await classifyVoicePlanError(invokeError(502, { error: 'backend-unreachable', detail: 'dns failed' }));
    expect(err.message).toBe('voice-plan-failed');
    expect(err.detail).toBe('dns failed');
  });

  it('survives errors with no readable response body', async () => {
    const err = await classifyVoicePlanError({ message: 'Failed to send a request' });
    expect(err.message).toBe('voice-plan-failed');
    expect(err.detail).toBe('Failed to send a request');
  });
});
