// @vitest-environment node
import { describe, expect, it } from 'vitest';
import jscad from '@jscad/modeling';
import { createShelfFrame, resolveShelfFrame } from './shelfFrame';
import { createShelfDrawerParts, defaultShelfDrawerParams } from './shelfStorage';
import { buildShelfModuleExport } from '$lib/utils/exportShelfModule';
const cards = [{ id: 'standard', name: 'Standard', width: 63, length: 88, thickness: 0.3 }];
const parts = createShelfDrawerParts(defaultShelfDrawerParams, cards);
const p = { columns: 2, rows: 2, pitchWidth: parts.resolved.bodyWidth, pitchHeight: parts.resolved.bodyHeight, depth: parts.resolved.depth, wall: 8 };
const volume = (g: ReturnType<typeof createShelfFrame>) => Math.abs(jscad.measurements.measureVolume(g));
describe('open modular frame', () => {
  it('matches every neighbouring drawer cell on all four sides', () => {
    const frame = createShelfFrame(p), r = resolveShelfFrame(p);
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 2; i++) {
      positions.push([i * p.pitchWidth, 0, -p.pitchHeight], [i * p.pitchWidth, 0, r.bodyHeight],
        [-p.pitchWidth, 0, i * p.pitchHeight], [r.bodyWidth, 0, i * p.pitchHeight]);
    }
    for (const pos of positions) expect(volume(jscad.booleans.intersect(frame,
      jscad.transforms.translate(pos, parts.shell)))).toBeLessThan(1e-5);
    // The centre is open through the full depth.
    const hole = jscad.primitives.cuboid({ size: [r.openingWidth - 0.2, p.depth + 2, r.openingHeight - 0.2],
      center: [r.bodyWidth / 2, p.depth / 2, r.bodyHeight / 2] });
    expect(volume(jscad.booleans.intersect(frame, hole))).toBeLessThan(1e-5);
  });
  it('prints as one connected frame at Z=0 without changing volume', () => {
    const geom = createShelfFrame(p, true), bounds = jscad.measurements.measureBoundingBox(geom);
    expect(bounds[0][2]).toBeCloseTo(0);
    expect(bounds[1][2]).toBeCloseTo(p.depth);
    expect(volume(geom)).toBeCloseTo(volume(createShelfFrame(p)), 4);
    expect(resolveShelfFrame({ ...p, columns: 0 }).valid).toBe(false);
    expect(resolveShelfFrame({ ...p, wall: 2 }).valid).toBe(false);
  });
  it('exports the frame through the common STL and 3MF flow', async () => {
    for (const format of ['stl', '3mf'] as const) {
      const result = await buildShelfModuleExport({ id: 'frame', name: 'Frame', type: 'open-frame', params: p }, cards, 'shell', format);
      expect(result.filename).toBe(`frame-frame.${format}`);
      expect(result.blob.size).toBeGreaterThan(100);
    }
  });
});
