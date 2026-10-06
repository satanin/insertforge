/** Normalize meshes produced by @jscad/3mf-serializer, which repeats vertices for
 * every triangle. Shared indices prevent missing strokes in Bambu Studio.
 * Operates on the serializer's XML in both the browser and geometry worker.
 * Only exact coordinate matches within one mesh are merged; no rounding, face
 * removal or changes to materials, winding, coordinates or components. */
export function weld3mfVertices(xml: string): string {
  return xml.replace(/<mesh>[\s\S]*?<\/mesh>/g, (mesh) => {
    const indices = new Map<string, number>();
    const remap: number[] = [];
    const welded = mesh.replace(/<vertices>([\s\S]*?)<\/vertices>/, (_, contents: string) => {
      const vertices: string[] = [];
      for (const match of contents.matchAll(/<vertex\s+[^>]*\/>/g)) {
        const vertex = match[0];
        const coordinates = ['x', 'y', 'z'].map((axis) => {
          const attribute = vertex.match(new RegExp(`\\b${axis}="([^"]+)"`));
          const value = attribute ? Number(attribute[1]) : NaN;
          if (!Number.isFinite(value)) throw new Error('Invalid 3MF vertex coordinate.');
          return value;
        });
        const key = coordinates.join(',');
        let index = indices.get(key);
        if (index === undefined) {
          index = vertices.length;
          indices.set(key, index);
          vertices.push(vertex);
        }
        remap.push(index);
      }
      return `<vertices>${vertices.join('\n')}</vertices>`;
    });
    return welded.replace(/<triangle\s+[^>]*\/>/g, (triangle) =>
      triangle.replace(/\b(v[123])="(\d+)"/g, (_, attribute: string, original: string) => {
        const index = remap[Number(original)];
        if (index === undefined) throw new Error('Invalid 3MF triangle vertex reference.');
        return `${attribute}="${index}"`;
      })
    );
  });
}
