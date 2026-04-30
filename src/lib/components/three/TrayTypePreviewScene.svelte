<script lang="ts">
  import { T, useTask, useThrelte } from '@threlte/core';
  import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
  import SceneLighting from './SceneLighting.svelte';
  import { DEFAULT_COUNTER_SHAPES, type TrayType } from '$lib/stores/project.svelte';
  import {
    DEFAULT_MINIATURE_RACK_BASE_DEPTH,
    DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
    DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
    DEFAULT_MINIATURE_RACK_HEIGHT,
    DEFAULT_MINIATURE_RACK_LIP_ANGLE,
    DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
    DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
    DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
    DEFAULT_MINIATURE_RACK_SLOT_HEIGHT,
    DEFAULT_MINIATURE_RACK_SLOT_WIDTH,
    DEFAULT_MINIATURE_RACK_SPACING,
    DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
    createMiniatureRack
  } from '$lib/models/miniatureRack';
  import { createTileTray, defaultTileTrayParams } from '$lib/models/tileTray';
  import { getTileTrayPreviewPositions, type TileTrayPosition } from '$lib/models/tileTray';
  import { jscadToBufferGeometry } from '$lib/utils/jscadToThree';
  import CounterMesh from './CounterMesh.svelte';
  import * as THREE from 'three';

  interface Props {
    trayType: TrayType;
  }

  let { trayType }: Props = $props();

  // Set transparent background
  const { renderer } = useThrelte();
  $effect(() => {
    if (renderer) {
      renderer.setClearColor(0x000000, 0);
    }
  });

  // Map tray types to STL file paths
  const stlPaths: Record<string, string> = {
    counter: '/stls/counter.stl',
    cardDraw: '/stls/card-draw.stl',
    cardDivider: '/stls/card-divider.stl',
    cardWell: '/stls/card-well.stl',
    cup: '/stls/cups.stl'
  };

  const tileTokenColors = ['#5f7f74', '#7a6b8f'];

  function centerGeometry(geometry: THREE.BufferGeometry): { geometry: THREE.BufferGeometry; center: THREE.Vector3 } {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    if (box) {
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
    }
    return { geometry, center };
  }

  function createGeneratedPreviewGeometry(type: TrayType): {
    geometry: THREE.BufferGeometry;
    center: THREE.Vector3;
    tileStacks: TileTrayPosition[];
  } | null {
    if (type === 'tile') {
      const params = {
        ...defaultTileTrayParams,
        tileShapeId: 'tile-hex',
        count: 8,
        orientation: 'horizontal' as const
      };
      const geometry = createTileTray(
        params,
        DEFAULT_COUNTER_SHAPES,
        'Tile tray',
        undefined,
        undefined,
        false
      );
      return {
        ...centerGeometry(jscadToBufferGeometry(geometry)),
        tileStacks: getTileTrayPreviewPositions(params, DEFAULT_COUNTER_SHAPES)
      };
    }

    if (type === 'miniatureRack') {
      const geometry = createMiniatureRack(
        {
          rackHeight: DEFAULT_MINIATURE_RACK_HEIGHT,
          rackBaseDepth: DEFAULT_MINIATURE_RACK_BASE_DEPTH,
          wallThickness: DEFAULT_MINIATURE_RACK_WALL_THICKNESS,
          sideWallThickness: DEFAULT_MINIATURE_RACK_SIDE_WALL_THICKNESS,
          railWallThickness: DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
          railLipInset: DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
          baseWidthTolerance: DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
          baseHeightTolerance: DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
          slots: [
            {
              id: 'preview-slot',
              baseWidth: DEFAULT_MINIATURE_RACK_SLOT_WIDTH,
              baseHeight: DEFAULT_MINIATURE_RACK_SLOT_HEIGHT,
              lipAngle: DEFAULT_MINIATURE_RACK_LIP_ANGLE,
              slotSpacingLeft: DEFAULT_MINIATURE_RACK_SPACING,
              slotSpacingRight: DEFAULT_MINIATURE_RACK_SPACING
            }
          ]
        },
        'Miniature rack',
        undefined,
        false
      );
      return {
        ...centerGeometry(jscadToBufferGeometry(geometry)),
        tileStacks: []
      };
    }

    return null;
  }

  // Uniform tray color
  const trayColor = '#666666';

  // Load the STL geometry
  let loadedGeometry = $state<THREE.BufferGeometry | null>(null);
  let geometryCenter = $state({ x: 0, y: 0, z: 0 });
  let tilePreviewStacks = $state<TileTrayPosition[]>([]);

  $effect(() => {
    loadedGeometry = null;
    geometryCenter = { x: 0, y: 0, z: 0 };
    tilePreviewStacks = [];

    const generatedGeometry = createGeneratedPreviewGeometry(trayType);
    if (generatedGeometry) {
      loadedGeometry = generatedGeometry.geometry;
      geometryCenter = {
        x: generatedGeometry.center.x,
        y: generatedGeometry.center.y,
        z: generatedGeometry.center.z
      };
      tilePreviewStacks = generatedGeometry.tileStacks;
      return;
    }

    const path = stlPaths[trayType] || stlPaths.counter;
    const loader = new STLLoader();
    loader.load(path, (geometry) => {
      const centered = centerGeometry(geometry);
      loadedGeometry = centered.geometry;
      geometryCenter = {
        x: centered.center.x,
        y: centered.center.y,
        z: centered.center.z
      };
    });
  });

  // Calculate scale to fit the model in view
  let modelScale = $derived.by(() => {
    if (!loadedGeometry) return 1;
    loadedGeometry.computeBoundingBox();
    const box = loadedGeometry.boundingBox;
    if (!box) return 1;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Target size around 40 units
    return 40 / maxDim;
  });

  // Rotation animation
  let groupRef = $state<THREE.Group | undefined>(undefined);
  let time = 0;

  useTask((delta) => {
    if (!groupRef) return;
    time += delta * 0.5;
    // Gentle tumble: slow Y rotation with subtle X oscillation
    groupRef.rotation.y = time;
    groupRef.rotation.x = Math.sin(time * 0.7) * 0.15;
  });
</script>

<!-- Camera positioned for isometric view, centered on model -->
<T.PerspectiveCamera makeDefault position={[50, 35, 50]} fov={35} oncreate={(ref) => ref.lookAt(0, 0, 0)} />

<SceneLighting preset="default" />

<!-- Rotating group for geometry -->
<T.Group bind:ref={groupRef}>
  {#if loadedGeometry}
    <T.Mesh geometry={loadedGeometry} scale={modelScale} rotation.x={-Math.PI / 2}>
      <T.MeshStandardMaterial color={trayColor} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} />
    </T.Mesh>
    {#each tilePreviewStacks as stack, stackIdx (stackIdx)}
      {#each Array(stack.count) as _token, tokenIdx (tokenIdx)}
        {@const posX = (stack.x - geometryCenter.x) * modelScale}
        {@const posY = (stack.z + tokenIdx * stack.thickness + stack.thickness / 2 - geometryCenter.z) * modelScale}
        {@const posZ = -(stack.y - geometryCenter.y) * modelScale}
        <CounterMesh
          shape={stack.customBaseShape ?? 'square'}
          {posX}
          {posY}
          {posZ}
          width={stack.width * modelScale}
          length={stack.length * modelScale}
          thickness={stack.thickness * modelScale}
          color={tileTokenColors[tokenIdx % tileTokenColors.length]}
          hexPointyTop={stack.hexPointyTop}
        />
      {/each}
    {/each}
  {/if}
</T.Group>
