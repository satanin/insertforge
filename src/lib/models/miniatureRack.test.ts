import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MINIATURE_RACK_BASE_DEPTH,
  DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
  DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
  DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
  DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
  DEFAULT_MINIATURE_RACK_RIM_HEIGHT,
  DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
  DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
  createDefaultMiniatureRackSlot,
  getMiniatureRackDimensions,
  getMiniatureRackPreviewPositions,
  getMiniatureRackResolvedHeight,
  MAX_MINIATURES_IN_SLOT,
  type MiniatureRackParams
} from './miniatureRack';

function createParams(overrides: Partial<MiniatureRackParams> = {}): MiniatureRackParams {
  return {
    rackHeight: null,
    rackBaseDepth: DEFAULT_MINIATURE_RACK_BASE_DEPTH,
    wallThickness: DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
    sideWallThickness: DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
    railWallThickness: DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
    railLipInset: DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
    rimHeight: DEFAULT_MINIATURE_RACK_RIM_HEIGHT,
    baseWidthTolerance: DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
    baseHeightTolerance: DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
    slots: [createDefaultMiniatureRackSlot(1)],
    ...overrides
  };
}

describe('miniature rack dimensions', () => {
  it('uses the tallest base width as automatic rack height by default', () => {
    const firstSlot = createDefaultMiniatureRackSlot(1);
    const secondSlot = createDefaultMiniatureRackSlot(2);
    firstSlot.baseWidth = 45;
    secondSlot.baseWidth = 72;

    const params = createParams({ slots: [firstSlot, secondSlot] });

    expect(getMiniatureRackResolvedHeight(params)).toBe(77);
    expect(getMiniatureRackDimensions(params).height).toBe(77);
  });

  it('uses an explicit slot height for oval bases', () => {
    const slot = createDefaultMiniatureRackSlot(1);
    slot.baseWidth = 32;
    slot.baseVerticalSize = 60;

    const params = createParams({ slots: [slot] });

    expect(getMiniatureRackResolvedHeight(params)).toBe(65);
    expect(getMiniatureRackDimensions(params).height).toBe(65);
  });

  it('lets a manual rack height override automatic slot height', () => {
    const slot = createDefaultMiniatureRackSlot(1);
    slot.baseVerticalSize = 72;

    const params = createParams({ rackHeight: 55, slots: [slot] });

    expect(getMiniatureRackResolvedHeight(params)).toBe(55);
    expect(getMiniatureRackDimensions(params).height).toBe(55);
  });

  it('uses miniature height to set the minimum rack base depth', () => {
    const slot = createDefaultMiniatureRackSlot(1);
    slot.miniatureHeight = 85;

    const params = createParams({
      rackBaseDepth: 20,
      slots: [slot]
    });

    expect(getMiniatureRackDimensions(params).depth).toBe(90);
  });

  it('uses miniature count to stack bases in automatic rack height and preview', () => {
    const slot = createDefaultMiniatureRackSlot(1);
    slot.baseWidth = 32;
    slot.miniatureCount = 3;

    const params = createParams({ slots: [slot] });

    expect(getMiniatureRackResolvedHeight(params)).toBe(101);
    expect(getMiniatureRackDimensions(params).height).toBe(101);
    expect(getMiniatureRackPreviewPositions(params)).toHaveLength(3);
  });

  it('clamps miniature count to a practical range', () => {
    const lowSlot = createDefaultMiniatureRackSlot(1);
    lowSlot.miniatureCount = -4;

    const highSlot = createDefaultMiniatureRackSlot(2);
    highSlot.miniatureCount = 999;

    expect(getMiniatureRackPreviewPositions(createParams({ slots: [lowSlot] }))).toHaveLength(1);
    expect(getMiniatureRackPreviewPositions(createParams({ slots: [highSlot] }))).toHaveLength(MAX_MINIATURES_IN_SLOT);
  });
});
