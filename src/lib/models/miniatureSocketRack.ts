import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CounterStack } from './counterTray';
import { packItems } from '$lib/utils/binPacking';

export interface MiniatureRackModel {
  id: string;
  name: string;
  count: number;
  baseDiameter: number;
  baseThickness: number;
  width: number;
  depth: number;
  height: number;
}

/** Horizontal bases are tilted under a rigid tab, never snapped into place. */
export interface MiniatureSocketRackParams {
  quantityMode: 'all' | 'partial' | 'fill';
  fillModelId: string | null;
  fixedWidth: number | null;
  fixedDepth: number | null;
  fixedHeight: number | null;
  sizingMode: 'grid' | 'free' | 'models';
  requestedCount: number;
  maxWidth: number;
  maxDepth: number;
  maxHeight: number | null;
  spacingX: number;
  spacingY: number;
  linkedSpacing: boolean;
  models: MiniatureRackModel[];
  rows: number;
  columns: number;
  baseDiameter: number;
  baseThickness: number;
  diameterClearance: number;
  verticalClearance: number;
  tabOverlapPercent: number;
  /** Legacy overlap in millimetres. */
  tabOverlap?: number;
  tabThickness: number;
  wallThickness: number;
  floorThickness: number;
  spacing: number;
  miniatureHeight: number;
  headroom: number;
  postWidth: number;
  stackingClearance: number;
  perforated: boolean;
}

export const defaultMiniatureSocketRackParams: MiniatureSocketRackParams = {
  quantityMode: 'all', fillModelId: null, fixedWidth: null, fixedDepth: null, fixedHeight: null,
  sizingMode: 'free', requestedCount: 6, maxWidth: 200, maxDepth: 200, maxHeight: null,
  spacingX: 6, spacingY: 6, linkedSpacing: true, models: [],
  rows: 2, columns: 3, baseDiameter: 32, baseThickness: 3,
  diameterClearance: 1, verticalClearance: 1, tabOverlapPercent: 25,
  tabThickness: 1.6, wallThickness: 2, floorThickness: 2, spacing: 6,
  miniatureHeight: 45, headroom: 5, postWidth: 10, stackingClearance: 0.3,
  perforated: false
};

const PEG_HEIGHT = 2;
const SOCKET_DEPTH = 2.2;
const { cuboid, cylinder } = jscad.primitives;
const { translate } = jscad.transforms;
const { union, subtract, intersect } = jscad.booleans;

export function normalizeMiniatureSocketRackParams(input: Partial<MiniatureSocketRackParams> = {}): MiniatureSocketRackParams {
  const p = { ...defaultMiniatureSocketRackParams, ...input };
  const number = (key: keyof MiniatureSocketRackParams, min: number, max: number): number => {
    const value = p[key];
    const fallback = defaultMiniatureSocketRackParams[key] as number;
    return Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
  };
  const baseDiameter = number('baseDiameter', 10, 100);
  const baseThickness = number('baseThickness', 1, 15);
  const diameterClearance = number('diameterClearance', 0.2, 5);
  const verticalClearance = number('verticalClearance', 0.2, 5);
  const tabThickness = number('tabThickness', 1, 4);
  const legacyOverlapPercent = typeof input.tabOverlap === 'number' && Number.isFinite(input.tabOverlap)
    ? input.tabOverlap / baseDiameter * 100 : defaultMiniatureSocketRackParams.tabOverlapPercent;
  const requestedOverlapPercent = typeof input.tabOverlapPercent === 'number' && Number.isFinite(input.tabOverlapPercent)
    ? input.tabOverlapPercent : legacyOverlapPercent;
  const finite = (value: number | undefined, fallback: number, min: number, max: number) =>
    Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback));
  const spacingX = finite(input.spacingX ?? input.spacing, 6, 0, 40);
  const linkedSpacing = input.linkedSpacing ?? true;
  const models = (input.models ?? []).slice(0, 10).map((m, index) => ({
    id: m.id || `model-${index + 1}`, name: m.name ?? `Model ${index + 1}`,
    count: Math.floor(finite(m.count, 1, 1, 100)),
    baseDiameter: finite(m.baseDiameter, 32, 10, 100), baseThickness: finite(m.baseThickness, 3, 1, 15),
    width: finite(m.width, 32, 1, 300), depth: finite(m.depth, 32, 1, 300),
    height: Math.max(finite(m.height, 45, 5, 300), finite(m.baseThickness, 3, 1, 15))
  }));
  return {
    quantityMode: input.quantityMode === 'partial' || input.quantityMode === 'fill' ? input.quantityMode : 'all',
    fillModelId: models.some(m => m.id === input.fillModelId) ? input.fillModelId! : models[0]?.id ?? null,
    fixedWidth: typeof input.fixedWidth === 'number' && Number.isFinite(input.fixedWidth) ? finite(input.fixedWidth, 200, 30, 600) : null,
    fixedDepth: typeof input.fixedDepth === 'number' && Number.isFinite(input.fixedDepth) ? finite(input.fixedDepth, 200, 30, 600) : null,
    fixedHeight: typeof input.fixedHeight === 'number' && Number.isFinite(input.fixedHeight) ? finite(input.fixedHeight, 100, 5, 400) : null,
    sizingMode: input.sizingMode === 'models' ? 'models' : input.sizingMode === 'free' ? 'free'
      : input.sizingMode === 'grid' || input.rows !== undefined ? 'grid' : 'free',
    requestedCount: Math.floor(number('requestedCount', 1, 100)),
    maxWidth: number('maxWidth', 30, 600), maxDepth: number('maxDepth', 30, 600),
    maxHeight: typeof input.maxHeight === 'number' && Number.isFinite(input.maxHeight)
      ? finite(input.maxHeight, 100, 5, 400) : null,
    spacingX, spacingY: linkedSpacing ? spacingX : finite(input.spacingY ?? input.spacing, 6, 0, 40),
    linkedSpacing, models,
    rows: Math.floor(number('rows', 1, 10)), columns: Math.floor(number('columns', 1, 10)),
    baseDiameter, baseThickness,
    diameterClearance, verticalClearance,
    tabOverlapPercent: Math.min(45, Math.max(1, requestedOverlapPercent)),
    tabThickness, wallThickness: number('wallThickness', 1.2, 5),
    floorThickness: number('floorThickness', 1.2, 8),
    spacing: number('spacing', 0, 40),
    miniatureHeight: Math.max(number('miniatureHeight', 5, 200), baseThickness + verticalClearance + tabThickness),
    headroom: number('headroom', 1, 30), postWidth: number('postWidth', 8, 20),
    stackingClearance: number('stackingClearance', 0.1, 0.8), perforated: p.perforated === true
  };
}

export function getMiniatureSocketRackLayout(input: Partial<MiniatureSocketRackParams> = {}) {
  const p = normalizeMiniatureSocketRackParams(input);
  const radius = (p.baseDiameter + p.diameterClearance) / 2;
  const outerRadius = radius + p.wallThickness;
  const pitchX = outerRadius * 2 + p.spacingX;
  const pitchY = outerRadius * 2 + p.spacingY;
  const limitWidth = p.fixedWidth ?? p.maxWidth;
  const limitDepth = p.fixedDepth ?? p.maxDepth;
  const limitHeight = p.fixedHeight ?? p.maxHeight;
  const isFill = p.quantityMode === 'fill' && p.sizingMode !== 'grid';
  const isPartial = p.quantityMode === 'partial' && p.sizingMode !== 'grid';
  let width = p.postWidth * 2 + outerRadius * 2 + (p.columns - 1) * pitchX;
  let depth = p.postWidth * 2 + outerRadius * 2 + (p.rows - 1) * pitchY;
  type Seat = { x: number; y: number; baseDiameter: number; baseThickness: number;
    miniatureHeight: number; modelName: string; modelId?: string; envelopeWidth?: number; envelopeDepth?: number };
  let seats: Seat[] = [];
  let error: string | null = null;
  const warnings: string[] = [];
  if (p.fixedWidth !== null && p.fixedWidth > p.maxWidth) error = 'Fixed rack width exceeds the maximum rack width.';
  if (p.fixedDepth !== null && p.fixedDepth > p.maxDepth) error = 'Fixed rack depth exceeds the maximum rack depth.';
  if (p.fixedHeight !== null && p.maxHeight !== null && p.fixedHeight > p.maxHeight)
    error = 'Fixed rack height exceeds the maximum rack height.';
  let columns = p.columns;
  let rows = p.rows;
  let capacity = p.rows * p.columns;
  let requestedCount = p.sizingMode === 'models' ? p.models.reduce((sum, m) => sum + m.count, 0)
    : p.sizingMode === 'free' ? p.requestedCount : p.rows * p.columns;
  const requiredHeightFor = (height: number, thickness: number) => p.floorThickness
    + Math.max(height, thickness + p.verticalClearance + p.tabThickness) + p.headroom + PEG_HEIGHT;
  if (!error && p.sizingMode === 'models') {
    const margin = p.postWidth;
    const makeItems = (models: MiniatureRackModel[]) => models.flatMap(m => Array.from({ length: m.count }, () => ({
        data: m,
        width: Math.max(m.width, m.baseDiameter + p.diameterClearance + p.wallThickness * 2) + p.spacingX,
        depth: Math.max(m.depth, m.baseDiameter + p.diameterClearance + p.wallThickness * 2) + p.spacingY
      })));
    const fitsHeight = (m: MiniatureRackModel) => limitHeight === null || requiredHeightFor(m.height, m.baseThickness) <= limitHeight + 1e-8;
    const pack = (models: MiniatureRackModel[], partial = false) => packItems(makeItems(models),
      Math.max(0, limitWidth - margin * 2 + p.spacingX),
      Math.max(0, limitDepth - margin * 2 + p.spacingY), { allowRotation: false, allowPartial: partial });
    let packed: ReturnType<typeof pack> = null;
    width = limitWidth;
    depth = limitDepth;
    capacity = 0;
    if (p.models.length === 0) error = 'Add at least one miniature model.';
    else if (isFill) {
      const filler = p.models.find(m => m.id === p.fillModelId)!;
      const others = p.models.filter(m => m.id !== filler.id);
      const otherCount = others.reduce((sum, m) => sum + m.count, 0);
      if (!fitsHeight(filler)) error = 'The fill model is too tall for the rack height.';
      else if (otherCount >= 100 || others.some(m => !fitsHeight(m)) || (otherCount > 0 && !pack(others)))
        error = 'The quantities of the other models do not fit. Reduce them before filling the remaining space.';
      else {
        packed = otherCount > 0 ? pack(others) : null;
        // Search for a complete packing that preserves every non-fill model.
        let low = 0;
        let high = 100 - otherCount;
        while (low < high) {
          const count = Math.ceil((low + high) / 2);
          const candidate = pack([...others, { ...filler, count }]);
          if (candidate) { low = count; packed = candidate; } else high = count - 1;
        }
        if (low === 100 - otherCount) warnings.push('Reached the current limit of 100 miniatures per rack; this is not a proof that the rack is full.');
        if (low === 0 && packed) warnings.push('No additional miniatures of the fill model fit after placing the other models.');
        if (!packed) error = 'No miniatures fit within the rack dimensions.';
      }
    } else if (requestedCount > 100) error = 'Use at most 100 miniatures per rack.';
    else {
      const eligible = isPartial ? p.models.filter(fitsHeight) : p.models;
      packed = pack(eligible, isPartial);
      if (!packed) error = 'No layout found within the rack dimensions. Increase its size, reduce spacing or use fewer miniatures.';
    }
    if (packed) {
      width = p.fixedWidth ?? (isFill ? limitWidth : packed.totalWidth - p.spacingX + margin * 2);
      depth = p.fixedDepth ?? (isFill ? limitDepth : packed.totalDepth - p.spacingY + margin * 2);
      seats = packed.items.map(item => ({
        x: margin + item.x + (item.width - p.spacingX) / 2,
        y: margin + item.y + (item.depth - p.spacingY) / 2,
        baseDiameter: item.data.baseDiameter, baseThickness: item.data.baseThickness,
        miniatureHeight: item.data.height, modelName: item.data.name, modelId: item.data.id,
        envelopeWidth: Math.max(item.data.width, item.data.baseDiameter),
        envelopeDepth: Math.max(item.data.depth, item.data.baseDiameter)
      }));
      capacity = seats.length;
    }
  } else if (!error) {
    let placedCount = requestedCount;
    if (p.sizingMode === 'free') {
      const maxColumns = Math.max(0, Math.floor((limitWidth - p.postWidth * 2 + p.spacingX + 1e-8) / pitchX));
      const maxRows = Math.max(0, Math.floor((limitDepth - p.postWidth * 2 + p.spacingY + 1e-8) / pitchY));
      capacity = maxColumns * maxRows;
      placedCount = isFill ? Math.min(capacity, 100) : isPartial ? Math.min(requestedCount, capacity) : requestedCount;
      if (isFill && capacity > 100) warnings.push('Reached the current limit of 100 miniatures per rack; this is not a proof that the rack is full.');
      if (capacity < placedCount || placedCount === 0) {
        error = `Requested ${requestedCount} miniatures; capacity is ${capacity}. Increase the maximum rack size or reduce spacing.`;
        width = limitWidth; depth = limitDepth;
      } else {
        // Choose the smallest rectangular footprint that stores the requested count.
        let bestArea = Infinity;
        for (let c = 1; c <= Math.min(maxColumns, placedCount); c++) {
          const r = Math.ceil(placedCount / c);
          if (r > maxRows) continue;
          const w = p.postWidth * 2 + c * pitchX - p.spacingX;
          const d = p.postWidth * 2 + r * pitchY - p.spacingY;
          if (w * d < bestArea) { bestArea = w * d; columns = c; rows = r; width = w; depth = d; }
        }
        if (isFill) { width = limitWidth; depth = limitDepth; }
      }
    }
    if (!error) seats = Array.from({ length: placedCount }, (_, index) => ({
      x: p.postWidth + outerRadius + (index % columns) * pitchX,
      y: p.postWidth + outerRadius + Math.floor(index / columns) * pitchY,
      baseDiameter: p.baseDiameter, baseThickness: p.baseThickness,
      miniatureHeight: p.miniatureHeight, modelName: 'Miniature'
    }));
  }
  width = p.fixedWidth ?? width;
  depth = p.fixedDepth ?? depth;
  if (!error && seats.some(s => {
    const r = (s.baseDiameter + p.diameterClearance) / 2 + p.wallThickness;
    return s.x - r < p.postWidth - 1e-6 || s.y - r < p.postWidth - 1e-6
      || s.x + r > width - p.postWidth + 1e-6 || s.y + r > depth - p.postWidth + 1e-6;
  })) error = 'The sockets do not fit inside the fixed rack dimensions.';
  // An upper rack rests on these shoulders; its floor never touches the miniatures.
  const maxMiniatureHeight = p.sizingMode === 'models'
    ? Math.max(5, ...seats.map(s => Math.max(s.miniatureHeight, s.baseThickness + p.verticalClearance + p.tabThickness)))
    : p.miniatureHeight;
  const requiredHeight = p.floorThickness + maxMiniatureHeight + p.headroom + PEG_HEIGHT;
  if (!error && limitHeight !== null && requiredHeight > limitHeight + 1e-8)
    error = `Required rack height is ${requiredHeight.toFixed(1)} mm, above the maximum/fixed height ${limitHeight.toFixed(1)} mm.`;
  const stackPitch = (p.fixedHeight ?? requiredHeight) - PEG_HEIGHT;
  const modelCounts = p.models.map(m => {
    const placed = seats.filter(s => s.modelId === m.id).length;
    const requested = isFill && m.id === p.fillModelId ? null : m.count;
    return { id: m.id, name: m.name, requested, placed, remaining: requested === null ? 0 : Math.max(0, requested - placed) };
  });
  if (isFill) requestedCount = seats.length;
  const remainingCount = Math.max(0, requestedCount - seats.length);
  if (!error && isPartial && remainingCount > 0)
    warnings.push(`Placed ${seats.length} of ${requestedCount} miniatures; ${remainingCount} remain unplaced.`);
  const posts = [
    { x: p.postWidth / 2, y: p.postWidth / 2 },
    { x: width - p.postWidth / 2, y: p.postWidth / 2 },
    { x: p.postWidth / 2, y: depth - p.postWidth / 2 },
    { x: width - p.postWidth / 2, y: depth - p.postWidth / 2 }
  ];
  return { p, radius, outerRadius, width, depth, height: stackPitch + PEG_HEIGHT,
    stackPitch, seats, posts, error, warnings, requestedCount, remainingCount, modelCounts, capacity, columns, rows };
}

export function createMiniatureSocketRack(input: Partial<MiniatureSocketRackParams> = {}): Geom3 {
  const { p, width, depth, stackPitch, seats, posts, error } = getMiniatureSocketRackLayout(input);
  if (error) throw new Error(error);
  const box = (x: number, y: number, z: number, w: number, d: number, h: number) =>
    translate([x, y, z + h / 2], cuboid({ size: [w, d, h] }));
  const round = (x: number, y: number, z: number, r: number, h: number) =>
    translate([x, y, z + h / 2], cylinder({ radius: r, height: h, segments: 48 }));
  const seatHeight = Math.max(p.baseThickness, ...seats.map(s => s.baseThickness)) + p.verticalClearance + p.tabThickness;
  const parts: Geom3[] = [box(width / 2, depth / 2, 0, width, depth, p.floorThickness)];
  const cuts: Geom3[] = [];

  // A continuous perimeter beam joins the four stacking posts and stiffens the plate.
  const rimHeight = Math.min(seatHeight, 5);
  parts.push(
    box(width / 2, p.wallThickness / 2, p.floorThickness - 0.1, width, p.wallThickness, rimHeight + 0.1),
    box(width / 2, depth - p.wallThickness / 2, p.floorThickness - 0.1, width, p.wallThickness, rimHeight + 0.1),
    box(p.wallThickness / 2, depth / 2, p.floorThickness - 0.1, p.wallThickness, depth, rimHeight + 0.1),
    box(width - p.wallThickness / 2, depth / 2, p.floorThickness - 0.1, p.wallThickness, depth, rimHeight + 0.1)
  );
  for (const { x, y, baseDiameter, baseThickness } of seats) {
    const radius = (baseDiameter + p.diameterClearance) / 2;
    const outerRadius = radius + p.wallThickness;
    const seatHeight = baseThickness + p.verticalClearance + p.tabThickness;
    const tabBottom = p.floorThickness + baseThickness + p.verticalClearance;
    parts.push(subtract(
      round(x, y, p.floorThickness - 0.1, outerRadius, seatHeight + 0.1),
      round(x, y, p.floorThickness - 0.2, radius, seatHeight + 0.4),
      // Access the edge of the base opposite the tab to tilt it without pulling the figure.
      box(x, y + outerRadius, p.floorThickness - 0.2,
        baseDiameter * 0.45, outerRadius, seatHeight + 0.4)
    ));
    // Circular segment on one side only. Overlap is measured against the actual base,
    // rather than the cavity, so lateral clearance cannot cancel the retaining tab.
    const edgeY = y - baseDiameter / 2 + baseDiameter * p.tabOverlapPercent / 100;
    parts.push(intersect(
      round(x, y, tabBottom, outerRadius, p.tabThickness),
      box(x, (y - outerRadius + edgeY) / 2, tabBottom,
        outerRadius * 2 + 1, edgeY - (y - outerRadius), p.tabThickness)
    ));
    if (p.perforated) cuts.push(round(x, y, -0.1, baseDiameter * 0.28, p.floorThickness + 0.2));
  }
  const pegWidth = p.postWidth - 4;
  for (const { x, y } of posts) {
    parts.push(box(x, y, 0, p.postWidth, p.postWidth, stackPitch));
    parts.push(box(x, y, stackPitch - 0.1, pegWidth, pegWidth, PEG_HEIGHT + 0.1));
    cuts.push(box(x, y, -0.1, pegWidth + p.stackingClearance * 2,
      pegWidth + p.stackingClearance * 2, SOCKET_DEPTH + 0.1));
  }
  const rack = union(...parts);
  return cuts.length ? subtract(rack, ...cuts) : rack;
}

export function getMiniatureSocketRackPreviewPositions(input: Partial<MiniatureSocketRackParams> = {}): CounterStack[] {
  const { p, seats } = getMiniatureSocketRackLayout(input);
  return seats.map(({ x, y, baseDiameter, baseThickness, modelName, miniatureHeight, envelopeWidth, envelopeDepth }) => ({
    shape: 'circle', x, y,
    z: p.floorThickness, width: baseDiameter, length: baseDiameter,
    thickness: baseThickness, count: 1, hexPointyTop: false, color: '#7d8f6a', label: modelName,
    previewEnvelope: envelopeWidth && envelopeDepth ? { width: envelopeWidth, depth: envelopeDepth, height: miniatureHeight } : undefined
  }));
}
