import { describe, expect, it } from 'vitest';
import { measurements, primitives, booleans, transforms, geometries } from '@jscad/modeling';
import { createDiceTray, createDiceTrayBody, createDiceTrayParts, defaultDiceTrayParams as defaults, getDiceTrayDimensions, getDiceTrayBaseDimensions, getDiceTrayBodyDimensions, getDicePocketShape, getDiceTrayPositions, getDiceExposure, getDicePocketWallHeight, validateDiceTray } from './diceTray';
import { getDieMesh, getDieFootprint } from './diceGeometry';
import { Vector3 } from 'three';
const defaultDiceTrayParams = { ...defaults, exposedPercent: undefined, minimumExposure: 6, fingerNotchDiameter: 0, outerCornerRadius: 0 };

describe('dice tray geometry', () => {
  it('mixed pockets and their finger notches finish on one flat plane with raised supports below smaller dice', () => {
    const groups = (['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const).map((diceKind, i) => ({ id: diceKind, diceKind, size: 14 + 2 * i, count: 1 }));
    const p = { ...defaultDiceTrayParams, groups, count: 6, exposedPercent: 40, fingerNotchDiameter: 10 };
    const d = getDiceTrayBaseDimensions(p), positions = getDiceTrayPositions(p), body = createDiceTrayBody(p);
    expect(new Set(positions.map(pos => pos.z)).size).toBeGreaterThan(1);
    for (const pos of positions) {
      expect(pos.z + pos.thickness * 0.6).toBeCloseTo(d.height, 6);
      expect(pos.z + pos.thickness - d.height).toBeCloseTo(pos.thickness * 0.4, 6);
      const local = { ...p, diceKind: pos.diceKind!, size: pos.dieSize! };
      const bounds = measurements.measureBoundingBox(getDicePocketShape(local));
      for (const [z, expected] of [[d.height - 0.1, 0.001], [d.height + 0.1, 0]] as const) {
        const probe = primitives.cuboid({ size: [0.1, 0.1, 0.1], center: [pos.x + bounds[1][0] + 0.2, pos.y, z] });
        expect(measurements.measureVolume(booleans.intersect(body, probe))).toBeCloseTo(expected, 6);
      }
      const floorProbe = primitives.cuboid({ size: [1, 1, 0.1], center: [pos.x, pos.y, pos.z - 0.05] });
      expect(measurements.measureVolume(booleans.intersect(body, floorProbe))).toBeCloseTo(0.1, 5);
    }
  });
  it('sliding lid fits and travels toward the open end without touching body or dice', () => {
    const p = { ...defaultDiceTrayParams, lid: true, lidType: 'sliding' as const, wallThickness: 3, count: 2, columns: 2 };
    const parts = createDiceTrayParts(p), d = getDiceTrayBodyDimensions(p);
    expect(parts).toHaveLength(2);
    for (const offset of [0, 1, d.depth / 2, d.depth + 10]) {
      const lid = transforms.translate([0, offset, 0], parts[1].assembled);
      const overlap = booleans.intersect(parts[0].assembled, lid);
      expect(Math.abs(measurements.measureVolume(overlap)), `offset ${offset}, overlap bounds ${JSON.stringify(measurements.measureBoundingBox(overlap))}`).toBeLessThan(1e-4);
      for (const pos of getDiceTrayPositions(p)) {
        const mesh = getDieMesh(pos.diceKind!, pos.dieSize!);
        const die = transforms.translate([pos.x, pos.y, pos.z], primitives.polyhedron({ points: mesh.points, faces: mesh.faces, orientation: 'outward' }));
        expect(Math.abs(measurements.measureVolume(booleans.intersect(die, lid)))).toBeLessThan(1e-4);
      }
    }
    expect(measurements.measureBoundingBox(parts[1].geometry)[0][2]).toBeCloseTo(0, 6);
  });
  for (const lidType of ['removable', 'sliding'] as const) {
    it(`${lidType}: engraved, inlay and raised labels preserve printable parts and colours`, () => {
      const p = { ...defaultDiceTrayParams, lid: true, lidType, wallThickness: 3, count: 2, columns: 2,
        lidTextEnabled: true, lidText: 'Dados', lidTextColor: '#cc4422' };
      const plain = createDiceTrayParts({ ...p, lidTextEnabled: false });
      for (const lidTextMode of ['engraved', 'inlay', 'raised'] as const) {
        const params = { ...p, lidTextMode };
        const parts = createDiceTrayParts(params), lid = parts[1];
        expect(parts.map(p => p.id)).toEqual(['body', 'lid']);
        expect(measurements.measureVolume(parts[0].geometry)).toBeCloseTo(measurements.measureVolume(plain[0].geometry), 5);
        if (lidTextMode === 'engraved') {
          expect(lid.text).toBeUndefined();
          expect(measurements.measureVolume(lid.geometry)).toBeLessThan(measurements.measureVolume(plain[1].geometry));
        } else {
          expect(lid.text).toBeDefined();
          expect(lid.assembledText?.color).toEqual([0.8, 68 / 255, 34 / 255, 1]);
          expect(Math.abs(measurements.measureVolume(booleans.intersect(lid.geometry, lid.text!)))).toBeLessThan(1e-5);
          expect(measurements.measureBoundingBox(lid.geometry)[0][2]).toBeCloseTo(0, 6);
          if (lidTextMode === 'inlay') expect(measurements.measureVolume(booleans.union(lid.geometry, lid.text!))).toBeCloseTo(measurements.measureVolume(plain[1].geometry), 3);
        }
        const expected = getDiceTrayBodyDimensions(params).height + (p.lidThickness ?? 2) + (lidTextMode === 'raised' ? 0.6 : 0);
        expect(getDiceTrayDimensions(params).height).toBeCloseTo(expected, 6);
        expect(measurements.measureBoundingBox(createDiceTray(params))[1][2]).toBeCloseTo(expected, 6);
      }
    });
  }
  for (const mode of ['individual', 'compartment'] as const) {
    it(`${mode}: exposure changes retaining walls/supports without resizing box/lid`, () => {
      const groups = (['d6', 'd10', 'd20'] as const).map((diceKind, i) => ({ id: diceKind, diceKind, size: 16 + i * 5, count: 1 }));
      const p = { ...defaultDiceTrayParams, mode, groups, count: 3, asBox: true, lid: true, pocketDepth: 100, exposedPercent: 30 };
      const high = { ...p, exposedPercent: 60 };
      expect(getDiceTrayDimensions(p)).toEqual(getDiceTrayDimensions(high));
      const positions = getDiceTrayPositions(p);
      if (mode === 'compartment') expect(getDiceTrayPositions(p)).toEqual(getDiceTrayPositions(high));
      expect(Math.min(...positions.map(pos => pos.z))).toBeCloseTo(p.floorThickness, 6);
      expect(positions.every(pos => pos.z >= p.floorThickness - 1e-6)).toBe(true);
      for (const pos of positions) {
        expect(getDicePocketWallHeight(p, pos.thickness)).toBeCloseTo(pos.thickness * 0.7, 6);
        expect(getDicePocketWallHeight(high, pos.thickness)).toBeCloseTo(pos.thickness * 0.4, 6);
        if (mode === 'individual') expect(pos.z + getDicePocketWallHeight(p, pos.thickness)).toBeCloseTo(getDiceTrayBaseDimensions(p).height, 6);
      }
      const parts = createDiceTrayParts(p), higherExposure = createDiceTrayParts(high);
      if (mode === 'individual') expect(measurements.measureVolume(higherExposure[0].geometry)).toBeLessThan(measurements.measureVolume(parts[0].geometry));
      else expect(measurements.measureVolume(higherExposure[0].geometry)).toBeCloseTo(measurements.measureVolume(parts[0].geometry), 5);
      expect(measurements.measureVolume(higherExposure[1].geometry)).toBeCloseTo(measurements.measureVolume(parts[1].geometry), 5);
      expect(measurements.measureBoundingBox(higherExposure[1].assembled)).toEqual(measurements.measureBoundingBox(parts[1].assembled));
      const height = Math.max(...positions.map(pos => pos.thickness));
      const sampleZ = p.floorThickness + height * 0.55;
      const probe = primitives.cuboid({ size: [0.2, 0.2, 0.2], center: [positions[0].x + p.size / 2 + p.clearance / 2 + 0.3, positions[0].y, sampleZ] });
      if (mode === 'individual') {
        expect(measurements.measureVolume(booleans.intersect(parts[0].geometry, probe))).toBeCloseTo(0.008, 5);
        expect(Math.abs(measurements.measureVolume(booleans.intersect(higherExposure[0].geometry, probe)))).toBeLessThan(1e-6);
      }
    });
  }
  it('also keeps the enclosing box size stable when loading legacy 6mm vs 10mm exposure', () => {
    const p = { ...defaultDiceTrayParams, asBox: true, lid: true };
    expect(getDiceTrayDimensions({ ...p, minimumExposure: 6 })).toEqual(getDiceTrayDimensions({ ...p, minimumExposure: 10 }));
    expect(validateDiceTray({ ...p, exposedPercent: 0 })).toBe(false);
    expect(validateDiceTray({ ...p, exposedPercent: NaN })).toBe(false);
    expect(getDicePocketWallHeight({ ...p, exposedPercent: 40, pocketDepth: 1 }, 20)).toBe(12);
  });
  it('rounds new trays by default and limits the radius without changing cavities', () => {
    expect(defaults.outerCornerRadius).toBe(3);
    const p = { ...defaultDiceTrayParams, outerCornerRadius: 3 };
    const square = createDiceTray({ ...p, outerCornerRadius: 0 }), rounded = createDiceTray(p);
    expect(getDiceTrayPositions(p)).toEqual(getDiceTrayPositions({ ...p, outerCornerRadius: 0 }));
    const bounds = measurements.measureBoundingBox(rounded), squareBounds = measurements.measureBoundingBox(square);
    for (let i = 0; i < 2; i++) for (let axis = 0; axis < 3; axis++) expect(bounds[i][axis]).toBeCloseTo(squareBounds[i][axis], 6);
    const d = getDiceTrayDimensions(p);
    // Four radius-2 corners, with the shared helper's 48-segment circle approximation.
    expect(measurements.measureVolume(square) - measurements.measureVolume(rounded)).toBeCloseTo((16 - 96 * Math.sin(Math.PI / 24)) * d.height, 3);
  });
  for (const mode of ['individual', 'compartment'] as const) {
    it(`${mode}: box rim and lid clear all mixed dice and export in printable poses`, () => {
      const groups = (['d4', 'd6', 'd10', 'd20'] as const).map((diceKind, i) => ({ id: diceKind, diceKind, size: 12 + 4 * i, count: 1 }));
      const p = { ...defaultDiceTrayParams, groups, count: 4, mode, asBox: true, lid: true, outerCornerRadius: 3, stackingClearance: 2 };
      const positions = getDiceTrayPositions(p), bodyDims = getDiceTrayBodyDimensions(p), dims = getDiceTrayDimensions(p);
      expect(getDiceTrayPositions({ ...p, asBox: false, lid: false })).toEqual(positions);
      expect(bodyDims.height).toBeGreaterThanOrEqual(Math.max(...positions.map(pos => pos.z + pos.thickness)) + 2);
      expect(dims.height).toBeCloseTo(bodyDims.height + 2, 6);
      const parts = createDiceTrayParts(p);
      expect(parts.map(part => part.id)).toEqual(['body', 'lid']);
      expect(measurements.measureBoundingBox(parts[1].geometry)[0][2]).toBeCloseTo(0, 6);
      expect(Math.abs(measurements.measureVolume(booleans.intersect(parts[0].assembled, parts[1].assembled)))).toBeLessThan(1e-5);
      expect(measurements.measureBoundingBox(createDiceTray(p))[1][2]).toBeCloseTo(dims.height, 6);
      for (const pos of positions) {
        const mesh = getDieMesh(pos.diceKind!, pos.dieSize!);
        const die = transforms.translate([pos.x, pos.y, pos.z], primitives.polyhedron({ points: mesh.points, faces: mesh.faces, orientation: 'outward' }));
        for (const part of parts) expect(Math.abs(measurements.measureVolume(booleans.intersect(part.assembled, die)))).toBeLessThan(1e-5);
      }
      // Enclosing rim is a continuous ring, not full-height internal pocket dividers.
      const base = getDiceTrayDimensions({ ...p, asBox: false, lid: false }).height;
      const centerProbe = primitives.cuboid({ size: [1, 1, 0.1], center: [dims.width / 2, dims.depth / 2, base + 0.2] });
      expect(Math.abs(measurements.measureVolume(booleans.intersect(createDiceTrayBody(p), centerProbe)))).toBeLessThan(1e-5);
    });
  }
  for (const diceKind of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const) {
    it(`${diceKind}: finger recess joins its pocket and preserves floor, outer walls and dividers`, () => {
      const p = { ...defaultDiceTrayParams, diceKind, fingerNotchDiameter: 10 };
      const shape = getDicePocketShape(p);
      expect(geometries.geom2.toOutlines(shape)).toHaveLength(1);
      expect(measurements.measureArea(shape)).toBeGreaterThan(measurements.measureArea(getDicePocketShape({ ...p, fingerNotchDiameter: 0 })));
      const d = getDiceTrayDimensions(p), positions = getDiceTrayPositions(p);
      const plain = getDiceTrayDimensions({ ...p, fingerNotchDiameter: 0 });
      expect(d.width).toBe(plain.width + 15);
      const tray = createDiceTray(p);
      const area = measurements.measureArea(shape);
      const removed = positions.reduce((n, pos) => n + area * (d.height - pos.z), 0);
      expect(measurements.measureVolume(tray)).toBeCloseTo(d.width * d.depth * d.height - removed, 3);
      const bounds = measurements.measureBoundingBox(shape);
      for (const pos of positions) {
        expect(pos.x + bounds[0][0]).toBeGreaterThanOrEqual(p.wallThickness - 1e-6);
        expect(pos.x + bounds[1][0]).toBeLessThanOrEqual(d.width - p.wallThickness + 1e-6);
        const probe = primitives.cuboid({ size: [1, 1, 0.1], center: [pos.x, pos.y, pos.z - 0.05] });
        expect(measurements.measureVolume(booleans.intersect(tray, probe))).toBeCloseTo(0.1, 5);
      }
      expect(positions[1].x + bounds[0][0] - (positions[0].x + bounds[1][0])).toBeGreaterThanOrEqual(p.wallThickness - 1e-6);
    });
  }
  it('disables recesses for shared mode and limits oversized recesses for small dice', () => {
    const p = { ...defaultDiceTrayParams, mode: 'compartment' as const };
    expect(getDiceTrayDimensions({ ...p, fingerNotchDiameter: 40 })).toEqual(getDiceTrayDimensions(p));
    const small = { ...defaultDiceTrayParams, size: 4, fingerNotchDiameter: 40, count: 1 };
    expect(getDiceTrayDimensions(small).width).toBe(11.5);
    expect(validateDiceTray({ ...small, fingerNotchDiameter: -1 })).toBe(false);
    expect(validateDiceTray({ ...small, fingerNotchDiameter: NaN })).toBe(false);
  });
  for (const diceKind of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const) {
    it(`preserves floors and pocket clearance for ${diceKind}`, () => {
      const p = { ...defaultDiceTrayParams, diceKind, count: 5 };
      const d = getDiceTrayDimensions(p);
      const geometry = createDiceTray(p);
      const bounds = measurements.measureBoundingBox(geometry);
      for (let axis = 0; axis < 3; axis++) expect(bounds[0][axis]).toBeCloseTo(0, 6);
      for (const [axis, value] of [d.width, d.depth, d.height].entries()) expect(bounds[1][axis]).toBeCloseTo(value, 6);
      const removedArea = measurements.measureArea(getDicePocketShape(p));
      const depth = d.height - getDiceTrayPositions(p)[0].z;
      expect(measurements.measureVolume(geometry)).toBeCloseTo(d.width * d.depth * d.height - 5 * removedArea * depth, 3);
    });
    it(`uses a matching face-down ${diceKind} preview and a non-circular silhouette`, () => {
      const size = 20;
      const mesh = getDieMesh(diceKind, size);
      const faceNormals = new Set(mesh.faces.map(face => {
        const [a, b, c] = face.map(i => new Vector3(...mesh.points[i]));
        return b.sub(a).cross(c.sub(a)).normalize().toArray().map(n => n.toFixed(4).replace('-0.0000', '0.0000')).join(',');
      }));
      expect(faceNormals.size).toBe(Number(diceKind.slice(1)));
      const edgeCounts = new Map<string, number>();
      for (const face of mesh.faces) for (let i = 0; i < face.length; i++) {
        const key = [face[i], face[(i + 1) % face.length]].sort((a, b) => a - b).join(',');
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      }
      expect([...edgeCounts.values()].every(count => count === 2)).toBe(true);
      const footprint = getDieFootprint(diceKind, size);
      expect(footprint.length).toBeLessThanOrEqual(10);
      expect(footprint.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...mesh.points.map(p => p[2]))).toBeCloseTo(0, 6);
      expect(mesh.points.filter(p => Math.abs(p[2]) < 1e-5).length).toBeGreaterThanOrEqual(3);
      let diameter = 0;
      for (const a of mesh.points) for (const b of mesh.points) diameter = Math.max(diameter, Math.hypot(...a.map((n, i) => n - b[i])));
      expect(diameter).toBeCloseTo(diceKind === 'd6' ? size * Math.sqrt(3) : size, 5);
      for (const point of mesh.points) for (let i = 0; i < footprint.length; i++) {
        const a = footprint[i], b = footprint[(i + 1) % footprint.length];
        expect((b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0])).toBeGreaterThanOrEqual(-1e-5);
      }
      const positions = getDiceTrayPositions({ ...defaultDiceTrayParams, diceKind, size });
      expect(positions).toHaveLength(6);
      expect(positions[0]).toMatchObject({ diceKind, dieSize: size, count: 1 });
      expect(positions[0].z).toBeGreaterThanOrEqual(2);
      const p = { ...defaultDiceTrayParams, diceKind, size, clearance: 2 };
      const bounds = measurements.measureBoundingBox(getDicePocketShape(p));
      expect(bounds[0][0]).toBeGreaterThanOrEqual(-11.00001);
      expect(bounds[1][0]).toBeLessThanOrEqual(11.00001);
      expect(bounds[0][1]).toBeGreaterThanOrEqual(-11.00001);
      expect(bounds[1][1]).toBeLessThanOrEqual(11.00001);
    });
  }
  it('removes dividers in shared mode while reserving a full grid envelope', () => {
    const p = { ...defaultDiceTrayParams, mode: 'compartment' as const };
    const d = getDiceTrayDimensions(p);
    expect(d).toEqual({ width: 55, depth: 38, height: 12 });
    expect(measurements.measureVolume(createDiceTray(p))).toBeCloseTo(55 * 38 * 12 - 51 * 34 * 10, 3);
  });

  for (const mode of ['individual', 'compartment'] as const) {
    it(`${mode}: mixed dice remain exposed and can travel vertically without intersecting the tray, including d10`, () => {
      const groups = (['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const).map((diceKind, i) => ({ id: diceKind, diceKind, size: 12 + i * 2, count: 1 }));
      const p = { ...defaultDiceTrayParams, mode, groups, pocketDepth: 30 };
      const dimensions = getDiceTrayDimensions(p);
      const tray = createDiceTray(p);
      const positions = getDiceTrayPositions(p);
      expect(positions.map(p => p.diceKind)).toEqual(groups.map(g => g.diceKind));
      expect(new Set(positions.map(p => p.z)).size).toBe(mode === 'individual' ? 6 : 1);
      for (const pos of positions) {
        expect(pos.thickness - getDicePocketWallHeight(p, pos.thickness)).toBeGreaterThanOrEqual(getDiceExposure(p, pos.thickness) - 1e-6);
        const mesh = getDieMesh(pos.diceKind!, pos.dieSize!);
        const die = primitives.polyhedron({ points: mesh.points, faces: mesh.faces, orientation: 'outward' });
        for (const lift of [0, 2, 10, dimensions.height + 1]) {
          const overlap = booleans.intersect(tray, transforms.translate([pos.x, pos.y, pos.z + lift], die));
          expect(Math.abs(measurements.measureVolume(overlap))).toBeLessThan(1e-5);
        }
      }
    });
  }
  it('rejects invalid geometry and caps columns at the actual count', () => {
    for (const patch of [{ count: 0 }, { count: 101 }, { columns: 0 }, { count: 1.5 }, { size: NaN }, { clearance: -1 }])
      expect(validateDiceTray({ ...defaultDiceTrayParams, ...patch })).toBe(false);
    expect(getDiceTrayDimensions({ ...defaultDiceTrayParams, count: 1, columns: 100 })).toEqual({ width: 21, depth: 21, height: 12 });
  });
});
