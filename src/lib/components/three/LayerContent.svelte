<script lang="ts">
  /**
   * LayerContent - Renders a layer's content: boxes and loose trays arranged on the game container footprint.
   * Parent provides vertical position via T.Group wrapping.
   * Internal positioning is relative to the layer's local origin.
   */
  import { T } from '@threlte/core';
  import { Text, type IntersectionEvent } from '@threlte/extras';
  import * as THREE from 'three';
  import BoxAssembly from './BoxAssembly.svelte';
  import DimensionOverlay from './DimensionOverlay.svelte';
  import GapDimensionOverlay from './GapDimensionOverlay.svelte';
  import TrayInBox from './TrayInBox.svelte';
  import type { BoardPlacement, BoxPlacement, LooseTrayPlacement } from '$lib/models/layer';
  import type { TrayPlacement } from '$lib/models/box';
  import type { CounterStack } from '$lib/models/counterTray';
  import { TRAY_COLORS, getProject } from '$lib/stores/project.svelte';

  interface TrayGeometryData {
    trayId: string;
    name: string;
    color: string;
    geometry: THREE.BufferGeometry;
    placement: TrayPlacement;
    counterStacks: CounterStack[];
    trayLetter?: string;
  }

  interface BoxGeometryData {
    boxId: string;
    boxName: string;
    boxGeometry: THREE.BufferGeometry | null;
    lidGeometry: THREE.BufferGeometry | null;
    lidTextInlayGeometry?: THREE.BufferGeometry | null;
    trayGeometries: TrayGeometryData[];
    boxDimensions: { width: number; depth: number; height: number };
  }

  interface LooseTrayGeometryData {
    trayId: string;
    layerId: string;
    name: string;
    color: string;
    geometry: THREE.BufferGeometry;
    dimensions: { width: number; depth: number; height: number };
    counterStacks: CounterStack[];
    trayLetter: string;
  }

  interface LayeredBoxSectionGeometryData {
    sectionId: string;
    internalLayerId: string;
    name: string;
    type: 'counter' | 'cardDraw' | 'cardDivider' | 'cardWell' | 'cup' | 'playerBoard';
    color: string;
    geometry: THREE.BufferGeometry;
    dimensions: { width: number; depth: number; height: number };
    counterStacks: CounterStack[];
    x: number;
    y: number;
    z: number;
  }

  interface LayeredBoxGeometryData {
    shellGeometry: THREE.BufferGeometry;
    lidGeometry: THREE.BufferGeometry;
    lidTextInlayGeometry: THREE.BufferGeometry | null;
    assemblyTrayGeometries: TrayGeometryData[];
    internalLayers: Array<{
      id: string;
      geometry: THREE.BufferGeometry | null;
      width: number;
      depth: number;
      height: number;
      z: number;
      color: string;
      fillSolidEmpty: boolean;
    }>;
    layeredBoxId: string;
    proxyBoardId: string;
    name: string;
    color: string;
    tolerance: number;
    floorThickness: number;
    wallThickness: number;
    lidThickness: number;
    interiorDimensions: { width: number; depth: number; height: number };
    dimensions: { width: number; depth: number; height: number; bodyHeight: number };
    sections: LayeredBoxSectionGeometryData[];
  }

  interface TrayClickInfo {
    trayId: string;
    name: string;
    letter: string;
    width: number;
    depth: number;
    height: number;
    color: string;
    type?: 'tray' | 'box';
  }

  interface SizePreviewRect {
    id: string;
    centerX: number;
    centerZ: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    height: number;
  }

  interface GapOverlayData {
    id: string;
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    y: number;
    kind?: 'edge' | 'between';
    labelT?: number;
    labelOffset?: number;
  }

  interface Range {
    min: number;
    max: number;
  }

  interface LabelAnchor {
    axis: 'x' | 'z';
    x: number;
    z: number;
  }

  interface Props {
    boxPlacements: BoxPlacement[];
    looseTrayPlacements: LooseTrayPlacement[];
    boardPlacements: BoardPlacement[];
    layeredBoxes: LayeredBoxGeometryData[];
    allBoxGeometries: BoxGeometryData[];
    allLooseTrayGeometries: LooseTrayGeometryData[];
    gameContainerWidth: number;
    gameContainerDepth: number;
    printBedSize: number;
    wallThickness?: number;
    tolerance?: number;
    floorThickness?: number;
    showCounters?: boolean;
    showLid?: boolean;
    selectionType?: string;
    selectedLayeredBoxId?: string;
    selectedLayeredBoxLayerId?: string;
    selectedLayeredBoxSectionId?: string;
    layerName?: string;
    layerHeight?: number;
    showLabel?: boolean;
    showSizePreview?: boolean;
    labelQuaternion?: [number, number, number, number];
    monoFont?: string;
    onTrayClick?: (info: TrayClickInfo | null) => void;
    onTrayDoubleClick?: (trayId: string) => void;
    onBoxDoubleClick?: (boxId: string) => void;
    horizontalExplosion?: number; // 0 = no explosion, 1 = full explosion
    layerBaseOffset?: number; // Base offset for entire layer (higher layers get pushed out more)
  }

  let {
    boxPlacements,
    looseTrayPlacements,
    boardPlacements,
    layeredBoxes,
    allBoxGeometries,
    allLooseTrayGeometries,
    gameContainerWidth,
    gameContainerDepth,
    printBedSize,
    wallThickness = 3,
    tolerance = 0.5,
    floorThickness = 2,
    showCounters = false,
    showLid = true,
    selectionType = 'dimensions',
    selectedLayeredBoxId = '',
    selectedLayeredBoxLayerId = '',
    selectedLayeredBoxSectionId = '',
    layerName = '',
    layerHeight = 0,
    showLabel = false,
    showSizePreview = false,
    labelQuaternion = [0, 0, 0, 1],
    monoFont = '/fonts/JetBrainsMono-Regular.ttf',
    onTrayClick,
    onTrayDoubleClick,
    onBoxDoubleClick,
    horizontalExplosion = 0,
    layerBaseOffset = 0
  }: Props = $props();

  // Layer content offset (center on game container)
  let layerOffsetX = $derived(-gameContainerWidth / 2);
  let layerOffsetZ = $derived(printBedSize / 2 + gameContainerDepth / 2);

  function getDimensionOverlaySides(centerX: number, centerZ: number, width: number, depth: number) {
    const minX = layerOffsetX;
    const maxX = layerOffsetX + gameContainerWidth;
    const maxZ = layerOffsetZ;
    const minZ = layerOffsetZ - gameContainerDepth;

    const leftGap = centerX - width / 2 - minX;
    const rightGap = maxX - (centerX + width / 2);
    const backGap = centerZ - depth / 2 - minZ;
    const frontGap = maxZ - (centerZ + depth / 2);

    return {
      depthSide: leftGap <= rightGap ? ('negative' as const) : ('positive' as const),
      widthSide: backGap <= frontGap ? ('negative' as const) : ('positive' as const)
    };
  }

  // Get live tray color from project store
  function getTrayColor(trayId: string, fallbackColor: string): string {
    const project = getProject();
    for (const layer of project.layers) {
      for (const box of layer.boxes) {
        const tray = box.trays.find((t) => t.id === trayId);
        if (tray?.color) return tray.color;
      }
      const looseTray = layer.looseTrays.find((t) => t.id === trayId);
      if (looseTray?.color) return looseTray.color;
    }
    return fallbackColor;
  }

  function getLayeredBoxLayerColor(baseColor: string, index: number): string {
    const color = new THREE.Color(baseColor);
    const offset = Math.min(index * 0.08, 0.24);
    color.offsetHSL(0, 0, offset);
    return `#${color.getHexString()}`;
  }

  function getGeomBounds(geometry: THREE.BufferGeometry | null): THREE.Box3 | null {
    if (!geometry) return null;
    geometry.computeBoundingBox();
    return geometry.boundingBox;
  }

  function createPreviewRect(
    id: string,
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
    height: number
  ): SizePreviewRect {
    return {
      id,
      centerX,
      centerZ,
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      minZ: centerZ - depth / 2,
      maxZ: centerZ + depth / 2,
      height
    };
  }

  function getOverlapRange(aMin: number, aMax: number, bMin: number, bMax: number): Range | null {
    const min = Math.max(aMin, bMin);
    const max = Math.min(aMax, bMax);
    return max > min ? { min, max } : null;
  }

  function getDimensionLabelAnchors(rect: SizePreviewRect): LabelAnchor[] {
    const sides = getDimensionOverlaySides(rect.centerX, rect.centerZ, rect.maxX - rect.minX, rect.maxZ - rect.minZ);
    const widthSideSign = sides.widthSide === 'positive' ? 1 : -1;
    const depthSideSign = sides.depthSide === 'positive' ? 1 : -1;
    const width = rect.maxX - rect.minX;
    const depth = rect.maxZ - rect.minZ;

    return [
      {
        axis: 'x',
        x: rect.centerX,
        z: rect.centerZ + (depth / 2) * widthSideSign
      },
      {
        axis: 'z',
        x: rect.centerX + (width / 2) * depthSideSign,
        z: rect.centerZ
      }
    ];
  }

  function subtractRanges(source: Range[], blocker: Range): Range[] {
    const result: Range[] = [];
    for (const range of source) {
      if (blocker.max <= range.min || blocker.min >= range.max) {
        result.push(range);
        continue;
      }
      if (blocker.min > range.min) {
        result.push({ min: range.min, max: blocker.min });
      }
      if (blocker.max < range.max) {
        result.push({ min: blocker.max, max: range.max });
      }
    }
    return result.filter((range) => range.max - range.min > 0.1);
  }

  // Calculate max height across all visible layer items for label positioning
  let maxItemHeight = $derived.by(() => {
    const boxHeight = boxPlacements.reduce((max, bp) => Math.max(max, bp.dimensions.height), 0);
    const trayHeight = looseTrayPlacements.reduce((max, tp) => Math.max(max, tp.dimensions.height), 0);
    const boardHeight = boardPlacements.reduce((max, bp) => Math.max(max, bp.dimensions.height), 0);
    return Math.max(boxHeight, trayHeight, boardHeight, 0);
  });

  // Calculate explosion offset for an item based on its position relative to container center
  function calculateExplosionOffset(
    itemCenterX: number,
    itemCenterZ: number,
    containerWidth: number,
    containerDepth: number,
    explosionPhase: number
  ): { offsetX: number; offsetZ: number } {
    if (explosionPhase <= 0 && layerBaseOffset <= 0) return { offsetX: 0, offsetZ: 0 };

    // Calculate item center relative to container center
    const centerX = itemCenterX - containerWidth / 2;
    const centerZ = itemCenterZ - containerDepth / 2;

    // Explosion distance scales with phase (max 100mm at edges)
    // Higher layers get a larger explosionPhase multiplier from parent
    const explosionDistance = 100 * explosionPhase;

    // Scale by distance from center (items further from center move more)
    const normalizedX = centerX / (containerWidth / 2);
    const normalizedZ = centerZ / (containerDepth / 2);

    // Base offset pushes all items outward from center based on their direction
    // This ensures higher layers always move farther out regardless of item position
    const directionX = centerX === 0 ? 0 : centerX > 0 ? 1 : -1;
    const directionZ = centerZ === 0 ? 0 : centerZ > 0 ? 1 : -1;
    // If item is exactly at center, push it diagonally outward
    const baseX = directionX === 0 && directionZ === 0 ? layerBaseOffset * 0.707 : directionX * layerBaseOffset;
    const baseZ = directionX === 0 && directionZ === 0 ? layerBaseOffset * 0.707 : directionZ * layerBaseOffset;

    return {
      offsetX: normalizedX * explosionDistance + baseX,
      offsetZ: normalizedZ * explosionDistance + baseZ
    };
  }

  const previewRects = $derived.by(() => {
    const boxRects = boxPlacements.map((boxPlacement) => {
      const itemCenterX = boxPlacement.x + boxPlacement.dimensions.width / 2;
      const itemCenterZ = boxPlacement.y + boxPlacement.dimensions.depth / 2;
      const explosion = calculateExplosionOffset(
        itemCenterX,
        itemCenterZ,
        gameContainerWidth,
        gameContainerDepth,
        horizontalExplosion
      );
      return createPreviewRect(
        boxPlacement.box.id,
        layerOffsetX + itemCenterX + explosion.offsetX,
        layerOffsetZ - itemCenterZ - explosion.offsetZ,
        boxPlacement.dimensions.width,
        boxPlacement.dimensions.depth,
        boxPlacement.dimensions.height
      );
    });

    const boardRects = boardPlacements.map((boardPlacement) => {
      const itemCenterX = boardPlacement.x + boardPlacement.dimensions.width / 2;
      const itemCenterZ = boardPlacement.y + boardPlacement.dimensions.depth / 2;
      const explosion = calculateExplosionOffset(
        itemCenterX,
        itemCenterZ,
        gameContainerWidth,
        gameContainerDepth,
        horizontalExplosion
      );
      const layeredBoxGeometry = layeredBoxes.find((entry) => entry.proxyBoardId === boardPlacement.board.id);
      const height = layeredBoxGeometry
        ? Math.max(layeredBoxGeometry.dimensions.height - layeredBoxGeometry.wallThickness, 0)
        : boardPlacement.dimensions.height;
      return createPreviewRect(
        boardPlacement.board.id,
        layerOffsetX + itemCenterX + explosion.offsetX,
        layerOffsetZ - itemCenterZ - explosion.offsetZ,
        boardPlacement.dimensions.width,
        boardPlacement.dimensions.depth,
        height
      );
    });

    const trayRects = looseTrayPlacements.map((trayPlacement) => {
      const itemCenterX = trayPlacement.x + trayPlacement.dimensions.width / 2;
      const itemCenterZ = trayPlacement.y + trayPlacement.dimensions.depth / 2;
      const explosion = calculateExplosionOffset(
        itemCenterX,
        itemCenterZ,
        gameContainerWidth,
        gameContainerDepth,
        horizontalExplosion
      );
      return createPreviewRect(
        trayPlacement.tray.id,
        layerOffsetX + itemCenterX + explosion.offsetX,
        layerOffsetZ - itemCenterZ - explosion.offsetZ,
        trayPlacement.dimensions.width,
        trayPlacement.dimensions.depth,
        trayPlacement.dimensions.height
      );
    });

    return [...boxRects, ...boardRects, ...trayRects];
  });

  const gapOverlays = $derived.by(() => {
    if (!showSizePreview) return [] as GapOverlayData[];

    const overlays: GapOverlayData[] = [];
    const seen = new Set<string>();
    const layerMinX = layerOffsetX;
    const layerMaxX = layerOffsetX + gameContainerWidth;
    const layerMinZ = layerOffsetZ - gameContainerDepth;
    const layerMaxZ = layerOffsetZ;

    const pushOverlay = (overlay: GapOverlayData) => {
      const length = Math.hypot(overlay.endX - overlay.startX, overlay.endZ - overlay.startZ);
      if (length < 0.1) return;

      const axis = Math.abs(overlay.endX - overlay.startX) >= Math.abs(overlay.endZ - overlay.startZ) ? 'x' : 'z';
      const a =
        axis === 'x'
          ? { p: Math.min(overlay.startX, overlay.endX), s: overlay.startZ }
          : { p: Math.min(overlay.startZ, overlay.endZ), s: overlay.startX };
      const b =
        axis === 'x'
          ? { p: Math.max(overlay.startX, overlay.endX), s: overlay.endZ }
          : { p: Math.max(overlay.startZ, overlay.endZ), s: overlay.endX };
      const geometryKey = `${axis}:${a.p.toFixed(1)}:${a.s.toFixed(1)}:${b.p.toFixed(1)}:${b.s.toFixed(1)}`;

      if (seen.has(geometryKey)) return;
      seen.add(geometryKey);
      overlays.push(overlay);
    };

    for (const item of previewRects) {
      const rightCandidates = previewRects
        .filter((other) => other.id !== item.id && other.minX >= item.maxX)
        .map((other) => ({ other, overlap: getOverlapRange(item.minZ, item.maxZ, other.minZ, other.maxZ) }))
        .filter((entry): entry is { other: SizePreviewRect; overlap: Range } => entry.overlap !== null)
        .sort((a, b) => a.other.minX - b.other.minX);
      let uncoveredRight: Range[] = [{ min: item.minZ, max: item.maxZ }];
      for (const candidate of rightCandidates) {
        const visibleRanges = subtractRanges(uncoveredRight, { min: -Infinity, max: candidate.overlap.min }).flatMap((r) =>
          subtractRanges([r], { min: candidate.overlap.max, max: Infinity })
        );
        for (const range of visibleRanges) {
        pushOverlay({
          id: `gap-x:${item.id}:${candidate.other.id}:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: item.maxX,
          startZ: (range.min + range.max) / 2,
          endX: candidate.other.minX,
          endZ: (range.min + range.max) / 2,
          y: 0.6,
          kind: 'between'
        });
        }
        uncoveredRight = subtractRanges(uncoveredRight, candidate.overlap);
      }
      for (const range of uncoveredRight) {
        pushOverlay({
          id: `gap-x:${item.id}:right-edge:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: item.maxX,
          startZ: (range.min + range.max) / 2,
          endX: layerMaxX,
          endZ: (range.min + range.max) / 2,
          y: 0.6,
          kind: 'edge'
        });
      }

      const leftCandidates = previewRects
        .filter((other) => other.id !== item.id && other.maxX <= item.minX)
        .map((other) => ({ other, overlap: getOverlapRange(item.minZ, item.maxZ, other.minZ, other.maxZ) }))
        .filter((entry): entry is { other: SizePreviewRect; overlap: Range } => entry.overlap !== null)
        .sort((a, b) => b.other.maxX - a.other.maxX);
      let uncoveredLeft: Range[] = [{ min: item.minZ, max: item.maxZ }];
      for (const candidate of leftCandidates) {
        const visibleRanges = subtractRanges(uncoveredLeft, { min: -Infinity, max: candidate.overlap.min }).flatMap((r) =>
          subtractRanges([r], { min: candidate.overlap.max, max: Infinity })
        );
        for (const range of visibleRanges) {
        pushOverlay({
          id: `gap-x:${candidate.other.id}:${item.id}:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: candidate.other.maxX,
          startZ: (range.min + range.max) / 2,
          endX: item.minX,
          endZ: (range.min + range.max) / 2,
          y: 0.6,
          kind: 'between'
        });
        }
        uncoveredLeft = subtractRanges(uncoveredLeft, candidate.overlap);
      }
      for (const range of uncoveredLeft) {
        pushOverlay({
          id: `gap-x:${item.id}:left-edge:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: layerMinX,
          startZ: (range.min + range.max) / 2,
          endX: item.minX,
          endZ: (range.min + range.max) / 2,
          y: 0.6,
          kind: 'edge'
        });
      }

      const frontCandidates = previewRects
        .filter((other) => other.id !== item.id && other.minZ >= item.maxZ)
        .map((other) => ({ other, overlap: getOverlapRange(item.minX, item.maxX, other.minX, other.maxX) }))
        .filter((entry): entry is { other: SizePreviewRect; overlap: Range } => entry.overlap !== null)
        .sort((a, b) => a.other.minZ - b.other.minZ);
      let uncoveredFront: Range[] = [{ min: item.minX, max: item.maxX }];
      for (const candidate of frontCandidates) {
        const visibleRanges = subtractRanges(uncoveredFront, { min: -Infinity, max: candidate.overlap.min }).flatMap((r) =>
          subtractRanges([r], { min: candidate.overlap.max, max: Infinity })
        );
        for (const range of visibleRanges) {
        pushOverlay({
          id: `gap-z:${item.id}:${candidate.other.id}:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: (range.min + range.max) / 2,
          startZ: item.maxZ,
          endX: (range.min + range.max) / 2,
          endZ: candidate.other.minZ,
          y: 0.6,
          kind: 'between'
        });
        }
        uncoveredFront = subtractRanges(uncoveredFront, candidate.overlap);
      }
      for (const range of uncoveredFront) {
        pushOverlay({
          id: `gap-z:${item.id}:front-edge:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: (range.min + range.max) / 2,
          startZ: item.maxZ,
          endX: (range.min + range.max) / 2,
          endZ: layerMaxZ,
          y: 0.6,
          kind: 'edge'
        });
      }

      const backCandidates = previewRects
        .filter((other) => other.id !== item.id && other.maxZ <= item.minZ)
        .map((other) => ({ other, overlap: getOverlapRange(item.minX, item.maxX, other.minX, other.maxX) }))
        .filter((entry): entry is { other: SizePreviewRect; overlap: Range } => entry.overlap !== null)
        .sort((a, b) => b.other.maxZ - a.other.maxZ);
      let uncoveredBack: Range[] = [{ min: item.minX, max: item.maxX }];
      for (const candidate of backCandidates) {
        const visibleRanges = subtractRanges(uncoveredBack, { min: -Infinity, max: candidate.overlap.min }).flatMap((r) =>
          subtractRanges([r], { min: candidate.overlap.max, max: Infinity })
        );
        for (const range of visibleRanges) {
        pushOverlay({
          id: `gap-z:${candidate.other.id}:${item.id}:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: (range.min + range.max) / 2,
          startZ: candidate.other.maxZ,
          endX: (range.min + range.max) / 2,
          endZ: item.minZ,
          y: 0.6,
          kind: 'between'
        });
        }
        uncoveredBack = subtractRanges(uncoveredBack, candidate.overlap);
      }
      for (const range of uncoveredBack) {
        pushOverlay({
          id: `gap-z:${item.id}:back-edge:${range.min.toFixed(2)}:${range.max.toFixed(2)}`,
          startX: (range.min + range.max) / 2,
          startZ: layerMinZ,
          endX: (range.min + range.max) / 2,
          endZ: item.minZ,
          y: 0.6,
          kind: 'edge'
        });
      }
    }

    const placedLabels: Array<{ axis: 'x' | 'z'; x: number; z: number }> = previewRects.flatMap(getDimensionLabelAnchors);
    const alongPattern = [0.5, 0.32, 0.68, 0.22, 0.78];
    const offsetPattern = [0, 4, -4, 8, -8, 12, -12];

    const prioritizedOverlays = [...overlays].sort((a, b) => {
      const aPriority = a.kind === 'between' ? 0 : 1;
      const bPriority = b.kind === 'between' ? 0 : 1;
      return aPriority - bPriority;
    });

    for (const overlay of prioritizedOverlays) {
      const axis = Math.abs(overlay.endX - overlay.startX) >= Math.abs(overlay.endZ - overlay.startZ) ? 'x' : 'z';
      let placementIndex = 0;

      while (true) {
        const labelT = alongPattern[placementIndex] ?? 0.5;
        const labelOffset =
          offsetPattern[placementIndex] ?? ((placementIndex % 2 === 0 ? 1 : -1) * (Math.floor(placementIndex / 2) + 1) * 4);
        const x = axis === 'x' ? overlay.startX + (overlay.endX - overlay.startX) * labelT : (overlay.startX + overlay.endX) / 2 + labelOffset;
        const z = axis === 'x' ? (overlay.startZ + overlay.endZ) / 2 + labelOffset : overlay.startZ + (overlay.endZ - overlay.startZ) * labelT;

        const collides = placedLabels.some((placed) => Math.abs(placed.x - x) < 42 && Math.abs(placed.z - z) < 20);

        if (!collides || placementIndex > 8) {
          overlay.labelT = labelT;
          overlay.labelOffset = labelOffset;
          placedLabels.push({ axis, x, z });
          break;
        }

        placementIndex++;
      }
    }

    return prioritizedOverlays;
  });
</script>

<!-- Render boxes with actual geometry -->
{#each boxPlacements as boxPlacement (boxPlacement.box.id)}
  {@const boxData = allBoxGeometries.find((b) => b.boxId === boxPlacement.box.id)}
  {@const boxHeight = boxPlacement.dimensions.height}
  {@const isRotated = boxPlacement.rotation === 90 || boxPlacement.rotation === 270}
  {@const itemCenterX = boxPlacement.x + boxPlacement.dimensions.width / 2}
  {@const itemCenterZ = boxPlacement.y + boxPlacement.dimensions.depth / 2}
  {@const explosion = calculateExplosionOffset(
    itemCenterX,
    itemCenterZ,
    gameContainerWidth,
    gameContainerDepth,
    horizontalExplosion
  )}
  {@const baseX = layerOffsetX + boxPlacement.x + boxPlacement.dimensions.width / 2 + explosion.offsetX}
  {@const baseZ = layerOffsetZ - boxPlacement.y - boxPlacement.dimensions.depth / 2 - explosion.offsetZ}
  {@const overlaySides = getDimensionOverlaySides(baseX, baseZ, boxPlacement.dimensions.width, boxPlacement.dimensions.depth)}

  <!-- Group for entire box assembly - rotation applied to group -->
  <T.Group position.x={baseX} position.y={0} position.z={baseZ} rotation.y={isRotated ? Math.PI / 2 : 0}>
    {#if boxData}
      <BoxAssembly
        boxGeometry={boxData.boxGeometry}
        lidGeometry={boxData.lidGeometry}
        lidTextInlayGeometry={boxData.lidTextInlayGeometry ?? null}
        trayGeometries={boxData.trayGeometries}
        boxDimensions={boxData.boxDimensions}
        boxId={boxPlacement.box.id}
        boxName={boxPlacement.box.name}
        {wallThickness}
        {tolerance}
        {floorThickness}
        {showCounters}
        {showLid}
        {onTrayClick}
        {onTrayDoubleClick}
        onBoxClick={onBoxDoubleClick}
        allowInnerTrayClicks={false}
      />
    {:else}
      <!-- Fallback: simple box geometry if actual geometry not available -->
      <T.Mesh
        position.y={boxHeight / 2}
        onclick={(e: IntersectionEvent<MouseEvent>) => {
          e.stopPropagation();
          onTrayClick?.({
            trayId: boxPlacement.box.id,
            name: boxPlacement.box.name,
            letter: '',
            width: boxPlacement.dimensions.width,
            depth: boxPlacement.dimensions.depth,
            height: boxHeight,
            color: '#444444',
            type: 'box'
          });
        }}
        ondblclick={(e: IntersectionEvent<MouseEvent>) => {
          e.stopPropagation();
          onBoxDoubleClick?.(boxPlacement.box.id);
        }}
      >
        <T.BoxGeometry args={[boxPlacement.dimensions.width, boxHeight, boxPlacement.dimensions.depth]} />
        <T.MeshStandardMaterial color="#444444" roughness={0.7} metalness={0.1} />
      </T.Mesh>
    {/if}
  </T.Group>

  <!-- Box label -->
  {#if showLabel}
    <Text
      text={boxPlacement.box.name}
      font={monoFont}
      fontSize={6}
      position={[baseX, boxHeight + 5, baseZ]}
      quaternion={labelQuaternion}
      color="#ffffff"
      anchorX="center"
      anchorY="bottom"
    />
  {/if}

  {#if showSizePreview}
    <DimensionOverlay
      centerX={baseX}
      centerZ={baseZ}
      width={boxPlacement.dimensions.width}
      depth={boxPlacement.dimensions.depth}
      height={boxHeight}
      widthSide={overlaySides.widthSide}
      depthSide={overlaySides.depthSide}
      {labelQuaternion}
      {monoFont}
    />
  {/if}
{/each}

<!-- Render visual-only boards -->
{#each boardPlacements as boardPlacement (boardPlacement.board.id)}
  {@const boardHeight = boardPlacement.dimensions.height}
  {@const isRotated = boardPlacement.rotation === 90 || boardPlacement.rotation === 270}
  {@const itemCenterX = boardPlacement.x + boardPlacement.dimensions.width / 2}
  {@const itemCenterZ = boardPlacement.y + boardPlacement.dimensions.depth / 2}
  {@const explosion = calculateExplosionOffset(
    itemCenterX,
    itemCenterZ,
    gameContainerWidth,
    gameContainerDepth,
    horizontalExplosion
  )}
  {@const baseX = layerOffsetX + boardPlacement.x + boardPlacement.dimensions.width / 2 + explosion.offsetX}
  {@const baseZ = layerOffsetZ - boardPlacement.y - boardPlacement.dimensions.depth / 2 - explosion.offsetZ}
  {@const overlaySides = getDimensionOverlaySides(baseX, baseZ, boardPlacement.dimensions.width, boardPlacement.dimensions.depth)}
  {@const layeredBoxGeometry = layeredBoxes.find((entry) => entry.proxyBoardId === boardPlacement.board.id)}
  {@const dimensionHeight =
    layeredBoxGeometry
      ? Math.max(layeredBoxGeometry.dimensions.height - layeredBoxGeometry.wallThickness, 0)
      : boardHeight}
  {@const isLayeredBoxSelection =
    selectionType === 'layeredBox' ||
    selectionType === 'layeredBoxLayer' ||
    selectionType === 'layeredBoxSection'}
  {@const isSelectedLayeredBox =
    layeredBoxGeometry && isLayeredBoxSelection && selectedLayeredBoxId === layeredBoxGeometry.layeredBoxId}
  {@const useBoxAssemblyLayeredBox = layeredBoxGeometry && !isLayeredBoxSelection}
  {@const visibleInternalLayers =
    layeredBoxGeometry
      ? !isLayeredBoxSelection
        ? layeredBoxGeometry.internalLayers
        : selectionType === 'layeredBoxLayer' && isSelectedLayeredBox
        ? layeredBoxGeometry.internalLayers.filter((internalLayer) => internalLayer.id === selectedLayeredBoxLayerId)
        : selectionType === 'layeredBox' && isSelectedLayeredBox
          ? layeredBoxGeometry.internalLayers
          : []
      : []}
  {@const visibleSections =
    layeredBoxGeometry
      ? !isLayeredBoxSelection
        ? layeredBoxGeometry.sections
        : selectionType === 'layeredBoxSection' && isSelectedLayeredBox
        ? layeredBoxGeometry.sections.filter((section) => section.sectionId === selectedLayeredBoxSectionId)
        : selectionType === 'layeredBoxLayer' && isSelectedLayeredBox
          ? layeredBoxGeometry.sections.filter((section) => section.internalLayerId === selectedLayeredBoxLayerId)
          : selectionType === 'layeredBox' && isSelectedLayeredBox
            ? layeredBoxGeometry.sections
          : []
      : []}
  {@const shellBounds = layeredBoxGeometry ? getGeomBounds(layeredBoxGeometry.shellGeometry) : null}
  {@const lidBounds = layeredBoxGeometry ? getGeomBounds(layeredBoxGeometry.lidGeometry) : null}
  {@const shellCenterX =
    layeredBoxGeometry && shellBounds ? -(shellBounds.max.x + shellBounds.min.x) / 2 : 0}
  {@const shellCenterZ =
    layeredBoxGeometry && shellBounds ? (shellBounds.max.y + shellBounds.min.y) / 2 : 0}
  {@const shellGeomWidth = shellBounds ? shellBounds.max.x - shellBounds.min.x : 0}
  {@const shellGeomDepth = shellBounds ? shellBounds.max.y - shellBounds.min.y : 0}
  {@const slidesAlongX = shellGeomWidth > shellGeomDepth}
  {@const lidGeomWidth = lidBounds ? lidBounds.max.x - lidBounds.min.x : 0}
  {@const lidGeomDepth = lidBounds ? lidBounds.max.y - lidBounds.min.y : 0}
  {@const lidBaseCenterX =
    layeredBoxGeometry && lidBounds ? -(lidBounds.max.x + lidBounds.min.x) / 2 : 0}
  {@const lidBaseCenterZ =
    layeredBoxGeometry && lidBounds ? -(lidBounds.max.y + lidBounds.min.y) / 2 : 0}
  {@const lidCenterX = slidesAlongX ? lidBaseCenterX : -lidBaseCenterX}
  {@const lidCenterZ = slidesAlongX ? lidBaseCenterZ : -lidBaseCenterZ}
  {@const lidRotZ = slidesAlongX ? 0 : Math.PI}
  {@const lidSlidePhase = selectionType === 'layeredBox' ? Math.min(horizontalExplosion * 2, 1) : 0}
  {@const layerLiftPhase = selectionType === 'layeredBox' ? Math.max((horizontalExplosion - 0.5) * 2, 0) : 0}
  {@const interiorBaseX =
    layeredBoxGeometry
      ? -layeredBoxGeometry.dimensions.width / 2 +
        layeredBoxGeometry.wallThickness +
        layeredBoxGeometry.tolerance
      : 0}
  {@const interiorBaseZ =
    layeredBoxGeometry
      ? layeredBoxGeometry.dimensions.depth / 2 -
        layeredBoxGeometry.wallThickness -
        layeredBoxGeometry.tolerance
      : 0}
  {@const showFullLayeredBox = !layeredBoxGeometry || !isSelectedLayeredBox || selectionType === 'layeredBox'}

  <T.Group position.x={baseX} position.y={0} position.z={baseZ} rotation.y={isRotated ? Math.PI / 2 : 0}>
    {#if !layeredBoxGeometry}
      <T.Mesh position.y={boardHeight / 2}>
        <T.BoxGeometry args={[boardPlacement.board.width, boardHeight, boardPlacement.board.depth]} />
        <T.MeshStandardMaterial
          color={boardPlacement.board.color}
          roughness={0.9}
          metalness={0.05}
          opacity={0.75}
        />
      </T.Mesh>
    {/if}

    {#if layeredBoxGeometry}
      {#if useBoxAssemblyLayeredBox}
        <BoxAssembly
          boxGeometry={layeredBoxGeometry.shellGeometry}
          lidGeometry={layeredBoxGeometry.lidGeometry}
          lidTextInlayGeometry={layeredBoxGeometry.lidTextInlayGeometry}
          trayGeometries={layeredBoxGeometry.assemblyTrayGeometries}
          boxDimensions={{
            width: layeredBoxGeometry.dimensions.width,
            depth: layeredBoxGeometry.dimensions.depth,
            height:
              layeredBoxGeometry.dimensions.bodyHeight -
              layeredBoxGeometry.wallThickness +
              (layeredBoxGeometry.dimensions.height - layeredBoxGeometry.dimensions.bodyHeight)
          }}
          boxId={layeredBoxGeometry.layeredBoxId}
          boxName={layeredBoxGeometry.name}
          wallThickness={layeredBoxGeometry.wallThickness}
          tolerance={layeredBoxGeometry.tolerance}
          floorThickness={layeredBoxGeometry.floorThickness}
          {showCounters}
          {showLid}
          {onTrayClick}
          {onTrayDoubleClick}
          onBoxClick={onBoxDoubleClick}
          allowInnerTrayClicks={false}
        />
      {:else}
      {#if showFullLayeredBox}
        <T.Mesh
          geometry={layeredBoxGeometry.shellGeometry}
          rotation.x={-Math.PI / 2}
          position.x={shellCenterX}
          position.y={0}
          position.z={shellCenterZ}
        >
          <T.MeshStandardMaterial
            color="#333333"
            roughness={0.6}
            metalness={0.1}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </T.Mesh>

        {#if showLid}
          {@const lidGap = 20}
          {@const lidSlideDistance = (slidesAlongX ? shellGeomWidth : shellGeomDepth) + lidGap}
          {@const explodedLidX =
            selectionType === 'layeredBox' && isSelectedLayeredBox
              ? slidesAlongX
                ? lidCenterX + lidSlideDistance * lidSlidePhase
                : lidCenterX
              : lidCenterX}
          {@const explodedLidY =
            layeredBoxGeometry.dimensions.bodyHeight -
            layeredBoxGeometry.wallThickness +
            (layeredBoxGeometry.dimensions.height - layeredBoxGeometry.dimensions.bodyHeight)}
          {@const explodedLidZ =
            selectionType === 'layeredBox' && isSelectedLayeredBox
              ? slidesAlongX
                ? lidCenterZ
                : lidCenterZ - lidSlideDistance * lidSlidePhase
              : lidCenterZ}
          <T.Mesh
            geometry={layeredBoxGeometry.lidGeometry}
            rotation.x={Math.PI / 2}
            rotation.z={lidRotZ}
            position.x={explodedLidX}
            position.y={explodedLidY}
            position.z={explodedLidZ}
          >
            <T.MeshStandardMaterial
              color="#444444"
              roughness={0.5}
              metalness={0.1}
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </T.Mesh>
          {#if layeredBoxGeometry.lidTextInlayGeometry}
            <T.Mesh
              geometry={layeredBoxGeometry.lidTextInlayGeometry}
              rotation.x={Math.PI / 2}
              rotation.z={lidRotZ}
              position.x={explodedLidX}
              position.y={explodedLidY + 0.02}
              position.z={explodedLidZ}
            >
              <T.MeshStandardMaterial
                color="#f2f2f2"
                roughness={0.45}
                metalness={0.05}
                side={THREE.DoubleSide}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            </T.Mesh>
          {/if}
        {/if}
      {/if}

      {#each visibleInternalLayers as internalLayer, layerIndex (internalLayer.id)}
        {@const visibleLayerSections =
          selectionType === 'layeredBoxLayer' || !isLayeredBoxSelection
            ? visibleSections.filter((section) => section.internalLayerId === internalLayer.id)
            : []}
        {@const layeredBoxExplodeX = 0}
        {@const layeredBoxExplodeY =
          selectionType === 'layeredBox'
            ? layerLiftPhase * (layeredBoxGeometry.dimensions.bodyHeight + 8) + layerIndex * 12 * layerLiftPhase
            : 0}
        <T.Group
          position.x={selectionType === 'layeredBoxLayer' ? -internalLayer.width / 2 : interiorBaseX + layeredBoxExplodeX}
          position.y={
            selectionType === 'layeredBoxLayer' ? 0 : layeredBoxGeometry.floorThickness + internalLayer.z + layeredBoxExplodeY
          }
          position.z={selectionType === 'layeredBoxLayer' ? internalLayer.depth / 2 : interiorBaseZ}
        >
          {#if internalLayer.geometry}
            <TrayInBox
              geometry={internalLayer.geometry}
              color={getLayeredBoxLayerColor(internalLayer.color, layerIndex)}
              counterStacks={[]}
              showCounters={false}
              trayId={internalLayer.id}
              trayName={layeredBoxGeometry.name}
              trayLetter="L"
              onClick={onTrayClick}
              width={internalLayer.width}
              depth={internalLayer.depth}
              height={internalLayer.height}
            />
          {/if}

          {#if selectionType === 'layeredBoxLayer' || !isLayeredBoxSelection}
            {#each visibleLayerSections as section (section.sectionId)}
              <T.Group position.x={section.x} position.y={0} position.z={-section.y}>
                <TrayInBox
                  geometry={section.geometry}
                  color={section.color}
                  counterStacks={[]}
                  showCounters={false}
                  trayId={section.sectionId}
                  trayName={section.name}
                  trayLetter="S"
                  onClick={onTrayClick}
                  width={section.dimensions.width}
                  depth={section.dimensions.depth}
                  height={section.dimensions.height}
                  opacity={1}
                />
              </T.Group>
            {/each}
          {/if}
        </T.Group>
      {/each}

      {#if (selectionType === 'layeredBox' || selectionType === 'layeredBoxSection') && isSelectedLayeredBox}
        {#each visibleSections as section (section.sectionId)}
          {@const sectionLayerIndex =
            layeredBoxGeometry.internalLayers.findIndex((internalLayer) => internalLayer.id === section.internalLayerId)}
          {@const sectionExplodeX = 0}
          {@const sectionExplodeY =
            selectionType === 'layeredBox' && sectionLayerIndex >= 0
              ? layerLiftPhase * (layeredBoxGeometry.dimensions.bodyHeight + 8) + sectionLayerIndex * 12 * layerLiftPhase
              : 0}
          <T.Group
            position.x={
              selectionType === 'layeredBoxSection'
                ? -section.dimensions.width / 2
                : interiorBaseX + section.x + sectionExplodeX
            }
            position.y={selectionType === 'layeredBoxSection' ? 0 : layeredBoxGeometry.floorThickness + section.z + sectionExplodeY}
            position.z={
              selectionType === 'layeredBoxSection'
                ? section.dimensions.depth / 2
                : interiorBaseZ - section.y
            }
          >
            <TrayInBox
              geometry={section.geometry}
              color={section.color}
              counterStacks={[]}
              showCounters={false}
              trayId={section.sectionId}
              trayName={section.name}
              trayLetter="S"
              onClick={onTrayClick}
              width={section.dimensions.width}
              depth={section.dimensions.depth}
              height={section.dimensions.height}
            />
          </T.Group>
        {/each}
      {/if}
      {/if}
    {/if}
  </T.Group>

  {#if showLabel}
    <Text
      text={boardPlacement.board.name}
      font={monoFont}
      fontSize={6}
      position={[baseX, boardHeight + 5, baseZ]}
      quaternion={labelQuaternion}
      color="#ffffff"
      anchorX="center"
      anchorY="bottom"
    />
  {/if}

  {#if showSizePreview}
    <DimensionOverlay
      centerX={baseX}
      centerZ={baseZ}
      width={boardPlacement.dimensions.width}
      depth={boardPlacement.dimensions.depth}
      height={dimensionHeight}
      widthSide={overlaySides.widthSide}
      depthSide={overlaySides.depthSide}
      {labelQuaternion}
      {monoFont}
    />
  {/if}
{/each}

<!-- Render loose trays with actual geometry -->
{#each looseTrayPlacements as trayPlacement (trayPlacement.tray.id)}
  {@const looseTrayGeom = allLooseTrayGeometries.find((lt) => lt.trayId === trayPlacement.tray.id)}
  {@const trayHeight = trayPlacement.dimensions.height}
  {@const trayColor = trayPlacement.tray.color || TRAY_COLORS[0]}
  {@const isRotated = trayPlacement.rotation === 90 || trayPlacement.rotation === 270}
  {@const itemCenterX = trayPlacement.x + trayPlacement.dimensions.width / 2}
  {@const itemCenterZ = trayPlacement.y + trayPlacement.dimensions.depth / 2}
  {@const explosion = calculateExplosionOffset(
    itemCenterX,
    itemCenterZ,
    gameContainerWidth,
    gameContainerDepth,
    horizontalExplosion
  )}
  {@const baseX = layerOffsetX + trayPlacement.x + (isRotated ? trayPlacement.dimensions.width : 0) + explosion.offsetX}
  {@const baseZ = layerOffsetZ - trayPlacement.y - explosion.offsetZ}

  {#if looseTrayGeom}
    <!-- Render actual tray geometry -->
    <T.Group position.x={baseX} position.y={0} position.z={baseZ} rotation.y={isRotated ? Math.PI / 2 : 0}>
      <TrayInBox
        geometry={looseTrayGeom.geometry}
        color={getTrayColor(trayPlacement.tray.id, trayColor)}
        counterStacks={looseTrayGeom.counterStacks}
        {showCounters}
        trayId={trayPlacement.tray.id}
        trayName={trayPlacement.tray.name}
        trayLetter={looseTrayGeom.trayLetter}
        onClick={onTrayClick}
        onDoubleClick={onTrayDoubleClick}
        width={trayPlacement.dimensions.width}
        depth={trayPlacement.dimensions.depth}
        height={trayHeight}
      />
    </T.Group>
  {:else}
    <!-- Fallback: simple box geometry if actual geometry not available -->
    {@const fallbackX = layerOffsetX + trayPlacement.x + trayPlacement.dimensions.width / 2 + explosion.offsetX}
    {@const fallbackZ = layerOffsetZ - trayPlacement.y - trayPlacement.dimensions.depth / 2 - explosion.offsetZ}
    <T.Mesh
      position.x={fallbackX}
      position.y={trayHeight / 2}
      position.z={fallbackZ}
      rotation.y={isRotated ? Math.PI / 2 : 0}
    >
      <T.BoxGeometry args={[trayPlacement.dimensions.width, trayHeight, trayPlacement.dimensions.depth]} />
      <T.MeshStandardMaterial color={trayColor} roughness={0.5} metalness={0.1} />
    </T.Mesh>
  {/if}

  <!-- Tray label -->
  {#if showLabel}
    {@const labelX = layerOffsetX + trayPlacement.x + trayPlacement.dimensions.width / 2 + explosion.offsetX}
    {@const labelZ = layerOffsetZ - trayPlacement.y - trayPlacement.dimensions.depth / 2 - explosion.offsetZ}
    <Text
      text={trayPlacement.tray.name}
      font={monoFont}
      fontSize={4}
      position={[labelX, trayHeight + 3, labelZ]}
      quaternion={labelQuaternion}
      color="#ffffff"
      anchorX="center"
      anchorY="bottom"
    />
  {/if}

  {#if showSizePreview}
    {@const labelX = layerOffsetX + trayPlacement.x + trayPlacement.dimensions.width / 2 + explosion.offsetX}
    {@const labelZ = layerOffsetZ - trayPlacement.y - trayPlacement.dimensions.depth / 2 - explosion.offsetZ}
    {@const overlaySides = getDimensionOverlaySides(labelX, labelZ, trayPlacement.dimensions.width, trayPlacement.dimensions.depth)}
    <DimensionOverlay
      centerX={labelX}
      centerZ={labelZ}
      width={trayPlacement.dimensions.width}
      depth={trayPlacement.dimensions.depth}
      height={trayHeight}
      widthSide={overlaySides.widthSide}
      depthSide={overlaySides.depthSide}
      {labelQuaternion}
      {monoFont}
    />
  {/if}
{/each}

{#if showSizePreview}
  {#each gapOverlays as gap (gap.id)}
    <GapDimensionOverlay
      startX={gap.startX}
      startZ={gap.startZ}
      endX={gap.endX}
      endZ={gap.endZ}
      y={gap.y}
      labelT={gap.labelT ?? 0.5}
      labelOffset={gap.labelOffset ?? 0}
      {labelQuaternion}
      {monoFont}
      color="#79b983"
    />
  {/each}
{/if}

<!-- Layer height indicator and label (offset from bed edge, at front) -->
{#if showLabel && layerName}
  {@const indicatorExplosionOffset = 100 * horizontalExplosion}
  {@const indicatorX = -gameContainerWidth / 2 - 15 - indicatorExplosionOffset}
  {@const indicatorZ = printBedSize / 2 + gameContainerDepth / 2}
  {@const displayHeight = layerHeight || maxItemHeight}
  {@const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(indicatorX, 0, indicatorZ),
    new THREE.Vector3(indicatorX, displayHeight, indicatorZ)
  ])}

  <!-- Vertical height indicator line -->
  <T.Line geometry={lineGeometry}>
    <T.LineBasicMaterial color="#888888" linewidth={2} />
  </T.Line>

  <!-- Top tick mark -->
  <T.Line
    geometry={new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(indicatorX - 3, displayHeight, indicatorZ),
      new THREE.Vector3(indicatorX + 3, displayHeight, indicatorZ)
    ])}
  >
    <T.LineBasicMaterial color="#888888" />
  </T.Line>

  <!-- Bottom tick mark -->
  <T.Line
    geometry={new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(indicatorX - 3, 0, indicatorZ),
      new THREE.Vector3(indicatorX + 3, 0, indicatorZ)
    ])}
  >
    <T.LineBasicMaterial color="#888888" />
  </T.Line>

  <!-- Layer name label -->
  <Text
    text={layerName}
    font={monoFont}
    fontSize={6}
    position={[indicatorX - 5, displayHeight / 2 + 4, indicatorZ]}
    quaternion={labelQuaternion}
    color="#ffffff"
    anchorX="right"
    anchorY="middle"
  />

  <!-- Layer height value -->
  <Text
    text={`${displayHeight.toFixed(1)}mm`}
    font={monoFont}
    fontSize={4}
    position={[indicatorX - 5, displayHeight / 2 - 4, indicatorZ]}
    quaternion={labelQuaternion}
    color="#aaaaaa"
    anchorX="right"
    anchorY="middle"
  />
{/if}
