/**
 * Web Worker for geometry generation
 * Runs JSCAD operations off the main thread to prevent UI freezing
 */

import {
  arrangeTrays,
  calculateTraySpacers,
  getBoxExteriorDimensions,
  getBoxVisibleAssembledHeight,
  getRequiredTrayHeightForLayer,
  getTrayDimensionsForTray,
  validateCustomDimensions,
  type TrayPlacement
} from '$lib/models/box';
import { createCardDividerTray, getCardDividerPositions } from '$lib/models/cardDividerTray';
import { createCardDrawTray, getCardDrawPositions } from '$lib/models/cardTray';
import { createCardWellTray, getCardWellPositions } from '$lib/models/cardWellTray';
import {
  createCounterTray,
  getCounterPositions,
  type CounterStack,
  type CustomCardSize
} from '$lib/models/counterTray';
import { createCupTray } from '$lib/models/cupTray';
import { createMiniatureRack, getMiniatureRackPreviewPositions } from '$lib/models/miniatureRack';
import {
  getLayeredBoxExteriorDimensions,
  getLayeredBoxRenderLayout
} from '$lib/models/layer';
import {
  createLayeredBoxInternalLayerAssemblyGeometry,
  createLayeredBoxSectionJscadGeometry
} from '$lib/models/layeredBoxGeometry';
import { createBoxWithLidGrooves, createLid, createLidTextInlay } from '$lib/models/lid';
import type { Box, CardSize, CounterShape, CupTray, Layer, LayeredBox, LayeredBoxSection, Tray } from '$lib/types/project';
import { isCardDividerTray, isCardTray, isCardWellTray, isCounterTray, isCupTray, isMiniatureRackTray } from '$lib/types/project';
import { sanitizeExportName } from '$lib/utils/exportNames';
import { cleanGeometryForExport } from '$lib/utils/exportGeometryCleanup';
import threemfSerializer from '@jscad/3mf-serializer';
import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import stlSerializer from '@jscad/stl-serializer';

const { geom3 } = jscad.geometries;

/**
 * Generate a tray letter based on cumulative index across all layers.
 * A-Z for first 26, then AA, BB, CC... for 26+
 */
function getTrayLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const letter = String.fromCharCode(65 + (index % 26));
  const repeat = Math.floor(index / 26) + 1;
  return letter.repeat(repeat);
}

/**
 * Get all boxes from all layers.
 */
function getAllBoxes(layers: Layer[]): Box[] {
  const boxes: Box[] = [];
  for (const layer of layers) {
    boxes.push(...layer.boxes);
  }
  return boxes;
}

function getAllLayeredBoxes(layers: Layer[]): LayeredBox[] {
  const layeredBoxes: LayeredBox[] = [];
  for (const layer of layers) {
    layeredBoxes.push(...(layer.layeredBoxes ?? []));
  }
  return layeredBoxes;
}

function createTrayFromLayeredBoxSection(section: LayeredBoxSection): Tray | null {
  const color = section.color ?? '#c9503c';

  if ((section.type === 'counter' || section.type === 'playerBoard') && section.counterParams) {
    return {
      id: section.id,
      type: 'counter',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.counterParams
    };
  }

  if (section.type === 'cardDraw' && section.cardDrawParams) {
    return {
      id: section.id,
      type: 'cardDraw',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardDrawParams
    };
  }

  if (section.type === 'cardDivider' && section.cardDividerParams) {
    return {
      id: section.id,
      type: 'cardDivider',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardDividerParams
    };
  }

  if (section.type === 'cardWell' && section.cardWellParams) {
    return {
      id: section.id,
      type: 'cardWell',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cardWellParams
    };
  }

  if (section.type === 'cup' && section.cupParams) {
    return {
      id: section.id,
      type: 'cup',
      name: section.name,
      color,
      rotationOverride: 'auto',
      params: section.cupParams
    };
  }

  return null;
}

function createSyntheticLayeredBoxBox(
  layeredBox: LayeredBox,
  layout: ReturnType<typeof getLayeredBoxRenderLayout>,
  cardSizes: CardSize[],
  counterShapes: CounterShape[]
): Box {
  const exteriorWidth =
    layeredBox.customWidth ??
    layout.width + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;
  const exteriorDepth =
    layeredBox.customDepth ??
    layout.depth + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;
  const boxBodyHeight =
    layeredBox.customBoxHeight ?? layout.height + layeredBox.floorThickness + layeredBox.tolerance;
  const interiorWidth = Math.max(exteriorWidth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2, 1);
  const interiorDepth = Math.max(exteriorDepth - layeredBox.wallThickness * 2 - layeredBox.tolerance * 2, 1);
  const interiorHeight = Math.max(boxBodyHeight - layeredBox.floorThickness, 0.1);
  const bottomInternalLayer = [...layout.internalLayers].sort((a, b) => a.z - b.z)[0];
  const bottomLayerPlacements = bottomInternalLayer
    ? layout.sections.filter((section) => section.internalLayerId === bottomInternalLayer.id)
    : [];
  const bottomLayerTrays = bottomLayerPlacements
    .map((placement) => {
      const tray = createTrayFromLayeredBoxSection(placement.section);
      if (!tray) return null;
      return { placement, tray };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (bottomLayerTrays.length > 0) {
    const manualLayout = bottomLayerTrays.map(({ placement, tray }) => {
      const trayDims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
      const rotated =
        Math.abs(trayDims.width - placement.dimensions.width) > 0.01 ||
        Math.abs(trayDims.depth - placement.dimensions.depth) > 0.01;

      return {
        trayId: tray.id,
        x: placement.x,
        y: placement.y,
        rotation: rotated ? 90 : 0
      } as const;
    });

    return {
      id: layeredBox.id,
      name: layeredBox.name,
      trays: bottomLayerTrays.map(({ tray }) => tray),
      tolerance: layeredBox.tolerance,
      wallThickness: layeredBox.wallThickness,
      floorThickness: layeredBox.floorThickness,
      lidParams: layeredBox.lidParams,
      customWidth: exteriorWidth,
      customDepth: exteriorDepth,
      customBoxHeight: boxBodyHeight,
      fillSolidEmpty: false,
      manualLayout
    };
  }

  const cavityTray: CupTray = {
    id: `${layeredBox.id}-cavity`,
    type: 'cup',
    name: `${layeredBox.name} cavity`,
    color: '#c9503c',
    params: {
      layout: {
        root: { type: 'cup', id: `${layeredBox.id}-cup` }
      },
      trayWidth: interiorWidth,
      trayDepth: interiorDepth,
      cupCavityHeight: interiorHeight,
      wallThickness: 0,
      floorThickness: 0,
      cornerRadius: 0
    }
  };

  return {
    id: layeredBox.id,
    name: layeredBox.name,
    trays: [cavityTray],
    tolerance: layeredBox.tolerance,
    wallThickness: layeredBox.wallThickness,
    floorThickness: layeredBox.floorThickness,
    lidParams: layeredBox.lidParams,
    customWidth: exteriorWidth,
    customDepth: exteriorDepth,
    customBoxHeight: boxBodyHeight,
    fillSolidEmpty: false
  };
}

/**
 * Get cumulative tray index across all layers.
 * Order: For each layer, count box trays first, then loose trays.
 */
function getCumulativeTrayIndexForTray(layers: Layer[], trayId: string): number {
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
 * Calculate unified layer height for a layer.
 * All items in a layer should have the same total height for proper stacking.
 *
 * The layer height is the maximum of:
 * - All box exterior heights (including floor, walls, lid groove)
 * - All loose tray content heights
 *
 * For loose trays to match box height, they are generated at the layer height.
 * For boxes to match a taller loose tray, their interior trays need to grow.
 */
function calculateUnifiedLayerHeight(layer: Layer, cardSizes: CardSize[], counterShapes: CounterShape[]): number {
  // Get all box exterior heights
  const boxHeights = layer.boxes.map((box) => {
    return getBoxVisibleAssembledHeight(box, cardSizes, counterShapes);
  });
  const layeredBoxHeights = layer.layeredBoxes.map((layeredBox) => {
    const dims = getLayeredBoxExteriorDimensions(layeredBox, cardSizes, counterShapes);
    return dims.height;
  });

  // Get all loose tray content heights
  const looseTrayHeights = layer.looseTrays.map((tray) => {
    const dims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
    return dims.height;
  });

  // Layer height = max of all items
  return Math.max(...boxHeights, ...layeredBoxHeights, ...looseTrayHeights, 0);
}

// Message types
interface GenerateMessage {
  type: 'generate';
  id: number;
  project: {
    name?: string;
    layers: Layer[];
    cardSizes?: CardSize[];
    counterShapes?: CounterShape[];
  };
  selectedBoxId: string;
  selectedTrayId: string;
}

interface ExportStlMessage {
  type: 'export-stl';
  id: number;
  target: 'tray' | 'box' | 'lid' | 'all-tray';
  trayIndex?: number; // For all-tray exports
}

interface ExportAllStlsMessage {
  type: 'export-all-stls';
  id: number;
}

interface Export3mfMessage {
  type: 'export-3mf';
  id: number;
}

type WorkerMessage = GenerateMessage | ExportStlMessage | ExportAllStlsMessage | Export3mfMessage;

// Geometry data to transfer back (raw arrays for BufferGeometry reconstruction)
interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
}

function createEmptyGeometryData(): GeometryData {
  return {
    positions: new Float32Array(0),
    normals: new Float32Array(0)
  };
}

interface TrayGeometryResult {
  trayId: string;
  name: string;
  color: string;
  geometry: GeometryData;
  placement: TrayPlacement;
  counterStacks: CounterStack[];
  trayLetter: string;
}

interface BoxGeometryResult {
  boxId: string;
  boxName: string;
  boxGeometry: GeometryData | null;
  lidGeometry: GeometryData | null;
  lidTextInlayGeometry?: GeometryData | null;
  trayGeometries: TrayGeometryResult[];
  boxDimensions: { width: number; depth: number; height: number };
}

interface LooseTrayGeometryResult {
  trayId: string;
  layerId: string;
  name: string;
  color: string;
  geometry: GeometryData;
  dimensions: { width: number; depth: number; height: number };
  counterStacks: CounterStack[];
  trayLetter: string;
}

interface GenerateResult {
  type: 'generate-result';
  id: number;
  selectedTrayGeometry: GeometryData;
  selectedTrayCounters: CounterStack[];
  allTrayGeometries: TrayGeometryResult[];
  boxGeometry: GeometryData | null;
  lidGeometry: GeometryData | null;
  allBoxGeometries: BoxGeometryResult[];
  allLooseTrayGeometries: LooseTrayGeometryResult[];
  error?: string;
}

interface ExportStlResult {
  type: 'export-stl-result';
  id: number;
  data: ArrayBuffer;
  filename: string;
  error?: string;
}

interface StlFile {
  filename: string;
  data: ArrayBuffer;
}

interface ExportAllStlsResult {
  type: 'export-all-stls-result';
  id: number;
  files: StlFile[];
  error?: string;
}

interface Export3mfResult {
  type: 'export-3mf-result';
  id: number;
  data: ArrayBuffer;
  filename: string;
  error?: string;
}

interface GenerationProgressMessage {
  type: 'generation-progress';
  id: number;
  current: number;
  total: number;
  currentItem: string;
}

// Cache the last generated JSCAD geometries for STL export
let cachedSelectedTray: Geom3 | null = null;
let cachedBox: Geom3 | null = null;
let cachedLid: Geom3 | null = null;
let cachedAllTrays: { jscadGeom: Geom3; name: string }[] = [];
let cachedBoxName = '';
let cachedProjectName = 'insertforge';

// Cache for all boxes (for export all)
interface CachedBoxData {
  boxName: string;
  boxGeom: Geom3 | null;
  lidGeom: Geom3 | null;
  lidTextInlayGeom: Geom3 | null;
  lidTextInlayColor?: [number, number, number, number];
  trays: { jscadGeom: Geom3; name: string }[];
  extraGeometries?: { jscadGeom: Geom3; name: string; groupKey?: string }[];
}
let cachedAllBoxes: CachedBoxData[] = [];

function hexToNormalizedRgba(hex: string): [number, number, number, number] {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const parsed = Number.parseInt(expanded, 16);
  if (Number.isNaN(parsed) || expanded.length !== 6) {
    return [1, 1, 1, 1];
  }
  return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255, 1];
}

function getContrastingRgba(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToNormalizedRgba(hex);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? [0.1, 0.1, 0.1, 1] : [0.98, 0.98, 0.98, 1];
}

// Cache for all loose trays (for export all)
interface CachedLooseTrayData {
  trayName: string;
  trayGeom: Geom3;
}
let cachedAllLooseTrays: CachedLooseTrayData[] = [];

/**
 * Create tray geometry based on tray type
 */
function createTrayGeometry(
  tray: Tray,
  cardSizes: CustomCardSize[],
  counterShapes: CounterShape[],
  maxHeight: number,
  spacerHeight: number
): Geom3 {
  const showEmboss = tray.showEmboss ?? true;
  if (isCupTray(tray)) {
    return createCupTray(tray.params, tray.name, maxHeight, spacerHeight, showEmboss);
  }
  if (isCardWellTray(tray)) {
    return createCardWellTray(tray.params, cardSizes, tray.name, maxHeight, spacerHeight, showEmboss);
  }
  if (isCardDividerTray(tray)) {
    const showStackLabels = tray.showStackLabels ?? true;
    return createCardDividerTray(
      tray.params,
      cardSizes,
      tray.name,
      maxHeight,
      spacerHeight,
      showEmboss,
      showStackLabels
    );
  }
  if (isCardTray(tray)) {
    return createCardDrawTray(tray.params, cardSizes, tray.name, maxHeight, spacerHeight, showEmboss);
  }
  if (isMiniatureRackTray(tray)) {
    return createMiniatureRack(tray.params, tray.name, maxHeight, showEmboss);
  }
  // Default to counter tray
  return createCounterTray(tray.params, counterShapes, tray.name, maxHeight, spacerHeight, showEmboss);
}

function getTrayTargetHeight(tray: Tray, naturalHeight: number, adjustedHeight: number): number {
  if (
    (isCounterTray(tray) || isCardDividerTray(tray) || isCardTray(tray) || isCardWellTray(tray) || isCupTray(tray)) &&
    tray.autoHeight === false
  ) {
    return naturalHeight;
  }
  return adjustedHeight;
}

function getTraySpacerHeight(tray: Tray, adjustedSpacerHeight: number): number {
  if (
    (isCounterTray(tray) || isCardDividerTray(tray) || isCardTray(tray) || isCardWellTray(tray) || isCupTray(tray)) &&
    tray.autoHeight === false
  ) {
    return 0;
  }
  return adjustedSpacerHeight;
}

function getBoxTargetLayerHeight(box: Box, layerHeight: number): number {
  if (box.autoHeight === false) {
    return 0;
  }
  return layerHeight;
}

/**
 * Get stack positions based on tray type (returns CounterStack[] for compatibility)
 */
function getTrayPositions(
  tray: Tray,
  cardSizes: CustomCardSize[],
  counterShapes: CounterShape[],
  maxHeight: number,
  spacerHeight: number
): CounterStack[] {
  if (isCupTray(tray)) {
    // Cup trays don't have counter previews - the cups themselves are the containers
    return [];
  }
  if (isMiniatureRackTray(tray)) {
    return getMiniatureRackPreviewPositions(tray.params);
  }
  if (isCardWellTray(tray)) {
    // Convert card well positions to CounterStack format for visualization
    const wellStacks = getCardWellPositions(tray.params, cardSizes, maxHeight, spacerHeight);
    return wellStacks.map((stack) => ({
      shape: 'custom' as const,
      customShapeName: stack.label,
      customBaseShape: 'rectangle' as const,
      x: stack.x,
      y: stack.y,
      z: stack.z,
      width: stack.width,
      length: stack.length,
      thickness: stack.thickness,
      count: stack.count,
      hexPointyTop: false,
      color: '#5588aa',
      innerWidth: stack.innerWidth,
      innerLength: stack.innerLength
    }));
  }
  if (isCardDividerTray(tray)) {
    // Convert CardDividerStackPosition to CounterStack format for visualization
    const dividerStacks = getCardDividerPositions(tray.params, cardSizes, maxHeight, spacerHeight);
    return dividerStacks.map((stack) => {
      // For card divider: cards stand on edge
      // vertical orientation: cards stand with long edge up (cardLength is height)
      // horizontal orientation: cards stand with short edge up (cardWidth is height)
      const isVertical = stack.orientation === 'vertical';

      // For vertical: standingHeight=cardLength, frontWidth=cardWidth
      // For horizontal: standingHeight=cardWidth, frontWidth=cardLength
      const standingHeight = isVertical ? stack.cardLength : stack.cardWidth;
      const frontWidth = isVertical ? stack.cardWidth : stack.cardLength;

      // getCardDividerPositions returns CENTER positions, but TrayScene expects:
      // - x to be the LEFT EDGE of the slot
      // - y to be the FRONT EDGE of the slot
      // Convert from center to edge positions
      const edgeX = stack.x - stack.slotWidth / 2;
      const edgeY = stack.y - stack.slotDepth / 2;

      return {
        shape: 'custom' as const,
        customShapeName: stack.label ?? 'Card',
        customBaseShape: 'rectangle' as const,
        x: edgeX,
        y: edgeY,
        z: stack.z,
        // For card dividers with crosswise orientation:
        // Box geometry args = [length, standingHeight, thickness]
        // length = X dimension (front-facing width of card)
        // width = not directly used, but set for consistency
        width: frontWidth,
        length: frontWidth,
        thickness: stack.cardThickness,
        count: stack.count,
        hexPointyTop: false,
        color: stack.color,
        // For card divider: cards are standing on edge
        isEdgeLoaded: true,
        edgeOrientation: 'crosswise' as const,
        slotWidth: stack.slotWidth,
        slotDepth: stack.slotDepth,
        // Mark as card divider so TrayScene uses cardDividerHeight for Y
        isCardDivider: true,
        cardDividerHeight: standingHeight
      };
    });
  }
  if (isCardTray(tray)) {
    // Convert CardStack to CounterStack format for visualization
    const cardStacks = getCardDrawPositions(tray.params, cardSizes, maxHeight, spacerHeight);
    return cardStacks.map((stack) => ({
      shape: 'custom' as const,
      customShapeName: 'Card',
      customBaseShape: 'rectangle' as const,
      x: stack.x,
      y: stack.y,
      z: stack.z,
      width: stack.width,
      length: stack.length,
      thickness: stack.thickness,
      count: stack.count,
      hexPointyTop: false,
      color: stack.color,
      slopeAngle: stack.slopeAngle,
      innerWidth: stack.innerWidth,
      innerLength: stack.innerLength
    }));
  }
  // Default to counter tray
  return getCounterPositions(tray.params, counterShapes, maxHeight, spacerHeight);
}

/**
 * Convert JSCAD geometry to raw position and normal arrays
 */
function jscadToArrays(jscadGeom: Geom3): GeometryData {
  const polygons = geom3.toPolygons(jscadGeom);

  const positions: number[] = [];
  const normals: number[] = [];

  for (const polygon of polygons) {
    const vertices = polygon.vertices;

    if (vertices.length < 3) continue;

    const v0 = vertices[0];
    const v1 = vertices[1];
    const v2 = vertices[2];

    const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];

    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (len > 0) {
      normal[0] /= len;
      normal[1] /= len;
      normal[2] /= len;
    }

    // Triangulate the polygon (fan triangulation)
    for (let i = 1; i < vertices.length - 1; i++) {
      positions.push(v0[0], v0[1], v0[2]);
      positions.push(vertices[i][0], vertices[i][1], vertices[i][2]);
      positions.push(vertices[i + 1][0], vertices[i + 1][1], vertices[i + 1][2]);

      normals.push(normal[0], normal[1], normal[2]);
      normals.push(normal[0], normal[1], normal[2]);
      normals.push(normal[0], normal[1], normal[2]);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals)
  };
}

/**
 * Find a box by ID across all layers
 */
function findBoxById(layers: Layer[], boxId: string): Box | undefined {
  for (const layer of layers) {
    const box = layer.boxes.find((b) => b.id === boxId);
    if (box) return box;
  }
  return undefined;
}

/**
 * Find a tray by ID across all layers (boxes and loose trays)
 */
function findTrayById(layers: Layer[], trayId: string): Tray | undefined {
  for (const layer of layers) {
    // Check boxes
    for (const box of layer.boxes) {
      const tray = box.trays.find((t) => t.id === trayId);
      if (tray) return tray;
    }
    // Check loose trays
    const looseTray = layer.looseTrays.find((t) => t.id === trayId);
    if (looseTray) return looseTray;
  }
  return undefined;
}

/**
 * Generate all geometries for the project
 */
function handleGenerate(msg: GenerateMessage): void {
  const { id, project, selectedBoxId, selectedTrayId } = msg;
  const timings: { name: string; ms: number }[] = [];
  const time = (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const elapsed = performance.now() - start;
    timings.push({ name, ms: elapsed });
  };

  try {
    cachedProjectName = sanitizeExportName(project.name ?? '', 'insertforge');
    const box = selectedBoxId ? findBoxById(project.layers, selectedBoxId) : undefined;
    const tray = selectedTrayId ? findTrayById(project.layers, selectedTrayId) : undefined;
    const isEmptySelectedBox = !!box && box.trays.length === 0 && !tray;

    // Get card sizes and counter shapes from project level (global)
    const cardSizes = project.cardSizes ?? [];
    const counterShapes = project.counterShapes ?? [];

    // Pre-calculate unified layer heights for all layers FIRST
    // All items in a layer should have the same total exterior height for proper stacking
    const layerHeights = new Map<string, number>();
    for (const layer of project.layers) {
      const layerHeight = calculateUnifiedLayerHeight(layer, cardSizes, counterShapes);
      layerHeights.set(layer.id, layerHeight);
    }

    // Helper to find which layer contains a box
    function findLayerForBox(boxId: string): Layer | undefined {
      return project.layers.find((layer) => layer.boxes.some((b) => b.id === boxId));
    }

    // Helper to find which layer contains a loose tray
    function findLayerForLooseTray(trayId: string): Layer | undefined {
      return project.layers.find((layer) => layer.looseTrays.some((t) => t.id === trayId));
    }

    // If tray is in a box, generate box-related geometry
    let selectedTrayGeometry: GeometryData = createEmptyGeometryData();
    let selectedTrayCounters: CounterStack[] = [];
    let allTrayGeometries: TrayGeometryResult[] = [];
    let boxGeometry: GeometryData | null = null;
    let lidGeometry: GeometryData | null = null;

    if (box) {
      // Validate custom dimensions
      const validation = validateCustomDimensions(box, cardSizes, counterShapes);
      if (!validation.valid) {
        self.postMessage({
          type: 'generate-result',
          id,
          error: validation.errors.join('; ')
        } as GenerateResult);
        return;
      }

      // Find the layer containing this box and get the unified layer height
      const selectedBoxLayer = findLayerForBox(box.id);
      const selectedLayerHeight = selectedBoxLayer ? (layerHeights.get(selectedBoxLayer.id) ?? 0) : 0;
      const selectedBoxTargetLayerHeight = getBoxTargetLayerHeight(box, selectedLayerHeight);

      // Calculate the required tray height to match the layer height
      const requiredTrayHeight = getRequiredTrayHeightForLayer(box, selectedBoxTargetLayerHeight);

      // Generate all trays with their placements for selected box
      const placements =
        box.trays.length === 0
          ? []
          : arrangeTrays(box.trays, {
              customBoxWidth: box.customWidth,
              customBoxDepth: box.customDepth,
              wallThickness: box.wallThickness,
              tolerance: box.tolerance,
              cardSizes,
              counterShapes,
              manualLayout: box.manualLayout
            });

      const spacerInfo = calculateTraySpacers(box, cardSizes, counterShapes);
      // Use the layer-adjusted tray height instead of natural height
      const naturalMaxHeight = Math.max(...placements.map((p) => p.dimensions.height));
      const maxHeight = selectedBoxTargetLayerHeight > 0 ? requiredTrayHeight : naturalMaxHeight;

      if (tray) {
        const selectedSpacer = spacerInfo.find((s) => s.trayId === tray.id);
        const selectedNaturalHeight = getTrayDimensionsForTray(tray, cardSizes, counterShapes).height;
        const selectedTargetHeight = getTrayTargetHeight(tray, selectedNaturalHeight, maxHeight);
        const selectedSpacerHeight = getTraySpacerHeight(tray, selectedSpacer?.floorSpacerHeight ?? 0);
        cachedSelectedTray = createTrayGeometry(tray, cardSizes, counterShapes, selectedTargetHeight, selectedSpacerHeight);
        selectedTrayGeometry = jscadToArrays(cachedSelectedTray);
        selectedTrayCounters = getTrayPositions(tray, cardSizes, counterShapes, selectedTargetHeight, selectedSpacerHeight);
      }

      // Generate all trays for selected box
      cachedAllTrays = [];
      allTrayGeometries = placements.map((placement) => {
        const spacer = spacerInfo.find((s) => s.trayId === placement.tray.id);
        const trayTargetHeight = getTrayTargetHeight(placement.tray, placement.dimensions.height, maxHeight);
        const spacerHeight = getTraySpacerHeight(placement.tray, spacer?.floorSpacerHeight ?? 0);
        let jscadGeom!: Geom3;
        time(`createTray (${placement.tray.name})`, () => {
          jscadGeom = createTrayGeometry(placement.tray, cardSizes, counterShapes, trayTargetHeight, spacerHeight);
        });

        cachedAllTrays.push({ jscadGeom, name: placement.tray.name });

        return {
          trayId: placement.tray.id,
          name: placement.tray.name,
          color: placement.tray.color,
          geometry: jscadToArrays(jscadGeom),
          placement: {
            ...placement,
            dimensions: {
              ...placement.dimensions,
              height: trayTargetHeight
            }
          },
          counterStacks: getTrayPositions(placement.tray, cardSizes, counterShapes, trayTargetHeight, spacerHeight),
          trayLetter: getTrayLetter(getCumulativeTrayIndexForTray(project.layers, placement.tray.id))
        };
      });

      // Generate box and lid - pass layer height so box exterior matches layer
      time(`createBoxWithLidGrooves (${box.name})`, () => {
        cachedBox = createBoxWithLidGrooves(box, cardSizes, counterShapes, selectedBoxTargetLayerHeight);
      });
      time(`createLid (${box.name})`, () => {
        cachedLid = createLid(box, cardSizes, counterShapes);
      });
      cachedBoxName = box.name;

      boxGeometry = cachedBox ? jscadToArrays(cachedBox) : null;
      lidGeometry = cachedLid ? jscadToArrays(cachedLid) : null;
    } else if (tray) {
      // Loose tray - no box context
      // Find the layer containing this loose tray and get the unified layer height
      const looseTrayLayer = findLayerForLooseTray(tray.id);
      const looseTrayLayerHeight = looseTrayLayer ? (layerHeights.get(looseTrayLayer.id) ?? 0) : 0;

      // Calculate tray dimensions for proper sizing
      const trayDims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
      const naturalHeight = trayDims.height;
      // Use layer height if available, otherwise use natural height
      const adjustedHeight = looseTrayLayerHeight > 0 ? looseTrayLayerHeight : naturalHeight;
      const maxHeight = getTrayTargetHeight(tray, naturalHeight, adjustedHeight);
      const spacerHeight = 0; // No spacer for loose trays

      // Generate standalone tray
      cachedSelectedTray = createTrayGeometry(tray, cardSizes, counterShapes, maxHeight, spacerHeight);
      selectedTrayGeometry = jscadToArrays(cachedSelectedTray);
      selectedTrayCounters = getTrayPositions(tray, cardSizes, counterShapes, maxHeight, spacerHeight);

      cachedAllTrays = [{ jscadGeom: cachedSelectedTray, name: tray.name }];
      cachedBox = null;
      cachedLid = null;
      cachedBoxName = '';

      // Add the loose tray to allTrayGeometries with proper dimensions
      allTrayGeometries = [
        {
          trayId: tray.id,
          name: tray.name,
          color: tray.color,
          geometry: selectedTrayGeometry,
          placement: {
            tray,
            x: 0,
            y: 0,
            rotated: false,
            dimensions: { width: trayDims.width, depth: trayDims.depth, height: maxHeight }
          },
          counterStacks: selectedTrayCounters,
          trayLetter: getTrayLetter(getCumulativeTrayIndexForTray(project.layers, tray.id))
        }
      ];
    } else {
      cachedSelectedTray = null;
      cachedAllTrays = [];
      cachedBox = null;
      cachedLid = null;
      cachedBoxName = '';
    }

    // Get all boxes from all layers
    const allBoxes = getAllBoxes(project.layers);
    const allLayeredBoxes = getAllLayeredBoxes(project.layers);

    // Count all loose trays for progress tracking
    const allLooseTrays = project.layers.flatMap((layer) => layer.looseTrays);
    const totalOperations = allBoxes.length + allLayeredBoxes.length + allLooseTrays.length;
    let currentOperation = 0;

    // Generate geometries for ALL boxes (for all-no-lid view) and cache JSCAD for STL export
    cachedAllBoxes = [];
    const allBoxGeometries: BoxGeometryResult[] = [];

    for (const projectBox of allBoxes) {
      // Send progress update
      currentOperation++;
      self.postMessage({
        type: 'generation-progress',
        id,
        current: currentOperation,
        total: totalOperations,
        currentItem: projectBox.name
      } as GenerationProgressMessage);
      const boxValidation = validateCustomDimensions(projectBox, cardSizes, counterShapes);
      if (!boxValidation.valid) {
        console.warn(`Box "${projectBox.name}" validation failed:`, boxValidation.errors);
      }

      // Find this box's layer and get the unified layer height
      const boxLayer = findLayerForBox(projectBox.id);
      const layerHeight = boxLayer ? (layerHeights.get(boxLayer.id) ?? 0) : 0;
      const boxTargetLayerHeight = getBoxTargetLayerHeight(projectBox, layerHeight);

      // Calculate the required tray height to match the layer height
      // This ensures all boxes in a layer have the same exterior height
      const requiredTrayHeight = getRequiredTrayHeightForLayer(projectBox, boxTargetLayerHeight);

      // Generate box and lid - pass target height for box to match layer height
      let boxJscad: Geom3 | null = null;
      let lidJscad: Geom3 | null = null;
      let lidTextInlayJscad: Geom3 | null = null;
      time(`createBoxWithLidGrooves (${projectBox.name})`, () => {
        boxJscad = createBoxWithLidGrooves(projectBox, cardSizes, counterShapes, boxTargetLayerHeight);
      });
      const boxBufferGeom = boxJscad ? jscadToArrays(boxJscad) : null;
      // Lid dimensions are fixed (2x wall thickness) and don't depend on layer height
      time(`createLid (${projectBox.name})`, () => {
        lidJscad = createLid(projectBox, cardSizes, counterShapes);
      });
      time(`createLidTextInlay (${projectBox.name})`, () => {
        lidTextInlayJscad = createLidTextInlay(projectBox, cardSizes, counterShapes);
      });
      const lidBufferGeom = lidJscad ? jscadToArrays(lidJscad) : null;

      // Use the global cardSizes and counterShapes
      const boxPlacements = arrangeTrays(projectBox.trays, {
        customBoxWidth: projectBox.customWidth,
        customBoxDepth: projectBox.customDepth,
        wallThickness: projectBox.wallThickness,
        tolerance: projectBox.tolerance,
        cardSizes,
        counterShapes,
        manualLayout: projectBox.manualLayout
      });

      const boxSpacerInfo = calculateTraySpacers(projectBox, cardSizes, counterShapes);
      // Use the required tray height from layer calculation, not just the box's natural height
      const naturalTrayHeights = boxPlacements.map((p) => p.dimensions.height);
      const maxNaturalTrayHeight = Math.max(...naturalTrayHeights, 0);
      const boxMaxHeight = boxTargetLayerHeight > 0 ? Math.max(requiredTrayHeight, maxNaturalTrayHeight) : maxNaturalTrayHeight;

      // Cache JSCAD geometries for this box's trays
      const cachedTraysForBox: { jscadGeom: Geom3; name: string }[] = [];

      const trayGeoms: TrayGeometryResult[] = boxPlacements.map((placement) => {
        const spacer = boxSpacerInfo.find((s) => s.trayId === placement.tray.id);
        const trayTargetHeight = getTrayTargetHeight(placement.tray, placement.dimensions.height, boxMaxHeight);
        const spacerHeight = getTraySpacerHeight(placement.tray, spacer?.floorSpacerHeight ?? 0);
        const jscadGeom = createTrayGeometry(placement.tray, cardSizes, counterShapes, trayTargetHeight, spacerHeight);

        // Cache for STL export
        cachedTraysForBox.push({ jscadGeom, name: placement.tray.name });

        return {
          trayId: placement.tray.id,
          name: placement.tray.name,
          color: placement.tray.color,
          geometry: jscadToArrays(jscadGeom),
          placement: {
            ...placement,
            dimensions: {
              ...placement.dimensions,
              height: trayTargetHeight
            }
          },
          counterStacks: getTrayPositions(placement.tray, cardSizes, counterShapes, trayTargetHeight, spacerHeight),
          trayLetter: getTrayLetter(getCumulativeTrayIndexForTray(project.layers, placement.tray.id))
        };
      });

      // Cache this box's JSCAD geometries for export
      cachedAllBoxes.push({
        boxName: projectBox.name,
        boxGeom: boxJscad,
        lidGeom: lidJscad,
        lidTextInlayGeom: lidTextInlayJscad,
        lidTextInlayColor: lidTextInlayJscad ? getContrastingRgba('#2a2a2a') : undefined,
        trays: cachedTraysForBox
      });

      const boxHeight = boxTargetLayerHeight > 0 ? layerHeight : getBoxVisibleAssembledHeight(projectBox, cardSizes, counterShapes);

      // Add box dimensions using the effective height used for geometry
      allBoxGeometries.push({
        boxId: projectBox.id,
        boxName: projectBox.name,
        boxGeometry: boxBufferGeom,
        lidGeometry: lidBufferGeom,
        lidTextInlayGeometry: lidTextInlayJscad ? jscadToArrays(lidTextInlayJscad) : null,
        trayGeometries: trayGeoms,
        boxDimensions: { width: projectBox.customWidth ?? 0, depth: projectBox.customDepth ?? 0, height: boxHeight }
      });
    }

    for (const layeredBox of allLayeredBoxes) {
      currentOperation++;
      self.postMessage({
        type: 'generation-progress',
        id,
        current: currentOperation,
        total: totalOperations,
        currentItem: layeredBox.name
      } as GenerationProgressMessage);

      const layout = getLayeredBoxRenderLayout(layeredBox, cardSizes, counterShapes);
      const exterior = getLayeredBoxExteriorDimensions(layeredBox, cardSizes, counterShapes);
      const syntheticBox = createSyntheticLayeredBoxBox(layeredBox, layout, cardSizes, counterShapes);

      let boxJscad: Geom3 | null = null;
      let lidJscad: Geom3 | null = null;
      let lidTextInlayJscad: Geom3 | null = null;
      time(`createBoxWithLidGrooves (${layeredBox.name})`, () => {
        boxJscad = createBoxWithLidGrooves(syntheticBox, cardSizes, counterShapes, exterior.bodyHeight);
      });
      time(`createLid (${layeredBox.name})`, () => {
        lidJscad = createLid(syntheticBox, cardSizes, counterShapes);
      });
      time(`createLidTextInlay (${layeredBox.name})`, () => {
        lidTextInlayJscad = createLidTextInlay(syntheticBox, cardSizes, counterShapes);
      });
      const cachedTraysForBox: { jscadGeom: Geom3; name: string }[] = [];
      const extraGeometries: { jscadGeom: Geom3; name: string; groupKey?: string }[] = [];
      const sectionGeometryMap = new Map<string, Geom3>();
      const sectionReliefGeometryMap = new Map<string, Geom3>();
      const fillSolidLayerIds = new Set(
        layeredBox.layers.filter((layer) => layer.fillSolidEmpty ?? true).map((layer) => layer.id)
      );

      for (const placement of layout.sections) {
        const tray = createTrayFromLayeredBoxSection(placement.section);
        if (!tray) continue;
        const jscadGeom =
          createLayeredBoxSectionJscadGeometry(placement, cardSizes, counterShapes, placement.dimensions.height) ??
          createTrayGeometry(tray, cardSizes, counterShapes, placement.dimensions.height, 0);
        sectionGeometryMap.set(placement.section.id, jscadGeom);
        sectionReliefGeometryMap.set(placement.section.id, jscadGeom);

        if (!fillSolidLayerIds.has(placement.internalLayerId)) {
          cachedTraysForBox.push({ jscadGeom, name: placement.section.name });
        }
      }

      for (const internalLayer of layout.internalLayers) {
        if (!fillSolidLayerIds.has(internalLayer.id)) continue;
        const layerSections = layout.sections.filter((section) => section.internalLayerId === internalLayer.id);
        if (layerSections.length === 0) continue;
        const sourceLayer = layeredBox.layers.find((layer) => layer.id === internalLayer.id);
        const assemblyGeometry = createLayeredBoxInternalLayerAssemblyGeometry({
          internalLayer,
          layerSections,
          sourceLayer,
          sectionGeometryMap,
          sectionReliefGeometryMap
        });
        if (!assemblyGeometry) continue;
        const layerName = sanitizeExportName(sourceLayer?.name ?? internalLayer.id);
        extraGeometries.push({
          jscadGeom: assemblyGeometry,
          name: `${layeredBox.name} ${sourceLayer?.name ?? internalLayer.id}`,
          groupKey: `${sanitizeExportName(layeredBox.name, 'layered-box')}-${layerName}-assembly`
        });
      }

      cachedAllBoxes.push({
        boxName: layeredBox.name,
        boxGeom: boxJscad,
        lidGeom: lidJscad,
        lidTextInlayGeom: lidTextInlayJscad,
        lidTextInlayColor: lidTextInlayJscad ? getContrastingRgba('#2a2a2a') : undefined,
        trays: cachedTraysForBox,
        extraGeometries
      });
    }

    // Generate geometries for all loose trays across all layers
    cachedAllLooseTrays = [];
    const allLooseTrayGeometries: LooseTrayGeometryResult[] = [];

    for (const layer of project.layers) {
      // Get the unified layer height - loose trays match box exterior height
      const layerHeight = layerHeights.get(layer.id) ?? 0;

      for (const looseTray of layer.looseTrays) {
        // Send progress update
        currentOperation++;
        self.postMessage({
          type: 'generation-progress',
          id,
          current: currentOperation,
          total: totalOperations,
          currentItem: looseTray.name
        } as GenerationProgressMessage);

        // Calculate tray dimensions for width/depth
        const trayDims = getTrayDimensionsForTray(looseTray, cardSizes, counterShapes);
        // Use layer height for the tray height so loose trays match box exterior height
        const adjustedHeight = layerHeight > 0 ? layerHeight : trayDims.height;
        const maxHeight = getTrayTargetHeight(looseTray, trayDims.height, adjustedHeight);
        const spacerHeight = 0; // No spacer for loose trays

        // Generate tray geometry at the layer height
        const jscadGeom = createTrayGeometry(looseTray, cardSizes, counterShapes, maxHeight, spacerHeight);

        // Cache for STL export
        cachedAllLooseTrays.push({
          trayName: looseTray.name,
          trayGeom: jscadGeom
        });

        // Add to result
        allLooseTrayGeometries.push({
          trayId: looseTray.id,
          layerId: layer.id,
          name: looseTray.name,
          color: looseTray.color,
          geometry: jscadToArrays(jscadGeom),
          dimensions: { width: trayDims.width, depth: trayDims.depth, height: maxHeight },
          counterStacks: getTrayPositions(looseTray, cardSizes, counterShapes, maxHeight, spacerHeight),
          trayLetter: getTrayLetter(getCumulativeTrayIndexForTray(project.layers, looseTray.id))
        });
      }
    }

    // Collect all transferable arrays (use Set to avoid duplicates when same geometry is referenced multiple times)
    const transferableSet = new Set<ArrayBuffer>();

    transferableSet.add(selectedTrayGeometry.positions.buffer as ArrayBuffer);
    transferableSet.add(selectedTrayGeometry.normals.buffer as ArrayBuffer);

    for (const tray of allTrayGeometries) {
      transferableSet.add(tray.geometry.positions.buffer as ArrayBuffer);
      transferableSet.add(tray.geometry.normals.buffer as ArrayBuffer);
    }

    if (boxGeometry) {
      transferableSet.add(boxGeometry.positions.buffer as ArrayBuffer);
      transferableSet.add(boxGeometry.normals.buffer as ArrayBuffer);
    }

    if (lidGeometry) {
      transferableSet.add(lidGeometry.positions.buffer as ArrayBuffer);
      transferableSet.add(lidGeometry.normals.buffer as ArrayBuffer);
    }

    for (const boxData of allBoxGeometries) {
      if (boxData.boxGeometry) {
        transferableSet.add(boxData.boxGeometry.positions.buffer as ArrayBuffer);
        transferableSet.add(boxData.boxGeometry.normals.buffer as ArrayBuffer);
      }
      if (boxData.lidGeometry) {
        transferableSet.add(boxData.lidGeometry.positions.buffer as ArrayBuffer);
        transferableSet.add(boxData.lidGeometry.normals.buffer as ArrayBuffer);
      }
      if (boxData.lidTextInlayGeometry) {
        transferableSet.add(boxData.lidTextInlayGeometry.positions.buffer as ArrayBuffer);
        transferableSet.add(boxData.lidTextInlayGeometry.normals.buffer as ArrayBuffer);
      }
      for (const tray of boxData.trayGeometries) {
        transferableSet.add(tray.geometry.positions.buffer as ArrayBuffer);
        transferableSet.add(tray.geometry.normals.buffer as ArrayBuffer);
      }
    }

    // Add loose tray geometry transferables
    for (const looseTray of allLooseTrayGeometries) {
      transferableSet.add(looseTray.geometry.positions.buffer as ArrayBuffer);
      transferableSet.add(looseTray.geometry.normals.buffer as ArrayBuffer);
    }

    const transferables: Transferable[] = Array.from(transferableSet);

    // Log performance timings
    if (timings.length > 0) {
      const totalMs = timings.reduce((sum, t) => sum + t.ms, 0);
      console.group(`[Geometry Worker] Generation complete (${totalMs.toFixed(0)}ms total)`);
      // Sort by time descending to show slowest first
      const sorted = [...timings].sort((a, b) => b.ms - a.ms);
      for (const t of sorted) {
        const pct = ((t.ms / totalMs) * 100).toFixed(1);
        console.log(`${t.ms.toFixed(0)}ms (${pct}%) - ${t.name}`);
      }
      console.groupEnd();
    }

    const result: GenerateResult = {
      type: 'generate-result',
      id,
      selectedTrayGeometry,
      selectedTrayCounters,
      allTrayGeometries,
      boxGeometry,
      lidGeometry,
      allBoxGeometries,
      allLooseTrayGeometries
    };

    self.postMessage(result, { transfer: transferables });
  } catch (e) {
    self.postMessage({
      type: 'generate-result',
      id,
      error: e instanceof Error ? e.message : 'Unknown error'
    } as GenerateResult);
  }
}

/**
 * Export geometry to STL
 */
function handleExportStl(msg: ExportStlMessage): void {
  const { id, target, trayIndex } = msg;

  try {
    let geom: Geom3 | null = null;
    let filename = 'export.stl';

    switch (target) {
      case 'tray':
        geom = cachedSelectedTray;
        filename = 'tray.stl';
        break;
      case 'box':
        geom = cachedBox;
        filename = `${sanitizeExportName(cachedBoxName, 'box')}-box.stl`;
        break;
      case 'lid':
        geom = cachedLid;
        filename = `${sanitizeExportName(cachedBoxName, 'box')}-lid.stl`;
        break;
      case 'all-tray':
        if (trayIndex !== undefined && cachedAllTrays[trayIndex]) {
          geom = cachedAllTrays[trayIndex].jscadGeom;
          filename = `${sanitizeExportName(cachedBoxName, 'box')}-${sanitizeExportName(cachedAllTrays[trayIndex].name)}.stl`;
        }
        break;
    }

    if (!geom) {
      self.postMessage({
        type: 'export-stl-result',
        id,
        error: 'No geometry available for export'
      } as ExportStlResult);
      return;
    }

    const cleanedGeom = cleanGeometryForExport(geom);
    const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
    const blob = new Blob(stlData, { type: 'application/octet-stream' });

    // Convert blob to ArrayBuffer
    blob
      .arrayBuffer()
      .then((buffer) => {
        self.postMessage(
          {
            type: 'export-stl-result',
            id,
            data: buffer,
            filename
          } as ExportStlResult,
          { transfer: [buffer] }
        );
      })
      .catch((e) => {
        self.postMessage({
          type: 'export-stl-result',
          id,
          error: e instanceof Error ? e.message : 'Failed to convert STL data'
        } as ExportStlResult);
      });
  } catch (e) {
    self.postMessage({
      type: 'export-stl-result',
      id,
      error: e instanceof Error ? e.message : 'Unknown error'
    } as ExportStlResult);
  }
}

/**
 * Get a unique filename by appending a number suffix if needed
 */
function getUniqueFilename(baseFilename: string, usedFilenames: Set<string>): string {
  if (!usedFilenames.has(baseFilename)) {
    usedFilenames.add(baseFilename);
    return baseFilename;
  }

  // Extract the name and extension
  const lastDotIndex = baseFilename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? baseFilename.slice(0, lastDotIndex) : baseFilename;
  const ext = lastDotIndex > 0 ? baseFilename.slice(lastDotIndex) : '';

  // Find a unique number suffix
  let counter = 2;
  let uniqueFilename = `${name}-${counter}${ext}`;
  while (usedFilenames.has(uniqueFilename)) {
    counter++;
    uniqueFilename = `${name}-${counter}${ext}`;
  }

  usedFilenames.add(uniqueFilename);
  return uniqueFilename;
}

/**
 * Export all STLs for all boxes
 */
async function handleExportAllStls(msg: ExportAllStlsMessage): Promise<void> {
  const { id } = msg;

  try {
    if (cachedAllBoxes.length === 0 && cachedAllLooseTrays.length === 0) {
      self.postMessage({
        type: 'export-all-stls-result',
        id,
        files: [],
        error: 'No geometry available for export. Please generate geometry first.'
      } as ExportAllStlsResult);
      return;
    }

    const files: StlFile[] = [];
    const transferables: ArrayBuffer[] = [];
    const usedFilenames = new Set<string>();

    // Export boxes and their contents
    for (const boxData of cachedAllBoxes) {
      const boxPrefix = sanitizeExportName(boxData.boxName, 'box');

      // Export box
      if (boxData.boxGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.boxGeom);
        const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
        const blob = new Blob(stlData, { type: 'application/octet-stream' });
        const buffer = await blob.arrayBuffer();
        const filename = getUniqueFilename(`${boxPrefix}-box.stl`, usedFilenames);
        files.push({ filename, data: buffer });
        transferables.push(buffer);
      }

      // Export lid
      if (boxData.lidGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.lidGeom);
        const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
        const blob = new Blob(stlData, { type: 'application/octet-stream' });
        const buffer = await blob.arrayBuffer();
        const filename = getUniqueFilename(`${boxPrefix}-lid.stl`, usedFilenames);
        files.push({ filename, data: buffer });
        transferables.push(buffer);
      }

      if (boxData.lidTextInlayGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.lidTextInlayGeom);
        const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
        const blob = new Blob(stlData, { type: 'application/octet-stream' });
        const buffer = await blob.arrayBuffer();
        const filename = getUniqueFilename(`${boxPrefix}-lid-text-inlay.stl`, usedFilenames);
        files.push({ filename, data: buffer });
        transferables.push(buffer);
      }

      // Export trays in boxes
      for (const tray of boxData.trays) {
        const cleanedGeom = cleanGeometryForExport(tray.jscadGeom);
        const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
        const blob = new Blob(stlData, { type: 'application/octet-stream' });
        const buffer = await blob.arrayBuffer();
        const trayName = sanitizeExportName(tray.name);
        const filename = getUniqueFilename(`${boxPrefix}-${trayName}.stl`, usedFilenames);
        files.push({ filename, data: buffer });
        transferables.push(buffer);
      }

      for (const geometry of boxData.extraGeometries ?? []) {
        const cleanedGeom = cleanGeometryForExport(geometry.jscadGeom);
        const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
        const blob = new Blob(stlData, { type: 'application/octet-stream' });
        const buffer = await blob.arrayBuffer();
        const geometryName = sanitizeExportName(geometry.name);
        const filename = getUniqueFilename(`${boxPrefix}-${geometryName}.stl`, usedFilenames);
        files.push({ filename, data: buffer });
        transferables.push(buffer);
      }
    }

    // Export loose trays
    for (const looseTray of cachedAllLooseTrays) {
      const cleanedGeom = cleanGeometryForExport(looseTray.trayGeom);
      const stlData = stlSerializer.serialize({ binary: true }, cleanedGeom);
      const blob = new Blob(stlData, { type: 'application/octet-stream' });
      const buffer = await blob.arrayBuffer();
      const trayName = sanitizeExportName(looseTray.trayName);
      const filename = getUniqueFilename(`${trayName}.stl`, usedFilenames);
      files.push({ filename, data: buffer });
      transferables.push(buffer);
    }

    self.postMessage(
      {
        type: 'export-all-stls-result',
        id,
        files
      } as ExportAllStlsResult,
      { transfer: transferables }
    );
  } catch (e) {
    self.postMessage({
      type: 'export-all-stls-result',
      id,
      files: [],
      error: e instanceof Error ? e.message : 'Unknown error during export'
    } as ExportAllStlsResult);
  }
}

/**
 * Export all geometries to a single 3MF file
 * 3MF supports multiple objects in a single file with names and colors
 */
async function handleExport3mf(msg: Export3mfMessage): Promise<void> {
  const { id } = msg;

  try {
    if (cachedAllBoxes.length === 0 && cachedAllLooseTrays.length === 0) {
      self.postMessage({
        type: 'export-3mf-result',
        id,
        data: new ArrayBuffer(0),
        filename: '',
        error: 'No geometry available for export. Please generate geometry first.'
      } as Export3mfResult);
      return;
    }

    // Collect all geometries with their names and bounds
    const namedGeometries: { geom: Geom3; name: string; groupKey?: string }[] = [];
    const usedNames = new Set<string>();

    // Helper to get unique name (reusing the same pattern as getUniqueFilename but without extension)
    const getUniqueName = (baseName: string): string => {
      if (!usedNames.has(baseName)) {
        usedNames.add(baseName);
        return baseName;
      }
      let counter = 2;
      let uniqueName = `${baseName}-${counter}`;
      while (usedNames.has(uniqueName)) {
        counter++;
        uniqueName = `${baseName}-${counter}`;
      }
      usedNames.add(uniqueName);
      return uniqueName;
    };

    // Add boxes and their contents
    for (const boxData of cachedAllBoxes) {
      const boxPrefix = sanitizeExportName(boxData.boxName, 'box');

      // Add box
      if (boxData.boxGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.boxGeom);
        namedGeometries.push({ geom: cleanedGeom, name: getUniqueName(`${boxPrefix}-box`) });
      }

      // Add lid
      if (boxData.lidGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.lidGeom);
        namedGeometries.push({
          geom: cleanedGeom,
          name: getUniqueName(`${boxPrefix}-lid`),
          groupKey: `${boxPrefix}-lid`
        });
      }

      if (boxData.lidTextInlayGeom) {
        const cleanedGeom = cleanGeometryForExport(boxData.lidTextInlayGeom);
        (cleanedGeom as Geom3 & { color?: [number, number, number, number] }).color =
          boxData.lidTextInlayColor ?? [0.98, 0.98, 0.98, 1];
        namedGeometries.push({
          geom: cleanedGeom,
          name: getUniqueName(`${boxPrefix}-lid-text-inlay`),
          groupKey: `${boxPrefix}-lid`
        });
      }

      // Add trays in boxes
      for (const tray of boxData.trays) {
        const cleanedGeom = cleanGeometryForExport(tray.jscadGeom);
        const trayName = sanitizeExportName(tray.name);
        namedGeometries.push({
          geom: cleanedGeom,
          name: getUniqueName(`${boxPrefix}-${trayName}`)
        });
      }

      for (const geometry of boxData.extraGeometries ?? []) {
        const cleanedGeom = cleanGeometryForExport(geometry.jscadGeom);
        const geometryName = sanitizeExportName(geometry.name);
        namedGeometries.push({
          geom: cleanedGeom,
          name: getUniqueName(`${boxPrefix}-${geometryName}`),
          groupKey: geometry.groupKey
        });
      }
    }

    // Add loose trays
    for (const looseTray of cachedAllLooseTrays) {
      const cleanedGeom = cleanGeometryForExport(looseTray.trayGeom);
      const trayName = sanitizeExportName(looseTray.trayName);
      namedGeometries.push({
        geom: cleanedGeom,
        name: getUniqueName(trayName)
      });
    }

    if (namedGeometries.length === 0) {
      self.postMessage({
        type: 'export-3mf-result',
        id,
        data: new ArrayBuffer(0),
        filename: '',
        error: 'No geometry available for export'
      } as Export3mfResult);
      return;
    }

    // Arrange geometries in a grid layout so they don't overlap
    const spacing = 10; // mm between objects
    const { translate } = jscad.transforms;
    const { measureBoundingBox } = jscad.measurements;

    // Calculate bounds for each geometry and arrange in rows
    let currentX = 0;
    let currentY = 0;
    let rowMaxDepth = 0;
    const maxRowWidth = 300;
    const arrangedGeometries: Geom3[] = [];
    const groupedGeometries = new Map<string, { geom: Geom3; name: string }[]>();
    const ungroupedGeometries: { geom: Geom3; name: string }[] = [];

    for (const { geom, name, groupKey } of namedGeometries) {
      if (groupKey) {
        const group = groupedGeometries.get(groupKey) ?? [];
        group.push({ geom, name });
        groupedGeometries.set(groupKey, group);
      } else {
        ungroupedGeometries.push({ geom, name });
      }
    }

    const arrangedItems = [
      ...Array.from(groupedGeometries.values()).map((items) => ({ items })),
      ...ungroupedGeometries.map((item) => ({ items: [item] }))
    ];

    for (const { items } of arrangedItems) {
      const boundsList = items.map(({ geom }) => measureBoundingBox(geom));
      const groupMinX = Math.min(...boundsList.map((bounds) => bounds[0][0]));
      const groupMinY = Math.min(...boundsList.map((bounds) => bounds[0][1]));
      const groupMinZ = Math.min(...boundsList.map((bounds) => bounds[0][2]));
      const groupMaxX = Math.max(...boundsList.map((bounds) => bounds[1][0]));
      const groupMaxY = Math.max(...boundsList.map((bounds) => bounds[1][1]));
      const width = groupMaxX - groupMinX;
      const depth = groupMaxY - groupMinY;

      if (currentX > 0 && currentX + width > maxRowWidth) {
        currentX = 0;
        currentY += rowMaxDepth + spacing;
        rowMaxDepth = 0;
      }

      const offsetX = currentX - groupMinX;
      const offsetY = currentY - groupMinY;

      for (const { geom, name } of items) {
        const translatedGeom = translate([offsetX, offsetY, -groupMinZ], geom);
        (translatedGeom as Geom3 & { name?: string }).name = name;
        arrangedGeometries.push(translatedGeom);
      }

      currentX += width + spacing;
      rowMaxDepth = Math.max(rowMaxDepth, depth);
    }

    // Serialize all geometries to a single 3MF file
    const threemfData = threemfSerializer.serialize(
      {
        unit: 'millimeter',
        metadata: true,
        compress: true // This creates a proper 3MF ZIP package
      },
      ...arrangedGeometries
    );

    const blob = new Blob(threemfData, {
      type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
    });
    const buffer = await blob.arrayBuffer();

    self.postMessage(
      {
        type: 'export-3mf-result',
        id,
        data: buffer,
        filename: `${cachedProjectName}.3mf`
      } as Export3mfResult,
      { transfer: [buffer] }
    );
  } catch (e) {
    self.postMessage({
      type: 'export-3mf-result',
      id,
      data: new ArrayBuffer(0),
      filename: '',
      error: e instanceof Error ? e.message : 'Unknown error during 3MF export'
    } as Export3mfResult);
  }
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'generate':
      handleGenerate(msg);
      break;
    case 'export-stl':
      handleExportStl(msg);
      break;
    case 'export-all-stls':
      handleExportAllStls(msg);
      break;
    case 'export-3mf':
      handleExport3mf(msg);
      break;
  }
};
