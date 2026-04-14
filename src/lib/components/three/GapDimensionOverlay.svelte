<script lang="ts">
  import { T } from '@threlte/core';
  import { Text } from '@threlte/extras';
  import * as THREE from 'three';

  interface Props {
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    y: number;
    labelT?: number;
    labelOffset?: number;
    labelQuaternion?: [number, number, number, number];
    monoFont?: string;
    color?: string;
  }

  let {
    startX,
    startZ,
    endX,
    endZ,
    y,
    labelT = 0.5,
    labelOffset = 0,
    labelQuaternion = [0, 0, 0, 1],
    monoFont = '/fonts/JetBrainsMono-Regular.ttf',
    color = '#79b983'
  }: Props = $props();

  const length = $derived(Math.hypot(endX - startX, endZ - startZ));
  const midX = $derived(startX + (endX - startX) * labelT);
  const midZ = $derived(startZ + (endZ - startZ) * labelT);
  const isWidthAxis = $derived(Math.abs(endX - startX) >= Math.abs(endZ - startZ));
  const labelX = $derived(isWidthAxis ? midX : midX + labelOffset);
  const labelZ = $derived(isWidthAxis ? midZ + labelOffset : midZ);

  const lineY = $derived(y + 1.4);

  const lineGeometry = $derived(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX, lineY, startZ),
      new THREE.Vector3(endX, lineY, endZ)
    ])
  );

  function createTickGeometry(x: number, z: number) {
    const half = 1.6;
    return isWidthAxis
      ? new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, lineY, z - half),
          new THREE.Vector3(x, lineY, z + half)
        ])
      : new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x - half, lineY, z),
          new THREE.Vector3(x + half, lineY, z)
        ]);
  }

  const formatMm = (value: number) => `${value.toFixed(1)}mm`;
</script>

<T.Line geometry={lineGeometry}>
  <T.LineBasicMaterial color={color} depthTest={false} />
</T.Line>
<T.Line geometry={createTickGeometry(startX, startZ)}>
  <T.LineBasicMaterial color={color} depthTest={false} />
</T.Line>
<T.Line geometry={createTickGeometry(endX, endZ)}>
  <T.LineBasicMaterial color={color} depthTest={false} />
</T.Line>
<Text
  text={formatMm(length)}
  font={monoFont}
  fontSize={3.2}
  position={[labelX, lineY + 1.2, labelZ]}
  quaternion={labelQuaternion}
  color={color}
  anchorX="center"
  anchorY="bottom"
  depthTest={false}
/>
