import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from '@zip.js/zip.js';
import { weld3mfVertices } from './weld3mfVertices';

/** Serializer object IDs are their one-based geometry indices. Build assemblies so
 * slicers arrange each plate and its inlay together, preserving separate materials.
 * Always normalize mesh connectivity, including exports without assemblies. */
export async function group3mf(blob: Blob, groups: number[][]): Promise<Blob> {
  const assemblies = groups.filter((g) => g.length > 1);
  const reader = new ZipReader(new BlobReader(blob));
  const writer = new ZipWriter(new BlobWriter('model/3mf'));
  try {
    const entries = await reader.getEntries();
    for (const entry of entries) {
      if (entry.directory) continue;
      if (entry.filename === '3D/3dmodel.model') {
        let xml = weld3mfVertices(await entry.getData!(new TextWriter()));
        if (assemblies.length) {
          const ids = [...xml.matchAll(/<object\s+id="(\d+)"/g)].map((m) => Number(m[1]));
          let nextId = Math.max(...ids) + 1;
          const grouped = new Set(assemblies.flat());
          const resources = assemblies.map((group) => {
            if (group.some((id) => !ids.includes(id))) throw new Error('Invalid 3MF component reference.');
            const id = nextId++;
            return {
              id,
              xml: `<object id="${id}" type="model" name="Assembly ${id}"><components>${group.map((objectid) => `<component objectid="${objectid}"/>`).join('')}</components></object>`
            };
          });
          xml = xml.replace('</resources>', `${resources.map((r) => r.xml).join('\n')}</resources>`);
          xml = xml.replace(
            /<build>[\s\S]*?<\/build>/,
            `<build>${[...ids.filter((id) => !grouped.has(id)), ...resources.map((r) => r.id)].map((id) => `<item objectid="${id}"/>`).join('')}</build>`
          );
        }
        if (!/<model\b[^>]*\sxmlns=/.test(xml)) {
          xml = xml.replace('<model ', '<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ');
        }
        await writer.add(entry.filename, new TextReader(xml));
      } else {
        await writer.add(entry.filename, new BlobReader(await entry.getData!(new BlobWriter())));
      }
    }
    return await writer.close();
  } finally {
    await reader.close();
  }
}
