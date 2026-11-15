import stl from '@jscad/stl-serializer';
import threemf from '@jscad/3mf-serializer';
import type { ShelfModule } from '$lib/models/shelfStorage';
import { createShelfDrawerParts, shelfPrintGeometry, type ShelfPartId } from '$lib/models/shelfStorage';
import type { CardSize } from '$lib/types/project';
import { group3mf } from './group3mf';
import { sanitizeExportName } from './exportNames';
import { createShelfFrame } from '$lib/models/shelfFrame';
import { createShelfManufacturing, shelfCornerSamplePlate, shelfDividerRearReplacement } from '$lib/models/shelfManufacturing';
import { prepareShelfMesh } from './prepareShelfMesh';

export async function buildShelfModuleExport(module: ShelfModule, cards: CardSize[], part: ShelfPartId, format: 'stl' | '3mf') {
  if (module.type === 'card-drawer' && module.params.manufacturing?.split && part !== 'handle')
    throw new Error('Split manufacturing is enabled. Export the numbered sections and joining keys.');
  if (module.type === 'open-frame' && part !== 'shell') throw new Error('Open frames export as one piece.');
  const geometry = module.type === 'open-frame' ? createShelfFrame(module.params, true)
    : shelfPrintGeometry(createShelfDrawerParts(module.params, cards), part);
  const filename = `${sanitizeExportName(module.name)}-${module.type === 'open-frame' ? 'frame' : part}.${format}`;
  const blob = format === 'stl'
    ? new Blob(stl.serialize({ binary: true }, geometry))
    : await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true }, geometry)), []);
  return { filename, blob };
}

export async function buildShelfManufacturingExport(module: ShelfModule, cards: CardSize[], itemId: string, format: 'stl' | '3mf') {
  if (module.type !== 'card-drawer') throw new Error('Depth splitting currently supports card drawers only.');
  if (itemId === 'divider-rear-replacement-380') {
    const replacement = shelfDividerRearReplacement(module.params, cards);
    if (!replacement.fits) throw new Error('The replacement exceeds the configured print volume.');
    const geometry = prepareShelfMesh(replacement.printGeometry);
    const blob = format === 'stl' ? new Blob(stl.serialize({ binary: true }, geometry))
      : await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true }, geometry)), []);
    return { filename: `divider-rear-replacement-390-to-380mm.${format}`, blob };
  }
  const model = createShelfManufacturing(module.params, cards);
  const item = model.items.find(item => item.id === itemId);
  if (!item) throw new Error('Select an available manufacturing part.');
  if (!item.fits) throw new Error('This part exceeds the configured print volume.');
  const geometry = prepareShelfMesh(item.printGeometry);
  const variant = model.divider && (item.part === 'drawer' || item.id.startsWith('divider-test-'))
    ? `-divider-dovetail-${model.resolved.depth}mm-shell`
    : '';
  const filename = `${sanitizeExportName(module.name)}${variant}-${item.id}-x${item.quantity}.${format}`;
  const blob = format === 'stl' ? new Blob(stl.serialize({ binary: true }, geometry))
    : await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true }, geometry)), []);
  return { filename, blob };
}

export async function exportShelfManufacturing(module: ShelfModule, cards: CardSize[], itemId: string, format: 'stl' | '3mf') {
  const { filename, blob } = await buildShelfManufacturingExport(module, cards, itemId, format);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function buildShelfCornerSampleExport(module: ShelfModule, cards: CardSize[]) {
  if (module.type !== 'card-drawer') throw new Error('Select a card drawer.');
  const model = createShelfManufacturing(module.params, cards);
  const geometry = shelfCornerSamplePlate(model).map(prepareShelfMesh);
  const blob = await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true }, ...geometry)), []);
  return { filename: `${sanitizeExportName(module.name)}-cf-corner-test-floor-${module.params.drawerFloor}mm${model.floorKeys ? '-floor-keys' : ''}-${geometry.length}-parts.3mf`, blob };
}
export async function exportShelfCornerSample(module: ShelfModule, cards: CardSize[]) {
  const { filename, blob } = await buildShelfCornerSampleExport(module, cards);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportShelfModule(module: ShelfModule, cards: CardSize[], part: ShelfPartId, format: 'stl' | '3mf') {
  const { filename, blob } = await buildShelfModuleExport(module, cards, part, format);
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
