// @vitest-environment node
import { expect, it } from 'vitest';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { importProjectFromJson } from './storage';
import { buildShelfProjectExport, planShelfProjectPlates } from './exportShelfProject';
import { defaultShelfManufacturing } from '$lib/models/shelfManufacturing';
import reference from '../../../static/projects/kallax-4x3-vertical-v1.json?raw';

it('exports every module on named Bambu plates with eight keys per split shell', async () => {
  const project = importProjectFromJson(reference);
  const settings = { ...defaultShelfManufacturing, split: true };
  const plan = planShelfProjectPlates(project, settings);
  expect(plan.plates).toHaveLength(7);
  const shells = plan.plates.filter(plate => plate.name.includes(' · Shell · '));
  expect(shells).toHaveLength(2);
  for (const plate of shells) expect(plate.pieces).toHaveLength(10);
  expect(plan.warnings).toHaveLength(1); // The reference frame is taller than the build volume.
  const result = await buildShelfProjectExport(project, settings);
  const reader = new ZipReader(new BlobReader(result.blob));
  try {
    const entries = await reader.getEntries();
    async function read(name: string) {
      const entry = entries.find(entry => entry.filename === name);
      if (!entry || entry.directory) throw new Error(`Missing ${name}`);
      return entry.getData!(new TextWriter());
    }
    const model = await read('3D/3dmodel.model');
    const config = await read('Metadata/model_settings.config');
    const count = plan.plates.reduce((sum, plate) => sum + plate.pieces.length, 0);
    expect(model.match(/<object\s/g)).toHaveLength(count);
    expect(config.match(/<plate>/g)).toHaveLength(7);
    expect(config.match(/<model_instance>/g)).toHaveLength(count);
    const ids = [...model.matchAll(/<object\s[^>]*?\bid="(\d+)"/g)].map(match => match[1]);
    for (const id of [...config.matchAll(/key="object_id" value="(\d+)"/g)].map(match => match[1]))
      expect(ids).toContain(id);
    expect(JSON.parse(await read('Metadata/insertforge-project.json'))).toEqual(project);
  } finally { await reader.close(); }
});

it('uses extra plates on smaller beds instead of overlapping shell sections and keys', () => {
  const project = importProjectFromJson(reference);
  project.shelfModules = project.shelfModules?.filter(module => module.type === 'card-drawer').slice(0, 1);
  const settings = { ...defaultShelfManufacturing, split: true, bedWidth: 125, bedDepth: 125 };
  const drawer = project.shelfModules![0];
  if (drawer.type !== 'card-drawer') throw new Error('Expected drawer');
  drawer.params.manufacturing = { ...drawer.params.manufacturing!, jointStyle: 'keys' };
  drawer.params.depth = 400;
  const plan = planShelfProjectPlates(project, settings);
  const shellPlates = plan.plates.filter(plate => plate.name.includes(' · Shell · '));
  expect(shellPlates.length).toBeGreaterThan(1);
  expect(shellPlates.reduce((sum, plate) => sum + plate.pieces.length, 0)).toBe(10);
});
