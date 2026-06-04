import { describe, test, expect } from 'vitest';
import { buildConsentRecord, isConsentValid, consentCloudRow } from './consent.js';

describe('buildConsentRecord', () => {
  test('captures the policy version and timestamp', () => {
    const rec = buildConsentRecord(2, '2026-06-02T10:00:00.000Z');
    expect(rec).toEqual({ policyVersion: 2, agreedAt: '2026-06-02T10:00:00.000Z', items: [] });
  });

  test('records which consent items were agreed to', () => {
    const rec = buildConsentRecord(2, '2026-06-02T10:00:00.000Z', ['privacy_tos', 'age_18_or_guardian']);
    expect(rec.items).toEqual(['privacy_tos', 'age_18_or_guardian']);
  });
});

describe('consentCloudRow', () => {
  test('maps a local record to an upsertable consents row', () => {
    const rec = { policyVersion: 1, agreedAt: '2026-06-02T10:00:00.000Z', items: ['privacy_tos', 'age_18_or_guardian'] };
    expect(consentCloudRow('u1', rec)).toEqual({
      user_id: 'u1',
      policy_version: 1,
      agreed_at: '2026-06-02T10:00:00.000Z',
      items: ['privacy_tos', 'age_18_or_guardian'],
    });
  });

  test('defaults items to an empty array when absent', () => {
    const rec = { policyVersion: 1, agreedAt: 'x' };
    expect(consentCloudRow('u1', rec).items).toEqual([]);
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
