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

export function getSafeEmbossDepth(
  materialThickness: number,
  options: SafeEmbossOptions = {}
): SafeEmbossResult {
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
