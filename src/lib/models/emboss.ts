// For the 0.5–0.6 mm stroke radii used by floor labels, 24 segments
// approximate a circle within 0.006 mm, without the CSG cost of 128 facets.
export const FLOOR_TEXT_CURVE_SEGMENTS = 24;

export interface SafeEmbossOptions {
  preferredDepth?: number;
  thinWallDepth?: number;
  thinThreshold?: number;
  minRemainingMaterial?: number;
  minimumUsableDepth?: number;
}

export interface SafeEmbossResult {
  enabled: boolean;
  depth: number;
}

export function getSafeEmbossDepth(materialThickness: number, options: SafeEmbossOptions = {}): SafeEmbossResult {
  const {
    preferredDepth = 0.6,
    thinWallDepth = 0.4,
    thinThreshold = 2,
    minRemainingMaterial = 0.35,
    minimumUsableDepth = 0.05
  } = options;

  const targetDepth = materialThickness < thinThreshold ? thinWallDepth : preferredDepth;
  const depth = Math.min(targetDepth, materialThickness - minRemainingMaterial);

  return {
    enabled: depth > minimumUsableDepth,
    depth: Math.max(0, depth)
  };
}
