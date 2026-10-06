import { createCardStorageParts, type CardStoragePart } from '$lib/models/cardStorageTray';
import type { CardSize, CardStorageTray } from '$lib/types/project';
import threemfSerializer from '@jscad/3mf-serializer';
import jscad from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import stlSerializer from '@jscad/stl-serializer';
import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { sanitizeExportName } from './exportNames';
import { group3mf } from './group3mf';

export function arrangeCardStorageParts(parts: CardStoragePart[], prefix: string): Geom3[] {
  let x = 0;
  return parts.flatMap((part) => {
    const bounds = jscad.measurements.measureBoundingBox(part.geometry);
    const offset: [number, number, number] = [x - bounds[0][0], -bounds[0][1], -bounds[0][2]];
    x += bounds[1][0] - bounds[0][0] + 10;
    return [part.geometry, ...(part.text ? [part.text] : [])].map((geom, i) => {
      const out = jscad.transforms.translate(offset, geom) as Geom3 & {
        name: string;
        color: [number, number, number, number];
      };
      out.name = `${prefix}-${sanitizeExportName(part.name)}${i ? '-text' : ''}`;
      const baseColor = geom.color ?? [0.15, 0.3, 0.45, 1];
      out.color = i ? [0.98, 0.98, 0.98, 1] : [baseColor[0], baseColor[1], baseColor[2], baseColor[3] ?? 1];
      return out;
    });
  });
}

export async function exportCardStorage(
  tray: CardStorageTray,
  cards: CardSize[],
  selection: string,
  format: 'stl' | '3mf'
) {
  const parts = createCardStorageParts(tray.params, cards).filter(
    (p) => selection === 'all' || p.id === selection || (selection === 'dividers' && p.id !== 'body' && p.id !== 'lid')
  );
  if (!parts.length) throw new Error('No parts selected.');
  const prefix = sanitizeExportName(tray.name);
  let blob: Blob;
  let filename: string;
  if (format === '3mf') {
    let id = 1;
    const groups = parts.map((part) => (part.text ? [id++, id++] : [id++]));
    blob = await group3mf(
      new Blob(
        threemfSerializer.serialize(
          { unit: 'millimeter', metadata: true, compress: true },
          ...arrangeCardStorageParts(parts, prefix)
        )
      ),
      groups
    );
    filename = `${prefix}-${sanitizeExportName(selection)}.3mf`;
  } else {
    const files = parts.map((p) => ({
      name: `${prefix}-${sanitizeExportName(p.name)}.stl`,
      blob: new Blob(
        stlSerializer.serialize({ binary: true }, p.text ? jscad.booleans.union(p.geometry, p.text) : p.geometry)
      )
    }));
    if (files.length === 1) {
      blob = files[0].blob;
      filename = files[0].name;
    } else {
      const writer = new ZipWriter(new BlobWriter('application/zip'));
      for (const file of files) await writer.add(file.name, new BlobReader(file.blob));
      blob = await writer.close();
      filename = `${prefix}-parts.zip`;
    }
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
