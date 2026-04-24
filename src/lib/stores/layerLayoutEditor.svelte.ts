/**
 * Layer Layout Editor State Store
 * Manages the state for manual box and loose tray arrangement within a layer
 */

import type { BoardPlacement, BoxPlacement, LooseTrayPlacement } from '$lib/models/layer';
import type { SnapGuide } from '$lib/types/editor';
import { getEffectiveDimensions as getEffectiveDimsBase } from '$lib/types/editor';
import type { ManualBoardPlacement, ManualBoxPlacement, ManualLooseTrayPlacement } from '$lib/types/project';

// Re-export SnapGuide for backwards compatibility
export type { SnapGuide };

// Working placement for boxes during editing
export interface EditorBoxPlacement {
  boxId: string;
  name: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  // Original dimensions (before rotation)
  originalWidth: number;
  originalDepth: number;
  height: number;
}

// Working placement for loose trays during editing
export interface EditorLooseTrayPlacement {
  trayId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  // Original dimensions (before rotation)
  originalWidth: number;
  originalDepth: number;
  height: number;
}

export interface EditorBoardPlacement {
  boardId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  originalWidth: number;
  originalDepth: number;
  height: number;
}

// Computed dimensions based on rotation (uses shared implementation)
export function getEffectiveBoxDimensions(placement: EditorBoxPlacement): {
  width: number;
  depth: number;
} {
  return getEffectiveDimsBase(placement);
}

export function getEffectiveLooseTrayDimensions(placement: EditorLooseTrayPlacement): {
  width: number;
  depth: number;
} {
  return getEffectiveDimsBase(placement);
}

export function getEffectiveBoardDimensions(placement: EditorBoardPlacement): {
  width: number;
  depth: number;
} {
  return getEffectiveDimsBase(placement);
}

function isLayeredBoxProxyBoard(boardId: string): boolean {
  return boardId.startsWith('layered-box-');
}

function rectsOverlap(
  a: { x: number; y: number; width: number; depth: number },
  b: { x: number; y: number; width: number; depth: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
}

type StackedEditorBoardPlacement = EditorBoardPlacement & { baseHeight: number };

function getBoardSupportHeightFromPlacements(
  boardPlacements: StackedEditorBoardPlacement[],
  rect: { x: number; y: number; width: number; depth: number },
  excludeBoardId?: string
): number {
  return boardPlacements.reduce((height, placement) => {
    if (placement.boardId === excludeBoardId || isLayeredBoxProxyBoard(placement.boardId)) return height;
    const dims = getEffectiveBoardDimensions(placement);
    const topHeight = placement.baseHeight + placement.height;
    return rectsOverlap(rect, { x: placement.x, y: placement.y, width: dims.width, depth: dims.depth })
      ? Math.max(height, topHeight)
      : height;
  }, 0);
}

function getStackedEditorBoardPlacements(): StackedEditorBoardPlacement[] {
  return workingBoardPlacements.reduce<StackedEditorBoardPlacement[]>((stackedBoards, placement) => {
    const dims = getEffectiveBoardDimensions(placement);
    const baseHeight = getBoardSupportHeightFromPlacements(stackedBoards, {
      x: placement.x,
      y: placement.y,
      width: dims.width,
      depth: dims.depth
    });
    stackedBoards.push({ ...placement, baseHeight });
    return stackedBoards;
  }, []);
}

export function getEditorBoxBaseHeight(placement: EditorBoxPlacement): number {
  const dims = getEffectiveBoxDimensions(placement);
  return getBoardSupportHeightFromPlacements(getStackedEditorBoardPlacements(), {
    x: placement.x,
    y: placement.y,
    width: dims.width,
    depth: dims.depth
  });
}

export function getEditorLooseTrayBaseHeight(placement: EditorLooseTrayPlacement): number {
  const dims = getEffectiveLooseTrayDimensions(placement);
  return getBoardSupportHeightFromPlacements(getStackedEditorBoardPlacements(), {
    x: placement.x,
    y: placement.y,
    width: dims.width,
    depth: dims.depth
  });
}

export function getEditorBoardBaseHeight(placement: EditorBoardPlacement): number {
  return getStackedEditorBoardPlacements().find((boardPlacement) => boardPlacement.boardId === placement.boardId)?.baseHeight ?? 0;
}

// Reactive state
let isEditMode = $state(false);
let selectedItemId = $state<string | null>(null);
let selectedItemType = $state<'box' | 'looseTray' | 'board' | null>(null);
let workingBoxPlacements = $state<EditorBoxPlacement[]>([]);
let workingLooseTrayPlacements = $state<EditorLooseTrayPlacement[]>([]);
let workingBoardPlacements = $state<EditorBoardPlacement[]>([]);
let originalBoxPlacements = $state<EditorBoxPlacement[]>([]); // For cancel/restore
let originalLooseTrayPlacements = $state<EditorLooseTrayPlacement[]>([]); // For cancel/restore
let originalBoardPlacements = $state<EditorBoardPlacement[]>([]); // For cancel/restore
let gameContainerWidth = $state(256);
let gameContainerDepth = $state(256);

// Snap guides for visual feedback
let activeSnapGuides = $state<SnapGuide[]>([]);

// Drag state
export interface DragState {
  isDragging: boolean;
  hasMoved: boolean;
  itemId: string | null;
  itemType: 'box' | 'looseTray' | 'board' | null;
  startX: number;
  startY: number;
  originalItemX: number;
  originalItemY: number;
}
let dragState = $state<DragState>({
  isDragging: false,
  hasMoved: false,
  itemId: null,
  itemType: null,
  startX: 0,
  startY: 0,
  originalItemX: 0,
  originalItemY: 0
});

// Reactive state object
export const layerLayoutEditorState = {
  get isEditMode() {
    return isEditMode;
  },
  get selectedItemId() {
    return selectedItemId;
  },
  get selectedItemType() {
    return selectedItemType;
  },
  get workingBoxPlacements() {
    return workingBoxPlacements;
  },
  get workingLooseTrayPlacements() {
    return workingLooseTrayPlacements;
  },
  get workingBoardPlacements() {
    return workingBoardPlacements;
  },
  get activeSnapGuides() {
    return activeSnapGuides;
  },
  get gameContainerWidth() {
    return gameContainerWidth;
  },
  get gameContainerDepth() {
    return gameContainerDepth;
  },
  get dragState() {
    return dragState;
  }
};

// Getter functions for non-reactive access
export function getIsEditMode(): boolean {
  return isEditMode;
}

export function getSelectedItemId(): string | null {
  return selectedItemId;
}

export function getSelectedItemType(): 'box' | 'looseTray' | 'board' | null {
  return selectedItemType;
}

/**
 * Enter layer layout edit mode
 */
export function enterLayerEditMode(
  boxPlacements: BoxPlacement[],
  looseTrayPlacements: LooseTrayPlacement[],
  boardPlacements: BoardPlacement[],
  containerWidth: number,
  containerDepth: number
): void {
  // Convert to editor placements
  const editorBoxPlacements: EditorBoxPlacement[] = boxPlacements.map((p) => {
    const swapped = p.rotation === 90 || p.rotation === 270;
    return {
      boxId: p.box.id,
      name: p.box.name,
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      originalWidth: swapped ? p.dimensions.depth : p.dimensions.width,
      originalDepth: swapped ? p.dimensions.width : p.dimensions.depth,
      height: p.dimensions.height
    };
  });

  const editorLooseTrayPlacements: EditorLooseTrayPlacement[] = looseTrayPlacements.map((p) => {
    const swapped = p.rotation === 90 || p.rotation === 270;
    return {
      trayId: p.tray.id,
      name: p.tray.name,
      color: p.tray.color || '#888888',
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      originalWidth: swapped ? p.dimensions.depth : p.dimensions.width,
      originalDepth: swapped ? p.dimensions.width : p.dimensions.depth,
      height: p.dimensions.height
    };
  });

  const editorBoardPlacements: EditorBoardPlacement[] = boardPlacements.map((p) => {
      const swapped = p.rotation === 90 || p.rotation === 270;
      return {
        boardId: p.board.id,
        name: p.board.name,
        color: p.board.color,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        originalWidth: swapped ? p.dimensions.depth : p.dimensions.width,
        originalDepth: swapped ? p.dimensions.width : p.dimensions.depth,
        height: p.dimensions.height
      };
    });

  workingBoxPlacements = editorBoxPlacements;
  workingLooseTrayPlacements = editorLooseTrayPlacements;
  workingBoardPlacements = editorBoardPlacements;
  originalBoxPlacements = JSON.parse(JSON.stringify(editorBoxPlacements));
  originalLooseTrayPlacements = JSON.parse(JSON.stringify(editorLooseTrayPlacements));
  originalBoardPlacements = JSON.parse(JSON.stringify(editorBoardPlacements));
  gameContainerWidth = containerWidth;
  gameContainerDepth = containerDepth;
  isEditMode = true;
  selectedItemId = null;
  selectedItemType = null;
}

/**
 * Exit layer layout edit mode
 */
export function exitLayerEditMode(): void {
  isEditMode = false;
  selectedItemId = null;
  selectedItemType = null;
  workingBoxPlacements = [];
  workingLooseTrayPlacements = [];
  workingBoardPlacements = [];
  originalBoxPlacements = [];
  originalLooseTrayPlacements = [];
  originalBoardPlacements = [];
  activeSnapGuides = [];
  dragState = {
    isDragging: false,
    hasMoved: false,
    itemId: null,
    itemType: null,
    startX: 0,
    startY: 0,
    originalItemX: 0,
    originalItemY: 0
  };
}

/**
 * Cancel changes and restore original placements
 */
export function cancelLayerChanges(): void {
  workingBoxPlacements = JSON.parse(JSON.stringify(originalBoxPlacements));
  workingLooseTrayPlacements = JSON.parse(JSON.stringify(originalLooseTrayPlacements));
  workingBoardPlacements = JSON.parse(JSON.stringify(originalBoardPlacements));
  selectedItemId = null;
  selectedItemType = null;
  activeSnapGuides = [];
}

/**
 * Select an item
 */
export function selectLayerItem(itemId: string, itemType: 'box' | 'looseTray' | 'board'): void {
  selectedItemId = itemId;
  selectedItemType = itemType;
}

/**
 * Deselect any selected item
 */
export function deselectLayerItem(): void {
  selectedItemId = null;
  selectedItemType = null;
}

/**
 * Update a box position
 */
export function updateBoxPosition(boxId: string, x: number, y: number): void {
  const idx = workingBoxPlacements.findIndex((p) => p.boxId === boxId);
  if (idx !== -1) {
    workingBoxPlacements[idx].x = x;
    workingBoxPlacements[idx].y = y;
  }
}

/**
 * Update a loose tray position
 */
export function updateLooseTrayPosition(trayId: string, x: number, y: number): void {
  const idx = workingLooseTrayPlacements.findIndex((p) => p.trayId === trayId);
  if (idx !== -1) {
    workingLooseTrayPlacements[idx].x = x;
    workingLooseTrayPlacements[idx].y = y;
  }
}

export function updateBoardPosition(boardId: string, x: number, y: number): void {
  const idx = workingBoardPlacements.findIndex((p) => p.boardId === boardId);
  if (idx !== -1) {
    workingBoardPlacements[idx].x = x;
    workingBoardPlacements[idx].y = y;
  }
}

/**
 * Rotate a box (90° clockwise)
 */
export function rotateBox(boxId: string): void {
  const idx = workingBoxPlacements.findIndex((p) => p.boxId === boxId);
  if (idx !== -1) {
    const current = workingBoxPlacements[idx].rotation;
    const newRotation = ((current + 90) % 360) as 0 | 90 | 180 | 270;
    workingBoxPlacements[idx].rotation = newRotation;
  }
}

/**
 * Rotate a loose tray (90° clockwise)
 */
export function rotateLooseTray(trayId: string): void {
  const idx = workingLooseTrayPlacements.findIndex((p) => p.trayId === trayId);
  if (idx !== -1) {
    const current = workingLooseTrayPlacements[idx].rotation;
    const newRotation = ((current + 90) % 360) as 0 | 90 | 180 | 270;
    workingLooseTrayPlacements[idx].rotation = newRotation;
  }
}

export function rotateBoard(boardId: string): void {
  const idx = workingBoardPlacements.findIndex((p) => p.boardId === boardId);
  if (idx !== -1) {
    const current = workingBoardPlacements[idx].rotation;
    const newRotation = ((current + 90) % 360) as 0 | 90 | 180 | 270;
    workingBoardPlacements[idx].rotation = newRotation;
  }
}

/**
 * Rotate the currently selected item
 */
export function rotateSelectedItem(): void {
  if (selectedItemId && selectedItemType === 'box') {
    rotateBox(selectedItemId);
  } else if (selectedItemId && selectedItemType === 'looseTray') {
    rotateLooseTray(selectedItemId);
  } else if (selectedItemId && selectedItemType === 'board') {
    rotateBoard(selectedItemId);
  }
}

/**
 * Get manual placements for saving to project
 */
export function getManualLayerPlacements(): {
  boxes: ManualBoxPlacement[];
  looseTrays: ManualLooseTrayPlacement[];
  boards: ManualBoardPlacement[];
} {
  const boxes: ManualBoxPlacement[] = workingBoxPlacements.map((p) => ({
    boxId: p.boxId,
    x: p.x,
    y: p.y,
    rotation: p.rotation
  }));

  const looseTrays: ManualLooseTrayPlacement[] = workingLooseTrayPlacements.map((p) => ({
    trayId: p.trayId,
    x: p.x,
    y: p.y,
    rotation: p.rotation
  }));

  const boards: ManualBoardPlacement[] = workingBoardPlacements.map((p) => ({
    boardId: p.boardId,
    x: p.x,
    y: p.y,
    rotation: p.rotation
  }));

  return { boxes, looseTrays, boards };
}

/**
 * Set snap guides
 */
export function setSnapGuides(guides: SnapGuide[]): void {
  activeSnapGuides = guides;
}

/**
 * Clear snap guides
 */
export function clearSnapGuides(): void {
  activeSnapGuides = [];
}

/**
 * Start dragging an item
 */
export function startDrag(itemId: string, itemType: 'box' | 'looseTray' | 'board', startX: number, startY: number): void {
  let originalX = 0;
  let originalY = 0;

  if (itemType === 'box') {
    const placement = workingBoxPlacements.find((p) => p.boxId === itemId);
    if (placement) {
      originalX = placement.x;
      originalY = placement.y;
    }
  } else if (itemType === 'looseTray') {
    const placement = workingLooseTrayPlacements.find((p) => p.trayId === itemId);
    if (placement) {
      originalX = placement.x;
      originalY = placement.y;
    }
  } else {
    const placement = workingBoardPlacements.find((p) => p.boardId === itemId);
    if (placement) {
      originalX = placement.x;
      originalY = placement.y;
    }
  }

  dragState = {
    isDragging: true,
    hasMoved: false,
    itemId,
    itemType,
    startX,
    startY,
    originalItemX: originalX,
    originalItemY: originalY
  };

  selectLayerItem(itemId, itemType);
}

/**
 * Update drag position with bounds checking considering item dimensions
 */
export function updateDrag(currentX: number, currentY: number): void {
  if (!dragState.isDragging || !dragState.itemId) return;

  const deltaX = currentX - dragState.startX;
  const deltaY = currentY - dragState.startY;

  if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
    dragState.hasMoved = true;
  }

  const newX = dragState.originalItemX + deltaX;
  const newY = dragState.originalItemY + deltaY;

  // Get item dimensions for proper bounds clamping
  let itemWidth = 0;
  let itemDepth = 0;

  if (dragState.itemType === 'box') {
    const placement = workingBoxPlacements.find((p) => p.boxId === dragState.itemId);
    if (placement) {
      const dims = getEffectiveBoxDimensions(placement);
      itemWidth = dims.width;
      itemDepth = dims.depth;
    }
  } else if (dragState.itemType === 'looseTray') {
    const placement = workingLooseTrayPlacements.find((p) => p.trayId === dragState.itemId);
    if (placement) {
      const dims = getEffectiveLooseTrayDimensions(placement);
      itemWidth = dims.width;
      itemDepth = dims.depth;
    }
  } else {
    const placement = workingBoardPlacements.find((p) => p.boardId === dragState.itemId);
    if (placement) {
      const dims = getEffectiveBoardDimensions(placement);
      itemWidth = dims.width;
      itemDepth = dims.depth;
    }
  }

  // Clamp to bounds - ensure item stays fully within container
  const clampedX = Math.max(0, Math.min(newX, gameContainerWidth - itemWidth));
  const clampedY = Math.max(0, Math.min(newY, gameContainerDepth - itemDepth));

  if (dragState.itemType === 'box') {
    updateBoxPosition(dragState.itemId, clampedX, clampedY);
  } else if (dragState.itemType === 'looseTray') {
    updateLooseTrayPosition(dragState.itemId, clampedX, clampedY);
  } else {
    updateBoardPosition(dragState.itemId, clampedX, clampedY);
  }
}

/**
 * End drag
 */
export function endDrag(): void {
  dragState = {
    isDragging: false,
    hasMoved: false,
    itemId: null,
    itemType: null,
    startX: 0,
    startY: 0,
    originalItemX: 0,
    originalItemY: 0
  };
  clearSnapGuides();
}

/**
 * Get the currently selected placement (for UI display)
 */
export function getSelectedPlacement(): EditorBoxPlacement | EditorLooseTrayPlacement | EditorBoardPlacement | null {
  if (!selectedItemId || !selectedItemType) return null;
  if (selectedItemType === 'box') {
    return workingBoxPlacements.find((p) => p.boxId === selectedItemId) ?? null;
  }
  if (selectedItemType === 'board') {
    return workingBoardPlacements.find((p) => p.boardId === selectedItemId) ?? null;
  }
  return workingLooseTrayPlacements.find((p) => p.trayId === selectedItemId) ?? null;
}
