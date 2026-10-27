import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { CardSize, ProjectCardSleeve } from '$lib/types/project';
import { defaultCardStorageParams, resolveCardStorage } from './cardStorageTray';
import { DEFAULT_CARD_SLEEVE_THICKNESSES } from '$lib/utils/projectCards';

export interface ShelfDrawerParams {
  cardSizeId: string; sleeve: ProjectCardSleeve; orientation: 'vertical' | 'horizontal';
  depth: number; shellThickness: number; drawerWall: number; drawerFloor: number;
  slidingClearance: number; cardClearance: number; headroom: number;
  stackingEnabled?: boolean; labelWindow?: boolean; labelWidth?: number; labelHeight?: number;
  handleColor?: string;
}
export interface ShelfDrawerModule { id: string; name: string; type: 'card-drawer'; params: ShelfDrawerParams; }
export interface ShelfFrameParams { columns: number; rows: number; pitchWidth: number; pitchHeight: number; depth: number; wall: number; }
export interface ShelfFrameModule { id: string; name: string; type: 'open-frame'; params: ShelfFrameParams; }
export type ShelfModule = ShelfDrawerModule | ShelfFrameModule;
export type ShelfPartId = 'shell' | 'drawer' | 'handle';
export const defaultShelfDrawerParams: ShelfDrawerParams = {
  cardSizeId: 'standard', sleeve: 'none', orientation: 'vertical', depth: 240,
  shellThickness: 3, drawerWall: 2, drawerFloor: 2, slidingClearance: 0.5,
  cardClearance: 1, headroom: 8, stackingEnabled: true,
  labelWindow: true, labelWidth: 63, labelHeight: 88, handleColor: '#df9756'
};
export const MIN_STACK_SOCKET_WEB = 1.2;
const JOINT_HEIGHT = 2.4, JOINT_NECK = 27, JOINT_HEAD = 30, JOINT_GAP = 0.2, HANDLE_GAP = 0.25;
const { cuboid, polygon } = jscad.primitives;
const { union, subtract } = jscad.booleans;
const { translate, rotateX, rotateY, rotateZ } = jscad.transforms;
const { extrudeLinear } = jscad.extrusions;

export function resolveShelfDrawer(p: ShelfDrawerParams, cards: CardSize[]) {
  const errors: string[] = [];
  for (const [key, min, max] of [
    ['depth', 45, 1000], ['shellThickness', 1.2, 10], ['drawerWall', 1.2, 10],
    ['drawerFloor', 0.8, 10], ['slidingClearance', 0.1, 3], ['cardClearance', 0.2, 10], ['headroom', 0, 40]
  ] as [keyof ShelfDrawerParams, number, number][]) {
    const value = p[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      errors.push(`${key}: choose a value between ${min} and ${max} mm.`);
  }
  const stacking = p.stackingEnabled !== false;
  const panelThickness = stacking ? Math.max(p.shellThickness, JOINT_HEIGHT + JOINT_GAP + MIN_STACK_SOCKET_WEB) : p.shellThickness;
  const labelWindow = p.labelWindow !== false;
  // Reserve a Premium-sleeved label independently of the stored card sleeve.
  const premiumThickness = Math.max(DEFAULT_CARD_SLEEVE_THICKNESSES.premium,
    ...cards.filter(card => !card.id.startsWith('inventory-'))
      .map(card => card.sleeveThicknesses?.premium ?? 0).filter(value => Number.isFinite(value) && value > 0));
  const labelFaceWall = 2.4, labelBackWall = 2.4;
  const handleTongueThickness = 1.4;
  const labelSlotDepth = Math.max(handleTongueThickness + 2 * HANDLE_GAP, premiumThickness + 0.6);
  const labelSlotY = labelFaceWall;
  const frontThickness = Math.max(labelWindow ? labelFaceWall + labelSlotDepth + labelBackWall : 3, p.drawerWall);
  const handleWall = 2.4, handleDrop = 8;
  const handleRise = 0, handleStopHeight = 3, handleStopWidth = 3;
  const handleSeatDepth = handleWall + HANDLE_GAP;
  const handleBayDepth = handleWall + 3 * HANDLE_GAP;
  const frontReserve = frontThickness + handleBayDepth;
  const shellSkin = p.shellThickness;
  const drawerDepth = p.depth - shellSkin - 2 * p.slidingClearance;
  const content = resolveCardStorage({ ...defaultCardStorageParams,
    cardSizeId: p.cardSizeId, sleeve: p.sleeve, orientation: p.orientation,
    sizing: 'length', exteriorLength: drawerDepth - (frontReserve - p.drawerWall),
    wallThickness: p.drawerWall, floorThickness: p.drawerFloor, clearance: p.cardClearance,
    lid: false, maxHeight: null, dividers: []
  }, cards);
  errors.push(...content.errors);
  const labelCardWidth = p.labelWidth ?? 63, labelCardHeight = p.labelHeight ?? 88;
  if (labelWindow && (!Number.isFinite(labelCardWidth) || labelCardWidth < 20 || labelCardWidth > 150 ||
    !Number.isFinite(labelCardHeight) || labelCardHeight < 20 || labelCardHeight > 180))
    errors.push('Identification card must be 20–150 mm wide and 20–180 mm high.');
  // 1.5 mm per edge is an explicit sleeve envelope allowance, not a universal sleeve standard.
  const labelSleeveMargin = 1.5;
  const labelWidth = labelCardWidth + 2 * labelSleeveMargin;
  const labelHeight = labelCardHeight + 2 * labelSleeveMargin;
  const labelZ = p.drawerFloor;
  const drawerWidth = Math.max(content.width, labelWindow ? labelWidth + 0.6 + 2 * p.drawerWall : 0);
  const labelHandleGap = 0.85;
  const drawerHeight = Math.max(content.height + p.headroom,
    labelWindow ? labelZ + labelHeight + handleDrop + labelHandleGap : 0);
  const handleStopZ = drawerHeight - handleWall - HANDLE_GAP;
  const trackHeight = 0.5, trackWidth = Math.max(3, p.drawerWall);
  if (2 * trackWidth >= drawerWidth || drawerWidth < 26 || drawerHeight < p.drawerFloor + 30 || content.cardHeight < 14)
    errors.push('Card format is too small for the handle and bearing tracks.');
  const lipClearance = 2, lipThickness = 2.4;
  const sideGap = p.slidingClearance;
  const lipRootThickness = lipThickness + sideGap + p.drawerWall;
  const frontOverhang = 0;
  const bodyWidth = drawerWidth + panelThickness + shellSkin + 2 * sideGap;
  const drawerZ = panelThickness + trackHeight;
  // Only bottom/left contain female sockets and need the thicker backing.
  const bodyHeight = drawerZ + drawerHeight + p.slidingClearance + shellSkin;
  const sideHeight = p.drawerFloor + content.cardHeight * 0.5;
  const rampStart = Math.min(drawerDepth * 0.15, frontThickness + 14);
  const rampEnd = Math.min(drawerDepth - p.drawerWall, rampStart + Math.min(55, drawerDepth * 0.35));
  const lipStart = rampEnd + p.slidingClearance;
  const lipZ = drawerZ + sideHeight + lipClearance;
  const stackKeyHeight = stacking ? JOINT_HEIGHT : 0;
  return { valid: errors.length === 0, errors,
    width: bodyWidth + stackKeyHeight, depth: p.depth, height: bodyHeight + stackKeyHeight,
    bodyWidth, bodyHeight, drawerWidth, drawerDepth, drawerHeight, drawerZ,
    capacity: content.capacity, cardWidth: content.cardWidth, cardHeight: content.cardHeight,
    cardThickness: content.cardThickness, frontThickness, panelThickness, shellSkin, trackHeight, trackWidth,
    frontReserve, handleWall, handleTongueThickness, handleDrop, handleRise, handleSeatDepth, handleBayDepth,
    handleStopHeight, handleStopWidth, handleStopZ, labelHandleGap,
    handleHeight: handleDrop, sideGap, frontOverhang,
    sideHeight, rampStart, rampEnd, lipStart, lipClearance, lipThickness, lipRootThickness, lipZ,
    stacking, stackKeyHeight, stackClearance: JOINT_GAP,
    socketWeb: stacking ? panelThickness - JOINT_HEIGHT - JOINT_GAP : 0,
    jointStart: 10, labelWindow, labelWidth, labelHeight, labelZ,
    labelCardWidth, labelCardHeight, labelSleeveMargin, premiumThickness,
    labelFaceWall, labelBackWall, labelSlotDepth, labelSlotY,
    labelX: (drawerWidth - labelWidth) / 2,
    labelSlotX: (drawerWidth - labelWidth - 0.6) / 2, labelSlotWidth: labelWidth + 0.6,
    handleProjection: 16 - p.slidingClearance
  };
}

function block(x: number, y: number, z: number, w: number, d: number, h: number): Geom3 {
  return cuboid({ size: [w, d, h], center: [x + w / 2, y + d / 2, z + h / 2] });
}
function sideProfile(x: number, thickness: number, points: [number, number][]): Geom3 {
  return translate([x, 0, 0], rotateZ(Math.PI / 2, rotateX(Math.PI / 2,
    extrudeLinear({ height: thickness }, polygon({ points })))));
}
function alongY(profile: ReturnType<typeof polygon>, start: number, end: number): Geom3 {
  return translate([0, end, 0], rotateX(Math.PI / 2, extrudeLinear({ height: end - start }, profile)));
}
export function jointProfile(clearance = 0) {
  const shape = polygon({ points: [[-JOINT_NECK / 2, -0.1], [JOINT_NECK / 2, -0.1],
    [JOINT_HEAD / 2, JOINT_HEIGHT], [-JOINT_HEAD / 2, JOINT_HEIGHT]] });
  return clearance ? jscad.expansions.expand({ delta: clearance, corners: 'chamfer' }, shape) : shape;
}
function handleRgb(hex: string | undefined): [number, number, number] {
  const value = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex! : '#df9756';
  return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
}

// Assembly: X left→right, Y front→back, Z bottom→top.
export function createShelfDrawerParts(p: ShelfDrawerParams, cards: CardSize[]) {
  const r = resolveShelfDrawer(p, cards);
  if (!r.valid) throw new Error(r.errors.join(' '));
  const s = r.panelThickness, g = p.slidingClearance, t = p.drawerWall, f = p.drawerFloor;
  const w = r.drawerWidth, d = r.drawerDepth, h = r.drawerHeight;
  const floor = block(0, 0, 0, r.bodyWidth, p.depth, s);
  const skin = r.shellSkin;
  const leftWall = block(0, 0, s, s, p.depth, r.bodyHeight - s - skin);
  const rightWall = block(r.bodyWidth - skin, 0, s, skin, p.depth, r.bodyHeight - s - skin);
  const back = block(s, p.depth - skin, s, r.bodyWidth - s - skin, skin, r.bodyHeight - s - skin);
  const roof = block(0, 0, r.bodyHeight - skin, r.bodyWidth, p.depth, skin);
  const drawerX = s + r.sideGap;
  const tracks = [drawerX, drawerX + w - r.trackWidth].map(x => sideProfile(x, r.trackWidth, [
    [0, s], [p.depth - s, s], [p.depth - s, s + r.trackHeight], [4, s + r.trackHeight], [0, s + 0.2]
  ]));
  // Capture the existing side-wall tops, without adding ledges to the drawer.
  // Start behind the tall front transition; extraction moves that transition
  // away from the lips. Join the back wall for rear-face-down printing.
  const lipReach = r.sideGap + t;
  // Both bearing faces are flat. Keep the full root thickness through the tip
  // so the upper surface can support a future tier without weakening the root.
  const lipPoints: [number, number][] = [
    [s - 0.1, r.lipZ], [s + lipReach, r.lipZ],
    [s + lipReach, r.lipZ + r.lipRootThickness],
    [s - 0.1, r.lipZ + r.lipRootThickness]
  ];
  const leftLip = alongY(polygon({ points: lipPoints }), r.lipStart, p.depth - skin + 0.1);
  const rightLip = alongY(polygon({ points: lipPoints.map(([x, z]): [number, number] => [r.bodyWidth - skin + s - x, z]).reverse() }),
    r.lipStart, p.depth - skin + 0.1);
  const guideLips = union(leftLip, rightLip);
  const male: Geom3[] = [], female: Geom3[] = [];
  if (r.stacking) {
    const rail = alongY(jointProfile(), r.jointStart, p.depth);
    const socket = alongY(jointProfile(JOINT_GAP), r.jointStart - JOINT_GAP, p.depth + 0.1);
    male.push(translate([r.bodyWidth / 2, 0, r.bodyHeight], rail));
    male.push(translate([r.bodyWidth, 0, r.bodyHeight / 2], rotateY(Math.PI / 2, rail)));
    female.push(translate([r.bodyWidth / 2, 0, 0], socket));
    female.push(translate([0, 0, r.bodyHeight / 2], rotateY(Math.PI / 2, socket)));
  }
  const shellBase = union(floor, leftWall, rightWall, back, roof, ...tracks, guideLips, ...male);
  const shell = female.length ? subtract(shellBase, ...female) : shellBase;
  const cutawayBase = union(floor, leftWall, back, ...tracks, leftLip);
  const shellCutaway = female.length ? subtract(cutawayBase, ...female) : cutawayBase;
  const sideHeight = f + r.cardHeight * 0.5;
  const rampStart = Math.min(d * 0.15, r.frontThickness + 14);
  const rampEnd = Math.min(d - t, rampStart + Math.min(55, d * 0.35));
  const sidePoints: [number, number][] = [[0, f], [d, f], [d, sideHeight],
    [rampEnd, sideHeight], [rampStart, h], [0, h]];
  const faceLeft = -r.frontOverhang, faceWidth = w + 2 * r.frontOverhang;
  const frontBase = block(faceLeft, 0, f, faceWidth, r.frontThickness, h - f);
  let front = frontBase;
  if (r.labelWindow) {
    // Both cuts open at the top. No protruding frame or upper crossbar needs
    // to bridge empty space as the upright drawer is printed from its floor.
    front = subtract(frontBase,
      block(r.labelSlotX, r.labelSlotY, r.labelZ, r.labelSlotWidth, r.labelSlotDepth, h - r.labelZ + 0.1),
      block(r.labelSlotX + 3, -0.1, r.labelZ + 3, r.labelSlotWidth - 6, r.labelFaceWall + 0.2, h - r.labelZ - 3 + 0.1));
  }
  const drawerBase = union(block(0, 0, 0, w, d, f), block(faceLeft, 0, 0, faceWidth, r.frontThickness, f), front,
    block(0, d - t, f, w, t, sideHeight - f), sideProfile(0, t, sidePoints),
    sideProfile(w - t, t, sidePoints));
  // Recess only the central frontal edge. Both full-height side-wall junctions
  // stay continuous, and their inner faces guide the removable handle sideways.
  const handleLeft = Math.max(t, r.labelWindow ? r.labelSlotX : t) + HANDLE_GAP;
  const handleWidth = w - 2 * handleLeft;
  const recessedDrawer = subtract(drawerBase,
    block(t, -0.1, h - r.handleSeatDepth, w - 2 * t, r.frontThickness + 0.1, r.handleSeatDepth + 0.1));
  // The tall backing remains the load path between the two U legs. Shoulders
  // support the bridge at its ends, behind (never inside) the card channel.
  const stopBands = r.labelWindow ? [
    [r.labelSlotY + r.labelSlotDepth, r.frontThickness - r.labelSlotY - r.labelSlotDepth]] : [[0, r.frontThickness]];
  const stops = [t, w - t - r.handleStopWidth].flatMap(x => stopBands.map(([y, depth]) =>
    block(x, y, r.handleStopZ - r.handleStopHeight - 0.1, r.handleStopWidth, depth,
      r.handleStopHeight + 0.1)));
  const drawer = union(recessedDrawer, ...stops);
  const outerFront = r.labelWindow ? r.labelSlotY + HANDLE_GAP : -HANDLE_GAP - r.handleWall;
  const innerFront = outerFront + (r.labelWindow ? r.handleTongueThickness : r.handleWall);
  const outerBack = r.frontThickness + HANDLE_GAP + r.handleWall;
  const low = h - r.handleDrop, cap = h - r.handleWall;
  // The U bridge sits flush with the drawer top, entirely between its sides.
  const saddle = sideProfile(handleLeft, handleWidth, [
    [outerFront, low], [innerFront, low], [innerFront, cap],
    [r.frontThickness + HANDLE_GAP, cap], [r.frontThickness + HANDLE_GAP, low],
    [outerBack, low], [outerBack, h], [outerFront, h]
  ]);
  // A short L grip replaces the tall wedge. Its continuous flat top is the
  // print-bed face: the U legs and finger lip grow upwards without bridging.
  const grip = sideProfile(handleLeft, handleWidth, [
    [-16, low + 1], [-15, low], [-16 + r.handleWall, low],
    [-16 + r.handleWall, cap], [outerFront + 0.1, cap],
    [outerFront + 0.1, h], [-16, h]
  ]);
  const handle = jscad.colors.colorize([...handleRgb(p.handleColor), 1], union(saddle, grip));
  return { shell, shellCutaway, drawer, handle, guideLips,
    drawerOffset: [drawerX, g, r.drawerZ] as [number, number, number], resolved: r };
}

export function shelfPrintGeometry(parts: ReturnType<typeof createShelfDrawerParts>, part: ShelfPartId): Geom3 {
  // Shell on its back; handle on the continuous top bridge of the inverted U.
  const oriented = part === 'shell' ? rotateX(-Math.PI / 2, parts.shell)
    : part === 'handle' ? rotateX(Math.PI, parts.handle) : parts.drawer;
  const bounds = jscad.measurements.measureBoundingBox(oriented);
  return translate(bounds[0].map(v => -v) as [number, number, number], oriented);
}

export function shelfExplodeOffsets(amount: number, drawerDepth: number, handleHeight: number) {
  const progress = Number.isFinite(amount) ? Math.max(0, Math.min(100, amount)) : 0;
  return {
    drawerTravel: Math.min(progress / 70, 1) * (drawerDepth + 20),
    handleLift: Math.max(0, (progress - 70) / 30) * (handleHeight + 10)
  };
}

export function createShelfPreview(p: ShelfDrawerParams, cards: CardSize[], extraction: number, contents: boolean,
  options: { cutaway?: boolean; stack?: boolean; adjacent?: boolean; print?: boolean } = {}) {
  const parts = createShelfDrawerParts(p, cards), r = parts.resolved;
  const color = (geom: Geom3, rgb: [number, number, number]) => jscad.colors.colorize([...rgb, 1], geom);
  const geoms: Geom3[] = [];
  if (options.print) {
    let x = 0;
    for (const part of ['shell', 'drawer', 'handle'] as const) {
      const geom = shelfPrintGeometry(parts, part);
      geoms.push(color(translate([x, 0, 0], geom), part === 'handle' ? handleRgb(p.handleColor) : part === 'shell' ? [0.2, 0.3, 0.43] : [0.52, 0.65, 0.76]));
      x += jscad.measurements.measureBoundingBox(geom)[1][0] + 15;
    }
  } else {
    const offset = [...parts.drawerOffset] as [number, number, number];
    const exploded = shelfExplodeOffsets(extraction, r.drawerDepth, r.handleHeight);
    offset[1] -= exploded.drawerTravel;
    const handleOffset = [...offset] as [number, number, number];
    handleOffset[2] += exploded.handleLift;
    geoms.push(color(options.cutaway ? parts.shellCutaway : parts.shell, [0.2, 0.3, 0.43]),
      color(translate(offset, parts.drawer), [0.52, 0.65, 0.76]), color(translate(handleOffset, parts.handle), handleRgb(p.handleColor)));
    const neighbours = [...(options.stack && r.stacking ? [[0, 0, r.bodyHeight]] : []),
      ...(options.adjacent && r.stacking ? [[r.bodyWidth, 0, 0]] : [])];
    for (const position of neighbours) {
      const pos = position as [number, number, number];
      geoms.push(color(translate(pos, parts.shell), [0.28, 0.39, 0.51]));
      const drawerPos = parts.drawerOffset.map((v, i) => v + pos[i]) as [number, number, number];
      geoms.push(color(translate(drawerPos, parts.drawer), [0.52, 0.65, 0.76]),
        color(translate(drawerPos, parts.handle), handleRgb(p.handleColor)));
    }
    if (contents) {
      geoms.push(color(translate(offset, block(p.drawerWall + p.cardClearance, r.frontReserve + p.cardClearance,
        p.drawerFloor, r.cardWidth, r.capacity * r.cardThickness, r.cardHeight)), [0.8, 0.62, 0.35]));
      if (r.labelWindow) geoms.push(color(translate(offset,
        block(r.labelX, r.labelSlotY + (r.labelSlotDepth - r.premiumThickness) / 2, r.labelZ,
          r.labelWidth, r.premiumThickness, r.labelHeight)), [0.85, 0.78, 0.62]));
    }
  }
  return jscad.geometries.geom3.create(geoms.flatMap(g => jscad.geometries.geom3.toPolygons(g).map(poly => ({ ...poly, color: g.color }))));
}
