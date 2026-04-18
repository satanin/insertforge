import { describe, expect, it } from 'vitest';

import jscad from '@jscad/modeling';

import { analyzeGeom3Topology, repairGeom3PlanarHoles } from './geom3Topology';

const { geom3 } = jscad.geometries;

describe('geom3 topology repair', () => {
  it('detects and repairs planar holes in a geometry', () => {
    const openBox = geom3.fromPoints([
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0]
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ],
      [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 1]
      ],
      [
        [0, 0, 0],
        [1, 0, 1],
        [1, 0, 0]
      ],
      [
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 1]
      ],
      [
        [1, 0, 0],
        [1, 1, 1],
        [1, 1, 0]
      ],
      [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1]
      ],
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 1, 0]
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1]
      ],
      [
        [0, 1, 0],
        [0, 0, 1],
        [0, 0, 0]
      ]
    ]);

    expect(analyzeGeom3Topology(openBox)).toEqual({
      nakedEdges: 4,
      nonManifoldEdges: 0
    });

    const repaired = repairGeom3PlanarHoles(openBox);

    expect(analyzeGeom3Topology(repaired)).toEqual({
      nakedEdges: 0,
      nonManifoldEdges: 0
    });
  });
});
