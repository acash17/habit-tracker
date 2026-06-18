// "Where your sequences stall" — chain break-point analysis.
//
// Most habit apps mark a whole routine done/not-done. Pacely tracks each step,
// so we can show WHERE a chain breaks down: the first not-yet-done step after a
// run of completed ones. Aggregated across goals, it reveals the position people
// repeatedly stall at — which is usually a step that just needs to be smaller.
//
// Pure functions over the existing goal `sequence` data (each sub-habit has a
// `done` flag). No schema change, works offline. A future richer version could
// use per-step time-series from habit_logs; this uses current per-step state.

// For one goal: how far the chain gets before it stalls.
//   - returns null for non-chains (0–1 steps)
//   - status 'complete'    → every step done
//   - status 'notstarted'  → no step done (stalls at step 1)
//   - status 'stalled'     → some leading steps done, then a not-done step
export function goalBreakpoint(goal) {
  const seq = Array.isArray(goal?.sequence) ? goal.sequence : [];
  if (seq.length < 2) return null; // not a chain — nothing to "break"

  let i = 0;
  while (i < seq.length && seq[i].done) i++;

  if (i === seq.length) {
    return { goalId: goal.id, title: goal.title, total: seq.length, status: 'complete' };
  }
  return {
    goalId: goal.id,
    title: goal.title,
    total: seq.length,
    status: i === 0 ? 'notstarted' : 'stalled',
    stallIndex: i,                                   // 0-based
    stallStep: (seq[i].label || `Step ${i + 1}`).trim() || `Step ${i + 1}`,
    stallEst: seq[i].est || 0,
    doneBefore: i,
  };
}

// Aggregate across all goals.
export function analyzeBreakpoints(goals) {
  const perGoal = (goals || []).map(goalBreakpoint).filter(Boolean);
  const stalled = perGoal.filter(g => g.status === 'stalled');

  const byStep = {};                                 // 1-based step position → count
  for (const g of stalled) {
    const k = g.stallIndex + 1;
    byStep[k] = (byStep[k] || 0) + 1;
  }

  let commonStep = null, commonCount = 0;
  for (const [k, v] of Object.entries(byStep)) {
    if (v > commonCount) { commonCount = v; commonStep = Number(k); }
  }

  return {
    perGoal,
    stalled,
    byStep,
    commonStep,                                       // null if no repeated position
    commonCount,
    stalledCount: stalled.length,
    completedCount: perGoal.filter(g => g.status === 'complete').length,
    hasSignal: stalled.length > 0,
  };
}
