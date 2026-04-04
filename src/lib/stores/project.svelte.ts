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
import { DEFAULT_EMPTY_BOX_BODY_HEIGHT, DEFAULT_EMPTY_BOX_DEPTH, DEFAULT_EMPTY_BOX_WIDTH } from '$lib/models/box';
import { saveNow, scheduleSave } from '$lib/stores/saveManager';
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
  ManualBoxPlacement,
  ManualBoardPlacement,
  ManualLooseTrayPlacement,
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
  ManualLooseTrayPlacement,
  Project,
  Tray
};

// Default counter thickness (used when migrating old shapes without thickness)
export const DEFAULT_COUNTER_THICKNESS = 1.3;

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

function createDefaultLayeredBoxLayer(name: string): LayeredBoxLayer {
  return {
    id: generateId(),
    name,
    fillSolidEmpty: true,
    edgeReliefEnabled: true,
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

function createDefaultProject(): Project {
  const project = JSON.parse(JSON.stringify(defaultProjectJson)) as Project;
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

export function addLayeredBox(layerId?: string): LayeredBox | null {
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
): LayeredBoxSection | null {
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
    const section = createDefaultLayeredBoxSection(type, sectionName);
    boxLayer.sections.push(section);
    project.selectedLayerId = layer.id;
    project.selectedLayeredBoxId = layeredBox.id;
    project.selectedLayeredBoxLayerId = boxLayer.id;
    project.selectedLayeredBoxSectionId = section.id;
    project.selectedBoxId = null;
    project.selectedTrayId = null;
    project.selectedBoardId = null;
    autosave();
    return section;
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
): void {
  for (const layer of project.layers) {
    const layeredBox = layer.layeredBoxes?.find((b) => b.id === layeredBoxId);
    if (!layeredBox) continue;
    const boxLayer = layeredBox.layers.find((entry) => entry.id === layeredBoxLayerId);
    if (!boxLayer) continue;
    const section = boxLayer.sections.find((entry) => entry.id === sectionId);
    if (!section) continue;
    Object.assign(section, updates);
    autosave();
    return;
  }
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
  layer.boxes.push(box);
  project.selectedLayerId = layer.id;
  project.selectedBoxId = box.id;
  project.selectedTrayId = null;
  project.selectedBoardId = null;

  if (trayType !== 'empty') {
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
    box.trays.push(tray);
    project.selectedTrayId = tray.id;
  }

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
export type TrayType = 'counter' | 'cardDraw' | 'cardDivider' | 'cup' | 'cardWell' | 'card' | 'empty';

// Loose tray operations
export function addLooseTray(layerId?: string, trayType: TrayType = 'counter'): Tray | null {
  // Find the target layer
  const targetLayerId = layerId ?? project.selectedLayerId ?? project.layers[0]?.id;
  const layer = project.layers.find((l) => l.id === targetLayerId);
  if (!layer) return null;

  const trayNumber = layer.looseTrays.length + 1;
  const color = getNextTrayColor(project.layers);

  let tray: Tray;
  if (trayType === 'cardDraw' || trayType === 'card') {
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

      // Clear manual layout and custom dimensions so auto layout takes over
      box.manualLayout = undefined;
      box.customWidth = undefined;
      box.customDepth = undefined;

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
  gameContainerDepth: 256
};

// Global settings operations
export function getGlobalSettings(): { gameContainerWidth: number; gameContainerDepth: number } {
  // If project has explicit global settings, use those
  if (project.globalSettings) {
    return {
      gameContainerWidth: project.globalSettings.gameContainerWidth,
      gameContainerDepth: project.globalSettings.gameContainerDepth
    };
  }
  // Otherwise, try to get from existing counter tray
  for (const layer of project.layers) {
    for (const box of layer.boxes) {
      for (const tray of box.trays) {
        if (isCounterTray(tray)) {
          return {
            gameContainerWidth: tray.params.gameContainerWidth,
            gameContainerDepth: tray.params.gameContainerDepth
          };
        }
      }
    }
    for (const tray of layer.looseTrays) {
      if (isCounterTray(tray)) {
        return {
          gameContainerWidth: tray.params.gameContainerWidth,
          gameContainerDepth: tray.params.gameContainerDepth
        };
      }
    }
  }
  // Fall back to defaults
  return DEFAULT_GLOBAL_SETTINGS;
}

export function updateGlobalSettings(updates: { gameContainerWidth?: number; gameContainerDepth?: number }): void {
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

// Manual layout operations
import type { ManualTrayPlacement } from '$lib/types/project';

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
