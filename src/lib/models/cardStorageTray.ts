import type { Box, CardSize } from '$lib/types/project';
import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CounterStack } from './counterTray';
import { createBoxWithLidGrooves, createLid, createLidTextInlay, defaultLidParams } from './lid';
import { vectorTextWithAccents } from './vectorTextWithAccents';

const { cuboid, polygon } = jscad.primitives;
const { union, subtract } = jscad.booleans;
const { translate, rotateX, rotateY, scale } = jscad.transforms;
const { path2 } = jscad.geometries;
const { expand } = jscad.expansions;
const { extrudeLinear } = jscad.extrusions;

export const DEFAULT_STORAGE_DIVIDER_COLOR = '#e8ad58';
export const CARD_STORAGE_DIVIDER_TEXT_DEPTH = 0.4;
export const CARD_STORAGE_DIVIDER_TEXT_STROKE = 1.2;
export const MIN_CARD_STORAGE_LID_WALL_THICKNESS = 3;
const MIN_CARD_STORAGE_LID_GUIDE_WEB = 0.6;
const LID_GUIDE_FIXED_DEPTH = 0.5;

export function minimumCardStorageLidWallThickness(lidClearance: number): number {
  const clearance = Number.isFinite(lidClearance) ? lidClearance : defaultCardStorageParams.lidClearance;
  const required = 2 * (clearance + LID_GUIDE_FIXED_DEPTH + MIN_CARD_STORAGE_LID_GUIDE_WEB);
  return Math.max(MIN_CARD_STORAGE_LID_WALL_THICKNESS, Math.ceil(required * 10) / 10);
}

export function storageColor(hex: string): [number, number, number, number] {
  const value = /^#[\da-f]{6}$/i.test(hex) ? hex : DEFAULT_STORAGE_DIVIDER_COLOR;
  return [
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
    1
  ];
}
function previewColor(hex: string): [number, number, number, number] {
  const [r, g, b] = storageColor(hex);
  const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return [linear(r), linear(g), linear(b), 1];
}

function createDividerTextGeometry(text: string, strokeWidth: number, depth: number): Geom3 | null {
  const shapes = vectorTextWithAccents({ height: 8, text })
    .filter((segment) => segment.length >= 2)
    .map((segment) =>
      extrudeLinear(
        { height: depth },
        expand(
          { delta: strokeWidth / 2, corners: 'round', segments: 128 },
          path2.fromPoints({ closed: false }, segment)
        )
      )
    );
  return shapes.length ? union(...shapes) : null;
}

export interface StorageDivider {
  id: string;
  label: string;
  tab: 'left' | 'center' | 'right' | 'full';
  color?: string;
}
export interface CardStorageParams {
  cardSizeId: string;
  orientation: 'vertical' | 'horizontal';
  sizing: 'count' | 'length';
  count: number;
  exteriorLength: number;
  maxHeight: number | null;
  wallThickness: number;
  floorThickness: number;
  clearance: number;
  dividerThickness: number;
  dividerColor?: string;
  tabHeight: number;
  lid: boolean;
  previewLid?: boolean;
  lidThickness: number;
  lidClearance: number;
  lidText?: string;
  lidTextMode?: 'emboss' | 'inlay';
  dividers: StorageDivider[];
}
export const defaultCardStorageParams: CardStorageParams = {
  cardSizeId: 'standard',
  orientation: 'horizontal',
  sizing: 'count',
  count: 100,
  exteriorLength: 150,
  maxHeight: null,
  wallThickness: 3,
  floorThickness: 3,
  clearance: 1,
  dividerThickness: 1.2,
  tabHeight: 10,
  lid: false,
  lidThickness: 3,
  lidClearance: 0.3,
  dividers: []
};

export function resolveCardStorage(p: CardStorageParams, cards: CardSize[]) {
  const card = cards.find((c) => c.id === p.cardSizeId);
  const errors: string[] = [];
  if (!card) errors.push('Choose an available card size.');
  const w = p.orientation === 'vertical' ? (card?.width ?? 63) : (card?.length ?? 88);
  const h = p.orientation === 'vertical' ? (card?.length ?? 88) : (card?.width ?? 63);
  const thickness = card?.thickness ?? 0.5;
  for (const [name, value, min] of [
    ['Wall', p.wallThickness, 1.2],
    ['Floor', p.floorThickness, 0.8],
    ['Clearance', p.clearance, 0.2],
    ['Divider thickness', p.dividerThickness, 0.8],
    ['Tab height', p.tabHeight, 4],
    ['Lid thickness', p.lidThickness, 1],
    ['Lid clearance', p.lidClearance, 0.1],
    ['Card width', w, 1],
    ['Card height', h, 1],
    ['Card thickness', thickness, 0.01]
  ] as [string, number, number][]) {
    if (!Number.isFinite(value) || value < min) errors.push(`${name} must be at least ${min} mm.`);
  }
  if (p.sizing === 'count' && (!Number.isInteger(p.count) || p.count < 1))
    errors.push('Card count must be a positive integer.');
  if (p.lid) {
    const minimumWall = minimumCardStorageLidWallThickness(p.lidClearance);
    if (p.wallThickness < minimumWall)
      errors.push(`Wall must be at least ${minimumWall.toFixed(1)} mm with the current sliding-lid clearance.`);
  }
  if (p.dividers.some((d) => (d.tab === 'full' ? w : w / 3) <= 2))
    errors.push('The card width is too small for the selected tabs.');
  if (p.sizing === 'length' && (!Number.isFinite(p.exteriorLength) || p.exteriorLength <= 0))
    errors.push('Exterior length must be positive.');
  if (p.maxHeight !== null && (!Number.isFinite(p.maxHeight) || p.maxHeight <= 0))
    errors.push('Maximum height must be positive or Auto.');
  const tallest = h + (p.dividers.length ? p.tabHeight : 0);
  const plateThickness = Math.max(thickness, p.dividers.length ? p.dividerThickness : 0);
  const overhead = p.floorThickness + (p.lid ? p.lidThickness + p.lidClearance : 0);
  const projectedHeight = (a: number) => tallest * Math.cos(a) + plateThickness * Math.sin(a);
  let angle = 0;
  if (p.maxHeight !== null && projectedHeight(0) + overhead > p.maxHeight) {
    // Limit to 60 degrees from upright to retain useful support and a finite pitch.
    const limit = Math.PI / 3;
    if (projectedHeight(limit) + overhead > p.maxHeight) {
      errors.push('Maximum height is too small for the cards, tabs and lid (maximum tilt 60°).');
      angle = limit;
    } else {
      let lo = 0,
        hi = limit;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (projectedHeight(mid) + overhead > p.maxHeight) lo = mid;
        else hi = mid;
      }
      angle = hi;
    }
  }
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const dividerDepth = (p.dividers.length * p.dividerThickness) / cos;
  // All plates rest on the floor. Their pitch is thickness / cos(angle).
  // Reserve the full tallest lean once, at the rear support, not once per group.
  const fixedDepth = 2 * (p.wallThickness + p.clearance) + tallest * sin + dividerDepth;
  const capacity =
    p.sizing === 'count'
      ? p.count
      : Math.max(0, Math.floor(((p.exteriorLength - fixedDepth) * cos) / thickness + 1e-8));
  const depth = p.sizing === 'length' ? p.exteriorLength : fixedDepth + (capacity * thickness) / cos;
  if (capacity < 1) errors.push('Exterior length cannot fit the separators and at least one card at this height.');
  const height = overhead + projectedHeight(angle);
  const wallHeight = p.lid ? height - p.lidThickness : p.floorThickness + h * cos + thickness * sin;
  const finiteDimension = (n: number) => (Number.isFinite(n) && n > 0 ? n : 1);
  return {
    width: finiteDimension(w + 2 * (p.clearance + p.wallThickness)),
    depth: finiteDimension(depth),
    height: finiteDimension(height),
    wallHeight,
    capacity: Number.isFinite(capacity) ? capacity : 0,
    angle,
    cardWidth: w,
    cardHeight: h,
    cardThickness: thickness,
    tallest,
    errors,
    valid: errors.length === 0
  };
}

export interface CardStoragePart {
  id: string;
  name: string;
  geometry: Geom3;
  text?: Geom3;
  assembled: Geom3;
  assembledText?: Geom3;
}

function storageSequence(p: CardStorageParams, r: ReturnType<typeof resolveCardStorage>) {
  let remaining = r.capacity,
    cursor = 0;
  const cos = Math.cos(r.angle);
  return Array.from({ length: p.dividers.length + 1 }, (_, i) => {
    const count = Math.floor(remaining / (p.dividers.length + 1 - i));
    remaining -= count;
    const start = cursor;
    cursor += (count * r.cardThickness) / cos;
    const dividerStart = cursor;
    cursor += p.dividerThickness / cos;
    return { count, start, dividerStart };
  });
}

const block = (x: number, y: number, z: number, dx: number, dy: number, dz: number) =>
  cuboid({ size: [dx, dy, dz], center: [x + dx / 2, y + dy / 2, z + dz / 2] });

export function createCardStorageParts(p: CardStorageParams, cards: CardSize[]): CardStoragePart[] {
  const r = resolveCardStorage(p, cards);
  if (!r.valid) throw new Error(r.errors.join(' '));
  const { width: W, depth: D, wallHeight: H } = r;
  const w = p.wallThickness,
    f = p.floorThickness,
    c = p.clearance;
  const box: Box = {
    id: 'card-storage-shell',
    name: p.lidText ?? 'Card Storage',
    trays: [],
    wallThickness: w,
    floorThickness: f,
    tolerance: c,
    fillSolidEmpty: false,
    customWidth: W,
    customDepth: D,
    customBoxHeight: H,
    lidParams: {
      ...defaultLidParams,
      thickness: p.lidThickness,
      showName: !!(p.lidText ?? 'Card Storage').trim(),
      textMode: p.lidTextMode ?? 'emboss'
    }
  };
  // Card Storage always opens along the card-stack direction. Box keeps its
  // longest-side default when no explicit direction is supplied.
  const fit = { clearance: p.lidClearance, plateThickness: p.lidThickness, slideAlong: 'y' as const };
  let body = p.lid
    ? createBoxWithLidGrooves(box, [], [], undefined, fit)!
    : subtract(block(0, 0, 0, W, D, H), block(w, w, f, W - 2 * w, D - 2 * w, H));
  if (r.angle > 0) {
    const supportHeight = r.cardHeight * Math.cos(r.angle);
    const lean = supportHeight * Math.tan(r.angle);
    const wedge = extrudeLinear(
      { height: W - 2 * w },
      polygon({
        points: [
          [0, 0],
          [supportHeight, lean],
          [0, lean]
        ]
      })
    );
    // Local polygon (height, depth), extrusion along X after rotation.
    const support = translate([W - w, D - w - c - lean, f], rotateY(-Math.PI / 2, wedge));
    body = union(body, support);
  }
  const parts: CardStoragePart[] = [];
  if (p.lid) {
    const lid = createLid(box, [], [], fit)!;
    const text = createLidTextInlay(box) ?? undefined;
    // Turn the printable lid over around its Y sliding axis, keeping the entry side.
    const pose = (g: Geom3) => translate([W, 0, H + p.lidThickness], rotateY(Math.PI, g));
    parts.push({
      id: 'lid',
      name: 'lid',
      geometry: lid,
      text,
      assembled: pose(lid),
      assembledText: text ? pose(text) : undefined
    });
  }
  parts.unshift({ id: 'body', name: 'body', geometry: body, assembled: body });
  p.dividers.forEach((divider, index) => {
    const tabWidth = divider.tab === 'full' ? r.cardWidth : r.cardWidth / 3;
    const tabX =
      divider.tab === 'right' ? r.cardWidth - tabWidth : divider.tab === 'center' ? (r.cardWidth - tabWidth) / 2 : 0;
    let plate = union(
      block(0, 0, 0, r.cardWidth, r.cardHeight, p.dividerThickness),
      block(tabX, r.cardHeight - 0.1, 0, tabWidth, p.tabHeight + 0.1, p.dividerThickness)
    );
    let text: Geom3 | undefined;
    if (divider.label.trim()) {
      const textGeometry = createDividerTextGeometry(
        divider.label.trim(),
        CARD_STORAGE_DIVIDER_TEXT_STROKE,
        CARD_STORAGE_DIVIDER_TEXT_DEPTH
      );
      if (textGeometry) {
        const textBounds = jscad.measurements.measureBoundingBox(textGeometry);
        const factor = Math.min(
          1,
          (tabWidth - 2) / (textBounds[1][0] - textBounds[0][0]),
          (p.tabHeight - 2) / (textBounds[1][1] - textBounds[0][1])
        );
        const placeText = (geometry: Geom3) => {
          const bounds = jscad.measurements.measureBoundingBox(geometry);
          return translate(
            [
              tabX + tabWidth / 2 - ((bounds[0][0] + bounds[1][0]) * factor) / 2,
              r.cardHeight + p.tabHeight / 2 - ((bounds[0][1] + bounds[1][1]) * factor) / 2,
              p.dividerThickness - CARD_STORAGE_DIVIDER_TEXT_DEPTH
            ],
            scale([factor, factor, 1], geometry)
          );
        };
        text = placeText(textGeometry);
        plate = subtract(plate, text);
      }
    }
    plate.color = storageColor(divider.color ?? p.dividerColor ?? DEFAULT_STORAGE_DIVIDER_COLOR);
    // Rotate the upright divider around its vertical axis. Flipping only its
    // face would mirror the lettering and swap the perceived left/right tabs.
    // Export geometry remains flat in its print pose.
    const faceOpening = (geometry: Geom3) =>
      translate([r.cardWidth, 0, p.dividerThickness], rotateY(Math.PI, geometry));
    const pose = (geometry: Geom3) =>
      translate(
        [w + c, w + c + storageSequence(p, r)[index].dividerStart + p.dividerThickness * Math.cos(r.angle), f],
        rotateX(Math.PI / 2 - r.angle, faceOpening(geometry))
      );
    parts.push({
      id: divider.id,
      name: `divider-${index + 1}-${divider.label || 'blank'}`,
      geometry: plate,
      text,
      assembled: pose(plate),
      assembledText: text ? pose(text) : undefined
    });
  });
  return parts;
}

export function createCardStoragePreview(p: CardStorageParams, cards: CardSize[], bodyColor = '#3d7a6a'): Geom3 {
  const r = resolveCardStorage(p, cards);
  // Keep the rest of the project view usable while invalid inputs are being edited.
  if (!r.valid) return jscad.geometries.geom3.create();
  return jscad.geometries.geom3.create(
    createCardStorageParts(p, cards)
      .filter((part) => part.id !== 'lid' || p.previewLid)
      .flatMap((part) => [
        ...jscad.geometries.geom3.toPolygons(part.assembled).map((poly) => ({
          ...poly,
          color: previewColor(
            part.id === 'body' || part.id === 'lid'
              ? bodyColor
              : (p.dividers.find((divider) => divider.id === part.id)?.color ??
                  p.dividerColor ??
                  DEFAULT_STORAGE_DIVIDER_COLOR)
          )
        })),
        ...(part.assembledText
          ? jscad.geometries.geom3
              .toPolygons(part.assembledText)
              .map((poly) => ({ ...poly, color: [0.04, 0.04, 0.04, 1] as [number, number, number, number] }))
          : [])
      ])
  );
}

export function getCardStoragePositions(p: CardStorageParams, cards: CardSize[]): CounterStack[] {
  const r = resolveCardStorage(p, cards);
  if (!r.valid) return [];
  const cos = Math.cos(r.angle),
    sin = Math.sin(r.angle);
  // Partition the illustrative stack around the loose plates, without saving group counts.
  return storageSequence(p, r)
    .map(({ count, start }) => {
      return {
        shape: 'custom',
        customBaseShape: 'rectangle',
        customShapeName: 'Card',
        x: p.wallThickness + p.clearance,
        y: p.wallThickness + p.clearance + start - (r.cardThickness * sin * sin) / (2 * cos),
        z: p.floorThickness + (r.cardThickness * sin) / 2,
        width: r.cardWidth,
        length: r.cardWidth,
        thickness: r.cardThickness,
        count,
        color: '#b5c8d8',
        hexPointyTop: false,
        isEdgeLoaded: true,
        edgeOrientation: 'crosswise',
        slotWidth: r.cardWidth,
        slotDepth: (count * r.cardThickness) / cos,
        isCardDivider: true,
        cardDividerHeight: r.cardHeight,
        cardDividerProjectedHeight: r.cardHeight * cos,
        cardDividerBaseDepth: (count * r.cardThickness) / cos,
        cardDividerLeanOffset: r.cardHeight * sin,
        cardDividerTiltAngle: r.angle
      };
    })
    .filter((stack) => stack.count > 0) as CounterStack[];
}
