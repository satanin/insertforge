import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CounterStack } from './counterTray';
import { packItems } from '$lib/utils/binPacking';
import { vectorTextWithAccents } from './vectorTextWithAccents';

export interface MiniatureRackModel {
  label?: string | null;
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
  labelsEnabled: boolean;
  labelText: string;
  labelHeight: number;
  nozzleDiameter: number;
  labelTextMode: 'engraved' | 'inlay' | 'raised';
  labelTextColor: string;
  lid: boolean;
  lidThickness: number;
  lidTextEnabled: boolean;
  /** Null follows the tray name, including future renames. */
  lidText: string | null;
  lidTextMode: 'engraved' | 'inlay' | 'raised';
  lidTextColor: string;
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
  labelsEnabled: false, labelText: 'Miniature', labelHeight: 4, nozzleDiameter: 0.4,
  labelTextMode: 'engraved', labelTextColor: '#ffffff',
  lid: false, lidThickness: 3,
  lidTextEnabled: true, lidText: null,
  lidTextMode: 'engraved', lidTextColor: '#ffffff',
  quantityMode: 'all', fillModelId: null, fixedWidth: null, fixedDepth: null, fixedHeight: null,
  sizingMode: 'free', requestedCount: 6, maxWidth: 200, maxDepth: 200, maxHeight: null,
  spacingX: 6, spacingY: 6, linkedSpacing: true, models: [],
  rows: 2, columns: 3, baseDiameter: 32, baseThickness: 3,
  diameterClearance: 1, verticalClearance: 1, tabOverlapPercent: 25,
  tabThickness: 1.6, wallThickness: 2, floorThickness: 2, spacing: 6,
  miniatureHeight: 45, headroom: 5, postWidth: 10, stackingClearance: 0.3,
  perforated: true
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
    label: typeof m.label === 'string' && m.label.trim() ? m.label.trim() : null,
    id: m.id || `model-${index + 1}`, name: m.name ?? `Model ${index + 1}`,
    count: Math.floor(finite(m.count, 1, 1, 100)),
    baseDiameter: finite(m.baseDiameter, 32, 10, 100), baseThickness: finite(m.baseThickness, 3, 1, 15),
    width: finite(m.width, 32, 1, 300), depth: finite(m.depth, 32, 1, 300),
    height: Math.max(finite(m.height, 45, 5, 300), finite(m.baseThickness, 3, 1, 15))
  }));
  return {
    labelsEnabled: input.labelsEnabled === true,
    labelTextMode: input.labelTextMode === 'inlay' || input.labelTextMode === 'raised' ? input.labelTextMode : 'engraved',
    labelTextColor: typeof input.labelTextColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.labelTextColor) ? input.labelTextColor : '#ffffff',
    labelText: typeof input.labelText === 'string' ? input.labelText.trim() : 'Miniature',
    labelHeight: number('labelHeight', 4, 12), nozzleDiameter: number('nozzleDiameter', 0.2, 0.8),
    lid: input.lid === true, lidThickness: number('lidThickness', 2.8, 8),
    lidTextEnabled: input.lidTextEnabled !== false,
    lidTextMode: input.lidTextMode === 'inlay' || input.lidTextMode === 'raised' ? input.lidTextMode : 'engraved',
    lidTextColor: typeof input.lidTextColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.lidTextColor) ? input.lidTextColor : '#ffffff',
    lidText: typeof input.lidText === 'string' && input.lidText.trim() ? input.lidText.trim().slice(0, 100) : null,
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
  const topHeight = p.lid ? p.lidThickness + (p.lidTextEnabled && p.lidTextMode === 'raised' ? 0.6 : 0) : PEG_HEIGHT;
  const requiredHeightFor = (height: number, thickness: number) => p.floorThickness
    + Math.max(height, thickness + p.verticalClearance + p.tabThickness) + p.headroom + topHeight;
  if (!error && p.sizingMode === 'models') {
    const margin = p.postWidth;
    const makeItems = (models: MiniatureRackModel[]) => models.flatMap(m => Array.from({ length: m.count }, () => ({
        data: m,
        width: Math.max(m.width, m.baseDiameter + p.diameterClearance + p.wallThickness * 2) + p.spacingX,
        depth: Math.max(m.depth, m.baseDiameter + p.diameterClearance + p.wallThickness * 2) + p.spacingY
      })));
    const fitsHeight = (m: MiniatureRackModel) => limitHeight === null || requiredHeightFor(m.height, m.baseThickness) <= limitHeight + 1e-8;
    const pack = (models: MiniatureRackModel[], partial = false) => {
      const items = makeItems(models);
      const availableWidth = Math.max(0, limitWidth - margin * 2 + p.spacingX);
      const availableDepth = Math.max(0, limitDepth - margin * 2 + p.spacingY);
      const options = { allowRotation: false, allowPartial: partial };
      let best = packItems(items, availableWidth, availableDepth, options);
      // Filling and exact dimensions deliberately preserve their requested footprint.
      if (isFill || !items.length || (p.fixedWidth !== null && p.fixedDepth !== null)) return best;
      const score = (result: NonNullable<typeof best>) => {
        const w = p.fixedWidth ?? result.totalWidth - p.spacingX + margin * 2;
        const d = p.fixedDepth ?? result.totalDepth - p.spacingY + margin * 2;
        return { area: w * d, perimeter: w + d };
      };
      const consider = (w: number, d: number) => {
        const candidate = packItems(items, w, d, options);
        if (!candidate) return;
        const a = score(candidate), b = best && score(best);
        if (!best || candidate.items.length > best.items.length ||
          (candidate.items.length === best.items.length && b &&
            (a.area < b.area - 1e-6 || Math.abs(a.area - b.area) < 1e-6 && a.perimeter < b.perimeter))) best = candidate;
      };
      const candidates = (sizes: number[], limit: number) => {
        const widths = new Set<number>();
        for (const size of new Set(sizes)) {
          for (let n = 1; n <= items.length && size * n <= limit + 1e-6; n++) widths.add(Math.min(limit, size * n));
        }
        const sorted = [...widths].sort((a, b) => a - b);
        // Bound the search cost for large mixed racks, retaining exact row/column multiples.
        return sorted.length <= 32 ? sorted : Array.from({ length: 32 }, (_, i) => sorted[Math.round(i * (sorted.length - 1) / 31)]);
      };
      if (p.fixedWidth === null) for (const width of candidates(items.map(item => item.width), availableWidth)) consider(width, availableDepth);
      if (p.fixedDepth === null) for (const depth of candidates(items.map(item => item.depth), availableDepth)) consider(availableWidth, depth);
      return best;
    };
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
  const requiredHeight = p.floorThickness + maxMiniatureHeight + p.headroom + topHeight;
  if (!error && limitHeight !== null && requiredHeight > limitHeight + 1e-8)
    error = `Required rack height is ${requiredHeight.toFixed(1)} mm, above the maximum/fixed height ${limitHeight.toFixed(1)} mm.`;
  const stackPitch = (p.fixedHeight ?? requiredHeight) - topHeight;
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
  const labels: { x: number; y: number; width: number; depth: number; top: number;
    text: string; stroke: number; textSegments: [number, number][][] }[] = [];
  if (!error && p.labelsEnabled) {
    const minimumHeight = Math.max(4, p.nozzleDiameter * 10);
    if (p.labelHeight < minimumHeight) error = `Labels require at least ${minimumHeight.toFixed(1)} mm letter height for this nozzle.`;
    for (const seat of seats) {
      if (error) break;
      const r = (seat.baseDiameter + p.diameterClearance) / 2 + p.wallThickness;
      const left = seat.x - r, right = seat.x + r;
      const front = seat.y - r + p.wallThickness;
      let back = Math.max(p.wallThickness, seat.y - r - p.spacingY);
      // Use only the gap already available. Conservative bounds include other models' envelopes.
      for (const other of seats) {
        if (other === seat) continue;
        const otherR = (other.baseDiameter + p.diameterClearance) / 2 + p.wallThickness;
        const halfW = Math.max(otherR, (other.envelopeWidth ?? 0) / 2);
        const halfD = Math.max(otherR, (other.envelopeDepth ?? 0) / 2);
        if (other.x + halfW > left && other.x - halfW < right) {
          if (other.y < seat.y) back = Math.max(back, other.y + halfD + 0.5);
          else if (other.y - halfD < front && other.y + halfD > back)
            back = front; // No room alongside a neighbouring model envelope.
        }
      }
      for (const post of posts) {
        if (post.x + p.postWidth / 2 > left && post.x - p.postWidth / 2 < right && post.y < seat.y)
          back = Math.max(back, post.y + p.postWidth / 2 + 0.5);
      }
      const model = p.models.find(model => model.id === seat.modelId);
      const text = model ? model.label ?? model.name : p.labelText;
      const fail = (reason: string) => { error = `Label “${text}”: ${reason} Use a shorter label, increase spacing or disable labels.`; };
      if (text.length > 100) { fail('label exceeds 100 characters.'); break; }
      if ((seat.envelopeDepth ?? 0) / 2 > r - p.wallThickness) {
        const warning = `Label “${text}”: the approximate miniature envelope extends over the plate. The text may fit, but check clearance with the actual miniature using Preview counters. This is not a text-size error.`;
        if (!warnings.includes(warning)) warnings.push(warning);
      }
      const shapes = vectorTextWithAccents({ height: p.labelHeight, text }).filter(segment => segment.length >= 2);
      if (!shapes.length) { fail('enter a printable label.'); break; }
      const points = shapes.flat();
      const minX = Math.min(...points.map(point => point[0])), maxX = Math.max(...points.map(point => point[0]));
      const minY = Math.min(...points.map(point => point[1])), maxY = Math.max(...points.map(point => point[1]));
      // Set the actual glyph height, independently of JSCAD font units. Never scale to fit the plate.
      const scale = p.labelHeight / (maxY - minY);
      const stroke = Math.max(0.8, p.nozzleDiameter * 2);
      const textWidth = (maxX - minX) * scale + stroke;
      const textHeight = p.labelHeight + stroke;
      if (textWidth > right - left - 2 || textHeight > front - back - 2) {
        fail(`text does not fit at a printable size (${textWidth.toFixed(1)} × ${textHeight.toFixed(1)} mm needed, ${(right - left - 2).toFixed(1)} × ${Math.max(0, front - back - 2).toFixed(1)} mm available).`); break;
      }
      const top = p.floorThickness + seat.baseThickness + p.verticalClearance + p.tabThickness;
      const x = seat.x, y = (back + front) / 2;
      const textSegments = shapes.map(segment => segment.map((point): [number, number] => [
          x + (point[0] - (minX + maxX) / 2) * scale,
          y + (point[1] - (minY + maxY) / 2) * scale
        ]));
      labels.push({ x, y, width: right - left, depth: front - back, top, text, stroke, textSegments });
    }
    for (let i = 0; !error && i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        if (Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1e-6 &&
          Math.abs(a.y - b.y) < (a.depth + b.depth) / 2 - 1e-6)
          error = 'Socket label plates overlap. Increase spacing or disable labels.';
      }
    }
  }
  return { p, radius, outerRadius, width, depth, height: stackPitch + topHeight,
    stackPitch, seats, posts, labels, error, warnings, requestedCount, remainingCount, modelCounts, capacity, columns, rows };
}

export function createMiniatureSocketRackLabelText(input: Partial<MiniatureSocketRackParams> = {}): Geom3 | null {
  const { p, labels, error } = getMiniatureSocketRackLayout(input);
  if (error) throw new Error(error);
  if (!labels.length || p.labelTextMode === 'engraved') return null;
  const shapes = labels.flatMap(label => label.textSegments.map(segment => {
    const path = jscad.geometries.path2.fromPoints({}, segment);
    return translate([0, 0, label.top + (p.labelTextMode === 'raised' ? 0 : -0.4)],
      jscad.extrusions.extrudeLinear({ height: p.labelTextMode === 'raised' ? 0.6 : 0.4 },
        jscad.expansions.expand({ delta: label.stroke / 2, corners: 'round', segments: 24 }, path)));
  }));
  const color = [1, 3, 5].map(offset => parseInt(p.labelTextColor.slice(offset, offset + 2), 16) / 255);
  return jscad.colors.colorize([color[0], color[1], color[2], 1], union(...shapes));
}

export function createMiniatureSocketRack(input: Partial<MiniatureSocketRackParams> = {}, includeLabelText = true): Geom3 {
  const { p, width, depth, stackPitch, seats, posts, labels, error } = getMiniatureSocketRackLayout(input);
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
  for (const label of labels) {
    // Solid support down to the existing floor: no suspended shelf or slicer supports.
    parts.push(box(label.x, label.y, p.floorThickness - 0.1,
      label.width, label.depth, label.top - p.floorThickness + 0.1));
    for (const segment of p.labelTextMode === 'raised' ? [] : label.textSegments) {
      const path = jscad.geometries.path2.fromPoints({}, segment);
      cuts.push(translate([0, 0, label.top - 0.4], jscad.extrusions.extrudeLinear({ height: 0.5 },
        jscad.expansions.expand({ delta: label.stroke / 2, corners: 'round', segments: 24 }, path))));
    }
  }
  for (const { x, y } of posts) {
    parts.push(box(x, y, 0, p.postWidth, p.postWidth, stackPitch));
    parts.push(box(x, y, stackPitch - 0.1, pegWidth, pegWidth, PEG_HEIGHT + 0.1));
    cuts.push(box(x, y, -0.1, pegWidth + p.stackingClearance * 2,
      pegWidth + p.stackingClearance * 2, SOCKET_DEPTH + 0.1));
  }
  const rack = union(...parts);
  const body = cuts.length ? subtract(rack, ...cuts) : rack;
  const text = includeLabelText ? createMiniatureSocketRackLabelText(input) : null;
  return text ? union(body, text) : body;
}

/** Flat cap, registered on the existing pegs. Its blind pockets leave a solid top skin. */
export function createMiniatureSocketRackLid(input: Partial<MiniatureSocketRackParams> = {}, trayName = '', includeText = true): Geom3 {
  const { p, width, depth, posts, error } = getMiniatureSocketRackLayout(input);
  if (error) throw new Error(error);
  const plate = translate([width / 2, depth / 2, p.lidThickness / 2],
    cuboid({ size: [width, depth, p.lidThickness] }));
  const pocketWidth = p.postWidth - 4 + p.stackingClearance * 2;
  const cuts = posts.map(({ x, y }) => translate([x, y, (SOCKET_DEPTH - 0.1) / 2],
    cuboid({ size: [pocketWidth, pocketWidth, SOCKET_DEPTH + 0.1] })));
  const text = createMiniatureSocketRackLidText(input, trayName);
  if (text && p.lidTextMode !== 'raised') cuts.push(text);
  const lid = subtract(plate, ...cuts);
  return includeText && text && p.lidTextMode !== 'engraved' ? union(lid, text) : lid;
}

export function createMiniatureSocketRackLidText(input: Partial<MiniatureSocketRackParams> = {}, trayName = ''): Geom3 | null {
  const { p, width, depth, error } = getMiniatureSocketRackLayout(input);
  if (error) throw new Error(error);
  const label = p.lidText ?? trayName.trim().slice(0, 100);
  if (p.lidTextEnabled && label) {
    const strokes = vectorTextWithAccents({ height: 6, text: label }).filter(segment => segment.length >= 2)
      .map(segment => jscad.extrusions.extrudeLinear({ height: p.lidTextMode === 'raised' ? 0.6 : 0.4 }, jscad.expansions.expand(
        { delta: 0.6, corners: 'round', segments: 32 }, jscad.geometries.path2.fromPoints({}, segment))));
    if (strokes.length) {
      // The engraving is viewed from +Z. Mirroring Y would reverse the glyphs.
      let text = union(...strokes);
      if (depth > width) text = jscad.transforms.rotateZ(Math.PI / 2, text);
      const [min, max] = jscad.measurements.measureBoundingBox(text);
      // Keep engraving away from the blind peg pockets and preserve the flat stacking surface.
      const fit = Math.min(1, (width - 2 * (p.postWidth + 2)) / (max[0] - min[0]),
        (depth - 2 * (p.postWidth + 2)) / (max[1] - min[1]));
      text = jscad.transforms.scale([fit, fit, 1], text);
      text = translate([width / 2 - (min[0] + max[0]) * fit / 2,
        depth / 2 - (min[1] + max[1]) * fit / 2, p.lidThickness + (p.lidTextMode === 'raised' ? 0 : -0.4)], text);
      const rgb = [1, 3, 5].map(offset => parseInt(p.lidTextColor.slice(offset, offset + 2), 16) / 255);
      return jscad.colors.colorize([rgb[0], rgb[1], rgb[2], 1], text);
    }
  }
  return null;
}

export function createMiniatureSocketRackParts(input: Partial<MiniatureSocketRackParams> = {}, trayName = '') {
  const layout = getMiniatureSocketRackLayout(input);
  const rack = createMiniatureSocketRack(input, false);
  const text = createMiniatureSocketRackLabelText(input);
  const parts: import('./cardStorageTray').CardStoragePart[] = [{ id: 'body', name: 'Rack', geometry: rack, assembled: rack,
    ...(text ? { text, assembledText: text } : {}) }];
  if (layout.p.lid) {
    const lid = createMiniatureSocketRackLid(input, trayName, false);
    const lidText = layout.p.lidTextMode === 'engraved' ? null : createMiniatureSocketRackLidText(input, trayName);
    // Print with the flat top on the bed, pockets facing upwards, without supports.
    const printPose = (geometry: Geom3) => layout.p.lidTextEnabled && layout.p.lidTextMode === 'raised' ? geometry
      : translate([0, layout.depth, layout.p.lidThickness], jscad.transforms.rotateX(Math.PI, geometry));
    parts.push({ id: 'lid', name: 'Lid', geometry: printPose(lid),
      assembled: translate([0, 0, layout.stackPitch], lid),
      ...(lidText ? { text: printPose(lidText), assembledText: translate([0, 0, layout.stackPitch], lidText) } : {}) });
  }
  return parts;
}

export function createMiniatureSocketRackAssembly(input: Partial<MiniatureSocketRackParams> = {}, trayName = ''): Geom3 {
  return union(...createMiniatureSocketRackParts(input, trayName).flatMap(part =>
    [part.assembled, ...(part.assembledText ? [part.assembledText] : [])]));
}

export function createMiniatureSocketRackPreview(input: Partial<MiniatureSocketRackParams> = {}, trayName = '', bodyColor = '#3d7a6a'): Geom3 {
  const p = normalizeMiniatureSocketRackParams(input);
  if ((!p.labelsEnabled || p.labelTextMode === 'engraved') &&
    (!p.lid || !p.lidTextEnabled || p.lidTextMode === 'engraved')) return createMiniatureSocketRackAssembly(input, trayName);
  const rgb = [1, 3, 5].map(offset => parseInt(bodyColor.slice(offset, offset + 2), 16) / 255);
  const base: [number, number, number, number] = [rgb[0], rgb[1], rgb[2], 1];
  // Keep the flush inlay faces separate: a boolean union would erase their colour boundary.
  return jscad.geometries.geom3.create(createMiniatureSocketRackParts(input, trayName).flatMap(part => [
    ...jscad.geometries.geom3.toPolygons(part.assembled).map(poly => ({ ...poly, color: base })),
    ...(part.assembledText ? jscad.geometries.geom3.toPolygons(part.assembledText).map(poly => ({
      ...poly, color: part.assembledText!.color
    })) : [])
  ]));
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
