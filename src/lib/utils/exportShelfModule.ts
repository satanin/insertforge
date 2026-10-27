import stl from '@jscad/stl-serializer';
import threemf from '@jscad/3mf-serializer';
import type { ShelfModule } from '$lib/models/shelfStorage';
import { createShelfDrawerParts, shelfPrintGeometry, type ShelfPartId } from '$lib/models/shelfStorage';
import type { CardSize } from '$lib/types/project';
import { group3mf } from './group3mf';
import { sanitizeExportName } from './exportNames';
import { createShelfFrame } from '$lib/models/shelfFrame';

export async function buildShelfModuleExport(module: ShelfModule, cards: CardSize[], part: ShelfPartId, format: 'stl' | '3mf') {
  if (module.type === 'open-frame' && part !== 'shell') throw new Error('Open frames export as one piece.');
  const geometry = module.type === 'open-frame' ? createShelfFrame(module.params, true)
    : shelfPrintGeometry(createShelfDrawerParts(module.params, cards), part);
  const filename = `${sanitizeExportName(module.name)}-${module.type === 'open-frame' ? 'frame' : part}.${format}`;
  const blob = format === 'stl'
    ? new Blob(stl.serialize({ binary: true }, geometry))
    : await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true }, geometry)), []);
  return { filename, blob };
}

export async function exportShelfModule(module: ShelfModule, cards: CardSize[], part: ShelfPartId, format: 'stl' | '3mf') {
  const { filename, blob } = await buildShelfModuleExport(module, cards, part, format);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
