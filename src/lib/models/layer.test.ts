import { describe, expect, it } from 'vitest';

import { defaultCardDividerTrayParams } from '$lib/models/cardDividerTray';
import { defaultCardDrawTrayParams } from '$lib/models/cardTray';
import { createDefaultCardWellTrayParams } from '$lib/models/cardWellTray';
import { defaultCupTrayParams } from '$lib/models/cupTray';
import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_CARD_SIZE_IDS, DEFAULT_SHAPE_IDS, defaultParams } from '$lib/models/counterTray';
import type { Box, CardSize, CounterShape, Layer, LayeredBox, LayeredBoxSection } from '$lib/types/project';

import { arrangeLayerContents, calculateLayerHeight, getLayeredBoxExteriorDimensions, getLayeredBoxRenderLayout } from './layer';

const counterShapes: CounterShape[] = [
  {
    id: DEFAULT_SHAPE_IDS.square,
    name: 'Square',
    category: 'counter',
    baseShape: 'square',
    width: 16,
    length: 16,
    thickness: 1.3
  }
];

const cardSizes: CardSize[] = [
  {
    id: DEFAULT_CARD_SIZE_IDS.standard,
    name: 'Standard',
    width: 63.5,
    length: 88,
    thickness: 0.35
  }
];

function createCounterSection(id: string, name: string): LayeredBoxSection {
  return {
    id,
    type: 'counter',
    name,
    color: '#c9503c',
    counterParams: {
      ...defaultParams,
      topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, name]],
      edgeLoadedStacks: []
    }
  };
}

function createLayeredBox(overrides: Partial<LayeredBox> = {}): LayeredBox {
  return {
    id: 'layered-box-1',
    name: 'Layered Box 1',
    tolerance: 0.5,
    wallThickness: 3,
    floorThickness: 2,
    lidParams: { ...defaultLidParams },
    layers: [
      {
        id: 'internal-layer-1',
        name: 'Layer 1',
        sections: [createCounterSection('section-a', 'Section A'), createCounterSection('section-b', 'Section B')]
      }
    ],
    ...overrides
  };
}

function createEmptyBox(id: string, customBoxHeight: number, autoHeight = true): Box {
  return {
    id,
    name: id,
    trays: [],
    tolerance: 0.5,
    wallThickness: 3,
    floorThickness: 2,
    lidParams: { ...defaultLidParams },
    customWidth: 50,
    customDepth: 50,
    customBoxHeight,
    fillSolidEmpty: true,
    autoHeight
  };
}

describe('layered box layout model', () => {
  it('respects manual layout placement and rotation for internal sections', () => {
    const layeredBox = createLayeredBox({
      layers: [
        {
          id: 'internal-layer-1',
          name: 'Layer 1',
          manualLayout: [{ trayId: 'section-b', x: 12, y: 8, rotation: 90 }],
          sections: [createCounterSection('section-a', 'Section A'), createCounterSection('section-b', 'Section B')]
        }
      ]
    });

    const layout = getLayeredBoxRenderLayout(layeredBox, [], counterShapes);
    const sectionA = layout.sections.find((section) => section.section.id === 'section-a');
    const sectionB = layout.sections.find((section) => section.section.id === 'section-b');

    expect(sectionA).toMatchObject({
      x: 0,
      y: 0,
      rotation: 0,
      internalLayerId: 'internal-layer-1'
    });
    expect(sectionB).toMatchObject({
      x: 12,
      y: 8,
      rotation: 90,
      internalLayerId: 'internal-layer-1'
    });
    expect(sectionA).not.toBeUndefined();
    expect(sectionB).not.toBeUndefined();
    expect(sectionB!.dimensions.width).toBe(sectionA!.dimensions.depth);
    expect(sectionB!.dimensions.depth).toBe(sectionA!.dimensions.width);
  });

  it('uses custom exterior dimensions when provided', () => {
    const layeredBox = createLayeredBox({
      customWidth: 120,
      customDepth: 90,
      customBoxHeight: 55
    });

    const dims = getLayeredBoxExteriorDimensions(layeredBox, [], counterShapes);

    expect(dims).toMatchObject({
      width: 120,
      depth: 90,
      bodyHeight: 55,
      height: 61
    });
  });

  it('includes layered boxes and boards when calculating layer height', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [createLayeredBox()],
      looseTrays: [],
      boards: [
        {
          id: 'board-1',
          name: 'Board 1',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 80
        }
      ]
    };

    const height = calculateLayerHeight(layer, { cardSizes: [], counterShapes });

    expect(height).toBe(98);
  });

  it('keeps counter tray placement at natural height when auto height is disabled', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'counter',
          name: 'Counter Tray 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...defaultParams,
            topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, 'Counters']],
            edgeLoadedStacks: []
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 80
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes: [],
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(80);
    expect(arrangement.layerHeight).toBeCloseTo(80 + arrangement.looseTrays[0].dimensions.height);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(80);
  });

  it('keeps card divider placement at natural height when auto height is disabled', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'cardDivider',
          name: 'Card Divider 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          showStackLabels: true,
          params: {
            ...defaultCardDividerTrayParams,
            orientation: 'horizontal',
            stacks: [{ cardSizeId: DEFAULT_CARD_SIZE_IDS.standard, count: 30, label: 'Cards' }]
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 100
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(100);
    expect(arrangement.layerHeight).toBeCloseTo(100 + arrangement.looseTrays[0].dimensions.height);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(100);
  });

  it('keeps card draw placement at natural height when auto height is disabled', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'cardDraw',
          name: 'Card Draw 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...defaultCardDrawTrayParams,
            cardSizeId: DEFAULT_CARD_SIZE_IDS.standard,
            cardCount: 30
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 100
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(100);
    expect(arrangement.layerHeight).toBeCloseTo(100 + arrangement.looseTrays[0].dimensions.height);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(100);
  });

  it('keeps card well placement at natural height when auto height is disabled', () => {
    const params = createDefaultCardWellTrayParams();
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'cardWell',
          name: 'Card Well 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...params,
            stacks: params.stacks.map((stack) => ({
              ...stack,
              cardSizeId: DEFAULT_CARD_SIZE_IDS.standard,
              count: 30
            }))
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 100
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(100);
    expect(arrangement.layerHeight).toBeCloseTo(100 + arrangement.looseTrays[0].dimensions.height);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(100);
  });

  it('keeps cup tray placement at natural height when auto height is disabled', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'cup',
          name: 'Cup Tray 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...defaultCupTrayParams
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 100
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(100);
    expect(arrangement.layerHeight).toBeCloseTo(100 + arrangement.looseTrays[0].dimensions.height);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(100);
  });

  it('keeps box placement at natural height when auto height is disabled', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [
        {
          id: 'box-1',
          name: 'Box 1',
          trays: [],
          tolerance: 0.5,
          wallThickness: 3,
          floorThickness: 2,
          lidParams: { ...defaultLidParams },
          customWidth: 50,
          customDepth: 50,
          customBoxHeight: 30,
          fillSolidEmpty: true,
          autoHeight: false
        }
      ],
      layeredBoxes: [],
      looseTrays: [],
      boards: [
        {
          id: 'board-1',
          name: 'Tall Item',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 100
        }
      ]
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.boxes[0].baseHeight).toBe(100);
    expect(arrangement.layerHeight).toBeCloseTo(100 + arrangement.boxes[0].dimensions.height);
    expect(arrangement.boxes[0].dimensions.height).toBeLessThan(100);
  });

  it('adjusts auto-height boxes on boards to the remaining layer height', () => {
    const tallBox = createEmptyBox('tall-box', 94, false);
    const stackedBox = createEmptyBox('stacked-box', 28, true);
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [tallBox, stackedBox],
      layeredBoxes: [],
      looseTrays: [],
      boards: [
        {
          id: 'board-1',
          name: 'Board 1',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 45
        }
      ],
      manualLayout: {
        boxes: [
          { boxId: 'tall-box', x: 120, y: 0, rotation: 0 },
          { boxId: 'stacked-box', x: 0, y: 0, rotation: 0 }
        ],
        looseTrays: [],
        boards: [{ boardId: 'board-1', x: 0, y: 0, rotation: 0 }]
      }
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    const stackedPlacement = arrangement.boxes.find((placement) => placement.box.id === 'stacked-box');

    expect(arrangement.layerHeight).toBe(96);
    expect(stackedPlacement?.baseHeight).toBe(45);
    expect(stackedPlacement?.dimensions.height).toBe(51);
  });

  it('uses the tallest occupied stack as auto-height reference', () => {
    const shortStackedBox = createEmptyBox('short-stacked-box', 28, true);
    const tallStackedBox = createEmptyBox('tall-stacked-box', 53, true);
    const unstackedBox = createEmptyBox('unstacked-box', 28, true);
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [shortStackedBox, tallStackedBox, unstackedBox],
      layeredBoxes: [],
      looseTrays: [],
      boards: [
        {
          id: 'board-1',
          name: 'Board 1',
          color: '#6b7f95',
          width: 120,
          depth: 80,
          height: 45
        }
      ],
      manualLayout: {
        boxes: [
          { boxId: 'short-stacked-box', x: 0, y: 0, rotation: 0 },
          { boxId: 'tall-stacked-box', x: 60, y: 0, rotation: 0 },
          { boxId: 'unstacked-box', x: 140, y: 0, rotation: 0 }
        ],
        looseTrays: [],
        boards: [{ boardId: 'board-1', x: 0, y: 0, rotation: 0 }]
      }
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    const shortStackedPlacement = arrangement.boxes.find((placement) => placement.box.id === 'short-stacked-box');
    const tallStackedPlacement = arrangement.boxes.find((placement) => placement.box.id === 'tall-stacked-box');
    const unstackedPlacement = arrangement.boxes.find((placement) => placement.box.id === 'unstacked-box');

    expect(arrangement.layerHeight).toBe(100);
    expect(shortStackedPlacement?.baseHeight).toBe(45);
    expect(shortStackedPlacement?.dimensions.height).toBe(55);
    expect(tallStackedPlacement?.baseHeight).toBe(45);
    expect(tallStackedPlacement?.dimensions.height).toBe(55);
    expect(unstackedPlacement?.baseHeight).toBe(0);
    expect(unstackedPlacement?.dimensions.height).toBe(100);
  });

  it('does not lift manually placed content that does not overlap a board', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'counter',
          name: 'Counter Tray 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...defaultParams,
            topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, 'Counters']],
            edgeLoadedStacks: []
          }
        }
      ],
      boards: [
        {
          id: 'board-1',
          name: 'Board 1',
          color: '#6b7f95',
          width: 100,
          depth: 80,
          height: 80
        }
      ],
      manualLayout: {
        boxes: [],
        looseTrays: [{ trayId: 'tray-1', x: 120, y: 0, rotation: 0 }],
        boards: [{ boardId: 'board-1', x: 0, y: 0, rotation: 0 }]
      }
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(0);
    expect(arrangement.layerHeight).toBe(80);
  });

  it('does not treat layered box proxies as board supports', () => {
    const layer: Layer = {
      id: 'layer-1',
      name: 'Layer 1',
      boxes: [],
      layeredBoxes: [createLayeredBox()],
      looseTrays: [
        {
          id: 'tray-1',
          type: 'counter',
          name: 'Counter Tray 1',
          color: '#c9503c',
          rotationOverride: 'auto',
          autoHeight: false,
          params: {
            ...defaultParams,
            topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, 'Counters']],
            edgeLoadedStacks: []
          }
        }
      ],
      boards: []
    };

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      cardSizes,
      counterShapes
    });

    expect(arrangement.looseTrays[0].baseHeight).toBe(0);
  });
});
