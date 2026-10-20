import { describe, expect, it } from 'vitest';
import { packItems } from './binPacking';

describe('packing rotations', () => {
  it('returns the actual flipped dimensions and preserves item data', () => {
    const items = [{ data: 'wide', width: 80, depth: 30 }];
    expect(packItems(items, 40, 90, { allowRotation: false })).toBeNull();
    const result = packItems(items, 40, 90)!;
    expect(result.items[0]).toMatchObject({ data: 'wide', width: 30, depth: 80, rotated: true });
    expect([result.totalWidth, result.totalDepth]).toEqual([30, 80]);
    expect(items[0]).toEqual({ data: 'wide', width: 80, depth: 30 });
  });

  it('does not report square rectangles as rotated', () => {
    expect(packItems([{ data: 1, width: 30, depth: 30 }], 40, 40)!.items[0].rotated).toBe(false);
  });
});
