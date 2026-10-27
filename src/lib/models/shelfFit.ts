export interface ShelfSpace { width: number; height: number; depth: number; margin: number; }
export interface ShelfEnvelope { bodyWidth: number; bodyHeight: number; stackKeyHeight: number; depth: number; handleProjection: number; }

export function resolveShelfFit(module: ShelfEnvelope, space: ShelfSpace) {
  const valid = [space.width, space.height, space.depth].every(v => Number.isFinite(v) && v > 0 && v <= 2000)
    && Number.isFinite(space.margin) && space.margin >= 0 && space.margin <= 100;
  const count = (available: number, pitch: number) => valid
    ? Math.max(0, Math.floor((available - 2 * space.margin - module.stackKeyHeight + 1e-8) / pitch)) : 0;
  const columns = count(space.width, module.bodyWidth), rows = count(space.height, module.bodyHeight);
  const usedWidth = columns ? columns * module.bodyWidth + module.stackKeyHeight : 0;
  const usedHeight = rows ? rows * module.bodyHeight + module.stackKeyHeight : 0;
  const totalDepth = module.depth + module.handleProjection;
  return { valid, columns, rows, total: columns * rows, usedWidth, usedHeight,
    freeWidth: space.width - usedWidth, freeHeight: space.height - usedHeight,
    totalDepth, depthOverflow: Math.max(0, totalDepth + space.margin - space.depth),
    shellOverflow: Math.max(0, module.depth + space.margin - space.depth) };
}
