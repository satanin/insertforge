import jscad from '@jscad/modeling';
import threemf from '@jscad/3mf-serializer';
import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from '@zip.js/zip.js';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { Project } from '$lib/types/project';
import { createShelfFrame } from '$lib/models/shelfFrame';
import { createShelfManufacturing, defaultShelfManufacturing, fitShelfPrint, shelfManufacturingSets,
  type ShelfManufacturingSettings } from '$lib/models/shelfManufacturing';
import { getProjectCardSizes } from './projectCards';
import { prepareShelfMesh } from './prepareShelfMesh';
import { group3mf } from './group3mf';
import { sanitizeExportName } from './exportNames';
// Blank configuration exported by Bambu Studio 2.6.1.55, without a machine preset.
import bambuDefaults from '$lib/data/bambu3mfDefaults.json';

const escapeXml = (text: string) => text.replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

interface ProjectPlate {
  name: string;
  pieces: { name: string; geometry: Geom3 }[];
}

function plateOffset(index: number, count: number, settings: ShelfManufacturingSettings): [number, number, number] {
  const columns = Math.ceil(Math.sqrt(count));
  return [index % columns * settings.bedWidth * 1.2, -Math.floor(index / columns) * settings.bedDepth * 1.2, 0];
}

export function shelfProjectPreview(plan: ReturnType<typeof planShelfProjectPlates>, settings: ShelfManufacturingSettings) {
  const geometries = plan.plates.flatMap((plate, index) => {
    const offset = plateOffset(index, plan.plates.length, settings);
    const bed = jscad.primitives.cuboid({ size: [settings.bedWidth, settings.bedDepth, 0.5],
      center: [settings.bedWidth / 2, settings.bedDepth / 2, -0.75] });
    return [jscad.colors.colorize([0.18, 0.22, 0.28, 1], jscad.transforms.translate(offset, bed)),
      ...plate.pieces.map(piece => {
        const color = piece.name.toLowerCase().includes('key') && piece.name.toLowerCase().includes('mm section')
          ? [0.95, 0.64, 0.25, 1] : piece.geometry.color ?? (index % 2 ? [0.52, 0.65, 0.76, 1] : [0.28, 0.39, 0.51, 1]);
        return jscad.colors.colorize(color as [number, number, number, number], jscad.transforms.translate(offset, piece.geometry));
      })];
  });
  return jscad.geometries.geom3.create(geometries.flatMap(geometry => jscad.geometries.geom3.toPolygons(geometry)
    .map(polygon => ({ ...polygon, color: geometry.color }))));
}

export function planShelfProjectPlates(project: Project, settings: ShelfManufacturingSettings) {
  if (project.projectType !== 'shelf-storage') throw new Error('Open a shelf storage project.');
  const cards = getProjectCardSizes(project);
  const plates: ProjectPlate[] = [];
  const warnings: string[] = [];
  for (const module of project.shelfModules ?? []) {
    if (module.type === 'open-frame') {
      const item = fitShelfPrint(createShelfFrame(module.params, true), settings);
      if (!item.fits) warnings.push(`${module.name} exceeds the printer volume. Frame splitting is not available.`);
      plates.push({ name: module.name, pieces: [{ name: module.name, geometry:
        jscad.transforms.translate([settings.margin, settings.margin, 0], item.printGeometry) }] });
      continue;
    }
    const manufacturing = { ...defaultShelfManufacturing, ...module.params.manufacturing,
      bedWidth: settings.bedWidth, bedDepth: settings.bedDepth, buildHeight: settings.buildHeight, margin: settings.margin };
    let model: ReturnType<typeof createShelfManufacturing>;
    try { model = createShelfManufacturing({ ...module.params, manufacturing }, cards); }
    catch (error) { throw new Error(`${module.name}: ${error instanceof Error ? error.message : 'Invalid manufacturing settings.'}`); }
    for (const set of shelfManufacturingSets(model)) {
      if (!set.fits) warnings.push(`${module.name} · ${set.name} contains a part exceeding the printer volume.`);
      for (let index = 0; index < set.plates; index++) {
        plates.push({ name: `${module.name} · ${set.name} · ${module.params.depth} mm${set.plates > 1 ? ` · ${index + 1}/${set.plates}` : ''}`,
          pieces: set.pieces.filter(piece => piece.plateIndex === index).map((piece, number) => ({
            name: `${module.name} · ${piece.name} · ${module.params.depth} mm · ${number + 1}`,
            geometry: jscad.transforms.translate([-index * (settings.bedWidth + 20), 0, 0], piece.geometry)
          })) });
      }
    }
  }
  if (!plates.length) throw new Error('Add at least one module to export.');
  if (plates.length > 36) throw new Error('This project needs more than 36 plates. Export fewer modules together.');
  return { plates, warnings };
}

/** Bambu plate assignments supplement a welded, standards-based 3MF mesh archive. */
export async function buildShelfProjectExport(project: Project, settings: ShelfManufacturingSettings) {
  const plan = planShelfProjectPlates(project, settings);
  const objects = plan.plates.flatMap((plate, index) => plate.pieces.map(piece => ({
    ...piece, plate: index,
    geometry: prepareShelfMesh(jscad.transforms.translate(plateOffset(index, plan.plates.length, settings), piece.geometry))
  })));
  const archive = await group3mf(new Blob(threemf.serialize({ unit: 'millimeter', metadata: true, compress: true },
    ...objects.map(object => object.geometry))), []);
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?><config>${objects.map((object, index) =>
    `<object id="${index + 1}"><metadata key="name" value="${escapeXml(object.name)}"/><metadata key="extruder" value="1"/></object>`).join('')}${plan.plates.map((plate, index) =>
    `<plate><metadata key="plater_id" value="${index + 1}"/><metadata key="plater_name" value="${escapeXml(plate.name)}"/><metadata key="locked" value="false"/>${objects.flatMap((object, objectIndex) => object.plate === index ? [
      `<model_instance><metadata key="object_id" value="${objectIndex + 1}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="${objectIndex + 1}"/></model_instance>`] : []).join('')}</plate>`).join('')}</config>`;
  const reader = new ZipReader(new BlobReader(archive));
  const writer = new ZipWriter(new BlobWriter('model/3mf'));
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) continue;
      if (entry.filename === '3D/3dmodel.model') {
        let xml = await entry.getData!(new TextWriter());
        xml = xml.replace(/<metadata\s+name="Application"[^>]*>[\s\S]*?<\/metadata>/g, '');
        xml = xml.replace(/(<model\b[^>]*>)/, '$1<metadata name="Application">BambuStudio-02.06.01.55</metadata><metadata name="Designer">InsertForge</metadata>');
        xml = xml.replace(/<object\b([^>]*?)\bid="(\d+)"([^>]*)>/g, (match, before, id, after) => {
          const object = objects[Number(id) - 1];
          return object ? `<object${before}id="${id}"${after.replace(/\sname="[^"]*"/, '')} name="${escapeXml(object.name)}">` : match;
        });
        await writer.add(entry.filename, new TextReader(xml));
      } else await writer.add(entry.filename, new BlobReader(await entry.getData!(new BlobWriter())));
    }
    await writer.add('Metadata/model_settings.config', new TextReader(modelSettings));
    await writer.add('Metadata/project_settings.config', new TextReader(JSON.stringify({
      ...bambuDefaults,
      printable_area: [`0x0`, `${settings.bedWidth}x0`, `${settings.bedWidth}x${settings.bedDepth}`, `0x${settings.bedDepth}`],
      printable_height: String(settings.buildHeight), bed_exclude_area: [], print_sequence: 'by layer',
      printer_settings_id: 'InsertForge print volume', printer_model: '', printer_variant: '0.4',
      print_settings_id: 'InsertForge parts', filament_settings_id: ['Generic PLA'],
      inherits_group: ['', '', ''], different_settings_to_system: ['', '', ''],
      nozzle_diameter: ['0.4'], filament_colour: ['#A8B9C8'], filament_type: ['PLA']
    })));
    await writer.add('Metadata/insertforge-project.json', new TextReader(JSON.stringify(project, null, 2)));
    return { blob: await writer.close(), filename: `${sanitizeExportName(project.name)}-all-parts.3mf`,
      plateCount: plan.plates.length, warnings: plan.warnings };
  } finally { await reader.close(); }
}
