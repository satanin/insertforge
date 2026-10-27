// @vitest-environment node
import { expect, it } from 'vitest';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { buildShelfModuleExport } from './exportShelfModule';
import { defaultShelfDrawerParams } from '$lib/models/shelfStorage';
import type { CardSize } from '$lib/types/project';

it('exports each physical component independently as STL and connected 3MF', async () => {
  const cards: CardSize[] = [{ id: 'standard', name: 'Standard', width: 63, length: 88, thickness: 0.3 }];
  const module = { id: 'test', name: 'Magic cards', type: 'card-drawer' as const, params: { ...defaultShelfDrawerParams } };
  for (const part of ['shell', 'drawer', 'handle'] as const) {
    const stl = await buildShelfModuleExport(module, cards, part, 'stl');
    expect(stl.filename).toBe(`magic-cards-${part}.stl`);
    expect(stl.blob.size).toBeGreaterThan(84);
    const result = await buildShelfModuleExport(module, cards, part, '3mf');
    expect(result.filename).toBe(`magic-cards-${part}.3mf`);
    const reader = new ZipReader(new BlobReader(result.blob));
    try {
      const entry = (await reader.getEntries()).find(e => e.filename === '3D/3dmodel.model')!;
      if (!entry || entry.directory) throw new Error('Expected a 3MF model file');
      const xml = await entry.getData!(new TextWriter());
      expect(xml.match(/<object\s/g)).toHaveLength(1);
      expect(xml).toContain('unit="millimeter"');
      expect(xml).toContain('<triangle');
      const heights = [...xml.matchAll(/<vertex\s+[^>]*z="([^"]+)"/g)].map(match => Number(match[1]));
      expect(Math.min(...heights)).toBeCloseTo(0);
      if (part === 'shell') expect(Math.max(...heights)).toBeCloseTo(module.params.depth);
      if (part === 'handle') expect(Math.max(...heights)).toBeLessThan(29);
    } finally { await reader.close(); }
  }
});
