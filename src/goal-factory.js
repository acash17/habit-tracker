// Pure factory for goals + their Today blocks. No browser globals — every plan
// path (new-goal, onboarding, library, voice) funnels through here so goal
// records and goal-linked blocks are built identically.
import { newId } from './utils.js';

const PALETTE = ['terracotta', 'sage', 'lavender'];

const DEADLINE_LABEL = {
  'today': 'Today', 'this-week': 'This week',
  'this-month': 'This month', 'no-rush': 'Slow burn',
};

// title + raw steps (label/est/kind/why) → a full goal record.
export function makeGoalFromSteps(title, steps, opts = {}) {
  const t = (title || '').trim();
  const list = Array.isArray(steps) ? steps : [];
  const cadence = opts.cadence || 'oneoff';
  const recurring = !!opts.recurring && cadence !== 'oneoff';
  const colorIndex = typeof opts.colorIndex === 'number' ? opts.colorIndex : 0;
  const deadlineKey = opts.deadline || 'this-week';
  const deadline = cadence === 'oneoff'
    ? (DEADLINE_LABEL[deadlineKey] || deadlineKey)
    : (cadence === 'daily' ? 'Every day' : cadence === 'weekly' ? 'Every week' : 'Every month');
  return {
    id: newId('g_'),
    title: t || 'Untitled plan',
    color: PALETTE[colorIndex % PALETTE.length],
    cadence,
    recurring,
    deadline,
    sequence: list.map((s, i) => ({
      id: newId('s_'),
      label: s.label || `Step ${i + 1}`,
      est: typeof s.est === 'number' ? s.est : 10,
      done: false,
      active: i === 0,
      why: s.why || '',
      kind: s.kind || 'focus',
    })),
  };
}

// goal → Today blocks, appended after existing blocks (or from 9am on an empty
// day). Each block carries `goal` + `stepId` so completion can write back.
export function seedBlocksFromGoal(goal, existingBlocks = []) {
  let cursor = existingBlocks.length
    ? Math.max(...existingBlocks.map(b => b.startMin + b.dur))
    : 9 * 60;
  return goal.sequence.map((s, i) => {
    const b = {
      id: `${goal.id}-${i}`, startMin: cursor, dur: s.est, label: s.label,
      kind: s.kind, done: false, active: false, goal: goal.id, stepId: s.id,
      scores: { urgency: 0.5, importance: 0.6, energyMatch: 0.7, success: 0.8, effort: 0.4 },
      optional: false, deps: [],
    };
    cursor += s.est;
    return b;
  });
}

// Find which goal sub-habit a Today block belongs to. stepId → label → trailing
// index in the block id. Returns the step object, or null when nothing matches.
export function resolveStep(goal, block) {
  const seq = (goal && goal.sequence) || [];
  if (!seq.length || !block) return null;
  if (block.stepId) {
    const byId = seq.find(s => s.id === block.stepId);
    if (byId) return byId;
  }
  if (block.label) {
    const byLabel = seq.find(s => s.label === block.label);
    if (byLabel) return byLabel;
  }
  const m = /-(\d+)$/.exec(block.id || '');
  if (m) {
    const idx = Number(m[1]);
    if (idx >= 0 && idx < seq.length) return seq[idx];
  }
  return null;
}

// Fraction of a goal's sub-habits done → 0..3 heatmap intensity.
export function heatLevel(goal) {
  const seq = (goal && goal.sequence) || [];
  const total = seq.length;
  if (!total) return 0;
  const done = seq.filter(s => s.done).length;
  if (done === 0) return 0;
  const frac = done / total;
  if (frac >= 1) return 3;
  if (frac >= 0.5) return 2;
  return 1;
}
