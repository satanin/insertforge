import type { Geom3 } from '@jscad/modeling/src/geometries/types';

/**
 * Export geometry without any cleanup to match the original behavior.
 */
export function cleanGeometryForExport(geom: Geom3): Geom3 {
  return geom;
}
