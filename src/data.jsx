import React from 'react';

// Sample data + helpers for Pacely

const INITIAL_GOALS = [
  {
    id: 'g1',
    title: 'Finish Q3 design review',
    color: 'terracotta',
    cadence: 'oneoff',
    recurring: false,
    deadline: 'Fri',
    sequence: [
      { id: 's1', label: 'Pull yesterday’s comments into one doc', est: 8, done: true, why: 'Front-loads the easiest scan; clears context.' },
      { id: 's2', label: 'Group feedback by screen', est: 12, done: true, why: 'Reduces context-switching during writeup.' },
      { id: 's3', label: 'Draft response to nav-bar thread', est: 25, done: false, active: true, why: 'Highest-signal thread — unblocks two reviewers.' },
      { id: 's4', label: 'Walk + outline reply doc', est: 15, done: false, why: 'Movement break protects focus for the next block.' },
      { id: 's5', label: 'Write decision summary', est: 30, done: false, why: 'Best done after a break, before fatigue sets in.' },
    ],
  },
  {
    id: 'g2',
    title: 'Run a 5K by August',
    color: 'sage',
    cadence: 'weekly',
    recurring: true,
    deadline: 'Every week',
    sequence: [
      { id: 't1', label: 'Lace up + step outside', est: 2, done: false, why: 'Tiny first step beats motivation.' },
      { id: 't2', label: 'Walk 5 min warmup', est: 5, done: false, why: 'Lowers initiation cost.' },
      { id: 't3', label: 'Run/walk intervals × 6', est: 24, done: false, why: 'Matches your current pace data.' },
    ],
  },
  {
    id: 'g3',
    title: 'Read “Thinking in Systems”',
    color: 'lavender',
    cadence: 'daily',
    recurring: true,
    deadline: 'Every day',
    sequence: [
      { id: 'r1', label: 'Read 1 chapter', est: 20, done: false, why: 'Single-chapter chunks beat ambiguous "read more".' },
      { id: 'r2', label: 'Note 3 takeaways', est: 8, done: false, why: 'Encoding pass for memory.' },
    ],
  },
];

// Each block carries a score breakdown — the 5 sub-scores from the planner.
// Values 0..1. Composite is a weighted sum (urgency 0.30, importance 0.25,
// energyMatch 0.20, success 0.15, effort 0.10 — lower effort = higher score).
// `optional` flagged blocks can be dropped by the auto-reschedule.
// `deps` lists block ids that must be done first (topological constraint).
const TIMELINE_BLOCKS = [
  { id: 'b1', startMin: 9 * 60, dur: 45, label: 'Morning check-in', kind: 'self', done: true, goal: null,
    scores: { urgency: 0.30, importance: 0.55, energyMatch: 0.82, success: 0.88, effort: 0.25 }, optional: true, deps: [] },
  { id: 'b2', startMin: 9 * 60 + 45, dur: 50, label: 'Design review · sort feedback', kind: 'focus', done: true, goal: 'g1',
    scores: { urgency: 0.78, importance: 0.85, energyMatch: 0.90, success: 0.84, effort: 0.55 }, deps: [] },
  { id: 'b3', startMin: 10 * 60 + 35, dur: 15, label: 'Walk + water', kind: 'rest', done: true, goal: null,
    scores: { urgency: 0.20, importance: 0.65, energyMatch: 0.70, success: 0.95, effort: 0.15 }, deps: ['b2'] },
  { id: 'b4', startMin: 10 * 60 + 50, dur: 55, label: 'Draft nav-bar reply', kind: 'focus', done: false, active: true, goal: 'g1',
    scores: { urgency: 0.85, importance: 0.90, energyMatch: 0.82, success: 0.78, effort: 0.70 }, deps: ['b2'] },
  { id: 'b5', startMin: 11 * 60 + 45, dur: 30, label: 'Lunch · phone away', kind: 'rest', done: false, goal: null,
    scores: { urgency: 0.40, importance: 0.60, energyMatch: 0.65, success: 0.92, effort: 0.20 }, deps: [] },
  { id: 'b6', startMin: 12 * 60 + 15, dur: 35, label: 'Run intervals', kind: 'body', done: false, goal: 'g2',
    scores: { urgency: 0.45, importance: 0.70, energyMatch: 0.58, success: 0.62, effort: 0.65 }, optional: true, deps: [] },
  { id: 'b7', startMin: 12 * 60 + 50, dur: 40, label: 'Decision summary', kind: 'focus', done: false, goal: 'g1',
    scores: { urgency: 0.82, importance: 0.88, energyMatch: 0.55, success: 0.66, effort: 0.60 }, deps: ['b4'] },
  { id: 'b8', startMin: 13 * 60 + 30, dur: 25, label: 'Read 1 chapter', kind: 'reading', done: false, goal: 'g3',
    scores: { urgency: 0.20, importance: 0.45, energyMatch: 0.42, success: 0.51, effort: 0.35 }, optional: true, deps: [] },
];

// Composite score (0..1). Effort is inverted — easier tasks score higher.
function composite(s) {
  if (!s) return 0;
  return (
    s.urgency * 0.30 +
    s.importance * 0.25 +
    s.energyMatch * 0.20 +
    s.success * 0.15 +
    (1 - s.effort) * 0.10
  );
}

const INSIGHTS = [
  {
    id: 'i1',
    headline: 'You complete 82% of sequences started before 10am.',
    detail: 'Across the last 28 days. Your evening blocks land at 41%. Want me to bias new sequences toward mornings?',
    kind: 'pattern',
  },
  {
    id: 'i2',
    headline: 'Two focus blocks back-to-back is your sweet spot.',
    detail: 'You finish three in a row only 28% of the time — a rest block in the middle lifts the third to 71%.',
    kind: 'pattern',
  },
  {
    id: 'i3',
    headline: 'Low-energy days: shorter blocks win.',
    detail: 'When you log energy ≤ 2, sub-20-minute blocks complete at 76% vs 34% for longer ones.',
    kind: 'pattern',
  },
  {
    id: 'i4',
    headline: 'You’ve stacked 14 days of effort.',
    detail: 'Not a streak — a bloom. Skipping a day didn’t reset anything. Effort compounds either way.',
    kind: 'celebrate',
  },
];

// utility
function minToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, '0')}${ampm}`;
}

Object.assign(window, { INITIAL_GOALS, TIMELINE_BLOCKS, INSIGHTS, minToTime, composite });

export { INITIAL_GOALS, TIMELINE_BLOCKS, INSIGHTS, minToTime, composite };
