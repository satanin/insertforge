/** Lift removable lids clear of their locating pegs before moving them aside. */
export function getLidExplodeOffset(amount: number, lift: number, distance: number) {
  const progress = Math.max(0, Math.min(100, Number.isFinite(amount) ? amount : 0));
  if (lift <= 0) return { lift: 0, slide: distance * Math.min(progress / 50, 1) };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return {
    lift: lift * smooth(Math.min(progress / 30, 1)),
    slide: distance * smooth(Math.max(0, (progress - 30) / 70))
  };
}
