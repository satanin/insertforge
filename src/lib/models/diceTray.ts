import jscad from '@jscad/modeling';
import type { DiceKind } from '$lib/types/project';
import type { CounterStack } from './counterTray';
import { getDieFootprint, getDieMesh } from './diceGeometry';
import { createOuterBody, getOuterCornerRadius } from './outerCorners';
import { createBoxWithLidGrooves, createLid, defaultLidParams } from './lid';
import { createDiceLidText } from './diceLidText';

export interface DiceTrayGroup { id: string; projectDiceSizeId?: string; diceKind: DiceKind; size: number; count: number }
export function getDiceTrayGroups(p: DiceTrayParams): DiceTrayGroup[] {
  return p.groups ?? [{ id: 'legacy-dice', diceKind: p.diceKind, size: p.size, count: p.count }];
}
export function getDiceExposure(p: DiceTrayParams, height: number): number {
  if (p.exposedPercent !== undefined) return height * p.exposedPercent / 100;
  if (p.minimumExposure === undefined) return height * 0.4;
  // Keep the old mm control readable for saved experimental trays.
  return Math.min(height * 0.6, Math.max(p.minimumExposure ?? 6, height * 0.35));
}
export function getDicePocketWallHeight(p: DiceTrayParams, height: number): number {
  if (p.exposedPercent !== undefined) return height - getDiceExposure(p, height);
  return Math.min(p.pocketDepth, height - getDiceExposure(p, height));
}
function getSharedDepth(p: DiceTrayParams) {
  return Math.min(...getDiceTrayGroups(p).map(g => {
    const h = getDieMesh(g.diceKind, g.size).height;
    return getDicePocketWallHeight(p, h);
  }));
}
export function getDiceTrayCommonWallHeight(p: DiceTrayParams) {
  return Math.max(...getDiceTrayGroups(p).map(g => getDicePocketWallHeight(p, getDieMesh(g.diceKind, g.size).height)));
}
function getHighestDieTop(p: DiceTrayParams) {
  return p.floorThickness + Math.max(...getDiceTrayGroups(p).map(g => getDieMesh(g.diceKind, g.size).height));
}

export function getDicePocketShape(p: DiceTrayParams) {
  const shape = jscad.primitives.polygon({ points: getDieFootprint(p.diceKind, p.size) });
  const pocket = p.clearance > 0 ? jscad.expansions.offset({ delta: p.clearance / 2, corners: p.diceKind === 'd6' ? 'edge' : 'round', segments: 32 }, shape) : shape;
  const radius = getDiceNotchRadius(p, p.size);
  if (!radius || p.mode !== 'individual') return pocket;
  // Intersect the silhouette with Y=0 so the round recess always joins the pocket,
  // including triangular/asymmetric projections, without extending beyond its cell in Y.
  const outline = jscad.geometries.geom2.toPoints(pocket);
  const crossings: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    if ((a[1] <= 0 && b[1] >= 0) || (b[1] <= 0 && a[1] >= 0)) {
      if (Math.abs(b[1] - a[1]) < 1e-9) crossings.push(a[0], b[0]);
      else crossings.push(a[0] + (b[0] - a[0]) * -a[1] / (b[1] - a[1]));
    }
  }
  return jscad.booleans.union(pocket, jscad.primitives.circle({ radius, center: [Math.min(...crossings), 0], segments: 32 }));
}

export function getDiceNotchRadius(p: DiceTrayParams, size: number) {
  return p.mode === 'individual' && p.fingerNotchEnabled !== false ? Math.min((p.fingerNotchDiameter ?? 0) / 2, (size + p.clearance) / 2) : 0;
}

export function getDiceTrayLayout(p: DiceTrayParams) {
  const layout = getDiceTrayPackedLayout(p);
  if (p.mode !== 'individual' || !(p.asBox || p.lid)) return distributeDiceRows(p, layout);
  // Keep a retaining ledge between every cavity (including its notch) and
  // the inside face of the enclosing wall, independently of wall thickness.
  const bounds = layout.items.map(item => {
    const [min, max] = jscad.measurements.measureBoundingBox(getDicePocketShape({ ...p, diceKind: item.group.diceKind, size: item.group.size }));
    return { minX: item.x + min[0], maxX: item.x + max[0], minY: item.y + min[1], maxY: item.y + max[1] };
  });
  const margin = p.wallThickness + 1.5;
  const dx = Math.max(0, margin - Math.min(...bounds.map(b => b.minX)));
  const dy = Math.max(0, margin - Math.min(...bounds.map(b => b.minY)));
  return distributeDiceRows(p, { width: Math.max(layout.width + dx, Math.max(...bounds.map(b => b.maxX)) + dx + margin),
    depth: Math.max(layout.depth + dy, Math.max(...bounds.map(b => b.maxY)) + dy + margin),
    items: layout.items.map(item => ({ ...item, x: item.x + dx, y: item.y + dy })) });
}

function distributeDiceRows(p: DiceTrayParams, layout: ReturnType<typeof getDiceTrayPackedLayout>) {
  if (!p.diceSpacing && !p.minimumWidth && !p.minimumDepth) return layout;
  const width = Math.max(layout.width, p.minimumWidth ?? 0), depth = Math.max(layout.depth, p.minimumDepth ?? 0);
  const columns = Math.min(p.columns, layout.items.length), rows = Math.ceil(layout.items.length / columns);
  const margin = p.wallThickness + (p.mode === 'individual' && (p.asBox || p.lid) ? 1.5 : 0);
  const items = layout.items.map(item => ({ ...item }));
  for (let start = 0; start < items.length; start += columns) {
    const row = items.slice(start, start + columns);
    const bounds = row.map(item => jscad.measurements.measureBoundingBox(getDicePocketShape({ ...p, diceKind: item.group.diceKind, size: item.group.size })));
    const left = Math.min(...row.map((item, i) => item.x + bounds[i][0][0]));
    const right = Math.max(...row.map((item, i) => item.x + bounds[i][1][0]));
    const spare = Math.max(0, width - 2 * margin - (right - left));
    row.forEach((item, i) => {
      item.x += margin - left + (row.length === 1 ? spare / 2 : spare * i / (row.length - 1));
      const extraDepth = depth - layout.depth;
      item.y += rows === 1 ? extraDepth / 2 : extraDepth * (start / columns) / (rows - 1);
    });
  }
  return { width, depth, items };
}

function getDiceTrayPackedLayout(p: DiceTrayParams) {
  if (p.diceSpacing) return getDiceTraySpacedLayout(p);
  const groups = getDiceTrayGroups(p);
  const dice = groups.flatMap(group => Array.from({ length: group.count }, () => group));
  const columns = Math.min(p.columns, dice.length);
  const gapX = (p.mode === 'individual' ? p.wallThickness : 0) + (p.spacingX ?? 0);
  const gapY = (p.mode === 'individual' ? p.wallThickness : 0) + (p.spacingY ?? 0);
  if (!p.compactLayout) {
    const cell = Math.max(...groups.map(g => g.size)) + p.clearance;
    const notch = getDiceNotchRadius(p, Math.max(...groups.map(g => g.size)));
    const rows = Math.ceil(dice.length / columns);
    return { width: columns * (cell + notch) + (columns - 1) * gapX + 2 * p.wallThickness,
      depth: rows * cell + (rows - 1) * gapY + 2 * p.wallThickness,
      items: dice.map((group, i) => ({ group, x: p.wallThickness + notch + cell / 2 + (i % columns) * (cell + notch + gapX),
        y: p.wallThickness + cell / 2 + Math.floor(i / columns) * (cell + gapY) })) };
  }
  const bounds = new Map<string, [[number, number, number], [number, number, number]]>();
  const footprints = dice.map(group => {
    const key = `${group.diceKind}:${group.size}`;
    if (!bounds.has(key)) bounds.set(key, jscad.measurements.measureBoundingBox(getDicePocketShape({ ...p, diceKind: group.diceKind, size: group.size })));
    const [min, max] = bounds.get(key)!;
    return { group, min, max, width: max[0] - min[0], depth: max[1] - min[1] };
  });
  const items: { group: DiceTrayGroup; x: number; y: number }[] = [];
  let innerWidth = 0, cursorY = p.wallThickness;
  for (let start = 0; start < footprints.length; start += columns) {
    const row = footprints.slice(start, start + columns);
    const rowDepth = Math.max(...row.map(item => item.depth));
    let cursorX = p.wallThickness;
    for (const item of row) {
      items.push({ group: item.group, x: cursorX - item.min[0], y: cursorY + rowDepth / 2 - (item.min[1] + item.max[1]) / 2 });
      cursorX += item.width + gapX;
    }
    innerWidth = Math.max(innerWidth, cursorX - p.wallThickness - gapX);
    cursorY += rowDepth + gapY;
  }
  return { width: innerWidth + 2 * p.wallThickness, depth: cursorY - gapY + p.wallThickness, items };
}

function dieBounds(group: DiceTrayGroup) {
  const points = getDieFootprint(group.diceKind, group.size);
  return { minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
    minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])) };
}

function getDiceTraySpacedLayout(p: DiceTrayParams) {
  const dice = getDiceTrayGroups(p).flatMap(group => Array.from({ length: group.count }, () => {
    const [min, max] = jscad.measurements.measureBoundingBox(getDicePocketShape({ ...p, diceKind: group.diceKind, size: group.size }));
    return { group, die: dieBounds(group), min, max };
  }));
  const columns = Math.min(p.columns, dice.length), wall = p.mode === 'individual' ? p.wallThickness : 0;
  const items: { group: DiceTrayGroup; x: number; y: number }[] = [];
  let maxX = p.wallThickness, maxY = p.wallThickness, previousDieY = 0, previousCutY = 0;
  for (let start = 0; start < dice.length; start += columns) {
    const row = dice.slice(start, start + columns);
    const cutMinY = Math.min(...row.map(item => item.min[1])), cutMaxY = Math.max(...row.map(item => item.max[1]));
    const dieMinY = Math.min(...row.map(item => item.die.minY)), dieMaxY = Math.max(...row.map(item => item.die.maxY));
    const y = start === 0 ? p.wallThickness - cutMinY : Math.max(previousDieY + p.diceSpacing!.y - dieMinY, previousCutY + wall - cutMinY);
    let previous: typeof row[number] | null = null, previousX = 0;
    for (const item of row) {
      const x = previous ? Math.max(previousX + previous.die.maxX + p.diceSpacing!.x - item.die.minX,
        previousX + previous.max[0] + wall - item.min[0]) : p.wallThickness - item.min[0];
      items.push({ group: item.group, x, y });
      maxX = Math.max(maxX, x + item.max[0]);
      previous = item; previousX = x;
    }
    previousDieY = y + dieMaxY; previousCutY = y + cutMaxY;
    maxY = Math.max(maxY, previousCutY);
  }
  return { width: maxX + p.wallThickness, depth: maxY + p.wallThickness, items };
}

export function getDiceTrayMeasuredSpacing(p: DiceTrayParams) {
  const layout = getDiceTrayLayout(p), columns = Math.min(p.columns, layout.items.length);
  const boxes = layout.items.map(item => ({ ...item, bounds: dieBounds(item.group) }));
  const xs: number[] = [], ys: number[] = [];
  let previousRowMax: number | null = null;
  for (let start = 0; start < boxes.length; start += columns) {
    const row = boxes.slice(start, start + columns);
    for (let i = 1; i < row.length; i++) xs.push(row[i].x + row[i].bounds.minX - row[i - 1].x - row[i - 1].bounds.maxX);
    const min = Math.min(...row.map(item => item.y + item.bounds.minY)), max = Math.max(...row.map(item => item.y + item.bounds.maxY));
    if (previousRowMax !== null) ys.push(min - previousRowMax);
    previousRowMax = max;
  }
  return { x: xs.length ? Math.min(...xs) : null, y: ys.length ? Math.min(...ys) : null };
}

export function getDiceTrayPositions(p: DiceTrayParams): CounterStack[] {
  const layout = getDiceTrayLayout(p);
  const commonWall = p.mode === 'individual' ? getDiceTrayCommonWallHeight(p) : 0;
  return layout.items.map(({ group: g, x, y }) => {
    const height = getDieMesh(g.diceKind, g.size).height;
    return {
    diceKind: g.diceKind, dieSize: g.size, shape: 'square',
    x, y,
    z: p.floorThickness + (p.mode === 'individual' ? Math.max(0, commonWall - getDicePocketWallHeight(p, height)) : 0), width: g.size, length: g.size, thickness: height,
    count: 1, hexPointyTop: false, color: '#e9c678'
  } as CounterStack; });
}

export interface DiceTrayParams {
  minimumWidth?: number;
  minimumDepth?: number;
  diceSpacing?: { x: number; y: number };
  spacingX?: number;
  spacingY?: number;
  compactLayout?: boolean;
  lidType?: 'removable' | 'sliding';
  lidTextEnabled?: boolean;
  lidText?: string;
  lidTextMode?: 'engraved' | 'inlay' | 'raised';
  lidTextColor?: string;
  exposedPercent?: number;
  outerCornerRadius?: number;
  asBox?: boolean;
  stackingClearance?: number;
  lid?: boolean;
  lidThickness?: number;
  lidClearance?: number;
  fingerNotchDiameter?: number; // 0/missing preserves existing pockets
  fingerNotchEnabled?: boolean;
  groups?: DiceTrayGroup[];
  minimumExposure?: number;
  mode: 'individual' | 'compartment';
  diceKind: DiceKind;
  size: number;
  count: number;
  columns: number;
  clearance: number;
  wallThickness: number;
  floorThickness: number;
  pocketDepth: number;
}
export const defaultDiceTrayParams: DiceTrayParams = {
  diceSpacing: { x: 1, y: 1 },
  spacingX: 0, spacingY: 0, compactLayout: true,
  lidType: 'removable', lidTextEnabled: false, lidTextMode: 'engraved', lidTextColor: '#202020',
  exposedPercent: 40,
  outerCornerRadius: 3, asBox: false, stackingClearance: 2, lid: false, lidThickness: 2, lidClearance: 0.3,
  fingerNotchDiameter: 10,
  mode: 'individual', diceKind: 'd6', size: 16, count: 6, columns: 3,
  clearance: 1, wallThickness: 2, floorThickness: 2, pocketDepth: 12
};
export function getDiceTrayBaseDimensions(p: DiceTrayParams) {
  const layout = getDiceTrayLayout(p);
  return { width: layout.width, depth: layout.depth,
    height: p.floorThickness + (p.mode === 'compartment' ? getSharedDepth(p) : getDiceTrayCommonWallHeight(p)) };
}
export function getDiceTrayBodyDimensions(p: DiceTrayParams) {
  const base = getDiceTrayBaseDimensions(p);
  if (!p.asBox && !p.lid) return base;
  const highestDie = getHighestDieTop(p);
  return { ...base, height: Math.max(base.height, highestDie + (p.stackingClearance ?? 2) + (p.lid && p.lidType === 'sliding' ? p.wallThickness : 0)) };
}
export function getDiceTrayMinimumWallThickness(p: DiceTrayParams) {
  return p.lid && p.lidType === 'sliding' ? Math.max(3, Math.ceil(2 * ((p.lidClearance ?? 0.3) + 1.1) * 10) / 10) : 0.1;
}
export function getDiceTrayCornerRadius(p: DiceTrayParams) {
  const d = getDiceTrayBaseDimensions(p);
  return getOuterCornerRadius(p.outerCornerRadius, d.width, d.depth, p.lid && p.lidType === 'sliding' ? Math.max(0, p.wallThickness / 2 - (p.lidClearance ?? 0.3)) : p.wallThickness);
}
function slidingBox(p: DiceTrayParams): import('$lib/types/project').Box {
  const d = getDiceTrayBodyDimensions(p);
  return { id: 'dice-shell', name: '', trays: [], wallThickness: p.wallThickness, floorThickness: p.floorThickness,
    tolerance: p.clearance, fillSolidEmpty: false, customWidth: d.width, customDepth: d.depth, customBoxHeight: d.height,
    lidParams: { ...defaultLidParams, thickness: p.lidThickness ?? 2, showName: false } };
}
export function getDiceTrayDimensions(p: DiceTrayParams) {
  const body = getDiceTrayBodyDimensions(p);
  return { ...body, height: body.height + (p.lid ? p.lidThickness ?? 2 : 0) + (p.lid && p.lidTextEnabled && p.lidTextMode === 'raised' ? 0.6 : 0) };
}
export function validateDiceTray(p: DiceTrayParams): boolean {
  if ([p.minimumWidth, p.minimumDepth].some(value => value !== undefined && (!Number.isFinite(value) || value < 0 || value > 600))) return false;
  if (p.diceSpacing && [p.diceSpacing.x, p.diceSpacing.y].some(value => !Number.isFinite(value) || value < 0 || value > 600)) return false;
  if ([p.spacingX, p.spacingY].some(value => value !== undefined && (!Number.isFinite(value) || value < 0 || value > 600))) return false;
  if ((p.lidType !== undefined && !['removable', 'sliding'].includes(p.lidType)) ||
    (p.lidTextMode !== undefined && !['engraved', 'inlay', 'raised'].includes(p.lidTextMode)) ||
    (p.lidText !== undefined && (typeof p.lidText !== 'string' || p.lidText.length > 100)) ||
    (p.lidTextColor !== undefined && !/^#[\da-f]{6}$/i.test(p.lidTextColor)) || p.wallThickness < getDiceTrayMinimumWallThickness(p)) return false;
  if (p.exposedPercent !== undefined && (!Number.isFinite(p.exposedPercent) || p.exposedPercent < 10 || p.exposedPercent > 80)) return false;
  for (const [value, min, max] of [[p.outerCornerRadius, 0, 100], [p.stackingClearance, 0.5, 100], [p.lidThickness, 0.5, 20], [p.lidClearance, 0.05, 2]])
    if (value !== undefined && (!Number.isFinite(value) || value < min! || value > max!)) return false;
  if (p.fingerNotchDiameter !== undefined && (!Number.isFinite(p.fingerNotchDiameter) || p.fingerNotchDiameter < 0 || p.fingerNotchDiameter > 40)) return false;
  const groups = getDiceTrayGroups(p);
  if (!groups.length || groups.length > 100 || new Set(groups.map(g => g.id)).size !== groups.length ||
    groups.some(g => !['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].includes(g.diceKind) || !Number.isFinite(g.size) || g.size < 0.1 || g.size > 600 || !Number.isInteger(g.count) || g.count < 1) ||
    groups.reduce((n, g) => n + g.count, 0) > 100 ||
    (p.groups !== undefined && p.count !== groups.reduce((n, g) => n + g.count, 0)) ||
    (p.minimumExposure !== undefined && (!Number.isFinite(p.minimumExposure) || p.minimumExposure < 1 || p.minimumExposure > 100))) return false;
  return ['individual', 'compartment'].includes(p.mode) && ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].includes(p.diceKind) &&
    [p.size, p.wallThickness, p.floorThickness, p.pocketDepth].every(n => Number.isFinite(n) && n >= 0.1 && n <= 600) &&
    Number.isFinite(p.clearance) && p.clearance >= 0 && p.clearance <= 20 &&
    Number.isInteger(p.count) && p.count >= 1 && p.count <= 100 &&
    Number.isInteger(p.columns) && p.columns >= 1 && p.columns <= 100;
}
export function createDiceTrayBody(p: DiceTrayParams) {
  if (!validateDiceTray(p)) throw new Error('Invalid dice tray measurements.');
  const { cuboid } = jscad.primitives;
  const { width, depth, height } = getDiceTrayBaseDimensions(p);
  const radius = getDiceTrayCornerRadius(p);
  const body = createOuterBody(width, depth, height, radius, radius);
  const bodyHeight = getDiceTrayBodyDimensions(p).height;
  const shellHeight = bodyHeight - p.floorThickness;
  const shell = p.asBox || p.lid ? jscad.transforms.translate([0, 0, p.floorThickness], jscad.booleans.subtract(
    createOuterBody(width, depth, shellHeight, p.outerCornerRadius, p.wallThickness),
    cuboid({ size: [width - 2 * p.wallThickness, depth - 2 * p.wallThickness, shellHeight + 0.2], center: [width / 2, depth / 2, shellHeight / 2] })
  )) : null;
  const finish = (base: ReturnType<typeof createOuterBody>) => {
    if (p.lid && p.lidType === 'sliding') {
      const grooved = createBoxWithLidGrooves(slidingBox(p), [], [], undefined, { clearance: p.lidClearance ?? 0.3, slideAlong: 'y', lockEnabled: false })!;
      const clipped = jscad.booleans.intersect(grooved, createOuterBody(width, depth, bodyHeight, radius, radius));
      const inside = jscad.booleans.intersect(base, cuboid({ size: [width - 2 * p.wallThickness, depth - 2 * p.wallThickness, height + 0.2], center: [width / 2, depth / 2, height / 2] }));
      return jscad.booleans.union(clipped, inside);
    }
    return shell ? jscad.booleans.union(base, shell) : base;
  };
  const cutHeight = height - p.floorThickness + 0.1, z = p.floorThickness + cutHeight / 2;
  if (p.mode === 'compartment') return finish(jscad.booleans.subtract(body,
    cuboid({ size: [width - 2 * p.wallThickness, depth - 2 * p.wallThickness, cutHeight], center: [width / 2, depth / 2, z] })));
  const positions = getDiceTrayPositions(p);
  const cuts = positions.map(pos => {
    const socket = jscad.extrusions.extrudeLinear({ height: height - pos.z + 0.1 }, getDicePocketShape({ ...p, diceKind: pos.diceKind!, size: pos.dieSize! }));
    return jscad.transforms.translate([pos.x, pos.y, pos.z], socket);
  });
  return finish(jscad.booleans.subtract(body, ...cuts));
}

let dicePartsCache: { key: string; parts: import('./cardStorageTray').CardStoragePart[] } | null = null;
export function createDiceTrayParts(p: DiceTrayParams, trayName = ''): import('./cardStorageTray').CardStoragePart[] {
  const key = JSON.stringify([p, trayName]);
  if (dicePartsCache?.key !== key) dicePartsCache = { key, parts: buildDiceTrayParts(p, trayName) };
  return dicePartsCache.parts.map(part => ({ ...part }));
}
function buildDiceTrayParts(p: DiceTrayParams, trayName: string): import('./cardStorageTray').CardStoragePart[] {
  const body = createDiceTrayBody(p);
  const parts: import('./cardStorageTray').CardStoragePart[] = [{ id: 'body', name: 'Dice Tray', geometry: body, assembled: body }];
  if (!p.lid) return parts;
  const d = getDiceTrayBodyDimensions(p), thickness = p.lidThickness ?? 2;
  const clearance = Math.min(p.lidClearance ?? 0.3, (d.width - 2 * p.wallThickness) / 8, (d.depth - 2 * p.wallThickness) / 8);
  const inset = p.wallThickness + clearance;
  const innerWidth = d.width - 2 * inset, innerDepth = d.depth - 2 * inset;
  const rimWidth = Math.min(1, innerWidth / 4, innerDepth / 4);
  const highest = getHighestDieTop(p);
  const rimDepth = Math.min(2, (d.height - highest) / 2);
  const plate = createOuterBody(d.width, d.depth, thickness, p.outerCornerRadius, p.wallThickness);
  const rim = jscad.transforms.translate([inset, inset, thickness], jscad.booleans.subtract(
    createOuterBody(innerWidth, innerDepth, rimDepth, 0, 0),
    jscad.primitives.cuboid({ size: [innerWidth - 2 * rimWidth, innerDepth - 2 * rimWidth, rimDepth + 0.2], center: [innerWidth / 2, innerDepth / 2, rimDepth / 2] })
  ));
  let lid = p.lidType === 'sliding' ? createLid(slidingBox(p), [], [], { clearance: p.lidClearance ?? 0.3, plateThickness: thickness, slideAlong: 'y', lockEnabled: false })! : jscad.booleans.union(plate, rim);
  const radius = getDiceTrayCornerRadius(p);
  if (p.lidType === 'sliding' && radius > 0) lid = jscad.booleans.intersect(lid, createOuterBody(d.width, d.depth, p.wallThickness + thickness, radius, radius));
  const pose = (g: typeof lid) => p.lidType === 'sliding'
    ? jscad.transforms.translate([d.width, 0, d.height + thickness], jscad.transforms.rotateY(Math.PI, g))
    : jscad.transforms.translate([0, d.depth, d.height + thickness], jscad.transforms.rotateX(Math.PI, g));
  const assembledText = createDiceLidText(p, trayName, d.width, d.depth, d.height + thickness);
  const mode = p.lidTextMode ?? 'engraved';
  const text = assembledText ? pose(assembledText) : null;
  if (text && mode !== 'raised') lid = jscad.booleans.subtract(lid, text);
  const assembled = pose(lid);
  // Raised lettering prints facing up. The locating rim/rails are the bed side.
  const printPose = (g: typeof lid) => {
    if (!text || mode !== 'raised') return g;
    const upright = pose(g);
    const minZ = jscad.measurements.measureBoundingBox(assembled)[0][2];
    return jscad.transforms.translate([0, 0, -minZ], upright);
  };
  parts.push({ id: 'lid', name: 'Lid', geometry: printPose(lid), assembled,
    ...(text && mode !== 'engraved' ? { text: printPose(text), assembledText: assembledText! } : {}) });
  return parts;
}

export function createDiceTray(p: DiceTrayParams, trayName = '', bodyColor?: string) {
  const parts = createDiceTrayParts(p, trayName);
  if (!bodyColor) return jscad.booleans.union(...parts.flatMap(part => [part.assembled, ...(part.assembledText ? [part.assembledText] : [])]));
  const rgb = [1, 3, 5].map(offset => parseInt(bodyColor.slice(offset, offset + 2), 16) / 255);
  const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const color = [...rgb.map(linear), 1] as [number, number, number, number];
  return jscad.geometries.geom3.create(parts.flatMap(part => [
    ...jscad.geometries.geom3.toPolygons(part.assembled).map(poly => ({ ...poly, color })),
    ...(part.assembledText ? jscad.geometries.geom3.toPolygons(part.assembledText).map(poly => ({ ...poly, color: part.assembledText!.color?.map((n, i) => i < 3 ? linear(n) : n) as [number, number, number, number] | undefined })) : [])
  ]));
}
