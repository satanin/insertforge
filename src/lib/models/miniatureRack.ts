import jscad from '@jscad/modeling';

import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CounterStack } from './counterTray';
import { getSafeEmbossDepth } from './emboss';

export interface MiniatureRackSlot {
  id: string;
  label?: string;
  baseWidth: number;
  baseHeight: number;
  slotSpacingLeft: number;
  slotSpacingRight: number;
}

export interface MiniatureRackParams {
  rackHeight: number;
  rackBaseDepth: number;
  wallThickness: number;
  sideWallThickness: number;
  railWallThickness: number;
  railLipInset: number;
  baseWidthTolerance: number;
  baseHeightTolerance: number;
  slots: MiniatureRackSlot[];
}

export interface MiniatureRackDimensions {
  width: number;
  depth: number;
  height: number;
}

const { cuboid } = jscad.primitives;
const { union, subtract } = jscad.booleans;
const { translate, scale, mirrorY } = jscad.transforms;
const { hull } = jscad.hulls;
const { vectorText } = jscad.text;
const { path2 } = jscad.geometries;
const { expand } = jscad.expansions;
const { extrudeLinear } = jscad.extrusions;

export const DEFAULT_MINIATURE_RACK_SLOT_WIDTH = 32;
export const DEFAULT_MINIATURE_RACK_SLOT_HEIGHT = 3;
export const DEFAULT_MINIATURE_RACK_SPACING = 6;
export const DEFAULT_MINIATURE_RACK_HEIGHT = 60;
export const DEFAULT_MINIATURE_RACK_WALL_THICKNESS = 2;
export const DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS = 2;
export const DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS = 1.5;
export const DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET = 1.5;
export const DEFAULT_MINIATURE_RACK_BASE_DEPTH = 50;
export const DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE = 1.8;
export const DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE = 1;
const MIN_SLOT_BASE_WIDTH = 10;
const MIN_SLOT_BASE_HEIGHT = 1;
const MIN_SLOT_SPACING = 0;
const MIN_RACK_HEIGHT = 20;
const MIN_WALL_THICKNESS = 1;
const MIN_SIDE_WALL_THICKNESS = 1;
const MIN_RAIL_WALL_THICKNESS = 1;
const MIN_RAIL_LIP_INSET = 0.5;
const MIN_BASE_TOLERANCE = 0;
const MIN_BASE_DEPTH_ABSOLUTE = 12;

function clampPositive(value: number, minimum: number): number {
  return Number.isFinite(value) ? Math.max(value, minimum) : minimum;
}

export function getMiniatureRackMinimumBaseDepth(height: number): number {
  return Math.max(MIN_BASE_DEPTH_ABSOLUTE, height * 0.35);
}

export function normalizeMiniatureRackParams(params: MiniatureRackParams): MiniatureRackParams {
  const rackHeight = clampPositive(params.rackHeight, MIN_RACK_HEIGHT);
  return {
    rackHeight,
    rackBaseDepth: clampPositive(params.rackBaseDepth, getMiniatureRackMinimumBaseDepth(rackHeight)),
    wallThickness: clampPositive(params.wallThickness, MIN_WALL_THICKNESS),
    sideWallThickness: clampPositive(params.sideWallThickness, MIN_SIDE_WALL_THICKNESS),
    railWallThickness: clampPositive(
      Number.isFinite(params.railWallThickness)
        ? params.railWallThickness
        : DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
      MIN_RAIL_WALL_THICKNESS
    ),
    railLipInset: clampPositive(
      Number.isFinite(params.railLipInset) ? params.railLipInset : DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
      MIN_RAIL_LIP_INSET
    ),
    baseWidthTolerance: clampPositive(
      Number.isFinite(params.baseWidthTolerance)
        ? params.baseWidthTolerance
        : DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
      MIN_BASE_TOLERANCE
    ),
    baseHeightTolerance: clampPositive(
      Number.isFinite(params.baseHeightTolerance)
        ? params.baseHeightTolerance
        : DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
      MIN_BASE_TOLERANCE
    ),
    slots:
      params.slots.length > 0
        ? params.slots.map((slot) => ({
            ...slot,
            baseWidth: clampPositive(slot.baseWidth, MIN_SLOT_BASE_WIDTH),
            baseHeight: clampPositive(slot.baseHeight, MIN_SLOT_BASE_HEIGHT),
            slotSpacingLeft: clampPositive(slot.slotSpacingLeft, MIN_SLOT_SPACING),
            slotSpacingRight: clampPositive(slot.slotSpacingRight, MIN_SLOT_SPACING)
          }))
        : [
            {
              id: 'slot-1',
              baseWidth: DEFAULT_MINIATURE_RACK_SLOT_WIDTH,
              baseHeight: DEFAULT_MINIATURE_RACK_SLOT_HEIGHT,
              slotSpacingLeft: DEFAULT_MINIATURE_RACK_SPACING,
              slotSpacingRight: DEFAULT_MINIATURE_RACK_SPACING
            }
          ]
  };
}

export function getMiniatureRackDimensions(
  params: MiniatureRackParams,
  targetHeight?: number
): MiniatureRackDimensions {
  const normalized = normalizeMiniatureRackParams(params);
  const height = clampPositive(targetHeight ?? normalized.rackHeight, normalized.rackHeight);
  const width =
    normalized.sideWallThickness * 2 +
    normalized.slots.reduce(
      (sum, slot, index) =>
        sum +
        slot.slotSpacingLeft +
        normalized.railWallThickness * 2 +
        slot.baseWidth +
        normalized.baseWidthTolerance +
        slot.slotSpacingRight +
        (index > 0 ? normalized.wallThickness : 0),
      0
    );

  return {
    width,
    depth: Math.max(normalized.rackBaseDepth, getMiniatureRackMinimumBaseDepth(height)),
    height
  };
}

export function createDefaultMiniatureRackSlot(index: number): MiniatureRackSlot {
  return {
    id: `slot-${index}`,
    label: `S${index}`,
    baseWidth: DEFAULT_MINIATURE_RACK_SLOT_WIDTH,
    baseHeight: DEFAULT_MINIATURE_RACK_SLOT_HEIGHT,
    slotSpacingLeft: DEFAULT_MINIATURE_RACK_SPACING,
    slotSpacingRight: DEFAULT_MINIATURE_RACK_SPACING
  };
}

function createMiniatureRackSlotLabelGeometry(
  label: string,
  slotCenterX: number,
  slotWidth: number,
  rackHeight: number,
  wallThickness: number
): Geom3 | null {
  const trimmedLabel = label.trim();
  if (trimmedLabel.length === 0) return null;

  const { enabled: embossEnabled, depth: textDepth } = getSafeEmbossDepth(wallThickness);
  if (!embossEnabled) return null;

  const strokeWidth = 1.0;
  const baseTextHeight = 5;
  const verticalMargin = 2;
  const horizontalMargin = 1;
  const wallHeight = rackHeight - wallThickness;
  const availableVertical = wallHeight - verticalMargin * 2;
  const availableHorizontal = slotWidth - horizontalMargin * 2;
  if (availableVertical < 3 || availableHorizontal < 2) return null;

  const textSegments = vectorText({ height: baseTextHeight, align: 'center' }, trimmedLabel.toUpperCase());
  if (textSegments.length === 0) return null;

  const textShapes: ReturnType<typeof extrudeLinear>[] = [];
  for (const segment of textSegments) {
    if (segment.length >= 2) {
      const pathObj = path2.fromPoints({ closed: false }, segment);
      const expanded = expand({ delta: strokeWidth / 2, corners: 'round', segments: 32 }, pathObj);
      const extruded = extrudeLinear({ height: textDepth + 0.1 }, expanded);
      textShapes.push(extruded);
    }
  }
  if (textShapes.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
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
  const scaleH = Math.min(1, availableHorizontal / textHeight);
  const scaleV = Math.min(1, availableVertical / textWidth);
  const textScale = Math.min(scaleH, scaleV);
  if (textScale <= 0) return null;

  let combinedText = union(...textShapes);
  const textCenterX = (minX + maxX) / 2;
  const textCenterY = (minY + maxY) / 2;
  combinedText = translate([-textCenterX, -textCenterY, 0], combinedText);
  combinedText = scale([textScale, textScale, 1], combinedText);
  combinedText = mirrorY(combinedText);
  combinedText = jscad.transforms.rotateZ(-Math.PI / 2, combinedText);
  combinedText = jscad.transforms.rotateX(-Math.PI / 2, combinedText);
  combinedText = translate([slotCenterX, -0.1, wallThickness + wallHeight / 2], combinedText);

  return combinedText;
}

export function createMiniatureRack(
  params: MiniatureRackParams,
  trayName?: string,
  targetHeight?: number,
  showEmboss: boolean = true
): Geom3 {
  const normalized = normalizeMiniatureRackParams(params);
  const dimensions = getMiniatureRackDimensions(normalized, targetHeight);
  const parts: Geom3[] = [];

  // Base shelf of the L-shaped rack.
  parts.push(
    translate(
      [dimensions.width / 2, dimensions.depth / 2, normalized.wallThickness / 2],
      cuboid({
        size: [dimensions.width, dimensions.depth, normalized.wallThickness]
      })
    )
  );

  // Rear wall.
  parts.push(
    translate(
      [dimensions.width / 2, normalized.wallThickness / 2, dimensions.height / 2],
      cuboid({
        size: [dimensions.width, normalized.wallThickness, dimensions.height]
      })
    )
  );

  // Side walls as triangular reinforcements for a more stable rack.
  const createSideWall = (startX: number): Geom3 => {
    const vertexSize = 0.01;
    const centerX = startX + normalized.sideWallThickness / 2;
    const baseRearVertex = translate(
      [centerX, normalized.wallThickness, normalized.wallThickness],
      cuboid({
        size: [normalized.sideWallThickness, vertexSize, vertexSize]
      })
    );
    const topRearVertex = translate(
      [centerX, normalized.wallThickness, dimensions.height],
      cuboid({
        size: [normalized.sideWallThickness, vertexSize, vertexSize]
      })
    );
    const baseFrontVertex = translate(
      [centerX, dimensions.depth, normalized.wallThickness],
      cuboid({
        size: [normalized.sideWallThickness, vertexSize, vertexSize]
      })
    );

    return hull(baseRearVertex, topRearVertex, baseFrontVertex);
  };

  parts.push(createSideWall(0));
  parts.push(createSideWall(dimensions.width - normalized.sideWallThickness));

  // Vertical guide rails for each slot.
  let cursorX = normalized.sideWallThickness;
  const slotLabelCuts: Geom3[] = [];
  for (const slot of normalized.slots) {
    const railWallThickness = normalized.railWallThickness;
    const effectiveBaseWidth = slot.baseWidth + normalized.baseWidthTolerance;
    const slotOuterStartX = cursorX + slot.slotSpacingLeft;
    const slotInnerStartX = slotOuterStartX + railWallThickness;
    const lipReach = Math.min(
      Math.max(normalized.railLipInset, MIN_RAIL_LIP_INSET),
      Math.max(effectiveBaseWidth / 2 - railWallThickness * 0.5, MIN_RAIL_LIP_INSET)
    );
    const lipThickness = Math.min(
      railWallThickness,
      Math.max(dimensions.depth * 0.18, railWallThickness)
    );
    const desiredLipRearGap = slot.baseHeight + normalized.baseHeightTolerance;
    const railDepth = Math.min(
      Math.max(
        desiredLipRearGap + lipThickness,
        slot.baseHeight + normalized.wallThickness * 0.75,
        normalized.wallThickness * 1.2
      ),
      Math.max(dimensions.depth - normalized.wallThickness * 1.5, normalized.wallThickness * 1.2)
    );
    const lipRearGap = Math.min(
      desiredLipRearGap,
      Math.max(railDepth - lipThickness, normalized.baseHeightTolerance)
    );
    const leftStemCenterX = slotOuterStartX + railWallThickness / 2;
    const rightStemCenterX = slotInnerStartX + effectiveBaseWidth + railWallThickness / 2;
    const leftLipCenterX = slotInnerStartX + lipReach / 2;
    const rightLipCenterX = slotInnerStartX + effectiveBaseWidth - lipReach / 2;
    const slotCenterX = slotInnerStartX + effectiveBaseWidth / 2;

    const railStems = [
      { centerX: leftStemCenterX },
      { centerX: rightStemCenterX }
    ];

    for (const stem of railStems) {
      parts.push(
        translate(
          [
            stem.centerX,
            normalized.wallThickness + railDepth / 2,
            dimensions.height / 2
          ],
          cuboid({
            size: [railWallThickness, railDepth, dimensions.height]
          })
        )
      );
    }

    // Lips attached directly to the inner face of each rail wall.
    // In top view this should read as a hooked profile growing from the side wall,
    // not as a detached step sitting inside the slot.
    for (const lipCenterX of [leftLipCenterX, rightLipCenterX]) {
      parts.push(
        translate(
          [
            lipCenterX,
            normalized.wallThickness + lipRearGap + lipThickness / 2,
            dimensions.height / 2
          ],
          cuboid({
            size: [lipReach, lipThickness, dimensions.height]
          })
        )
      );
    }

    if (showEmboss) {
      const labelCut = createMiniatureRackSlotLabelGeometry(
        slot.label ?? '',
        slotCenterX,
        effectiveBaseWidth,
        dimensions.height,
        normalized.wallThickness
      );
      if (labelCut) {
        slotLabelCuts.push(labelCut);
      }
    }

    cursorX +=
      slot.slotSpacingLeft +
      railWallThickness * 2 +
      effectiveBaseWidth +
      slot.slotSpacingRight +
      normalized.wallThickness;
  }

  let result = union(...parts);

  if (slotLabelCuts.length > 0) {
    result = subtract(result, ...slotLabelCuts);
  }

  if (showEmboss && trayName && trayName.trim().length > 0) {
    const { enabled: embossEnabled, depth: textDepth } = getSafeEmbossDepth(normalized.wallThickness);
    if (!embossEnabled) return result;

    const strokeWidth = 1.2;
    const textHeightParam = 6;
    const margin = normalized.wallThickness * 2;
    const textSegments = vectorText({ height: textHeightParam, align: 'center' }, trayName.trim().toUpperCase());

    if (textSegments.length > 0) {
      const textShapes: ReturnType<typeof extrudeLinear>[] = [];
      for (const segment of textSegments) {
        if (segment.length >= 2) {
          const pathObj = path2.fromPoints({ closed: false }, segment);
          const expanded = expand({ delta: strokeWidth / 2, corners: 'round', segments: 32 }, pathObj);
          const extruded = extrudeLinear({ height: textDepth + 0.1 }, expanded);
          textShapes.push(extruded);
        }
      }

      if (textShapes.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const segment of textSegments) {
          for (const point of segment) {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
          }
        }

        const textWidthCalc = maxX - minX + strokeWidth;
        const textHeightCalc = maxY - minY + strokeWidth;
        const availableWidth = dimensions.width - margin * 2;
        const availableDepth = dimensions.depth - margin * 2;
        const scaleX = Math.min(1, availableWidth / textWidthCalc);
        const scaleY = Math.min(1, availableDepth / textHeightCalc);
        const textScale = Math.min(scaleX, scaleY);
        const centerX = dimensions.width / 2;
        const centerY = dimensions.depth / 2;
        const textCenterX = (minX + maxX) / 2;
        const textCenterY = (minY + maxY) / 2;

        let combinedText = union(...textShapes);
        combinedText = mirrorY(combinedText);

        const positionedText = translate(
          [centerX - textCenterX * textScale, centerY + textCenterY * textScale, -0.1],
          scale([textScale, textScale, 1], combinedText)
        );

        result = subtract(result, positionedText);
      }
    }
  }

  return result;
}

export function getMiniatureRackPreviewPositions(params: MiniatureRackParams): CounterStack[] {
  const normalized = normalizeMiniatureRackParams(params);
  const dimensions = getMiniatureRackDimensions(normalized);
  const previewStacks: CounterStack[] = [];

  let cursorX = normalized.sideWallThickness;
  for (const slot of normalized.slots) {
    const railWallThickness = normalized.railWallThickness;
    const effectiveBaseWidth = slot.baseWidth + normalized.baseWidthTolerance;
    const slotOuterStartX = cursorX + slot.slotSpacingLeft;
    const slotInnerStartX = slotOuterStartX + railWallThickness;
    const lipThickness = Math.min(
      railWallThickness,
      Math.max(dimensions.depth * 0.18, railWallThickness)
    );
    const desiredLipRearGap = slot.baseHeight + normalized.baseHeightTolerance;
    const railDepth = Math.min(
      Math.max(
        desiredLipRearGap + lipThickness,
        slot.baseHeight + normalized.wallThickness * 0.75,
        normalized.wallThickness * 1.2
      ),
      Math.max(dimensions.depth - normalized.wallThickness * 1.5, normalized.wallThickness * 1.2)
    );
    const lipRearGap = Math.min(
      desiredLipRearGap,
      Math.max(railDepth - lipThickness, normalized.baseHeightTolerance)
    );
    const previewYOffset = normalized.wallThickness + (lipRearGap - slot.baseHeight) / 2;
    const usableHeight = Math.max(dimensions.height - normalized.wallThickness, slot.baseWidth);
    const previewCount = Math.max(1, Math.floor(usableHeight / slot.baseWidth));

    for (let index = 0; index < previewCount; index += 1) {
      previewStacks.push({
        shape: 'circle',
        x: slotInnerStartX + (effectiveBaseWidth - slot.baseWidth) / 2,
        y: previewYOffset,
        z: normalized.wallThickness + index * slot.baseWidth,
        width: slot.baseWidth,
        length: slot.baseWidth,
        thickness: slot.baseHeight,
        count: 1,
        hexPointyTop: false,
        color: '#7d8f6a',
        isEdgeLoaded: true,
        edgeOrientation: 'crosswise',
        slotWidth: slot.baseWidth,
        slotDepth: slot.baseHeight,
        label: 'Miniature base'
      });
    }

    cursorX +=
      slot.slotSpacingLeft +
      railWallThickness * 2 +
      effectiveBaseWidth +
      slot.slotSpacingRight +
      normalized.wallThickness;
  }

  return previewStacks;
}
