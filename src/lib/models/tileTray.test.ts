import { describe, expect, it } from 'vitest';
import { measurements } from '@jscad/modeling';

import { createTileTray, defaultTileTrayParams, getTileTrayDimensions, getTileTrayPreviewPositions } from './tileTray';
import type { CounterShape } from '$lib/types/project';

const { measureBoundingBox } = measurements;

const counterShapes: CounterShape[] = [
  {
    id: 'tile-square',
    name: 'Tile Square',
    category: 'tile',
    baseShape: 'square',
    width: 30,
    length: 30,
    thickness: 2
  },
  {
    id: 'tile-rectangle',
    name: 'Tile Rectangle',
    category: 'tile',
    baseShape: 'rectangle',
    width: 28,
    length: 40,
    thickness: 2.5
  },
  {
    id: 'tile-hex',
    name: 'Tile Hex',
    category: 'tile',
    baseShape: 'hex',
    width: 30,
    length: 30,
    thickness: 2,
    pointyTop: false
  }
];

describe('tile tray geometry', () => {
  it('uses a rectangular footprint sized to the vertical stack', () => {
    const dims = getTileTrayDimensions(
      {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-rectangle',
        orientation: 'vertical',
        count: 12
      },
      counterShapes
    );

    expect(dims.width).toBeGreaterThan(dims.depth);
    expect(dims.width).toBeCloseTo(46, 5);
    expect(dims.depth).toBeCloseTo(36, 5);
    expect(dims.height).toBeCloseTo(32, 5);
  });

  it('uses a rectangular footprint sized to the horizontal stack', () => {
    const dims = getTileTrayDimensions(
      {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-rectangle',
        orientation: 'horizontal',
        count: 12
      },
      counterShapes
    );

    expect(dims.width).toBeGreaterThan(dims.depth);
    expect(dims.width).toBeCloseTo(46, 5);
    expect(dims.depth).toBeCloseTo(34, 5);
    expect(dims.height).toBeGreaterThan(20);
  });

  it('returns edge-loaded preview data for vertical trays', () => {
    const [preview] = getTileTrayPreviewPositions(
      {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-rectangle',
        orientation: 'vertical',
        count: 8
      },
      counterShapes
    );

    expect(preview.orientation).toBe('vertical');
    expect(preview.slotDepth).toBeGreaterThan(8 * 2.5);
    expect(preview.standingHeight).toBe(28);
  });

  it('preserves effective hex dimensions in vertical previews', () => {
    const [preview] = getTileTrayPreviewPositions(
      {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-hex',
        orientation: 'vertical',
        count: 8
      },
      counterShapes
    );

    expect(preview.width).toBeCloseTo(30 / Math.cos(Math.PI / 6), 5);
    expect(preview.length).toBeCloseTo(30, 5);
    expect(preview.standingHeight).toBeCloseTo(30, 5);
  });

  it('preserves effective shape dimensions in horizontal previews', () => {
    const [preview] = getTileTrayPreviewPositions(
      {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-rectangle',
        orientation: 'horizontal',
        count: 8
      },
      counterShapes
    );

    expect(preview.width).toBe(28);
    expect(preview.length).toBe(40);
    expect(preview.count).toBe(8);
  });

  it('raises the preview floor when auto-height increases tray height', () => {
    const params = {
      ...defaultTileTrayParams,
      tileShapeId: 'tile-rectangle',
      orientation: 'horizontal' as const,
      count: 8,
      floorThickness: 2,
      rimHeight: 0
    };

    const naturalDims = getTileTrayDimensions(params, counterShapes);
    const [preview] = getTileTrayPreviewPositions(params, counterShapes, naturalDims.height + 10, 0);

    expect(preview.z).toBeCloseTo(12, 5);
  });

  it('builds geometry without throwing', () => {
    expect(() =>
      createTileTray(
        {
          ...defaultTileTrayParams,
          tileShapeId: 'tile-rectangle',
          orientation: 'horizontal',
          count: 10
        },
        counterShapes,
        'Tile Tray'
      )
    ).not.toThrow();
  });

  it('matches geometry bounds to calculated dimensions for horizontal trays', () => {
    const params = {
      ...defaultTileTrayParams,
      tileShapeId: 'tile-rectangle',
      orientation: 'horizontal' as const,
      count: 20,
      clearance: 1,
      wallThickness: 2,
      floorThickness: 2,
      rimHeight: 0
    };

    const dims = getTileTrayDimensions(params, counterShapes);
    const geom = createTileTray(params, counterShapes, 'Tile Tray');
    const bounds = measureBoundingBox(geom);
    const width = bounds[1][0] - bounds[0][0];
    const depth = bounds[1][1] - bounds[0][1];
    const height = bounds[1][2] - bounds[0][2];

    expect(width).toBeCloseTo(dims.width, 5);
    expect(depth).toBeCloseTo(dims.depth, 5);
    expect(height).toBeCloseTo(dims.height, 5);
  });
});
