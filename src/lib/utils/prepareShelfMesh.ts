import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

/** Export-only triangulation of convex CSG faces with conforming boundary edges.
 * Stepped seats expose T-junctions that coarse, size-dependent snapping can miss.
 * Weld at 0.0000001 mm and split shared edges before triangulating each face.
 * Never feed this mesh back into CSG operations.
 */
export function prepareShelfMesh(geometry: Geom3): Geom3 {
  type Point = [number, number, number];
  const vertices = new Map<string, Point>();
  const canonical = (p: number[]): Point => {
    const v = p.map(n => Math.round(n * 1e7) / 1e7) as Point, key = v.join(',');
    if (!vertices.has(key)) vertices.set(key, v);
    return vertices.get(key)!;
  };
  const source = jscad.geometries.geom3.toPolygons(geometry).map(poly => ({ ...poly, vertices: poly.vertices.map(canonical) }));
  const candidates = [...vertices.values()];
  const faces: ReturnType<typeof jscad.geometries.poly3.fromPoints>[] = [];
  for (const poly of source) {
    const boundary: Point[] = [];
    for (let i = 0; i < poly.vertices.length; i++) {
      const a = poly.vertices[i], b = poly.vertices[(i + 1) % poly.vertices.length];
      const edge = b.map((n, axis) => n - a[axis]), length2 = edge.reduce((sum, n) => sum + n * n, 0);
      if (length2 < 1e-16) continue;
      const middle: { t: number; v: Point }[] = [];
      for (const v of candidates) {
        const delta = v.map((n, axis) => n - a[axis]);
        const t = delta.reduce((sum, n, axis) => sum + n * edge[axis], 0) / length2;
        if (t <= 1e-8 || t >= 1 - 1e-8) continue;
        const distance2 = delta.reduce((sum, n, axis) => sum + (n - t * edge[axis]) ** 2, 0);
        if (distance2 < 1e-12) middle.push({ t, v });
      }
      boundary.push(a, ...middle.sort((a, b) => a.t - b.t).map(item => item.v));
    }
    if (boundary.length < 3) continue;
    const center = canonical([0, 1, 2].map(axis => boundary.reduce((sum, v) => sum + v[axis], 0) / boundary.length));
    for (let i = 0; i < boundary.length; i++) {
      const triangle = jscad.geometries.poly3.fromPoints([center, boundary[i], boundary[(i + 1) % boundary.length]]);
      if (Math.abs(jscad.geometries.poly3.measureArea(triangle)) > 1e-10) faces.push(triangle);
    }
  }
  const mesh = jscad.geometries.geom3.create(faces);
  return geometry.color ? jscad.colors.colorize(geometry.color, mesh) : mesh;
}
