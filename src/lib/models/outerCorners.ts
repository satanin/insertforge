import jscad from '@jscad/modeling';

// Keep the corner arc inside the exterior wall band, outside all useful cavities.
// Missing values deliberately preserve the geometry of saved projects.
export function getOuterCornerRadius(
  requested: number | undefined,
  width: number,
  depth: number,
  margin: number
): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) return 0;
  return Math.max(0, Math.min(requested, margin, width / 2 - 0.001, depth / 2 - 0.001));
}

export function createOuterBody(
  width: number,
  depth: number,
  height: number,
  requested: number | undefined,
  margin: number
) {
  const radius = getOuterCornerRadius(requested, width, depth, margin);
  if (!radius)
    return jscad.primitives.cuboid({ size: [width, depth, height], center: [width / 2, depth / 2, height / 2] });
  return jscad.extrusions.extrudeLinear(
    { height },
    jscad.primitives.roundedRectangle({
      size: [width, depth],
      center: [width / 2, depth / 2],
      roundRadius: radius,
      segments: 48
    })
  );
}
