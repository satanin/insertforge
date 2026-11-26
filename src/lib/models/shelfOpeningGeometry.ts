import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CardSize } from '$lib/types/project';
import { createShelfPreview, type ShelfModule } from './shelfStorage';
import { layoutShelfOpening } from './shelfLayout';
import { KALLAX_REFERENCE } from './shelfReference';

export interface OpeningFaceRange { id: string; start: number; end: number; }

/** Cache only the variants present in the current opening, including all geometry settings. */
export function createShelfOpeningBuilder() {
  let cache = new Map<string, Geom3>();
  return (modules: ShelfModule[], cards: CardSize[], faceRanges?: OpeningFaceRange[], alignment: 'front' | 'rear' = 'front') => {
    const layout = layoutShelfOpening(modules, cards);
    const nextCache = new Map<string, Geom3>();
    const { width: w, height: h, depth: d } = KALLAX_REFERENCE;
    const placedIds = new Set(layout.placed.map(module => module.id));
    const longest = Math.max(0, ...modules.flatMap(module => module.type === 'card-drawer' && placedIds.has(module.id) ? [module.params.depth] : []));
    // Move the complete assembly, preserving front/connector alignment between modules.
    const depthOffset = alignment === 'rear' && longest > 0 ? d - 1.5 - longest : 0;
    const wall = 16; // Furniture context only; never exported as a printable part.
    const board = (size: [number, number, number], center: [number, number, number]) =>
      jscad.colors.colorize([0.72, 0.67, 0.58, 1], jscad.primitives.cuboid({ size, center }));
    const geometries: Geom3[] = [
      board([w + 2 * wall, d, wall], [w / 2, d / 2, -wall / 2]),
      board([w + 2 * wall, d, wall], [w / 2, d / 2, h + wall / 2]),
      board([wall, d, h], [-wall / 2, d / 2, h / 2]),
      board([wall, d, h], [w + wall / 2, d / 2, h / 2])
    ];
    const triangleCount = (geometry: Geom3) => jscad.geometries.geom3.toPolygons(geometry)
      .reduce((count, polygon) => count + Math.max(0, polygon.vertices.length - 2), 0);
    let face = geometries.reduce((count, geometry) => count + triangleCount(geometry), 0);
    for (const placed of layout.placed) {
      const module = modules.find(item => item.id === placed.id)!;
      if (module.type !== 'card-drawer') continue;
      const key = JSON.stringify([module.params, cards]);
      const geometry = nextCache.get(key) ?? cache.get(key) ?? createShelfPreview(module.params, cards, 0, false);
      nextCache.set(key, geometry);
      const source = jscad.geometries.geom3.toPolygons(geometry);
      const translated = jscad.transforms.translate([placed.x, depthOffset, h - placed.y - placed.height], geometry);
      // JSCAD's lazy transform recreates polygons without their per-face colours.
      geometries.push(jscad.geometries.geom3.create(jscad.geometries.geom3.toPolygons(translated)
        .map((polygon, index) => ({ ...polygon, color: source[index].color }))));
      const end = face + triangleCount(geometries[geometries.length - 1]);
      faceRanges?.push({ id: module.id, start: face, end });
      face = end;
    }
    cache = nextCache;
    return jscad.geometries.geom3.create(geometries.flatMap(geometry =>
      jscad.geometries.geom3.toPolygons(geometry).map(polygon => ({ ...polygon, color: geometry.color ?? polygon.color }))));
  };
}
