<script lang="ts">
  import { T } from '@threlte/core';
  import * as THREE from 'three';
  import { Text } from '@threlte/extras';

  interface Props {
    centerX: number;
    centerZ: number;
    width: number;
    depth: number;
    height: number;
    widthSide?: 'positive' | 'negative';
    depthSide?: 'positive' | 'negative';
    labelQuaternion?: [number, number, number, number];
    monoFont?: string;
  }

  let {
    centerX,
    centerZ,
    width,
    depth,
    height,
    widthSide = 'positive',
    depthSide = 'positive',
    labelQuaternion = [0, 0, 0, 1],
    monoFont = '/fonts/JetBrainsMono-Regular.ttf'
  }: Props = $props();

  const lineColor = '#9a9a9a';
  const textColor = '#d0d0d0';

  const widthOffset = 0;
  const depthOffset = 0;
  const heightOffset = 4;
  const widthSideSign = $derived(widthSide === 'positive' ? 1 : -1);
  const depthSideSign = $derived(depthSide === 'positive' ? 1 : -1);

  const formatMm = (value: number) => `${value.toFixed(1)}mm`;

  const widthY = $derived(height + 4);
  const widthZ = $derived(centerZ + (depth / 2 + widthOffset) * widthSideSign);
  const widthLine = $derived(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(centerX - width / 2, widthY, widthZ),
      new THREE.Vector3(centerX + width / 2, widthY, widthZ)
    ])
  );

  const depthY = $derived(height + 8);
  const depthX = $derived(centerX + (width / 2 + depthOffset) * depthSideSign);
  const depthLine = $derived(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(depthX, depthY, centerZ - depth / 2),
      new THREE.Vector3(depthX, depthY, centerZ + depth / 2)
    ])
  );

  const heightX = $derived(centerX + (width / 2 + heightOffset) * depthSideSign);
  const heightZ = $derived(centerZ + (depth / 2 + heightOffset) * widthSideSign);
  const heightLine = $derived(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(heightX, 0, heightZ),
      new THREE.Vector3(heightX, height, heightZ)
    ])
  );

  function tickX(x: number, y: number, z: number) {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z - 2),
      new THREE.Vector3(x, y, z + 2)
    ]);
  }

  function tickZ(x: number, y: number, z: number) {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - 2, y, z),
      new THREE.Vector3(x + 2, y, z)
    ]);
  }

  function tickY(x: number, y: number, z: number) {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x - 2, y, z),
      new THREE.Vector3(x + 2, y, z)
    ]);
  }
</script>

<T.Line geometry={widthLine}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickX(centerX - width / 2, widthY, widthZ)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickX(centerX + width / 2, widthY, widthZ)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<Text
  text={formatMm(width)}
  font={monoFont}
  fontSize={3.5}
  position={[centerX, widthY + 1.5, widthZ]}
  quaternion={labelQuaternion}
  color={textColor}
  anchorX="center"
  anchorY="bottom"
/>

<T.Line geometry={depthLine}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickZ(depthX, depthY, centerZ - depth / 2)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickZ(depthX, depthY, centerZ + depth / 2)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<Text
  text={formatMm(depth)}
  font={monoFont}
  fontSize={3.5}
  position={[depthX, depthY + 1.5, centerZ]}
  quaternion={labelQuaternion}
  color={textColor}
  anchorX="center"
  anchorY="bottom"
/>

<T.Line geometry={heightLine}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickY(heightX, 0, heightZ)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<T.Line geometry={tickY(heightX, height, heightZ)}>
  <T.LineBasicMaterial color={lineColor} />
</T.Line>
<Text
  text={formatMm(height)}
  font={monoFont}
  fontSize={3.5}
  position={[heightX + depthSideSign * 1.5, height / 2, heightZ]}
  quaternion={labelQuaternion}
  color={textColor}
  anchorX={depthSide === 'positive' ? 'left' : 'right'}
  anchorY="middle"
/>
