import type { CardDividerTrayParams } from '$lib/models/cardDividerTray';
import type { CardDrawTrayParams } from '$lib/models/cardTray';
import type { CardWellTrayParams } from '$lib/models/cardWellTray';
import type { CounterTrayParams } from '$lib/models/counterTray';
import type { CupTrayParams } from '$lib/models/cupTray';
import type { MiniatureRackParams } from '$lib/models/miniatureRack';

// Base shape types for counter shapes
export type CounterBaseShape = 'rectangle' | 'square' | 'circle' | 'hex' | 'triangle';
export type CounterShapeCategory = 'counter' | 'playerBoard';

// Counter shape definition (global, referenced by ID)
export interface CounterShape {
  id: string;
  name: string;
  category?: CounterShapeCategory;
  baseShape: CounterBaseShape;
  width: number;
  length: number;
  thickness: number; // Counter thickness in mm
  cornerRadius?: number; // For triangle shapes
  pointyTop?: boolean; // For hex shapes
}

// Card size definition (global, referenced by ID)
export interface CardSize {
  id: string;
  name: string;
  width: number; // Sleeved width in mm
  length: number; // Sleeved length in mm
  thickness: number; // Sleeved thickness in mm
}

// Base tray interface shared by all tray types
interface BaseTray {
  id: string;
  name: string;
  color: string;
  rotationOverride?: 'auto' | 0 | 90; // User can force rotation: 'auto' = algorithm decides, 0 = no rotation, 90 = rotated
  showEmboss?: boolean; // Whether to emboss the tray name on the bottom (default: true)
  autoHeight?: boolean; // Whether the tray should grow to match its layer/box height (default: true)
}

// Visual-only board item for layer planning
export interface Board {
  id: string;
  name: string;
  color: string;
  width: number;
  depth: number;
  height: number;
}

export interface LayeredBoxLayer {
  id: string;
  name: string;
  fillSolidEmpty?: boolean;
  edgeReliefEnabled?: boolean;
  manualLayout?: ManualLooseTrayPlacement[];
  sections: LayeredBoxSection[];
}

export type LayeredBoxSectionType = 'counter' | 'cardDraw' | 'cardDivider' | 'cardWell' | 'cup' | 'playerBoard';

export interface LayeredBoxSection {
  id: string;
  type: LayeredBoxSectionType;
  name: string;
  color?: string;
  counterParams?: CounterTrayParams;
  cardDrawParams?: CardDrawTrayParams;
  cardDividerParams?: CardDividerTrayParams;
  cardWellParams?: CardWellTrayParams;
  cupParams?: CupTrayParams;
}

export interface LayeredBox {
  id: string;
  name: string;
  layers: LayeredBoxLayer[];
  tolerance: number;
  wallThickness: number;
  floorThickness: number;
  lidParams: LidParams;
  customWidth?: number;
  customDepth?: number;
  customBoxHeight?: number;
}

// Counter tray for cardboard counter tokens
export interface CounterTray extends BaseTray {
  type: 'counter';
  params: CounterTrayParams;
}

// Card draw tray for drawing cards (face down, sloped floor, finger cutout)
export interface CardDrawTray extends BaseTray {
  type: 'cardDraw';
  params: CardDrawTrayParams;
}

// Card divider tray for card storage (cards standing on edge in multiple stacks)
export interface CardDividerTray extends BaseTray {
  type: 'cardDivider';
  params: CardDividerTrayParams;
  showStackLabels?: boolean; // Whether to emboss stack labels on floor (default: true)
}

// Cup tray for loose game components (dice, tokens, meeples) in bowl-shaped cups
export interface CupTray extends BaseTray {
  type: 'cup';
  params: CupTrayParams;
}

// Card well tray for flat-laid cards in a grid of cutouts
export interface CardWellTray extends BaseTray {
  type: 'cardWell';
  params: CardWellTrayParams;
}

export interface MiniatureRackTray extends BaseTray {
  type: 'miniatureRack';
  params: MiniatureRackParams;
}

// Legacy alias for backwards compatibility
export type CardTray = CardDrawTray;

// Discriminated union of all tray types
export type Tray = CounterTray | CardDrawTray | CardDividerTray | CupTray | CardWellTray | MiniatureRackTray;

// Type guards for tray types
export function isCounterTray(tray: Tray): tray is CounterTray {
  return tray.type === 'counter';
}

export function isCardDrawTray(tray: Tray): tray is CardDrawTray {
  return tray.type === 'cardDraw';
}

export function isCardDividerTray(tray: Tray): tray is CardDividerTray {
  return tray.type === 'cardDivider';
}

export function isCupTray(tray: Tray): tray is CupTray {
  return tray.type === 'cup';
}

export function isCardWellTray(tray: Tray): tray is CardWellTray {
  return tray.type === 'cardWell';
}

export function isMiniatureRackTray(tray: Tray): tray is MiniatureRackTray {
  return tray.type === 'miniatureRack';
}

// Legacy alias - also matches old 'card' type for migration
export function isCardTray(tray: Tray): tray is CardDrawTray {
  return tray.type === 'cardDraw' || (tray as { type: string }).type === 'card';
}

export interface LidParams {
  thickness: number;
  railHeight: number;
  railWidth: number;
  railInset: number; // Channel width (outer wall to inner rail)
  ledgeHeight: number; // Height of outer wall before step-in
  fingerNotchRadius: number;
  fingerNotchDepth: number;
  // Snap-lock parameters
  snapEnabled: boolean; // Enable snap-lock mechanism
  snapBumpHeight: number; // How far bump protrudes (0.4-0.5mm typical)
  snapBumpWidth: number; // Width of bump along wall (3-5mm typical)
  railEngagement: number; // Fraction of lip height used for rail (0.0-1.0, default 0.5)
  // Ramp lock parameters (replaces cylindrical snap bump when enabled)
  rampLockEnabled: boolean; // Use ramp lock instead of cylindrical snap bump
  rampHeight: number; // Peak height in mm (default: 0.5)
  rampLengthIn: number; // Entry slope length in mm (default: 4, longer = easier slide-in)
  rampLengthOut: number; // Exit slope length in mm (default: 1.5, shorter = harder to remove)
  // Text embossing
  showName: boolean; // Emboss box name on lid top (default true)
  textMode?: 'emboss' | 'inlay'; // Name treatment on lid top (default: emboss)
  // Honeycomb infill pattern (reduces filament, maintains structure)
  honeycombEnabled?: boolean; // Enable honeycomb pattern on lid top (default: false)
  honeycombHexSize?: number; // Hexagon circumradius in mm (default: 5)
  honeycombWallThickness?: number; // Wall thickness between hexagons (default: 1.2)
  honeycombBorderOffset?: number; // Solid border width from edges (default: 3)
}

// Manual tray placement for layout editor (within a box)
export interface ManualTrayPlacement {
  trayId: string;
  x: number; // Position in box interior (mm)
  y: number;
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
}

// Manual box placement for layer layout editor
export interface ManualBoxPlacement {
  boxId: string;
  x: number; // Position in layer (mm)
  y: number;
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
}

// Manual loose tray placement for layer layout editor
export interface ManualLooseTrayPlacement {
  trayId: string;
  x: number; // Position in layer (mm)
  y: number;
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
}

// Manual board placement for layer layout editor
export interface ManualBoardPlacement {
  boardId: string;
  x: number; // Position in layer (mm)
  y: number;
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
}

// Layer containing boxes and/or loose trays
export interface Layer {
  id: string;
  name: string;
  boxes: Box[];
  layeredBoxes: LayeredBox[];
  looseTrays: Tray[];
  boards: Board[];
  manualLayout?: {
    boxes: ManualBoxPlacement[];
    looseTrays: ManualLooseTrayPlacement[];
    boards?: ManualBoardPlacement[];
  };
}

export interface Box {
  id: string;
  name: string;
  trays: Tray[];
  tolerance: number;
  wallThickness: number;
  floorThickness: number;
  lidParams: LidParams;
  // Custom exterior dimensions (undefined = auto-size)
  customWidth?: number; // Exterior X dimension
  customDepth?: number; // Exterior Y dimension
  customBoxHeight?: number; // Exterior Z dimension (box only, excludes lid; UI shows total height)
  autoHeight?: boolean; // Whether the box should grow to match its layer height (default: true)
  // Gap-filling behavior
  fillSolidEmpty?: boolean; // true = solid fill (default), false = walls only
  // Manual layout (when set, overrides auto-arrangement)
  manualLayout?: ManualTrayPlacement[];
  // Honeycomb pattern on box bottom (reduces filament)
  bottomHoneycombEnabled?: boolean;
}

// Project-level global settings (used as defaults and shown even without counter trays)
export interface GlobalSettings {
  gameContainerWidth: number;
  gameContainerDepth: number;
  gameContainerHeight: number | null;
}

export interface Project {
  schemaVersion: number;
  appVersion: string;
  version?: number; // Legacy Counter Slayer format marker (2 = layers format)
  name: string;
  layers: Layer[];
  counterShapes: CounterShape[];
  cardSizes: CardSize[];
  selectedLayerId: string | null;
  selectedBoxId: string | null;
  selectedLayeredBoxId?: string | null;
  selectedLayeredBoxLayerId?: string | null;
  selectedLayeredBoxSectionId?: string | null;
  selectedTrayId: string | null;
  selectedBoardId?: string | null;
  globalSettings?: GlobalSettings;
}

// Legacy project format (pre-layers)
export interface LegacyProject {
  version?: number;
  schemaVersion?: number;
  appVersion?: string;
  name?: string;
  boxes: Box[];
  counterShapes: CounterShape[];
  cardSizes: CardSize[];
  selectedBoxId: string | null;
  selectedTrayId: string | null;
  globalSettings?: GlobalSettings;
}

// Check if a tray is a loose tray (not in a box)
export function isLooseTray(project: Project, trayId: string): boolean {
  for (const layer of project.layers) {
    if (layer.looseTrays.some((t) => t.id === trayId)) {
      return true;
    }
  }
  return false;
}

// Find where a tray is located (layer + box or loose)
export function findTrayLocation(project: Project, trayId: string): { layerId: string; boxId: string | null } | null {
  for (const layer of project.layers) {
    // Check loose trays first
    if (layer.looseTrays.some((t) => t.id === trayId)) {
      return { layerId: layer.id, boxId: null };
    }
    // Check boxes
    for (const box of layer.boxes) {
      if (box.trays.some((t) => t.id === trayId)) {
        return { layerId: layer.id, boxId: box.id };
      }
    }
  }
  return null;
}

// Check if project is in legacy format (has boxes[] but no layers[])
export function isLegacyProject(data: unknown): data is LegacyProject {
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.boxes) && !Array.isArray(obj.layers);
}
