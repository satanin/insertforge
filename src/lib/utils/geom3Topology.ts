import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { Vec3 } from '@jscad/modeling/src/maths/types';

const { geom3 } = jscad.geometries;

export interface Geom3TopologyStats {
  nakedEdges: number;
  nonManifoldEdges: number;
}

interface DirectedEdge {
  start: string;
  end: string;
}

interface BoundaryLoop {
  vertices: number[][];
  planar: boolean;
}

function vertexKey(vertex: number[], precision = 1_000_000): string {
  return vertex.map((value) => Math.round(value * precision)).join(',');
}

function buildEdgeMaps(geometry: Geom3): {
  undirectedEdgeCounts: Map<string, number>;
  directedBoundaryEdges: DirectedEdge[];
  vertexLookup: Map<string, number[]>;
} {
  const undirectedEdgeCounts = new Map<string, number>();
  const directedBoundaryCandidates = new Map<string, DirectedEdge>();
  const vertexLookup = new Map<string, number[]>();

  for (const polygon of geometry.polygons) {
    const points = polygon.vertices;
    for (let index = 0; index < points.length; index += 1) {
      const startVertex = points[index];
      const endVertex = points[(index + 1) % points.length];
      const startKey = vertexKey(startVertex);
      const endKey = vertexKey(endVertex);
      const undirectedKey = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;

      undirectedEdgeCounts.set(undirectedKey, (undirectedEdgeCounts.get(undirectedKey) ?? 0) + 1);
      directedBoundaryCandidates.set(undirectedKey, { start: startKey, end: endKey });
      vertexLookup.set(startKey, startVertex);
      vertexLookup.set(endKey, endVertex);
    }
  }

  const directedBoundaryEdges = [...undirectedEdgeCounts.entries()]
    .filter(([, count]) => count === 1)
    .map(([edgeKey]) => directedBoundaryCandidates.get(edgeKey))
    .filter((edge): edge is DirectedEdge => edge !== undefined);

  return { undirectedEdgeCounts, directedBoundaryEdges, vertexLookup };
}

export function analyzeGeom3Topology(geometry: Geom3): Geom3TopologyStats {
  const { undirectedEdgeCounts } = buildEdgeMaps(geometry);
  let nakedEdges = 0;
  let nonManifoldEdges = 0;

  for (const count of undirectedEdgeCounts.values()) {
    if (count === 1) {
      nakedEdges += 1;
    } else if (count !== 2) {
      nonManifoldEdges += 1;
    }
  }

  return { nakedEdges, nonManifoldEdges };
}

function collectBoundaryLoops(geometry: Geom3): BoundaryLoop[] {
  const { directedBoundaryEdges, vertexLookup } = buildEdgeMaps(geometry);
  const outgoingEdges = new Map<string, string[]>();
  const usedEdges = new Set<string>();

  for (const edge of directedBoundaryEdges) {
    outgoingEdges.set(edge.start, [...(outgoingEdges.get(edge.start) ?? []), edge.end]);
  }

  const loops: BoundaryLoop[] = [];

  for (const edge of directedBoundaryEdges) {
    const startEdgeKey = `${edge.start}>${edge.end}`;
    if (usedEdges.has(startEdgeKey)) continue;

    const loopKeys = [edge.start];
    let current = edge.start;
    let next = edge.end;

    while (true) {
      usedEdges.add(`${current}>${next}`);
      loopKeys.push(next);
      current = next;

      if (current === edge.start) {
        break;
      }

      const candidates = (outgoingEdges.get(current) ?? []).filter((candidate) => !usedEdges.has(`${current}>${candidate}`));
      if (candidates.length === 0) {
        loopKeys.length = 0;
        break;
      }
      next = candidates[0];
      if (loopKeys.length > directedBoundaryEdges.length + 1) {
        loopKeys.length = 0;
        break;
      }
    }

    if (loopKeys.length < 4) continue;

    const vertices = loopKeys.slice(0, -1).map((key) => vertexLookup.get(key)).filter((vertex): vertex is number[] => vertex !== undefined);
    const zs = vertices.map((vertex) => vertex[2]);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    loops.push({
      vertices,
      planar: maxZ - minZ <= 0.0001
    });
  }

  return loops;
}

export function repairGeom3PlanarHoles(geometry: Geom3): Geom3 {
  const loops = collectBoundaryLoops(geometry).filter((loop) => loop.planar && loop.vertices.length >= 3);
  if (loops.length === 0) {
    return geometry;
  }

  const repairPolygons: Vec3[][] = loops.map((loop) => {
    const area =
      loop.vertices.reduce((sum, vertex, index) => {
        const nextVertex = loop.vertices[(index + 1) % loop.vertices.length];
        return sum + vertex[0] * nextVertex[1] - nextVertex[0] * vertex[1];
      }, 0) / 2;

    return (area < 0 ? loop.vertices : [...loop.vertices].reverse()) as Vec3[];
  });

  const existingPolygons = geometry.polygons.map((polygon) => polygon.vertices as Vec3[]);
  return geom3.fromPoints([...existingPolygons, ...repairPolygons]);
}
