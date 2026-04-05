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
import { packItems, stackItemsVertically, type PackingItem } from '$lib/utils/binPacking';
import { getBoxExteriorDimensions, getTrayDimensionsForTray } from './box';

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
}

export interface LooseTrayPlacement {
  tray: Tray;
  dimensions: { width: number; depth: number; height: number };
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface BoardPlacement {
  board: Board;
  dimensions: { width: number; depth: number; height: number };
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
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
    const sectionDimensions = layer.sections.map((section) =>
      getLayeredBoxSectionDimensions(section, cardSizes, counterShapes)
    );

    const layerWidth =
      sectionDimensions.reduce((sum, dims) => sum + dims.width, 0) +
      Math.max(sectionDimensions.length - 1, 0) * layeredBox.wallThickness;
    const layerDepth = sectionDimensions.reduce((max, dims) => Math.max(max, dims.depth), 0);
    const layerHeight = sectionDimensions.reduce((max, dims) => Math.max(max, dims.height), 0);
    let currentX = 0;

    internalLayers.push({
      id: layer.id,
      width: layerWidth,
      depth: layerDepth,
      height: layerHeight,
      z: totalHeight
    });

    for (let index = 0; index < layer.sections.length; index += 1) {
      const section = layer.sections[index];
      const dimensions = sectionDimensions[index];
      sections.push({
        section,
        dimensions,
        x: currentX,
        y: 0,
        z: totalHeight,
        internalLayerId: layer.id
      });
      currentX += dimensions.width + layeredBox.wallThickness;
    }

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

  // Get all box exterior heights
  const boxHeights = layer.boxes.map((box) => {
    const dims = getBoxExteriorDimensions(box, cardSizes, counterShapes);
    return dims.height;
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

  const boardHeights = layer.boards.map((board) => board.height);

  // Layer height = max of all items
  return Math.max(...boxHeights, ...layeredBoxHeights, ...looseTrayHeights, ...boardHeights, 0);
}

/**
 * Get dimensions of a box's exterior (including walls, floor, lid)
 * This is used for layer-level arrangement
 */
export function getBoxDimensions(box: Box, cardSizes: CardSize[], counterShapes: CounterShape[]): BoxDimensions {
  return getBoxExteriorDimensions(box, cardSizes, counterShapes);
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
  const { cardSizes, counterShapes } = options;

  // Calculate layer height first
  const layerHeight = calculateLayerHeight(layer, { cardSizes, counterShapes });

  // If manual layout exists, use it
  if (layer.manualLayout) {
    return arrangeLayerManual(layer, layerHeight, options);
  }

  // Auto-arrange using bin packing
  return arrangeLayerAuto(layer, layerHeight, options);
}

/**
 * Arrange layer contents using manual placements
 */
function arrangeLayerManual(
  layer: Layer,
  layerHeight: number,
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
      // Use layerHeight for consistent layer stacking
      const swapDims = manual.rotation === 90 || manual.rotation === 270;
      const effectiveDims: BoxDimensions = swapDims
        ? { width: dims.depth, depth: dims.width, height: layerHeight }
        : { width: dims.width, depth: dims.depth, height: layerHeight };

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
      const swapDims = manual.rotation === 90 || manual.rotation === 270;
      const effectiveDims = swapDims
        ? { width: dims.depth, depth: dims.width, height: layerHeight }
        : { width: dims.width, depth: dims.depth, height: layerHeight };

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
    const autoArrangement = arrangeLayerAuto(tempLayer, layerHeight, options);

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
    layerHeight,
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
  layerHeight: number,
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
    packingItems.push({
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
  const packResult = packItems(packingItems, gameContainerWidth, gameContainerDepth);

  // Convert packing result to layer placements
  const convertToPlacement = (result: typeof packResult) => {
    if (!result) return null;

    const boxPlacements: BoxPlacement[] = [];
    const looseTrayPlacements: LooseTrayPlacement[] = [];
    const boardPlacements: BoardPlacement[] = [];

    for (const packed of result.items) {
      const { data, x, y, width, depth, rotated } = packed;

      if (data.itemType === 'box') {
        boxPlacements.push({
          box: data.item as Box,
          dimensions: { width, depth, height: layerHeight },
          x,
          y,
          rotation: rotated ? 90 : 0
        });
      } else if (data.itemType === 'looseTray') {
        looseTrayPlacements.push({
          tray: data.item as Tray,
          dimensions: { width, depth, height: layerHeight },
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
      layerHeight,
      totalWidth: result.totalWidth,
      totalDepth: result.totalDepth
    };
  };

  // Use packing result if successful
  const placement = convertToPlacement(packResult);
  if (placement) return placement;

  // Fallback: stack vertically
  const fallback = stackItemsVertically(packingItems);
  const fallbackPlacement = convertToPlacement(fallback);
  return (
    fallbackPlacement || {
      boxes: [],
      looseTrays: [],
      boards: [],
      layerHeight,
      totalWidth: 0,
      totalDepth: 0
    }
  );
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
