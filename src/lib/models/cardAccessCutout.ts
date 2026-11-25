import jscad from '@jscad/modeling';

const { polygon } = jscad.primitives;
const { extrudeLinear } = jscad.extrusions;
const { rotateX, translate } = jscad.transforms;

export function createCardAccessCutout(
  centerX: number,
  cardWidth: number,
  cardHeight: number,
  floor: number,
  wall: number,
  wallTop: number,
  depth: number,
  depthPercent = 100
) {
  const lowestSill = floor + Math.min(cardHeight * 0.25, (wallTop - floor) / 2, Math.max(3, wall));
  const sill = wallTop - (wallTop - lowestSill) * (depthPercent / 100);
  const halfWidth = cardWidth * 0.35;
  const lowerHalfWidth = halfWidth * 0.8;
  const shoulder = sill + halfWidth - lowerHalfWidth;
  const top = Math.max(wallTop, shoulder) + 1;
  const profile: [number, number][] = [
    [centerX - lowerHalfWidth, sill],
    [centerX + lowerHalfWidth, sill],
    [centerX + halfWidth, shoulder],
    [centerX + halfWidth, top],
    [centerX - halfWidth, top],
    [centerX - halfWidth, shoulder]
  ];
  const roundedProfile = profile.flatMap((corner, index) => {
    if (corner[1] === top) return [corner];
    const previous = profile[(index + profile.length - 1) % profile.length];
    const next = profile[(index + 1) % profile.length];
    const inset = (neighbor: [number, number]): [number, number] => {
      const dx = neighbor[0] - corner[0];
      const dz = neighbor[1] - corner[1];
      const fraction = Math.min(0.45, 3 / Math.hypot(dx, dz));
      return [corner[0] + dx * fraction, corner[1] + dz * fraction];
    };
    const start = inset(previous);
    const end = inset(next);
    return Array.from({ length: 9 }, (_, step): [number, number] => {
      const t = step / 8;
      const u = 1 - t;
      return [
        u * u * start[0] + 2 * u * t * corner[0] + t * t * end[0],
        u * u * start[1] + 2 * u * t * corner[1] + t * t * end[1]
      ];
    });
  });
  const opening = extrudeLinear({ height: depth + 2 }, polygon({ points: roundedProfile }));
  return translate([0, depth + 1, 0], rotateX(Math.PI / 2, opening));
}
