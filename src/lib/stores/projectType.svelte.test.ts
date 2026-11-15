import { describe, expect, it } from 'vitest';
import { addShelfModule, addShelfFrame, updateShelfFrame, syncShelfFrames, selectShelfModule, removeShelfModule, updateShelfModule, createNewProject, getProject, importProject, initProject, resetProject } from './project.svelte';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';
import { getProjectCardSizes } from '$lib/utils/projectCards';
import { createShelfManufacturing } from '$lib/models/shelfManufacturing';
import referenceProject from '../../../static/projects/kallax-4x3-vertical-v1.json?raw';

describe('project types', () => {
  it('loads both printable 380 mm reference drawers on the same pitch as the open frame', () => {
    importProject(importProjectFromJson(referenceProject));
    const project = getProject();
    const cards = getProjectCardSizes(project);
    const modules = project.shelfModules ?? [];
    const frame = modules.find(module => module.type === 'open-frame')!;
    const drawers = modules.filter(module => module.type === 'card-drawer');
    expect(drawers.map(drawer => drawer.params.manufacturing?.jointStyle)).toEqual(['lap-keys', 'divider-dovetail']);
    for (const drawer of drawers) {
      const model = createShelfManufacturing(drawer.params, cards);
      expect(model.resolved.depth).toBe(380);
      expect(model.resolved.bodyWidth).toBeCloseTo(frame.params.pitchWidth);
      expect(model.resolved.bodyHeight).toBeCloseTo(frame.params.pitchHeight);
      expect(model.items.filter(item => item.part !== 'sample').every(item => item.fits)).toBe(true);
    }
  });
  it('persists printer volume and split settings without resizing frame snapshots', () => {
    createNewProject('shelf-storage');
    const drawer = addShelfModule()!;
    addShelfFrame();
    const before = structuredClone($state.snapshot(getProject().shelfModules!.find(m => m.type === 'open-frame')!.params));
    updateShelfModule(drawer.id, { manufacturing: { split: true, bedWidth: 250, bedDepth: 220,
      buildHeight: 240, margin: 5, jointClearance: 0.15 } });
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restored = getProject().shelfModules!.find(m => m.id === drawer.id)!;
    expect(restored.type === 'card-drawer' && restored.params.manufacturing).toEqual({ split: true,
      bedWidth: 250, bedDepth: 220, buildHeight: 240, margin: 5, jointClearance: 0.15 });
    expect(getProject().shelfModules!.find(m => m.type === 'open-frame')!.params).toEqual(before);
  });
  it('explicitly updates all frame snapshots to the trial unit without losing structure or selection', () => {
    createNewProject('shelf-storage');
    const drawer = addShelfModule()!;
    addShelfFrame();
    const first = getProject().selectedShelfModuleId!;
    updateShelfFrame(first, { columns: 3, rows: 1, wall: 10 }, 'Wide frame');
    addShelfFrame();
    const second = getProject().selectedShelfModuleId!;
    updateShelfModule(drawer.id, { shellThickness: 3.6, roofThickness: 3.6, socketWebThickness: 1,
      drawerFloor: 2, bottomTracks: false, headroom: 1, depth: 180, handleClearance: 0.12, handleRetention: true });
    expect(syncShelfFrames('missing')).toBe(0);
    expect(syncShelfFrames(drawer.id)).toBe(2);
    const frames = getProject().shelfModules!.filter(m => m.type === 'open-frame');
    for (const frame of frames) {
      expect(frame.params.pitchWidth).toBeCloseTo(80.2);
      expect(frame.params.pitchHeight).toBeCloseTo(109.55);
      expect(frame.params.depth).toBe(180);
    }
    expect(frames.find(m => m.id === first)).toMatchObject({ name: 'Wide frame', params: { columns: 3, rows: 1, wall: 10 } });
    expect(getProject().selectedShelfModuleId).toBe(second);
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    expect(getProject().shelfModules?.find(m => m.id === second)?.params.depth).toBe(180);
    updateShelfModule(drawer.id, { depth: 250 });
    expect(syncShelfFrames(drawer.id, first)).toBe(1);
    expect(getProject().shelfModules?.find(m => m.id === first)?.params.depth).toBe(250);
    expect(getProject().shelfModules?.find(m => m.id === second)?.params.depth).toBe(180);
  });
  it('removes modules with a valid surviving selection and persists an empty list', () => {
    createNewProject('shelf-storage');
    const first = addShelfModule()!;
    addShelfFrame();
    const frameId = getProject().selectedShelfModuleId!;
    removeShelfModule(first.id);
    expect(getProject().selectedShelfModuleId).toBe(frameId);
    const next = addShelfModule()!;
    removeShelfModule(next.id);
    expect(getProject().selectedShelfModuleId).toBe(frameId);
    removeShelfModule(frameId);
    expect(getProject().selectedShelfModuleId).toBeNull();
    removeShelfModule('missing');
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    expect(getProject().shelfModules).toEqual([]);
  });
  it('persists a frame with an independent compatibility snapshot', () => {
    createNewProject('shelf-storage');
    const drawer = addShelfModule()!;
    addShelfFrame();
    const frame = getProject().shelfModules?.find(m => m.type === 'open-frame');
    expect(frame?.type).toBe('open-frame');
    if (frame?.type !== 'open-frame') throw new Error('Missing frame');
    const snapshot = { ...frame.params };
    updateShelfModule(drawer.id, { headroom: 20, depth: 300 });
    expect(frame.params).toEqual(snapshot);
    updateShelfFrame(frame.id, { columns: 3 }, 'Wide opening');
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const saved = getProject().shelfModules?.find(m => m.id === frame.id);
    expect(saved).toMatchObject({ type: 'open-frame', name: 'Wide opening', params: { ...snapshot, columns: 3 } });
    selectShelfModule(drawer.id);
    expect(getProject().selectedShelfModuleId).toBe(drawer.id);
  });
  it('persists shelf modules and selection outside layers without changing inserts', () => {
    createNewProject();
    expect(addShelfModule()).toBeUndefined();
    createNewProject('shelf-storage');
    const first = addShelfModule()!;
    updateShelfModule(first.id, { depth: 180, labelWindow: true, labelWidth: 63, labelHeight: 88, handleColor: '#123456' }, 'Magic');
    const second = addShelfModule()!;
    expect(second.id).not.toBe(first.id);
    expect(second.params).toEqual({ ...getProject().shelfModules?.[0].params, depth: 380 });
    updateShelfModule(second.id, { depth: 250 });
    expect(getProject().shelfModules?.[0].params.depth).toBe(180);
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    expect(getProject().layers).toEqual([]);
    expect(getProject().shelfModules?.[0].name).toBe('Magic');
    expect(getProject().shelfModules?.[0].params.depth).toBe(180);
    expect(getProject().shelfModules?.[0].params).toMatchObject({ labelWindow: true, labelWidth: 63, labelHeight: 88, handleColor: '#123456' });
    expect(getProject().selectedShelfModuleId).toBe(second.id);
  });
  it('creates an insert by default with a real initial layer', () => {
    createNewProject();
    expect(getProject().projectType).toBe('insert');
    expect(getProject().layers).toHaveLength(1);
    expect(getProject().selectedLayerId).toBe(getProject().layers[0].id);
  });

  it('creates shelf storage without synthetic layers and saves it immediately', () => {
    createNewProject('shelf-storage', '  Magic collection  ');
    expect(getProject().name).toBe('Magic collection');
    expect(getProject().layers).toEqual([]);
    expect(getProject().selectedLayerId).toBeNull();
    expect(getProject().globalSettings).toBeUndefined();
    resetProject();
    initProject();
    expect(getProject().projectType).toBe('shelf-storage');
    expect(getProject().name).toBe('Magic collection');
    expect(getProject().layers).toEqual([]);
  });

  it('preserves shelf type and catalog through JSON export and import', () => {
    createNewProject('shelf-storage');
    const saved = exportProjectToJson(getProject());
    const cards = JSON.parse(saved).cardSizes;
    createNewProject();
    importProject(importProjectFromJson(saved));
    expect(getProject().projectType).toBe('shelf-storage');
    expect(getProject().layers).toEqual([]);
    expect(getProject().cardSizes).toEqual(cards);
  });

  it('loads files without a type as inserts without losing their layers', () => {
    resetProject();
    const legacy = JSON.parse(exportProjectToJson(getProject()));
    delete legacy.projectType;
    const restored = importProjectFromJson(JSON.stringify(legacy));
    expect(restored.projectType).toBe('insert');
    expect(restored.layers.map(layer => layer.id)).toEqual(legacy.layers.map((layer: { id: string }) => layer.id));
  });
});
