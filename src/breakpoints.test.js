import { describe, it, expect } from 'vitest';
import { goalBreakpoint, analyzeBreakpoints } from './breakpoints.js';

const g = (id, doneFlags) => ({
  id, title: id,
  sequence: doneFlags.map((d, i) => ({ id: `${id}${i}`, label: `Step ${i + 1}`, est: 10, done: d })),
});

describe('goalBreakpoint', () => {
  it('returns null for non-chains (0 or 1 step)', () => {
    expect(goalBreakpoint(g('a', []))).toBeNull();
    expect(goalBreakpoint(g('a', [false]))).toBeNull();
  });
  it('flags complete when all done', () => {
    expect(goalBreakpoint(g('a', [true, true, true])).status).toBe('complete');
  });
  it('flags notstarted when nothing done', () => {
    const r = goalBreakpoint(g('a', [false, false]));
    expect(r.status).toBe('notstarted');
    expect(r.stallIndex).toBe(0);
  });
  it('finds the stall index = first not-done after a run of done', () => {
    const r = goalBreakpoint(g('a', [true, true, false, false]));
    expect(r.status).toBe('stalled');
    expect(r.stallIndex).toBe(2);       // step 3
    expect(r.doneBefore).toBe(2);
    expect(r.stallStep).toBe('Step 3');
  });
});

describe('analyzeBreakpoints', () => {
  it('finds the most common stall position across goals', () => {
    const a = analyzeBreakpoints([
      g('x', [true, true, false]),   // stalls at step 3
      g('y', [true, true, false, false]), // stalls at step 3
      g('z', [true, false, false]),  // stalls at step 2
      g('done', [true, true]),       // complete
      g('solo', [false]),            // ignored (not a chain)
    ]);
    expect(a.stalledCount).toBe(3);
    expect(a.completedCount).toBe(1);
    expect(a.commonStep).toBe(3);     // two goals stall at step 3
    expect(a.commonCount).toBe(2);
    expect(a.hasSignal).toBe(true);
  });
  it('no signal when nothing is stalled', () => {
    const a = analyzeBreakpoints([g('done', [true, true]), g('solo', [false])]);
    expect(a.hasSignal).toBe(false);
  });
});
