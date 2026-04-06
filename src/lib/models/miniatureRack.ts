import jscad from '@jscad/modeling';

import type { Geom3 } from '@jscad/modeling/src/geometries/types';

export interface MiniatureRackSlot {
  id: string;
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
  slots: MiniatureRackSlot[];
}

export interface MiniatureRackDimensions {
  width: number;
  depth: number;
  height: number;
}

const { cuboid } = jscad.primitives;
const { union } = jscad.booleans;
const { translate } = jscad.transforms;

export const DEFAULT_MINIATURE_RACK_SLOT_WIDTH = 32;
export const DEFAULT_MINIATURE_RACK_SLOT_HEIGHT = 3;
export const DEFAULT_MINIATURE_RACK_SPACING = 4;
export const DEFAULT_MINIATURE_RACK_HEIGHT = 60;
export const DEFAULT_MINIATURE_RACK_WALL_THICKNESS = 3;
export const DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS = 5;
export const DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS = 2;
export const DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET = 4;
export const DEFAULT_MINIATURE_RACK_BASE_DEPTH = 24;
const MIN_SLOT_BASE_WIDTH = 10;
const MIN_SLOT_BASE_HEIGHT = 1;
const MIN_SLOT_SPACING = 0;
const MIN_RACK_HEIGHT = 20;
const MIN_WALL_THICKNESS = 2;
const MIN_SIDE_WALL_THICKNESS = 2;
const MIN_RAIL_WALL_THICKNESS = 1;
const MIN_RAIL_LIP_INSET = 0.5;
const MIN_BASE_DEPTH_ABSOLUTE = 12;
const MINIATURE_RACK_BASE_TOLERANCE = 0.3;

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
    baseWidth: DEFAULT_MINIATURE_RACK_SLOT_WIDTH,
    baseHeight: DEFAULT_MINIATURE_RACK_SLOT_HEIGHT,
    slotSpacingLeft: DEFAULT_MINIATURE_RACK_SPACING,
    slotSpacingRight: DEFAULT_MINIATURE_RACK_SPACING
  };
}

export function createMiniatureRack(
  params: MiniatureRackParams,
  targetHeight?: number
): Geom3 {
  const normalized = normalizeMiniatureRackParams(params);
  const dimensions = getMiniatureRackDimensions(normalized, targetHeight);
  const reinforcementDepth = Math.max(
    normalized.wallThickness * 3,
    Math.min(dimensions.depth * 0.55, dimensions.depth - normalized.wallThickness)
  );
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

  // Side reinforcements.
  for (const sideX of [
    normalized.sideWallThickness / 2,
    dimensions.width - normalized.sideWallThickness / 2
  ]) {
    parts.push(
      translate(
        [sideX, reinforcementDepth / 2, dimensions.height / 2],
        cuboid({
          size: [normalized.sideWallThickness, reinforcementDepth, dimensions.height]
        })
      )
    );
  }

  // Vertical guide rails for each slot.
  let cursorX = normalized.sideWallThickness;
  for (const slot of normalized.slots) {
    const railWallThickness = normalized.railWallThickness;
    const slotOuterStartX = cursorX + slot.slotSpacingLeft;
    const slotInnerStartX = slotOuterStartX + railWallThickness;
    const lipReach = Math.min(
      Math.max(normalized.railLipInset, MIN_RAIL_LIP_INSET),
      Math.max(slot.baseWidth / 2 - railWallThickness * 0.5, MIN_RAIL_LIP_INSET)
    );
    const lipThickness = Math.min(
      railWallThickness,
      Math.max(dimensions.depth * 0.18, railWallThickness)
    );
    const desiredLipRearGap = slot.baseHeight + MINIATURE_RACK_BASE_TOLERANCE;
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
      Math.max(railDepth - lipThickness, MINIATURE_RACK_BASE_TOLERANCE)
    );
    const leftStemCenterX = slotOuterStartX + railWallThickness / 2;
    const rightStemCenterX = slotInnerStartX + slot.baseWidth + railWallThickness / 2;
    const leftLipCenterX = slotInnerStartX + lipReach / 2;
    const rightLipCenterX = slotInnerStartX + slot.baseWidth - lipReach / 2;

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
    cursorX +=
      slot.slotSpacingLeft +
      railWallThickness * 2 +
      slot.baseWidth +
      slot.slotSpacingRight +
      normalized.wallThickness;
  }

  return union(...parts);
}
