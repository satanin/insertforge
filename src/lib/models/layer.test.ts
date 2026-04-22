import { describe, expect, it } from 'vitest';

import { defaultCardDividerTrayParams } from '$lib/models/cardDividerTray';
import { defaultCardDrawTrayParams } from '$lib/models/cardTray';
import { createDefaultCardWellTrayParams } from '$lib/models/cardWellTray';
import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_CARD_SIZE_IDS, DEFAULT_SHAPE_IDS, defaultParams } from '$lib/models/counterTray';
import type { CardSize, CounterShape, Layer, LayeredBox, LayeredBoxSection } from '$lib/types/project';

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

    expect(height).toBe(80);
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

    expect(arrangement.layerHeight).toBe(80);
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

    expect(arrangement.layerHeight).toBe(100);
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

    expect(arrangement.layerHeight).toBe(100);
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

    expect(arrangement.layerHeight).toBe(100);
    expect(arrangement.looseTrays[0].dimensions.height).toBeLessThan(100);
  });
});
