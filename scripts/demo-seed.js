// Seed data injected into localStorage before the app mounts.
// Uses goal ids g1/g2/g3 so habit-log.js auto-seeds rich heatmap history for them.
window.__SEED = (function () {
  const goals = [
    {
      id: 'g1', title: 'Morning movement', color: 'terracotta',
      cadence: 'daily', recurring: true, deadline: 'Every day',
      sequence: [
        { id: 'g1s1', label: 'Warm-up stretch', est: 5,  done: true,  active: false, kind: 'body',  why: 'Loosen up so the run feels easy, not a fight.' },
        { id: 'g1s2', label: 'Easy 2k jog',      est: 18, done: true,  active: false, kind: 'body',  why: 'Conversational pace builds the aerobic base.' },
        { id: 'g1s3', label: 'Cool-down walk',   est: 7,  done: true,  active: false, kind: 'body',  why: 'Brings the heart rate down gently.' },
      ],
    },
    {
      id: 'g3', title: 'Write every day', color: 'lavender',
      cadence: 'daily', recurring: true, deadline: 'Every day',
      sequence: [
        { id: 'g3s1', label: 'Open the doc',   est: 2,  done: true,  active: false, kind: 'focus', why: 'The hardest part is starting — make it two minutes.' },
        { id: 'g3s2', label: 'Freewrite',      est: 25, done: false, active: true,  kind: 'focus', why: 'No editing. Momentum first, polish later.' },
        { id: 'g3s3', label: 'Review & save',  est: 8,  done: false, active: false, kind: 'focus', why: 'A quick pass so tomorrow-you has a running start.' },
      ],
    },
    {
      id: 'g2', title: 'Wind down for sleep', color: 'sage',
      cadence: 'daily', recurring: true, deadline: 'Every day',
      sequence: [
        { id: 'g2s1', label: 'Screens off',    est: 5,  done: false, active: false, kind: 'rest',    why: 'Blue light late pushes your body clock later.' },
        { id: 'g2s2', label: 'Read a chapter', est: 20, done: false, active: false, kind: 'reading', why: 'A paper book signals the day is closing.' },
        { id: 'g2s3', label: 'Slow breathing', est: 5,  done: false, active: false, kind: 'rest',    why: 'Four-in, six-out drops the heart rate for sleep.' },
      ],
    },
    {
      id: 'g_week1', title: 'Reset the apartment', color: 'terracotta',
      cadence: 'weekly', recurring: true, deadline: 'Every week',
      sequence: [
        { id: 'w1', label: 'Kitchen surfaces', est: 15, done: false, active: false, kind: 'self', why: '' },
        { id: 'w2', label: 'Floors',           est: 20, done: false, active: false, kind: 'self', why: '' },
        { id: 'w3', label: 'Laundry on',       est: 10, done: false, active: false, kind: 'self', why: '' },
      ],
    },
    {
      id: 'g_proj1', title: 'Launch portfolio site', color: 'lavender',
      cadence: 'oneoff', recurring: false, deadline: 'This month',
      sequence: [
        { id: 'p1', label: 'Pick a template',   est: 30, done: true,  active: false, kind: 'focus', why: '' },
        { id: 'p2', label: 'Write the about page', est: 40, done: false, active: true, kind: 'focus', why: '' },
        { id: 'p3', label: 'Add three projects', est: 60, done: false, active: false, kind: 'focus', why: '' },
        { id: 'p4', label: 'Buy the domain',    est: 15, done: false, active: false, kind: 'self',  why: '' },
      ],
    },
  ];

  const S = (urgency, importance, energyMatch, success, effort) => ({ urgency, importance, energyMatch, success, effort });
  const blocks = [
    { id: 'g1-0', startMin: 480, dur: 5,  label: 'Warm-up stretch', kind: 'body',  done: true,  active: false, goal: 'g1', stepId: 'g1s1', scores: S(0.4, 0.6, 0.8, 0.9, 0.3), optional: false, deps: [] },
    { id: 'g1-1', startMin: 485, dur: 18, label: 'Easy 2k jog',     kind: 'body',  done: true,  active: false, goal: 'g1', stepId: 'g1s2', scores: S(0.5, 0.7, 0.85, 0.8, 0.5), optional: false, deps: [] },
    { id: 'g1-2', startMin: 503, dur: 7,  label: 'Cool-down walk',  kind: 'body',  done: true,  active: false, goal: 'g1', stepId: 'g1s3', scores: S(0.3, 0.5, 0.7, 0.9, 0.2), optional: false, deps: [] },
    { id: 'g3-0', startMin: 540, dur: 2,  label: 'Open the doc',    kind: 'focus', done: true,  active: false, goal: 'g3', stepId: 'g3s1', scores: S(0.6, 0.8, 0.7, 0.9, 0.2), optional: false, deps: [] },
    { id: 'g3-1', startMin: 542, dur: 25, label: 'Freewrite',       kind: 'focus', done: false, active: true,  goal: 'g3', stepId: 'g3s2', scores: S(0.7, 0.9, 0.75, 0.7, 0.6), optional: false, deps: [] },
    { id: 'g3-2', startMin: 567, dur: 8,  label: 'Review & save',   kind: 'focus', done: false, active: false, goal: 'g3', stepId: 'g3s3', scores: S(0.5, 0.7, 0.7, 0.8, 0.4), optional: false, deps: [] },
    { id: 'g2-0', startMin: 1290, dur: 5,  label: 'Screens off',    kind: 'rest',    done: false, active: false, goal: 'g2', stepId: 'g2s1', scores: S(0.4, 0.7, 0.6, 0.8, 0.2), optional: false, deps: [] },
    { id: 'g2-1', startMin: 1295, dur: 20, label: 'Read a chapter', kind: 'reading', done: false, active: false, goal: 'g2', stepId: 'g2s2', scores: S(0.3, 0.6, 0.65, 0.8, 0.3), optional: false, deps: [] },
    { id: 'g2-2', startMin: 1315, dur: 5,  label: 'Slow breathing', kind: 'rest',    done: false, active: false, goal: 'g2', stepId: 'g2s3', scores: S(0.3, 0.6, 0.7, 0.9, 0.2), optional: false, deps: [] },
  ];

  return { goals, blocks };
})();
