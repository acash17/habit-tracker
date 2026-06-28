import { describe, test, expect } from 'vitest';
import { dailyReminderBody } from './daily-reminder-body.js';

describe('dailyReminderBody', () => {
  test('empty day → invites planning', () => {
    expect(dailyReminderBody([])).toBe('A clean slate — open Pacely and plan your day. 🌱');
  });

  test('all done → celebrates', () => {
    expect(dailyReminderBody([{ label: 'A', done: true }, { label: 'B', done: true }]))
      .toBe('All done today — nice work. 🌿');
  });

  test('one left → names it with a count', () => {
    expect(dailyReminderBody([{ label: 'Submit application', done: false }]))
      .toBe('1 left today: Submit application');
  });

  test('two left → both, no ellipsis', () => {
    expect(dailyReminderBody([
      { label: 'Submit application', done: false },
      { label: 'Stretch', done: false },
    ])).toBe('2 left today: Submit application, Stretch');
  });

  test('three+ left → first two then an ellipsis, count reflects all undone', () => {
    expect(dailyReminderBody([
      { label: 'Submit application', done: false },
      { label: 'Stretch', done: false },
      { label: 'Email triage', done: false },
      { label: 'Already', done: true },
    ])).toBe('3 left today: Submit application, Stretch …');
  });

  test('long labels are clipped to keep the notification tidy', () => {
    const out = dailyReminderBody([{ label: 'A really very long sub-habit label that overflows', done: false }]);
    expect(out).toBe('1 left today: A really very long sub-…');
  });
});
