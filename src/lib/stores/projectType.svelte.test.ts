import { describe, expect, it } from 'vitest';
import { addShelfModule, addShelfFrame, updateShelfFrame, selectShelfModule, removeShelfModule, updateShelfModule, createNewProject, getProject, importProject, initProject, resetProject } from './project.svelte';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';

describe('project types', () => {
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
