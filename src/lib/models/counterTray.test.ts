import { describe, expect, it } from 'vitest';

import { getCounterTrayDimensions } from './box';
import { defaultParams, getCounterPositions, type EdgeLoadedStackDef } from './counterTray';

const counterShapes = [
  {
    id: 'shape-square',
    name: 'Square',
    baseShape: 'square' as const,
    width: 20,
    length: 20,
    thickness: 2
  }
];

describe('counter tray defaults', () => {
  it('uses a 1mm rim by default', () => {
    expect(defaultParams.rimHeight).toBe(1);
  });

  it('applies edge-loaded thickness clearance once for the full stack in preview positions', () => {
    const params = {
      ...defaultParams,
      topLoadedStacks: [],
      edgeLoadedStacks: [['shape-square', 5, 'lengthwise'] as EdgeLoadedStackDef]
    };

    const [stack] = getCounterPositions(params, counterShapes);

    expect(stack.slotWidth).toBeCloseTo(10.6, 5);
  });

  it('keeps counter tray dimensions aligned with the shared edge-loaded span rule', () => {
    const singleTokenParams = {
      ...defaultParams,
      topLoadedStacks: [],
      edgeLoadedStacks: [['shape-square', 1, 'lengthwise'] as EdgeLoadedStackDef]
    };
    const fiveTokenParams = {
      ...defaultParams,
      topLoadedStacks: [],
      edgeLoadedStacks: [['shape-square', 5, 'lengthwise'] as EdgeLoadedStackDef]
    };

    const singleTokenDimensions = getCounterTrayDimensions(singleTokenParams, counterShapes);
    const fiveTokenDimensions = getCounterTrayDimensions(fiveTokenParams, counterShapes);

    expect(fiveTokenDimensions.width - singleTokenDimensions.width).toBeCloseTo(8, 5);
  });
});
