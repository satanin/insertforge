import jscad from '@jscad/modeling';
import type { DiceTrayParams } from './diceTray';
import { vectorTextWithAccents } from './vectorTextWithAccents';

export function createDiceLidText(p: DiceTrayParams, name: string, width: number, depth: number, top: number) {
  const label = (p.lidText?.trim() || name.trim()).slice(0, 100);
  if (!p.lid || !p.lidTextEnabled || !label) return null;
  const mode = p.lidTextMode ?? 'engraved';
  const textDepth = mode === 'raised' ? 0.6 : Math.min(0.4, (p.lidThickness ?? 2) / 2);
  const strokes = vectorTextWithAccents({ height: 6, text: label }).filter(segment => segment.length >= 2)
    .map(segment => jscad.extrusions.extrudeLinear({ height: textDepth }, jscad.expansions.expand(
      { delta: 0.6, corners: 'round', segments: 128 }, jscad.geometries.path2.fromPoints({}, segment))));
  if (!strokes.length) return null;
  let text = jscad.booleans.union(...strokes);
  if (depth > width) text = jscad.transforms.rotateZ(Math.PI / 2, text);
  const [min, max] = jscad.measurements.measureBoundingBox(text);
  const fit = Math.min(1, (width - 2 * (p.wallThickness + 2)) / (max[0] - min[0]), (depth - 2 * (p.wallThickness + 2)) / (max[1] - min[1]));
  if (fit <= 0) return null;
  text = jscad.transforms.translate([width / 2 - (min[0] + max[0]) * fit / 2,
    depth / 2 - (min[1] + max[1]) * fit / 2, top + (mode === 'raised' ? 0 : -textDepth)], jscad.transforms.scale([fit, fit, 1], text));
  const hex = p.lidTextColor ?? '#202020';
  return jscad.colors.colorize([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, 1], text);
}
