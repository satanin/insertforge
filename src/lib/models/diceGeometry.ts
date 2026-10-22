import * as THREE from 'three';
import type { DiceKind } from '$lib/types/project';

export type DiePoint = [number, number, number];
export interface DieMesh { points: DiePoint[]; faces: number[][]; height: number }

/** Face-down dice, Z up. Size is cube side for d6, maximum vertex distance otherwise. */
export function getDieMesh(kind: DiceKind, size: number): DieMesh {
  let geometry: THREE.BufferGeometry;
  if (kind === 'd10') {
    const points: number[] = [];
    const ring = Array.from({ length: 10 }, (_, i) => {
      const a = i * Math.PI / 5;
      const h = (1 - Math.cos(Math.PI / 5)) / (1 + Math.cos(Math.PI / 5));
      return new THREE.Vector3(Math.cos(a), Math.sin(a), i % 2 === 0 ? h : -h);
    });
    for (let i = 0; i < 10; i++) {
      const pole = new THREE.Vector3(0, 0, i % 2 === 0 ? -1 : 1);
      const a = ring[(i + 9) % 10], b = ring[i], c = ring[(i + 1) % 10];
      for (const tri of [[pole, a, b], [pole, b, c]]) {
        const normal = tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0]));
        if (normal.dot(tri[0].clone().add(tri[1]).add(tri[2])) < 0) tri.reverse();
        points.push(...tri.flatMap(v => v.toArray()));
      }
    }
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  } else {
    geometry = kind === 'd4' ? new THREE.TetrahedronGeometry(1, 0) :
      kind === 'd6' ? new THREE.BoxGeometry(1, 1, 1) :
      kind === 'd8' ? new THREE.OctahedronGeometry(1, 0) :
      kind === 'd12' ? new THREE.DodecahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0);
  }
  const raw = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = raw.getAttribute('position');
  const vertices = Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i));
  const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, -1));
  vertices.forEach(v => v.applyQuaternion(rotation));
  let diameter = 0;
  if (kind !== 'd6') for (const a of vertices) for (const b of vertices) diameter = Math.max(diameter, a.distanceTo(b));
  const factor = kind === 'd6' ? size : size / diameter;
  const bounds = new THREE.Box3().setFromPoints(vertices);
  const center = bounds.getCenter(new THREE.Vector3());
  const points: DiePoint[] = [];
  const ids = new Map<string, number>();
  const faces: number[][] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    faces.push(vertices.slice(i, i + 3).map(v => {
      const point: DiePoint = [(v.x - center.x) * factor, (v.y - center.y) * factor, (v.z - bounds.min.z) * factor];
      const key = point.map(n => n.toFixed(6)).join(',');
      if (!ids.has(key)) { ids.set(key, points.length); points.push(point); }
      return ids.get(key)!;
    }));
  }
  geometry.dispose();
  if (raw !== geometry) raw.dispose();
  return { points, faces, height: (bounds.max.z - bounds.min.z) * factor };
}

/** Convex XY silhouette: a vertical socket has no undercuts and allows straight extraction. */
export function getDieFootprint(kind: DiceKind, size: number): [number, number][] {
  const points = getDieMesh(kind, size).points.map(([x, y]) => [x, y] as [number, number]);
  const sorted = [...new Map(points.map(p => [p.map(n => n.toFixed(6)).join(','), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 1e-7) lower.pop(); lower.push(p); }
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 1e-7) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
