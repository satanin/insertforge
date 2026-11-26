import { describe, expect, it } from 'vitest';
import { addShelfModule, addShelfFrame, updateShelfFrame, syncShelfFrames, selectShelfModule, removeShelfModule, updateShelfModule, createNewProject, getProject, importProject, initProject, resetProject } from './project.svelte';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';
import { getProjectCardSizes } from '$lib/utils/projectCards';
import { createShelfManufacturing } from '$lib/models/shelfManufacturing';
import { resolveShelfDrawer } from '$lib/models/shelfStorage';
import referenceProject from '../../../static/projects/kallax-4x3-vertical-v1.json?raw';
import { populateKallaxOpening, convertShelfDrawers, shelfMergeCandidates, shelfMergeNeighbours, canAddShelfModule, applyShelfProjectOptions, setShelfDrawerCustomSetting } from './project.svelte';
import { layoutShelfOpening } from '$lib/models/shelfLayout';
import { createShelfOpeningBuilder, type OpeningFaceRange } from '$lib/models/shelfOpeningGeometry';
import jscad from '@jscad/modeling';
import { jscadToBufferGeometry } from '$lib/utils/jscadToThree';

describe('project types', () => {
  it('moves the full assembly in rear view while keeping different drawer fronts aligned', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    applyShelfProjectOptions({ depth: 250 });
    const modules = getProject().shelfModules!;
    updateShelfModule(modules[1].id, { depth: 180 });
    const before = exportProjectToJson(getProject());
    const build = createShelfOpeningBuilder();
    const bounds = (alignment: 'front' | 'rear') => {
      const ranges: OpeningFaceRange[] = [];
      const geometry = jscadToBufferGeometry(build(modules, getProjectCardSizes(getProject()), ranges, alignment));
      const positions = geometry.getAttribute('position');
      const result = ranges.slice(0, 2).map(range => {
        let min = Infinity, max = -Infinity;
        for (let vertex = range.start * 3; vertex < range.end * 3; vertex++) {
          min = Math.min(min, positions.getY(vertex));
          max = Math.max(max, positions.getY(vertex));
        }
        return { min, max };
      });
      geometry.dispose();
      return result;
    };
    const front = bounds('front'), rear = bounds('rear');
    expect(rear[0].max).toBeCloseTo(388.5);
    expect(rear[0].min - front[0].min).toBeCloseTo(138.5);
    expect(rear[1].min - front[1].min).toBeCloseTo(138.5);
    expect(rear[1].min).toBeCloseTo(rear[0].min);
    expect(rear[0].max - rear[1].max).toBeCloseTo(70);
    expect(exportProjectToJson(getProject())).toBe(before);
  });
  it('applies each project option to all drawers, preserves other custom options and saves defaults for new drawers', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    addShelfFrame();
    const frame = getProject().shelfModules!.find(module => module.type === 'open-frame')!;
    const frameBefore = JSON.stringify(frame);
    const first = getProject().shelfModules!.find(module => module.type === 'card-drawer')!;
    setShelfDrawerCustomSetting(first.id, 'depth', true);
    updateShelfModule(first.id, { depth: 180 });
    expect(applyShelfProjectOptions({ labelWindow: false })).toEqual({ error: '', count: 11 });
    expect(first.params.depth).toBe(180);
    expect(first.type === 'card-drawer' && first.customSettings?.depth).toBe(true);
    for (const module of getProject().shelfModules!.filter(module => module.type === 'card-drawer')) expect(module.params.labelWindow).toBe(false);
    expect(applyShelfProjectOptions({ depth: 250 })).toEqual({ error: '', count: 11 });
    for (const module of getProject().shelfModules!.filter(module => module.type === 'card-drawer')) {
      expect(module.params.depth).toBe(250);
      expect(module.params.labelWindow).toBe(false);
      expect(module.customSettings?.depth).toBe(false);
    }
    expect(JSON.stringify(frame)).toBe(frameBefore);
    const before = exportProjectToJson(getProject());
    expect(applyShelfProjectOptions({ depth: NaN }).error).not.toBe('');
    expect(applyShelfProjectOptions({ depth: 20 }).error).not.toBe('');
    expect(exportProjectToJson(getProject())).toBe(before);
    importProject(importProjectFromJson(before));
    expect(getProject().shelfOptions).toEqual({ depth: 250, labelWindow: false });
    const single = addShelfModule()!, double = addShelfModule(2)!;
    expect(single.params).toMatchObject({ depth: 250, labelWindow: false });
    expect(double.params).toMatchObject({ depth: 250, labelWindow: false, columns: 2 });
    setShelfDrawerCustomSetting(single.id, 'depth', true);
    updateShelfModule(single.id, { depth: 190 });
    setShelfDrawerCustomSetting(single.id, 'depth', false);
    expect(single.params.depth).toBe(250);
  });
  it('blocks additions to a full opening without mutating selection and re-enables each size only when it fits', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    expect(canAddShelfModule(1)).toBe(false);
    expect(canAddShelfModule(2)).toBe(false);
    const before = exportProjectToJson(getProject());
    expect(addShelfModule(1, true)).toBeUndefined();
    expect(addShelfModule(2, true)).toBeUndefined();
    expect(exportProjectToJson(getProject())).toBe(before);
    const ids = getProject().shelfModules!.slice(0, 2).map(module => module.id);
    removeShelfModule(ids[0]);
    expect(canAddShelfModule(1)).toBe(true);
    expect(canAddShelfModule(2)).toBe(false);
    removeShelfModule(ids[1]);
    expect(canAddShelfModule(2)).toBe(true);
    expect(addShelfModule(2, true)).toBeDefined();
    expect(canAddShelfModule(1)).toBe(false);
    expect(layoutShelfOpening(getProject().shelfModules!, getProjectCardSizes(getProject())).unplaced).toEqual([]);
  });
  it('compares effective merge settings and explains real differences with an adjacent drawer', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    const first = getProject().shelfModules![0], second = getProject().shelfModules![1];
    if (first.type !== 'card-drawer' || second.type !== 'card-drawer') throw new Error('Expected drawers');
    updateShelfModule(first.id, { labelWindow: undefined });
    updateShelfModule(second.id, { labelWindow: true, manufacturing: Object.fromEntries(Object.entries(second.params.manufacturing!).reverse()) as typeof second.params.manufacturing });
    expect(shelfMergeCandidates(first.id).map(item => item.id)).toContain(second.id);
    updateShelfModule(first.id, { labelWindow: false });
    expect(shelfMergeCandidates(first.id)).toEqual([]);
    expect(shelfMergeNeighbours(first.id)[0].differences).toContain('Identification window: Off / On');
    updateShelfModule(first.id, { labelWindow: true });
    updateShelfModule(second.id, { depth: 200 });
    expect(shelfMergeNeighbours(first.id)[0].differences).toContain('Exterior depth: 380 / 200');
    expect(convertShelfDrawers(first.id, second.id)).toBe(false);
  });
  it('keeps a double in its original cells when splitting above an earlier empty cell', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    removeShelfModule(getProject().shelfModules![0].id);
    const cards = getProjectCardSizes(getProject());
    const before = layoutShelfOpening(getProject().shelfModules!, cards).placed;
    const double = before.find(item => item.columns === 2)!;
    expect(convertShelfDrawers(double.id)).toBe(true);
    const after = layoutShelfOpening(getProject().shelfModules!, cards);
    expect(after.unplaced).toEqual([]);
    expect(after.placed.find(item => item.id === double.id)).toMatchObject({ column: double.column, row: double.row });
    expect(after.placed.find(item => item.name.endsWith('right'))).toMatchObject({ column: double.column + 1, row: double.row });
    for (const item of before.filter(item => item.id !== double.id)) {
      expect(after.placed.find(module => module.id === item.id)).toMatchObject({ column: item.column, row: item.row });
    }
  });
  it('splits and merges adjacent drawers without moving other cells and persists placements', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    const cards = getProjectCardSizes(getProject());
    const before = layoutShelfOpening(getProject().shelfModules!, cards).placed;
    const double = getProject().shelfModules!.find(module => module.type === 'card-drawer' && module.params.columns === 2)!;
    expect(convertShelfDrawers(double.id)).toBe(true);
    expect(getProject().shelfModules).toHaveLength(12);
    const candidate = shelfMergeCandidates(double.id).find(item => item.name.endsWith('right'))!;
    expect(candidate).toBeDefined();
    const afterSplit = layoutShelfOpening(getProject().shelfModules!, cards);
    expect(afterSplit.unplaced).toEqual([]);
    for (const old of before.filter(item => item.id !== double.id)) {
      expect(afterSplit.placed.find(item => item.id === old.id)).toMatchObject({ x: old.x, y: old.y });
    }
    expect(convertShelfDrawers(double.id, candidate.id)).toBe(true);
    expect(getProject().shelfModules).toHaveLength(11);
    expect(getProject().selectedShelfModuleId).toBe(double.id);
    const result = layoutShelfOpening(getProject().shelfModules!, cards);
    for (const old of before) expect(result.placed.find(item => item.id === old.id)).toMatchObject({ x: old.x, y: old.y, width: old.width });
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    expect(layoutShelfOpening(getProject().shelfModules!, cards).placed).toEqual(result.placed);
    const first = getProject().shelfModules![0];
    const neighbours = shelfMergeCandidates(first.id);
    expect(neighbours.length).toBe(1);
    updateShelfModule(neighbours[0].id, { depth: 200 });
    expect(shelfMergeCandidates(first.id)).toEqual([]);
    const unchanged = exportProjectToJson(getProject());
    expect(convertShelfDrawers(first.id, neighbours[0].id)).toBe(false);
    expect(convertShelfDrawers(first.id, getProject().shelfModules![4].id)).toBe(false);
    expect(exportProjectToJson(getProject())).toBe(unchanged);
  });
  it('updates both opening views when a drawer identification window changes', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    const module = getProject().shelfModules![0];
    const cards = getProjectCardSizes(getProject());
    const build = createShelfOpeningBuilder();
    const ranges: OpeningFaceRange[] = [];
    const open = build(getProject().shelfModules!, cards, ranges);
    expect(ranges.map(range => range.id)).toEqual(getProject().shelfModules!.map(module => module.id));
    expect(ranges.every((range, index) => range.end > range.start && (index === 0 || ranges[index - 1].end === range.start))).toBe(true);
    const triangles = jscad.geometries.geom3.toPolygons(open).reduce((count, polygon) => count + Math.max(0, polygon.vertices.length - 2), 0);
    expect(ranges[ranges.length - 1].end).toBe(triangles);
    expect(ranges[0].start).toBeGreaterThan(0); // Furniture has no drawer ID.
    expect(new Set(jscad.geometries.geom3.toPolygons(open).map(polygon => JSON.stringify(polygon.color))).size).toBeGreaterThan(2);
    updateShelfModule(module.id, { labelWindow: false });
    expect(layoutShelfOpening(getProject().shelfModules!, cards).placed[0].labelWindow).toBe(false);
    const closed = build(getProject().shelfModules!, cards);
    // Closed fronts are thinner than the label pocket walls, so compare change, not direction.
    expect(Math.abs(jscad.measurements.measureVolume(closed) - jscad.measurements.measureVolume(open))).toBeGreaterThan(1);
    expect(jscad.measurements.measureBoundingBox(closed)).toEqual(jscad.measurements.measureBoundingBox(open));
    updateShelfModule(module.id, { labelWindow: true });
    expect(jscad.measurements.measureVolume(build(getProject().shelfModules!, cards))).toBeCloseTo(jscad.measurements.measureVolume(open), 5);
  });
  it('creates eleven real drawers filling twelve KALLAX cells and preserves them through JSON', () => {
    createNewProject('shelf-storage', 'KALLAX', true);
    const modules = getProject().shelfModules!;
    expect(modules).toHaveLength(11);
    expect(modules.filter(module => module.type === 'card-drawer' && module.params.columns === 2)).toHaveLength(1);
    let layout = layoutShelfOpening(modules, getProjectCardSizes(getProject()));
    expect(layout.unplaced).toEqual([]);
    expect(layout.placed).toHaveLength(11);
    for (const a of layout.placed) {
      expect(a.x + a.width).toBeLessThanOrEqual(335);
      expect(a.y).toBeGreaterThanOrEqual(0);
      for (const b of layout.placed.filter(item => item.id !== a.id)) {
        expect(a.x >= b.x + b.width - 0.01 || b.x >= a.x + a.width - 0.01 || a.y >= b.y + b.height - 0.01 || b.y >= a.y + a.height - 0.01).toBe(true);
      }
    }
    populateKallaxOpening();
    expect(getProject().shelfModules).toHaveLength(11);
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    layout = layoutShelfOpening(getProject().shelfModules!, getProjectCardSizes(getProject()));
    expect(layout.placed).toHaveLength(11);
    addShelfModule();
    expect(layoutShelfOpening(getProject().shelfModules!, getProjectCardSizes(getProject())).unplaced).toHaveLength(1);
    removeShelfModule(getProject().selectedShelfModuleId!);
    updateShelfModule(getProject().shelfModules![0].id, { headroom: 25 });
    expect(layoutShelfOpening(getProject().shelfModules!, getProjectCardSizes(getProject())).unplaced.length).toBeGreaterThan(0);
  });
  it('creates a double module while keeping frame references on the single-cell pitch', () => {
    importProject(importProjectFromJson(referenceProject));
    const single = getProject().shelfModules!.find(module => module.type === 'card-drawer')!;
    if (single.type !== 'card-drawer') throw new Error('Expected drawer');
    selectShelfModule(single.id);
    const double = addShelfModule(2)!;
    const project = getProject();
    const cards = getProjectCardSizes(project);
    const r = resolveShelfDrawer(double.params, cards);
    expect(double.params.columns).toBe(2);
    expect(double.params.centerDivider).toBe(true);
    expect(double.params).toMatchObject({ wideHandle: true, labelWindows: 2, labelWindow: true });
    expect(r.bodyWidth).toBeCloseTo(2 * resolveShelfDrawer(single.params, cards).bodyWidth);
    addShelfFrame();
    const frameId = getProject().selectedShelfModuleId!;
    const frame = getProject().shelfModules!.find(module => module.id === frameId)!;
    if (frame.type !== 'open-frame') throw new Error('Expected frame');
    expect(frame.params.pitchWidth).toBeCloseTo(r.cellWidth);
    syncShelfFrames(double.id, frame.id);
    expect(frame.params.pitchWidth).toBeCloseTo(r.cellWidth);
    selectShelfModule(double.id);
    expect(addShelfModule()!.params.columns).toBe(1);
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restored = getProject().shelfModules!.find(module => module.id === double.id)!;
    expect(restored.params).toMatchObject({ columns: 2, centerDivider: true, depth: 380 });
  });
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
