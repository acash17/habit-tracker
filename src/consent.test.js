import { describe, test, expect } from 'vitest';
import { buildConsentRecord, isConsentValid } from './consent.js';

describe('buildConsentRecord', () => {
  test('captures the policy version and timestamp', () => {
    const rec = buildConsentRecord(2, '2026-06-02T10:00:00.000Z');
    expect(rec).toEqual({ policyVersion: 2, agreedAt: '2026-06-02T10:00:00.000Z' });
  });
});

describe('isConsentValid', () => {
  test('valid when the record matches the current policy version', () => {
    expect(isConsentValid({ policyVersion: 2, agreedAt: 'x' }, 2)).toBe(true);
  });

  test('invalid when the policy version has moved on', () => {
    expect(isConsentValid({ policyVersion: 1, agreedAt: 'x' }, 2)).toBe(false);
  });

  test('invalid when there is no record', () => {
    expect(isConsentValid(null, 2)).toBe(false);
    expect(isConsentValid(undefined, 2)).toBe(false);
  });

  test('invalid when the record has no policy version', () => {
    expect(isConsentValid({ agreedAt: 'x' }, 2)).toBe(false);
  });
});
