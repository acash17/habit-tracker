// On-device sequence generator — turns a goal into 5–7 tiny, ordered micro-steps.
// 100% local: no network, no AI service, no API key. Deterministic and testable.
//
// Strategy:
//   1. Match the goal text to a category (running, reading, writing, study, …) and
//      use a tailored template that weaves the goal in.
//   2. Otherwise build a smart generic scaffold from the goal's own words.
// Always: first step is tiny (<=5 min) to cut initiation cost; a movement/rest
// break is inserted when the plan runs long; rationales are short and shame-free.

const KINDS = { focus: 'focus', rest: 'rest', body: 'body', self: 'self', reading: 'reading' };

// energy → size of the main focus blocks (minutes)
function block(energy) {
  if (energy === 'low') return 15;
  if (energy === 'high') return 35;
  return 25; // medium / unknown
}

const CATEGORIES = [
  {
    id: 'fitness',
    test: /\b(run|running|jog|jogging|5k|10k|marathon|gym|workout|work out|exercise|fitness|lift|weights|yoga|walk|steps|cardio|train|training)\b/i,
    build: (goal, e) => [
      { label: 'Lay out your kit + shoes', est: 3, kind: 'self', why: 'Tiny first move removes friction.' },
      { label: 'Warm-up: 5-min easy walk', est: 5, kind: 'body', why: 'Ease in — no pressure to start hard.' },
      { label: `Main set toward "${short(goal)}"`, est: Math.max(15, block(e)), kind: 'body', why: 'The real work, while energy is fresh.' },
      { label: 'Walk + water break', est: 5, kind: 'rest', why: 'Lets your body recover mid-session.' },
      { label: 'Cool-down stretch', est: 8, kind: 'body', why: 'Protects tomorrow’s session.' },
      { label: 'Note how it felt', est: 2, kind: 'self', why: 'Track effort, not perfection.' },
    ],
  },
  {
    id: 'reading',
    test: /\b(read|reading|book|books|chapter|pages|novel|article|study material)\b/i,
    build: (goal, e) => [
      { label: 'Put your phone in another room', est: 2, kind: 'self', why: 'Removes the biggest distraction first.' },
      { label: 'Open the book + bookmark', est: 3, kind: 'self', why: 'Lower the barrier to starting.' },
      { label: `Read toward "${short(goal)}"`, est: Math.max(15, block(e)), kind: 'reading', why: 'One focused block beats a vague hour.' },
      { label: 'Stretch + water', est: 5, kind: 'rest', why: 'Keeps focus fresh for round two.' },
      { label: 'Read a second short block', est: Math.max(10, block(e) - 10), kind: 'reading', why: 'Momentum while you’re warmed up.' },
      { label: 'Jot one line you want to remember', est: 3, kind: 'self', why: 'Anchors what you read.' },
    ],
  },
  {
    id: 'writing',
    test: /\b(write|writing|blog|essay|article|novel|journal|draft|copy|content|post|newsletter|thesis|report)\b/i,
    build: (goal, e) => [
      { label: `Open a blank doc titled "${short(goal)}"`, est: 2, kind: 'self', why: 'A named doc makes it real.' },
      { label: 'Brain-dump bullets — no editing', est: 10, kind: 'focus', why: 'Get raw material down first.' },
      { label: 'Draft the hardest section', est: block(e), kind: 'focus', why: 'Tackle it while energy is high.' },
      { label: 'Stand up + water', est: 5, kind: 'rest', why: 'Protects focus for the next block.' },
      { label: 'Draft one more section', est: Math.max(15, block(e) - 5), kind: 'focus', why: 'Build on the momentum.' },
      { label: 'Save + note tomorrow’s first line', est: 3, kind: 'self', why: 'Makes restarting effortless.' },
    ],
  },
  {
    id: 'study',
    test: /\b(study|studying|exam|test|revise|revision|learn|course|lecture|practice|homework|assignment|memoriz|memoris)\b/i,
    build: (goal, e) => [
      { label: 'Clear your desk + water nearby', est: 3, kind: 'self', why: 'A clear space lowers resistance.' },
      { label: `List the topics for "${short(goal)}"`, est: 7, kind: 'focus', why: 'Visible scope cuts overwhelm.' },
      { label: 'Focused study block (hardest topic)', est: block(e), kind: 'focus', why: 'Hard things first, while fresh.' },
      { label: 'Move + water break', est: 5, kind: 'rest', why: 'Spaced breaks aid memory.' },
      { label: 'Active recall: test yourself', est: Math.max(12, block(e) - 10), kind: 'focus', why: 'Recall beats re-reading.' },
      { label: 'Mark what to revisit next time', est: 3, kind: 'self', why: 'Future-you starts faster.' },
    ],
  },
  {
    id: 'tidy',
    test: /\b(clean|cleaning|declutter|tidy|organi[sz]e|organi[sz]ing|laundry|dishes|room|desk|wardrobe|closet|chores)\b/i,
    build: (goal, e) => [
      { label: 'Set a 5-minute timer to start', est: 5, kind: 'self', why: 'Starting tiny beats not starting.' },
      { label: 'Clear all surfaces first', est: 15, kind: 'body', why: 'Fast visible progress builds momentum.' },
      { label: `Sort one zone for "${short(goal)}"`, est: 20, kind: 'body', why: 'One area at a time avoids overwhelm.' },
      { label: 'Water + reset', est: 5, kind: 'rest', why: 'A breather keeps it sustainable.' },
      { label: 'Bag anything to toss or donate', est: 10, kind: 'body', why: 'Less stuff, less future mess.' },
      { label: 'Take a before/after look', est: 2, kind: 'self', why: 'Notice the win.' },
    ],
  },
  {
    id: 'jobhunt',
    test: /\b(job|career|resume|cv|cover letter|interview|portfolio|apply|application|linkedin|recruiter)\b/i,
    build: (goal, e) => [
      { label: 'Open your resume + a job tab', est: 3, kind: 'self', why: 'Set the stage to begin.' },
      { label: `List 3 next actions for "${short(goal)}"`, est: 8, kind: 'focus', why: 'Turns a vague goal into moves.' },
      { label: 'Tailor your resume to one role', est: block(e), kind: 'focus', why: 'Quality over spray-and-pray.' },
      { label: 'Stretch + water', est: 5, kind: 'rest', why: 'Reset before the next push.' },
      { label: 'Submit one application', est: 20, kind: 'focus', why: 'A concrete, finished step.' },
      { label: 'Note who/what for follow-up', est: 3, kind: 'self', why: 'Keeps the pipeline moving.' },
    ],
  },
  {
    id: 'mindfulness',
    test: /\b(meditat|mindful|breathe|breathing|calm|stress|anxiety|relax|gratitude)\b/i,
    build: (goal, e) => [
      { label: 'Find a quiet spot to sit', est: 2, kind: 'self', why: 'Lower the bar to begin.' },
      { label: 'Three slow breaths to settle', est: 3, kind: 'rest', why: 'Signals your body it’s time.' },
      { label: `Guided session for "${short(goal)}"`, est: 12, kind: 'rest', why: 'The core practice.' },
      { label: 'Sit quietly for a minute after', est: 3, kind: 'rest', why: 'Lets the calm land.' },
      { label: 'Note one thing you noticed', est: 2, kind: 'self', why: 'Builds the habit gently.' },
    ],
  },
  {
    id: 'build',
    test: /\b(code|coding|build|ship|launch|app|website|web ?site|deploy|feature|bug|side project|startup|mvp|prototype)\b/i,
    build: (goal, e) => [
      { label: 'Open the project + a fresh branch', est: 3, kind: 'self', why: 'Frictionless first step.' },
      { label: `Write the next 3 tasks for "${short(goal)}"`, est: 8, kind: 'focus', why: 'Scope it before you dive in.' },
      { label: 'Build the hardest piece first', est: block(e), kind: 'focus', why: 'Highest-risk part while fresh.' },
      { label: 'Stand up + water', est: 5, kind: 'rest', why: 'Protects focus for round two.' },
      { label: 'Wire one concrete win end-to-end', est: Math.max(20, block(e)), kind: 'focus', why: 'Something that actually works.' },
      { label: 'Commit + note tomorrow’s start', est: 5, kind: 'self', why: 'Ship, then iterate.' },
    ],
  },
];

// Trim a goal to a short phrase for embedding in step labels.
function short(goal) {
  const g = (goal || '').trim().replace(/\s+/g, ' ');
  return g.length > 32 ? g.slice(0, 31).trimEnd() + '…' : g;
}

// Generic scaffold for goals that don't match a category.
function genericScaffold(goal, e) {
  const g = short(goal) || 'your goal';
  const steps = [
    { label: `Write what "done" looks like for "${g}"`, est: 3, kind: 'self', why: 'A clear target is a tiny first step.' },
    { label: 'List the 3 smallest next actions', est: 8, kind: 'focus', why: 'Visible scope cuts overwhelm.' },
    { label: 'Do the first action now', est: block(e), kind: 'focus', why: 'Start while energy is fresh.' },
    { label: 'Stand up + water', est: 5, kind: 'rest', why: 'Protects focus for the next block.' },
    { label: 'Do the second action', est: Math.max(15, block(e) - 5), kind: 'focus', why: 'Momentum while you’re warmed up.' },
    { label: 'Note where you stopped', est: 3, kind: 'self', why: 'Makes restarting effortless.' },
  ];
  return steps;
}

// Enforce the invariants: 5–7 steps, tiny first step, drop the rest break if the
// plan is short, clamp estimates to sane bounds.
function normalize(steps) {
  let out = steps.map(s => ({
    label: s.label,
    est: Math.max(1, Math.min(120, Math.round(s.est || 10))),
    kind: KINDS[s.kind] ? s.kind : 'focus',
    why: s.why || '',
  }));
  if (out.length && out[0].est > 5) out[0].est = 5; // first step must be tiny
  const total = out.reduce((s, x) => s + x.est, 0);
  if (total <= 60) out = out.filter(s => s.kind !== 'rest'); // no break needed when short
  if (out.length > 7) out = out.slice(0, 7);
  return out;
}

/**
 * generateSequence(goal, { hours, energy, deadline }) -> [{label, est, kind, why}]
 * Pure + deterministic. Safe for any input.
 */
export function generateSequence(goal, ctx = {}) {
  const energy = (ctx.energy || 'medium').toString().toLowerCase();
  const text = (goal || '').toString();
  const cat = CATEGORIES.find(c => c.test.test(text));
  const steps = cat ? cat.build(text, energy) : genericScaffold(text, energy);
  return normalize(steps);
}

// Exposed for tests / inspection.
export const _categoryOf = (goal) => (CATEGORIES.find(c => c.test.test((goal || '').toString()))?.id) || 'generic';
