import { describe, expect, it } from 'vitest';
import jscad from '@jscad/modeling';
import {
  createMiniatureSocketRack, defaultMiniatureSocketRackParams,
  createMiniatureSocketRackLid, createMiniatureSocketRackParts,
  createMiniatureSocketRackLabelText,
  createMiniatureSocketRackLidText,
  createMiniatureSocketRackPreview,
  getMiniatureSocketRackLayout, getMiniatureSocketRackPreviewPositions,
  normalizeMiniatureSocketRackParams
} from './miniatureSocketRack';
import {
  createDefaultMiniatureRackSlot, createMiniatureRack, getMiniatureRackDimensions,
  getMiniatureRackPreviewPositions, normalizeMiniatureRackParams, type MiniatureRackParams
} from './miniatureRack';
import { arrangeLayerContents } from './layer';

const { measureBoundingBox, measureVolume } = jscad.measurements;
const { intersect } = jscad.booleans;
const { translate } = jscad.transforms;
const socketParams = { ...defaultMiniatureSocketRackParams, sizingMode: 'grid' as const, rows: 1, columns: 2 };

describe('individual miniature base rack', () => {
  it('shares lid text modes, separate colour bodies and correct print poses with socket labels', () => {
    const p = { ...socketParams, rows: 1, columns: 1, lid: true, lidText: 'F', lidTextColor: '#ff8000' };
    for (const mode of ['engraved', 'inlay', 'raised'] as const) {
      const input = { ...p, lidTextMode: mode };
      const layout = getMiniatureSocketRackLayout(input);
      const part = createMiniatureSocketRackParts(input).find(part => part.id === 'lid')!;
      const text = createMiniatureSocketRackLidText(input)!;
      expect(text.color).toEqual([1, 128 / 255, 0, 1]);
      expect(!!part.text).toBe(mode !== 'engraved');
      expect(layout.height).toBeCloseTo(getMiniatureSocketRackLayout(p).height + (mode === 'raised' ? 0.6 : 0));
      if (part.text) {
        expect(Math.abs(measureVolume(intersect(part.geometry, part.text)))).toBeLessThan(0.001);
        expect(measureBoundingBox(part.text)[1][2]).toBeCloseTo(mode === 'raised' ? p.lidThickness + 0.6 : 0.4);
        expect(measureBoundingBox(part.assembledText!)[1][2]).toBeCloseTo(layout.height);
        expect(jscad.geometries.geom3.toPolygons(createMiniatureSocketRackPreview(input)).some(poly => poly.color?.[0] === 1 && poly.color?.[1] === 128 / 255)).toBe(true);
      }
    }
    const fixed = getMiniatureSocketRackLayout({ ...p, fixedHeight: 70, lidTextMode: 'raised' });
    expect(fixed.height).toBe(70);
    expect(fixed.stackPitch).toBeCloseTo(66.4);
    expect(createMiniatureSocketRackLidText({ ...p, lidTextEnabled: false })).toBeNull();
    expect(normalizeMiniatureSocketRackParams().lidTextMode).toBe('engraved');
    expect(normalizeMiniatureSocketRackParams({ lidTextColor: 'invalid' }).lidTextColor).toBe('#ffffff');
  });
  it('searches compact footprints for the 3 Runners + 3 Tanks case without fixed dimensions', () => {
    const input = { sizingMode: 'models' as const, wallThickness: 1.5, floorThickness: 1.5, postWidth: 8,
      models: [
        { id: 'r', name: 'Runners', count: 3, baseDiameter: 26, baseThickness: 3, width: 32, depth: 32, height: 45 },
        { id: 't', name: 'Tanks', count: 3, baseDiameter: 32, baseThickness: 3, width: 32, depth: 32, height: 45 }
      ] };
    const layout = getMiniatureSocketRackLayout(input);
    expect(layout.error).toBeNull();
    expect(layout.seats).toHaveLength(6);
    expect(layout.width * layout.depth).toBeLessThan(90 * 174);
    expect(layout.modelCounts.map(model => model.placed)).toEqual([3, 3]);
    expect(getMiniatureSocketRackLayout({ ...input, fixedWidth: 90 }).width).toBe(90);
    const fill = getMiniatureSocketRackLayout({ ...input, quantityMode: 'fill' });
    expect([fill.width, fill.depth]).toEqual([200, 200]);
  });
  it('exports inlay and raised labels as a separate coloured text body without overlap', () => {
    const p = { ...socketParams, rows: 1, columns: 1, labelsEnabled: true, labelText: 'F', labelTextColor: '#ff8000' };
    expect(createMiniatureSocketRackLabelText(p)).toBeNull();
    for (const mode of ['inlay', 'raised'] as const) {
      const input = { ...p, labelTextMode: mode };
      const part = createMiniatureSocketRackParts(input)[0];
      expect(part.text).toBeDefined();
      expect(part.text!.color).toEqual([1, 128 / 255, 0, 1]);
      const preview = createMiniatureSocketRackPreview(input);
      expect(jscad.geometries.geom3.toPolygons(preview).some(poly => poly.color?.[0] === 1 && poly.color?.[1] === 128 / 255)).toBe(true);
      expect(Math.abs(measureVolume(intersect(part.geometry, part.text!)))).toBeLessThan(0.001);
      const labelTop = getMiniatureSocketRackLayout(input).labels[0].top;
      const bounds = measureBoundingBox(part.text!);
      expect(bounds[0][2]).toBeCloseTo(labelTop - (mode === 'inlay' ? 0.4 : 0));
      expect(bounds[1][2]).toBeCloseTo(labelTop + (mode === 'raised' ? 0.6 : 0));
      expect(measureVolume(createMiniatureSocketRack(input))).toBeCloseTo(
        measureVolume(part.geometry) + measureVolume(part.text!), 4);
    }
    expect(normalizeMiniatureSocketRackParams().labelTextMode).toBe('engraved');
    expect(normalizeMiniatureSocketRackParams({ labelTextColor: 'invalid' }).labelTextColor).toBe('#ffffff');
  });
  it('keeps socket label plates within the original rack and socket spacing', () => {
    const input = { ...socketParams, rows: 2, columns: 2, labelsEnabled: true, labelText: 'A' };
    const layout = getMiniatureSocketRackLayout(input);
    expect(layout.error).toBeNull();
    expect(layout.labels).toHaveLength(4);
    layout.labels.forEach((label, index) => {
      const seat = layout.seats[index];
      const diameter = seat.baseDiameter + layout.p.diameterClearance + 2 * layout.p.wallThickness;
      expect(label.width).toBeLessThanOrEqual(diameter);
      expect(label.depth).toBeLessThanOrEqual(layout.p.spacingY + layout.p.wallThickness);
      expect(label.y - label.depth / 2).toBeGreaterThanOrEqual(layout.p.wallThickness);
      expect(label.top).toBe(layout.p.floorThickness + seat.baseThickness + layout.p.verticalClearance + layout.p.tabThickness);
    });
    const before = getMiniatureSocketRackLayout({ ...input, labelsEnabled: false });
    expect([layout.width, layout.depth, layout.height]).toEqual([before.width, before.depth, before.height]);
    const labeled = createMiniatureSocketRack(input);
    const plain = createMiniatureSocketRack({ ...input, labelsEnabled: false });
    expect(measureBoundingBox(labeled)).toEqual(measureBoundingBox(plain));
    expect(measureVolume(labeled)).toBeGreaterThan(measureVolume(plain));
    for (const seat of layout.seats) {
      const base = translate([seat.x, seat.y, layout.p.floorThickness + seat.baseThickness / 2],
        jscad.primitives.cylinder({ radius: seat.baseDiameter / 2, height: seat.baseThickness, segments: 48 }));
      expect(Math.abs(measureVolume(intersect(labeled, base)))).toBeLessThan(0.001);
    }
  });
  it('rejects text that cannot be printed instead of shrinking or clipping it', () => {
    const input = { ...socketParams, labelsEnabled: true, labelText: 'Name that will never fit this socket' };
    expect(getMiniatureSocketRackLayout(input).error).toContain('text does not fit');
    expect(() => createMiniatureSocketRack(input)).toThrow('text does not fit');
    expect(getMiniatureSocketRackLayout({ ...input, labelText: 'A', linkedSpacing: false, spacingY: 0 }).error).toContain('text does not fit');
    expect(getMiniatureSocketRackLayout({ ...input, labelText: 'A', nozzleDiameter: 0.6 }).error).toContain('at least 6.0');
    expect(getMiniatureSocketRackLayout({ ...input, labelsEnabled: false }).error).toBeNull();
    expect(normalizeMiniatureSocketRackParams().labelsEnabled).toBe(false);
  });
  it('uses model names or short labels and warns about approximate miniature overhangs without rejecting fitting text', () => {
    const input = { sizingMode: 'models' as const, labelsEnabled: true, models: [
      { id: 'a', name: 'A', count: 1, baseDiameter: 32, baseThickness: 3, width: 32, depth: 32, height: 45 },
      { id: 'b', name: 'Long model name', label: 'B', count: 1, baseDiameter: 40, baseThickness: 3, width: 40, depth: 40, height: 50 }
    ] };
    const layout = getMiniatureSocketRackLayout(input);
    expect(layout.error).toBeNull();
    expect(layout.labels.map(label => label.text).sort()).toEqual(['A', 'B']);
    const overhang = getMiniatureSocketRackLayout({ ...input, models: [{ ...input.models[0], depth: 70 }] });
    expect(overhang.error).toBeNull();
    expect(overhang.labels).toHaveLength(1);
    expect(overhang.warnings.join(' ')).toContain('approximate miniature envelope');
    expect(overhang.warnings.join(' ')).toContain('not a text-size error');
  });
  it('lightens new rack floors by default and preserves an explicitly solid floor', () => {
    expect(defaultMiniatureSocketRackParams.perforated).toBe(true);
    expect(normalizeMiniatureSocketRackParams().perforated).toBe(true);
    expect(normalizeMiniatureSocketRackParams({ perforated: false }).perforated).toBe(false);
  });
  it('keeps an asymmetric glyph readable from above in the assembled and printable lid', () => {
    const p = { ...socketParams, rows: 1, columns: 1, fixedWidth: 100, fixedDepth: 70, lid: true };
    const lid = createMiniatureSocketRackLid(p, 'F');
    const probe = (x: number, y: number, z: number) => translate([x, y, z],
      jscad.primitives.cuboid({ size: [0.2, 0.2, 0.2] }));
    // The upper bar of F is at +Y; reflecting it would put this cut at -Y instead.
    expect(Math.abs(measureVolume(intersect(lid, probe(52, 39.5, 2.8))))).toBeLessThan(0.00001);
    expect(measureVolume(intersect(lid, probe(52, 30.5, 2.8)))).toBeCloseTo(0.008, 5);
    const printable = createMiniatureSocketRackParts(p, 'F').find(part => part.id === 'lid')!.geometry;
    // Printing turns the whole lid over around X, preserving the engraving's physical orientation.
    expect(Math.abs(measureVolume(intersect(printable, probe(52, 30.5, 0.2))))).toBeLessThan(0.00001);
    expect(measureVolume(intersect(printable, probe(52, 39.5, 0.2)))).toBeCloseTo(0.008, 5);
  });
  it('engraves the tray name or custom text without changing the lid bounds or peg pockets', () => {
    const p = { ...socketParams, lid: true };
    const blank = createMiniatureSocketRackLid({ ...p, lidTextEnabled: false }, 'A');
    const named = createMiniatureSocketRackLid(p, 'Á');
    expect(measureVolume(named)).toBeLessThan(measureVolume(blank));
    expect(measureBoundingBox(named)).toEqual(measureBoundingBox(blank));
    const custom = createMiniatureSocketRackLid({ ...p, lidText: 'B' }, 'A');
    const renamed = createMiniatureSocketRackLid({ ...p, lidText: 'B' }, 'Different tray');
    expect(measureVolume(custom)).toBeCloseTo(measureVolume(renamed), 6);
    expect(measureVolume(createMiniatureSocketRackLid(p, 'B'))).toBeCloseTo(measureVolume(custom), 6);
    expect(measureVolume(createMiniatureSocketRackLid({ ...p, lidTextEnabled: false, lidText: 'B' }, 'A')))
      .toBeCloseTo(measureVolume(blank), 6);
    expect(normalizeMiniatureSocketRackParams({ lidText: '   ' }).lidText).toBeNull();
    expect(normalizeMiniatureSocketRackParams({}).lidTextEnabled).toBe(true);
    const printed = createMiniatureSocketRackParts(p, 'B').find(part => part.id === 'lid')!;
    expect(measureVolume(printed.geometry)).toBeCloseTo(measureVolume(custom), 5);
  });
  it('supports a separate flat lid on the posts without interfering with pegs or miniatures', () => {
    const p = { ...socketParams, lid: true, fixedHeight: 65 };
    const layout = getMiniatureSocketRackLayout(p);
    expect(layout.height).toBe(65);
    const parts = createMiniatureSocketRackParts(p);
    expect(parts.map(part => part.id)).toEqual(['body', 'lid']);
    expect(Math.abs(measureVolume(intersect(parts[0].assembled, parts[1].assembled)))).toBeLessThan(0.001);
    const lidBounds = measureBoundingBox(createMiniatureSocketRackLid(p));
    expect(lidBounds[0][2]).toBeCloseTo(0);
    expect(lidBounds[1][2]).toBeCloseTo(3);
    const printBounds = measureBoundingBox(parts[1].geometry);
    expect(printBounds[0][2]).toBeCloseTo(0);
    expect(printBounds[1][2]).toBeCloseTo(3);
    expect(layout.stackPitch).toBeGreaterThan(p.floorThickness + p.miniatureHeight);
    expect(getMiniatureSocketRackLayout({ ...p, fixedHeight: 50 }).error).toContain('Required rack height');
    expect(normalizeMiniatureSocketRackParams({ lidThickness: 1 }).lidThickness).toBe(2.8);
  });
  it('honours fixed exterior dimensions and stacks racks with different contents', () => {
    const p = { sizingMode: 'free' as const, requestedCount: 2,
      fixedWidth: 143, fixedDepth: 100, fixedHeight: 85, maxHeight: 90 };
    const a = getMiniatureSocketRackLayout(p);
    const b = getMiniatureSocketRackLayout({ ...p, requestedCount: 6, miniatureHeight: 60 });
    expect([a.width, a.depth, a.height]).toEqual([143, 100, 85]);
    expect(b.posts).toEqual(a.posts);
    const lower = createMiniatureSocketRack(p);
    const upper = createMiniatureSocketRack({ ...p, requestedCount: 6, miniatureHeight: 60 });
    const bounds = measureBoundingBox(lower);
    bounds[1].forEach((value, axis) => expect(value).toBeCloseTo([143, 100, 85][axis]));
    expect(Math.abs(measureVolume(intersect(lower, translate([0, 0, a.stackPitch], upper))))).toBeLessThan(0.001);
    expect(getMiniatureSocketRackLayout({ ...p, fixedWidth: 201 }).error).toContain('exceeds the maximum');
    expect(getMiniatureSocketRackLayout({ ...p, fixedHeight: 30 }).error).toContain('Required rack height');
    expect(getMiniatureSocketRackLayout({ ...p, fixedHeight: 100 }).error).toContain('exceeds the maximum');
    const cleared = getMiniatureSocketRackLayout({ ...p, fixedWidth: null, fixedDepth: null, fixedHeight: null });
    expect(cleared.height).toBeLessThan(85);
    expect(cleared.width * cleared.depth).toBeLessThan(143 * 100);
  });

  it('places only what fits with an explicit remaining count and printable geometry', () => {
    const p = { sizingMode: 'free' as const, quantityMode: 'partial' as const,
      requestedCount: 30, fixedWidth: 143, fixedDepth: 100 };
    const layout = getMiniatureSocketRackLayout(p);
    expect(layout.error).toBeNull();
    expect(layout.seats).toHaveLength(6);
    expect(layout.remainingCount).toBe(24);
    expect(layout.warnings.join(' ')).toContain('24 remain unplaced');
    expect(measureVolume(createMiniatureSocketRack(p))).toBeGreaterThan(0);
    expect(getMiniatureSocketRackLayout({ ...p, quantityMode: 'all' }).error).toContain('capacity is 6');
  });

  it('fills the available footprint without using the requested quantity', () => {
    const layout = getMiniatureSocketRackLayout({ sizingMode: 'free', quantityMode: 'fill',
      requestedCount: 1, fixedWidth: 143, fixedDepth: 100 });
    expect(layout.error).toBeNull();
    expect(layout.seats).toHaveLength(6);
    expect([layout.width, layout.depth]).toEqual([143, 100]);
    expect(layout.remainingCount).toBe(0);
    const limited = getMiniatureSocketRackLayout({ sizingMode: 'free', quantityMode: 'fill', maxWidth: 600, maxDepth: 600 });
    expect(limited.seats).toHaveLength(100);
    expect(limited.warnings.join(' ')).toContain('limit of 100');
  });

  it('reports partial placement by model and excludes models that are too tall', () => {
    const model = { id: 'runners', name: 'Runners', count: 30, baseDiameter: 32,
      baseThickness: 3, width: 32, depth: 32, height: 45 };
    const layout = getMiniatureSocketRackLayout({ sizingMode: 'models', quantityMode: 'partial',
      fixedWidth: 143, fixedDepth: 100, models: [model] });
    expect(layout.error).toBeNull();
    expect(layout.seats).toHaveLength(6);
    expect(layout.modelCounts[0]).toMatchObject({ requested: 30, placed: 6, remaining: 24 });
    const heightLimited = getMiniatureSocketRackLayout({ sizingMode: 'models', quantityMode: 'partial', maxHeight: 60,
      models: [{ ...model, count: 1 }, { ...model, id: 'tall', height: 100, count: 1 }] });
    expect(heightLimited.error).toBeNull();
    expect(heightLimited.modelCounts.find(m => m.id === 'tall')).toMatchObject({ placed: 0, remaining: 1 });
  });

  it('fills with one model while preserving the quantities of other models', () => {
    const filler = { id: 'runners', name: 'Runners', count: 1, baseDiameter: 25,
      baseThickness: 3, width: 25, depth: 25, height: 45 };
    const large = { ...filler, id: 'large', name: 'Large', count: 2, baseDiameter: 40, width: 40, depth: 40 };
    const p = { sizingMode: 'models' as const, quantityMode: 'fill' as const, fillModelId: 'runners',
      fixedWidth: 143, fixedDepth: 110, models: [filler, large] };
    const layout = getMiniatureSocketRackLayout(p);
    expect(layout.error).toBeNull();
    expect(layout.modelCounts.find(m => m.id === 'large')).toMatchObject({ requested: 2, placed: 2, remaining: 0 });
    expect(layout.modelCounts.find(m => m.id === 'runners')!.placed).toBeGreaterThan(1);
    expect(layout.modelCounts.find(m => m.id === 'runners')!.requested).toBeNull();
    expect(layout.seats.length).toBe(layout.requestedCount);
    expect([layout.width, layout.depth]).toEqual([143, 110]);
    const restored = getMiniatureSocketRackLayout(JSON.parse(JSON.stringify(normalizeMiniatureSocketRackParams(p))));
    expect(restored.modelCounts).toEqual(layout.modelCounts);
    expect(restored.seats).toEqual(layout.seats);
    expect(getMiniatureSocketRackLayout({ ...p, models: [filler, { ...large, count: 30 }] }).error).toContain('other models do not fit');
  });
  it('scales overlap with base diameter, including 8 mm on a 32 mm base', () => {
    const p = normalizeMiniatureSocketRackParams({ baseDiameter: 32, tabOverlapPercent: 25 });
    expect(p.baseDiameter * p.tabOverlapPercent / 100).toBe(8);
    const larger = normalizeMiniatureSocketRackParams({ ...p, baseDiameter: 40 });
    expect(larger.baseDiameter * larger.tabOverlapPercent / 100).toBe(10);
  });

  it('converts legacy millimetres and gives explicit percentages precedence', () => {
    const p = normalizeMiniatureSocketRackParams({ baseDiameter: 32, tabOverlap: 1.5 });
    expect(p.tabOverlapPercent).toBe(4.6875);
    expect(p.tabOverlap).toBeUndefined();
    expect(normalizeMiniatureSocketRackParams({ ...p, baseDiameter: 40 }).tabOverlapPercent).toBe(4.6875);
    expect(normalizeMiniatureSocketRackParams({ baseDiameter: 32, tabOverlap: 1.5, tabOverlapPercent: 25 }).tabOverlapPercent).toBe(25);
  });
  it('positions every preview base at its socket centre with clearance and headroom', () => {
    const layout = getMiniatureSocketRackLayout(socketParams);
    const bases = getMiniatureSocketRackPreviewPositions(socketParams);
    expect(bases).toHaveLength(2);
    for (const [index, base] of bases.entries()) {
      expect([base.x, base.y]).toEqual([layout.seats[index].x, layout.seats[index].y]);
      expect(base.z).toBe(layout.p.floorThickness);
      expect(layout.radius * 2 - base.width).toBeCloseTo(layout.p.diameterClearance);
      expect(layout.stackPitch - (base.z + layout.p.miniatureHeight)).toBeCloseTo(layout.p.headroom);
    }
  });

  it('bounds invalid input while allowing a thin floor under reinforced stacking posts', () => {
    const p = normalizeMiniatureSocketRackParams({ rows: 0, columns: 200, baseDiameter: NaN,
      floorThickness: 0, diameterClearance: -1, verticalClearance: 0, tabOverlap: 100 });
    expect(p.rows).toBe(1);
    expect(p.columns).toBe(10);
    expect(p.baseDiameter).toBe(32);
    expect(p.floorThickness).toBeGreaterThanOrEqual(1.2);
    expect(p.diameterClearance).toBeGreaterThan(0);
    expect(p.verticalClearance).toBeGreaterThan(0);
    expect(p.tabOverlapPercent).toBeLessThan(50);
  });

  it('generates the declared envelope, leaves bases clear, and retains a tab above them', () => {
    const rack = createMiniatureSocketRack(socketParams);
    const { p, seats, width, depth, height } = getMiniatureSocketRackLayout(socketParams);
    const bounds = measureBoundingBox(rack);
    bounds[0].forEach((value) => expect(value).toBeCloseTo(0));
    bounds[1].forEach((value, axis) => expect(value).toBeCloseTo([width, depth, height][axis]));
    const { x, y } = seats[0];
    const baseAt = (z: number) => translate([x, y, z + p.baseThickness / 2],
      jscad.primitives.cylinder({ radius: p.baseDiameter / 2, height: p.baseThickness, segments: 48 }));
    expect(Math.abs(measureVolume(intersect(rack, baseAt(p.floorThickness + 0.01))))).toBeLessThan(0.001);
    expect(measureVolume(intersect(rack, baseAt(p.floorThickness + p.verticalClearance + 0.5)))).toBeGreaterThan(0);
  });

  it('stacks identical racks without intersecting locating pegs or underside sockets', () => {
    const input = { ...socketParams, columns: 1, perforated: true, floorThickness: 2 };
    const rack = createMiniatureSocketRack(input);
    const layout = getMiniatureSocketRackLayout(input);
    const upper = translate([0, 0, layout.stackPitch], rack);
    expect(Math.abs(measureVolume(intersect(rack, upper)))).toBeLessThan(0.001);
    expect(measureVolume(rack)).toBeGreaterThan(0);
    expect(measureVolume(createMiniatureSocketRack({ ...input, perforated: false }))).toBeGreaterThan(measureVolume(rack));
    expect(getMiniatureSocketRackLayout(input).p.floorThickness).toBe(2);
  });

  it('calculates a compact grid from maximum dimensions and creates exactly the requested count', () => {
    const layout = getMiniatureSocketRackLayout({ sizingMode: 'free', requestedCount: 5,
      maxWidth: 143, maxDepth: 100 });
    expect(layout.error).toBeNull();
    expect(layout.seats).toHaveLength(5);
    expect(layout.capacity).toBe(6);
    expect(layout.width).toBeLessThanOrEqual(143);
    expect(layout.depth).toBeLessThanOrEqual(100);
    const failing = { sizingMode: 'free' as const, requestedCount: 7, maxWidth: 143, maxDepth: 100 };
    expect(getMiniatureSocketRackLayout(failing).error).toContain('capacity is 6');
    expect(() => createMiniatureSocketRack(failing)).toThrow('capacity is 6');
  });

  it('supports independent X/Y spacing and migrates old grid spacing', () => {
    const layout = getMiniatureSocketRackLayout({ ...socketParams, rows: 2,
      spacingX: 3, spacingY: 12, linkedSpacing: false });
    expect(layout.seats[1].x - layout.seats[0].x).toBe(40);
    expect(layout.seats[2].y - layout.seats[0].y).toBe(49);
    expect(normalizeMiniatureSocketRackParams({ rows: 2, columns: 3, spacing: 9 }).sizingMode).toBe('grid');
    expect(normalizeMiniatureSocketRackParams({ rows: 2, spacing: 9 }).spacingX).toBe(9);
    expect(normalizeMiniatureSocketRackParams({ rows: 2, spacing: 9 }).spacingY).toBe(9);
    expect(normalizeMiniatureSocketRackParams({ spacingX: 4, spacingY: 20, linkedSpacing: true }).spacingY).toBe(4);
  });

  it('mixes models with different bases and envelopes, conserving quantities and headroom', () => {
    const layout = getMiniatureSocketRackLayout({ sizingMode: 'models', maxWidth: 200, maxDepth: 180,
      spacingX: 4, spacingY: 8, linkedSpacing: false, models: [
        { id: 'a', name: 'Infantry', count: 3, baseDiameter: 25, baseThickness: 2, width: 40, depth: 35, height: 40 },
        { id: 'b', name: 'Monster', count: 2, baseDiameter: 40, baseThickness: 4, width: 60, depth: 65, height: 75 }
      ] });
    expect(layout.error).toBeNull();
    expect(layout.seats.filter(s => s.modelName === 'Infantry')).toHaveLength(3);
    expect(layout.seats.filter(s => s.baseDiameter === 40)).toHaveLength(2);
    expect(layout.stackPitch).toBe(layout.p.floorThickness + 75 + layout.p.headroom);
    for (const [i, a] of layout.seats.entries()) {
      expect(a.x - a.envelopeWidth! / 2).toBeGreaterThanOrEqual(layout.p.postWidth - 1e-6);
      expect(a.y - a.envelopeDepth! / 2).toBeGreaterThanOrEqual(layout.p.postWidth - 1e-6);
      expect(a.x + a.envelopeWidth! / 2).toBeLessThanOrEqual(layout.width - layout.p.postWidth + 1e-6);
      expect(a.y + a.envelopeDepth! / 2).toBeLessThanOrEqual(layout.depth - layout.p.postWidth + 1e-6);
      for (const b of layout.seats.slice(i + 1)) {
        const xGap = Math.abs(a.x - b.x) - (a.envelopeWidth! + b.envelopeWidth!) / 2;
        const yGap = Math.abs(a.y - b.y) - (a.envelopeDepth! + b.envelopeDepth!) / 2;
        expect(xGap >= layout.p.spacingX - 1e-6 || yGap >= layout.p.spacingY - 1e-6).toBe(true);
      }
    }
    const preview = getMiniatureSocketRackPreviewPositions(layout.p);
    expect(preview.filter(s => s.width === 40)).toHaveLength(2);
    expect(preview.every(s => s.previewEnvelope)).toBe(true);
    const rack = createMiniatureSocketRack(layout.p);
    expect(measureBoundingBox(rack)[1][2]).toBeCloseTo(layout.height);
  });

  it('does not silently generate an incomplete rack when models cannot fit', () => {
    const p = { sizingMode: 'models' as const, maxWidth: 50, maxDepth: 50, models: [
      { id: 'a', name: 'Large', count: 2, baseDiameter: 32, baseThickness: 3, width: 80, depth: 80, height: 70 }
    ] };
    expect(getMiniatureSocketRackLayout(p).error).toContain('No layout found');
    expect(() => createMiniatureSocketRack(p)).toThrow('No layout found');
    expect(getMiniatureSocketRackLayout({ sizingMode: 'free', requestedCount: 1, maxHeight: 30 }).error).toContain('Required rack height');
  });

  it('uses the existing miniature-rack entry points and survives a JSON round trip', () => {
    const params: MiniatureRackParams = {
      rackHeight: null, rackBaseDepth: 50, wallThickness: 2, sideWallThickness: 2,
      railWallThickness: 1.5, railLipInset: 1.5, rimHeight: 3,
      baseWidthTolerance: 1.8, baseHeightTolerance: 1,
      slots: [createDefaultMiniatureRackSlot(1)], variant: 'sockets', sockets: socketParams
    };
    const restored = normalizeMiniatureRackParams(JSON.parse(JSON.stringify(params)));
    expect(restored.sockets).toEqual(socketParams);
    const layout = getMiniatureSocketRackLayout(socketParams);
    expect(getMiniatureRackDimensions(restored, 200)).toEqual({ width: layout.width, depth: layout.depth, height: layout.height });
    expect(getMiniatureRackPreviewPositions(restored)).toHaveLength(2);
    expect(measureBoundingBox(createMiniatureRack(restored, 'Rack', 200, true))[1][2]).toBeCloseTo(layout.height);
    const arrangement = arrangeLayerContents({
      id: 'layer', name: 'Layer', boxes: [], layeredBoxes: [],
      boards: [{ id: 'board', name: 'Tall support', color: '#888888', width: 200, depth: 200, height: 100 }],
      looseTrays: [{ id: 'rack', type: 'miniatureRack', name: 'Rack', color: '#888888', autoHeight: true, params: restored }]
    }, { gameContainerWidth: 256, gameContainerDepth: 256, cardSizes: [], counterShapes: [] });
    expect(arrangement.looseTrays[0].dimensions.height).toBeCloseTo(layout.height);
  });
});
