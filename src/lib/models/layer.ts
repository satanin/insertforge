/**
 * Layer model - handles arrangement and height calculation for layers
 * A layer contains boxes (with trays inside) and loose trays (not in boxes)
 */

import type {
  Board,
  Box,
  CardSize,
  CounterShape,
  Layer,
  LayeredBox,
  LayeredBoxSection,
  ManualBoardPlacement,
  ManualBoxPlacement,
  ManualLooseTrayPlacement,
  Tray
} from '$lib/types/project';
import { isCardDividerTray, isCardTray, isCardWellTray, isCounterTray, isCupTray } from '$lib/types/project';
import { packItems, stackItemsVertically, type PackingItem, type PackingResult } from '$lib/utils/binPacking';
import { getBoxExteriorDimensions, getBoxVisibleAssembledHeight, getTrayDimensionsForTray } from './box';

export interface BoxDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface BoxPlacement {
  box: Box;
  dimensions: BoxDimensions;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  baseHeight?: number;
}

export interface LooseTrayPlacement {
  tray: Tray;
  dimensions: { width: number; depth: number; height: number };
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  baseHeight?: number;
}

export interface BoardPlacement {
  board: Board;
  dimensions: { width: number; depth: number; height: number };
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  baseHeight?: number;
}

export interface LayerArrangement {
  boxes: BoxPlacement[];
  looseTrays: LooseTrayPlacement[];
  boards: BoardPlacement[];
  layerHeight: number;
  totalWidth: number;
  totalDepth: number;
}

export interface LayeredBoxSectionRenderPlacement {
  section: LayeredBoxSection;
  dimensions: { width: number; depth: number; height: number };
  x: number;
  y: number;
  z: number;
  rotation: 0 | 90 | 180 | 270;
  internalLayerId: string;
}

export interface LayeredBoxRenderLayout {
  width: number;
  depth: number;
  height: number;
  internalLayers: Array<{
    id: string;
    width: number;
    depth: number;
    height: number;
    z: number;
  }>;
  sections: LayeredBoxSectionRenderPlacement[];
}

export function getLayeredBoxExteriorDimensions(
  layeredBox: LayeredBox,
  cardSizes: CardSize[],
  counterShapes: CounterShape[]
): { width: number; depth: number; height: number; bodyHeight: number } {
  const layout = getLayeredBoxRenderLayout(layeredBox, cardSizes, counterShapes);
  const lidHeight = layeredBox.wallThickness * 2;
  const minBodyHeight = layout.height + layeredBox.floorThickness + layeredBox.tolerance;
  const bodyHeight = layeredBox.customBoxHeight ?? minBodyHeight;
  const width =
    layeredBox.customWidth ??
    layout.width + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;
  const depth =
    layeredBox.customDepth ??
    layout.depth + layeredBox.wallThickness * 2 + layeredBox.tolerance * 2;

  return {
    width,
    depth,
    height: bodyHeight + lidHeight,
    bodyHeight
  };
}

export function getLayeredBoxSectionDimensions(
  section: LayeredBoxSection,
  cardSizes: CardSize[],
  counterShapes: CounterShape[]
): { width: number; depth: number; height: number } {
  if ((section.type === 'counter' || section.type === 'playerBoard') && section.counterParams) {
    return getTrayDimensionsForTray(
      {
        id: section.id,
        type: 'counter',
        name: section.name,
        color: section.color ?? '#c9503c',
        params: section.counterParams
      },
      cardSizes,
      counterShapes
    );
  }

  if (section.type === 'cardDraw' && section.cardDrawParams) {
    return getTrayDimensionsForTray(
      {
        id: section.id,
        type: 'cardDraw',
        name: section.name,
        color: section.color ?? '#c9503c',
        params: section.cardDrawParams
      },
      cardSizes,
      counterShapes
    );
  }

  if (section.type === 'cardDivider' && section.cardDividerParams) {
    return getTrayDimensionsForTray(
      {
        id: section.id,
        type: 'cardDivider',
        name: section.name,
        color: section.color ?? '#c9503c',
        params: section.cardDividerParams
      },
      cardSizes,
      counterShapes
    );
  }

  if (section.type === 'cardWell' && section.cardWellParams) {
    return getTrayDimensionsForTray(
      {
        id: section.id,
        type: 'cardWell',
        name: section.name,
        color: section.color ?? '#c9503c',
        params: section.cardWellParams
      },
      cardSizes,
      counterShapes
    );
  }

  if (section.type === 'cup' && section.cupParams) {
    return getTrayDimensionsForTray(
      {
        id: section.id,
        type: 'cup',
        name: section.name,
        color: section.color ?? '#c9503c',
        params: section.cupParams
      },
      cardSizes,
      counterShapes
    );
  }

  return { width: 40, depth: 40, height: 10 };
}

export function getLayeredBoxRenderLayout(
  layeredBox: LayeredBox,
  cardSizes: CardSize[],
  counterShapes: CounterShape[]
): LayeredBoxRenderLayout {
  let totalHeight = 0;
  let maxWidth = 0;
  let maxDepth = 0;
  const internalLayers: LayeredBoxRenderLayout['internalLayers'] = [];
  const sections: LayeredBoxSectionRenderPlacement[] = [];

  for (const layer of layeredBox.layers) {
    const sectionDimensionEntries = layer.sections.map((section) => ({
      section,
      dimensions: getLayeredBoxSectionDimensions(section, cardSizes, counterShapes)
    }));
    let layerWidth = 0;
    let layerDepth = 0;
    let layerHeight = 0;
    let currentX = 0;
    const placedSectionIds = new Set<string>();

    if (layer.manualLayout && layer.manualLayout.length > 0) {
      for (const placement of layer.manualLayout) {
        const sectionEntry = sectionDimensionEntries.find(({ section }) => section.id === placement.trayId);
        if (!sectionEntry) continue;
        const rotated = placement.rotation === 90 || placement.rotation === 270;
        const dimensions = rotated
          ? {
              width: sectionEntry.dimensions.depth,
              depth: sectionEntry.dimensions.width,
              height: sectionEntry.dimensions.height
            }
          : sectionEntry.dimensions;

        sections.push({
          section: sectionEntry.section,
          dimensions,
          x: placement.x,
          y: placement.y,
          z: totalHeight,
          rotation: placement.rotation,
          internalLayerId: layer.id
        });
        placedSectionIds.add(sectionEntry.section.id);
        layerWidth = Math.max(layerWidth, placement.x + dimensions.width);
        layerDepth = Math.max(layerDepth, placement.y + dimensions.depth);
        layerHeight = Math.max(layerHeight, dimensions.height);
      }
    }

    for (const { section, dimensions } of sectionDimensionEntries) {
      if (placedSectionIds.has(section.id)) continue;
      sections.push({
        section,
        dimensions,
        x: currentX,
        y: 0,
        z: totalHeight,
        rotation: 0,
        internalLayerId: layer.id
      });
      currentX += dimensions.width + layeredBox.wallThickness;
      layerWidth = Math.max(layerWidth, currentX - layeredBox.wallThickness);
      layerDepth = Math.max(layerDepth, dimensions.depth);
      layerHeight = Math.max(layerHeight, dimensions.height);
    }

    internalLayers.push({
      id: layer.id,
      width: layerWidth,
      depth: layerDepth,
      height: layerHeight,
      z: totalHeight
    });

    maxWidth = Math.max(maxWidth, layerWidth);
    maxDepth = Math.max(maxDepth, layerDepth);
    totalHeight += layerHeight;
  }

  const finalWidth = Math.max(maxWidth, layeredBox.tolerance * 2, 20);
  const finalDepth = Math.max(maxDepth, layeredBox.tolerance * 2, 20);

  return {
    width: finalWidth,
    depth: finalDepth,
    height: Math.max(totalHeight, layeredBox.floorThickness, 5),
    internalLayers: internalLayers.map((internalLayer) => ({
      ...internalLayer,
      width: finalWidth,
      depth: finalDepth
    })),
    sections
  };
}

function createLayeredBoxBoardProxy(
  layeredBox: LayeredBox,
  cardSizes: CardSize[],
  counterShapes: CounterShape[]
): Board {
  const dims = getLayeredBoxExteriorDimensions(layeredBox, cardSizes, counterShapes);
  return {
    id: `layered-box-${layeredBox.id}`,
    name: layeredBox.name,
    color: '#6b7f95',
    width: dims.width,
    depth: dims.depth,
    height: dims.height
  };
}

/**
 * Calculate the height of a layer
 * Layer height = max of all box exterior heights and all loose tray content heights
 */
export function calculateLayerHeight(
  layer: Layer,
  options: {
    cardSizes: CardSize[];
    counterShapes: CounterShape[];
  }
): number {
  const { cardSizes, counterShapes } = options;
  const contentHeight = calculateLayerContentHeight(layer, { cardSizes, counterShapes });
  const boardHeight = Math.max(...layer.boards.map((board) => board.height), 0);
  const hasStackableContent =
    layer.boxes.length > 0 || layer.layeredBoxes.length > 0 || layer.looseTrays.length > 0;

  return Math.max(contentHeight, boardHeight, hasStackableContent ? boardHeight + contentHeight : 0);
}

function calculateLayerContentHeight(
  layer: Layer,
  options: {
    cardSizes: CardSize[];
    counterShapes: CounterShape[];
  }
): number {
  const { cardSizes, counterShapes } = options;
  // Get all box exterior heights
  const boxHeights = layer.boxes.map((box) => {
    return getBoxVisibleAssembledHeight(box, cardSizes, counterShapes);
  });
  const layeredBoxHeights = layer.layeredBoxes.map((layeredBox) => {
    const dims = getLayeredBoxExteriorDimensions(layeredBox, cardSizes, counterShapes);
    return dims.height;
  });

  // Get all loose tray content heights (minimum required height)
  const looseTrayHeights = layer.looseTrays.map((tray) => {
    const dims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
    return dims.height;
  });

  return Math.max(...boxHeights, ...layeredBoxHeights, ...looseTrayHeights, 0);
}

/**
 * Get dimensions of a box's exterior (including walls, floor, lid)
 * This is used for layer-level arrangement
 */
export function getBoxDimensions(box: Box, cardSizes: CardSize[], counterShapes: CounterShape[]): BoxDimensions {
  const dims = getBoxExteriorDimensions(box, cardSizes, counterShapes);
  return {
    ...dims,
    height: getBoxVisibleAssembledHeight(box, cardSizes, counterShapes)
  };
}

function isLooseTrayAutoHeightEnabled(tray: Tray): boolean {
  if (
    (isCounterTray(tray) || isCardDividerTray(tray) || isCardTray(tray) || isCardWellTray(tray) || isCupTray(tray)) &&
    tray.autoHeight === false
  ) {
    return false;
  }
  return true;
}

function isBoxAutoHeightEnabled(box: Box): boolean {
  return box.autoHeight !== false;
}

function isLayeredBoxProxyBoard(board: Board): boolean {
  return board.id.startsWith('layered-box-');
}

function rectsOverlap(
  a: { x: number; y: number; width: number; depth: number },
  b: { x: number; y: number; width: number; depth: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
}

function getBoardSupportHeight(
  boardPlacements: BoardPlacement[],
  rect: { x: number; y: number; width: number; depth: number }
): number {
  return boardPlacements.reduce((height, placement) => {
    if (isLayeredBoxProxyBoard(placement.board)) return height;
    const boardRect = {
      x: placement.x,
      y: placement.y,
      width: placement.dimensions.width,
      depth: placement.dimensions.depth
    };
    return rectsOverlap(rect, boardRect) ? Math.max(height, placement.dimensions.height) : height;
  }, 0);
}

function applyBoardSupports(arrangement: LayerArrangement): LayerArrangement {
  const boxesWithSupports = arrangement.boxes.map((placement) => ({
    ...placement,
    baseHeight: getBoardSupportHeight(arrangement.boards, {
      x: placement.x,
      y: placement.y,
      width: placement.dimensions.width,
      depth: placement.dimensions.depth
    })
  }));
  const looseTraysWithSupports = arrangement.looseTrays.map((placement) => ({
    ...placement,
    baseHeight: getBoardSupportHeight(arrangement.boards, {
      x: placement.x,
      y: placement.y,
      width: placement.dimensions.width,
      depth: placement.dimensions.depth
    })
  }));
  const boards = arrangement.boards.map((placement) => ({
    ...placement,
    baseHeight: isLayeredBoxProxyBoard(placement.board)
      ? getBoardSupportHeight(arrangement.boards, {
          x: placement.x,
          y: placement.y,
          width: placement.dimensions.width,
          depth: placement.dimensions.depth
        })
      : 0
  }));

  const targetLayerHeight = Math.max(
    ...boxesWithSupports.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    ...looseTraysWithSupports.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    ...boards.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    0
  );

  const boxes = boxesWithSupports.map((placement) => {
    if (!isBoxAutoHeightEnabled(placement.box)) return placement;
    return {
      ...placement,
      dimensions: {
        ...placement.dimensions,
        height: Math.max(placement.dimensions.height, targetLayerHeight - (placement.baseHeight ?? 0))
      }
    };
  });

  const looseTrays = looseTraysWithSupports.map((placement) => {
    if (!isLooseTrayAutoHeightEnabled(placement.tray)) return placement;
    return {
      ...placement,
      dimensions: {
        ...placement.dimensions,
        height: Math.max(placement.dimensions.height, targetLayerHeight - (placement.baseHeight ?? 0))
      }
    };
  });

  const layerHeight = Math.max(
    ...boxes.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    ...looseTrays.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    ...boards.map((placement) => (placement.baseHeight ?? 0) + placement.dimensions.height),
    0
  );

  return {
    ...arrangement,
    boxes,
    looseTrays,
    boards,
    layerHeight
  };
}

/**
 * Arrange boxes and loose trays within a layer
 * Uses bin-packing similar to arrangeTrays but at the layer level
 */
export function arrangeLayerContents(
  layer: Layer,
  options: {
    gameContainerWidth: number;
    gameContainerDepth: number;
    cardSizes: CardSize[];
    counterShapes: CounterShape[];
    gap?: number;
  }
): LayerArrangement {
  // If manual layout exists, use it
  if (layer.manualLayout) {
    return applyBoardSupports(arrangeLayerManual(layer, options));
  }

  // Auto-arrange using bin packing
  return applyBoardSupports(arrangeLayerAuto(layer, options));
}

/**
 * Arrange layer contents using manual placements
 */
function arrangeLayerManual(
  layer: Layer,
  options: {
    gameContainerWidth: number;
    gameContainerDepth: number;
    cardSizes: CardSize[];
    counterShapes: CounterShape[];
  }
): LayerArrangement {
  const { cardSizes, counterShapes } = options;
  const boxPlacements: BoxPlacement[] = [];
  const looseTrayPlacements: LooseTrayPlacement[] = [];
  const boardPlacements: BoardPlacement[] = [];

  // Place boxes from manual layout
  if (layer.manualLayout?.boxes) {
    for (const manual of layer.manualLayout.boxes) {
      const box = layer.boxes.find((b) => b.id === manual.boxId);
      if (!box) continue;

      const dims = getBoxDimensions(box, cardSizes, counterShapes);
      // Apply rotation: 90° and 270° swap width/depth
      const height = dims.height;
      const swapDims = manual.rotation === 90 || manual.rotation === 270;
      const effectiveDims: BoxDimensions = swapDims
        ? { width: dims.depth, depth: dims.width, height }
        : { width: dims.width, depth: dims.depth, height };

      boxPlacements.push({
        box,
        dimensions: effectiveDims,
        x: manual.x,
        y: manual.y,
        rotation: manual.rotation
      });
    }
  }

  // Place loose trays from manual layout
  if (layer.manualLayout?.looseTrays) {
    for (const manual of layer.manualLayout.looseTrays) {
      const tray = layer.looseTrays.find((t) => t.id === manual.trayId);
      if (!tray) continue;

      const dims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
      // Apply rotation: 90° and 270° swap width/depth
      const height = dims.height;
      const swapDims = manual.rotation === 90 || manual.rotation === 270;
      const effectiveDims = swapDims
        ? { width: dims.depth, depth: dims.width, height }
        : { width: dims.width, depth: dims.depth, height };

      looseTrayPlacements.push({
        tray,
        dimensions: effectiveDims,
        x: manual.x,
        y: manual.y,
        rotation: manual.rotation
      });
    }
  }

  // Place boards from manual layout
  if (layer.manualLayout?.boards) {
    for (const manual of layer.manualLayout.boards) {
      const board =
        layer.boards.find((b) => b.id === manual.boardId) ??
        layer.layeredBoxes
          .map((layeredBox) => createLayeredBoxBoardProxy(layeredBox, cardSizes, counterShapes))
          .find((b) => b.id === manual.boardId);
      if (!board) continue;

      const swapDims = manual.rotation === 90 || manual.rotation === 270;
      const effectiveDims = swapDims
        ? { width: board.depth, depth: board.width, height: board.height }
        : { width: board.width, depth: board.depth, height: board.height };

      boardPlacements.push({
        board,
        dimensions: effectiveDims,
        x: manual.x,
        y: manual.y,
        rotation: manual.rotation
      });
    }
  }

  // Add any items not in manual layout using auto-arrangement
  const manualBoxIds = new Set(layer.manualLayout?.boxes?.map((m) => m.boxId) || []);
  const manualTrayIds = new Set(layer.manualLayout?.looseTrays?.map((m) => m.trayId) || []);
  const manualBoardIds = new Set(layer.manualLayout?.boards?.map((m) => m.boardId) || []);

  const unplacedBoxes = layer.boxes.filter((b) => !manualBoxIds.has(b.id));
  const unplacedTrays = layer.looseTrays.filter((t) => !manualTrayIds.has(t.id));
  const unplacedBoards = [
    ...layer.boards.filter((b) => !manualBoardIds.has(b.id)),
    ...layer.layeredBoxes
      .map((box) => createLayeredBoxBoardProxy(box, cardSizes, counterShapes))
      .filter((board) => !manualBoardIds.has(board.id))
  ];

  if (unplacedBoxes.length > 0 || unplacedTrays.length > 0 || unplacedBoards.length > 0) {
    // Find max Y of placed items
    let maxY = 0;
    for (const p of boxPlacements) {
      maxY = Math.max(maxY, p.y + p.dimensions.depth);
    }
    for (const p of looseTrayPlacements) {
      maxY = Math.max(maxY, p.y + p.dimensions.depth);
    }

    // Auto-arrange remaining items
    const tempLayer: Layer = {
      ...layer,
      boxes: unplacedBoxes,
      looseTrays: unplacedTrays,
      boards: unplacedBoards,
      layeredBoxes: [],
      manualLayout: undefined
    };
    const autoArrangement = arrangeLayerAuto(tempLayer, options);

    // Offset and add to placements
    for (const p of autoArrangement.boxes) {
      boxPlacements.push({
        ...p,
        y: p.y + maxY
      });
    }
    for (const p of autoArrangement.looseTrays) {
      looseTrayPlacements.push({
        ...p,
        y: p.y + maxY
      });
    }
    for (const p of autoArrangement.boards) {
      boardPlacements.push({
        ...p,
        y: p.y + maxY
      });
    }
  }

  // Calculate total dimensions
  let totalWidth = 0;
  let totalDepth = 0;
  for (const p of boxPlacements) {
    totalWidth = Math.max(totalWidth, p.x + p.dimensions.width);
    totalDepth = Math.max(totalDepth, p.y + p.dimensions.depth);
  }
  for (const p of looseTrayPlacements) {
    totalWidth = Math.max(totalWidth, p.x + p.dimensions.width);
    totalDepth = Math.max(totalDepth, p.y + p.dimensions.depth);
  }
  for (const p of boardPlacements) {
    totalWidth = Math.max(totalWidth, p.x + p.dimensions.width);
    totalDepth = Math.max(totalDepth, p.y + p.dimensions.depth);
  }

  return {
    boxes: boxPlacements,
    looseTrays: looseTrayPlacements,
    boards: boardPlacements,
    layerHeight: Math.max(
      ...boxPlacements.map((placement) => placement.dimensions.height),
      ...looseTrayPlacements.map((placement) => placement.dimensions.height),
      ...boardPlacements.map((placement) => placement.dimensions.height),
      0
    ),
    totalWidth,
    totalDepth
  };
}

// Item data for layer bin packing
interface LayerItemData {
  itemType: 'box' | 'looseTray' | 'board';
  item: Box | Tray | Board;
  originalWidth: number;
  originalDepth: number;
}

/**
 * Auto-arrange layer contents using shared bin packing utility
 */
function arrangeLayerAuto(
  layer: Layer,
  options: {
    gameContainerWidth: number;
    gameContainerDepth: number;
    cardSizes: CardSize[];
    counterShapes: CounterShape[];
  }
): LayerArrangement {
  const { gameContainerWidth, gameContainerDepth, cardSizes, counterShapes } = options;

  if (layer.boxes.length === 0 && layer.layeredBoxes.length === 0 && layer.looseTrays.length === 0 && layer.boards.length === 0) {
    return {
      boxes: [],
      looseTrays: [],
      boards: [],
      layerHeight: 0,
      totalWidth: 0,
      totalDepth: 0
    };
  }

  // Collect all items with their dimensions
  const packingItems: PackingItem<LayerItemData>[] = [];
  const boardPackingItems: PackingItem<LayerItemData>[] = [];

  // Add boxes
  for (const box of layer.boxes) {
    const dims = getBoxDimensions(box, cardSizes, counterShapes);
    packingItems.push({
      data: { itemType: 'box', item: box, originalWidth: dims.width, originalDepth: dims.depth },
      width: dims.width,
      depth: dims.depth
    });
  }

  // Add loose trays
  for (const tray of layer.looseTrays) {
    const dims = getTrayDimensionsForTray(tray, cardSizes, counterShapes);
    packingItems.push({
      data: { itemType: 'looseTray', item: tray, originalWidth: dims.width, originalDepth: dims.depth },
      width: dims.width,
      depth: dims.depth
    });
  }

  for (const board of layer.boards) {
    boardPackingItems.push({
      data: { itemType: 'board', item: board, originalWidth: board.width, originalDepth: board.depth },
      width: board.width,
      depth: board.depth
    });
  }

  for (const layeredBox of layer.layeredBoxes) {
    const boardProxy = createLayeredBoxBoardProxy(layeredBox, cardSizes, counterShapes);
    packingItems.push({
      data: { itemType: 'board', item: boardProxy, originalWidth: boardProxy.width, originalDepth: boardProxy.depth },
      width: boardProxy.width,
      depth: boardProxy.depth
    });
  }

  // Try bin packing
  const emptyPackResult: PackingResult<LayerItemData> = { items: [], totalWidth: 0, totalDepth: 0, area: 0 };
  const packResult =
    packingItems.length > 0 ? packItems(packingItems, gameContainerWidth, gameContainerDepth) : emptyPackResult;
  const boardPackResult =
    boardPackingItems.length > 0
      ? packItems(boardPackingItems, gameContainerWidth, gameContainerDepth) ?? stackItemsVertically(boardPackingItems)
      : emptyPackResult;

  // Convert packing result to layer placements
  const convertToPlacement = (result: PackingResult<LayerItemData>) => {
    const boxPlacements: BoxPlacement[] = [];
    const looseTrayPlacements: LooseTrayPlacement[] = [];
    const boardPlacements: BoardPlacement[] = [];
    const packedItems = [...boardPackResult.items, ...result.items];

    for (const packed of packedItems) {
      const { data, x, y, width, depth, rotated } = packed;

      if (data.itemType === 'box') {
        const box = data.item as Box;
        const naturalHeight = getBoxDimensions(box, cardSizes, counterShapes).height;
        boxPlacements.push({
          box,
          dimensions: { width, depth, height: naturalHeight },
          x,
          y,
          rotation: rotated ? 90 : 0
        });
      } else if (data.itemType === 'looseTray') {
        const tray = data.item as Tray;
        const naturalHeight = getTrayDimensionsForTray(tray, cardSizes, counterShapes).height;
        looseTrayPlacements.push({
          tray,
          dimensions: { width, depth, height: naturalHeight },
          x,
          y,
          rotation: rotated ? 90 : 0
        });
      } else {
        boardPlacements.push({
          board: data.item as Board,
          dimensions: { width, depth, height: (data.item as Board).height },
          x,
          y,
          rotation: rotated ? 90 : 0
        });
      }
    }

    return {
      boxes: boxPlacements,
      looseTrays: looseTrayPlacements,
      boards: boardPlacements,
      layerHeight: Math.max(
        ...boxPlacements.map((placement) => placement.dimensions.height),
        ...looseTrayPlacements.map((placement) => placement.dimensions.height),
        ...boardPlacements.map((placement) => placement.dimensions.height),
        0
      ),
      totalWidth: Math.max(result.totalWidth, boardPackResult.totalWidth),
      totalDepth: Math.max(result.totalDepth, boardPackResult.totalDepth)
    };
  };

  // Use packing result if successful
  if (packResult) return convertToPlacement(packResult);

  // Fallback: stack vertically
  const fallback = stackItemsVertically(packingItems);
  return convertToPlacement(fallback);
}

/**
 * Convert layer arrangement to manual placements for saving
 */
export function arrangementToManualPlacements(arrangement: LayerArrangement): {
  boxes: ManualBoxPlacement[];
  looseTrays: ManualLooseTrayPlacement[];
  boards: ManualBoardPlacement[];
} {
  const boxes: ManualBoxPlacement[] = arrangement.boxes.map((p) => ({
    boxId: p.box.id,
    x: p.x,
    y: p.y,
    rotation: p.rotation
  }));

  const looseTrays: ManualLooseTrayPlacement[] = arrangement.looseTrays.map((p) => ({
    trayId: p.tray.id,
    x: p.x,
    y: p.y,
    rotation: p.rotation
  }));

  const boards: ManualBoardPlacement[] = arrangement.boards.map((p) => ({
      boardId: p.board.id,
      x: p.x,
      y: p.y,
      rotation: p.rotation
    }));

  return { boxes, looseTrays, boards };
}
