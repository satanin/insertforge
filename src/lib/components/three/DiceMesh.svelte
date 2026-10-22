<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import type { DiceKind } from '$lib/types/project';
  import { getDieMesh } from '$lib/models/diceGeometry';
  let { kind, size, x, y, z, color }: { kind: DiceKind; size: number; x: number; y: number; z: number; color: string } = $props();
  const geometry = $derived.by(() => {
    const mesh = getDieMesh(kind, size);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.faces.flatMap(face => face.flatMap(i => mesh.points[i])), 3));
    geometry.computeVertexNormals();
    return geometry;
  });
  const edges = $derived(new THREE.EdgesGeometry(geometry, 1));
  $effect(() => { const g = geometry, e = edges; return () => { g.dispose(); e.dispose(); }; });
</script>

<T.Group position={[x, z, -y]} rotation.x={-Math.PI / 2}>
  <T.Mesh {geometry}>
    <T.MeshStandardMaterial {color} roughness={0.5} flatShading />
  </T.Mesh>
  <T.LineSegments geometry={edges}>
    <T.LineBasicMaterial color="#5a4525" />
  </T.LineSegments>
  {#if kind === 'd6'}
    {#each [-1, 1] as column}
      {#each [-1, 0, 1] as row}
        <T.Mesh position={[column * size * 0.23, row * size * 0.23, size + 0.01]}>
          <T.CircleGeometry args={[size * 0.065, 16]} />
          <T.MeshBasicMaterial color="#392e20" />
        </T.Mesh>
      {/each}
    {/each}
  {/if}
</T.Group>
