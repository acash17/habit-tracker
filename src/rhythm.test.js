import { describe, test, expect } from 'vitest';
import { hourToBin, dowToRow, bucketsToMatrix, deriveRhythmStats } from './rhythm.js';

// Bins are 8 three-hour slots starting at 6am: 0=6-9a,1=9-12,2=12-3p,3=3-6p,
// 4=6-9p,5=9p-12a,6=12-3a,7=3-6a. Matches the prototype's BINS layout.
describe('hourToBin', () => {
  test.each([
    [6, 0], [8, 0], [9, 1], [12, 2], [15, 3], [18, 4], [21, 5], [0, 6], [3, 7], [5, 7],
  ])('hour %i → bin %i', (hour, bin) => {
    expect(hourToBin(hour)).toBe(bin);
  });
});

// Postgres extract(dow) is 0=Sunday..6=Saturday. The matrix is Mon..Sun (Mon=0).
describe('dowToRow', () => {
  test.each([
    [0, 6], [1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5],
  ])('pg dow %i → row %i', (dow, row) => {
    expect(dowToRow(dow)).toBe(row);
  });
});

describe('bucketsToMatrix', () => {
  test('returns a 7×8 zero matrix for no buckets', () => {
    const m = bucketsToMatrix([]);
    expect(m).toHaveLength(7);
    expect(m.every(row => row.length === 8 && row.every(v => v === 0))).toBe(true);
  });

  test('places a bucket at [dowToRow][hourToBin] with its total', () => {
    // Monday (dow 1) at 8am (bin 0), total 5.
    const m = bucketsToMatrix([{ dow: 1, hour: 8, total: 5 }]);
    expect(m[0][0]).toBe(5);
  });

  test('sums multiple buckets falling in the same cell', () => {
    const m = bucketsToMatrix([
      { dow: 1, hour: 6, total: 2 }, // Mon, bin 0
      { dow: 1, hour: 8, total: 3 }, // Mon, bin 0
    ]);
    expect(m[0][0]).toBe(5);
  });

  test('coerces string totals from the RPC to numbers', () => {
    const m = bucketsToMatrix([{ dow: 1, hour: 8, total: '4' }]);
    expect(m[0][0]).toBe(4);
  });

  test('merges precomputed cache rows with live delta rows on the same cell (hybrid read)', () => {
    // cache row carries an extra updated_at field — must be ignored, totals summed.
    const cache = [{ dow: 1, hour: 8, total: 5, updated_at: '2026-06-02T00:15:00Z' }];
    const delta = [{ dow: 1, hour: 8, total: 2 }];
    const m = bucketsToMatrix([...cache, ...delta]);
    expect(m[0][0]).toBe(7);
  });
});

describe('deriveRhythmStats', () => {
  function zero() { return Array.from({ length: 7 }, () => Array(8).fill(0)); }

  test('flags no data when the matrix is empty', () => {
    expect(deriveRhythmStats(zero()).hasData).toBe(false);
  });

  test('peakBin is the busiest waking bin, lazyBin the quietest', () => {
    const m = zero();
    // every waking bin (0..5) gets a distinct positive total
    [6, 10, 8, 1, 5, 4].forEach((v, b) => { m[0][b] = v; });
    const s = deriveRhythmStats(m);
    expect(s.hasData).toBe(true);
    expect(s.peakBin).toBe(1); // 10 is highest
    expect(s.lazyBin).toBe(3); // 1 is lowest
  });

  test('ignores night bins 6 and 7 when choosing peak/laziest', () => {
    const m = zero();
    m[0][6] = 99; // 12-3a — must never be the peak
    m[0][2] = 5;  // 12-3p waking peak
    const s = deriveRhythmStats(m);
    expect(s.peakBin).toBe(2);
    expect(s.lazyBin).toBeLessThan(6);
  });

  test('peakDay is the day row with the highest total', () => {
    const m = zero();
    m[3][0] = 4; // Thursday total 4
    m[5][0] = 7; // Saturday total 7 — peak day
    expect(deriveRhythmStats(m).peakDay).toBe(5);
  });
});
