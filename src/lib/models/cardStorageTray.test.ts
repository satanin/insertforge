import jscad from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import {
  CARD_STORAGE_DIVIDER_TEXT_DEPTH,
  createCardStorageParts,
  createCardStoragePreview,
  defaultCardStorageParams,
  getCardStoragePositions,
  resolveCardStorage,
  type CardStorageParams
} from './cardStorageTray';

const cards = [{ id: 'standard', name: 'Standard sleeved', width: 66, length: 91, thickness: 0.6 }];
const params = (extra: Partial<CardStorageParams> = {}): CardStorageParams => ({
  ...defaultCardStorageParams,
  dividers: [{ id: 'd1', label: '', tab: 'left' }],
  ...extra
});

describe('Card Storage', () => {
  it.each([70, 80])('keeps the lid entry on the storage end at %s mm exterior length', (exteriorLength) => {
    const p = params({ lid: true, lidText: '', sizing: 'length', exteriorLength });
    const r = resolveCardStorage(p, cards);
    const body = createCardStorageParts(p, cards)[0].geometry;
    // Low Y is always the opening, even when exteriorLength is shorter than width.
    const probe = jscad.primitives.cuboid({
      size: [r.width - 2 * p.wallThickness, 0.2, 0.2],
      center: [r.width / 2, p.wallThickness + 0.2, r.wallHeight - 0.3]
    });
    expect(jscad.measurements.measureVolume(jscad.booleans.intersect(body, probe))).toBeCloseTo(0, 6);
  });
  it('keeps the divider colour independent of the body, including black bodies', () => {
    const p = params({ dividerColor: '#ff0000' });
    const parts = createCardStorageParts(p, cards);
    expect(parts[1].geometry.color).toEqual([1, 0, 0, 1]);
    const preview = createCardStoragePreview(p, cards, '#000000');
    const colors = jscad.geometries.geom3.toPolygons(preview).map((poly) => poly.color);
    expect(colors).toContainEqual([1, 0, 0, 1]);
    expect(colors).toContainEqual([0, 0, 0, 1]);
  });
  it('uses an individual colour for each divider and falls back to the default', () => {
    const p = params({
      dividerColor: '#00ff00',
      dividers: [
        { id: 'red', label: '', tab: 'left', color: '#ff0000' },
        { id: 'blue', label: '', tab: 'right', color: '#0000ff' },
        { id: 'default', label: '', tab: 'center' }
      ]
    });
    const parts = createCardStorageParts(p, cards);
    expect(parts.find((part) => part.id === 'red')?.geometry.color).toEqual([1, 0, 0, 1]);
    expect(parts.find((part) => part.id === 'blue')?.geometry.color).toEqual([0, 0, 1, 1]);
    expect(parts.find((part) => part.id === 'default')?.geometry.color).toEqual([0, 1, 0, 1]);

    const colors = jscad.geometries.geom3.toPolygons(createCardStoragePreview(p, cards)).map((poly) => poly.color);
    expect(colors).toContainEqual([1, 0, 0, 1]);
    expect(colors).toContainEqual([0, 0, 1, 1]);
    expect(colors).toContainEqual([0, 1, 0, 1]);
  });
  it('grows by the extra divider thickness in count mode, without group counts', () => {
    const p = params();
    const a = resolveCardStorage(p, cards);
    const b = resolveCardStorage({ ...p, dividers: [...p.dividers, { id: 'd2', label: '', tab: 'right' }] }, cards);
    expect(a.capacity).toBe(100);
    expect(b.capacity).toBe(100);
    expect(b.depth - a.depth).toBeCloseTo(p.dividerThickness);
  });
  it('keeps the exterior length fixed and reduces capacity', () => {
    const p = params({ sizing: 'length', exteriorLength: 150 });
    const a = resolveCardStorage(p, cards);
    const b = resolveCardStorage({ ...p, dividers: [...p.dividers, { id: 'd2', label: '', tab: 'full' }] }, cards);
    expect(a.depth).toBe(150);
    expect(b.depth).toBe(150);
    expect(b.capacity).toBe(a.capacity - 2);
  });
  it.each([false, true])('includes tabs, floor and lid=%s in the height limit', (lid) => {
    const p = params({ lid, maxHeight: 60, lidText: '' });
    const r = resolveCardStorage(p, cards);
    expect(r.valid).toBe(true);
    expect(r.angle).toBeGreaterThan(0);
    expect(r.height).toBeCloseTo(60);
    for (const part of createCardStorageParts(p, cards)) {
      const [min, max] = jscad.measurements.measureBoundingBox(part.assembled);
      expect(min[2]).toBeGreaterThanOrEqual(-1e-6);
      expect(max[2]).toBeLessThanOrEqual(60 + 1e-6);
      expect(min[0]).toBeGreaterThanOrEqual(-1e-6);
      expect(max[0]).toBeLessThanOrEqual(r.width + 1e-6);
      expect(max[1]).toBeLessThanOrEqual(r.depth + 1e-6);
    }
  });
  it('rejects impossible dimensions instead of silently resetting Auto', () => {
    const p = params({ maxHeight: 10, sizing: 'length', exteriorLength: 10 });
    expect(resolveCardStorage(p, cards).valid).toBe(false);
    expect(() => createCardStorageParts(p, cards)).toThrow();
    expect(p.maxHeight).toBe(10);
    expect(p.exteriorLength).toBe(10);
  });
  it('rejects a lid tolerance that would remove guide engagement', () => {
    const p = params({ lid: true, lidClearance: 1 });
    expect(resolveCardStorage(p, cards).errors.join(' ')).toContain('Wall must be at least 4.2 mm');
    expect(() => createCardStorageParts(p, cards)).toThrow();
  });
  it('exports flat plates with disjoint inlay text and positive volume', () => {
    const p = params({ dividers: [{ id: 'a', label: 'Acción', tab: 'full' }] });
    const part = createCardStorageParts(p, cards)[1];
    expect(part.text).toBeDefined();
    expect(jscad.measurements.measureVolume(part.geometry)).toBeGreaterThan(0);
    expect(jscad.measurements.measureVolume(jscad.booleans.intersect(part.geometry, part.text!))).toBeLessThan(0.02);
    const bounds = jscad.measurements.measureBoundingBox(part.geometry);
    const textBounds = jscad.measurements.measureBoundingBox(part.text!);
    expect(bounds[0][2]).toBeCloseTo(0);
    expect(bounds[1][2]).toBeCloseTo(p.dividerThickness);
    expect(textBounds[1][2] - textBounds[0][2]).toBeCloseTo(CARD_STORAGE_DIVIDER_TEXT_DEPTH);
    expect(textBounds[1][2]).toBeCloseTo(p.dividerThickness);
  });
  it.each([
    ['left', 'high'],
    ['right', 'low']
  ] as const)('faces a %s divider label toward the opening with readable orientation', (tab, expectedX) => {
    const p = params({ dividers: [{ id: 'a', label: 'Guille', tab }] });
    const part = createCardStorageParts(p, cards).find((candidate) => candidate.id === 'a')!;
    const plateBounds = jscad.measurements.measureBoundingBox(part.assembled);
    const textBounds = jscad.measurements.measureBoundingBox(part.assembledText!);
    const centerX = (plateBounds[0][0] + plateBounds[1][0]) / 2;
    expect(textBounds[1][1]).toBeCloseTo(plateBounds[1][1], 6);
    if (expectedX === 'high') expect(textBounds[0][0]).toBeGreaterThan(centerX);
    else expect(textBounds[1][0]).toBeLessThan(centerX);
  });
  it.each([
    [40, null],
    [200, null],
    [100, 60]
  ])('keeps dividers clear of the lid travel for %s cards at height %s', (count, maxHeight) => {
    const p = params({ lid: true, count: count!, maxHeight, lidText: '' });
    const r = resolveCardStorage(p, cards);
    const parts = createCardStorageParts(p, cards);
    const body = parts.find((p) => p.id === 'body')!,
      lid = parts.find((p) => p.id === 'lid')!;
    for (const offset of [0, -10, -40, -100]) {
      const moving = jscad.transforms.translate([0, offset, 0], lid.assembled);
      // The inherited ramp lock deliberately creates local interference during travel.
      if (offset === 0) {
        const overlap = jscad.booleans.intersect(body.geometry, moving);
        // Only the small inherited ramp interference is allowed, near the entry.
        expect(jscad.measurements.measureVolume(overlap)).toBeLessThan(0.5);
        const bounds = jscad.measurements.measureBoundingBox(overlap);
        expect(bounds[0][1]).toBeGreaterThanOrEqual(p.wallThickness);
        expect(bounds[1][1]).toBeLessThan(p.wallThickness + 10);
      }
      for (const divider of parts.filter((p) => p.id !== 'body' && p.id !== 'lid')) {
        expect(jscad.measurements.measureVolume(jscad.booleans.intersect(divider.assembled, moving))).toBeCloseTo(0, 5);
      }
    }
  });
  it('supports no dividers and portrait orientation', () => {
    const p = params({ dividers: [], orientation: 'vertical' });
    expect(resolveCardStorage(p, cards).height).toBe(94);
    expect(createCardStorageParts(p, cards)).toHaveLength(1);
    expect(getCardStoragePositions(p, cards).reduce((n, s) => n + s.count, 0)).toBe(100);
  });
  it('honours independent lid thickness and exports aligned inlay text', () => {
    const p = params({ lid: true, lidThickness: 4, lidText: 'A', lidTextMode: 'inlay', maxHeight: 60 });
    const r = resolveCardStorage(p, cards);
    const lid = createCardStorageParts(p, cards).find((p) => p.id === 'lid')!;
    expect(lid.text).toBeDefined();
    expect(jscad.measurements.measureBoundingBox(lid.geometry)[1][2]).toBeCloseTo(p.wallThickness + p.lidThickness);
    expect(jscad.measurements.measureBoundingBox(lid.assembled)[1][2]).toBeCloseTo(60);
    expect(jscad.measurements.measureBoundingBox(lid.assembledText!)[1][2]).toBeLessThanOrEqual(r.height);
    expect(jscad.measurements.measureVolume(jscad.booleans.intersect(lid.geometry, lid.text!))).toBeCloseTo(0, 5);
  });
  it('rejects a sliding lid whose guide would leave only a 0.2 mm wall web', () => {
    const p = params({ lid: true, wallThickness: 2, floorThickness: 2, lidThickness: 2, lidText: '' });
    const result = resolveCardStorage(p, cards);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Wall must be at least 3.0 mm with the current sliding-lid clearance.');
    expect(() => createCardStorageParts(p, cards)).toThrow('Wall must be at least 3.0 mm');
  });
  it('keeps a printable wall web around the sliding-lid groove', () => {
    const p = params({ lid: true, wallThickness: 3, floorThickness: 2, lidThickness: 2, lidText: '' });
    const result = resolveCardStorage(p, cards);
    const body = createCardStorageParts(p, cards)[0].geometry;
    const grooveDepth = p.lidClearance + 0.5;
    const webThickness = p.wallThickness / 2 - grooveDepth;
    const probe = jscad.primitives.cuboid({
      size: [webThickness, 1, 1],
      center: [p.wallThickness - webThickness / 2, result.depth / 2, result.wallHeight - p.wallThickness + 0.5]
    });
    expect(result.valid).toBe(true);
    expect(webThickness).toBeCloseTo(0.7);
    expect(jscad.measurements.measureVolume(jscad.booleans.intersect(body, probe))).toBeCloseTo(webThickness, 4);
  });
  it('keeps many loose plates disjoint even with only one card', () => {
    const p = params({
      count: 1,
      maxHeight: 60,
      dividers: Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, label: '', tab: 'full' }))
    });
    const parts = createCardStorageParts(p, cards);
    for (let i = 1; i < parts.length; i++) {
      expect(
        jscad.measurements.measureVolume(jscad.booleans.intersect(parts[0].geometry, parts[i].assembled))
      ).toBeCloseTo(0, 5);
      if (i > 1)
        expect(
          jscad.measurements.measureVolume(jscad.booleans.intersect(parts[i - 1].assembled, parts[i].assembled))
        ).toBeCloseTo(0, 5);
    }
  });
});
