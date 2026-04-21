import defaultProjectJson from '$lib/data/defaultProject.json';
import { defaultCardDividerTrayParams, type CardDividerTrayParams } from '$lib/models/cardDividerTray';
import { defaultCardDrawTrayParams, type CardDrawTrayParams } from '$lib/models/cardTray';
import { createDefaultCardWellTrayParams, type CardWellTrayParams } from '$lib/models/cardWellTray';
import {
  DEFAULT_CARD_SIZE_IDS,
  DEFAULT_SHAPE_IDS,
  defaultParams,
  type CounterTrayParams
} from '$lib/models/counterTray';
import { defaultCupTrayParams, type CupTrayParams } from '$lib/models/cupTray';
import { defaultLidParams } from '$lib/models/lid';
import {
  createDefaultMiniatureRackSlot,
  DEFAULT_MINIATURE_RACK_BASE_DEPTH,
  DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
  DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
  DEFAULT_MINIATURE_RACK_HEIGHT,
  DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
  DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
  DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
  DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
  type MiniatureRackParams
} from '$lib/models/miniatureRack';
import {
  DEFAULT_EMPTY_BOX_BODY_HEIGHT,
  DEFAULT_EMPTY_BOX_DEPTH,
  DEFAULT_EMPTY_BOX_WIDTH,
  arrangeTrays,
  calculateMinimumBoxDimensions,
  getBoxInteriorDimensions
} from '$lib/models/box';
import {
  arrangeLayerContents,
  arrangementToManualPlacements,
  getLayeredBoxRenderLayout,
  getLayeredBoxSectionDimensions
} from '$lib/models/layer';
import { saveNow, scheduleSave } from '$lib/stores/saveManager';
import { createDefaultCupLayout } from '$lib/types/cupLayout';
import type {
  Board,
  Box,
  CardDividerTray,
  CardDrawTray,
  CardSize,
  CardTray,
  CardWellTray,
  CounterShape,
  CounterTray,
  CupTray,
  Layer,
  LayeredBox,
  LayeredBoxLayer,
  LayeredBoxSection,
  LayeredBoxSectionType,
  LidParams,
  MiniatureRackTray,
  ManualBoxPlacement,
  ManualBoardPlacement,
  ManualLooseTrayPlacement,
  ManualTrayPlacement,
  Project,
  Tray
} from '$lib/types/project';
import {
  findTrayLocation,
  isCardDividerTray,
  isCardDrawTray,
  isCardTray,
  isCardWellTray,
  isCounterTray,
  isCupTray,
  isMiniatureRackTray,
  isLooseTray
} from '$lib/types/project';
import { loadProject, migrateProjectData } from '$lib/utils/storage';

export {
  findTrayLocation,
  isCardDividerTray,
  isCardDrawTray,
  isCardTray,
  isCardWellTray,
  isCounterTray,
  isCupTray,
  isMiniatureRackTray,
  isLooseTray
};
export type {
  Board,
  Box,
  CardDividerTray,
  CardDrawTray,
  CardSize,
  CardTray,
  CardWellTray,
  CounterShape,
  CounterTray,
  CupTray,
  Layer,
  LayeredBox,
  LayeredBoxLayer,
  LayeredBoxSection,
  LayeredBoxSectionType,
  LidParams,
  ManualBoxPlacement,
  ManualBoardPlacement,
  ManualLooseTrayPlacement,
  ManualTrayPlacement,
  Project,
  Tray
};

// Default counter thickness (used when migrating old shapes without thickness)
export const DEFAULT_COUNTER_THICKNESS = 1.3;
export const DEFAULT_PROJECT_NAME = 'InsertForge Project';
export const CURRENT_PROJECT_SCHEMA_VERSION = 3;

// Default counter shapes (global)
export const DEFAULT_COUNTER_SHAPES: CounterShape[] = [
  {
    id: DEFAULT_SHAPE_IDS.square,
    name: 'Square',
    category: 'counter',
    baseShape: 'square',
    width: 15.9,
    length: 15.9,
    thickness: DEFAULT_COUNTER_THICKNESS
  },
  {
    id: DEFAULT_SHAPE_IDS.hex,
    name: 'Hex',
    category: 'counter',
    baseShape: 'hex',
    width: 15.9,
    length: 15.9,
    thickness: DEFAULT_COUNTER_THICKNESS,
    pointyTop: false
  },
  {
    id: DEFAULT_SHAPE_IDS.circle,
    name: 'Circle',
    category: 'counter',
    baseShape: 'circle',
    width: 15.9,
    length: 15.9,
    thickness: DEFAULT_COUNTER_THICKNESS
  },
  {
    id: DEFAULT_SHAPE_IDS.triangle,
    name: 'Triangle',
    category: 'counter',
    baseShape: 'triangle',
    width: 15.9,
    length: 15.9,
    thickness: DEFAULT_COUNTER_THICKNESS,
    cornerRadius: 1.5
  }
];

// Default card sizes (global)
export const DEFAULT_CARD_SIZES: CardSize[] = [
  { id: DEFAULT_CARD_SIZE_IDS.standard, name: 'Standard', width: 66, length: 91, thickness: 0.5 },
  {
    id: DEFAULT_CARD_SIZE_IDS.miniAmerican,
    name: 'Mini American',
    width: 44,
    length: 66,
    thickness: 0.5
  },
  {
    id: DEFAULT_CARD_SIZE_IDS.miniEuropean,
    name: 'Mini European',
    width: 47,
    length: 71,
    thickness: 0.5
  },
  { id: DEFAULT_CARD_SIZE_IDS.euro, name: 'Euro', width: 62, length: 95, thickness: 0.5 },
  { id: DEFAULT_CARD_SIZE_IDS.japanese, name: 'Japanese', width: 62, length: 89, thickness: 0.5 },
  { id: DEFAULT_CARD_SIZE_IDS.tarot, name: 'Tarot', width: 73, length: 123, thickness: 0.5 },
  { id: DEFAULT_CARD_SIZE_IDS.square, name: 'Square', width: 73, length: 73, thickness: 0.5 }
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate a tray letter based on cumulative index across all layers.
 * A-Z for first 26, then AA, BB, CC... for 26+
 */
export function getTrayLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  // For 26+, use AA, BB, CC, etc.
  const letter = String.fromCharCode(65 + (index % 26));
  const repeat = Math.floor(index / 26) + 1;
  return letter.repeat(repeat);
}

/**
 * Get cumulative tray index across all layers.
 * Order: For each layer, count box trays first, then loose trays.
 */
export function getCumulativeTrayIndexForTray(layers: Layer[], trayId: string): number {
  let cumulative = 0;
  for (const layer of layers) {
    // Count box trays
    for (const box of layer.boxes) {
      for (const tray of box.trays) {
        if (tray.id === trayId) {
          return cumulative;
        }
        cumulative++;
      }
    }
    // Count loose trays
    for (const tray of layer.looseTrays) {
      if (tray.id === trayId) {
        return cumulative;
      }
      cumulative++;
    }
  }
  return cumulative;
}

/**
 * Legacy: Get cumulative tray index across all boxes (for backwards compatibility).
 * @deprecated Use getCumulativeTrayIndexForTray instead
 */
export function getCumulativeTrayIndex(boxes: Box[], boxIndex: number, trayIndex: number): number {
  let cumulative = 0;
  for (let i = 0; i < boxIndex; i++) {
    cumulative += boxes[i].trays.length;
  }
  return cumulative + trayIndex;
}

/**
 * Get tray letter for a specific tray by ID, cumulative across all layers.
 */
export function getTrayLetterById(layers: Layer[], trayId: string): string {
  return getTrayLetter(getCumulativeTrayIndexForTray(layers, trayId));
}

/**
 * Legacy: Get tray letter for a specific tray, cumulative across all boxes.
 * @deprecated Use getTrayLetterById instead
 */
export function getCumulativeTrayLetter(boxes: Box[], boxIndex: number, trayIndex: number): string {
  return getTrayLetter(getCumulativeTrayIndex(boxes, boxIndex, trayIndex));
}

// Color palette for trays
export const TRAY_COLORS = ['#c9503c', '#3d7a6a', '#d4956a', '#7c5c4a', '#a36b5a', '#5a7c6a'];

/**
 * Get total tray count across all layers (boxes + loose trays).
 */
function getTotalTrayCount(layers: Layer[]): number {
  let total = 0;
  for (const layer of layers) {
    for (const box of layer.boxes) {
      total += box.trays.length;
    }
    total += layer.looseTrays.length;
  }
  return total;
}

/**
 * Get the next color for a new tray based on total tray count across all layers.
 */
function getNextTrayColor(layers: Layer[]): string {
  const totalTrays = getTotalTrayCount(layers);
  return TRAY_COLORS[totalTrays % TRAY_COLORS.length];
}

function createDefaultCounterTray(name: string, color: string, counterShapes?: CounterShape[]): CounterTray {
  // Build a mapping from default shape IDs to project shape IDs
  const shapeIdMap: Record<string, string> = {};
  if (counterShapes && counterShapes.length > 0) {
    // Map default IDs to actual project IDs by matching names or falling back to first available
    const defaultToName: Record<string, string> = {
      [DEFAULT_SHAPE_IDS.square]: 'Square',
      [DEFAULT_SHAPE_IDS.hex]: 'Hex',
      [DEFAULT_SHAPE_IDS.circle]: 'Circle',
      [DEFAULT_SHAPE_IDS.triangle]: 'Triangle'
    };
    for (const [defaultId, name] of Object.entries(defaultToName)) {
      const match = counterShapes.find((s) => s.name === name);
      shapeIdMap[defaultId] = match?.id ?? counterShapes[0].id;
    }
  }

  const mapShapeId = (id: string) => shapeIdMap[id] ?? id;

  return {
    id: generateId(),
    type: 'counter',
    name,
    color,
    rotationOverride: 'auto',
    params: {
      ...defaultParams,
      topLoadedStacks: defaultParams.topLoadedStacks.map(([shapeId, count, label]) => [
        mapShapeId(shapeId),
        count,
        label
      ]),
      edgeLoadedStacks: defaultParams.edgeLoadedStacks.map(([shapeId, count, orientation, label]) => [
        mapShapeId(shapeId),
        count,
        orientation,
        label
      ])
    }
  };
}

function createDefaultPlayerBoardParams(counterShapes?: CounterShape[]): CounterTrayParams {
  const defaultCounterParams = createDefaultCounterTray('Player Board', '#6f7f92', counterShapes).params;
  const preferredShape =
    counterShapes?.find((shape) => (shape.category ?? 'counter') === 'playerBoard' && shape.name.toLowerCase() === 'personal board')?.id ??
    counterShapes
      ?.filter((shape) => (shape.category ?? 'counter') === 'playerBoard' && (shape.baseShape ?? 'rectangle') === 'rectangle')
      .sort((a, b) => Math.max(b.width, b.length) * Math.min(b.width, b.length) - Math.max(a.width, a.length) * Math.min(a.width, a.length))[0]
      ?.id ??
    counterShapes?.find((shape) => (shape.category ?? 'counter') === 'playerBoard')?.id ??
    counterShapes?.[0]?.id ??
    DEFAULT_SHAPE_IDS.square;

  return {
    ...defaultCounterParams,
    topLoadedStacks: [[preferredShape, 1, 'Board']],
    edgeLoadedStacks: [],
    trayWidthOverride: 0
  };
}

function createDefaultCardDrawTray(name: string, color: string, cardSizes?: CardSize[]): CardDrawTray {
  // Use the first available card size, falling back to default ID
  const cardSizeId = cardSizes?.[0]?.id ?? DEFAULT_CARD_SIZE_IDS.standard;
  return {
    id: generateId(),
    type: 'cardDraw',
    name,
    color,
    rotationOverride: 'auto',
    params: { ...defaultCardDrawTrayParams, cardSizeId }
  };
}

function createDefaultCardDividerTray(name: string, color: string, cardSizes?: CardSize[]): CardDividerTray {
  // Use the first available card size, falling back to default ID
  const cardSizeId = cardSizes?.[0]?.id ?? DEFAULT_CARD_SIZE_IDS.standard;
  return {
    id: generateId(),
    type: 'cardDivider',
    name,
    color,
    rotationOverride: 'auto',
    params: {
      ...defaultCardDividerTrayParams,
      stacks: defaultCardDividerTrayParams.stacks.map((stack) => ({
        ...stack,
        cardSizeId
      }))
    }
  };
}

function createDefaultCupTray(name: string, color: string): CupTray {
  return {
    id: generateId(),
    type: 'cup',
    name,
    color,
    rotationOverride: 'auto',
    params: { ...defaultCupTrayParams }
  };
}

function createDefaultCardWellTray(name: string, color: string, cardSizes?: CardSize[]): CardWellTray {
  const params = createDefaultCardWellTrayParams();
  // Use the first available card size for the initial stack
  const cardSizeId = cardSizes?.[0]?.id ?? DEFAULT_CARD_SIZE_IDS.standard;
  if (params.stacks.length > 0) {
    params.stacks[0].cardSizeId = cardSizeId;
  }
  return {
    id: generateId(),
    type: 'cardWell',
    name,
    color,
    rotationOverride: 'auto',
    params
  };
}

function createDefaultMiniatureRack(name: string, color: string): MiniatureRackTray {
  const params: MiniatureRackParams = {
    rackHeight: DEFAULT_MINIATURE_RACK_HEIGHT,
    rackBaseDepth: DEFAULT_MINIATURE_RACK_BASE_DEPTH,
    wallThickness: DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
    sideWallThickness: DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
    railWallThickness: DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
    railLipInset: DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
    baseWidthTolerance: DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
    baseHeightTolerance: DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
    slots: [createDefaultMiniatureRackSlot(1)]
  };
  return {
    id: generateId(),
    type: 'miniatureRack',
    name,
    color,
    rotationOverride: 'auto',
    showEmboss: true,
    params
  };
}

// Legacy alias for backwards compatibility
function _createDefaultCardTray(name: string, color: string): CardDrawTray {
  return createDefaultCardDrawTray(name, color);
}
function createDefaultBox(name: string): Box {
  return {
    id: generateId(),
    name,
    trays: [],
    tolerance: 0.5,
    wallThickness: 3.0,
    floorThickness: 2.0,
    fillSolidEmpty: true,
    lidParams: { ...defaultLidParams },
    customWidth: DEFAULT_EMPTY_BOX_WIDTH,
    customDepth: DEFAULT_EMPTY_BOX_DEPTH,
    customBoxHeight: DEFAULT_EMPTY_BOX_BODY_HEIGHT
  };
}

function shouldResetPlaceholderBoxDimensions(box: Box): boolean {
  return (
    box.trays.length === 0 &&
    box.customWidth === DEFAULT_EMPTY_BOX_WIDTH &&
    box.customDepth === DEFAULT_EMPTY_BOX_DEPTH &&
    box.customBoxHeight === DEFAULT_EMPTY_BOX_BODY_HEIGHT
  );
}

function createDefaultLayeredBoxSection(type: LayeredBoxSectionType, name: string): LayeredBoxSection {
  const color = getNextTrayColor(project.layers);
  const counterTray = createDefaultCounterTray(name, color, project.counterShapes);
  const cardDrawTray = createDefaultCardDrawTray(name, color, project.cardSizes);
  const cardDividerTray = createDefaultCardDividerTray(name, color, project.cardSizes);
  const cardWellTray = createDefaultCardWellTray(name, color, project.cardSizes);
  const cupTray = createDefaultCupTray(name, color);
  return {
    id: generateId(),
    type,
    name,
    color,
    counterParams:
      type === 'counter'
        ? counterTray.params
        : type === 'playerBoard'
          ? createDefaultPlayerBoardParams(project.counterShapes)
          : undefined,
    cardDrawParams: type === 'cardDraw' ? cardDrawTray.params : undefined,
    cardDividerParams: type === 'cardDivider' ? cardDividerTray.params : undefined,
    cardWellParams: type === 'cardWell' ? cardWellTray.params : undefined,
    cupParams: type === 'cup' ? cupTray.params : undefined
  };
}

function getSmallestCounterShapeId(category: 'counter' | 'playerBoard'): string | undefined {
  return (
    project.counterShapes
      .filter((shape) => (shape.category ?? 'counter') === category)
      .sort(
        (a, b) =>
          Math.max(a.width, a.length) * Math.min(a.width, a.length) -
          Math.max(b.width, b.length) * Math.min(b.width, b.length)
      )[0]?.id ??
    project.counterShapes[0]?.id
  );
}

function createMinimalEditableLayeredBoxSection(
  type: LayeredBoxSectionType,
  name: string,
  availableWidth?: number
): LayeredBoxSection {
  const section = createDefaultLayeredBoxSection(type, name);

  if ((type === 'counter' || type === 'playerBoard') && section.counterParams) {
    const smallestShapeId = getSmallestCounterShapeId(type === 'playerBoard' ? 'playerBoard' : 'counter');
    section.counterParams = {
      ...section.counterParams,
      topLoadedStacks: smallestShapeId ? [[smallestShapeId, 1]] : [],
      edgeLoadedStacks: [],
      trayWidthOverride:
        availableWidth !== undefined ? floorToSingleDecimal(Math.max(availableWidth, 20)) : section.counterParams.trayWidthOverride
    };
  }

  return section;
}

function createFitAwareLayeredBoxSection(
  layeredBox: LayeredBox,
  boxLayer: LayeredBoxLayer,
  type: LayeredBoxSectionType,
  name: string
): LayeredBoxSection | null {
  const section = createDefaultLayeredBoxSection(type, name);
  const hasFixedSize = layeredBox.customWidth !== undefined && layeredBox.customDepth !== undefined;

  if (!hasFixedSize) {
    return section;
  }

  const interiorWidth = Math.max(
    (layeredBox.customWidth ?? 0) - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
    20
  );
  const interiorDepth = Math.max(
    (layeredBox.customDepth ?? 0) - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
    20
  );
  let availableWidth = interiorWidth;
  let availableDepth = interiorDepth;

  if (boxLayer.sections.length > 0) {
    const bestRect = getBestLayeredBoxLayerGapRect(layeredBox, boxLayer.id);
    if (!bestRect) return null;
    availableWidth = Math.max(bestRect.right - bestRect.left, 20);
    availableDepth = Math.max(bestRect.bottom - bestRect.top, 20);
  }

  if (type === 'cup' && section.cupParams) {
    section.cupParams = {
      ...section.cupParams,
      layout: createDefaultCupLayout(),
      trayWidth: floorToSingleDecimal(availableWidth),
      trayDepth: floorToSingleDecimal(availableDepth)
    };
    return section;
  }

  if ((type === 'counter' || type === 'playerBoard') && section.counterParams) {
    const smallestShapeId =
      getSmallestCounterShapeId(type === 'playerBoard' ? 'playerBoard' : 'counter') ??
      section.counterParams.topLoadedStacks[0]?.[0];
    section.counterParams = {
      ...section.counterParams,
      topLoadedStacks: smallestShapeId ? [[smallestShapeId, 1]] : section.counterParams.topLoadedStacks.slice(0, 1).map(([shapeId]) => [shapeId, 1]),
      edgeLoadedStacks: [],
      trayWidthOverride: floorToSingleDecimal(availableWidth)
    };
  }

  const sectionDims = getLayeredBoxSectionDimensions(section, project.cardSizes, project.counterShapes);
  if (sectionDims.width > availableWidth + 0.01 || sectionDims.depth > availableDepth + 0.01) {
    return null;
  }

  return section;
}

function getBestLayeredBoxLayerGapRect(layeredBox: LayeredBox, layeredBoxLayerId: string): LayoutRect | null {
  const interiorWidth = Math.max(
    (layeredBox.customWidth ?? 0) - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
    20
  );
  const interiorDepth = Math.max(
    (layeredBox.customDepth ?? 0) - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
    20
  );
  const layout = getLayeredBoxRenderLayout(layeredBox, project.cardSizes, project.counterShapes);
  const obstacles = layout.sections
    .filter((placement) => placement.internalLayerId === layeredBoxLayerId)
    .map((placement) => ({
      x: placement.x,
      y: placement.y,
      width: placement.dimensions.width,
      depth: placement.dimensions.depth
    }));
  const freeRects = findAvailableGapRects(obstacles, interiorWidth, interiorDepth);

  return (
    freeRects
      .map((rect) => ({
        rect,
        area: (rect.right - rect.left) * (rect.bottom - rect.top)
      }))
      .sort((a, b) => b.area - a.area)[0]?.rect ?? null
  );
}

function createDefaultLayeredBoxLayer(name: string): LayeredBoxLayer {
  return {
    id: generateId(),
    name,
    fillSolidEmpty: true,
    edgeReliefEnabled: true,
    manualLayout: undefined,
    sections: []
  };
}

function createDefaultLayeredBox(name: string): LayeredBox {
  return {
    id: generateId(),
    name,
    layers: [createDefaultLayeredBoxLayer('Layer 1')],
    tolerance: 0.5,
    wallThickness: 3.0,
    floorThickness: 2.0,
    lidParams: { ...defaultLidParams }
  };
}

interface LayoutObstacle {
  x: number;
  y: number;
  width: number;
  depth: number;
}

interface LayoutRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rectsOverlap(a: LayoutRect, b: LayoutObstacle): boolean {
  return a.left < b.x + b.width && a.right > b.x && a.top < b.y + b.depth && a.bottom > b.y;
}

function findAvailableGapRects(
  obstacles: LayoutObstacle[],
  gameContainerWidth: number,
  gameContainerDepth: number
): LayoutRect[] {
  const xCoords = new Set<number>([0, gameContainerWidth]);
  const yCoords = new Set<number>([0, gameContainerDepth]);

  for (const obstacle of obstacles) {
    xCoords.add(Math.max(0, Math.min(gameContainerWidth, obstacle.x)));
    xCoords.add(Math.max(0, Math.min(gameContainerWidth, obstacle.x + obstacle.width)));
    yCoords.add(Math.max(0, Math.min(gameContainerDepth, obstacle.y)));
    yCoords.add(Math.max(0, Math.min(gameContainerDepth, obstacle.y + obstacle.depth)));
  }

  const xs = [...xCoords].sort((a, b) => a - b);
  const ys = [...yCoords].sort((a, b) => a - b);
  const freeRects: LayoutRect[] = [];

  for (let leftIndex = 0; leftIndex < xs.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < xs.length; rightIndex += 1) {
      for (let topIndex = 0; topIndex < ys.length - 1; topIndex += 1) {
        for (let bottomIndex = topIndex + 1; bottomIndex < ys.length; bottomIndex += 1) {
          const rect = {
            left: xs[leftIndex],
            right: xs[rightIndex],
            top: ys[topIndex],
            bottom: ys[bottomIndex]
          };

          if (rect.left >= rect.right || rect.top >= rect.bottom) continue;
          if (obstacles.some((obstacle) => rectsOverlap(rect, obstacle))) continue;

          freeRects.push(rect);
        }
      }
    }
  }

  return freeRects.filter((rect, index) => {
    return !freeRects.some((otherRect, otherIndex) => {
      if (otherIndex === index) return false;
      const contains =
        otherRect.left <= rect.left &&
        otherRect.right >= rect.right &&
        otherRect.top <= rect.top &&
        otherRect.bottom >= rect.bottom;
      const strictlyLarger =
        otherRect.left < rect.left ||
        otherRect.right > rect.right ||
        otherRect.top < rect.top ||
        otherRect.bottom > rect.bottom;
      return contains && strictlyLarger;
    });
  });
}

function createDefaultBoard(name: string): Board {
  return {
    id: generateId(),
    name,
    color: '#6f7f92',
    width: 200,
    depth: 200,
    height: 2
  };
}

function createDefaultLayer(name: string): Layer {
  return {
    id: generateId(),
    name,
    boxes: [],
    layeredBoxes: [],
    looseTrays: [],
    boards: []
  };
}

function duplicateName(name: string): string {
  return `${name} Copy`;
}

function cloneCupLayoutNodeWithFreshIds(node: ReturnType<typeof createDefaultCupLayout>['root']): ReturnType<typeof createDefaultCupLayout>['root'] {
  if (node.type === 'cup') {
    return { ...node, id: generateId() };
  }
  return {
    ...node,
    first: cloneCupLayoutNodeWithFreshIds(node.first),
    second: cloneCupLayoutNodeWithFreshIds(node.second)
  };
}

function cloneCupParamsWithFreshIds(params: CupTrayParams): CupTrayParams {
  return {
    ...params,
    layout: {
      root: cloneCupLayoutNodeWithFreshIds(params.layout.root)
    }
  };
}

function cloneCardWellParamsWithFreshIds(params: CardWellTrayParams): CardWellTrayParams {
  const cellIdMap = new Map<string, string>();
  const columns = params.layout.columns.map((column) =>
    column.map((cellId) => {
      const nextId = generateId();
      cellIdMap.set(cellId, nextId);
      return nextId;
    })
  );

  return {
    ...params,
    layout: { columns },
    stacks: params.stacks.map((stack) => ({
      ...stack,
      id: generateId(),
      cellId: cellIdMap.get(stack.cellId) ?? stack.cellId
    }))
  };
}

function cloneMiniatureRackParamsWithFreshIds(params: MiniatureRackParams): MiniatureRackParams {
  return {
    ...params,
    slots: params.slots.map((slot) => ({
      ...slot,
      id: generateId()
    }))
  };
}

function cloneTrayWithFreshIds<T extends Tray>(tray: T, name: string = duplicateName(tray.name)): T {
  if (isCupTray(tray)) {
    return {
      ...tray,
      id: generateId(),
      name,
      params: cloneCupParamsWithFreshIds(tray.params)
    } as T;
  }
  if (isCardWellTray(tray)) {
    return {
      ...tray,
      id: generateId(),
      name,
      params: cloneCardWellParamsWithFreshIds(tray.params)
    } as T;
  }
  if (isMiniatureRackTray(tray)) {
    return {
      ...tray,
      id: generateId(),
      name,
      params: cloneMiniatureRackParamsWithFreshIds(tray.params)
    } as T;
  }
  return {
    ...tray,
    id: generateId(),
    name,
    params: {
      ...tray.params,
      ...(isCardDividerTray(tray)
        ? { stacks: tray.params.stacks.map((stack) => ({ ...stack })) }
        : {})
    }
  } as T;
}

function cloneLayeredBoxSectionWithFreshIds(
  section: LayeredBoxSection,
  name: string = duplicateName(section.name)
): LayeredBoxSection {
  return {
    ...section,
    id: generateId(),
    name,
    counterParams: section.counterParams
      ? {
          ...section.counterParams,
          topLoadedStacks: section.counterParams.topLoadedStacks.map((stack) => [...stack] as typeof stack),
          edgeLoadedStacks: section.counterParams.edgeLoadedStacks.map((stack) => [...stack] as typeof stack)
        }
      : undefined,
    cardDrawParams: section.cardDrawParams
      ? { ...section.cardDrawParams }
      : undefined,
    cardDividerParams: section.cardDividerParams
      ? {
          ...section.cardDividerParams,
          stacks: section.cardDividerParams.stacks.map((stack) => ({ ...stack }))
        }
      : undefined,
    cardWellParams: section.cardWellParams ? cloneCardWellParamsWithFreshIds(section.cardWellParams) : undefined,
    cupParams: section.cupParams ? cloneCupParamsWithFreshIds(section.cupParams) : undefined
  };
}

function createTrayFromLayeredBoxSection(section: LayeredBoxSection, options?: { preserveId?: boolean }): Tray | null {
  const preserveId = options?.preserveId ?? true;
  const trayId = preserveId ? section.id : generateId();
  const color = section.color ?? '#c9503c';

  if ((section.type === 'counter' || section.type === 'playerBoard') && section.counterParams) {
    return {
      id: trayId,
      type: 'counter',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.counterParams
    };
  }

  if (section.type === 'cardDraw' && section.cardDrawParams) {
    return {
      id: trayId,
      type: 'cardDraw',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardDrawParams
    };
  }

  if (section.type === 'cardDivider' && section.cardDividerParams) {
    return {
      id: trayId,
      type: 'cardDivider',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardDividerParams,
      showEmboss: true,
      showStackLabels: true
    };
  }

  if (section.type === 'cardWell' && section.cardWellParams) {
    return {
      id: trayId,
      type: 'cardWell',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardWellParams
    };
  }

  if (section.type === 'cup' && section.cupParams) {
    return {
      id: trayId,
      type: 'cup',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cupParams
    };
  }

  return null;
}

function cloneLayeredBoxLayerWithFreshIds(layer: LayeredBoxLayer): LayeredBoxLayer {
  const sectionIdMap = new Map<string, string>();
  const sections = layer.sections.map((section) => {
    const clonedSection = cloneLayeredBoxSectionWithFreshIds(section, section.name);
    sectionIdMap.set(section.id, clonedSection.id);
    return clonedSection;
  });

  return {
    ...layer,
    id: generateId(),
    sections,
    manualLayout: layer.manualLayout?.flatMap((placement) => {
      const nextTrayId = sectionIdMap.get(placement.trayId);
      if (!nextTrayId) return [];
      return [{ ...placement, trayId: nextTrayId }];
    })
  };
}

function getLayeredBoxInteriorLimits(layeredBox: LayeredBox): { width?: number; depth?: number; height?: number } {
  return {
    width:
      layeredBox.customWidth !== undefined
        ? Math.max(layeredBox.customWidth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2, 0)
        : undefined,
    depth:
      layeredBox.customDepth !== undefined
        ? Math.max(layeredBox.customDepth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2, 0)
        : undefined,
    height:
      layeredBox.customBoxHeight !== undefined
        ? Math.max(layeredBox.customBoxHeight - layeredBox.floorThickness - layeredBox.tolerance, 0)
        : undefined
  };
}

function getLayeredBoxSectionContentOverflow(section: LayeredBoxSection): { fits: boolean; widthOverflow: number; depthOverflow: number } {
  if ((section.type === 'counter' || section.type === 'playerBoard') && section.counterParams) {
    const actualDimensions = getLayeredBoxSectionDimensions(section, project.cardSizes, project.counterShapes);
    const minDimensions = getLayeredBoxSectionDimensions(
      {
        ...section,
        counterParams: {
          ...section.counterParams,
          trayWidthOverride: 0
        }
      },
      project.cardSizes,
      project.counterShapes
    );

    const widthOverflow = Math.max(minDimensions.width - actualDimensions.width, 0);
    const depthOverflow = Math.max(minDimensions.depth - actualDimensions.depth, 0);

    return {
      fits: widthOverflow <= 0.01 && depthOverflow <= 0.01,
      widthOverflow,
      depthOverflow
    };
  }

  return {
    fits: true,
    widthOverflow: 0,
    depthOverflow: 0
  };
}

function getLayeredBoxLayoutOverflow(layeredBox: LayeredBox): {
  fits: boolean;
  widthOverflow: number;
  depthOverflow: number;
  heightOverflow: number;
} {
  const limits = getLayeredBoxInteriorLimits(layeredBox);
  const layout = getLayeredBoxRenderLayout(layeredBox, project.cardSizes, project.counterShapes);
  const widthOverflow =
    limits.width !== undefined ? Math.max(layout.width - limits.width, 0) : 0;
  const depthOverflow =
    limits.depth !== undefined ? Math.max(layout.depth - limits.depth, 0) : 0;
  const heightOverflow =
    limits.height !== undefined ? Math.max(layout.height - limits.height, 0) : 0;

  return {
    fits: widthOverflow <= 0.01 && depthOverflow <= 0.01 && heightOverflow <= 0.01,
    widthOverflow,
    depthOverflow,
    heightOverflow
  };
}

function layeredBoxFitsResolvedLayout(layeredBox: LayeredBox): boolean {
  return getLayeredBoxLayoutOverflow(layeredBox).fits;
}

function cloneBoxWithFreshIds(box: Box, name: string = duplicateName(box.name)): Box {
  const trayIdMap = new Map<string, string>();
  const trays = box.trays.map((tray, index) => {
    const clonedTray = cloneTrayWithFreshIds(tray, index === 0 ? tray.name : tray.name);
    trayIdMap.set(tray.id, clonedTray.id);
    return clonedTray;
  });

  return {
    ...box,
    id: generateId(),
    name,
    trays,
    manualLayout: box.manualLayout?.flatMap((placement) => {
      const nextTrayId = trayIdMap.get(placement.trayId);
      if (!nextTrayId) return [];
      return [{ ...placement, trayId: nextTrayId }];
    })
  };
}

function cloneLayeredBoxWithFreshIds(layeredBox: LayeredBox, name: string = duplicateName(layeredBox.name)): LayeredBox {
  return {
    ...layeredBox,
    id: generateId(),
    name,
    layers: layeredBox.layers.map((layer) => cloneLayeredBoxLayerWithFreshIds(layer))
  };
}

function cloneBoardWithFreshId(board: Board, name: string = duplicateName(board.name)): Board {
  return {
    ...board,
    id: generateId(),
    name
  };
}

function offsetPlacement<T extends { x: number; y: number }>(placement: T, amount: number = 10): T {
  return {
    ...placement,
    x: placement.x + amount,
    y: placement.y + amount
  };
}

function createDefaultProject(): Project {
  const project = JSON.parse(JSON.stringify(defaultProjectJson)) as Project;
  project.name = project.name?.trim() || DEFAULT_PROJECT_NAME;
  project.selectedBoardId = null;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.layers = project.layers.map((layer) => ({
    ...layer,
    layeredBoxes:
      layer.layeredBoxes?.map((layeredBox) => ({
        ...layeredBox,
        layers: layeredBox.layers.map((entry) => ({
          ...entry,
          fillSolidEmpty: entry.fillSolidEmpty ?? true,
          edgeReliefEnabled: entry.edgeReliefEnabled ?? true,
          sections: entry.sections ?? []
        }))
      })) ?? [],
    boards: layer.boards ?? []
  }));
  return project;
}

// Reactive state
let project = $state<Project>(createDefaultProject());

// Initialize from localStorage
export function initProject(): void {
  const saved = loadProject();
  if (saved) {
    project = saved;
  }
}

// Auto-save helper (now uses debounced save manager)
function autosave(): void {
  scheduleSave(project);
}

// Force immediate save (use before page unload or critical operations)
export function saveProjectNow(): void {
  saveNow(project);
}

// Getters
export function getProject(): Project {
  return project;
}

export function getProjectName(): string {
  return project.name?.trim() || DEFAULT_PROJECT_NAME;
}

export function getLayers(): Layer[] {
  return project.layers;
}

export function getSelectedLayer(): Layer | null {
  if (!project.selectedLayerId) return null;
  return project.layers.find((l) => l.id === project.selectedLayerId) ?? null;
}

/**
 * Get all boxes from all layers.
 */
export function getAllBoxes(): Box[] {
  const boxes: Box[] = [];
  for (const layer of project.layers) {
    boxes.push(...layer.boxes);
  }
  return boxes;
}

/**
 * Get all loose trays from all layers.
 */
export function getAllLooseTrays(): Tray[] {
  const looseTrays: Tray[] = [];
  for (const layer of project.layers) {
    looseTrays.push(...layer.looseTrays);
  }
  return looseTrays;
}

export function getAllLayeredBoxes(): LayeredBox[] {
  const layeredBoxes: LayeredBox[] = [];
  for (const layer of project.layers) {
    layeredBoxes.push(...(layer.layeredBoxes ?? []));
  }
  return layeredBoxes;
}

export function getAllBoards(): Board[] {
  const boards: Board[] = [];
  for (const layer of project.layers) {
    boards.push(...layer.boards);
  }
  return boards;
}

/**
 * Legacy: Get all boxes (backwards compatibility).
 * @deprecated Use getAllBoxes instead
 */
export function getBoxes(): Box[] {
  return getAllBoxes();
}

export function getSelectedBox(): Box | null {
  if (!project.selectedBoxId) return null;
  // Search across all layers
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === project.selectedBoxId);
    if (box) return box;
  }
  return null;
}

export function getSelectedLayeredBox(): LayeredBox | null {
  if (!project.selectedLayeredBoxId) return null;
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === project.selectedLayeredBoxId);
    if (layeredBox) return layeredBox;
  }
  return null;
}

export function getSelectedLayeredBoxLayer(): LayeredBoxLayer | null {
  const selectedLayeredBox = getSelectedLayeredBox();
  if (!selectedLayeredBox || !project.selectedLayeredBoxLayerId) return null;
  return selectedLayeredBox.layers.find((layer) => layer.id === project.selectedLayeredBoxLayerId) ?? null;
}

export function getSelectedLayeredBoxSection(): LayeredBoxSection | null {
  const selectedLayeredBoxLayer = getSelectedLayeredBoxLayer();
  if (!selectedLayeredBoxLayer || !project.selectedLayeredBoxSectionId) return null;
  return selectedLayeredBoxLayer.sections.find((section) => section.id === project.selectedLayeredBoxSectionId) ?? null;
}

export function getSelectedTray(): Tray | null {
  if (!project.selectedTrayId) return null;

  // First check if it's in the selected box
  const selectedBox = getSelectedBox();
  if (selectedBox) {
    const tray = selectedBox.trays.find((t) => t.id === project.selectedTrayId);
    if (tray) return tray;
  }

  // Check loose trays across all layers
  for (const layer of project.layers) {
    const looseTray = layer.looseTrays.find((t) => t.id === project.selectedTrayId);
    if (looseTray) return looseTray;
  }

  // Check all box trays
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === project.selectedTrayId);
      if (tray) return tray;
    }
  }

  return null;
}

export function getSelectedBoard(): Board | null {
  if (!project.selectedBoardId) return null;
  for (const layer of project.layers) {
    const board = layer.boards.find((b) => b.id === project.selectedBoardId);
    if (board) return board;
  }
  return null;
}

// Selection
export function selectLayer(layerId: string): void {
  project.selectedLayerId = layerId;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedBoardId = null;
  const layer = project.layers.find((l) => l.id === layerId);
  if (layer) {
    // Select first box if available, otherwise first loose tray
    if (layer.boxes.length > 0) {
      project.selectedBoxId = layer.boxes[0].id;
      if (layer.boxes[0].trays.length > 0) {
        project.selectedTrayId = layer.boxes[0].trays[0].id;
      } else {
        project.selectedTrayId = null;
      }
    } else if (layer.looseTrays.length > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = layer.looseTrays[0].id;
    } else if ((layer.layeredBoxes?.length ?? 0) > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = null;
      project.selectedLayeredBoxId = layer.layeredBoxes[0].id;
      project.selectedLayeredBoxLayerId = layer.layeredBoxes[0].layers[0]?.id ?? null;
      project.selectedLayeredBoxSectionId = layer.layeredBoxes[0].layers[0]?.sections[0]?.id ?? null;
    } else if (layer.boards.length > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = null;
      project.selectedBoardId = layer.boards[0].id;
    } else {
      project.selectedBoxId = null;
      project.selectedTrayId = null;
    }
  }
  autosave();
}

export function selectBox(boxId: string): void {
  project.selectedBoxId = boxId;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedBoardId = null;
  // Find the layer containing this box
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      project.selectedLayerId = layer.id;
      if (box.trays.length > 0) {
        project.selectedTrayId = box.trays[0].id;
      } else {
        project.selectedTrayId = null;
      }
      break;
    }
  }
  autosave();
}

export function selectLayeredBox(layeredBoxId: string): void {
  project.selectedLayeredBoxId = layeredBoxId;
  project.selectedBoxId = null;
  project.selectedTrayId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedBoardId = null;
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (layeredBox) {
      project.selectedLayerId = layer.id;
      project.selectedLayeredBoxLayerId = layeredBox.layers[0]?.id ?? null;
      project.selectedLayeredBoxSectionId = layeredBox.layers[0]?.sections[0]?.id ?? null;
      break;
    }
  }
  autosave();
}

export function selectLayeredBoxLayer(layeredBoxId: string, layeredBoxLayerId: string): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    if (!layeredBox.layers.some((boxLayer) => boxLayer.id === layeredBoxLayerId)) continue;
    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBoxId;
    project.selectedLayeredBoxLayerId = layeredBoxLayerId;
    project.selectedLayeredBoxSectionId = layeredBox.layers.find((boxLayer) => boxLayer.id === layeredBoxLayerId)?.sections[0]?.id ?? null;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return;
  }
}

export function selectTray(trayId: string): void {
  project.selectedTrayId = trayId;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedBoardId = null;
  // Find and update selected layer and box based on tray location
  const location = findTrayLocation(project, trayId);
  if (location) {
    project.selectedLayerId = location.layerId;
    project.selectedBoxId = location.boxId;
  }
  autosave();
}

export function selectBoard(boardId: string): void {
  project.selectedBoardId = boardId;
  project.selectedBoxId = null;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedTrayId = null;
  for (const layer of project.layers) {
    if (layer.boards.some((b) => b.id === boardId)) {
      project.selectedLayerId = layer.id;
      break;
    }
  }
  autosave();
}

// Layer operations
export function addLayer(): Layer {
  const layerNumber = project.layers.length + 1;
  const layer = createDefaultLayer(`Layer ${layerNumber}`);
  project.layers.push(layer);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = null;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedTrayId = null;
  project.selectedBoardId = null;
  autosave();
  return layer;
}

export function deleteLayer(layerId: string): void {
  // Don't allow deleting the last layer
  if (project.layers.length <= 1) return;

  const index = project.layers.findIndex((l) => l.id === layerId);
  if (index === -1) return;

  project.layers.splice(index, 1);

  // Update selection
  if (project.selectedLayerId === layerId) {
    const newIndex = Math.min(index, project.layers.length - 1);
    const newLayer = project.layers[newIndex];
    project.selectedLayerId = newLayer.id;
    // Select first box or loose tray in the new layer
    if (newLayer.boxes.length > 0) {
      project.selectedBoxId = newLayer.boxes[0].id;
      project.selectedTrayId = newLayer.boxes[0].trays[0]?.id ?? null;
      project.selectedLayeredBoxId = null;
      project.selectedLayeredBoxLayerId = null;
      project.selectedLayeredBoxSectionId = null;
      project.selectedBoardId = null;
    } else if (newLayer.looseTrays.length > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = newLayer.looseTrays[0].id;
      project.selectedLayeredBoxId = null;
      project.selectedLayeredBoxLayerId = null;
      project.selectedLayeredBoxSectionId = null;
      project.selectedBoardId = null;
    } else if ((newLayer.layeredBoxes?.length ?? 0) > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = null;
      project.selectedLayeredBoxId = newLayer.layeredBoxes[0].id;
      project.selectedLayeredBoxLayerId = newLayer.layeredBoxes[0].layers[0]?.id ?? null;
      project.selectedLayeredBoxSectionId = newLayer.layeredBoxes[0].layers[0]?.sections[0]?.id ?? null;
      project.selectedBoardId = null;
    } else if (newLayer.boards.length > 0) {
      project.selectedBoxId = null;
      project.selectedTrayId = null;
      project.selectedLayeredBoxId = null;
      project.selectedLayeredBoxLayerId = null;
      project.selectedLayeredBoxSectionId = null;
      project.selectedBoardId = newLayer.boards[0].id;
    } else {
      project.selectedBoxId = null;
      project.selectedLayeredBoxId = null;
      project.selectedLayeredBoxLayerId = null;
      project.selectedLayeredBoxSectionId = null;
      project.selectedTrayId = null;
      project.selectedBoardId = null;
    }
  }
  autosave();
}

export function updateLayer(layerId: string, updates: Partial<Omit<Layer, 'id' | 'boxes' | 'layeredBoxes' | 'looseTrays'>>): void {
  const layer = project.layers.find((l) => l.id === layerId);
  if (layer) {
    Object.assign(layer, updates);
    autosave();
  }
}

// Board operations
export function addBoard(layerId?: string): Board | null {
  const targetLayerId = layerId ?? project.selectedLayerId ?? project.layers[0]?.id;
  const layer = project.layers.find((l) => l.id === targetLayerId);
  if (!layer) return null;

  const boardNumber = getAllBoards().length + 1;
  const board = createDefaultBoard(`Board ${boardNumber}`);
  layer.boards.push(board);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = null;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedTrayId = null;
  project.selectedBoardId = board.id;
  autosave();
  return board;
}

export function updateBoard(boardId: string, updates: Partial<Omit<Board, 'id'>>): void {
  for (const layer of project.layers) {
    const board = layer.boards.find((b) => b.id === boardId);
    if (board) {
      Object.assign(board, updates);
      autosave();
      return;
    }
  }
}

export function deleteBoard(boardId: string): void {
  for (const layer of project.layers) {
    const index = layer.boards.findIndex((b) => b.id === boardId);
    if (index === -1) continue;

    layer.boards.splice(index, 1);
    if (project.selectedBoardId === boardId) {
      project.selectedBoardId = null;
    }
    autosave();
    return;
  }
}

export function moveBoardToLayer(boardId: string, targetLayerId: string | 'new'): void {
  let sourceBoard: Board | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;

  for (const layer of project.layers) {
    const boardIndex = layer.boards.findIndex((b) => b.id === boardId);
    if (boardIndex !== -1) {
      sourceBoard = layer.boards[boardIndex];
      sourceLayer = layer;
      sourceIndex = boardIndex;
      break;
    }
  }

  if (!sourceBoard || !sourceLayer) return;

  let targetLayer: Layer;
  if (targetLayerId === 'new') {
    const layerNumber = project.layers.length + 1;
    targetLayer = createDefaultLayer(`Layer ${layerNumber}`);
    project.layers.push(targetLayer);
  } else {
    const found = project.layers.find((l) => l.id === targetLayerId);
    if (!found || found.id === sourceLayer.id) return;
    targetLayer = found;
  }

  sourceLayer.boards.splice(sourceIndex, 1);
  targetLayer.boards.push(sourceBoard);

  project.selectedLayerId = targetLayer.id;
  project.selectedBoardId = sourceBoard.id;
  project.selectedBoxId = null;
  project.selectedTrayId = null;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;

  autosave();
}

export function duplicateBoard(boardId: string): Board | null {
  for (const layer of project.layers) {
    const boardIndex = layer.boards.findIndex((board) => board.id === boardId);
    if (boardIndex === -1) continue;

    const sourceBoard = layer.boards[boardIndex];
    const duplicatedBoard = cloneBoardWithFreshId(sourceBoard);
    layer.boards.splice(boardIndex + 1, 0, duplicatedBoard);

    const sourcePlacement = layer.manualLayout?.boards?.find((placement) => placement.boardId === boardId);
    if (sourcePlacement) {
      layer.manualLayout = {
        boxes: layer.manualLayout?.boxes ?? [],
        looseTrays: layer.manualLayout?.looseTrays ?? [],
        boards: [
          ...(layer.manualLayout?.boards ?? []),
          { ...offsetPlacement(sourcePlacement), boardId: duplicatedBoard.id }
        ]
      };
    }

    project.selectedLayerId = layer.id;
    project.selectedBoardId = duplicatedBoard.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedLayeredBoxId = null;
    project.selectedLayeredBoxLayerId = null;
    project.selectedLayeredBoxSectionId = null;

    autosave();
    return duplicatedBoard;
  }

  return null;
}

export function addLayeredBox(
  layerId?: string,
  initialSectionType?: LayeredBoxSectionType
): LayeredBox | null {
  const targetLayerId = layerId ?? project.selectedLayerId ?? project.layers[0]?.id;
  const layer = project.layers.find((l) => l.id === targetLayerId);
  if (!layer) return null;

  const layeredBoxNumber = getAllLayeredBoxes().length + 1;
  const layeredBox = createDefaultLayeredBox(`Layered Box ${layeredBoxNumber}`);
  layer.layeredBoxes.push(layeredBox);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = null;
  project.selectedTrayId = null;
  project.selectedBoardId = null;
  project.selectedLayeredBoxId = layeredBox.id;
  project.selectedLayeredBoxLayerId = layeredBox.layers[0]?.id ?? null;
  project.selectedLayeredBoxSectionId = layeredBox.layers[0]?.sections[0]?.id ?? null;

  if (initialSectionType && layeredBox.layers[0]) {
    const sectionCountOfType =
      layeredBox.layers[0].sections.filter((section) => section.type === initialSectionType).length + 1;
    const sectionName =
      initialSectionType === 'counter'
        ? `Counter Tray ${sectionCountOfType}`
        : initialSectionType === 'cardDraw'
          ? `Card Draw ${sectionCountOfType}`
          : initialSectionType === 'cardDivider'
            ? `Card Divider ${sectionCountOfType}`
            : initialSectionType === 'cardWell'
              ? `Card Well ${sectionCountOfType}`
              : initialSectionType === 'cup'
                ? `Cup Tray ${sectionCountOfType}`
                : `Player Board ${sectionCountOfType}`;
    const section = createFitAwareLayeredBoxSection(layeredBox, layeredBox.layers[0], initialSectionType, sectionName);
    if (!section) {
      autosave();
      return layeredBox;
    }
    layeredBox.layers[0].sections.push(section);
    project.selectedLayeredBoxSectionId = section.id;
  }

  autosave();
  return layeredBox;
}

export function updateLayeredBox(
  layeredBoxId: string,
  updates: Partial<Omit<LayeredBox, 'id' | 'layers'>>
): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    Object.assign(layeredBox, updates);
    autosave();
    return;
  }
}

function floorToSingleDecimal(value: number): number {
  return Math.floor((value + 1e-6) * 10) / 10;
}

export function expandLayeredBoxToAvailableSpace(
  layeredBoxId: string,
  gameContainerWidth: number,
  gameContainerDepth: number
): boolean {
  for (const layer of project.layers) {
    const layeredBoxIndex = layer.layeredBoxes?.findIndex((b) => b.id === layeredBoxId) ?? -1;
    if (layeredBoxIndex === -1 || !layer.layeredBoxes) continue;
    const layeredBox = layer.layeredBoxes[layeredBoxIndex];

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth,
      gameContainerDepth,
      cardSizes: project.cardSizes,
      counterShapes: project.counterShapes
    });
    const proxyId = `layered-box-${layeredBoxId}`;
    const targetPlacement = arrangement.boards.find((placement) => placement.board.id === proxyId);
    if (!targetPlacement) return false;

    const currentLeft = targetPlacement.x;
    const currentTop = targetPlacement.y;
    const currentRight = currentLeft + targetPlacement.dimensions.width;
    const currentBottom = currentTop + targetPlacement.dimensions.depth;
    const obstacles = [
      ...arrangement.boxes.map((placement) => ({
        x: placement.x,
        y: placement.y,
        width: placement.dimensions.width,
        depth: placement.dimensions.depth
      })),
      ...arrangement.looseTrays.map((placement) => ({
        x: placement.x,
        y: placement.y,
        width: placement.dimensions.width,
        depth: placement.dimensions.depth
      })),
      ...arrangement.boards
        .filter((placement) => placement.board.id !== proxyId)
        .map((placement) => ({
          x: placement.x,
          y: placement.y,
          width: placement.dimensions.width,
          depth: placement.dimensions.depth
        }))
    ];

    const isEmpty = layeredBox.layers.every((internalLayer) => internalLayer.sections.length === 0);
    const isCupOnly =
      !isEmpty &&
      layeredBox.layers.every(
        (internalLayer) =>
          internalLayer.sections.length > 0 &&
          internalLayer.sections.every((section) => section.type === 'cup' && section.cupParams)
      );
    const canShrinkContent = isEmpty || isCupOnly;
    const layout = getLayeredBoxRenderLayout(layeredBox, project.cardSizes, project.counterShapes);
    const minBodyWidth = layout.width + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;
    const minBodyDepth = layout.depth + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;
    const cupOnlyMinimums = isCupOnly
      ? (() => {
          const minInteriorWidth = Math.max(
            ...layeredBox.layers.map((internalLayer) => {
              const cupSections = internalLayer.sections.filter(
                (section) => section.type === 'cup' && section.cupParams
              );
              if (cupSections.length === 0) return 20;
              return (
                cupSections.length * 20 +
                Math.max(cupSections.length - 1, 0) * layeredBox.wallThickness
              );
            }),
            20
          );
          const minInteriorDepth = 20;
          return {
            minWidth: minInteriorWidth + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2,
            minDepth: minInteriorDepth + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2
          };
        })()
      : null;
    const currentLocalWidth = layeredBox.customWidth ?? targetPlacement.dimensions.width;
    const currentLocalDepth = layeredBox.customDepth ?? targetPlacement.dimensions.depth;
    const minLocalWidth = canShrinkContent ? (cupOnlyMinimums?.minWidth ?? minBodyWidth) : currentLocalWidth;
    const minLocalDepth = canShrinkContent ? (cupOnlyMinimums?.minDepth ?? minBodyDepth) : currentLocalDepth;
    const currentRotation = targetPlacement.rotation;
    const isCurrentlySwapped = currentRotation === 90 || currentRotation === 270;
    const matchingRotation = currentRotation;
    const swappedRotation = currentRotation === 90
      ? 0
      : currentRotation === 270
        ? 180
        : currentRotation + 90;

    const currentRect = {
      left: currentLeft,
      right: currentRight,
      top: currentTop,
      bottom: currentBottom
    };
    const currentCenterX = (currentLeft + currentRight) / 2;
    const currentCenterY = (currentTop + currentBottom) / 2;
    const availableRects = findAvailableGapRects(obstacles, gameContainerWidth, gameContainerDepth);
    const rectOptions = availableRects
      .map((rect) => {
        const gapWidth = rect.right - rect.left;
        const gapDepth = rect.bottom - rect.top;
        const candidates = [
          {
            rotation: matchingRotation as 0 | 90 | 180 | 270,
            localWidth: isCurrentlySwapped ? gapDepth : gapWidth,
            localDepth: isCurrentlySwapped ? gapWidth : gapDepth
          },
          {
            rotation: swappedRotation as 0 | 90 | 180 | 270,
            localWidth: isCurrentlySwapped ? gapWidth : gapDepth,
            localDepth: isCurrentlySwapped ? gapDepth : gapWidth
          }
        ];
        const fittingCandidate = candidates.find(
          (candidate) => candidate.localWidth >= minLocalWidth && candidate.localDepth >= minLocalDepth
        );
        const containsCurrent =
          rect.left <= currentRect.left &&
          rect.right >= currentRect.right &&
          rect.top <= currentRect.top &&
          rect.bottom >= currentRect.bottom;
        const rectCenterX = (rect.left + rect.right) / 2;
        const rectCenterY = (rect.top + rect.bottom) / 2;
        return {
          rect,
          gapWidth,
          gapDepth,
          fittingCandidate,
          containsCurrent,
          area: gapWidth * gapDepth,
          distance: Math.hypot(rectCenterX - currentCenterX, rectCenterY - currentCenterY)
        };
      })
      .filter((option) => option.fittingCandidate);

    const chosenRectOption = canShrinkContent
      ? rectOptions.sort((a, b) => b.area - a.area || a.distance - b.distance)[0]
      : rectOptions
          .filter((option) => option.containsCurrent)
          .sort((a, b) => b.area - a.area)[0] ??
        rectOptions.sort((a, b) => a.distance - b.distance || b.area - a.area)[0];

    if (!chosenRectOption?.fittingCandidate) return false;

    const { rect: bestRect, fittingCandidate } = chosenRectOption;
    const nextCustomWidth = floorToSingleDecimal(Math.max(fittingCandidate.localWidth, minLocalWidth, 1));
    const nextCustomDepth = floorToSingleDecimal(Math.max(fittingCandidate.localDepth, minLocalDepth, 1));
    const effectiveLeftBoundary = bestRect.left;
    const effectiveTopBoundary = bestRect.top;

    const targetInteriorWidth = Math.max(
      nextCustomWidth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
      1
    );
    const targetInteriorDepth = Math.max(
      nextCustomDepth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2,
      1
    );

    const resizedLayers = layeredBox.layers.map((internalLayer) => {
      const cupSections = internalLayer.sections.filter(
        (section) => section.type === 'cup' && section.cupParams
      );
      if (cupSections.length === 0 || cupSections.length !== internalLayer.sections.length) {
        return internalLayer;
      }

      const totalOriginalWidth = cupSections.reduce(
        (sum, section) => sum + (section.cupParams?.trayWidth ?? 0),
        0
      );
      const totalGaps = Math.max(cupSections.length - 1, 0) * layeredBox.wallThickness;
      const availableWidth = Math.max(targetInteriorWidth - totalGaps, cupSections.length);
      const widthScale = totalOriginalWidth > 0 ? availableWidth / totalOriginalWidth : 1;

      return {
        ...internalLayer,
        sections: internalLayer.sections.map((section) => {
          if (section.type !== 'cup' || !section.cupParams) return section;
          return {
            ...section,
            cupParams: {
              ...section.cupParams,
              trayWidth: floorToSingleDecimal(Math.max(section.cupParams.trayWidth * widthScale, 20)),
              trayDepth: floorToSingleDecimal(Math.max(targetInteriorDepth, 20))
            }
          };
        })
      };
    });

    layer.layeredBoxes[layeredBoxIndex] = {
      ...layeredBox,
      customWidth: nextCustomWidth,
      customDepth: nextCustomDepth,
      layers: resizedLayers
    };

    const manualPlacements = arrangementToManualPlacements(arrangement);
    layer.manualLayout = {
      boxes: manualPlacements.boxes,
      looseTrays: manualPlacements.looseTrays,
      boards: manualPlacements.boards.map((placement) =>
        placement.boardId === proxyId
          ? {
            ...placement,
            x: effectiveLeftBoundary,
            y: effectiveTopBoundary,
            rotation: fittingCandidate.rotation
          }
          : placement
      )
    };

    autosave();
    return true;
  }

  return false;
}

export function deleteLayeredBox(layeredBoxId: string): void {
  for (const layer of project.layers) {
    const index = layer.layeredBoxes?.findIndex((b) => b.id === layeredBoxId) ?? -1;
    if (index === -1) continue;

    layer.layeredBoxes.splice(index, 1);
    if (project.selectedLayeredBoxId === layeredBoxId) {
      project.selectedLayeredBoxId = null;
      project.selectedLayeredBoxLayerId = null;
      project.selectedLayeredBoxSectionId = null;
    }
    autosave();
    return;
  }
}

export function addLayerToLayeredBox(layeredBoxId: string): LayeredBoxLayer | null {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const nextIndex = layeredBox.layers.length + 1;
    const boxLayer = createDefaultLayeredBoxLayer(`Layer ${nextIndex}`);
    layeredBox.layers.push(boxLayer);
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = boxLayer.id;
    project.selectedLayeredBoxSectionId = null;
    project.selectedLayerId = layer.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return boxLayer;
  }
  return null;
}

export function updateLayeredBoxLayer(layeredBoxId: string, layeredBoxLayerId: string, name: string): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;
    boxLayer.name = name;
    autosave();
    return;
  }
}

export function updateLayeredBoxLayerOptions(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  updates: Partial<Omit<LayeredBoxLayer, 'id' | 'sections'>>
): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;
    Object.assign(boxLayer, updates);
    autosave();
    return;
  }
}

export function addSectionToLayeredBoxLayer(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  type: LayeredBoxSectionType
): { section: LayeredBoxSection; fits: boolean } | null {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;

    const sectionCountOfType = boxLayer.sections.filter((section) => section.type === type).length + 1;
    const sectionName =
      type === 'counter'
        ? `Counter Tray ${sectionCountOfType}`
        : type === 'cardDraw'
          ? `Card Draw ${sectionCountOfType}`
          : type === 'cardDivider'
            ? `Card Divider ${sectionCountOfType}`
        : type === 'cardWell'
          ? `Card Well ${sectionCountOfType}`
          : type === 'cup'
            ? `Cup Tray ${sectionCountOfType}`
          : `Player Board ${sectionCountOfType}`;
    const fittedSection = createFitAwareLayeredBoxSection(layeredBox, boxLayer, type, sectionName);
    const section =
      fittedSection ??
      createMinimalEditableLayeredBoxSection(
        type,
        sectionName,
        layeredBox.customWidth !== undefined
          ? Math.max((layeredBox.customWidth ?? 0) - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2, 20)
          : undefined
      );
    const previousManualLayout = boxLayer.manualLayout ? [...boxLayer.manualLayout] : undefined;
    const gapRect =
      layeredBox.customWidth !== undefined && layeredBox.customDepth !== undefined
        ? getBestLayeredBoxLayerGapRect(layeredBox, boxLayer.id)
        : null;
    let fits = fittedSection !== null;
    boxLayer.sections.push(section);
    if (layeredBox.customWidth !== undefined && layeredBox.customDepth !== undefined && fittedSection) {
      if (gapRect) {
        const currentLayout = getLayeredBoxRenderLayout(layeredBox, project.cardSizes, project.counterShapes);
        const existingPlacements = currentLayout.sections
          .filter((placement) => placement.internalLayerId === boxLayer.id && placement.section.id !== section.id)
          .map((placement) => ({
            trayId: placement.section.id,
            x: placement.x,
            y: placement.y,
            rotation: placement.rotation
          }));
        const sectionDims = getLayeredBoxSectionDimensions(section, project.cardSizes, project.counterShapes);
        boxLayer.manualLayout = [
          ...existingPlacements,
          {
            trayId: section.id,
            x: gapRect.left,
            y: gapRect.top,
            rotation: 0
          }
        ];
        if (sectionDims.width > gapRect.right - gapRect.left + 0.01 || sectionDims.depth > gapRect.bottom - gapRect.top + 0.01) {
          boxLayer.manualLayout = previousManualLayout;
          fits = false;
        }
      }
    }
    if (!layeredBoxFitsResolvedLayout(layeredBox)) {
      boxLayer.manualLayout = previousManualLayout;
      fits = false;
    }
    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = boxLayer.id;
    project.selectedLayeredBoxSectionId = section.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return { section, fits };
  }
  return null;
}

export function selectLayeredBoxSection(layeredBoxId: string, layeredBoxLayerId: string, sectionId: string): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer || !boxLayer.sections.some((section) => section.id === sectionId)) continue;
    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = boxLayer.id;
    project.selectedLayeredBoxSectionId = sectionId;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return;
  }
}

export function updateLayeredBoxSection(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  sectionId: string,
  updates: Partial<Omit<LayeredBoxSection, 'id' | 'type'>>
): boolean {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;
    const section = boxLayer.sections.find((entry) => entry.id === sectionId);
    if (!section) continue;
    const previous = {
      name: section.name,
      color: section.color,
      counterParams: section.counterParams,
      cardDrawParams: section.cardDrawParams,
      cardDividerParams: section.cardDividerParams,
      cardWellParams: section.cardWellParams,
      cupParams: section.cupParams
    };
    const previousOverflow = getLayeredBoxSectionContentOverflow(section);
    const previousLayoutOverflow = getLayeredBoxLayoutOverflow(layeredBox);
    Object.assign(section, updates);
    const nextOverflow = getLayeredBoxSectionContentOverflow(section);
    const nextLayoutOverflow = getLayeredBoxLayoutOverflow(layeredBox);
    const doesNotWorsenInvalidContent =
      !nextOverflow.fits &&
      !previousOverflow.fits &&
      nextOverflow.widthOverflow <= previousOverflow.widthOverflow + 0.01 &&
      nextOverflow.depthOverflow <= previousOverflow.depthOverflow + 0.01;
    const doesNotWorsenInvalidLayout =
      !nextLayoutOverflow.fits &&
      !previousLayoutOverflow.fits &&
      nextLayoutOverflow.widthOverflow <= previousLayoutOverflow.widthOverflow + 0.01 &&
      nextLayoutOverflow.depthOverflow <= previousLayoutOverflow.depthOverflow + 0.01 &&
      nextLayoutOverflow.heightOverflow <= previousLayoutOverflow.heightOverflow + 0.01;

    if ((!nextOverflow.fits && !doesNotWorsenInvalidContent) || (!nextLayoutOverflow.fits && !doesNotWorsenInvalidLayout)) {
      Object.assign(section, previous);
      return false;
    }
    autosave();
    return true;
  }
  return false;
}

export function moveLayeredBoxSectionToLayer(
  layeredBoxId: string,
  sourceLayerId: string,
  sectionId: string,
  targetLayerId: string
): boolean {
  if (sourceLayerId === targetLayerId) return true;

  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const sourceLayer = layeredBox.layers.find((entry) => entry.id === sourceLayerId);
    const targetLayer = layeredBox.layers.find((entry) => entry.id === targetLayerId);
    if (!sourceLayer || !targetLayer) continue;

    const sectionIndex = sourceLayer.sections.findIndex((entry) => entry.id === sectionId);
    if (sectionIndex === -1) return false;

    const [section] = sourceLayer.sections.splice(sectionIndex, 1);
    const previousSourceLayout = sourceLayer.manualLayout;
    sourceLayer.manualLayout = sourceLayer.manualLayout?.filter((placement) => placement.trayId !== sectionId);
    targetLayer.sections.push(section);

    if (!layeredBoxFitsResolvedLayout(layeredBox)) {
      targetLayer.sections.pop();
      sourceLayer.sections.splice(sectionIndex, 0, section);
      sourceLayer.manualLayout = previousSourceLayout;
      return false;
    }

    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = targetLayer.id;
    project.selectedLayeredBoxSectionId = section.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return true;
  }

  return false;
}

export function convertLayeredBoxSectionToLooseTray(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  sectionId: string
): boolean {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const internalLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!internalLayer) continue;
    const sectionIndex = internalLayer.sections.findIndex((entry) => entry.id === sectionId);
    if (sectionIndex === -1) return false;

    const section = internalLayer.sections[sectionIndex];
    const tray = createTrayFromLayeredBoxSection(section, { preserveId: false });
    if (!tray) return false;

    internalLayer.sections.splice(sectionIndex, 1);
    internalLayer.manualLayout = internalLayer.manualLayout?.filter((placement) => placement.trayId !== sectionId);
    layer.looseTrays.push(tray);

    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = null;
    project.selectedLayeredBoxLayerId = null;
    project.selectedLayeredBoxSectionId = null;
    project.selectedBoxId = null;
    project.selectedTrayId = tray.id;
    project.selectedBoardId = null;
    autosave();
    return true;
  }

  return false;
}

export function deleteSectionFromLayeredBoxLayer(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  sectionId: string
): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;
    const index = boxLayer.sections.findIndex((section) => section.id === sectionId);
    if (index === -1) continue;
    boxLayer.sections.splice(index, 1);
    if (project.selectedLayeredBoxSectionId === sectionId) {
      const nextSection = boxLayer.sections[Math.min(index, boxLayer.sections.length - 1)] ?? boxLayer.sections[0] ?? null;
      project.selectedLayeredBoxSectionId = nextSection?.id ?? null;
    }
    autosave();
    return;
  }
}

export function deleteLayerFromLayeredBox(layeredBoxId: string, layeredBoxLayerId: string): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox || layeredBox.layers.length <= 1) continue;
    const index = layeredBox.layers.findIndex((entry) => entry.id === layeredBoxLayerId);
    if (index === -1) continue;

    layeredBox.layers.splice(index, 1);
    if (project.selectedLayeredBoxLayerId === layeredBoxLayerId) {
      const nextLayer = layeredBox.layers[Math.min(index, layeredBox.layers.length - 1)] ?? layeredBox.layers[0] ?? null;
      project.selectedLayeredBoxLayerId = nextLayer?.id ?? null;
      project.selectedLayeredBoxSectionId = nextLayer?.sections[0]?.id ?? null;
    }
    autosave();
    return;
  }
}

export function duplicateLayeredBox(layeredBoxId: string): LayeredBox | null {
  for (const layer of project.layers) {
    const layeredBoxIndex = layer.layeredBoxes.findIndex((box) => box.id === layeredBoxId);
    if (layeredBoxIndex === -1) continue;

    const sourceBox = layer.layeredBoxes[layeredBoxIndex];
    const duplicatedBox = cloneLayeredBoxWithFreshIds(sourceBox);
    layer.layeredBoxes.splice(layeredBoxIndex + 1, 0, duplicatedBox);

    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = duplicatedBox.id;
    project.selectedLayeredBoxLayerId = duplicatedBox.layers[0]?.id ?? null;
    project.selectedLayeredBoxSectionId = duplicatedBox.layers[0]?.sections[0]?.id ?? null;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;

    autosave();
    return duplicatedBox;
  }

  return null;
}

export function duplicateLayeredBoxSection(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  sectionId: string
): LayeredBoxSection | null {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes.find((box) => box.id === layeredBoxId);
    if (!layeredBox) continue;

    const internalLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!internalLayer) continue;

    const sectionIndex = internalLayer.sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex === -1) continue;

    const duplicatedSection = cloneLayeredBoxSectionWithFreshIds(internalLayer.sections[sectionIndex]);
    internalLayer.sections.splice(sectionIndex + 1, 0, duplicatedSection);
    if (!layeredBoxFitsResolvedLayout(layeredBox)) {
      internalLayer.sections.splice(sectionIndex + 1, 1);
      return null;
    }

    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = internalLayer.id;
    project.selectedLayeredBoxSectionId = duplicatedSection.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;

    autosave();
    return duplicatedSection;
  }

  return null;
}

export function saveLayeredBoxLayerLayout(
  layeredBoxId: string,
  layeredBoxLayerId: string,
  placements: ManualLooseTrayPlacement[]
): boolean {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((entry) => entry.id === layeredBoxId);
    if (!layeredBox) continue;
    const internalLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!internalLayer) continue;

    const previousLayout = internalLayer.manualLayout;
    internalLayer.manualLayout = placements;
    if (!layeredBoxFitsResolvedLayout(layeredBox)) {
      internalLayer.manualLayout = previousLayout;
      return false;
    }

    autosave();
    return true;
  }

  return false;
}

export function clearLayeredBoxLayerLayout(layeredBoxId: string, layeredBoxLayerId: string): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((entry) => entry.id === layeredBoxId);
    if (!layeredBox) continue;
    const internalLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!internalLayer) continue;
    internalLayer.manualLayout = undefined;
    autosave();
    return;
  }
}

// Box operations
export function addBox(layerId?: string, trayType: TrayType = 'counter'): Box {
  // Find the target layer
  const targetLayerId = layerId ?? project.selectedLayerId ?? project.layers[0]?.id;
  const layer = project.layers.find((l) => l.id === targetLayerId);
  if (!layer) {
    // Create a layer if none exists
    const newLayer = createDefaultLayer('Layer 1');
    project.layers.push(newLayer);
    return addBox(newLayer.id, trayType);
  }

  const boxNumber = getAllBoxes().length + 1;
  const box = createDefaultBox(`Box ${boxNumber}`);

  if (trayType !== 'empty' && trayType !== 'miniatureRack') {
    const color = getNextTrayColor(project.layers);
    let tray: Tray;
    if (trayType === 'cardDraw' || trayType === 'card') {
      tray = createDefaultCardDrawTray('Card Draw 1', color, project.cardSizes);
    } else if (trayType === 'cardDivider') {
      tray = createDefaultCardDividerTray('Card Divider 1', color, project.cardSizes);
    } else if (trayType === 'cup') {
      tray = createDefaultCupTray('Cup Tray 1', color);
    } else if (trayType === 'cardWell') {
      tray = createDefaultCardWellTray('Card Well 1', color, project.cardSizes);
    } else {
      tray = createDefaultCounterTray('Tray 1', color, project.counterShapes);
      const globalParams = getGlobalParamsFromExisting();
      tray.params = { ...tray.params, ...globalParams };
    }

    box.customWidth = undefined;
    box.customDepth = undefined;
    box.customBoxHeight = undefined;
    box.trays = [tray];
  }

  layer.boxes.push(box);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = box.id;
  project.selectedTrayId = box.trays[0]?.id ?? null;
  project.selectedBoardId = null;

  autosave();
  return box;
}

export function deleteBox(boxId: string): void {
  // Find the box across all layers
  for (const layer of project.layers) {
    const index = layer.boxes.findIndex((b) => b.id === boxId);
    if (index !== -1) {
      layer.boxes.splice(index, 1);

      // Update selection
      if (project.selectedBoxId === boxId) {
        if (layer.boxes.length > 0) {
          const newIndex = Math.min(index, layer.boxes.length - 1);
          project.selectedBoxId = layer.boxes[newIndex].id;
          project.selectedTrayId = layer.boxes[newIndex].trays[0]?.id ?? null;
        } else if (layer.looseTrays.length > 0) {
          project.selectedBoxId = null;
          project.selectedTrayId = layer.looseTrays[0].id;
        } else {
          project.selectedBoxId = null;
          project.selectedTrayId = null;
        }
      }
      autosave();
      return;
    }
  }
}

export function updateBox(boxId: string, updates: Partial<Omit<Box, 'id' | 'trays'>>): void {
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      Object.assign(box, updates);
      autosave();
      return;
    }
  }
}

export function duplicateBox(boxId: string): Box | null {
  for (const layer of project.layers) {
    const boxIndex = layer.boxes.findIndex((box) => box.id === boxId);
    if (boxIndex === -1) continue;

    const sourceBox = layer.boxes[boxIndex];
    const duplicatedBox = cloneBoxWithFreshIds(sourceBox);
    layer.boxes.splice(boxIndex + 1, 0, duplicatedBox);

    const sourcePlacement = layer.manualLayout?.boxes.find((placement) => placement.boxId === boxId);
    if (sourcePlacement) {
      layer.manualLayout = {
        boxes: [...(layer.manualLayout?.boxes ?? []), { ...offsetPlacement(sourcePlacement), boxId: duplicatedBox.id }],
        looseTrays: layer.manualLayout?.looseTrays ?? [],
        boards: layer.manualLayout?.boards ?? []
      };
    }

    project.selectedLayerId = layer.id;
    project.selectedBoxId = duplicatedBox.id;
    project.selectedTrayId = duplicatedBox.trays[0]?.id ?? null;
    project.selectedLayeredBoxId = null;
    project.selectedLayeredBoxLayerId = null;
    project.selectedLayeredBoxSectionId = null;
    project.selectedBoardId = null;

    autosave();
    return duplicatedBox;
  }

  return null;
}

export function expandBoxToAvailableSpace(
  boxId: string,
  gameContainerWidth: number,
  gameContainerDepth: number
): boolean {
  for (const layer of project.layers) {
    const boxIndex = layer.boxes.findIndex((b) => b.id === boxId);
    if (boxIndex === -1) continue;
    const box = layer.boxes[boxIndex];

    const arrangement = arrangeLayerContents(layer, {
      gameContainerWidth,
      gameContainerDepth,
      cardSizes: project.cardSizes,
      counterShapes: project.counterShapes
    });
    const targetPlacement = arrangement.boxes.find((placement) => placement.box.id === boxId);
    if (!targetPlacement) return false;

    const currentLeft = targetPlacement.x;
    const currentTop = targetPlacement.y;
    const currentRight = currentLeft + targetPlacement.dimensions.width;
    const currentBottom = currentTop + targetPlacement.dimensions.depth;

    const obstacles = [
      ...arrangement.boxes
        .filter((placement) => placement.box.id !== boxId)
        .map((placement) => ({
          x: placement.x,
          y: placement.y,
          width: placement.dimensions.width,
          depth: placement.dimensions.depth
        })),
      ...arrangement.looseTrays.map((placement) => ({
        x: placement.x,
        y: placement.y,
        width: placement.dimensions.width,
        depth: placement.dimensions.depth
      })),
      ...arrangement.boards.map((placement) => ({
        x: placement.x,
        y: placement.y,
        width: placement.dimensions.width,
        depth: placement.dimensions.depth
      }))
    ];

    const isEmpty = box.trays.length === 0;
    const isCupOnly = !isEmpty && box.trays.every((tray) => isCupTray(tray));
    const canShrinkContent = isEmpty || isCupOnly;

    const currentTrayPlacements =
      box.trays.length > 0
        ? arrangeTrays(box.trays, {
            customBoxWidth: box.customWidth,
            wallThickness: box.wallThickness,
            tolerance: box.tolerance,
            cardSizes: project.cardSizes,
            counterShapes: project.counterShapes,
            manualLayout: box.manualLayout
          })
        : [];
    const currentInterior = getBoxInteriorDimensions(currentTrayPlacements, box.tolerance);

    const cupOnlyMinimums = isCupOnly
      ? (() => {
          const minCupWidth = Math.min(...box.trays.map((tray) => (isCupTray(tray) ? tray.params.trayWidth : Infinity)));
          const minCupDepth = Math.min(...box.trays.map((tray) => (isCupTray(tray) ? tray.params.trayDepth : Infinity)));
          const contentWidth = Math.max(currentInterior.width - box.tolerance * 2, 1);
          const contentDepth = Math.max(currentInterior.depth - box.tolerance * 2, 1);
          const minWidthScale = Number.isFinite(minCupWidth) && minCupWidth > 0 ? 20 / minCupWidth : 1;
          const minDepthScale = Number.isFinite(minCupDepth) && minCupDepth > 0 ? 20 / minCupDepth : 1;
          return {
            minWidth: contentWidth * minWidthScale + box.wallThickness * 2 + box.tolerance * 2,
            minDepth: contentDepth * minDepthScale + box.wallThickness * 2 + box.tolerance * 2
          };
        })()
      : null;

    const minimums = calculateMinimumBoxDimensions(box, project.cardSizes, project.counterShapes);
    const currentRotation = targetPlacement.rotation;
    const isCurrentlySwapped = currentRotation === 90 || currentRotation === 270;
    const matchingRotation = currentRotation;
    const swappedRotation = currentRotation === 90
      ? 0
      : currentRotation === 270
        ? 180
        : currentRotation + 90;

    const currentLocalWidth = box.customWidth ?? minimums.minWidth;
    const currentLocalDepth = box.customDepth ?? minimums.minDepth;
    const minLocalWidth = canShrinkContent ? (cupOnlyMinimums?.minWidth ?? minimums.minWidth) : currentLocalWidth;
    const minLocalDepth = canShrinkContent ? (cupOnlyMinimums?.minDepth ?? minimums.minDepth) : currentLocalDepth;
    const currentRect = {
      left: currentLeft,
      right: currentRight,
      top: currentTop,
      bottom: currentBottom
    };
    const currentCenterX = (currentLeft + currentRight) / 2;
    const currentCenterY = (currentTop + currentBottom) / 2;
    const availableRects = findAvailableGapRects(obstacles, gameContainerWidth, gameContainerDepth);
    const rectOptions = availableRects
      .map((rect) => {
        const gapWidth = rect.right - rect.left;
        const gapDepth = rect.bottom - rect.top;
        const candidates = [
          {
            rotation: matchingRotation as 0 | 90 | 180 | 270,
            localWidth: isCurrentlySwapped ? gapDepth : gapWidth,
            localDepth: isCurrentlySwapped ? gapWidth : gapDepth
          },
          {
            rotation: swappedRotation as 0 | 90 | 180 | 270,
            localWidth: isCurrentlySwapped ? gapWidth : gapDepth,
            localDepth: isCurrentlySwapped ? gapDepth : gapWidth
          }
        ];
        const fittingCandidate = candidates.find(
          (candidate) => candidate.localWidth >= minLocalWidth && candidate.localDepth >= minLocalDepth
        );
        const containsCurrent =
          rect.left <= currentRect.left &&
          rect.right >= currentRect.right &&
          rect.top <= currentRect.top &&
          rect.bottom >= currentRect.bottom;
        const rectCenterX = (rect.left + rect.right) / 2;
        const rectCenterY = (rect.top + rect.bottom) / 2;
        return {
          rect,
          fittingCandidate,
          area: gapWidth * gapDepth,
          containsCurrent,
          distance: Math.hypot(rectCenterX - currentCenterX, rectCenterY - currentCenterY)
        };
      })
      .filter((option) => option.fittingCandidate);

    const chosenRectOption = canShrinkContent
      ? rectOptions.sort((a, b) => b.area - a.area || a.distance - b.distance)[0]
      : rectOptions
          .filter((option) => option.containsCurrent)
          .sort((a, b) => b.area - a.area)[0] ??
        rectOptions.sort((a, b) => a.distance - b.distance || b.area - a.area)[0];

    if (!chosenRectOption?.fittingCandidate) return false;

    const { rect: bestRect, fittingCandidate } = chosenRectOption;
    const nextCustomWidth = Math.max(fittingCandidate.localWidth, minLocalWidth);
    const nextCustomDepth = Math.max(fittingCandidate.localDepth, minLocalDepth);
    const effectiveLeftBoundary = bestRect.left;
    const effectiveTopBoundary = bestRect.top;

    const targetInteriorWidth = Math.max(nextCustomWidth - box.wallThickness * 2 - box.tolerance * 2, 1);
    const targetInteriorDepth = Math.max(nextCustomDepth - box.wallThickness * 2 - box.tolerance * 2, 1);
    const currentContentWidth = Math.max(currentInterior.width - box.tolerance * 2, 1);
    const currentContentDepth = Math.max(currentInterior.depth - box.tolerance * 2, 1);
    const widthScale = isCupOnly ? targetInteriorWidth / currentContentWidth : 1;
    const depthScale = isCupOnly ? targetInteriorDepth / currentContentDepth : 1;

    const resizedTrays = isCupOnly
      ? box.trays.map((tray) => {
          if (!isCupTray(tray)) return tray;
          return {
            ...tray,
            params: {
              ...tray.params,
              trayWidth: Math.max(tray.params.trayWidth * widthScale, 20),
              trayDepth: Math.max(tray.params.trayDepth * depthScale, 20)
            }
          };
        })
      : box.trays;

    layer.boxes[boxIndex] = {
      ...box,
      trays: resizedTrays,
      customWidth: nextCustomWidth,
      customDepth: nextCustomDepth
    };

    const manualPlacements = arrangementToManualPlacements(arrangement);
    layer.manualLayout = {
      boxes: manualPlacements.boxes.map((placement) =>
        placement.boxId === boxId
          ? {
              ...placement,
              x: effectiveLeftBoundary,
              y: effectiveTopBoundary,
              rotation: fittingCandidate.rotation
            }
          : placement
      ),
      looseTrays: manualPlacements.looseTrays,
      boards: manualPlacements.boards
    };

    autosave();
    return true;
  }

  return false;
}

// Global params that should be shared across counter trays
const GLOBAL_PARAM_KEYS: (keyof CounterTrayParams)[] = [
  'clearance',
  'wallThickness',
  'floorThickness',
  'rimHeight',
  'cutoutRatio',
  'cutoutMax',
  'gameContainerWidth',
  'gameContainerDepth'
];

// Get current global params from any existing counter tray
function getGlobalParamsFromExisting(): Partial<CounterTrayParams> {
  for (const layer of project.layers) {
    // Check box trays
    for (const box of layer.boxes) {
      for (const tray of box.trays) {
        if (isCounterTray(tray)) {
          const existingParams = tray.params;
          const globalParams: Partial<CounterTrayParams> = {};
          for (const key of GLOBAL_PARAM_KEYS) {
            (globalParams as Record<string, unknown>)[key] = existingParams[key];
          }
          return globalParams;
        }
      }
    }
    // Check loose trays
    for (const tray of layer.looseTrays) {
      if (isCounterTray(tray)) {
        const existingParams = tray.params;
        const globalParams: Partial<CounterTrayParams> = {};
        for (const key of GLOBAL_PARAM_KEYS) {
          (globalParams as Record<string, unknown>)[key] = existingParams[key];
        }
        return globalParams;
      }
    }
  }
  return {};
}

// Tray type for addTray function
export type TrayType =
  | 'miniatureRack'
  | 'counter'
  | 'cardDraw'
  | 'cardDivider'
  | 'cup'
  | 'cardWell'
  | 'card'
  | 'empty';

// Loose tray operations
export function addLooseTray(layerId?: string, trayType: TrayType = 'counter'): Tray | null {
  // Find the target layer
  const targetLayerId = layerId ?? project.selectedLayerId ?? project.layers[0]?.id;
  const layer = project.layers.find((l) => l.id === targetLayerId);
  if (!layer) return null;

  const trayNumber = layer.looseTrays.length + 1;
  const color = getNextTrayColor(project.layers);

  let tray: Tray;
  if (trayType === 'miniatureRack') {
    tray = createDefaultMiniatureRack(`Miniature Rack ${trayNumber}`, color);
  } else if (trayType === 'cardDraw' || trayType === 'card') {
    tray = createDefaultCardDrawTray(`Loose Card ${trayNumber}`, color, project.cardSizes);
  } else if (trayType === 'cardDivider') {
    tray = createDefaultCardDividerTray(`Loose Divider ${trayNumber}`, color, project.cardSizes);
  } else if (trayType === 'cup') {
    tray = createDefaultCupTray(`Loose Cups ${trayNumber}`, color);
  } else if (trayType === 'cardWell') {
    tray = createDefaultCardWellTray(`Loose Well ${trayNumber}`, color, project.cardSizes);
  } else {
    tray = createDefaultCounterTray(`Loose Tray ${trayNumber}`, color, project.counterShapes);
    // Inherit global params (including customShapes) from existing counter trays
    const globalParams = getGlobalParamsFromExisting();
    tray.params = { ...tray.params, ...globalParams };
  }

  layer.looseTrays.push(tray);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = null;
  project.selectedTrayId = tray.id;
  project.selectedBoardId = null;

  autosave();
  return tray;
}

export function deleteLooseTray(trayId: string): void {
  for (const layer of project.layers) {
    const index = layer.looseTrays.findIndex((t) => t.id === trayId);
    if (index !== -1) {
      layer.looseTrays.splice(index, 1);

      // Update selection
      if (project.selectedTrayId === trayId) {
        if (layer.looseTrays.length > 0) {
          const newIndex = Math.min(index, layer.looseTrays.length - 1);
          project.selectedTrayId = layer.looseTrays[newIndex].id;
        } else if (layer.boxes.length > 0) {
          project.selectedBoxId = layer.boxes[0].id;
          project.selectedTrayId = layer.boxes[0].trays[0]?.id ?? null;
        } else {
          project.selectedTrayId = null;
        }
      }
      autosave();
      return;
    }
  }
}

// Tray operations (within boxes)
export function addTray(boxId: string, trayType: TrayType = 'counter'): Tray | null {
  // Find the box across all layers
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      const trayNumber = box.trays.length + 1;
      const color = getNextTrayColor(project.layers);

      let tray: Tray;
      if (trayType === 'miniatureRack') {
        return null;
      }
      if (trayType === 'cardDraw' || trayType === 'card') {
        tray = createDefaultCardDrawTray(`Card Draw ${trayNumber}`, color, project.cardSizes);
      } else if (trayType === 'cardDivider') {
        tray = createDefaultCardDividerTray(`Card Divider ${trayNumber}`, color, project.cardSizes);
      } else if (trayType === 'cup') {
        tray = createDefaultCupTray(`Cup Tray ${trayNumber}`, color);
      } else if (trayType === 'cardWell') {
        tray = createDefaultCardWellTray(`Card Well ${trayNumber}`, color, project.cardSizes);
      } else {
        tray = createDefaultCounterTray(`Tray ${trayNumber}`, color, project.counterShapes);
        // Inherit global params (including customShapes) from existing counter trays
        const globalParams = getGlobalParamsFromExisting();
        tray.params = { ...tray.params, ...globalParams };
      }

      box.trays.push(tray);
      project.selectedLayerId = layer.id;
      project.selectedBoxId = boxId;
      project.selectedTrayId = tray.id;
      project.selectedBoardId = null;

      // Clear manual layout and convert placeholder empty-box dimensions to auto.
      box.manualLayout = undefined;
      if (shouldResetPlaceholderBoxDimensions(box)) {
        box.customWidth = undefined;
        box.customDepth = undefined;
        box.customBoxHeight = undefined;
      } else {
        box.customWidth = undefined;
        box.customDepth = undefined;
      }

      autosave();
      return tray;
    }
  }
  return null;
}

export function deleteTray(boxId: string, trayId: string): void {
  // Check if this is a loose tray
  const location = findTrayLocation(project, trayId);
  if (location && location.boxId === null) {
    deleteLooseTray(trayId);
    return;
  }

  // Find the box across all layers
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      const index = box.trays.findIndex((t) => t.id === trayId);
      if (index === -1) return;

      box.trays.splice(index, 1);

      // Clear manual layout and custom dimensions so auto layout takes over
      box.manualLayout = undefined;
      box.customWidth = undefined;
      box.customDepth = undefined;

      // Update selection
      if (project.selectedTrayId === trayId) {
        if (box.trays.length > 0) {
          const newIndex = Math.min(index, box.trays.length - 1);
          project.selectedTrayId = box.trays[newIndex].id;
        } else {
          project.selectedTrayId = null;
        }
      }
      autosave();
      return;
    }
  }
}

export function duplicateTray(trayId: string): Tray | null {
  const location = findTrayLocation(project, trayId);
  if (!location) return null;

  const layer = project.layers.find((entry) => entry.id === location.layerId);
  if (!layer) return null;

  if (location.boxId) {
    const box = layer.boxes.find((entry) => entry.id === location.boxId);
    if (!box) return null;

    const trayIndex = box.trays.findIndex((tray) => tray.id === trayId);
    if (trayIndex === -1) return null;

    const duplicatedTray = cloneTrayWithFreshIds(box.trays[trayIndex]);
    box.trays.splice(trayIndex + 1, 0, duplicatedTray);

    const sourcePlacement = box.manualLayout?.find((placement) => placement.trayId === trayId);
    if (sourcePlacement) {
      box.manualLayout = [...(box.manualLayout ?? []), { ...offsetPlacement(sourcePlacement), trayId: duplicatedTray.id }];
    }

    project.selectedLayerId = layer.id;
    project.selectedBoxId = box.id;
    project.selectedTrayId = duplicatedTray.id;
    project.selectedLayeredBoxId = null;
    project.selectedLayeredBoxLayerId = null;
    project.selectedLayeredBoxSectionId = null;
    project.selectedBoardId = null;

    autosave();
    return duplicatedTray;
  }

  const trayIndex = layer.looseTrays.findIndex((tray) => tray.id === trayId);
  if (trayIndex === -1) return null;

  const duplicatedTray = cloneTrayWithFreshIds(layer.looseTrays[trayIndex]);
  layer.looseTrays.splice(trayIndex + 1, 0, duplicatedTray);

  const sourcePlacement = layer.manualLayout?.looseTrays.find((placement) => placement.trayId === trayId);
  if (sourcePlacement) {
    layer.manualLayout = {
      boxes: layer.manualLayout?.boxes ?? [],
      looseTrays: [...(layer.manualLayout?.looseTrays ?? []), { ...offsetPlacement(sourcePlacement), trayId: duplicatedTray.id }],
      boards: layer.manualLayout?.boards ?? []
    };
  }

  project.selectedLayerId = layer.id;
  project.selectedBoxId = null;
  project.selectedTrayId = duplicatedTray.id;
  project.selectedLayeredBoxId = null;
  project.selectedLayeredBoxLayerId = null;
  project.selectedLayeredBoxSectionId = null;
  project.selectedBoardId = null;

  autosave();
  return duplicatedTray;
}

export function updateTray(trayId: string, updates: Partial<Omit<Tray, 'id'>>): void {
  // Check box trays
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray) {
        Object.assign(tray, updates);
        autosave();
        return;
      }
    }
    // Check loose trays
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray) {
      Object.assign(looseTray, updates);
      autosave();
      return;
    }
  }
}

// Set tray rotation override ('auto' | 0 | 90)
export function setTrayRotation(trayId: string, rotation: 'auto' | 0 | 90): void {
  for (const layer of project.layers) {
    // Check box trays
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray) {
        tray.rotationOverride = rotation;
        autosave();
        return;
      }
    }
    // Check loose trays
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray) {
      looseTray.rotationOverride = rotation;
      autosave();
      return;
    }
  }
}

// Update counter tray params
export function updateTrayParams(trayId: string, params: CounterTrayParams): void {
  for (const layer of project.layers) {
    // Check box trays
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isCounterTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    // Check loose trays
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isCounterTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

// Counter shape operations (global)
export function getCounterShapes(): CounterShape[] {
  return project.counterShapes;
}

export function getCounterShape(id: string): CounterShape | null {
  return project.counterShapes.find((s) => s.id === id) ?? null;
}

export function addCounterShape(shape: Omit<CounterShape, 'id'>): CounterShape {
  const newShape: CounterShape = { ...shape, category: shape.category ?? 'counter', id: generateId() };
  project.counterShapes.push(newShape);
  autosave();
  return newShape;
}

export function updateCounterShape(id: string, updates: Partial<Omit<CounterShape, 'id'>>): void {
  const shape = project.counterShapes.find((s) => s.id === id);
  if (shape) {
    Object.assign(shape, updates);
    shape.category = shape.category ?? 'counter';
    autosave();
  }
}

export function deleteCounterShape(id: string): void {
  const index = project.counterShapes.findIndex((s) => s.id === id);
  if (index >= 0) {
    project.counterShapes.splice(index, 1);
    // Remove stacks referencing this shape from all counter trays (boxes and loose)
    for (const layer of project.layers) {
      for (const box of layer.boxes) {
        for (const tray of box.trays) {
          if (isCounterTray(tray)) {
            tray.params.topLoadedStacks = tray.params.topLoadedStacks.filter(([shapeId]) => shapeId !== id);
            tray.params.edgeLoadedStacks = tray.params.edgeLoadedStacks.filter(([shapeId]) => shapeId !== id);
          }
        }
      }
      for (const tray of layer.looseTrays) {
        if (isCounterTray(tray)) {
          tray.params.topLoadedStacks = tray.params.topLoadedStacks.filter(([shapeId]) => shapeId !== id);
          tray.params.edgeLoadedStacks = tray.params.edgeLoadedStacks.filter(([shapeId]) => shapeId !== id);
        }
      }
    }
    autosave();
  }
}

// Card size operations (global)
export function getCardSizes(): CardSize[] {
  return project.cardSizes;
}

export function getCardSize(id: string): CardSize | null {
  return project.cardSizes.find((s) => s.id === id) ?? null;
}

export function addCardSize(cardSize: Omit<CardSize, 'id'>): CardSize {
  const newCardSize: CardSize = { ...cardSize, id: generateId() };
  project.cardSizes.push(newCardSize);
  autosave();
  return newCardSize;
}

export function updateCardSize(id: string, updates: Partial<Omit<CardSize, 'id'>>): void {
  const cardSize = project.cardSizes.find((s) => s.id === id);
  if (cardSize) {
    Object.assign(cardSize, updates);
    autosave();
  }
}

export function deleteCardSize(id: string): void {
  const index = project.cardSizes.findIndex((s) => s.id === id);
  if (index >= 0) {
    project.cardSizes.splice(index, 1);
    // Note: We don't auto-delete card trays using this size - let them show an error
    autosave();
  }
}

// Default global settings
export const DEFAULT_GLOBAL_SETTINGS = {
  gameContainerWidth: 256,
  gameContainerDepth: 256,
  gameContainerHeight: null as number | null
};

// Global settings operations
export function getGlobalSettings(): { gameContainerWidth: number; gameContainerDepth: number; gameContainerHeight: number | null } {
  // If project has explicit global settings, use those
  if (project.globalSettings) {
    return {
      gameContainerWidth: project.globalSettings.gameContainerWidth,
      gameContainerDepth: project.globalSettings.gameContainerDepth,
      gameContainerHeight: project.globalSettings.gameContainerHeight ?? null
    };
  }
  // Otherwise, try to get from existing counter tray
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      for (const tray of box.trays) {
        if (isCounterTray(tray)) {
          return {
            gameContainerWidth: tray.params.gameContainerWidth,
            gameContainerDepth: tray.params.gameContainerDepth,
            gameContainerHeight: null
          };
        }
      }
    }
    for (const tray of layer.looseTrays) {
      if (isCounterTray(tray)) {
        return {
          gameContainerWidth: tray.params.gameContainerWidth,
          gameContainerDepth: tray.params.gameContainerDepth,
          gameContainerHeight: null
        };
      }
    }
  }
  // Fall back to defaults
  return DEFAULT_GLOBAL_SETTINGS;
}

export function updateGlobalSettings(updates: {
  gameContainerWidth?: number;
  gameContainerDepth?: number;
  gameContainerHeight?: number | null;
}): void {
  // Initialize global settings if not present
  if (!project.globalSettings) {
    project.globalSettings = { ...DEFAULT_GLOBAL_SETTINGS };
  }
  // Update project-level settings
  if (updates.gameContainerWidth !== undefined) {
    project.globalSettings.gameContainerWidth = updates.gameContainerWidth;
  }
  if (updates.gameContainerDepth !== undefined) {
    project.globalSettings.gameContainerDepth = updates.gameContainerDepth;
  }
  if (updates.gameContainerHeight !== undefined) {
    project.globalSettings.gameContainerHeight = updates.gameContainerHeight;
  }

  // Propagate to all counter trays (these are "global" params)
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      for (const tray of box.trays) {
        if (isCounterTray(tray)) {
          if (updates.gameContainerWidth !== undefined) {
            tray.params.gameContainerWidth = updates.gameContainerWidth;
          }
          if (updates.gameContainerDepth !== undefined) {
            tray.params.gameContainerDepth = updates.gameContainerDepth;
          }
        }
      }
    }
    for (const tray of layer.looseTrays) {
      if (isCounterTray(tray)) {
        if (updates.gameContainerWidth !== undefined) {
          tray.params.gameContainerWidth = updates.gameContainerWidth;
        }
        if (updates.gameContainerDepth !== undefined) {
          tray.params.gameContainerDepth = updates.gameContainerDepth;
        }
      }
    }
  }
  autosave();
}

export function updateProjectName(name: string): void {
  project.name = name;
  autosave();
}

// Update card draw tray params
export function updateCardDrawTrayParams(trayId: string, params: CardDrawTrayParams): void {
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isCardDrawTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isCardDrawTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

// Legacy alias for backwards compatibility
export const updateCardTrayParams = updateCardDrawTrayParams;

// Update card divider tray params
export function updateCardDividerTrayParams(trayId: string, params: CardDividerTrayParams): void {
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isCardDividerTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isCardDividerTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

// Update cup tray params
export function updateCupTrayParams(trayId: string, params: CupTrayParams): void {
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isCupTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isCupTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

// Update card well tray params
export function updateCardWellTrayParams(trayId: string, params: CardWellTrayParams): void {
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isCardWellTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isCardWellTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

export function updateMiniatureRackParams(trayId: string, params: MiniatureRackParams): void {
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray && isMiniatureRackTray(tray)) {
        tray.params = params;
        autosave();
        return;
      }
    }
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray && isMiniatureRackTray(looseTray)) {
      looseTray.params = params;
      autosave();
      return;
    }
  }
}

// Reset project
export function resetProject(): void {
  project = createDefaultProject();
  autosave();
}

// Move a tray to a different box (or create a new box in the same layer)
export function moveTray(trayId: string, targetBoxId: string | 'new'): void {
  // Find the tray and its current location
  let sourceTray: Tray | null = null;
  let sourceBox: Box | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;
  let isLoose = false;

  for (const layer of project.layers) {
    // Check boxes
    for (const box of layer.boxes) {
      const trayIndex = box.trays.findIndex((t) => t.id === trayId);
      if (trayIndex !== -1) {
        sourceTray = box.trays[trayIndex];
        sourceBox = box;
        sourceLayer = layer;
        sourceIndex = trayIndex;
        break;
      }
    }
    if (sourceTray) break;

    // Check loose trays
    const looseTrayIndex = layer.looseTrays.findIndex((t) => t.id === trayId);
    if (looseTrayIndex !== -1) {
      sourceTray = layer.looseTrays[looseTrayIndex];
      sourceLayer = layer;
      sourceIndex = looseTrayIndex;
      isLoose = true;
      break;
    }
  }

  if (!sourceTray || !sourceLayer) return;
  if (isMiniatureRackTray(sourceTray)) return;

  // Determine target box
  let targetBox: Box;
  if (targetBoxId === 'new') {
    // Create a new box in the same layer
    const boxNumber = getAllBoxes().length + 1;
    targetBox = {
      id: generateId(),
      name: `Box ${boxNumber}`,
      trays: [],
      tolerance: sourceBox?.tolerance ?? 0.5,
      wallThickness: sourceBox?.wallThickness ?? 3.0,
      floorThickness: sourceBox?.floorThickness ?? 2.0,
      fillSolidEmpty: true,
      lidParams: sourceBox ? { ...sourceBox.lidParams } : { ...defaultLidParams }
    };
    sourceLayer.boxes.push(targetBox);
  } else {
    // Find target box across all layers
    let found: Box | null = null;
    for (const layer of project.layers) {
      const box = layer.boxes.find((b) => b.id === targetBoxId);
      if (box) {
        found = box;
        break;
      }
    }
    if (!found || (sourceBox && found.id === sourceBox.id)) return; // Can't move to same box
    targetBox = found;
  }

  // Remove from source
  if (isLoose) {
    sourceLayer.looseTrays.splice(sourceIndex, 1);
  } else if (sourceBox) {
    sourceBox.trays.splice(sourceIndex, 1);
  }

  // Add to target box
  if (shouldResetPlaceholderBoxDimensions(targetBox)) {
    targetBox.customWidth = undefined;
    targetBox.customDepth = undefined;
    targetBox.customBoxHeight = undefined;
  }
  targetBox.manualLayout = undefined;
  targetBox.trays.push(sourceTray);

  // Update selection to follow the moved tray
  project.selectedBoxId = targetBox.id;
  project.selectedTrayId = sourceTray.id;

  autosave();
}

// Move a box to a different layer (or create a new layer)
export function moveBoxToLayer(boxId: string, targetLayerId: string | 'new'): void {
  let sourceBox: Box | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;

  for (const layer of project.layers) {
    const boxIndex = layer.boxes.findIndex((b) => b.id === boxId);
    if (boxIndex !== -1) {
      sourceBox = layer.boxes[boxIndex];
      sourceLayer = layer;
      sourceIndex = boxIndex;
      break;
    }
  }

  if (!sourceBox || !sourceLayer) return;

  // Determine target layer
  let targetLayer: Layer;
  if (targetLayerId === 'new') {
    // Create a new layer
    const layerNumber = project.layers.length + 1;
    targetLayer = createDefaultLayer(`Layer ${layerNumber}`);
    project.layers.push(targetLayer);
  } else {
    const found = project.layers.find((l) => l.id === targetLayerId);
    if (!found || found.id === sourceLayer.id) return;
    targetLayer = found;
  }

  // Remove from source layer
  sourceLayer.boxes.splice(sourceIndex, 1);

  // Add to target layer
  targetLayer.boxes.push(sourceBox);

  // Update selection
  project.selectedLayerId = targetLayer.id;
  project.selectedBoxId = sourceBox.id;

  autosave();
}

export function moveLayeredBoxToLayer(layeredBoxId: string, targetLayerId: string | 'new'): void {
  let sourceBox: LayeredBox | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;

  for (const layer of project.layers) {
    const boxIndex = layer.layeredBoxes.findIndex((b) => b.id === layeredBoxId);
    if (boxIndex !== -1) {
      sourceBox = layer.layeredBoxes[boxIndex];
      sourceLayer = layer;
      sourceIndex = boxIndex;
      break;
    }
  }

  if (!sourceBox || !sourceLayer) return;

  let targetLayer: Layer;
  if (targetLayerId === 'new') {
    const layerNumber = project.layers.length + 1;
    targetLayer = createDefaultLayer(`Layer ${layerNumber}`);
    project.layers.push(targetLayer);
  } else {
    const found = project.layers.find((l) => l.id === targetLayerId);
    if (!found || found.id === sourceLayer.id) return;
    targetLayer = found;
  }

  sourceLayer.layeredBoxes.splice(sourceIndex, 1);
  targetLayer.layeredBoxes.push(sourceBox);

  project.selectedLayerId = targetLayer.id;
  project.selectedLayeredBoxId = sourceBox.id;
  project.selectedLayeredBoxLayerId = sourceBox.layers[0]?.id ?? null;
  project.selectedLayeredBoxSectionId = sourceBox.layers[0]?.sections[0]?.id ?? null;
  project.selectedBoxId = null;
  project.selectedTrayId = null;
  project.selectedBoardId = null;

  autosave();
}

// Move a loose tray into a box
export function moveLooseTrayToBox(trayId: string, targetBoxId: string): void {
  let sourceTray: Tray | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;

  for (const layer of project.layers) {
    const trayIndex = layer.looseTrays.findIndex((t) => t.id === trayId);
    if (trayIndex !== -1) {
      sourceTray = layer.looseTrays[trayIndex];
      sourceLayer = layer;
      sourceIndex = trayIndex;
      break;
    }
  }

  if (!sourceTray || !sourceLayer) return;

  // Find target box
  let targetBox: Box | null = null;
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === targetBoxId);
    if (box) {
      targetBox = box;
      break;
    }
  }

  if (!targetBox) return;

  // Remove from loose trays
  sourceLayer.looseTrays.splice(sourceIndex, 1);

  // Add to target box
  if (shouldResetPlaceholderBoxDimensions(targetBox)) {
    targetBox.customWidth = undefined;
    targetBox.customDepth = undefined;
    targetBox.customBoxHeight = undefined;
  }
  targetBox.manualLayout = undefined;
  targetBox.trays.push(sourceTray);

  // Update selection
  project.selectedBoxId = targetBox.id;
  project.selectedTrayId = sourceTray.id;

  autosave();
}

// Move a tray from a box to loose, or move a loose tray to a different layer
export function moveTrayToLoose(trayId: string, targetLayerId?: string): void {
  let sourceTray: Tray | null = null;
  let sourceBox: Box | null = null;
  let sourceLayer: Layer | null = null;
  let sourceIndex = -1;
  let isLooseTray = false;

  // First, check if tray is in a box
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      const trayIndex = box.trays.findIndex((t) => t.id === trayId);
      if (trayIndex !== -1) {
        sourceTray = box.trays[trayIndex];
        sourceBox = box;
        sourceLayer = layer;
        sourceIndex = trayIndex;
        break;
      }
    }
    if (sourceTray) break;
  }

  // If not found in a box, check loose trays
  if (!sourceTray) {
    for (const layer of project.layers) {
      const looseIndex = layer.looseTrays.findIndex((t) => t.id === trayId);
      if (looseIndex !== -1) {
        sourceTray = layer.looseTrays[looseIndex];
        sourceLayer = layer;
        sourceIndex = looseIndex;
        isLooseTray = true;
        break;
      }
    }
  }

  if (!sourceTray || !sourceLayer) return;

  const targetLayer = targetLayerId ? (project.layers.find((l) => l.id === targetLayerId) ?? sourceLayer) : sourceLayer;

  // If already loose and moving to same layer, nothing to do
  if (isLooseTray && targetLayer.id === sourceLayer.id) return;

  // Remove from source
  if (isLooseTray) {
    sourceLayer.looseTrays.splice(sourceIndex, 1);
  } else if (sourceBox) {
    sourceBox.trays.splice(sourceIndex, 1);
  }

  // Add to target layer's loose trays
  targetLayer.looseTrays.push(sourceTray);

  // Update selection
  project.selectedLayerId = targetLayer.id;
  project.selectedBoxId = null;
  project.selectedTrayId = sourceTray.id;

  autosave();
}

// Import project from JSON data
export function importProject(data: Project): void {
  // Run migrations to ensure all fields have proper defaults (handles older exported files)
  project = migrateProjectData(data);
  // Ensure selection is valid
  if (project.layers.length > 0) {
    // Ensure selectedLayerId is valid
    const selectedLayer = project.layers.find((l) => l.id === project.selectedLayerId);
    if (!selectedLayer) {
      project.selectedLayerId = project.layers[0].id;
    }
    const layer = project.layers.find((l) => l.id === project.selectedLayerId);
    if (layer) {
      if (project.selectedLayeredBoxId) {
        const selectedLayeredBox = layer.layeredBoxes.find((b) => b.id === project.selectedLayeredBoxId);
        if (!selectedLayeredBox) {
          project.selectedLayeredBoxId = null;
          project.selectedLayeredBoxLayerId = null;
          project.selectedLayeredBoxSectionId = null;
        } else if (project.selectedLayeredBoxLayerId) {
          const selectedInternalLayer = selectedLayeredBox.layers.find((entry) => entry.id === project.selectedLayeredBoxLayerId);
          if (!selectedInternalLayer) {
            project.selectedLayeredBoxLayerId = selectedLayeredBox.layers[0]?.id ?? null;
            project.selectedLayeredBoxSectionId = selectedLayeredBox.layers[0]?.sections[0]?.id ?? null;
          } else if (project.selectedLayeredBoxSectionId) {
            const selectedSection = selectedInternalLayer.sections.find((entry) => entry.id === project.selectedLayeredBoxSectionId);
            if (!selectedSection) {
              project.selectedLayeredBoxSectionId = selectedInternalLayer.sections[0]?.id ?? null;
            }
          }
        }
      }
      // Ensure selectedBoxId is valid
      if (project.selectedBoxId) {
        const selectedBox = layer.boxes.find((b) => b.id === project.selectedBoxId);
        if (!selectedBox) {
          if (layer.boxes.length > 0) {
            project.selectedBoxId = layer.boxes[0].id;
          } else {
            project.selectedBoxId = null;
          }
        }
      }
      // Ensure selectedTrayId is valid (or set default if not set)
      const needsTraySelection = !project.selectedTrayId || !findTrayLocation(project, project.selectedTrayId);
      if (needsTraySelection) {
        // Find first available tray
        if (layer.boxes.length > 0 && layer.boxes[0].trays.length > 0) {
          project.selectedBoxId = layer.boxes[0].id;
          project.selectedLayeredBoxId = null;
          project.selectedLayeredBoxLayerId = null;
          project.selectedLayeredBoxSectionId = null;
          project.selectedTrayId = layer.boxes[0].trays[0].id;
          project.selectedBoardId = null;
        } else if (layer.looseTrays.length > 0) {
          project.selectedBoxId = null;
          project.selectedLayeredBoxId = null;
          project.selectedLayeredBoxLayerId = null;
          project.selectedLayeredBoxSectionId = null;
          project.selectedTrayId = layer.looseTrays[0].id;
          project.selectedBoardId = null;
        } else if (layer.layeredBoxes.length > 0) {
          project.selectedBoxId = null;
          project.selectedLayeredBoxId = layer.layeredBoxes[0].id;
          project.selectedLayeredBoxLayerId = layer.layeredBoxes[0].layers[0]?.id ?? null;
          project.selectedLayeredBoxSectionId = layer.layeredBoxes[0].layers[0]?.sections[0]?.id ?? null;
          project.selectedTrayId = null;
          project.selectedBoardId = null;
        } else if (layer.boards.length > 0) {
          project.selectedBoxId = null;
          project.selectedLayeredBoxId = null;
          project.selectedLayeredBoxLayerId = null;
          project.selectedLayeredBoxSectionId = null;
          project.selectedTrayId = null;
          project.selectedBoardId = layer.boards[0].id;
        } else {
          project.selectedLayeredBoxId = null;
          project.selectedLayeredBoxLayerId = null;
          project.selectedLayeredBoxSectionId = null;
          project.selectedTrayId = null;
          project.selectedBoardId = null;
        }
      }
    }
  } else {
    project.selectedLayerId = null;
    project.selectedBoxId = null;
    project.selectedLayeredBoxId = null;
    project.selectedLayeredBoxLayerId = null;
    project.selectedLayeredBoxSectionId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
  }
  autosave();
}

// Save manual tray layout for a box (box dimensions auto-calculate from tray positions)
export function saveManualLayout(boxId: string, placements: ManualTrayPlacement[]): void {
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      box.manualLayout = placements;
      autosave();
      return;
    }
  }
}

// Clear manual layout for a box (reverts to auto bin-packing)
export function clearManualLayout(boxId: string): void {
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) {
      box.manualLayout = undefined;
      // Optionally clear custom dimensions to let auto-sizing take over
      box.customWidth = undefined;
      box.customDepth = undefined;
      autosave();
      return;
    }
  }
}

// Get manual layout for a box
export function getManualLayout(boxId: string): ManualTrayPlacement[] | undefined {
  for (const layer of project.layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) return box.manualLayout;
  }
  return undefined;
}

// Save manual layer layout (box and loose tray positions)
export function saveLayerLayout(
  layerId: string,
  boxPlacements: ManualBoxPlacement[],
  looseTrayPlacements: ManualLooseTrayPlacement[],
  boardPlacements: ManualBoardPlacement[]
): void {
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) return;

  layer.manualLayout = {
    boxes: boxPlacements,
    looseTrays: looseTrayPlacements,
    boards: boardPlacements
  };

  autosave();
}

// Clear manual layer layout (reverts to auto arrangement)
export function clearLayerLayout(layerId: string): void {
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) return;

  layer.manualLayout = undefined;
  autosave();
}

// Get manual layer layout
export function getLayerLayout(
  layerId: string
): { boxes: ManualBoxPlacement[]; looseTrays: ManualLooseTrayPlacement[]; boards?: ManualBoardPlacement[] } | undefined {
  const layer = project.layers.find((l) => l.id === layerId);
  return layer?.manualLayout;
}
