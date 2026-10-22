import { describe, expect, it } from 'vitest';
import { getLidExplodeOffset } from './lidExplode';

describe('removable lid explode', () => {
  it('lifts vertically before translating, then holds the full clearance', () => {
    expect(getLidExplodeOffset(0, 4, 100)).toEqual({ lift: 0, slide: 0 });
    const midway = getLidExplodeOffset(15, 4, 100);
    expect(midway).toEqual({ lift: 2, slide: 0 });
    expect(getLidExplodeOffset(30, 4, 100)).toEqual({ lift: 4, slide: 0 });
    expect(getLidExplodeOffset(65, 4, 100)).toEqual({ lift: 4, slide: 50 });
    expect(getLidExplodeOffset(100, 4, 100)).toEqual({ lift: 4, slide: 100 });
  });
  it('keeps sliding lids on their guide plane', () => {
    expect(getLidExplodeOffset(25, 0, 100)).toEqual({ lift: 0, slide: 50 });
    expect(getLidExplodeOffset(100, 0, 100)).toEqual({ lift: 0, slide: 100 });
  });
  it('clamps out-of-range progress to assembled/open positions', () => {
    expect(getLidExplodeOffset(-10, 4, 100)).toEqual({ lift: 0, slide: 0 });
    expect(getLidExplodeOffset(120, 4, 100)).toEqual({ lift: 4, slide: 100 });
  });
});
