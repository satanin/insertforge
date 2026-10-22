import jscad from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import { createCardDividerTray, defaultCardDividerTrayParams } from './cardDividerTray';
import { createCardDrawTray, defaultCardDrawTrayParams } from './cardTray';
import { createCounterTray, defaultParams } from './counterTray';
import { createCupTray, defaultCupTrayParams } from './cupTray';
import { createOuterBody, getOuterCornerRadius } from './outerCorners';
import { createTileTray, defaultTileTrayParams } from './tileTray';

const { measureBoundingBox, measureVolume } = jscad.measurements;
const cards = [{ id: 'card-standard', name: 'Cards', width: 63, length: 88, thickness: 0.3 }];
const shapes = [
  { id: 'shape-square', name: 'Tokens', baseShape: 'square' as const, width: 20, length: 20, thickness: 2 }
];

describe('exterior corner finish', () => {
  it('limits the radius to the wall band and handles old or invalid values', () => {
    for (const value of [undefined, 0, -1, NaN, Infinity]) {
      expect(getOuterCornerRadius(value, 60, 40, 2)).toBe(0);
    }
    expect(getOuterCornerRadius(30, 60, 40, 2)).toBe(2);
    expect(getOuterCornerRadius(3, 60, 40, 4)).toBe(3);
    expect(getOuterCornerRadius(3, 2, 40, 4)).toBeCloseTo(0.999);
  });

  it('preserves flat faces, dimensions and the complete interior rectangle', () => {
    const body = createOuterBody(60, 40, 15, 3, 2);
    expect(measureBoundingBox(body)).toEqual([
      [0, 0, 0],
      [60, 40, 15]
    ]);
    const interior = jscad.primitives.cuboid({ size: [56, 36, 15], center: [30, 20, 7.5] });
    expect(measureVolume(jscad.booleans.subtract(interior, body))).toBeCloseTo(0, 6);
  });

  const cases = [
    {
      name: 'Counter / Player Board',
      defaults: defaultParams,
      build: (r: number | undefined) =>
        createCounterTray(
          { ...defaultParams, outerCornerRadius: r, topLoadedStacks: [['shape-square', 5]], edgeLoadedStacks: [] },
          shapes,
          '',
          undefined,
          undefined,
          false
        )
    },
    {
      name: 'Cup',
      defaults: defaultCupTrayParams,
      build: (r: number | undefined) =>
        createCupTray({ ...defaultCupTrayParams, outerCornerRadius: r }, '', undefined, undefined, false)
    },
    {
      name: 'Card Draw',
      defaults: defaultCardDrawTrayParams,
      build: (r: number | undefined) =>
        createCardDrawTray(
          { ...defaultCardDrawTrayParams, outerCornerRadius: r },
          cards,
          '',
          undefined,
          undefined,
          false
        )
    },
    {
      name: 'Card Divider',
      defaults: defaultCardDividerTrayParams,
      build: (r: number | undefined) =>
        createCardDividerTray(
          { ...defaultCardDividerTrayParams, outerCornerRadius: r },
          cards,
          '',
          undefined,
          undefined,
          false,
          false
        )
    },
    {
      name: 'Tile',
      defaults: defaultTileTrayParams,
      build: (r: number | undefined) =>
        createTileTray({ ...defaultTileTrayParams, outerCornerRadius: r }, shapes, '', undefined, undefined, false)
    }
  ];

  for (const entry of cases) {
    it(`${entry.name}: defaults to 3 mm, preserves saved square geometry and rounds within the original body`, () => {
      expect(entry.defaults.outerCornerRadius).toBe(3);
      const square = entry.build(0);
      const legacy = entry.build(undefined);
      const rounded = entry.build(3);
      expect(measureVolume(legacy)).toBeCloseTo(measureVolume(square), 6);
      const bounds = measureBoundingBox(square).flat();
      measureBoundingBox(rounded)
        .flat()
        .forEach((coordinate, index) => expect(coordinate).toBeCloseTo(bounds[index], 5));
      expect(measureVolume(rounded)).toBeLessThan(measureVolume(square));
      expect(measureVolume(jscad.booleans.subtract(rounded, square))).toBeCloseTo(0, 5);
    });
  }
});
