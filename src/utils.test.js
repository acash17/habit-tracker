import { describe, it, expect } from 'vitest';
import { moveItem } from './utils.js';

describe('moveItem', () => {
  const base = ['a', 'b', 'c', 'd'];
  it('moves an item down', () => expect(moveItem(base, 0, 2)).toEqual(['b', 'c', 'a', 'd']));
  it('moves an item up', () => expect(moveItem(base, 3, 1)).toEqual(['a', 'd', 'b', 'c']));
  it('no-op when from===to', () => expect(moveItem(base, 1, 1)).toEqual(base));
  it('clamps to into range', () => expect(moveItem(base, 0, 99)).toEqual(['b', 'c', 'd', 'a']));
  it('ignores out-of-range from', () => expect(moveItem(base, 9, 0)).toEqual(base));
  it('handles empty / nullish', () => { expect(moveItem([], 0, 1)).toEqual([]); expect(moveItem(null, 0, 1)).toEqual([]); });
  it('does not mutate the input', () => { const a = [...base]; moveItem(a, 0, 3); expect(a).toEqual(base); });
});
