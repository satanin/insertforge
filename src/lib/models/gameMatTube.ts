import jscad from '@jscad/modeling';

import type { Geom2, Geom3 } from '@jscad/modeling/src/geometries/types';

const { union, subtract, intersect } = jscad.booleans;
const { extrudeLinear, extrudeRotate } = jscad.extrusions;
const { hull } = jscad.hulls;
const { cylinder, cylinderElliptic, cuboid, polygon } = jscad.primitives;
const { measureBoundingBox } = jscad.measurements;
const { rotateX, rotateZ, translate } = jscad.transforms;

export type GameMatTubePreviewMode = 'assembled' | 'printBed';

export interface GameMatTubeParams {
  totalLengthMm: number;
  innerDiameterMm: number;
  wallThicknessMm: number;
  maxPieceHeightMm: number;
  minPieces: number;
  equalizeVisibleHeights: boolean;
  threadLengthMm: number;
  threadClearanceMm: number;
  bedSizeXMm: number;
  bedSizeYMm: number;
  labelEnabled: boolean;
  labelWidthMm: number;
  labelLengthMm: number;
  labelThicknessMm: number;
  labelInsertClearanceMm: number;
  labelSnapEnabled: boolean;
  surfacePattern: boolean;
  patternDepthMm: number;
  patternLanes: number;
  patternAngle: number;
  patternTwistGain: number;
  patternLineWidth: number;
}

export interface GameMatTubeDimensions {
  outerDiameter: number;
  totalLength: number;
  pieceCount: number;
  assembledHeight: number;
}

export type GameMatTubePartKind = 'bottom' | 'middle' | 'top' | 'label';

export interface GameMatTubePart {
  id: string;
  name: string;
  kind: GameMatTubePartKind;
  geometry: Geom3;
  printGeometry: Geom3;
  dimensions: { width: number; depth: number; height: number };
  suggestedPrintPosition?: { x: number; y: number; rotation: number };
  assembledPosition?: { x: number; y: number; z: number; rotationX?: number; rotationY?: number; rotationZ?: number };
}

export const DEFAULT_GAME_MAT_TUBE_PARAMS: GameMatTubeParams = {
  totalLengthMm: 400,
  innerDiameterMm: 65,
  wallThicknessMm: 4,
  maxPieceHeightMm: 240,
  minPieces: 2,
  equalizeVisibleHeights: false,
  threadLengthMm: 40,
  threadClearanceMm: 0.6,
  bedSizeXMm: 250,
  bedSizeYMm: 250,
  labelEnabled: true,
  labelWidthMm: 14,
  labelLengthMm: 120,
  labelThicknessMm: 1,
  labelInsertClearanceMm: 0.2,
  labelSnapEnabled: true,
  surfacePattern: true,
  patternDepthMm: 0.2,
  patternLanes: 10,
  patternAngle: 45,
  patternTwistGain: 1,
  patternLineWidth: 1.15
};

const MIN_TOTAL_LENGTH = 70;
const MIN_INNER_DIAMETER = 20;
const MIN_WALL_THICKNESS = 2.5;
const MIN_MAX_PIECE_HEIGHT = 60;
const MIN_MIN_PIECES = 2;
const MIN_THREAD_LENGTH = 20;
const MIN_THREAD_CLEARANCE = 0;
const MIN_BED_SIZE = 120;
const MIN_LABEL_WIDTH = 10;
const MIN_LABEL_LENGTH = 8;
const MIN_LABEL_THICKNESS = 0.8;
const MIN_PATTERN_DEPTH = 0.01;
const MIN_PATTERN_LANES = 2;
const MIN_PATTERN_LINE_WIDTH = 0.2;
const TUBE_RESOLUTION = 96;
const END_CAP_THICKNESS_MM = 3.7;
const END_BASE_BEVEL_MM = 2;
const CONNECTOR_OUTER_MARGIN_MM = 1.1;
const THREAD_DEPTH_MM = 0.65;
const THREAD_MIN_WALL_MM = 1;
const THREAD_UNION_OVERLAP_MM = 0.3;
const THREAD_SHOULDER_BLEND_MM = 0.8;
const MALE_THREAD_SHORTFALL_MM = 5;
const THREAD_PITCH_MM = 10;
const THREAD_START_TAPER_MM = 0.8;
const THREAD_ROOT_FILL = 0.32;
const THREAD_TOOTH_ANGLE_DEG = 80;
const THREAD_TOOTH_HEIGHT_MIN_MM = 0.2;
const CONNECTOR_FIT_BIAS = 0.35;
const LABEL_RAIL_BITE_MM = 1;
const LABEL_SNAP_HEIGHT_MM = 0.5;
const LABEL_SNAP_LENGTH_MM = 1.2;
const LABEL_SNAP_OFFSET_MM = 1;
const LABEL_SNAP_WIDTH_FACTOR = 0.7;
const LABEL_FRAME_SIDE_BEVEL_MM = 2.5;
const LABEL_FRAME_DEPTH_MM = 0.8;
const LABEL_FACE_RECESS_MM = 1.1;
const LABEL_INSERT_END_CLEARANCE_MM = 0.5;
const LABEL_BOTTOM_KEEPOUT_MM = END_BASE_BEVEL_MM;
const LABEL_SLOT_Z_MARGIN_MM = 2;
const LABEL_END_CHAMFER_MM = 1.2;

function clampNumber(value: number, min: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(value, min);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game-mat-tube';
}

export function normalizeGameMatTubeParams(params: GameMatTubeParams): GameMatTubeParams {
  return {
    totalLengthMm: clampNumber(params.totalLengthMm, MIN_TOTAL_LENGTH, DEFAULT_GAME_MAT_TUBE_PARAMS.totalLengthMm),
    innerDiameterMm: clampNumber(params.innerDiameterMm, MIN_INNER_DIAMETER, DEFAULT_GAME_MAT_TUBE_PARAMS.innerDiameterMm),
    wallThicknessMm: clampNumber(params.wallThicknessMm, MIN_WALL_THICKNESS, DEFAULT_GAME_MAT_TUBE_PARAMS.wallThicknessMm),
    maxPieceHeightMm: clampNumber(
      params.maxPieceHeightMm,
      MIN_MAX_PIECE_HEIGHT,
      DEFAULT_GAME_MAT_TUBE_PARAMS.maxPieceHeightMm
    ),
    minPieces: Math.max(MIN_MIN_PIECES, Math.floor(params.minPieces || DEFAULT_GAME_MAT_TUBE_PARAMS.minPieces)),
    equalizeVisibleHeights: Boolean(params.equalizeVisibleHeights),
    threadLengthMm: clampNumber(params.threadLengthMm, MIN_THREAD_LENGTH, DEFAULT_GAME_MAT_TUBE_PARAMS.threadLengthMm),
    threadClearanceMm: clampNumber(
      params.threadClearanceMm,
      MIN_THREAD_CLEARANCE,
      DEFAULT_GAME_MAT_TUBE_PARAMS.threadClearanceMm
    ),
    bedSizeXMm: clampNumber(params.bedSizeXMm, MIN_BED_SIZE, DEFAULT_GAME_MAT_TUBE_PARAMS.bedSizeXMm),
    bedSizeYMm: clampNumber(params.bedSizeYMm, MIN_BED_SIZE, DEFAULT_GAME_MAT_TUBE_PARAMS.bedSizeYMm),
    labelEnabled: Boolean(params.labelEnabled),
    labelWidthMm: clampNumber(params.labelWidthMm, MIN_LABEL_WIDTH, DEFAULT_GAME_MAT_TUBE_PARAMS.labelWidthMm),
    labelLengthMm: clampNumber(params.labelLengthMm, MIN_LABEL_LENGTH, DEFAULT_GAME_MAT_TUBE_PARAMS.labelLengthMm),
    labelThicknessMm: clampNumber(
      params.labelThicknessMm,
      MIN_LABEL_THICKNESS,
      DEFAULT_GAME_MAT_TUBE_PARAMS.labelThicknessMm
    ),
    labelInsertClearanceMm: clampNumber(
      params.labelInsertClearanceMm,
      0,
      DEFAULT_GAME_MAT_TUBE_PARAMS.labelInsertClearanceMm
    ),
    labelSnapEnabled: Boolean(params.labelSnapEnabled),
    surfacePattern: Boolean(params.surfacePattern),
    patternDepthMm: clampNumber(params.patternDepthMm, MIN_PATTERN_DEPTH, DEFAULT_GAME_MAT_TUBE_PARAMS.patternDepthMm),
    patternLanes: Math.max(MIN_PATTERN_LANES, Math.floor(params.patternLanes || DEFAULT_GAME_MAT_TUBE_PARAMS.patternLanes)),
    patternAngle: Number.isFinite(params.patternAngle) ? params.patternAngle : DEFAULT_GAME_MAT_TUBE_PARAMS.patternAngle,
    patternTwistGain: clampNumber(params.patternTwistGain, 0.5, DEFAULT_GAME_MAT_TUBE_PARAMS.patternTwistGain),
    patternLineWidth: clampNumber(
      params.patternLineWidth,
      MIN_PATTERN_LINE_WIDTH,
      DEFAULT_GAME_MAT_TUBE_PARAMS.patternLineWidth
    )
  };
}

function physicalPieceHeight(totalLength: number, jointLength: number, count: number, equalizeVisibleHeights: boolean): number {
  if (equalizeVisibleHeights) {
    return totalLength / count + jointLength;
  }
  return (totalLength + (count - 1) * jointLength) / count;
}

export function computeGameMatTubePieceCount(params: GameMatTubeParams): number {
  const normalized = normalizeGameMatTubeParams(params);
  const jointLength = normalized.threadLengthMm - MALE_THREAD_SHORTFALL_MM;
  let count = normalized.minPieces;
  while (
    physicalPieceHeight(
      normalized.totalLengthMm,
      jointLength,
      count,
      normalized.equalizeVisibleHeights
    ) > normalized.maxPieceHeightMm
  ) {
    count += 1;
  }
  return count;
}

function getPartDimensions(geometry: Geom3): { width: number; depth: number; height: number } {
  const bounds = measureBoundingBox(geometry);
  return {
    width: bounds[1][0] - bounds[0][0],
    depth: bounds[1][1] - bounds[0][1],
    height: bounds[1][2] - bounds[0][2]
  };
}

function getThreadToothHeight(): number {
  const target = 2 * THREAD_DEPTH_MM * Math.tan((THREAD_TOOTH_ANGLE_DEG * Math.PI) / 180);
  return Math.min(THREAD_PITCH_MM * 0.9, Math.max(THREAD_TOOTH_HEIGHT_MIN_MM, target));
}

function getPieceHeightTop(pieceHeightMale: number, visibleHeight: number, equalizeVisibleHeights: boolean): number {
  return equalizeVisibleHeights ? visibleHeight : pieceHeightMale;
}

function getLabelThreadRestrictedBase(params: GameMatTubeParams): number {
  const labelAutoThreadOverride = true;
  const labelOverrideMinWallThickness = 5.5;
  const restrictThreadZone = !(labelAutoThreadOverride && params.wallThicknessMm >= labelOverrideMinWallThickness);
  return restrictThreadZone ? params.threadLengthMm : 0;
}

function getLabelSlotLength(params: GameMatTubeParams, pieceHeightTop: number): number {
  const slotMinZ = getLabelThreadRestrictedBase(params) + LABEL_SLOT_Z_MARGIN_MM + LABEL_BOTTOM_KEEPOUT_MM;
  const lengthLimit = Math.min(150, pieceHeightTop - slotMinZ);
  return Math.min(params.labelLengthMm, Math.max(8, lengthLimit));
}

function getLabelTagLength(params: GameMatTubeParams, pieceHeightTop: number): number {
  return Math.max(0.2, getLabelSlotLength(params, pieceHeightTop) - END_BASE_BEVEL_MM);
}

function createThreadProfile(depth: number): Geom2 {
  const root = depth * THREAD_ROOT_FILL;
  return polygon({
    points: [
      [0, 0],
      [root, 0.06 * THREAD_PITCH_MM],
      [depth, 0.18 * THREAD_PITCH_MM],
      [depth, 0.52 * THREAD_PITCH_MM],
      [root + 0.2 * (depth - root), 0.84 * THREAD_PITCH_MM],
      [root, 0.95 * THREAD_PITCH_MM],
      [0, THREAD_PITCH_MM]
    ]
  }) as Geom2;
}

function createHelicalThreadSolid(majorDiameter: number, length: number, depth: number): Geom3 {
  const turns = length / THREAD_PITCH_MM;
  const profile = createThreadProfile(depth);
  return extrudeLinear(
    {
      height: length,
      twistAngle: turns * 2 * Math.PI,
      twistSteps: Math.max(64, Math.ceil(turns * 64))
    },
    translate([(majorDiameter - 2 * depth) / 2, 0, 0], profile)
  );
}

function zCylinder(z0: number, height: number, radius: number): Geom3 {
  return cylinder({
    height,
    radius,
    center: [0, 0, z0 + height / 2],
    segments: TUBE_RESOLUTION
  });
}

function zCylinderElliptic(
  z0: number,
  height: number,
  startRadius: number,
  endRadius: number
): Geom3 {
  return cylinderElliptic({
    height,
    startRadius: [startRadius, startRadius],
    endRadius: [endRadius, endRadius],
    center: [0, 0, z0 + height / 2],
    segments: TUBE_RESOLUTION
  });
}

function restGeometryOnBed(geometry: Geom3): Geom3 {
  const bounds = measureBoundingBox(geometry);
  return translate([0, 0, -bounds[0][2]], geometry);
}

function orientPartForPrint(kind: Exclude<GameMatTubePartKind, 'label'>, geometry: Geom3): Geom3 {
  if (kind === 'top') {
    const bounds = measureBoundingBox(geometry);
    const height = bounds[1][2] - bounds[0][2];
    return restGeometryOnBed(translate([0, 0, height], rotateX(Math.PI, geometry)));
  }
  return restGeometryOnBed(geometry);
}

function orientLabelForPrint(geometry: Geom3): Geom3 {
  return restGeometryOnBed(geometry);
}

function createPatternCuts(
  outerDiameter: number,
  height: number,
  patternDepth: number,
  lanes: number,
  angleDeg: number,
  twistGain: number,
  lineWidth: number,
  z0: number,
  phaseZGlobal: number
): Geom3[] {
  const cuts: Geom3[] = [];
  if (height <= 0) {
    return cuts;
  }

  const radius = outerDiameter / 2 - patternDepth * 0.5;
  const circumference = 2 * Math.PI * radius;
  const laneCount = Math.max(16, lanes);
  const laneStepDeg = 360 / laneCount;
  const lead = circumference / Math.max(0.15, Math.tan((angleDeg * Math.PI) / 180));
  const twistDeg = 360 * (height / lead) * twistGain;
  const phaseDeg = -360 * (phaseZGlobal / lead) * twistGain;
  const grooveWidth = Math.max(0.75, lineWidth);
  const grooveRadial = Math.max(0.8, patternDepth * 2);
  const twistSteps = Math.max(72, Math.ceil(height * 2.8));
  const grooveShape = polygon({
    points: [
      [-grooveRadial / 2, -grooveWidth / 2],
      [grooveRadial / 2, -grooveWidth / 2],
      [grooveRadial / 2, grooveWidth / 2],
      [-grooveRadial / 2, grooveWidth / 2]
    ]
  }) as Geom2;

  const makeGroove = (rotationDeg: number, twistAngleDeg: number): Geom3 =>
    rotateZ(
      (rotationDeg * Math.PI) / 180,
      translate(
        [0, 0, z0],
        extrudeLinear(
          {
            height,
            twistAngle: (twistAngleDeg * Math.PI) / 180,
            twistSteps
          },
          translate([radius, 0, 0], grooveShape)
        )
      )
    );

  for (let i = 0; i < laneCount; i += 1) {
    const baseDeg = i * laneStepDeg;
    cuts.push(makeGroove(baseDeg + phaseDeg, twistDeg));
    cuts.push(makeGroove(baseDeg + laneStepDeg * 0.5 - phaseDeg, -twistDeg));
  }

  return cuts;
}

function getConnectorMajorDiameter(params: GameMatTubeParams): number {
  const outerDiameter = params.innerDiameterMm + params.wallThicknessMm * 2;
  const maxDiameter = outerDiameter - 2 * CONNECTOR_OUTER_MARGIN_MM;
  const threadMinWallCap = Math.max(0.6, params.wallThicknessMm - CONNECTOR_OUTER_MARGIN_MM - THREAD_DEPTH_MM);
  const threadMinWallEffective = Math.min(THREAD_MIN_WALL_MM, threadMinWallCap);
  const minDiameter = params.innerDiameterMm + 2 * (threadMinWallEffective + THREAD_DEPTH_MM);
  return minDiameter + (maxDiameter - minDiameter) * CONNECTOR_FIT_BIAS;
}

function createBeveledOuterBody(
  outerDiameter: number,
  height: number,
  bevelBottom: boolean,
  bevelTop: boolean
): Geom3 {
  const bottomBevel = bevelBottom ? Math.min(END_BASE_BEVEL_MM, height / 3) : 0;
  const topBevel = bevelTop ? Math.min(END_BASE_BEVEL_MM, height / 3) : 0;
  const midHeight = Math.max(height - bottomBevel - topBevel, 0);
  const parts: Geom3[] = [];

  if (bottomBevel > 0) {
    parts.push(zCylinderElliptic(0, bottomBevel, outerDiameter / 2 - bottomBevel, outerDiameter / 2));
  }

  if (midHeight > 0) {
    parts.push(zCylinder(bottomBevel, midHeight, outerDiameter / 2));
  }

  if (topBevel > 0) {
    parts.push(zCylinderElliptic(height - topBevel, topBevel, outerDiameter / 2, outerDiameter / 2 - topBevel));
  }

  return union(...parts);
}

function createTubeShell(
  outerDiameter: number,
  innerDiameter: number,
  height: number,
  capThickness: number,
  bevelBottom: boolean,
  bevelTop: boolean,
  capSide: 'bottom' | 'top' | 'none',
  params: GameMatTubeParams,
  pieceStackZ: number,
  protectLabelZone: boolean
): Geom3 {
  const outer = createBeveledOuterBody(outerDiameter, height, bevelBottom, bevelTop);
  const innerHeight = Math.max(height - (capSide === 'none' ? 0 : capThickness), 0.2);
  const innerTranslateZ =
    capSide === 'bottom' ? capThickness : capSide === 'top' ? 0 : 0;
  const hollow = zCylinder(innerTranslateZ, innerHeight, innerDiameter / 2);

  let shell = subtract(outer, hollow);
  if (params.surfacePattern) {
    const patternZ0 = (bevelBottom ? END_BASE_BEVEL_MM : 0);
    const patternZ1 = height - (bevelTop ? END_BASE_BEVEL_MM : 0);
    const patternHeight = patternZ1 - patternZ0;
    const cuts = createPatternCuts(
      outerDiameter,
      patternHeight,
      Math.min(params.patternDepthMm, params.wallThicknessMm * 0.5),
      params.patternLanes,
      params.patternAngle,
      params.patternTwistGain,
      params.patternLineWidth,
      patternZ0,
      pieceStackZ + patternZ0
    );
    if (cuts.length > 0) {
      let patternCutGeometry = union(...cuts);

      if (protectLabelZone) {
        const slotLength = getLabelSlotLength(params, height);
        const slotOpenWidth = Math.max(
          0.6,
          params.labelWidthMm + 2 * params.labelInsertClearanceMm - 2 * Math.max(0.2, LABEL_RAIL_BITE_MM)
        );
        const frameThickness = Math.max(2.8, LABEL_RAIL_BITE_MM + params.labelInsertClearanceMm + 1.8);
        const reinfWidth = slotOpenWidth + 2 * frameThickness;
        const slotZ0 = height - slotLength;
        const slotEntryHeight = Math.max(0.8, LABEL_INSERT_END_CLEARANCE_MM + 0.6);
        const railsZ1 = slotZ0 + Math.max(0.8, slotLength - slotEntryHeight);
        const reinfZ0 = Math.max(0, slotZ0 - 0.6);
        const reinfZ1 = Math.min(bevelTop ? height - END_BASE_BEVEL_MM : height, railsZ1);
        const keepoutZ0 = Math.max(patternZ0, reinfZ0 - Math.max(0.6, LABEL_FRAME_SIDE_BEVEL_MM));
        const keepoutZ1 = Math.min(patternZ1, reinfZ1 + 0.8);
        const keepoutHeight = keepoutZ1 - keepoutZ0;

        if (keepoutHeight > 0.2) {
          const keepoutDepth = Math.max(1.4, LABEL_FACE_RECESS_MM + params.patternDepthMm + 1.2);
          const keepout = translate(
            [outerDiameter / 2 - keepoutDepth / 2, 0, keepoutZ0 + keepoutHeight / 2],
            cuboid({ size: [keepoutDepth + 1.2, reinfWidth + 0.1, keepoutHeight + 0.04] })
          );
          patternCutGeometry = subtract(patternCutGeometry, keepout);
        }
      }

      shell = subtract(shell, patternCutGeometry);
    }
  }
  return shell;
}

function createMaleConnector(
  params: GameMatTubeParams,
  length: number,
  attachDiameter: number
): Geom3 {
  const majorDiameter = getConnectorMajorDiameter(params);
  const innerDiameter = params.innerDiameterMm;
  const connectorCoreDiameter = majorDiameter - 2 * THREAD_DEPTH_MM;
  const threadSolid = createHelicalThreadSolid(majorDiameter, length, THREAD_DEPTH_MM);

  const pieces: Geom3[] = [
    zCylinder(0, length, connectorCoreDiameter / 2),
    zCylinderElliptic(0, THREAD_SHOULDER_BLEND_MM + THREAD_UNION_OVERLAP_MM, attachDiameter / 2, majorDiameter / 2),
    threadSolid,
    zCylinderElliptic(0, THREAD_START_TAPER_MM, (majorDiameter - THREAD_DEPTH_MM) / 2, majorDiameter / 2),
    zCylinderElliptic(Math.max(0, length - THREAD_START_TAPER_MM), THREAD_START_TAPER_MM, majorDiameter / 2, (majorDiameter - THREAD_DEPTH_MM) / 2)
  ];

  return subtract(
    union(...pieces),
    zCylinder(-0.1, length + 0.2, innerDiameter / 2)
  );
}

function createFemaleSocketCut(
  params: GameMatTubeParams,
  length: number,
  partHeight: number,
  includeLabelSlot: boolean
): Geom3[] {
  const cuts: Geom3[] = [];
  const outerDiameter = params.innerDiameterMm + params.wallThicknessMm * 2;
  const majorDiameter = getConnectorMajorDiameter(params);

  cuts.push(
    zCylinder(-0.05, length + 0.1, (majorDiameter + params.threadClearanceMm) / 2)
  );

  cuts.push(
    createHelicalThreadSolid(
      majorDiameter + params.threadClearanceMm,
      length + 0.02,
      THREAD_DEPTH_MM + 0.35 * params.threadClearanceMm
    )
  );

  cuts.push(
    zCylinderElliptic(
      -0.05,
      1.2,
      (majorDiameter + params.threadClearanceMm + 0.7) / 2,
      (majorDiameter + params.threadClearanceMm) / 2
    )
  );

  if (includeLabelSlot && params.labelEnabled) {
    const slotInnerWidth = params.labelWidthMm + params.labelInsertClearanceMm * 2;
    const slotLipBite = Math.max(0.2, LABEL_RAIL_BITE_MM);
    const slotOpenWidth = Math.max(0.6, slotInnerWidth - slotLipBite * 2);
    const slotLength = getLabelSlotLength(params, partHeight);
    const slotZ0 = partHeight - slotLength;
    const slotEntryHeight = Math.max(0.8, LABEL_INSERT_END_CLEARANCE_MM + 0.6);
    const slotDepthFace = Math.max(0.45, Math.min(1.2, LABEL_FACE_RECESS_MM));
    const slotDepthEntry = Math.max(0.25, LABEL_FACE_RECESS_MM);
    const slotDepthChannel = slotDepthFace + params.labelThicknessMm + params.labelInsertClearanceMm;
    const slotDepthInnerOnly = Math.max(0.2, slotDepthChannel - slotDepthFace);
    const slotFaceX0 = outerDiameter / 2 - slotDepthFace - 0.02;
    const slotEntryX0 = outerDiameter / 2 - slotDepthEntry - 0.02;
    const slotChannelX0 = outerDiameter / 2 - slotDepthChannel - 0.02;

    cuts.push(
      translate(
        [slotChannelX0 + slotDepthInnerOnly / 2, 0, slotZ0 + slotLength / 2],
        cuboid({
          size: [slotDepthInnerOnly + 0.08, slotInnerWidth, slotLength + 0.02]
        })
      )
    );

    cuts.push(
      translate(
        [slotFaceX0 + (slotDepthFace + 0.06) / 2, 0, slotZ0 + Math.max(0.02, slotLength - slotEntryHeight + 0.03) / 2],
        cuboid({
          size: [slotDepthFace + 0.06, slotOpenWidth, Math.max(0.02, slotLength - slotEntryHeight + 0.03)]
        })
      )
    );

    cuts.push(
      translate(
        [slotEntryX0 + (slotDepthEntry + 0.06) / 2, 0, slotZ0 + slotLength - slotEntryHeight / 2],
        cuboid({
          size: [slotDepthEntry + 0.06, slotInnerWidth, slotEntryHeight + 0.02]
        })
      )
    );

    if (params.labelSnapEnabled) {
      const snapWidth = Math.max(2, Math.min(slotInnerWidth - 0.4, params.labelWidthMm * LABEL_SNAP_WIDTH_FACTOR));
      const snapZ2 = slotZ0 + slotLength - LABEL_SNAP_OFFSET_MM;
      const snapZ1 = Math.max(slotZ0 + 0.4, snapZ2 - LABEL_SNAP_LENGTH_MM);
      const snapDepth = LABEL_SNAP_HEIGHT_MM + params.labelInsertClearanceMm;
      const snapWallX = slotChannelX0;
      const snapRamp = hull(
        translate(
          [snapWallX - 0.005, 0, snapZ1 + 0.01],
          cuboid({ size: [0.03, snapWidth, 0.02] })
        ),
        translate(
          [snapWallX - snapDepth / 2 - 0.02, 0, snapZ2 - 0.01],
          cuboid({ size: [snapDepth + 0.04, snapWidth, 0.02] })
        )
      );
      const snapStop = translate(
        [snapWallX - snapDepth / 2 - 0.02, 0, snapZ2 - 0.1],
        cuboid({ size: [snapDepth + 0.04, snapWidth, 0.24] })
      );
      cuts.push(union(snapRamp, snapStop));
    }
  }

  return cuts;
}

function createLabelFrameGeometry(params: GameMatTubeParams, outerDiameter: number, partHeight: number, bevelTop: boolean): Geom3 | null {
  if (!params.labelEnabled) {
    return null;
  }

  const slotInnerWidth = params.labelWidthMm + 2 * params.labelInsertClearanceMm;
  const slotOpenWidth = Math.max(0.6, slotInnerWidth - 2 * Math.max(0.2, LABEL_RAIL_BITE_MM));
  const slotLength = getLabelSlotLength(params, partHeight);
  const slotZ0 = partHeight - slotLength;
  const frameDepth = Math.max(0.4, LABEL_FRAME_DEPTH_MM);
  const frameThickness = Math.max(2.8, LABEL_RAIL_BITE_MM + params.labelInsertClearanceMm + 1.8);
  const frameZ0 = Math.max(0, slotZ0 - frameThickness);
  const frameZ1 = Math.min(bevelTop ? partHeight - END_BASE_BEVEL_MM : partHeight, slotZ0 + slotLength + 0.6);
  const frameHeight = Math.max(0.8, frameZ1 - frameZ0);
  const windowWidth = slotOpenWidth;
  const frameWidth = windowWidth + 2 * frameThickness;
  const windowHeight = Math.max(0.6, frameHeight - frameThickness);
  const outerRadius = outerDiameter / 2;
  const thetaOuter = Math.asin(Math.min(0.999, (frameWidth / 2) / Math.max(0.01, outerRadius)));
  const thetaWindow = Math.asin(Math.min(0.999, (windowWidth / 2) / Math.max(0.01, outerRadius)));
  const endBevel = Math.min(Math.max(0.2, LABEL_FRAME_SIDE_BEVEL_MM), frameHeight / 3, frameDepth * 1.2);
  const sideBevel = Math.min(Math.max(0.2, LABEL_FRAME_SIDE_BEVEL_MM), frameThickness * 0.95, frameDepth * 4);
  const sideBevelTheta = Math.max(0.6, Math.min(thetaOuter * 0.85, sideBevel / Math.max(0.01, outerRadius)));
  const cutThetaOverscan = 0.35 * Math.PI / 180;
  const sideBevelShell = Math.max(0.35, Math.min(frameDepth * 0.9, 0.35 + 0.2 * sideBevel));
  const cutRIn = Math.max(outerRadius + 0.02, outerRadius + frameDepth - sideBevelShell);
  const cutROut = outerRadius + frameDepth + 0.2;

  const outerProfile = polygon({
    points: [
      [outerRadius - 0.02, frameZ0],
      [outerRadius + frameDepth + 0.04, frameZ0 + endBevel],
      [outerRadius + frameDepth + 0.04, frameZ0 + frameHeight - endBevel],
      [outerRadius - 0.02, frameZ0 + frameHeight]
    ]
  }) as Geom2;

  const innerProfile = polygon({
    points: [
      [outerRadius - 0.08, frameZ0 + frameThickness],
      [outerRadius + frameDepth + 0.1, frameZ0 + frameThickness],
      [outerRadius + frameDepth + 0.1, frameZ0 + frameThickness + windowHeight],
      [outerRadius - 0.08, frameZ0 + frameThickness + windowHeight]
    ]
  }) as Geom2;

  const frameBody = subtract(
    extrudeRotate(
      { startAngle: -thetaOuter, angle: thetaOuter * 2, segments: TUBE_RESOLUTION },
      outerProfile
    ),
    extrudeRotate(
      { startAngle: -thetaWindow, angle: thetaWindow * 2, segments: TUBE_RESOLUTION },
      innerProfile
    )
  );

  const makeSideBevelCut = (sign: -1 | 1): Geom3 =>
    extrudeLinear(
      { height: frameHeight + 0.04 },
      polygon({
        points: [
          [
            cutRIn * Math.cos(sign * (thetaOuter + cutThetaOverscan)),
            cutRIn * Math.sin(sign * (thetaOuter + cutThetaOverscan))
          ],
          [
            cutROut * Math.cos(sign * (thetaOuter - sideBevelTheta)),
            cutROut * Math.sin(sign * (thetaOuter - sideBevelTheta))
          ],
          [
            cutROut * Math.cos(sign * (thetaOuter + cutThetaOverscan)),
            cutROut * Math.sin(sign * (thetaOuter + cutThetaOverscan))
          ]
        ]
      }) as Geom2
    );

  return subtract(
    frameBody,
    translate([0, 0, frameZ0 - 0.02], makeSideBevelCut(1)),
    translate([0, 0, frameZ0 - 0.02], makeSideBevelCut(-1))
  );
}

function createLabelGeometry(params: GameMatTubeParams, outerDiameter: number): Geom3 {
  const pieceCount = computeGameMatTubePieceCount(params);
  const jointOverlapLength = params.threadLengthMm - MALE_THREAD_SHORTFALL_MM;
  const visibleHeight = params.totalLengthMm / pieceCount;
  const pieceHeightMale = physicalPieceHeight(params.totalLengthMm, jointOverlapLength, pieceCount, params.equalizeVisibleHeights);
  const pieceHeightTop = getPieceHeightTop(pieceHeightMale, visibleHeight, params.equalizeVisibleHeights);
  const labelLength = getLabelTagLength(params, pieceHeightTop);
  let plateGeometry = translate(
    [0, 0, params.labelThicknessMm / 2],
    cuboid({ size: [params.labelWidthMm, labelLength, params.labelThicknessMm] })
  );
  const chamferHeight = Math.min(LABEL_END_CHAMFER_MM, labelLength / 3, params.labelThicknessMm);
  const frontChamfer = translate(
    [0, -labelLength / 2 - 0.01, params.labelThicknessMm - chamferHeight / 2],
    rotateX(
      Math.PI / 2,
      extrudeLinear({
        height: params.labelWidthMm + 0.04
      }, polygon({
        points: [
          [0, 0],
          [chamferHeight + 0.02, 0],
          [0, chamferHeight + 0.02]
        ]
      }))
    )
  );
  const backChamfer = translate(
    [0, labelLength / 2 + 0.01, params.labelThicknessMm - chamferHeight / 2],
    rotateX(
      Math.PI / 2,
      extrudeLinear({
        height: params.labelWidthMm + 0.04
      }, polygon({
        points: [
          [0, 0],
          [0, -chamferHeight - 0.02],
          [chamferHeight + 0.02, 0]
        ]
      }))
    )
  );
  plateGeometry = subtract(plateGeometry, frontChamfer, backChamfer);

  const snap = params.labelSnapEnabled
    ? hull(
        translate(
          [0, labelLength / 2 - LABEL_SNAP_OFFSET_MM - LABEL_SNAP_LENGTH_MM / 2, params.labelThicknessMm + 0.01],
          cuboid({
            size: [Math.max(2, Math.min(params.labelWidthMm - 0.4, params.labelWidthMm * LABEL_SNAP_WIDTH_FACTOR)), 0.02, 0.02]
          })
        ),
        translate(
          [0, labelLength / 2 - LABEL_SNAP_OFFSET_MM, params.labelThicknessMm + LABEL_SNAP_HEIGHT_MM / 2],
          cuboid({
            size: [Math.max(2, Math.min(params.labelWidthMm - 0.4, params.labelWidthMm * LABEL_SNAP_WIDTH_FACTOR)), 0.02, LABEL_SNAP_HEIGHT_MM]
          })
        )
      )
    : null;

  return rotateZ(
    Math.PI / 2,
    translate(
      [0, outerDiameter / 2 + 8, 0],
      snap ? union(plateGeometry, snap) : plateGeometry
    )
  );
}

function createTubePartGeometry(
  kind: Exclude<GameMatTubePartKind, 'label'>,
  params: GameMatTubeParams,
  partHeight: number,
  pieceStackZ: number
): Geom3 {
  const outerDiameter = params.innerDiameterMm + params.wallThicknessMm * 2;
  const maleThreadLength = Math.max(4, params.threadLengthMm - MALE_THREAD_SHORTFALL_MM);
  const shellHeight = kind === 'top' ? partHeight : partHeight - maleThreadLength;
  const bevelBottom = kind === 'bottom';
  const bevelTop = kind === 'top';
  const shell = createTubeShell(
    outerDiameter,
    params.innerDiameterMm,
    shellHeight,
    END_CAP_THICKNESS_MM,
    bevelBottom,
    bevelTop,
    kind === 'bottom' ? 'bottom' : kind === 'top' ? 'top' : 'none',
    params,
    pieceStackZ,
    kind === 'top'
  );

  const pieces: Geom3[] = [shell];

  if (kind === 'top' && params.labelEnabled) {
    const labelFrame = createLabelFrameGeometry(params, outerDiameter, shellHeight, true);
    if (labelFrame) {
      pieces.push(labelFrame);
    }
  }

  if (kind !== 'top') {
    pieces.push(
      translate(
        [0, 0, shellHeight - THREAD_UNION_OVERLAP_MM + THREAD_SHOULDER_BLEND_MM],
        createMaleConnector(params, maleThreadLength + THREAD_UNION_OVERLAP_MM - THREAD_SHOULDER_BLEND_MM, outerDiameter)
      )
    );
  }

  let result = union(...pieces);

  if (kind !== 'bottom') {
    result = subtract(result, ...createFemaleSocketCut(params, params.threadLengthMm, shellHeight, kind === 'top'));
  }

  return result;
}

export function getGameMatTubeDimensions(params: GameMatTubeParams): GameMatTubeDimensions {
  const normalized = normalizeGameMatTubeParams(params);
  const pieceCount = computeGameMatTubePieceCount(normalized);
  return {
    outerDiameter: normalized.innerDiameterMm + normalized.wallThicknessMm * 2,
    totalLength: normalized.totalLengthMm,
    pieceCount,
    assembledHeight: normalized.totalLengthMm
  };
}

export function getGameMatTubePartFilename(baseName: string, kind: GameMatTubePartKind, index: number): string {
  const slug = slugify(baseName);
  if (kind === 'middle') {
    return `${slug}-middle-${index}.stl`;
  }
  if (kind === 'label') {
    return `${slug}-label-${index}.stl`;
  }
  return `${slug}-${kind}.stl`;
}

export function createGameMatTubeParts(params: GameMatTubeParams, name: string = 'Game Mat Tube'): GameMatTubePart[] {
  const normalized = normalizeGameMatTubeParams(params);
  const pieceCount = computeGameMatTubePieceCount(normalized);
  const visibleHeight = normalized.totalLengthMm / pieceCount;
  const jointOverlapLength = normalized.threadLengthMm - MALE_THREAD_SHORTFALL_MM;
  const pieceHeightMale = physicalPieceHeight(
    normalized.totalLengthMm,
    jointOverlapLength,
    pieceCount,
    normalized.equalizeVisibleHeights
  );
  const pieceHeightTop = getPieceHeightTop(pieceHeightMale, visibleHeight, normalized.equalizeVisibleHeights);
  const outerDiameter = normalized.innerDiameterMm + normalized.wallThicknessMm * 2;
  const parts: GameMatTubePart[] = [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(pieceCount)));
  const rows = Math.max(1, Math.ceil(pieceCount / cols));
  const stepX = normalized.bedSizeXMm / cols;
  const stepY = normalized.bedSizeYMm / rows;

  for (let index = 0; index < pieceCount; index += 1) {
    const kind: Exclude<GameMatTubePartKind, 'label'> =
      index === 0 ? 'bottom' : index === pieceCount - 1 ? 'top' : 'middle';
    const partHeight = kind === 'top' ? pieceHeightTop : pieceHeightMale;
    const pieceStackZ = index * (pieceHeightMale - jointOverlapLength);
    const geometry = createTubePartGeometry(
      kind,
      normalized,
      partHeight,
      pieceStackZ
    );
    const printGeometry = orientPartForPrint(kind, geometry);
    const dimensions = getPartDimensions(printGeometry);
    parts.push({
      id: `${kind}-${index + 1}`,
      name: kind === 'middle' ? `${name} Middle ${index}` : `${name} ${kind[0].toUpperCase()}${kind.slice(1)}`,
      kind,
      geometry,
      printGeometry,
      dimensions,
      assembledPosition: {
        x: 0,
        y: 0,
        z: pieceStackZ
      },
      suggestedPrintPosition: {
        x: -normalized.bedSizeXMm / 2 + stepX * ((index % cols) + 0.5),
        y: -normalized.bedSizeYMm / 2 + stepY * (Math.floor(index / cols) + 0.5),
        rotation: 90
      }
    });
  }

  if (normalized.labelEnabled) {
    const geometry = createLabelGeometry(normalized, outerDiameter);
    const printGeometry = orientLabelForPrint(geometry);
    const tagStep = normalized.labelWidthMm + 8;
    const tagTotalWidth = normalized.labelWidthMm;
    const partRadius = outerDiameter / 2;
    const partsYMinCenter = -normalized.bedSizeYMm / 2 + stepY * 0.5;
    const partsYMaxCenter = -normalized.bedSizeYMm / 2 + stepY * (rows - 0.5);
    const partsYMin = partsYMinCenter - partRadius;
    const partsYMax = partsYMaxCenter + partRadius;
    const tagHeight = getLabelTagLength(normalized, pieceHeightTop);
    const tagGap = Math.max(4, 4);
    const tagYBelow = partsYMin - tagGap - tagHeight;
    const tagYAbove = partsYMax + tagGap;
    const fitBelow = tagYBelow >= -normalized.bedSizeYMm / 2;
    const fitAbove = tagYAbove + tagHeight <= normalized.bedSizeYMm / 2;
    const tagY = fitBelow
      ? tagYBelow
      : fitAbove
        ? tagYAbove
        : Math.max(-normalized.bedSizeYMm / 2 + 2, Math.min(normalized.bedSizeYMm / 2 - tagHeight - 2, partsYMin - tagHeight - 2));

    parts.push({
      id: 'label-1',
      name: `${name} Label`,
      kind: 'label',
      geometry,
      printGeometry,
      dimensions: getPartDimensions(printGeometry),
      assembledPosition: {
        x: outerDiameter / 2 - LABEL_FACE_RECESS_MM - normalized.labelThicknessMm / 2,
        y: 0,
        z: Math.max(
          getLabelThreadRestrictedBase(normalized) + LABEL_SLOT_Z_MARGIN_MM + LABEL_BOTTOM_KEEPOUT_MM,
          (pieceCount - 1) * (pieceHeightMale - jointOverlapLength) + pieceHeightTop - getLabelSlotLength(normalized, pieceHeightTop)
        )
      },
      suggestedPrintPosition: {
        x: -tagTotalWidth / 2 + tagStep * 0,
        y: tagY + tagHeight / 2,
        rotation: 0
      }
    });
  }

  return parts;
}

export function createGameMatTubePreview(params: GameMatTubeParams, mode: GameMatTubePreviewMode): Geom3 {
  const parts = createGameMatTubeParts(params);
  if (parts.length === 0) {
    return cuboid({ size: [1, 1, 1] });
  }

  const previewParts = parts.map((part) => {
    if (mode === 'assembled' && part.assembledPosition) {
      return translate([part.assembledPosition.x, part.assembledPosition.y, part.assembledPosition.z], part.geometry);
    }
    if (mode === 'printBed' && part.suggestedPrintPosition) {
      const rotated =
        part.suggestedPrintPosition.rotation === 90 ? rotateZ(Math.PI / 2, part.printGeometry) : part.printGeometry;
      return translate([part.suggestedPrintPosition.x, part.suggestedPrintPosition.y, 0], rotated);
    }
    return part.geometry;
  });

  return union(...previewParts);
}
