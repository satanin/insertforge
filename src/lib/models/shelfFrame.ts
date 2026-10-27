import jscad from '@jscad/modeling';
import { jointProfile, type ShelfFrameParams } from './shelfStorage';
const { cuboid } = jscad.primitives;
const { union, subtract } = jscad.booleans;
const { translate, rotateX, rotateY } = jscad.transforms;
function block(x: number, y: number, z: number, w: number, d: number, h: number) {
  return cuboid({ size: [w, d, h], center: [x + w / 2, y + d / 2, z + h / 2] });
}
export function resolveShelfFrame(p: ShelfFrameParams) {
  const errors: string[] = [];
  if (![p.columns, p.rows].every(v => Number.isInteger(v) && v >= 1 && v <= 8)) errors.push('Choose 1–8 columns and rows.');
  if (![p.pitchWidth, p.pitchHeight].every(v => Number.isFinite(v) && v >= 40 && v <= 500)) errors.push('Cell pitches must be 40–500 mm.');
  if (!Number.isFinite(p.depth) || p.depth < 45 || p.depth > 1000) errors.push('Depth must be 45–1000 mm.');
  if (!Number.isFinite(p.wall) || p.wall < 6 || p.wall > 30) errors.push('Frame wall must be 6–30 mm.');
  const bodyWidth = p.columns * p.pitchWidth, bodyHeight = p.rows * p.pitchHeight;
  if (Math.min(bodyWidth, bodyHeight) <= 2 * p.wall + 10) errors.push('Walls leave too little open space.');
  return { valid: errors.length === 0, errors, bodyWidth, bodyHeight, width: bodyWidth + 2.4,
    height: bodyHeight + 2.4, depth: p.depth, openingWidth: bodyWidth - 2 * p.wall,
    openingHeight: bodyHeight - 2 * p.wall };
}
export function createShelfFrame(p: ShelfFrameParams, print = false) {
  const r = resolveShelfFrame(p);
  if (!r.valid) throw new Error(r.errors.join(' '));
  const w = r.bodyWidth, h = r.bodyHeight, t = p.wall;
  const ring = union(block(0, 0, 0, w, p.depth, t), block(0, 0, h - t, w, p.depth, t),
    block(0, 0, t, t, p.depth, h - 2 * t), block(w - t, 0, t, t, p.depth, h - 2 * t));
  const rail = translate([0, p.depth, 0], rotateX(Math.PI / 2,
    jscad.extrusions.extrudeLinear({ height: p.depth - 10 }, jointProfile())));
  const socket = translate([0, p.depth + 0.1, 0], rotateX(Math.PI / 2,
    jscad.extrusions.extrudeLinear({ height: p.depth + 0.1 - 9.8 }, jointProfile(0.2))));
  const males = [], sockets = [];
  for (let col = 0; col < p.columns; col++) {
    const x = (col + 0.5) * p.pitchWidth;
    males.push(translate([x, 0, h], rail));
    sockets.push(translate([x, 0, 0], socket));
  }
  for (let row = 0; row < p.rows; row++) {
    const z = (row + 0.5) * p.pitchHeight;
    males.push(translate([w, 0, z], rotateY(Math.PI / 2, rail)));
    sockets.push(translate([0, 0, z], rotateY(Math.PI / 2, socket)));
  }
  const solid = subtract(union(ring, ...males), ...sockets);
  const frame = jscad.geometries.geom3.create(jscad.geometries.geom3.toPolygons(solid)
    .map(poly => ({ ...poly, color: [0.35, 0.48, 0.6, 1] as [number, number, number, number] })));
  if (!print) return frame;
  const oriented = rotateX(-Math.PI / 2, frame);
  const bounds = jscad.measurements.measureBoundingBox(oriented);
  return translate(bounds[0].map(v => -v) as [number, number, number], oriented);
}
