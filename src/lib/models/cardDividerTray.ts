import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';

const { cuboid, cylinder, polygon } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { translate, scale, mirrorY, rotateX, rotateZ } = jscad.transforms;
const { path2 } = jscad.geometries;
const { expand } = jscad.expansions;
const { extrudeLinear } = jscad.extrusions;

// Import types from project
import type { CardSize } from '$lib/types/project';
import { DEFAULT_CARD_SIZE_IDS } from './counterTray';
import { getSafeEmbossDepth } from './emboss';
import { vectorTextWithAccents } from './vectorTextWithAccents';

// Re-export for backwards compatibility
export type CustomCardSize = CardSize;

// A single stack within a card divider tray
export interface CardDividerStack {
  cardSizeId: string; // Reference to a CardSize by ID
  count: number; // Number of cards in this stack
  label?: string; // Optional label for the stack
}

export interface CardDividerTrayParams {
  stacks: CardDividerStack[];
  orientation: 'vertical' | 'horizontal'; // Card orientation for entire tray
  stackDirection: 'sideBySide' | 'frontToBack'; // How stacks are arranged in the tray
  wallThickness: number;
  floorThickness: number;
  clearance: number; // Tolerance around cards
  rimHeight: number; // Extra height above cards
  maxHeight: number | null; // null = natural height, lower values tilt cards to fit
}

export const defaultCardDividerTrayParams: CardDividerTrayParams = {
  stacks: [
    { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: undefined },
    { cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: undefined }
  ],
  orientation: 'horizontal',
  stackDirection: 'frontToBack',
  wallThickness: 2.0,
  floorThickness: 2.0,
  clearance: 1.5,
  rimHeight: 3.0,
  maxHeight: null
};

export const MIN_CARD_DIVIDER_ANGLE_DEGREES = 50;
const MIN_CARD_DIVIDER_ANGLE_RADIANS = (MIN_CARD_DIVIDER_ANGLE_DEGREES * Math.PI) / 180;

// Helper to get card dimensions from global card sizes by ID
export function getCardSize(cardSizeId: string, cardSizes: CardSize[]): CardSize | null {
  return cardSizes.find((s) => s.id === cardSizeId) || null;
}

// For visualization - position data for each stack
export interface CardDividerStackPosition {
  x: number; // Center X position within tray
  y: number; // Center Y position within tray
  z: number; // Base Z position (floor level)
  slotWidth: number; // Width of the slot (card dimension + clearance)
  slotDepth: number; // Depth of the slot based on card count
  slotHeight: number; // Height of the slot (card standing dimension)
  stackDepth: number; // Base stack depth before tilt allowance
  tiltAngle: number; // Lean angle from vertical in radians
  angleFromBaseDegrees: number; // Angle relative to tray floor
  leanOffset: number; // Extra depth needed by the tilt
  projectedHeight: number; // Vertical card projection after tilt
  cardSizeId: string;
  count: number;
  label?: string;
  color: string;
  // Card dimensions for rendering
  cardWidth: number;
  cardLength: number;
  cardThickness: number;
  orientation: 'vertical' | 'horizontal';
}

interface CardDividerSlotMetrics {
  stack: CardDividerStack;
  cardSize: CardSize;
  slotWidth: number;
  stackDepth: number;
  standingHeight: number;
}

interface ResolvedCardDividerSlot extends CardDividerSlotMetrics {
  projectedHeight: number;
  leanOffset: number;
  slotDepth: number;
  tiltAngle: number;
  angleFromBaseRadians: number;
  angleFromBaseDegrees: number;
  frontLeanOffset: number;
  sharesDividerWithPrevious: boolean;
  sharesDividerWithNext: boolean;
  baseStart: number;
}

export interface CardDividerHeightValidation {
  requestedHeight: number | null;
  naturalHeight: number;
  effectiveHeight: number;
  minimumHeight: number;
  valid: boolean;
  usesAngledCards: boolean;
}

interface ResolvedCardDividerLayout {
  width: number;
  depth: number;
  wallHeight: number;
  naturalHeight: number;
  minimumHeight: number;
  valid: boolean;
  usesAngledCards: boolean;
  slots: ResolvedCardDividerSlot[];
  maxProjectedHeight: number;
}

function getStandingHeight(cardSize: CardSize, orientation: 'vertical' | 'horizontal'): number {
  return orientation === 'vertical' ? cardSize.length : cardSize.width;
}

function getSlotWidth(cardSize: CardSize, clearance: number, orientation: 'vertical' | 'horizontal'): number {
  return (orientation === 'vertical' ? cardSize.width : cardSize.length) + clearance * 2;
}

function getStackDepth(cardSize: CardSize, count: number, clearance: number): number {
  return count * cardSize.thickness + clearance * 2;
}

function getCardDividerSlotMetrics(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[]
): CardDividerSlotMetrics[] {
  const metrics: CardDividerSlotMetrics[] = [];

  for (const stack of params.stacks) {
    const cardSize = getCardSize(stack.cardSizeId, customCardSizes);
    if (!cardSize) continue;

    metrics.push({
      stack,
      cardSize,
      slotWidth: getSlotWidth(cardSize, params.clearance, params.orientation),
      stackDepth: getStackDepth(cardSize, stack.count, params.clearance),
      standingHeight: getStandingHeight(cardSize, params.orientation)
    });
  }

  return metrics;
}

function resolveCardDividerLayout(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[]
): ResolvedCardDividerLayout {
  const slotMetrics = getCardDividerSlotMetrics(params, customCardSizes);
  const { wallThickness, floorThickness, rimHeight, stackDirection } = params;

  if (slotMetrics.length === 0) {
    return {
      width: wallThickness * 2,
      depth: wallThickness * 2,
      wallHeight: floorThickness,
      naturalHeight: floorThickness,
      minimumHeight: floorThickness,
      valid: true,
      usesAngledCards: false,
      slots: [],
      maxProjectedHeight: 0
    };
  }

  const maxStandingHeight = Math.max(...slotMetrics.map((slot) => slot.standingHeight));
  const naturalHeight = floorThickness + maxStandingHeight + rimHeight;
  const minimumProjectedHeight = Math.max(
    ...slotMetrics.map((slot) => slot.standingHeight * Math.sin(MIN_CARD_DIVIDER_ANGLE_RADIANS))
  );
  const minimumHeight = floorThickness + minimumProjectedHeight + rimHeight;

  let requestedWallHeight = params.maxHeight ?? naturalHeight;
  if (requestedWallHeight > naturalHeight) {
    requestedWallHeight = naturalHeight;
  }

  const valid = requestedWallHeight >= minimumHeight;
  const effectiveWallHeight = valid ? requestedWallHeight : naturalHeight;
  const usableHeight = Math.max(0, effectiveWallHeight - floorThickness - rimHeight);

  const preliminarySlots: ResolvedCardDividerSlot[] = slotMetrics.map((slot) => {
    const projectedHeight = Math.min(slot.standingHeight, usableHeight);
    const leanOffset =
      projectedHeight >= slot.standingHeight
        ? 0
        : Math.sqrt(Math.max(0, slot.standingHeight ** 2 - projectedHeight ** 2));
    const tiltAngle =
      projectedHeight >= slot.standingHeight
        ? 0
        : Math.PI / 2 - Math.asin(projectedHeight / slot.standingHeight);
    const angleFromBaseRadians = Math.PI / 2 - tiltAngle;

    return {
      ...slot,
      projectedHeight,
      leanOffset,
      slotDepth: slot.stackDepth + leanOffset,
      tiltAngle,
      angleFromBaseRadians,
      angleFromBaseDegrees: (angleFromBaseRadians * 180) / Math.PI,
      frontLeanOffset: 0,
      sharesDividerWithPrevious: false,
      sharesDividerWithNext: false,
      baseStart: 0
    };
  });

  for (let index = 0; index < preliminarySlots.length - 1; index++) {
    const current = preliminarySlots[index];
    const next = preliminarySlots[index + 1];
    const canShareDivider =
      current.leanOffset > 0 &&
      next.leanOffset > 0 &&
      Math.abs(current.tiltAngle - next.tiltAngle) < 0.0001;

    if (canShareDivider) {
      current.sharesDividerWithNext = true;
      next.sharesDividerWithPrevious = true;
      next.frontLeanOffset = current.leanOffset;
    }
  }

  let currentBaseStart = wallThickness;
  for (const slot of preliminarySlots) {
    slot.baseStart = currentBaseStart;
    currentBaseStart += slot.stackDepth + wallThickness + (slot.sharesDividerWithNext ? 0 : slot.leanOffset);
    slot.slotDepth = slot.stackDepth + Math.max(slot.frontLeanOffset, slot.leanOffset);
  }

  const slots = preliminarySlots;
  const usesAngledCards = slots.some((slot) => slot.tiltAngle > 0.0001);
  const maxProjectedHeight = Math.max(...slots.map((slot) => slot.projectedHeight));

  let width: number;
  let depth: number;

  if (stackDirection === 'sideBySide') {
    width = wallThickness + slots.reduce((sum, slot) => sum + slot.slotWidth + wallThickness, 0);
    depth = wallThickness * 2 + Math.max(...slots.map((slot) => slot.slotDepth));
  } else {
    width = wallThickness * 2 + Math.max(...slots.map((slot) => slot.slotWidth));
    const lastSlot = slots[slots.length - 1];
    depth = lastSlot.baseStart + lastSlot.stackDepth + lastSlot.leanOffset + wallThickness;
  }

  return {
    width,
    depth,
    wallHeight: effectiveWallHeight,
    naturalHeight,
    minimumHeight,
    valid,
    usesAngledCards,
    slots,
    maxProjectedHeight
  };
}

export function validateCardDividerHeight(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[]
): CardDividerHeightValidation {
  const layout = resolveCardDividerLayout(params, customCardSizes);

  return {
    requestedHeight: params.maxHeight ?? null,
    naturalHeight: layout.naturalHeight,
    effectiveHeight: layout.wallHeight,
    minimumHeight: layout.minimumHeight,
    valid: layout.valid,
    usesAngledCards: layout.usesAngledCards
  };
}

export function sanitizeCardDividerTrayParams(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[]
): CardDividerTrayParams {
  if (params.maxHeight === null) {
    return params;
  }

  const validation = validateCardDividerHeight(params, customCardSizes);
  if (validation.valid) {
    return params;
  }

  return {
    ...params,
    maxHeight: null
  };
}

export function getCardDividerTrayDimensions(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[]
): {
  width: number;
  depth: number;
  height: number;
} {
  const layout = resolveCardDividerLayout(params, customCardSizes);
  return { width: layout.width, depth: layout.depth, height: layout.wallHeight };
}

export function getCardDividerPositions(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[],
  targetHeight?: number,
  spacerHeight?: number
): CardDividerStackPosition[] {
  const { stacks: originalStacks, orientation, stackDirection, wallThickness, floorThickness } = params;

  // Reverse stacks so first item in UI list appears at front of tray
  const stacks = [...originalStacks].reverse();

  const positions: CardDividerStackPosition[] = [];
  const colors = ['#4a90a4', '#a4784a', '#4aa474', '#a44a74', '#744aa4', '#a4a44a'];

  const layout = resolveCardDividerLayout(params, customCardSizes);
  const dims = { width: layout.width, depth: layout.depth, height: layout.wallHeight };

  // Calculate effective tray height and floor position
  const baseSpacerHeight = spacerHeight ?? 0;
  let trayHeight = dims.height + baseSpacerHeight;
  if (targetHeight && targetHeight > trayHeight) {
    trayHeight = targetHeight;
  }
  const extraHeight = trayHeight - dims.height;
  const effectiveFloorHeight = floorThickness + extraHeight;
  const maxProjectedHeight = layout.maxProjectedHeight;
  const resolvedSlots = [...layout.slots].reverse();

  if (stackDirection === 'sideBySide') {
    // Stacks arranged horizontally (side by side along X)
    let currentX = wallThickness;

    for (let i = 0; i < stacks.length; i++) {
      const stack = stacks[i];
      const resolvedSlot = resolvedSlots[i];
      if (!resolvedSlot) continue;
      const { cardSize, slotWidth, standingHeight: slotHeight, slotDepth, stackDepth, tiltAngle, angleFromBaseDegrees, leanOffset, projectedHeight } =
        resolvedSlot;
      const { width: cardWidth, length: cardLength, thickness: cardThickness } = cardSize;

      // Raise floor for shorter cards so tops are aligned and accessible.
      const stackFloorHeight = effectiveFloorHeight + (maxProjectedHeight - projectedHeight);

      // Center the slot in Y (all slots share the same Y position, centered)
      const slotY = dims.depth / 2;
      const slotX = currentX + slotWidth / 2;

      positions.push({
        x: slotX,
        y: slotY,
        z: stackFloorHeight,
        slotWidth,
        slotDepth,
        slotHeight,
        stackDepth,
        tiltAngle,
        angleFromBaseDegrees,
        leanOffset,
        projectedHeight,
        cardSizeId: stack.cardSizeId,
        count: stack.count,
        label: stack.label,
        color: colors[i % colors.length],
        cardWidth,
        cardLength,
        cardThickness,
        orientation
      });

      currentX += slotWidth + wallThickness;
    }
  } else {
    // Stacks arranged vertically (front to back along Y)
    for (let i = 0; i < stacks.length; i++) {
      const stack = stacks[i];
      const resolvedSlot = resolvedSlots[i];
      if (!resolvedSlot) continue;
      const { cardSize, slotWidth, standingHeight: slotHeight, slotDepth, stackDepth, tiltAngle, angleFromBaseDegrees, leanOffset, projectedHeight } =
        resolvedSlot;
      const { width: cardWidth, length: cardLength, thickness: cardThickness } = cardSize;

      // Raise floor for shorter cards so tops are aligned and accessible.
      const stackFloorHeight = effectiveFloorHeight + (maxProjectedHeight - projectedHeight);

      // Center the slot in X (all slots share the same X position, centered)
      const slotX = dims.width / 2;
      const slotY = resolvedSlot.baseStart + resolvedSlot.stackDepth / 2 + resolvedSlot.leanOffset / 2;

      positions.push({
        x: slotX,
        y: slotY,
        z: stackFloorHeight,
        slotWidth,
        slotDepth,
        slotHeight,
        stackDepth,
        tiltAngle,
        angleFromBaseDegrees,
        leanOffset,
        projectedHeight,
        cardSizeId: stack.cardSizeId,
        count: stack.count,
        label: stack.label,
        color: colors[i % colors.length],
        cardWidth,
        cardLength,
        cardThickness,
        orientation
      });
    }
  }

  return positions;
}

/**
 * Creates geometry for a stack label to be subtracted from the tray.
 * Labels are embossed (cut into) on walls - front wall for side-by-side, left wall for front-to-back.
 * Text is oriented perpendicular to the floor (vertical, reads bottom-to-top).
 */
function createStackLabelGeometry(
  label: string,
  slotCenterX: number,
  slotCenterY: number,
  slotWidth: number,
  slotDepth: number,
  trayHeight: number,
  floorThickness: number,
  wallThickness: number,
  stackDirection: 'sideBySide' | 'frontToBack'
): Geom3 | null {
  const trimmedLabel = label.trim();
  if (trimmedLabel.length === 0) return null;

  const { enabled: embossEnabled, depth: textDepth } = getSafeEmbossDepth(wallThickness);
  const strokeWidth = 1.0; // mm, slightly thinner for smaller labels
  const baseTextHeight = 5; // mm, base font size before scaling

  // Skip labels entirely if the wall is too thin to leave printable material behind the cut.
  if (!embossEnabled) return null;

  // Generate text segments
  const textSegments = vectorTextWithAccents({ height: baseTextHeight, text: trimmedLabel });

  if (textSegments.length === 0) return null;

  // Create text shapes
  const textShapes: ReturnType<typeof extrudeLinear>[] = [];
  for (const segment of textSegments) {
    if (segment.length >= 2) {
      const pathObj = path2.fromPoints({ closed: false }, segment);
      const expanded = expand({ delta: strokeWidth / 2, corners: 'round', segments: 128 }, pathObj);
      const extruded = extrudeLinear({ height: textDepth + 0.1 }, expanded);
      textShapes.push(extruded);
    }
  }

  if (textShapes.length === 0) return null;

  // Calculate text bounds
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  for (const segment of textSegments) {
    for (const point of segment) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  const textWidth = maxX - minX + strokeWidth;
  const textHeight = maxY - minY + strokeWidth;

  // Calculate wall height available for text
  const wallHeight = trayHeight - floorThickness;
  const wallCenterZ = floorThickness + wallHeight / 2;

  // Minimum margins
  const verticalMargin = 2;
  const availableVertical = wallHeight - verticalMargin * 2;

  // Skip if wall is too short for readable text
  if (availableVertical < 3) return null;

  // Calculate scale based on text orientation
  let textScale: number;
  if (stackDirection === 'sideBySide') {
    // Horizontal text: textWidth is horizontal, textHeight is vertical
    const availableHorizontal = slotWidth - strokeWidth * 2;
    const scaleH = Math.min(1, availableHorizontal / textWidth);
    const scaleV = Math.min(1, availableVertical / textHeight);
    textScale = Math.min(scaleH, scaleV);
  } else {
    // Vertical text: textWidth becomes vertical, textHeight becomes horizontal
    const availableHorizontal = slotDepth - strokeWidth * 2;
    const scaleH = Math.min(1, availableHorizontal / textHeight);
    const scaleV = Math.min(1, availableVertical / textWidth);
    textScale = Math.min(scaleH, scaleV);
  }

  // Combine text shapes
  let combinedText = union(...textShapes);

  // Center point of original text
  const textCenterX = (minX + maxX) / 2;
  const textCenterY = (minY + maxY) / 2;

  // First center the text at origin, then scale
  combinedText = translate([-textCenterX, -textCenterY, 0], combinedText);
  combinedText = scale([textScale, textScale, 1], combinedText);

  if (stackDirection === 'sideBySide') {
    // Front wall: text horizontal (parallel to floor), visible from -Y
    // Mirror so text reads correctly when embossed
    combinedText = mirrorY(combinedText);
    // Stand text up perpendicular to floor
    combinedText = rotateX(-Math.PI / 2, combinedText);
    // Position at front wall surface
    combinedText = translate([slotCenterX, -0.1, wallCenterZ], combinedText);
  } else {
    // Left wall: text vertical (reading bottom-to-top), visible from -X
    // Mirror so text reads correctly when embossed
    combinedText = mirrorY(combinedText);
    // Rotate to be vertical (reading bottom-to-top)
    combinedText = rotateZ(-Math.PI / 2, combinedText);
    // Stand text up perpendicular to floor
    combinedText = rotateX(-Math.PI / 2, combinedText);
    // Rotate to face the left wall
    combinedText = rotateZ(-Math.PI / 2, combinedText);
    // Position at left wall surface
    combinedText = translate([-0.1, slotCenterY, wallCenterZ], combinedText);
  }

  return combinedText;
}

function createCardDividerSlotCavity(
  slotWidth: number,
  stackDepth: number,
  projectedHeight: number,
  frontLeanOffset: number,
  leanOffset: number,
  openHeight: number
): Geom3 {
  const profile = polygon({
    points: [
      [0, 0],
      [stackDepth, 0],
      [stackDepth + leanOffset, projectedHeight],
      [stackDepth + leanOffset, openHeight],
      [frontLeanOffset, openHeight],
      [frontLeanOffset, projectedHeight]
    ]
  });

  const cavity = extrudeLinear({ height: slotWidth }, profile);
  return rotateZ(Math.PI / 2, rotateX(Math.PI / 2, cavity));
}

export function createCardDividerTray(
  params: CardDividerTrayParams,
  customCardSizes: CustomCardSize[],
  _trayName?: string,
  targetHeight?: number,
  floorSpacerHeight?: number,
  showEmboss: boolean = true,
  showStackLabels: boolean = true
): Geom3 {
  const { stacks: originalStacks, orientation, stackDirection, wallThickness, floorThickness, clearance } = params;

  // Reverse stacks so first item in UI list appears at front of tray
  const stacks = [...originalStacks].reverse();

  if (stacks.length === 0) {
    // Empty tray - just a small box
    return translate(
      [wallThickness, wallThickness, floorThickness / 2],
      cuboid({ size: [wallThickness * 2, wallThickness * 2, floorThickness] })
    );
  }

  // Calculate dimensions
  const layout = resolveCardDividerLayout(params, customCardSizes);
  const dims = { width: layout.width, depth: layout.depth, height: layout.wallHeight };
  const spacerHeight = floorSpacerHeight ?? 0;
  let trayHeight = dims.height + spacerHeight;

  if (targetHeight && targetHeight > trayHeight) {
    trayHeight = targetHeight;
  }

  const trayWidth = dims.width;
  const trayDepth = dims.depth;

  // Create outer solid box
  const outerBox = translate(
    [trayWidth / 2, trayDepth / 2, trayHeight / 2],
    cuboid({ size: [trayWidth, trayDepth, trayHeight] })
  );

  // Calculate effective floor height - if tray is extended, raise the card floor
  // so cards are accessible from the top
  const extraHeight = trayHeight - dims.height;
  const effectiveFloorHeight = floorThickness + extraHeight;

  // Subtract individual slot cavities
  let tray = outerBox;
  const maxProjectedHeight = layout.maxProjectedHeight;
  const resolvedSlots = [...layout.slots].reverse();

  if (stackDirection === 'sideBySide') {
    // Stacks arranged horizontally (side by side along X)
    let currentX = wallThickness;

    for (let index = 0; index < stacks.length; index++) {
      const resolvedSlot = resolvedSlots[index];
      if (!resolvedSlot) continue;

      const stackFloorHeight = effectiveFloorHeight + (maxProjectedHeight - resolvedSlot.projectedHeight);
      const cavityHeight = trayHeight - stackFloorHeight + 0.1;
      const slotCavity = translate(
        [currentX, (trayDepth - resolvedSlot.slotDepth) / 2, stackFloorHeight],
        createCardDividerSlotCavity(
          resolvedSlot.slotWidth,
          resolvedSlot.stackDepth,
          resolvedSlot.projectedHeight,
          0,
          resolvedSlot.leanOffset,
          cavityHeight
        )
      );

      tray = subtract(tray, slotCavity);

      currentX += resolvedSlot.slotWidth + wallThickness;
    }
  } else {
    // Stacks arranged vertically (front to back along Y)
    for (const resolvedSlot of resolvedSlots) {
      const stackFloorHeight = effectiveFloorHeight + (maxProjectedHeight - resolvedSlot.projectedHeight);
      const cavityHeight = trayHeight - stackFloorHeight + 0.1;
      const slotCavity = translate(
        [(trayWidth - resolvedSlot.slotWidth) / 2, resolvedSlot.baseStart, stackFloorHeight],
        createCardDividerSlotCavity(
          resolvedSlot.slotWidth,
          resolvedSlot.stackDepth,
          resolvedSlot.projectedHeight,
          resolvedSlot.frontLeanOffset,
          resolvedSlot.leanOffset,
          cavityHeight
        )
      );

      tray = subtract(tray, slotCavity);
    }
  }

  // Add finger cutouts
  // Cylinder diameter = half the card's shorter dimension for vertical, longer for horizontal
  // Vertical: cards stand tall, cutout based on card width (shorter side)
  // Horizontal: cards on side, cutout based on card length (longer side)
  let maxCutoutDimension = 0;
  for (const stack of stacks) {
    const cardSize = getCardSize(stack.cardSizeId, customCardSizes);
    if (!cardSize) continue;
    const cutoutDimension = orientation === 'vertical' ? cardSize.width : cardSize.length;
    maxCutoutDimension = Math.max(maxCutoutDimension, cutoutDimension);
  }

  const cutoutRadius = maxCutoutDimension / 4; // Diameter is half the dimension, so radius is quarter
  const cutoutCenterZ = trayHeight; // Cylinder midpoint at top of tray

  if (stackDirection === 'frontToBack') {
    // Single cylinder running along Y axis (through front wall)
    // Cylinder is centered in X, midpoint at top of tray
    const cutoutLength = trayDepth + 2; // Extend beyond tray for clean cut

    const fingerCutout = translate(
      [trayWidth / 2, trayDepth / 2, cutoutCenterZ],
      rotateX(Math.PI / 2, cylinder({ radius: cutoutRadius, height: cutoutLength, segments: 128 }))
    );
    tray = subtract(tray, fingerCutout);
  } else {
    // Side by side: One cylinder per stack, centered on each stack
    let currentX = wallThickness;
    const cutoutLength = trayDepth + 2; // Extend beyond tray for clean cut

    for (const stack of stacks) {
      const cardSize = getCardSize(stack.cardSizeId, customCardSizes);
      if (!cardSize) continue;

      const { width: cardWidth, length: cardLength } = cardSize;
      const slotWidth = orientation === 'vertical' ? cardWidth + clearance * 2 : cardLength + clearance * 2;

      // Cutout centered on this stack
      const stackCenterX = currentX + slotWidth / 2;

      const fingerCutout = translate(
        [stackCenterX, trayDepth / 2, cutoutCenterZ],
        rotateX(Math.PI / 2, cylinder({ radius: cutoutRadius, height: cutoutLength, segments: 128 }))
      );
      tray = subtract(tray, fingerCutout);

      currentX += slotWidth + wallThickness;
    }
  }

  // Emboss tray name on bottom
  if (showEmboss && _trayName && _trayName.trim().length > 0) {
    const { enabled: embossEnabled, depth: textDepth } = getSafeEmbossDepth(floorThickness);
    if (!embossEnabled) return tray;
    const strokeWidth = 1.2;
    const textHeightParam = 6;
    const margin = wallThickness * 2;

    const textSegments = vectorTextWithAccents({ height: textHeightParam, text: _trayName.trim() });

    if (textSegments.length > 0) {
      const textShapes: ReturnType<typeof extrudeLinear>[] = [];
      for (const segment of textSegments) {
        if (segment.length >= 2) {
          const pathObj = path2.fromPoints({ closed: false }, segment);
          const expanded = expand({ delta: strokeWidth / 2, corners: 'round', segments: 128 }, pathObj);
          const extruded = extrudeLinear({ height: textDepth + 0.1 }, expanded);
          textShapes.push(extruded);
        }
      }

      if (textShapes.length > 0) {
        let minX = Infinity,
          maxX = -Infinity;
        let minY = Infinity,
          maxY = -Infinity;
        for (const segment of textSegments) {
          for (const point of segment) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
          }
        }
        const textWidthCalc = maxX - minX + strokeWidth;
        const textHeightY = maxY - minY + strokeWidth;

        // Fit text within tray bounds
        const availableWidth = trayWidth - margin * 2;
        const availableDepth = trayDepth - margin * 2;
        const scaleX = Math.min(1, availableWidth / textWidthCalc);
        const scaleY = Math.min(1, availableDepth / textHeightY);
        const textScale = Math.min(scaleX, scaleY);

        const centerX = trayWidth / 2;
        const centerY = trayDepth / 2;
        const textCenterX = (minX + maxX) / 2;
        const textCenterY = (minY + maxY) / 2;

        let combinedText = union(...textShapes);
        // Mirror Y so text reads correctly when tray is flipped
        combinedText = mirrorY(combinedText);

        const positionedText = translate(
          [centerX - textCenterX * textScale, centerY + textCenterY * textScale, -0.1],
          scale([textScale, textScale, 1], combinedText)
        );
        tray = subtract(tray, positionedText);
      }
    }
  }

  // Emboss stack labels on walls
  if (showStackLabels) {
    const stackLabelCuts: Geom3[] = [];

  if (stackDirection === 'sideBySide') {
    // Labels on front wall, beneath each stack
      let currentX = wallThickness;

      for (const resolvedSlot of resolvedSlots) {
        const slotCenterX = currentX + resolvedSlot.slotWidth / 2;
        const slotCenterY = trayDepth / 2;

        if (resolvedSlot.stack.label?.trim()) {
          const labelGeom = createStackLabelGeometry(
            resolvedSlot.stack.label,
            slotCenterX,
            slotCenterY,
            resolvedSlot.slotWidth,
            resolvedSlot.slotDepth,
            trayHeight,
            floorThickness,
            wallThickness,
            stackDirection
          );
          if (labelGeom) stackLabelCuts.push(labelGeom);
        }

        currentX += resolvedSlot.slotWidth + wallThickness;
      }
    } else {
      // Labels on left wall, next to each stack
      for (const resolvedSlot of resolvedSlots) {
        const slotCenterX = trayWidth / 2;
        const slotCenterY = resolvedSlot.baseStart + resolvedSlot.slotDepth / 2;

        if (resolvedSlot.stack.label?.trim()) {
          const labelGeom = createStackLabelGeometry(
            resolvedSlot.stack.label,
            slotCenterX,
            slotCenterY,
            resolvedSlot.slotWidth,
            resolvedSlot.slotDepth,
            trayHeight,
            floorThickness,
            wallThickness,
            stackDirection
          );
          if (labelGeom) stackLabelCuts.push(labelGeom);
        }
      }
    }

    if (stackLabelCuts.length > 0) {
      tray = subtract(tray, ...stackLabelCuts);
    }
  }

  return tray;
}
