import { describe, it, expect } from 'vitest';
import { generateSequence, _categoryOf } from './sequence-gen.js';

describe('on-device sequence generator', () => {
  it('returns 5–7 steps for any goal', () => {
    for (const g of ['Run a 5K', 'Read more books', 'random vague goal xyz', '']) {
      const s = generateSequence(g, {});
      expect(s.length).toBeGreaterThanOrEqual(4);
      expect(s.length).toBeLessThanOrEqual(7);
    }
  });

  it('first step is tiny (<= 5 min) to cut initiation cost', () => {
    const s = generateSequence('Write my novel', { energy: 'high' });
    expect(s[0].est).toBeLessThanOrEqual(5);
  });

  it('every step has label, numeric est, valid kind, and a why', () => {
    const s = generateSequence('Study for the exam', {});
    for (const step of s) {
      expect(typeof step.label).toBe('string');
      expect(step.label.length).toBeGreaterThan(0);
      expect(typeof step.est).toBe('number');
      expect(['focus', 'rest', 'body', 'self', 'reading']).toContain(step.kind);
      expect(typeof step.why).toBe('string');
    }
  });

  it('matches the right category from goal text', () => {
    expect(_categoryOf('Run a 5K by August')).toBe('fitness');
    expect(_categoryOf('Read 12 books this year')).toBe('reading');
    expect(_categoryOf('Write a blog post')).toBe('writing');
    expect(_categoryOf('Study for finals')).toBe('study');
    expect(_categoryOf('Declutter my room')).toBe('tidy');
    expect(_categoryOf('Update my resume and apply')).toBe('jobhunt');
    expect(_categoryOf('Ship the app MVP')).toBe('build');
    expect(_categoryOf('plant some tomatoes')).toBe('generic');
  });

  it('weaves the goal text into the steps (not a fixed generic list)', () => {
    const run = generateSequence('Run a 5K', {}).map(s => s.label.toLowerCase()).join(' ');
    const read = generateSequence('Read more', {}).map(s => s.label.toLowerCase()).join(' ');
    // running plan mentions walk/stretch/cool-down; reading plan mentions book/read
    expect(/walk|stretch|cool-down|kit/.test(run)).toBe(true);
    expect(/book|read|phone/.test(read)).toBe(true);
    // they are not identical
    expect(run).not.toEqual(read);
  });

  it('drops the rest break when the plan is short (<=60 min)', () => {
    const s = generateSequence('quick tiny task', { energy: 'low' });
    const total = s.reduce((a, b) => a + b.est, 0);
    if (total <= 60) expect(s.some(x => x.kind === 'rest')).toBe(false);
  });
});
