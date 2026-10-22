import { describe, expect, it } from 'vitest';
import jscad from '@jscad/modeling';
import { defaultMiniatureSocketRackParams, normalizeMiniatureSocketRackParams, getMiniatureSocketRackLayout,
  getMiniatureSocketRackCornerRadius, createMiniatureSocketRackParts } from './miniatureSocketRack';

describe('miniature tray exterior corners', () => {
  const p = { ...defaultMiniatureSocketRackParams, sizingMode: 'grid' as const, rows: 1, columns: 1,
    lid: true, lidTextEnabled: false, perforated: false };
  it('defaults new parameters to 3 mm while missing saved settings remain square', () => {
    expect(defaultMiniatureSocketRackParams.outerCornerRadius).toBe(3);
    expect(normalizeMiniatureSocketRackParams({}).outerCornerRadius).toBe(0);
    expect(getMiniatureSocketRackCornerRadius(p)).toBe(3);
    expect(getMiniatureSocketRackCornerRadius({ ...p, outerCornerRadius: 0 })).toBe(0);
    expect(getMiniatureSocketRackCornerRadius({ ...p, outerCornerRadius: 100, stackingClearance: 0.8 })).toBeLessThan(3);
  });
  it('rounds base/posts/lid without changing layout, pegs or registration pocket surrounds', () => {
    const layout = getMiniatureSocketRackLayout(p);
    const squareLayout = getMiniatureSocketRackLayout({ ...p, outerCornerRadius: 0 });
    expect(layout.seats).toEqual(squareLayout.seats);
    expect(layout.posts).toEqual(squareLayout.posts);
    expect([layout.width, layout.depth, layout.height]).toEqual([squareLayout.width, squareLayout.depth, squareLayout.height]);
    const rounded = createMiniatureSocketRackParts(p), square = createMiniatureSocketRackParts({ ...p, outerCornerRadius: 0 });
    const { measureVolume, measureBoundingBox } = jscad.measurements;
    const { subtract, intersect } = jscad.booleans;
    const pocketWidth = p.postWidth - 4 + p.stackingClearance * 2;
    for (let i = 0; i < rounded.length; i++) {
      expect(measureVolume(rounded[i].geometry)).toBeLessThan(measureVolume(square[i].geometry));
      const bounds = measureBoundingBox(rounded[i].geometry), old = measureBoundingBox(square[i].geometry);
      for (let n = 0; n < 2; n++) for (let a = 0; a < 3; a++) expect(bounds[n][a]).toBeCloseTo(old[n][a], 6);
      expect(Math.abs(measureVolume(subtract(rounded[i].assembled, square[i].assembled)))).toBeLessThan(1e-5);
      const removed = subtract(square[i].assembled, rounded[i].assembled);
      for (const post of layout.posts) {
        const protectedRegion = jscad.primitives.cuboid({ size: [pocketWidth + 1.2, pocketWidth + 1.2, layout.height + 10],
          center: [post.x, post.y, layout.height / 2] });
        expect(Math.abs(measureVolume(intersect(removed, protectedRegion)))).toBeLessThan(1e-5);
      }
    }
    expect(Math.abs(measureVolume(intersect(rounded[0].assembled, rounded[1].assembled)))).toBeLessThan(1e-5);
  });
});
