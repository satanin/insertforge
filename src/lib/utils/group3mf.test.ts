// @vitest-environment node
import serializer from '@jscad/3mf-serializer';
import jscad from '@jscad/modeling';
import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { expect, it } from 'vitest';
import { createCardStorageParts, defaultCardStorageParams } from '../models/cardStorageTray';
import { group3mf } from './group3mf';

async function modelXml(blob: Blob): Promise<string> {
  const reader = new ZipReader(new BlobReader(blob));
  try {
    const entry = (await reader.getEntries()).find((e) => e.filename === '3D/3dmodel.model')!;
    if (entry.directory) throw new Error('Expected model file');
    return await entry.getData!(new TextWriter());
  } finally {
    await reader.close();
  }
}

function meshes(xml: string) {
  return [...xml.matchAll(/<mesh>([\s\S]*?)<\/mesh>/g)].map(([, mesh]) => {
    const vertices = [...mesh.matchAll(/<vertex\s+([^>]+)\/>/g)].map(([, attrs]) =>
      ['x', 'y', 'z'].map((axis) => Number(attrs.match(new RegExp(`${axis}="([^"]+)"`))![1]))
    );
    const faces = [...mesh.matchAll(/<triangle\s+([^>]+)\/>/g)].map(([, attrs]) =>
      ['v1', 'v2', 'v3'].map((axis) => Number(attrs.match(new RegExp(`${axis}="([^"]+)"`))![1]))
    );
    return { vertices, faces, corners: faces.map((face) => face.map((index) => vertices[index])) };
  });
}

it.each([{ groups: [] }, { groups: [[1]] }])(
  'exports a cube with connected triangle indices even without assemblies ($groups)',
  async ({ groups }) => {
    const raw = new Blob(serializer.serialize({ compress: true }, jscad.primitives.cube()));
    const xml = await modelXml(await group3mf(raw, groups));
    const [mesh] = meshes(xml);
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.corners).toEqual(meshes(await modelXml(raw))[0].corners);
    const edges = new Map<string, number>();
    for (const face of mesh.faces) {
      for (let i = 0; i < 3; i++) {
        const key = [face[i], face[(i + 1) % 3]].sort((a, b) => a - b).join(',');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    expect(xml).not.toContain('<components>');
    expect(xml).toContain('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"');
  }
);

it.each(['KYORYU', 'MEGAN', 'GABRIEL', 'ÓGC'])(
  'preserves %s geometry and separate materials while connecting each mesh',
  async (label) => {
    const parts = createCardStorageParts(
      { ...defaultCardStorageParams, cardSizeId: 'standard', dividers: [{ id: 'sample', label, tab: 'full' }] },
      [{ id: 'standard', name: 'Standard', width: 66, length: 91, thickness: 0.6 }]
    );
    const part = parts.find((p) => p.id === 'sample')!;
    const raw = new Blob(serializer.serialize({ compress: true }, part.geometry, part.text!));
    const original = await modelXml(raw);
    const corrected = await modelXml(await group3mf(raw, [[1, 2]]));
    const before = meshes(original),
      after = meshes(corrected);
    expect(after).toHaveLength(2);
    after.forEach((mesh, i) => {
      expect(mesh.corners).toEqual(before[i].corners);
      expect(mesh.vertices.length).toBeLessThan(before[i].vertices.length);
      expect(new Set(mesh.vertices.map((v) => v.join(','))).size).toBe(mesh.vertices.length);
    });
    expect(corrected.match(/<basematerials[\s\S]*?<\/basematerials>/)?.[0]).toBe(
      original.match(/<basematerials[\s\S]*?<\/basematerials>/)?.[0]
    );
    expect(corrected).toContain('<components><component objectid="1"/><component objectid="2"/></components>');
  }
);

it('builds a single assembly for a plate and its independently coloured text', async () => {
  const cube = jscad.primitives.cube();
  const blob = await group3mf(new Blob(serializer.serialize({ compress: true }, cube, cube, cube)), [[1], [2, 3]]);
  const reader = new ZipReader(new BlobReader(blob));
  const entry = (await reader.getEntries()).find((e) => e.filename === '3D/3dmodel.model')!;
  if (entry.directory) throw new Error('Expected model file');
  const xml = await entry.getData!(new TextWriter());
  expect(xml).toContain('<components><component objectid="2"/><component objectid="3"/></components>');
  expect(xml).toContain('<build><item objectid="1"/><item objectid="4"/></build>');
  expect(xml).toContain('xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"');
  await reader.close();
});
