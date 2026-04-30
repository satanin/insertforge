import type { CounterShape } from '$lib/types/project';
import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { DEFAULT_SHAPE_IDS } from './counterTray';
import { getSafeEmbossDepth } from './emboss';
import { vectorTextWithAccents } from './vectorTextWithAccents';

const { cuboid, cylinder, circle } = jscad.primitives;
const { subtract, union, intersect } = jscad.booleans;
const { translate, scale, mirrorY, rotateX, rotateZ } = jscad.transforms;
const { path2 } = jscad.geometries;
const { expand } = jscad.expansions;
const { extrudeLinear } = jscad.extrusions;
const { hull } = jscad.hulls;

export interface TileTrayParams {
  tileShapeId: string;
  count: number;
  orientation: 'vertical' | 'horizontal';
  clearance: number;
  wallThickness: number;
  floorThickness: number;
  rimHeight: number;
}

export interface TileTrayPosition {
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  thickness: number;
  count: number;
  orientation: 'vertical' | 'horizontal';
  slotWidth: number;
  slotDepth: number;
  standingHeight: number;
  hexPointyTop: boolean;
  customBaseShape: CounterShape['baseShape'];
  shapeName: string;
}

const DEFAULT_TILE_CLEARANCE = 1.0;
const DEFAULT_TILE_WALL_THICKNESS = 2.0;
const DEFAULT_TILE_FLOOR_THICKNESS = 2.0;
const DEFAULT_TILE_RIM_HEIGHT = 2.0;
const DEFAULT_TILE_CUTOUT_WIDTH = 20;
const DEFAULT_TILE_CUTOUT_DEPTH = 8;
export const defaultTileTrayParams: TileTrayParams = {
  tileShapeId: DEFAULT_SHAPE_IDS.square,
  count: 10,
  orientation: 'vertical',
  clearance: DEFAULT_TILE_CLEARANCE,
  wallThickness: DEFAULT_TILE_WALL_THICKNESS,
  floorThickness: DEFAULT_TILE_FLOOR_THICKNESS,
  rimHeight: DEFAULT_TILE_RIM_HEIGHT
};

function getShape(tileShapeId: string, counterShapes: CounterShape[]): CounterShape {
  let shape = counterShapes.find((entry) => entry.id === tileShapeId);
  if (shape) return shape;

  shape = counterShapes.find((entry) => entry.name === tileShapeId);
  if (shape) return shape;

  return (
    counterShapes.find((entry) => (entry.category ?? 'counter') === 'tile') ??
    counterShapes[0] ?? {
      id: 'default-tile',
      name: 'Default Tile',
      category: 'tile',
      baseShape: 'square',
      width: 25,
      length: 25,
      thickness: 2
    }
  );
}

function getEffectiveShapeDimensions(shape: CounterShape): { width: number; length: number } {
  const baseShape = shape.baseShape ?? 'rectangle';
  if (baseShape === 'hex') {
    const flatToFlat = shape.width;
    const pointToPoint = flatToFlat / Math.cos(Math.PI / 6);
    const pointyTop = shape.pointyTop ?? false;
    return {
      width: pointyTop ? flatToFlat : pointToPoint,
      length: pointyTop ? pointToPoint : flatToFlat
    };
  }
  if (baseShape === 'triangle') {
    const side = shape.width;
    return {
      width: side,
      length: side * (Math.sqrt(3) / 2)
    };
  }
  if (baseShape === 'circle' || baseShape === 'square') {
    return {
      width: shape.width,
      length: shape.width
    };
  }
  return {
    width: shape.width,
    length: shape.length
  };
}

function getTileTrayCoreDimensions(params: TileTrayParams, counterShapes: CounterShape[]) {
  const shape = getShape(params.tileShapeId, counterShapes);
  const effective = getEffectiveShapeDimensions(shape);
  const major = Math.max(effective.width, effective.length);
  const minor = Math.min(effective.width, effective.length);
  const standingHeight = shape.baseShape === 'triangle' ? shape.width * (Math.sqrt(3) / 2) : minor;

  if (params.orientation === 'vertical') {
    return {
      shape,
      effective,
      cavityWidth: major + params.clearance * 2,
      cavityDepth: params.count * shape.thickness + params.clearance * 2,
      cavityHeight: standingHeight + params.rimHeight,
      standingHeight
    };
  }

  return {
    shape,
    effective,
    cavityWidth: major + params.clearance * 2,
    cavityDepth: minor + params.clearance * 2,
    cavityHeight: params.count * shape.thickness + params.rimHeight,
    standingHeight: shape.thickness
  };
}

function createRoundedTriangle2D(side: number, cornerRadius: number) {
  const r = cornerRadius;
  const triHeight = side * (Math.sqrt(3) / 2);
  const insetX = side / 2 - r;
  const insetYBottom = -triHeight / 2 + r;
  const insetYTop = triHeight / 2 - r * 2;

  const corners2D = [
    translate([-insetX, insetYBottom, 0], circle({ radius: r, segments: 16 })),
    translate([insetX, insetYBottom, 0], circle({ radius: r, segments: 16 })),
    translate([0, insetYTop, 0], circle({ radius: r, segments: 16 }))
  ];

  return hull(...corners2D);
}

function createDownwardTrianglePrism(side: number, cornerRadius: number, height: number): Geom3 {
  const tri = extrudeLinear({ height }, createRoundedTriangle2D(side, cornerRadius));
  return rotateZ(Math.PI, tri);
}

function createTilePlanShape(shape: CounterShape, clearance: number, height: number): Geom3 {
  const baseShape = shape.baseShape ?? 'rectangle';

  if (baseShape === 'hex') {
    const flatToFlat = shape.width + clearance * 2;
    const pointToPoint = flatToFlat / Math.cos(Math.PI / 6);
    const hex = cylinder({
      height,
      radius: pointToPoint / 2,
      segments: 6,
      center: [0, 0, height / 2]
    });
    return shape.pointyTop ? rotateZ(Math.PI / 6, hex) : hex;
  }

  if (baseShape === 'triangle') {
    const side = shape.width + clearance * 2;
    const cornerRadius = shape.cornerRadius ?? 1.5;
    return createDownwardTrianglePrism(side, cornerRadius, height);
  }

  if (baseShape === 'circle') {
    const diameter = shape.width + clearance * 2;
    return cylinder({
      height,
      radius: diameter / 2,
      segments: 64,
      center: [0, 0, height / 2]
    });
  }

  const width = shape.width + clearance * 2;
  const length = (baseShape === 'square' ? shape.width : shape.length) + clearance * 2;
  return cuboid({ size: [width, length, height], center: [0, 0, height / 2] });
}

function createVerticalTileSupportShape(
  shape: CounterShape,
  clearance: number,
  depth: number,
  cavityWidth: number,
  cavityHeight: number
): Geom3 {
  const baseShape = shape.baseShape ?? 'rectangle';

  if (baseShape === 'hex') {
    const flatToFlat = shape.width + clearance * 2;
    const pointToPoint = flatToFlat / Math.cos(Math.PI / 6);
    const hex = cylinder({
      height: depth,
      radius: pointToPoint / 2,
      segments: 6,
      center: [0, 0, 0]
    });
    const rotatedHex = shape.pointyTop ? rotateZ(Math.PI / 6, hex) : hex;
    return translate([0, 0, cavityHeight / 2], rotateX(Math.PI / 2, rotatedHex));
  }

  if (baseShape === 'triangle') {
    const side = shape.width + clearance * 2;
    const cornerRadius = shape.cornerRadius ?? 1.5;
    const tri = createDownwardTrianglePrism(side, cornerRadius, depth);
    return translate([0, 0, cavityHeight / 2], rotateX(Math.PI / 2, tri));
  }

  if (baseShape === 'circle') {
    const diameter = shape.width + clearance * 2;
    const cyl = cylinder({
      height: depth,
      radius: diameter / 2,
      segments: 64,
      center: [0, 0, 0]
    });
    return translate([0, 0, cavityHeight / 2], rotateX(Math.PI / 2, cyl));
  }

  return cuboid({
    size: [cavityWidth, depth, cavityHeight],
    center: [0, 0, cavityHeight / 2]
  });
}

function createVerticalTileChannel(
  shape: CounterShape,
  clearance: number,
  cavityWidth: number,
  cavityDepth: number,
  cavityHeight: number
): Geom3 {
  const baseShape = shape.baseShape ?? 'rectangle';

  if (baseShape === 'triangle') {
    const side = shape.width + clearance * 2;
    const triHeight = side * (Math.sqrt(3) / 2);
    const r = shape.cornerRadius ?? 1.5;
    const tinyR = 0.01;
    const insetYBottom = -triHeight / 2 + r * 2;
    const topY = triHeight / 2;

    const corners2D = [
      translate([0, insetYBottom, 0], circle({ radius: r, segments: 16 })),
      translate([-side / 2, topY, 0], circle({ radius: tinyR, segments: 4 })),
      translate([side / 2, topY, 0], circle({ radius: tinyR, segments: 4 }))
    ];
    const roundedTriangle2D = hull(...corners2D);

    const triCenterZ = triHeight / 2 - r;
    const topExtent = cavityHeight + 1 - (triCenterZ + triHeight / 2);
    const rect2D = jscad.primitives.rectangle({
      size: [side, topExtent],
      center: [0, triHeight / 2 + topExtent / 2]
    });
    const combinedTriangle2D = union(roundedTriangle2D, rect2D);
    const extruded = extrudeLinear({ height: cavityDepth }, combinedTriangle2D);
    const rotated = rotateX(Math.PI / 2, translate([0, 0, -cavityDepth / 2], extruded));
    return translate([0, 0, triCenterZ], rotated);
  }

  let support = createVerticalTileSupportShape(shape, clearance, cavityDepth, cavityWidth, cavityHeight);

  const upperHeight = cavityHeight / 2;
  const upper = cuboid({
    size: [cavityWidth, cavityDepth, upperHeight],
    center: [0, 0, cavityHeight - upperHeight / 2]
  });

  return union(support, upper);
}

export function getTileTrayDimensions(
  params: TileTrayParams,
  counterShapes: CounterShape[]
): { width: number; depth: number; height: number } {
  const core = getTileTrayCoreDimensions(params, counterShapes);
  return {
    width: core.cavityWidth + params.wallThickness * 2,
    depth: core.cavityDepth + params.wallThickness * 2,
    height: params.floorThickness + core.cavityHeight
  };
}

function createTileCutouts(
  trayWidth: number,
  trayDepth: number,
  trayHeight: number,
  wallThickness: number,
  cavityFloorZ: number,
  cavityWidth: number,
  cavityDepth: number,
  orientation: 'vertical' | 'horizontal'
): Geom3[] {
  const cutouts: Geom3[] = [];
  const cutoutWidth = Math.min(Math.max(DEFAULT_TILE_CUTOUT_WIDTH, cavityWidth * 0.55), trayWidth - wallThickness * 2);
  const cutoutDepth = wallThickness + DEFAULT_TILE_CUTOUT_DEPTH;
  const cutoutHeight = Math.max(0.1, trayHeight - cavityFloorZ);
  const cutoutZ = cavityFloorZ + cutoutHeight / 2;

  const frontBackCutout = cuboid({ size: [cutoutWidth, cutoutDepth, cutoutHeight] });
  cutouts.push(
    translate([trayWidth / 2, cutoutDepth / 2, cutoutZ], frontBackCutout),
    translate([trayWidth / 2, trayDepth - cutoutDepth / 2, cutoutZ], frontBackCutout)
  );

  if (orientation === 'horizontal') {
    const sideCutoutWidth = Math.min(Math.max(DEFAULT_TILE_CUTOUT_WIDTH, cavityDepth * 0.55), trayDepth - wallThickness * 2);
    const leftRightCutout = cuboid({ size: [cutoutDepth, sideCutoutWidth, cutoutHeight] });
    cutouts.push(
      translate([cutoutDepth / 2, trayDepth / 2, cutoutZ], leftRightCutout),
      translate([trayWidth - cutoutDepth / 2, trayDepth / 2, cutoutZ], leftRightCutout)
    );
  }

  return cutouts;
}

function createEmbossGeometry(
  trayName: string,
  trayWidth: number,
  trayDepth: number,
  floorThickness: number,
  wallThickness: number
): Geom3 | null {
  const trimmedName = trayName.trim();
  if (!trimmedName) return null;

  const { enabled, depth } = getSafeEmbossDepth(floorThickness);
  if (!enabled) return null;

  const strokeWidth = 1.2;
  const textHeight = 6;
  const margin = wallThickness * 2;
  const textSegments = vectorTextWithAccents({ height: textHeight, text: trimmedName });
  if (textSegments.length === 0) return null;

  const textShapes: ReturnType<typeof extrudeLinear>[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const segment of textSegments) {
    if (segment.length < 2) continue;
    const pathObj = path2.fromPoints({ closed: false }, segment);
    const expanded = expand({ delta: strokeWidth / 2, corners: 'round', segments: 128 }, pathObj);
    textShapes.push(extrudeLinear({ height: depth + 0.1 }, expanded));
    for (const point of segment) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  if (textShapes.length === 0) return null;

  const availableWidth = trayWidth - margin * 2;
  const availableDepth = trayDepth - margin * 2;
  const textWidth = maxX - minX + strokeWidth;
  const textDepth = maxY - minY + strokeWidth;
  const scaleX = Math.min(1, availableWidth / textWidth);
  const scaleY = Math.min(1, availableDepth / textDepth);
  const textScale = Math.min(scaleX, scaleY);

  let combined = union(...textShapes);
  combined = mirrorY(combined);
  combined = scale([textScale, textScale, 1], combined);

  const textCenterX = (minX + maxX) / 2;
  const textCenterY = (minY + maxY) / 2;
  return translate([trayWidth / 2 - textCenterX * textScale, trayDepth / 2 + textCenterY * textScale, -0.1], combined);
}

export function createTileTray(
  params: TileTrayParams,
  counterShapes: CounterShape[],
  trayName?: string,
  targetHeight?: number,
  floorSpacerHeight?: number,
  showEmboss: boolean = true
): Geom3 {
  const dims = getTileTrayDimensions(params, counterShapes);
  const core = getTileTrayCoreDimensions(params, counterShapes);
  const spacerHeight = floorSpacerHeight ?? 0;
  const trayHeightWithoutSpacer = targetHeight && targetHeight > dims.height ? targetHeight : dims.height;
  const trayHeight = trayHeightWithoutSpacer + spacerHeight;
  const heightIncrease = trayHeightWithoutSpacer > dims.height ? trayHeightWithoutSpacer - dims.height : 0;
  const cavityFloorZ = params.floorThickness + spacerHeight + heightIncrease;
  const outerBox = translate([dims.width / 2, dims.depth / 2, trayHeight / 2], cuboid({ size: [dims.width, dims.depth, trayHeight] }));

  const cavityHeight = Math.min(core.cavityHeight, trayHeight - cavityFloorZ) + 0.1;
  const cavityShape =
    params.orientation === 'horizontal'
      ? createTilePlanShape(core.shape, params.clearance, cavityHeight)
      : createVerticalTileChannel(core.shape, params.clearance, core.cavityWidth, core.cavityDepth, cavityHeight);

  const cavity = translate([dims.width / 2, dims.depth / 2, cavityFloorZ], cavityShape);

  let tray = subtract(
    outerBox,
    cavity,
    ...createTileCutouts(
      dims.width,
      dims.depth,
      trayHeight,
      params.wallThickness,
      cavityFloorZ,
      core.cavityWidth,
      core.cavityDepth,
      params.orientation
    )
  );

  if (showEmboss && trayName) {
    const emboss = createEmbossGeometry(trayName, dims.width, dims.depth, params.floorThickness, params.wallThickness);
    if (emboss) {
      tray = subtract(tray, emboss);
    }
  }

  return tray;
}

export function getTileTrayPreviewPositions(
  params: TileTrayParams,
  counterShapes: CounterShape[],
  targetHeight?: number,
  floorSpacerHeight?: number
): TileTrayPosition[] {
  const dims = getTileTrayDimensions(params, counterShapes);
  const core = getTileTrayCoreDimensions(params, counterShapes);
  const trayHeight = targetHeight && targetHeight > dims.height ? targetHeight : dims.height + (floorSpacerHeight ?? 0);
  const extraHeight = trayHeight - dims.height;
  const floorHeight = params.floorThickness + extraHeight;
  const cavityOriginX = (dims.width - core.cavityWidth) / 2;
  const cavityOriginY = (dims.depth - core.cavityDepth) / 2;

  return [
    {
      x: params.orientation === 'vertical' ? cavityOriginX : dims.width / 2,
      y: params.orientation === 'vertical' ? cavityOriginY : dims.depth / 2,
      z: floorHeight,
      width: core.effective.width,
      length: core.effective.length,
      thickness: core.shape.thickness,
      count: params.count,
      orientation: params.orientation,
      slotWidth: core.cavityWidth,
      slotDepth: core.cavityDepth,
      standingHeight: core.standingHeight,
      hexPointyTop: core.shape.pointyTop ?? false,
      customBaseShape: core.shape.baseShape,
      shapeName: core.shape.name
    }
  ];
}
