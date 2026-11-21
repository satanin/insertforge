import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CardSize } from '$lib/types/project';
import { createShelfDrawerParts, resolveShelfDrawer, shelfPrintGeometry, type ShelfDrawerParams, type ShelfPartId, type ShelfPreviewCote } from './shelfStorage';

export interface ShelfManufacturingSettings {
  split: boolean;
  bedWidth: number;
  bedDepth: number;
  buildHeight: number;
  margin: number;
  jointClearance: number;
  jointStyle?: 'keys' | 'lap-keys' | 'divider-dovetail';
  floorKeys?: boolean;
}
export const defaultShelfManufacturing: ShelfManufacturingSettings = {
  split: false, bedWidth: 250, bedDepth: 250, buildHeight: 250, margin: 5, jointClearance: 0.15,
  jointStyle: 'divider-dovetail'
};
export interface ShelfManufacturingItem {
  id: string; name: string; part: ShelfPartId | 'key' | 'sample'; quantity: number;
  geometry: Geom3; printGeometry: Geom3; assembledSize: [number, number, number]; size: [number, number, number]; fits: boolean;
}
const { translate, rotateX, rotateZ } = jscad.transforms;
const { union, subtract, intersect } = jscad.booleans;
const { cuboid, polygon } = jscad.primitives;
const KEY_HEIGHT = 7, SEAM_GAP = 0.15;
const KEY_HEAD = 0.8, KEY_SETBACK = 0.1, KEY_SHOULDER = 1.2;
const LAP_LENGTH = 12, LAP_GAP = 0.1, MIN_LAP_WEB = 0.8;
const DIVIDER_DEPTH = 8;
function block(x: number, y: number, z: number, w: number, d: number, h: number) {
  return cuboid({ size: [w, d, h], center: [x + w / 2, y + d / 2, z + h / 2] });
}
function dimensions(g: Geom3): [number, number, number] {
  const b = jscad.measurements.measureBoundingBox(g);
  return b[1].map((v, i) => v - b[0][i]) as [number, number, number];
}
function onBed(g: Geom3) {
  const b = jscad.measurements.measureBoundingBox(g);
  return translate(b[0].map(v => -v) as [number, number, number], g);
}
export function fitShelfPrint(g: Geom3, s: ShelfManufacturingSettings) {
  let placed = onBed(g), size = dimensions(placed);
  const x = s.bedWidth - 2 * s.margin, y = s.bedDepth - 2 * s.margin;
  if (!(size[0] <= x + 1e-6 && size[1] <= y + 1e-6) && size[1] <= x + 1e-6 && size[0] <= y + 1e-6) {
    placed = onBed(rotateZ(Math.PI / 2, placed)); size = dimensions(placed);
  }
  return { printGeometry: placed, size,
    fits: size[0] <= x + 1e-6 && size[1] <= y + 1e-6 && size[2] <= s.buildHeight + 1e-6 };
}
function balancedCuts(length: number, limit: number, firstMinimum: number, stagger = 0) {
  const count = Math.max(1, Math.ceil(length / limit));
  if (count === 1) return [];
  const step = length / count;
  const shift = Math.min(stagger, Math.max(0, limit - step), Math.max(0, step - firstMinimum));
  return Array.from({ length: count - 1 }, (_, i) => step * (i + 1) - shift);
}
export function resolveShelfManufacturing(p: ShelfDrawerParams, cards: CardSize[]) {
  const settings = { ...defaultShelfManufacturing, ...p.manufacturing };
  const r = resolveShelfDrawer(p, cards), errors: string[] = [...r.errors];
  for (const [label, value, min, max] of [
    ['Bed width', settings.bedWidth, 50, 2000], ['Bed depth', settings.bedDepth, 50, 2000],
    ['Build height', settings.buildHeight, 40, 2000], ['Bed margin', settings.margin, 0, 30],
    ['Joint clearance', settings.jointClearance, 0.08, 0.3]
  ] as [string, number, number, number][]) {
    if (!Number.isFinite(value) || value < min || value > max) errors.push(`${label}: choose ${min}–${max} mm.`);
  }
  const usableX = settings.bedWidth - 2 * settings.margin, usableY = settings.bedDepth - 2 * settings.margin;
  const crossFits = (w: number, d: number) => (w <= usableX && d <= usableY) || (d <= usableX && w <= usableY);
  if (!crossFits(r.width, r.height)) errors.push('Shell cross-section exceeds the bed. Depth splitting cannot reduce its width or height.');
  if (r.drawerHeight > settings.buildHeight) errors.push('Upright drawer exceeds the build height.');
  const drawerLimit = Math.max(r.drawerWidth <= usableX ? usableY : 0, r.drawerWidth <= usableY ? usableX : 0);
  if (drawerLimit < 60) errors.push('Drawer width leaves no usable printing orientation on this bed.');
  const shellCuts = settings.split && !errors.length ? balancedCuts(p.depth, settings.buildHeight, 35) : [];
  // Keep seams away from the front/handle load path and stagger relative to the shell where possible.
  let drawerCuts = settings.split && !errors.length ? balancedCuts(r.drawerDepth, drawerLimit, r.rampEnd + 20, 25) : [];
  const hybrid = settings.jointStyle === 'lap-keys';
  const divider = settings.jointStyle === 'divider-dovetail';
  const floorKeys = hybrid && settings.floorKeys === true;
  const lapWeb = (p.drawerFloor - LAP_GAP) / 2;
  if (settings.jointStyle !== undefined && !['keys', 'lap-keys', 'divider-dovetail'].includes(settings.jointStyle)) errors.push('Unknown joint style.');
  if (divider && drawerCuts.length) {
    const lower = Math.max(r.rampEnd + 20, r.drawerDepth - drawerLimit + DIVIDER_DEPTH);
    const upper = Math.min(drawerLimit, r.drawerDepth - 35);
    if (lower > upper) errors.push('The divider joint needs two floor-down sections that fit the bed.');
    else drawerCuts = [Math.max(lower, Math.min(upper, r.drawerDepth / 2))];
    if (r.drawerWidth - 2 * p.drawerWall < 30 || r.sideHeight - p.drawerFloor < 20)
      errors.push('The divider needs at least 30 mm of clear width and 20 mm of height.');
  }
  if (hybrid) {
    if (floorKeys && p.drawerFloor < 2) errors.push('Seated floor keys require at least 2 mm of full floor thickness.');
    if (p.drawerWall < 2 || r.shellSkin < 2.4 || r.roofThickness < 2.4)
      errors.push('Seated keys require drawer walls at least 2 mm and shell/roof walls at least 2.4 mm.');
    if (drawerCuts.length && r.drawerDepth <= drawerLimit + settings.buildHeight - LAP_LENGTH) {
      const lower = Math.max(r.rampEnd + 20, r.drawerDepth - settings.buildHeight + LAP_LENGTH / 2);
      const upper = drawerLimit - LAP_LENGTH / 2;
      if (lower <= upper) drawerCuts = [Math.min(upper, Math.max(lower, r.drawerDepth / 2 - 25))];
    }
    if (lapWeb < MIN_LAP_WEB - 1e-6) errors.push('C+F requires a drawer floor of at least 1.7 mm (two 0.8 mm lips and 0.1 mm gap).');
    if (p.bottomTracks !== false) errors.push('Apply the flat shell floor / thicker drawer floor before enabling C+F.');
    if (drawerCuts.length > 1) errors.push('C+F currently supports two drawer sections. More sections need a separate print-orientation design.');
    if (drawerCuts.length && (drawerCuts[0] + LAP_LENGTH / 2 > drawerLimit ||
      r.drawerDepth - drawerCuts[0] + LAP_LENGTH / 2 > settings.buildHeight))
      errors.push('The 12 mm floor overlap exceeds the usable print volume. Increase bed depth/build height.');
  }
  if (shellCuts.length || drawerCuts.length) {
    if (shellCuts.length && (r.bodyWidth < 76 || r.bodyHeight < 96 || r.shellSkin < 2.4 || r.roofThickness < 2.4))
      errors.push('Flush shell keys require a body at least 76 × 96 mm and shell/roof walls at least 2.4 mm.');
    if (!divider && drawerCuts.length && (p.drawerWall < 2 || r.sideHeight - p.drawerFloor < 38))
      errors.push('Drawer keys require side walls at least 2 mm thick and 38 mm high above the floor.');
    if ([...shellCuts.map((v, i) => v - (shellCuts[i - 1] ?? 0)),
      p.depth - (shellCuts.at(-1) ?? 0)].some(v => v < 35)) errors.push('Shell sections are too short for the joining keys.');
    if (drawerCuts.length && (drawerCuts[0] < r.rampEnd + 20 || r.drawerDepth - drawerCuts.at(-1)! < 35))
      errors.push('Drawer sections leave insufficient material beside the front or back. Choose a larger bed.');
  }
  return { valid: !errors.length, errors, settings, shellCuts, drawerCuts, hybrid, divider, floorKeys, lapWeb, dividerDepth: DIVIDER_DEPTH,
    lapLength: LAP_LENGTH, lapGap: LAP_GAP, keySeatDepth: KEY_HEAD + KEY_SETBACK, drawerWall: p.drawerWall,
    drawerFloor: p.drawerFloor, sampleWidth: floorKeys ? 42 : 30,
    shellCount: shellCuts.length + 1, drawerCount: drawerCuts.length + 1, resolved: r };
}
// Longitudinal double dovetail: heads resist axial pull; 45° shoulders print from the floor.
// Through-wall keys stay 0.1 mm inside both faces, so neither cards nor external interfaces shrink.
function keyProfile(clearance = 0) {
  const profile = polygon({ points: [[-16, 0], [-9, -7], [-5, -3], [5, -3], [9, -7],
    [16, 0], [9, 7], [5, 3], [-5, 3], [-9, 7]] });
  return clearance ? jscad.expansions.expand({ delta: clearance, corners: 'chamfer' }, profile) : profile;
}
function flatKey(thickness: number, clearance: number, pocket = false) {
  const plate = jscad.extrusions.extrudeLinear({ height: thickness }, keyProfile(pocket ? clearance : 0));
  if (pocket) return plate;
  // Four sacrificial crush ribs retain the key normal to the wall. No positive snap is claimed.
  const ribs = [-9, 9].flatMap(x => [-1, 1].map(sign => block(x - 0.18,
    sign > 0 ? KEY_HEIGHT - 0.5 : -KEY_HEIGHT - clearance - 0.08,
    0, 0.36, 0.5 + clearance + 0.08, thickness)));
  return union(plate, ...ribs);
}
function seatedKey(wall: number, clearance: number, pocket = false): Geom3 {
  // Explicit nested outline keeps a real bearing shoulder at concave corners too.
  const neck = 3 - 1.5 * KEY_SHOULDER, headHalf = 7 - 2 * KEY_SHOULDER, end = 16 - 3 * KEY_SHOULDER;
  const shaftPoints: [number, number][] = [[-end, 0], [-9, -headHalf], [-5, -neck], [5, -neck], [9, -headHalf],
    [end, 0], [9, headHalf], [5, neck], [-5, neck], [-9, headHalf]];
  const shaft = polygon({ points: shaftPoints });
  const profile = (g: ReturnType<typeof keyProfile>, gap: number) => gap
    ? jscad.expansions.expand({ delta: gap, corners: 'chamfer' }, g) : g;
  if (pocket) return union(
    translate([0, 0, -0.02], jscad.extrusions.extrudeLinear({ height: wall + 0.04 }, profile(shaft, clearance))),
    translate([0, 0, -0.02], jscad.extrusions.extrudeLinear({ height: KEY_HEAD + KEY_SETBACK + 0.02 }, keyProfile(clearance))));
  // Stitch the two nested outlines explicitly: boolean unions of thin stepped
  // extrusions otherwise leave collinear T-junctions on this bearing ledge.
  // Four shaft tips have sacrificial interference; the head itself is a clean stop.
  const tip = headHalf + clearance + 0.08;
  const stemPoints = shaftPoints.map(([x, y]): [number, number] => [x, Math.abs(x) === 9 ? Math.sign(y) * tip : y]);
  const outer: [number, number][] = [[-16, 0], [-9, -7], [-5, -3], [5, -3], [9, -7], [16, 0], [9, 7], [5, 3], [-5, 3], [-9, 7]];
  const low = KEY_SETBACK, seat = KEY_SETBACK + KEY_HEAD, high = wall - KEY_SETBACK;
  const at = ([x, y]: [number, number], z: number): [number, number, number] => [x, y, z];
  const cap = (points: [number, number][], z: number, up: boolean) => jscad.geometries.geom3.toPolygons(
    jscad.extrusions.extrudeLinear({ height: 1 }, polygon({ points })))
    .filter(poly => poly.vertices.every(v => Math.abs(v[2] - (up ? 1 : 0)) < 1e-8))
    .map(poly => jscad.geometries.poly3.fromPoints(poly.vertices.map(v => [v[0], v[1], z])));
  const faces = [...cap(outer, low, false), ...cap(stemPoints, high, true)];
  for (let i = 0; i < outer.length; i++) {
    const next = (i + 1) % outer.length;
    for (const points of [
      [at(outer[i], low), at(outer[next], low), at(outer[next], seat), at(outer[i], seat)],
      [at(outer[i], seat), at(outer[next], seat), at(stemPoints[next], seat), at(stemPoints[i], seat)],
      [at(stemPoints[i], seat), at(stemPoints[next], seat), at(stemPoints[next], high), at(stemPoints[i], high)]
    ]) faces.push(jscad.geometries.poly3.fromPoints(points));
  }
  return jscad.geometries.geom3.create(faces);
}
type KeySite = { id: string; wall: 'side' | 'horizontal'; x: number; y: number; z: number; thickness: number; outerMax?: boolean };
function normalGeometry(g: Geom3, site: KeySite) {
  return site.outerMax ? translate([0, 0, site.thickness], jscad.transforms.mirrorZ(g)) : g;
}
function placeKey(g: Geom3, site: KeySite) {
  // Flat profile X becomes longitudinal Y; profile Y becomes wall height Z or transverse X.
  const oriented = site.wall === 'side'
    ? jscad.transforms.rotateY(Math.PI / 2, rotateZ(Math.PI / 2, g))
    : rotateZ(Math.PI / 2, g);
  return translate([site.x, site.y, site.z], oriented);
}

function dividerJoint(width: number, seam: number, floor: number, height: number, clearance: number) {
  const half = width / 2;
  const profile = polygon({ points: [[half - 7, seam + 0.2], [half - 11, seam - 5],
    [half + 11, seam - 5], [half + 7, seam + 0.2]] });
  const extrude = (shape: typeof profile, z: number, length: number) =>
    translate([0, 0, z], jscad.extrusions.extrudeLinear({ height: length }, shape));
  const pocket = jscad.expansions.expand({ delta: clearance, corners: 'chamfer' }, profile);
  // The lead-in grows one millimetre horizontally per millimetre of height
  // when the rear prints floor down. The socket stops at the intact front floor.
  const low = block(half - 12, seam + 0.02, floor + clearance, 24, 0.15, 0.01);
  const high = block(half - 12, seam - 5.01, floor + clearance + 5.05, 24, 5.2, height - floor - clearance - 5.05);
  const ramp = jscad.hulls.hull(low, high);
  return {
    front: subtract(block(0, seam - DIVIDER_DEPTH, floor - 0.1, width, DIVIDER_DEPTH, height - floor + 0.1),
      extrude(pocket, floor, height - floor + 0.1)),
    rear: union(block(0, seam + SEAM_GAP / 2 - 0.01, floor - 0.1, width, 2.4, height - floor + 0.1),
      intersect(ramp, extrude(profile, floor + clearance, height - floor - clearance)))
  };
}
export function createShelfManufacturing(p: ShelfDrawerParams, cards: CardSize[]) {
  const plan = resolveShelfManufacturing(p, cards);
  if (!plan.valid) throw new Error(plan.errors.join(' '));
  const parts = createShelfDrawerParts(p, cards), r = plan.resolved, s = plan.settings;
  const items: ShelfManufacturingItem[] = [], keyGroups = new Map<string, { geometry: Geom3; quantity: number; thickness: number; owner: 'shell' | 'drawer' }>();
  const assembly: { part: ShelfPartId | 'key'; owner: 'shell' | 'drawer' | 'handle'; section: number; geometry: Geom3 }[] = [];
  const add = (id: string, name: string, part: ShelfManufacturingItem['part'], geometry: Geom3, oriented: Geom3, quantity = 1) => {
    items.push({ id, name, part, geometry, quantity, assembledSize: dimensions(geometry), ...fitShelfPrint(oriented, s) });
  };
  for (const part of ['shell', 'drawer'] as const) {
    const dividerDrawer = part === 'drawer' && plan.divider;
    const seated = plan.hybrid || (part === 'shell' && plan.divider);
    const cuts = part === 'shell' ? plan.shellCuts : plan.drawerCuts;
    if (!cuts.length) {
      add(part, part === 'shell' ? 'Shell · whole' : 'Drawer · whole', part, parts[part], shelfPrintGeometry(parts, part));
      assembly.push({ part, owner: part, section: 0, geometry: parts[part] }); continue;
    }
    const sites: KeySite[] = [];
    cuts.forEach((y, seam) => {
      if (part === 'shell') {
        for (const z of [r.bodyHeight * 0.2, r.bodyHeight * 0.8]) {
          sites.push({ id: `s${seam}`, wall: 'side', x: 0, y, z, thickness: r.panelThickness },
            { id: `s${seam}`, wall: 'side', x: r.bodyWidth - r.shellSkin, y, z, thickness: r.shellSkin, outerMax: true });
        }
        for (const x of [r.bodyWidth * 0.2, r.bodyWidth * 0.8]) {
          sites.push({ id: `s${seam}`, wall: 'horizontal', x, y, z: 0, thickness: r.panelThickness },
            { id: `s${seam}`, wall: 'horizontal', x, y, z: r.bodyHeight - r.roofThickness, thickness: r.roofThickness, outerMax: true });
        }
      } else if (!dividerDrawer) {
        for (const z of [p.drawerFloor + 10, r.sideHeight - 10]) {
          sites.push({ id: `d${seam}`, wall: 'side', x: 0, y, z, thickness: p.drawerWall },
            { id: `d${seam}`, wall: 'side', x: r.drawerWidth - p.drawerWall, y, z, thickness: p.drawerWall, outerMax: true });
        }
        if (plan.floorKeys) for (const x of [r.drawerWidth * 0.25, r.drawerWidth * 0.75])
          sites.push({ id: `d${seam}`, wall: 'horizontal', x, y, z: 0, thickness: p.drawerFloor, outerMax: true });
      }
    });
    const pockets = sites.map(site => seated
      ? placeKey(normalGeometry(seatedKey(site.thickness, s.jointClearance, true), site), site)
      : placeKey(flatKey(site.thickness + 0.02, s.jointClearance, true),
        { ...site, ...(site.wall === 'side' ? { x: site.x - 0.01 } : { z: site.z - 0.01 }) }));
    const keyed = pockets.length ? subtract(parts[part], ...pockets) : parts[part];
    const length = part === 'shell' ? p.depth : r.drawerDepth;
    const boundaries = [0, ...cuts, length];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i] + (i ? SEAM_GAP / 2 : 0), end = boundaries[i + 1] - (i < cuts.length ? SEAM_GAP / 2 : 0);
      let g = intersect(keyed, block(-1, start, -1, r.width + 2, end - start, r.height + 2));
      if (plan.hybrid && part === 'drawer') g = lapDrawerSection(keyed, g, i, cuts[0], r.drawerWidth, p.drawerWall, p.drawerFloor, plan.lapWeb,
        plan.floorKeys ? floorKeyBands(r.drawerWidth, s.jointClearance) : []);
      if (dividerDrawer) {
        const joint = dividerJoint(r.drawerWidth, cuts[0], p.drawerFloor, r.sideHeight, s.jointClearance);
        g = union(g, i === 0 ? joint.front : joint.rear);
      }
      // Front shell rests on its opening rim, rear shell on its back.
      // Both mating ends face upward for the two-section shell.
      let oriented = g;
      if (part === 'shell') oriented = rotateX(i === 0 ? Math.PI / 2 : -Math.PI / 2, g);
      else if (plan.hybrid && i === 1) oriented = rotateX(-Math.PI / 2, g);
      add(`${part}-${i + 1}`, `${part === 'shell' ? 'Shell' : 'Drawer'} · section ${i + 1}/${boundaries.length - 1}`, part,
        g, oriented);
      if (dividerDrawer) {
        const coupon = intersect(g, block(-1, cuts[0] - 24, -1, r.drawerWidth + 2, 48, r.drawerHeight + 2));
        add(`divider-test-${i + 1}`, `Divider test · section ${i + 1}`, 'sample', coupon, coupon);
      }
      assembly.push({ part, owner: part, section: i, geometry: g });
    }
    for (const site of sites) {
      const thickness = site.thickness - 0.2;
      const key = seated ? seatedKey(site.thickness, s.jointClearance) : flatKey(thickness, s.jointClearance);
      const groupId = `${seated ? 'seated-key' : 'key'}-${site.thickness.toFixed(3)}`;
      const existing = keyGroups.get(groupId);
      if (existing) existing.quantity++; else keyGroups.set(groupId, { geometry: key, quantity: 1, thickness: site.thickness, owner: part });
      assembly.push({ part: 'key', owner: part, section: cuts.indexOf(site.y), geometry: seated
        ? placeKey(normalGeometry(key, site), site) : placeKey(key, { ...site,
          ...(site.wall === 'side' ? { x: site.x + 0.1 } : { z: site.z + 0.1 }) }) });
    }
  }
  add('handle', 'Handle', 'handle', parts.handle, shelfPrintGeometry(parts, 'handle'));
  assembly.push({ part: 'handle', owner: 'handle', section: 0, geometry: parts.handle });
  if (plan.hybrid) {
    const sampleKeys: [number, 'shell' | 'drawer'][] = [[r.shellSkin, 'shell'], [p.drawerWall, 'drawer']];
    if (plan.floorKeys) sampleKeys.push([p.drawerFloor, 'drawer']);
    for (const [thickness, owner] of sampleKeys) {
      const id = `seated-key-${thickness.toFixed(3)}`;
      if (!keyGroups.has(id)) keyGroups.set(id, { geometry: seatedKey(thickness, s.jointClearance), quantity: 1, thickness, owner });
    }
  }
  for (const [id, group] of keyGroups) {
    const seated = id.startsWith('seated-key-');
    add(id, `${seated ? 'Seated key' : 'Joining key'} · ${group.thickness.toFixed(1)} mm section`, 'key', group.geometry, group.geometry, group.quantity);
    // Low-cost fit samples: same pocket, wall thickness and wall printing direction.
    // A shell sample stands on its longitudinal end; a drawer sample stands on its lower edge.
    const owner = group.owner;
    const pocket = seated ? seatedKey(group.thickness, s.jointClearance, true) : flatKey(group.thickness + 0.02, s.jointClearance, true);
    const plate = subtract(block(-24, -12, -0.01, 48, 24, group.thickness + 0.02), pocket);
    for (const [side, start] of [['A', -24], ['B', SEAM_GAP / 2]] as const) {
      const width = 24 - SEAM_GAP / 2;
      const flat = intersect(plate, block(start, -13, 0, width, 26, group.thickness));
      const oriented = placeKey(flat, { id: '', wall: 'side', x: 0, y: 0, z: 0, thickness: group.thickness });
      add(`sample-${id}-${side}`, `${owner === 'shell' ? 'Shell' : 'Drawer'} joint sample ${side} · ${group.thickness.toFixed(1)} mm`,
        'sample', flat, owner === 'shell' ? rotateX(-Math.PI / 2, oriented) : oriented);
    }
  }
  if (plan.hybrid) {
    const width = plan.sampleWidth, length = 48, seam = length / 2;
    const floorSite: KeySite = { id: 'sample-floor', wall: 'horizontal', x: width / 2, y: seam, z: 0, thickness: p.drawerFloor, outerMax: true };
    const floor = plan.floorKeys ? subtract(block(0, 0, 0, width, length, p.drawerFloor),
      placeKey(normalGeometry(seatedKey(p.drawerFloor, s.jointClearance, true), floorSite), floorSite)) : block(0, 0, 0, width, length, p.drawerFloor);
    const bands = plan.floorKeys ? floorKeyBands(width, s.jointClearance, [width / 2]) : [];
    for (let i = 0; i < 2; i++) {
      const basic = intersect(floor, block(-1, i ? seam + SEAM_GAP / 2 : 0, -1,
        width + 2, seam - SEAM_GAP / 2, p.drawerFloor + 2));
      // Samples use the exact same lap helper and 3 mm edge bands as the real drawer.
      const g = lapDrawerSection(floor, basic, i, seam, width, p.drawerWall, p.drawerFloor, plan.lapWeb, bands);
      add(`sample-floor-${i ? 'B' : 'A'}`, `Floor lap sample ${i ? 'B · rear end down' : 'A · floor down'}`,
        'sample', g, i ? rotateX(-Math.PI / 2, g) : g);
    }
    const side = block(0, 0, p.drawerFloor, p.drawerWall, length, 30 - p.drawerFloor);
    const site: KeySite = { id: 'corner', wall: 'side', x: 0, y: seam, z: p.drawerFloor + 14, thickness: p.drawerWall };
    const corner = subtract(union(floor, side), placeKey(seatedKey(p.drawerWall, s.jointClearance, true), site));
    for (let i = 0; i < 2; i++) {
      const basic = intersect(corner, block(-1, i ? seam + SEAM_GAP / 2 : 0, -1,
        width + 2, seam - SEAM_GAP / 2, 32));
      const g = lapDrawerSection(corner, basic, i, seam, width, p.drawerWall, p.drawerFloor, plan.lapWeb, bands);
      add(`sample-corner-${i ? 'B' : 'A'}`, `C+F corner sample ${i ? 'B · rear end down' : 'A · floor down'}`,
        'sample', g, i ? rotateX(-Math.PI / 2, g) : g);
    }
  }
  return { ...plan, items, assembly, drawerOffset: parts.drawerOffset };
}

/** Replacement for the rear of an already printed 390 mm divider drawer. */
export function shelfDividerRearReplacement(p: ShelfDrawerParams, cards: CardSize[]) {
  const plan = resolveShelfManufacturing(p, cards);
  if (!plan.valid || !plan.divider || p.depth !== 390 || plan.drawerCuts.length !== 1)
    throw new Error('Select the original split 390 mm divider drawer.');
  const target = createShelfDrawerParts({ ...p, depth: 380 }, cards);
  const seam = plan.drawerCuts[0];
  const start = seam + SEAM_GAP / 2;
  const r = plan.resolved;
  const body = intersect(target.drawer, block(-1, start, -1, r.width + 2,
    target.resolved.drawerDepth - start, r.height + 2));
  const joint = dividerJoint(r.drawerWidth, seam, p.drawerFloor, r.sideHeight, plan.settings.jointClearance);
  return fitShelfPrint(union(body, joint.rear), plan.settings);
}

export function shelfClosedFrontSample(p: ShelfDrawerParams, cards: CardSize[]) {
  const parts = createShelfDrawerParts({ ...p, labelWindow: false }, cards);
  const r = parts.resolved;
  const depth = Math.min(r.drawerDepth, Math.max(25, r.frontReserve + 5));
  const sample = intersect(parts.drawer, block(-1, -1, -1, r.drawerWidth + 2, depth + 1, r.drawerHeight + 2));
  return { geometry: sample, ...fitShelfPrint(sample, { ...defaultShelfManufacturing, ...p.manufacturing }) };
}

export function shelfCornerSamplePlate(model: ReturnType<typeof createShelfManufacturing>) {
  if (!model.hybrid) throw new Error('Select C+F to export the corner test set.');
  const ids = ['sample-corner-A', 'sample-corner-B', `seated-key-${model.drawerWall.toFixed(3)}`];
  if (model.floorKeys) ids.push(`seated-key-${model.drawerFloor.toFixed(3)}`);
  const selected = ids.map(id => model.items.find(i => i.id === id));
  if (selected.some(i => !i)) throw new Error('Corner test set is unavailable for this configuration.');
  const { settings: s } = model;
  let x = s.margin, y = s.margin, rowDepth = 0;
  return selected.map(item => {
    if (!item!.fits) throw new Error('A test part exceeds the configured print volume.');
    const [w, d] = item!.size;
    if (x + w > s.bedWidth - s.margin + 1e-6) { x = s.margin; y += rowDepth + 4; rowDepth = 0; }
    if (y + d > s.bedDepth - s.margin + 1e-6) throw new Error('The test set does not fit one plate. Export samples individually.');
    const geometry = translate([x, y, 0], item!.printGeometry);
    x += w + 4; rowDepth = Math.max(rowDepth, d);
    return geometry;
  });
}

function lapDrawerSection(source: Geom3, basic: Geom3, section: number, seam: number,
  width: number, wall: number, floor: number, web: number, keepBands: [number, number][] = []) {
  const edge = wall + 1, half = LAP_LENGTH / 2;
  const spans: [number, number][] = [];
  let start = edge;
  for (const [left, right] of [...keepBands].sort((a, b) => a[0] - b[0])) {
    if (left > start) spans.push([start, Math.min(left, width - edge)]);
    start = Math.max(start, right);
  }
  if (start < width - edge) spans.push([start, width - edge]);
  const valid = spans.filter(([a, b]) => b - a > 1e-6);
  if (!valid.length) return basic;
  const cuts = valid.map(([x, end]) => section === 0
    ? block(x, seam - half - SEAM_GAP / 2, web, end - x, half + 1, floor - web + 0.01)
    : block(x, seam - 1, -0.01, end - x, half + 1 + SEAM_GAP / 2, web + LAP_GAP + 0.01));
  const tongues = valid.map(([x, end]) => intersect(source, section === 0
    ? block(x, seam - SEAM_GAP / 2 - 0.01, 0, end - x, half + 0.01, web)
    : block(x, seam - half + SEAM_GAP / 2, web + LAP_GAP, end - x, half + 0.01, floor - web - LAP_GAP)));
  return union(subtract(basic, ...cuts), ...tongues);
}

function floorKeyBands(width: number, clearance: number, centers = [width * 0.25, width * 0.75]): [number, number][] {
  // Full-depth material continues at least 1.5 mm beyond each head pocket.
  const reach = KEY_HEIGHT + clearance + 1.5;
  return centers.map(x => [x - reach, x + reach]);
}

function combined(geometries: Geom3[]) {
  return jscad.geometries.geom3.create(geometries.flatMap(g => jscad.geometries.geom3.toPolygons(g)
    .map(poly => ({ ...poly, color: g.color }))));
}
export function shelfJointPreview(model: ReturnType<typeof createShelfManufacturing>, separation: number, cotes?: ShelfPreviewCote[]) {
  const travel = Math.max(0, Math.min(50, separation));
  const geoms = model.assembly.map(item => {
    const offset: [number, number, number] = item.owner === 'shell' ? [0, 0, 0]
      : [...model.drawerOffset];
    if (item.owner !== 'shell') offset[0] += model.resolved.width + 30;
    offset[1] += travel * (item.section + (item.part === 'key' ? 0.5 : 0));
    const color: [number, number, number, number] = item.part === 'key' ? [0.95, 0.64, 0.25, 1] : item.owner === 'shell'
      ? (item.section % 2 ? [0.38, 0.53, 0.66, 1] : [0.2, 0.3, 0.43, 1])
      : [0.52, 0.65, 0.76, 1];
    const placed = translate(offset, item.geometry);
    if (cotes && item.part !== 'key') {
      const name = item.part === 'handle' ? 'Handle' : `${item.part === 'shell' ? 'Shell' : 'Drawer'} ${item.section + 1}`;
      cotes.push({ part: name, bounds: jscad.measurements.measureBoundingBox(placed) });
    }
    return jscad.colors.colorize(color, placed);
  });
  return combined(geoms);
}
export function shelfCornerAssemblyPreview(model: ReturnType<typeof createShelfManufacturing>, separation: number) {
  const front = model.items.find(i => i.id === 'sample-corner-A');
  const rear = model.items.find(i => i.id === 'sample-corner-B');
  const key = model.items.find(i => i.id === `seated-key-${model.drawerWall.toFixed(3)}`);
  if (!front || !rear || !key) throw new Error('Select C+F to view the corner samples.');
  const travel = Math.max(0, Math.min(50, separation));
  const site: KeySite = { id: 'sample', wall: 'side', x: 0, y: 24, z: model.lapWeb * 2 + model.lapGap + 14, thickness: model.drawerWall };
  const geometries = [
    jscad.colors.colorize([0.2, 0.3, 0.43, 1], front.geometry),
    jscad.colors.colorize([0.52, 0.65, 0.76, 1], translate([0, travel, 0], rear.geometry)),
    jscad.colors.colorize([0.95, 0.64, 0.25, 1], translate([-travel / 2, travel / 2, 0], placeKey(key.geometry, site)))
  ];
  if (model.floorKeys) {
    const floorKey = model.items.find(i => i.id === `seated-key-${model.drawerFloor.toFixed(3)}`)!;
    const floorSite: KeySite = { id: 'sample-floor', wall: 'horizontal', x: model.sampleWidth / 2, y: 24, z: 0, thickness: model.drawerFloor, outerMax: true };
    geometries.push(jscad.colors.colorize([0.95, 0.64, 0.25, 1], translate([0, travel / 2, travel / 2], placeKey(normalGeometry(floorKey.geometry, floorSite), floorSite))));
  }
  return combined(geometries);
}
export function shelfBedPreview(item: ShelfManufacturingItem, s: ShelfManufacturingSettings) {
  const frame = (x: number, y: number, w: number, d: number, thickness: number) => subtract(
    block(x, y, -0.4, w, d, 0.3), block(x + thickness, y + thickness, -0.5, w - 2 * thickness, d - 2 * thickness, 0.5));
  const bed = jscad.colors.colorize([0.4, 0.48, 0.55, 1], frame(0, 0, s.bedWidth, s.bedDepth, 1));
  const margin = jscad.colors.colorize([0.45, 0.7, 0.5, 1], frame(s.margin, s.margin,
    s.bedWidth - 2 * s.margin, s.bedDepth - 2 * s.margin, 0.5));
  const part = jscad.colors.colorize(item.fits ? [0.52, 0.65, 0.76, 1] : [0.9, 0.3, 0.25, 1],
    translate([s.margin, s.margin, 0], item.printGeometry));
  return combined([bed, margin, part]);
}

export function shelfManufacturingSets(model: ReturnType<typeof createShelfManufacturing>) {
  return (['shell', 'drawer', 'handle'] as const).map(part => {
    const items = model.items.filter(item => item.part === part);
    const pieces = items.map(item => ({ name: item.name, geometry: item.printGeometry, size: item.size, key: false }));
    if (part !== 'handle') {
      const keys = model.assembly.filter(item => item.part === 'key' && item.owner === part);
      for (const item of model.items.filter(item => item.part === 'key')) {
        const count = keys.filter(key => {
          const size = dimensions(key.geometry);
          return Math.abs(Math.min(...size) - item.size[2]) < 0.001;
        }).length;
        for (let i = 0; i < count; i++) pieces.push({
          name: item.name, geometry: item.printGeometry, size: item.size, key: true
        });
      }
    }
    // Shared preview/export layout. Keep distinct objects and their bed orientation.
    const s = model.settings, width = s.bedWidth - 2 * s.margin, depth = s.bedDepth - 2 * s.margin;
    let x = s.margin, y = s.margin, rowDepth = 0, plate = 0;
    const placed = [...pieces].sort((a, b) => b.size[1] - a.size[1]).map(piece => {
      if (x > s.margin && x + piece.size[0] > s.margin + width) {
        x = s.margin; y += rowDepth + 6; rowDepth = 0;
      }
      if (y + piece.size[1] > s.margin + depth && y > s.margin) {
        plate++; x = s.margin; y = s.margin; rowDepth = 0;
      }
      const geometry = translate([x + plate * (s.bedWidth + 20), y, 0], piece.geometry);
      x += piece.size[0] + 6;
      rowDepth = Math.max(rowDepth, piece.size[1]);
      return { ...piece, geometry, plateIndex: plate, bounds: jscad.measurements.measureBoundingBox(geometry) };
    });
    return {
      id: `set-${part}`, name: part === 'shell' ? 'Shell' : part === 'drawer' ? 'Drawer' : 'Handle',
      part, items, pieces: placed, plates: plate + 1,
      fits: items.every(item => item.fits),
      geometry: combined(placed.map((piece, index) => {
        const color: [number, number, number] | [number, number, number, number] = piece.key ? [0.95, 0.64, 0.25, 1]
          : part === 'handle' ? (piece.geometry.color ?? [0.87, 0.59, 0.34, 1])
          : index % 2 ? [0.52, 0.65, 0.76, 1] : [0.28, 0.39, 0.51, 1];
        return jscad.colors.colorize(color, piece.geometry);
      }))
    };
  });
}
