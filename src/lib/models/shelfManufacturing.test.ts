// @vitest-environment node
import { describe, expect, it } from 'vitest';
import jscad from '@jscad/modeling';
import { createShelfManufacturing, defaultShelfManufacturing, resolveShelfManufacturing, shelfCornerSamplePlate, shelfDividerRearReplacement, shelfManufacturingSets, shelfClosedFrontSample } from './shelfManufacturing';
import { createShelfDrawerParts, defaultShelfDrawerParams } from './shelfStorage';
import { buildShelfManufacturingExport, buildShelfModuleExport, buildShelfCornerSampleExport } from '$lib/utils/exportShelfModule';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { prepareShelfMesh } from '$lib/utils/prepareShelfMesh';
import { shelfCardSpans } from './shelfManufacturing';

const cards = [{ id: 'standard', name: 'Standard', width: 66, length: 91, thickness: 0.3 }];
const params = { ...defaultShelfDrawerParams, depth: 390, shellThickness: 3.6, roofThickness: 3.6,
  socketWebThickness: 1, drawerFloor: 2, bottomTracks: false, headroom: 1, handleClearance: 0.12, handleRetention: true,
  manufacturing: { ...defaultShelfManufacturing, split: true, jointStyle: 'keys' as const } };
const volume = jscad.measurements.measureVolume;
const bounds = jscad.measurements.measureBoundingBox;
// @jscad/modeling's declaration exposes a module where runtime exports a function.
const generalize = jscad.modifiers.generalize as unknown as (options: { snap: boolean; triangulate: boolean; simplify?: boolean }, geometry: Geom3) => Geom3;

describe('depth section manufacturing', () => {
  const hybridParams = { ...params, manufacturing: { ...params.manufacturing, jointStyle: 'lap-keys' as const } };
  it('prints both double drawer interiors with shared cell connections and twelve shell keys', () => {
    for (const [centerDivider, jointStyle] of [[true, 'divider-dovetail'], [false, 'lap-keys'], [false, 'divider-dovetail']] as const) {
      const p = { ...hybridParams, columns: 2 as const, centerDivider, manufacturing: {
        ...hybridParams.manufacturing, jointStyle,
        floorKeys: !centerDivider
      } };
      const model = createShelfManufacturing(p, cards);
      expect(model.assembly.filter(item => item.part === 'key' && item.owner === 'shell')).toHaveLength(12);
      const drawers = model.items.filter(item => item.part === 'drawer');
      expect(drawers).toHaveLength(2);
      expect(Math.abs(volume(jscad.booleans.intersect(drawers[0].geometry, drawers[1].geometry)))).toBeLessThan(1e-5);
      const parts = createShelfDrawerParts(p, cards);
      if (jointStyle === 'divider-dovetail') {
        const seam = model.drawerCuts[0], width = parts.resolved.drawerWidth;
        // Two independent male tongues, with solid front material between sockets.
        for (const fraction of [0.25, 0.75]) {
          const probe = jscad.primitives.cuboid({ size: [2, 1, 2],
            center: [width * fraction, seam - 3, 20] });
          expect(volume(jscad.booleans.intersect(probe, drawers[1].geometry))).toBeCloseTo(4, 5);
          expect(Math.abs(volume(jscad.booleans.intersect(probe, drawers[0].geometry)))).toBeLessThan(1e-5);
        }
      }
      const spans = shelfCardSpans(model, p.cardClearance);
      expect(spans).toHaveLength(jointStyle === 'divider-dovetail' ? 2 : 1);
      for (const [start, end] of spans) {
        const cardBlock = jscad.primitives.cuboid({ size: [parts.resolved.cardWidth, end - start, parts.resolved.cardHeight],
          center: [p.drawerWall + parts.resolved.cardWidth / 2, (start + end) / 2, p.drawerFloor + parts.resolved.cardHeight / 2] });
        for (const section of drawers)
          expect(Math.abs(volume(jscad.booleans.intersect(cardBlock, section.geometry)))).toBeLessThan(1e-5);
      }
      for (const item of model.items.filter(item => item.part !== 'sample')) {
        expect(item.fits, item.name).toBe(true);
        jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, prepareShelfMesh(item.printGeometry)));
      }
      const [x, y, z] = parts.drawerOffset;
      for (const drawer of drawers) for (const travel of [0, 50, 200])
        expect(Math.abs(volume(jscad.booleans.intersect(parts.shell,
          jscad.transforms.translate([x, y - travel, z], drawer.geometry))))).toBeLessThan(1e-5);
    }
  });
  it('cuts a short full-height closed front with the exact handle socket', () => {
    const p = { ...hybridParams, labelWindow: true };
    const sample = shelfClosedFrontSample(p, cards);
    const parts = createShelfDrawerParts({ ...p, labelWindow: false }, cards);
    expect(p.labelWindow).toBe(true);
    expect(sample.fits).toBe(true);
    for (const [axis, expected] of [parts.resolved.drawerWidth, 25, parts.resolved.drawerHeight].entries())
      expect(sample.size[axis]).toBeCloseTo(expected, 6);
    expect(Math.abs(volume(jscad.booleans.subtract(sample.geometry, parts.drawer)))).toBeLessThan(1e-6);
    expect(Math.abs(volume(jscad.booleans.intersect(sample.geometry, parts.handle)))).toBeLessThan(1e-6);
    const mesh = prepareShelfMesh(sample.printGeometry);
    jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, mesh));
    expect(volume(mesh)).toBeCloseTo(volume(sample.geometry), 4);
  });
  it('exports a shell set with both sections and eight separate joining keys', async () => {
    const model = createShelfManufacturing(hybridParams, cards);
    const set = shelfManufacturingSets(model)[0];
    expect(set.pieces).toHaveLength(10);
    expect(set.plates).toBe(1);
    for (let i = 0; i < set.pieces.length; i++) {
      const a = bounds(set.pieces[i].geometry);
      expect(a[0][2]).toBeCloseTo(0);
      expect(a[0][0]).toBeGreaterThanOrEqual(model.settings.margin - 1e-6);
      expect(a[1][0]).toBeLessThanOrEqual(model.settings.bedWidth - model.settings.margin + 1e-6);
      expect(a[1][1]).toBeLessThanOrEqual(model.settings.bedDepth - model.settings.margin + 1e-6);
      for (let j = 0; j < i; j++) {
        const b = bounds(set.pieces[j].geometry);
        expect(a[0][0] >= b[1][0] || b[0][0] >= a[1][0] ||
          a[0][1] >= b[1][1] || b[0][1] >= a[1][1]).toBe(true);
      }
    }
    const result = await buildShelfManufacturingExport({ id: 'set', name: 'Test', type: 'card-drawer', params: hybridParams }, cards, 'set-shell', '3mf');
    const reader = new ZipReader(new BlobReader(result.blob));
    const entries = await reader.getEntries();
    const entry = entries.find(entry => entry.filename === '3D/3dmodel.model');
    if (!entry || entry.directory) throw new Error('Missing model entry.');
    const xml = await entry.getData!(new TextWriter());
    expect(xml.match(/<object\s/g)).toHaveLength(10);
    await reader.close();
    expect(shelfManufacturingSets(model)[1].pieces).toHaveLength(6);
  });
  it('prints the divider joint flat without drawer keys and preserves the shell', () => {
    const model = createShelfManufacturing({ ...hybridParams, manufacturing: {
      ...hybridParams.manufacturing, jointStyle: 'divider-dovetail'
    } }, cards);
    const original = createShelfManufacturing(hybridParams, cards);
    const drawers = model.items.filter(item => item.part === 'drawer');
    expect(drawers).toHaveLength(2);
    expect(model.dividerDepth).toBe(7);
    for (const [distance, expected] of [[7.5, 0], [6.5, 1]]) {
      const probe = jscad.primitives.cuboid({ size: [1, 1, 1],
        center: [model.resolved.drawerWidth / 4, model.drawerCuts[0] - distance, 20] });
      expect(Math.abs(volume(jscad.booleans.intersect(probe, drawers[0].geometry)))).toBeCloseTo(expected, 5);
    }
    const replacement = shelfDividerRearReplacement({ ...hybridParams, manufacturing: {
      ...hybridParams.manufacturing, jointStyle: 'divider-dovetail'
    } }, cards);
    expect(replacement.fits).toBe(true);
    expect(replacement.size[1]).toBeCloseTo(drawers[1].size[1] - 10);
    jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, prepareShelfMesh(replacement.printGeometry)));
    const assembled = bounds(jscad.booleans.union(...drawers.map(item => item.geometry)));
    const whole = bounds(createShelfDrawerParts(hybridParams, cards).drawer);
    for (let axis = 0; axis < 3; axis++) {
      expect(assembled[0][axis]).toBeCloseTo(whole[0][axis], 5);
      expect(assembled[1][axis]).toBeCloseTo(whole[1][axis], 5);
    }
    expect(model.items.filter(item => item.part === 'shell')).toEqual(original.items.filter(item => item.part === 'shell'));
    expect(model.assembly.filter(item => item.part === 'key' && item.owner === 'drawer')).toHaveLength(0);
    expect(volume(jscad.booleans.intersect(drawers[0].geometry, drawers[1].geometry))).toBeCloseTo(0);
    // Check the actual split bodies inside the shell, including the divider
    // passing under the capture lips as the drawer closes.
    const shell = createShelfDrawerParts(hybridParams, cards).shell;
    const [x, y, z] = model.drawerOffset;
    for (const travel of [0, 5, 25, 75, 125, 175, 225, 275, 325, 375]) {
      for (const drawer of drawers) {
        const placed = jscad.transforms.translate([x, y - travel, z], drawer.geometry);
        expect(volume(jscad.booleans.intersect(shell, placed)), `${drawer.id} at ${travel} mm`).toBeCloseTo(0, 5);
      }
    }
    for (const drawer of drawers) {
      expect(drawer.fits).toBe(true);
      expect(bounds(drawer.printGeometry)[0][2]).toBeCloseTo(0);
      const mesh = prepareShelfMesh(drawer.printGeometry);
      jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, mesh));
    }
  });
  it('adds two flush floor keys in full-depth lanes while retaining the lap between them', () => {
    const p = { ...hybridParams, manufacturing: { ...hybridParams.manufacturing, floorKeys: true } };
    const model = createShelfManufacturing(p, cards), original = createShelfManufacturing(hybridParams, cards);
    expect(model.resolved).toEqual(original.resolved);
    const keys = model.assembly.filter(i => i.owner === 'drawer' && i.part === 'key');
    expect(keys).toHaveLength(6);
    const floorKeys = keys.filter(i => bounds(i.geometry)[1][2] < 2);
    expect(floorKeys).toHaveLength(2);
    const halves = model.assembly.filter(i => i.part === 'drawer');
    const material = jscad.booleans.union(...halves.map(i => i.geometry));
    expect(volume(jscad.booleans.intersect(halves[0].geometry, halves[1].geometry))).toBeCloseTo(0);
    for (const key of floorKeys) {
      const b = bounds(key.geometry);
      expect(b[0][2]).toBeCloseTo(0.1);
      expect(b[1][2]).toBeCloseTo(1.9);
      const seated = Math.abs(volume(jscad.booleans.intersect(material, key.geometry)));
      const pushed = Math.abs(volume(jscad.booleans.intersect(material, jscad.transforms.translate([0, 0, -0.6], key.geometry))));
      expect(pushed).toBeGreaterThan(seated + 1);
    }
    const seam = model.drawerCuts[0];
    // The broad head recess opens upward; material below it supports the stop
    // instead of forming a suspended ceiling when the front prints floor down.
    for (const x of [model.resolved.drawerWidth / 4, model.resolved.drawerWidth * 3 / 4]) {
      for (const [z, expected] of [[0.2, 0.001], [1.8, 0]] as const) {
        const probe = jscad.primitives.cuboid({ size: [0.1, 0.1, 0.1], center: [x + 6, seam - 9, z] });
        expect(volume(jscad.booleans.intersect(material, probe))).toBeCloseTo(expected, 7);
      }
    }
    for (const y of [seam - 0.5, seam + 0.5]) {
      const root = jscad.primitives.cuboid({ size: [0.1, 0.1, 0.1], center: [model.resolved.drawerWidth / 4 + 8.2, y, 1] });
      expect(volume(jscad.booleans.intersect(material, root))).toBeCloseTo(0.001, 7);
    }
    for (const item of model.items) {
      expect(item.fits, item.id).toBe(true);
      const mesh = prepareShelfMesh(item.printGeometry);
      jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, mesh));
      expect(Math.abs(volume(mesh) - volume(item.printGeometry))).toBeLessThan(1e-4);
    }
    expect(model.sampleWidth).toBe(42);
    expect(shelfCornerSamplePlate(model)).toHaveLength(4);
    expect(resolveShelfManufacturing({ ...p, drawerFloor: 1.7 }, cards).errors.join(' ')).toContain('at least 2 mm');
  });
  it('exports four separate test bodies when the corner includes an interior floor key', async () => {
    const p = { ...hybridParams, manufacturing: { ...hybridParams.manufacturing, floorKeys: true } };
    const result = await buildShelfCornerSampleExport({ id: 'floor', name: 'Test', type: 'card-drawer', params: p }, cards);
    expect(result.filename).toContain('floor-keys-4-parts');
    const reader = new ZipReader(new BlobReader(result.blob));
    try {
      const entry = (await reader.getEntries()).find(e => e.filename === '3D/3dmodel.model');
      if (!entry || entry.directory) throw new Error('Missing 3MF model');
      const xml = await entry.getData!(new TextWriter());
      expect(xml.match(/<object\s/g)).toHaveLength(4);
      expect(xml.match(/<item\s/g)).toHaveLength(4);
    } finally { await reader.close(); }
  });
  it('adds a printable floor lap without changing the assembled envelope, and generates small matching samples', () => {
    const model = createShelfManufacturing(hybridParams, cards), original = createShelfDrawerParts(hybridParams, cards);
    expect(model.hybrid).toBe(true); expect(model.lapWeb).toBeCloseTo(0.95);
    expect(model.resolved).toEqual(original.resolved);
    const pieces = model.assembly.filter(i => i.part === 'drawer');
    expect(pieces).toHaveLength(2);
    expect(Math.abs(volume(jscad.booleans.intersect(pieces[0].geometry, pieces[1].geometry)))).toBeLessThan(1e-5);
    const r = model.resolved, seam = model.drawerCuts[0];
    const probe = (z: number) => jscad.primitives.cuboid({ size: [1, 1, 0.04], center: [r.drawerWidth / 2, seam, z] });
    expect(volume(jscad.booleans.intersect(pieces[0].geometry, probe(0.4)))).toBeCloseTo(0.04);
    expect(volume(jscad.booleans.intersect(pieces[1].geometry, probe(0.4)))).toBeCloseTo(0);
    expect(volume(jscad.booleans.intersect(pieces[1].geometry, probe(1.3)))).toBeCloseTo(0.04);
    for (const part of pieces) expect(volume(jscad.booleans.intersect(part.geometry, probe(1)))).toBeCloseTo(0);
    for (const item of model.items) {
      expect(item.fits, item.id).toBe(true);
      const mesh = prepareShelfMesh(item.printGeometry);
      jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, mesh));
      expect(Math.abs(volume(mesh) - volume(item.printGeometry))).toBeLessThan(1e-4);
    }
    const rear = model.items.find(i => i.id === 'drawer-2')!;
    expect(rear.size[2]).toBeGreaterThan(200);
    expect(rear.size[1]).toBeLessThan(60);
    for (const id of ['sample-floor-A', 'sample-floor-B', 'sample-corner-A', 'sample-corner-B']) {
      const item = model.items.find(i => i.id === id)!;
      expect(Math.max(...item.size)).toBeLessThan(35);
    }
    const cornerA = model.items.find(i => i.id === 'sample-corner-A')!;
    const cornerB = model.items.find(i => i.id === 'sample-corner-B')!;
    expect(cornerA.size[2]).toBeCloseTo(30);
    expect(cornerB.size[1]).toBeCloseTo(30);
    expect(cornerB.size[2]).toBeCloseTo(29.925);
    const plate = shelfCornerSamplePlate(model);
    expect(plate).toHaveLength(3);
    for (let i = 0; i < plate.length; i++) {
      expect(bounds(plate[i])[0][2]).toBeCloseTo(0);
      for (let j = 0; j < i; j++) expect(volume(jscad.booleans.intersect(plate[i], plate[j]))).toBeCloseTo(0);
    }
  });
  it('stops every key against a solid shoulder on both outer wall orientations', () => {
    const model = createShelfManufacturing(hybridParams, cards);
    for (const key of model.assembly.filter(i => i.part === 'key')) {
      const material = jscad.booleans.union(...model.assembly.filter(i => i.part === key.owner).map(i => i.geometry));
      const b = bounds(key.geometry), axis = b[1][0] - b[0][0] < b[1][2] - b[0][2] ? 0 : 2;
      const extent = key.owner === 'shell' ? (axis === 0 ? model.resolved.bodyWidth : model.resolved.bodyHeight) : model.resolved.drawerWidth;
      const direction = (b[0][axis] + b[1][axis]) / 2 < extent / 2 ? 1 : -1;
      const motion: [number, number, number] = [0, 0, 0]; motion[axis] = direction;
      const seated = Math.abs(volume(jscad.booleans.intersect(material, key.geometry)));
      const pushed = Math.abs(volume(jscad.booleans.intersect(material, jscad.transforms.translate(motion, key.geometry))));
      expect(pushed).toBeGreaterThan(seated + 1);
    }
  });
  it('rejects thin floor laps and redistributes the rear section to respect build height', () => {
    expect(resolveShelfManufacturing({ ...hybridParams, drawerFloor: 1.2 }, cards).errors.join(' ')).toContain('1.7 mm');
    expect(resolveShelfManufacturing({ ...hybridParams, bottomTracks: true }, cards).valid).toBe(false);
    const lowerPrinter = createShelfManufacturing({ ...hybridParams,
      manufacturing: { ...hybridParams.manufacturing, buildHeight: 200 } }, cards);
    expect(lowerPrinter.items.every(i => i.fits)).toBe(true);
    expect(resolveShelfManufacturing({ ...hybridParams, depth: 900 }, cards).valid).toBe(false);
    const short = createShelfManufacturing({ ...hybridParams, depth: 100 }, cards);
    expect(short.drawerCount).toBe(1);
    expect(shelfCornerSamplePlate(short)).toHaveLength(3);
  });
  it('exports the small C+F test set as three separate 3MF bodies', async () => {
    const result = await buildShelfCornerSampleExport({ id: 'hybrid', name: 'Test', type: 'card-drawer', params: hybridParams }, cards);
    expect(result.filename).toContain('floor-2mm');
    const reader = new ZipReader(new BlobReader(result.blob));
    try {
      const entry = (await reader.getEntries()).find(e => e.filename === '3D/3dmodel.model');
      if (!entry || entry.directory) throw new Error('Missing 3MF model');
      const xml = await entry.getData!(new TextWriter());
      expect(xml.match(/<object\s/g)).toHaveLength(3);
      expect(xml.match(/<item\s/g)).toHaveLength(3);
    } finally { await reader.close(); }
  });
  it('fits a 390 mm unit into a 250 mm volume with unchanged assembled envelope and clear content space', () => {
    const original = createShelfDrawerParts(params, cards), model = createShelfManufacturing(params, cards);
    expect(model.shellCount).toBe(2); expect(model.drawerCount).toBe(2);
    expect(model.resolved).toEqual(original.resolved);
    expect(model.items.filter(i => i.part === 'key').map(i => i.quantity).sort()).toEqual([4, 8]);
    for (const item of model.items) {
      expect(item.fits, item.id).toBe(true);
      for (const coordinate of bounds(item.printGeometry)[0]) expect(coordinate).toBeCloseTo(0);
      expect(item.size[0]).toBeLessThanOrEqual(240.000001);
      expect(item.size[1]).toBeLessThanOrEqual(240.000001);
      expect(item.size[2]).toBeLessThanOrEqual(250.000001);
      expect(volume(item.geometry)).toBeGreaterThan(0);
      // Validate new joint geometry locally. The inherited front ramp contains
      // collinear CSG vertices; whole-part raw geom3.validate is not an export validator.
      const seam = item.part === 'drawer' ? model.drawerCuts[0] : model.shellCuts[0];
      const local = item.part === 'handle' ? null : item.part === 'key' || item.part === 'sample' ? item.geometry
        : jscad.booleans.intersect(item.geometry, jscad.primitives.cuboid({
          size: [200, 70, 200], center: [80, seam, 80] }));
      if (local) jscad.geometries.geom3.validate(generalize({ snap: true, triangulate: true }, local));
    }
    for (const part of ['shell', 'drawer'] as const) {
      const sections = model.assembly.filter(i => i.owner === part);
      const [min, max] = bounds(original[part]);
      for (const item of sections) {
        const b = bounds(item.geometry);
        for (let axis = 0; axis < 3; axis++) {
          expect(b[0][axis]).toBeGreaterThanOrEqual(min[axis] - 1e-6);
          expect(b[1][axis]).toBeLessThanOrEqual(max[axis] + 1e-6);
        }
      }
      const pieces = sections.filter(i => i.part !== 'key');
      expect(volume(jscad.booleans.intersect(pieces[0].geometry, pieces[1].geometry))).toBeCloseTo(0);
    }
    // The floor and content cross-section stay intact; only side-wall pockets are cut in the drawer.
    const r = model.resolved;
    const content = jscad.primitives.cuboid({ size: [r.drawerWidth - 2 * params.drawerWall - 0.2,
      r.drawerDepth - r.frontReserve - params.drawerWall - 0.2, r.sideHeight - params.drawerFloor],
      center: [r.drawerWidth / 2, (r.frontReserve + r.drawerDepth - params.drawerWall) / 2,
        (r.sideHeight + params.drawerFloor) / 2 + 0.01] });
    for (const item of model.assembly.filter(i => i.owner === 'drawer'))
      expect(Math.abs(volume(jscad.booleans.intersect(content, item.geometry)))).toBeLessThan(1e-5);
    expect(Math.abs(model.shellCuts[0] - model.drawerCuts[0] - params.slidingClearance)).toBeGreaterThan(20);
  });
  it('uses build height for rear-down shells and rotates drawer footprints on rectangular beds', () => {
    const model = createShelfManufacturing({ ...params, manufacturing: { ...params.manufacturing,
      bedWidth: 250, bedDepth: 100, buildHeight: 150 } }, cards);
    expect(model.shellCount).toBe(3);
    expect(model.drawerCount).toBe(2);
    expect(model.items.every(i => i.fits)).toBe(true);
    const drawer = model.items.find(i => i.id === 'drawer-1')!;
    expect(drawer.size[0]).toBeGreaterThan(drawer.size[1]);
  });
  it('rejects cross-section failures and weak walls instead of changing module width or height', () => {
    expect(resolveShelfManufacturing({ ...params, manufacturing: { ...params.manufacturing, bedWidth: 70 } }, cards)
      .errors.join(' ')).toContain('cross-section');
    expect(resolveShelfManufacturing({ ...params, drawerWall: 1.2 }, cards).errors.join(' ')).toContain('side walls at least 2 mm');
    expect(resolveShelfManufacturing({ ...params, manufacturing: { ...params.manufacturing, bedDepth: NaN } }, cards).valid).toBe(false);
    expect(() => createShelfManufacturing({ ...params, manufacturing: { ...params.manufacturing, buildHeight: 40 } }, cards)).toThrow();
  });
  it('preserves unsplit geometry and reports an oversized whole shell', () => {
    const model = createShelfManufacturing({ ...params, manufacturing: { ...params.manufacturing, split: false } }, cards);
    expect(model.items).toHaveLength(3);
    expect(model.items.find(i => i.id === 'shell')?.fits).toBe(false);
    expect(volume(model.items.find(i => i.id === 'shell')!.geometry))
      .toBeCloseTo(volume(createShelfDrawerParts(params, cards).shell));
  });
  it('exports one section or key at Z=0 and prevents accidental whole-part export', async () => {
    const module = { id: 'split', name: 'Long drawer', type: 'card-drawer' as const, params };
    await expect(buildShelfModuleExport(module, cards, 'shell', 'stl')).rejects.toThrow('numbered sections');
    for (const id of ['shell-1', 'drawer-2', 'key-2.000']) {
      const result = await buildShelfManufacturingExport(module, cards, id, '3mf');
      const reader = new ZipReader(new BlobReader(result.blob));
      try {
        const entry = (await reader.getEntries()).find(e => e.filename === '3D/3dmodel.model');
        if (!entry || entry.directory) throw new Error('Missing 3MF mesh');
        const xml = await entry.getData!(new TextWriter());
        expect(xml.match(/<object\s/g)).toHaveLength(1);
        const z = [...xml.matchAll(/<vertex\s+[^>]*z="([^"]+)"/g)].map(m => Number(m[1]));
        expect(Math.min(...z)).toBeCloseTo(0);
      } finally { await reader.close(); }
    }
    await expect(buildShelfManufacturingExport(module, cards, 'missing', 'stl')).rejects.toThrow();
  });
});
