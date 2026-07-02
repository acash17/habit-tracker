import { describe, it, expect } from 'vitest';
import { blocksToICS, icsFilename } from './calendar.js';
import { makeGoalFromSteps, seedBlocksFromGoal } from './goal-factory.js';

// The "add plan to calendar" path: voice/library steps → goal → seeded blocks → ICS.
describe('blocksToICS with seeded plan blocks', () => {
  const steps = [
    { label: 'Gym', est: 20, kind: 'body', why: 'Movement first.' },
    { label: 'Deep work', est: 50, kind: 'focus', why: 'Morning peak.' },
  ];
  const goal = makeGoalFromSteps('Voice plan', steps, { cadence: 'oneoff', colorIndex: 0 });
  const blocks = seedBlocksFromGoal(goal, []);
  const date = new Date(2026, 6, 2); // fixed day so DTSTART is deterministic

  it('emits one VEVENT per block with labels as summaries', () => {
    const ics = blocksToICS(blocks, date);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('SUMMARY:Gym');
    expect(ics).toContain('SUMMARY:Deep work');
  });

  it('schedules blocks back-to-back from 9am on an empty day', () => {
    const ics = blocksToICS(blocks, date);
    expect(ics).toContain('DTSTART:20260702T090000'); // Gym at 9:00
    expect(ics).toContain('DTSTART:20260702T092000'); // Deep work at 9:20
  });

  it('is a well-formed calendar wrapper', () => {
    const ics = blocksToICS(blocks, date);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
});

describe('icsFilename', () => {
  it('slugifies plan titles', () => {
    expect(icsFilename('My Day: Plan!')).toMatch(/\.ics$/);
  });
});
