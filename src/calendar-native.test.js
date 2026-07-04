import { describe, it, expect } from 'vitest';
import { blocksToCalendarEvents } from './calendar-native.js';

describe('blocksToCalendarEvents', () => {
  const date = new Date(2026, 6, 4); // fixed local day
  it('maps a block to start/end epoch-ms with a reminder offset', () => {
    const [e] = blocksToCalendarEvents([{ label: 'Gym', startMin: 9 * 60, dur: 60 }], date);
    const start = new Date(e.startDate);
    expect(e.title).toBe('Gym');
    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
    expect(e.endDate - e.startDate).toBe(60 * 60000);
    expect(e.alertOffsetInMinutes).toBe(5);
  });
  it('defaults label and duration, omits empty notes', () => {
    const [e] = blocksToCalendarEvents([{ startMin: 0 }], date);
    expect(e.title).toBe('Pacely task');
    expect(e.endDate - e.startDate).toBe(30 * 60000);
    expect('notes' in e).toBe(false);
  });
  it('includes notes from goalTitle + why when present', () => {
    const [e] = blocksToCalendarEvents([{ label: 'x', startMin: 60, dur: 10, goalTitle: 'Get fit', why: 'warm up' }], date);
    expect(e.notes).toBe('Get fit — warm up');
  });
  it('handles empty/nullish input', () => {
    expect(blocksToCalendarEvents([])).toEqual([]);
    expect(blocksToCalendarEvents(null)).toEqual([]);
  });
});
