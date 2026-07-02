import { describe, it, expect, vi } from 'vitest';

// requestVoicePlan must ride through a cold start on its own: when the first
// call loses the race against the GPU container boot (504), it waits for the
// warmup ping to confirm the backend is healthy and retries once — the user
// never sees an error for a container that was merely waking up.

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('./supabase.js', () => ({
  supabase: { functions: { invoke } },
  cloudEnabled: true,
}));

import { requestVoicePlan } from './voice-plan.js';

const timeout504 = () => ({
  data: null,
  error: {
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify({ error: 'backend-timeout' }), { status: 504 }),
  },
});

const goodPlan = () => ({
  data: {
    transcript: 'gym then deep work',
    plan: { title: 'My day', steps: [{ label: 'Gym', est: 20, kind: 'body', why: 'x' }] },
  },
  error: null,
});

describe('requestVoicePlan cold-start retry', () => {
  it('retries once after a 504 and returns the plan', async () => {
    let planCalls = 0;
    const onRetry = vi.fn();
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.warmup) return { data: { ok: true }, error: null };
      planCalls += 1;
      return planCalls === 1 ? timeout504() : goodPlan();
    });

    const result = await requestVoicePlan({ text: 'plan my day', onRetry });
    expect(result.title).toBe('My day');
    expect(result.steps).toHaveLength(1);
    expect(planCalls).toBe(2);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not retry non-cold-start failures', async () => {
    invoke.mockReset();
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(JSON.stringify({ detail: 'no speech detected' }), { status: 422 }),
      },
    });

    await expect(requestVoicePlan({ text: 'plan my day' })).rejects.toThrow('empty-plan');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('surfaces the second failure if the retry also fails', async () => {
    invoke.mockReset();
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.warmup) return { data: null, error: { message: 'warmup failed' } };
      return timeout504();
    });

    await expect(requestVoicePlan({ text: 'plan my day' })).rejects.toThrow('backend-warming');
    expect(invoke.mock.calls.filter(([, { body }]) => !body.warmup)).toHaveLength(2);
  });
});
