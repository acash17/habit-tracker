import { describe, it, expect } from 'vitest';
import { isName, isEmail, isPhone, normalizePhone } from './profile.js';

describe('profile validators', () => {
  it('isName accepts 1–60 char trimmed names, rejects empty', () => {
    expect(isName('Alex')).toBe(true);
    expect(isName('  Sharma  ')).toBe(true);
    expect(isName('')).toBe(false);
    expect(isName('   ')).toBe(false);
    expect(isName('a'.repeat(61))).toBe(false);
  });

  it('isEmail accepts valid, rejects malformed', () => {
    expect(isEmail('alex.sharma@gmail.com')).toBe(true);
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a @b.com')).toBe(false);
  });

  it('isPhone accepts 7–15 digits with optional + and separators', () => {
    expect(isPhone('+91 98765 43210')).toBe(true);
    expect(isPhone('9876543210')).toBe(true);
    expect(isPhone('+1 (415) 555-2671')).toBe(true);
    expect(isPhone('123')).toBe(false);          // too short
    expect(isPhone('+1234567890123456')).toBe(false); // too long (16)
    expect(isPhone('abcd')).toBe(false);
  });

  it('normalizePhone strips separators, keeps leading +', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('(415) 555-2671')).toBe('4155552671');
  });
});
