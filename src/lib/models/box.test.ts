import { describe, expect, it } from 'vitest';

import { defaultLidParams } from '$lib/models/lid';
import type { Box } from '$lib/types/project';

import { getBoxVisibleAssembledHeight, getRequiredTrayHeightForLayer } from './box';

describe('box layer tray height conversion', () => {
  it('subtracts the same visible lid height used by box exterior height calculations', () => {
    const box: Box = {
      id: 'box-1',
      name: 'Box 1',
      trays: [],
      tolerance: 0.5,
      wallThickness: 3,
      floorThickness: 2,
      fillSolidEmpty: true,
      lidParams: { ...defaultLidParams }
    };

    expect(getRequiredTrayHeightForLayer(box, 20)).toBe(16);
  });

  it('uses only the visible lid height for layer normalization', () => {
    const box: Box = {
      id: 'box-1',
      name: 'Box 1',
      trays: [],
      tolerance: 0.5,
      wallThickness: 3,
      floorThickness: 2,
      fillSolidEmpty: true,
      lidParams: { ...defaultLidParams },
      customBoxHeight: 30
    };

    expect(getBoxVisibleAssembledHeight(box)).toBe(32);
  });
});
