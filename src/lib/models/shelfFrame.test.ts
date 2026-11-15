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
  it('matches the current 3.6 mm shell grid on every perimeter cell', () => {
    const trial = createShelfDrawerParts({ ...defaultShelfDrawerParams, shellThickness: 3.6,
      roofThickness: 3.6, socketWebThickness: 1, drawerFloor: 2, bottomTracks: false, headroom: 1 },
      [{ ...cards[0], width: 66, length: 91 }]);
    const reference = { ...p, pitchWidth: trial.resolved.bodyWidth, pitchHeight: trial.resolved.bodyHeight };
    const frame = createShelfFrame(reference), r = resolveShelfFrame(reference);
    expect(r.bodyWidth).toBeCloseTo(160.4);
    expect(r.bodyHeight).toBeCloseTo(219.1);
    expect(r.width).toBeCloseTo(162.8);
    expect(r.height).toBeCloseTo(221.5);
    for (let cell = 0; cell < 2; cell++) {
      for (const pos of [[cell * reference.pitchWidth, 0, -reference.pitchHeight],
        [cell * reference.pitchWidth, 0, r.bodyHeight],
        [-reference.pitchWidth, 0, cell * reference.pitchHeight],
        [r.bodyWidth, 0, cell * reference.pitchHeight]]) {
        expect(volume(jscad.booleans.intersect(frame, jscad.transforms.translate(pos as [number, number, number], trial.shell)))).toBeLessThan(1e-5);
      }
    }
  });
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
