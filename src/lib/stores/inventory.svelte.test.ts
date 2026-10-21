import { availableQuantity, groupAssignments } from '$lib/utils/inventory';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addInventoryGroup,
  addLayeredBox,
  addLooseTray,
  deleteInventoryGroup,
  duplicateTray,
  getProject,
  importProject,
  resetProjectToBlank,
  setInventoryContent,
  updateInventoryGroup,
  updateLayeredBox
} from './project.svelte';

describe('project inventory', () => {
  beforeEach(resetProjectToBlank);
  it('keeps top/edge loading and edge orientation per group through save and reapply', () => {
    const top = tokens();
    const edge = addInventoryGroup('tokens', top.id);
    const tray = addLooseTray(undefined, 'counter')!;
    expect(
      setInventoryContent(tray.id, [
        { groupId: top.id, quantity: 5, revision: 0, loading: 'top' },
        { groupId: edge.id, quantity: 8, revision: 0, loading: 'edge', edgeOrientation: 'crosswise' }
      ])
    ).toBeNull();
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restored = getProject().layers[0].looseTrays.find((t) => t.id === tray.id)!;
    expect(setInventoryContent(tray.id, restored.inventoryAssignments!)).toBeNull();
    const applied = getProject().layers[0].looseTrays.find((t) => t.id === tray.id)!;
    if (applied.type !== 'counter') throw new Error('Wrong tray');
    expect(applied.params.topLoadedStacks).toHaveLength(1);
    expect(applied.params.topLoadedStacks[0][1]).toBe(5);
    expect(applied.params.edgeLoadedStacks).toHaveLength(1);
    expect(applied.params.edgeLoadedStacks[0].slice(1, 3)).toEqual([8, 'crosswise']);
  });
  const content = (id: string, quantity: number) => [{ groupId: id, quantity, revision: 0 }];
  function tokens() {
    const group = addInventoryGroup('tokens');
    updateInventoryGroup(group.id, { name: 'Health', quantity: 50, baseShape: 'square', width: 20, thickness: 2 });
    return getProject().inventory!.find((g) => g.id === group.id)!;
  }
  it('inherits the first card selection without changing previously entered groups', () => {
    const first = addInventoryGroup('cards');
    const size = getProject().cardSizes[2];
    updateInventoryGroup(first.id, {
      cardSizeId: size.id,
      sleeve: 'premium',
      width: size.width,
      depth: size.length,
      thickness: 0.8
    });
    const second = addInventoryGroup('cards');
    expect(second).toMatchObject({ cardSizeId: size.id, sleeve: 'premium', thickness: 0.8 });
    updateInventoryGroup(second.id, { sleeve: 'none', thickness: 0.3 });
    expect(addInventoryGroup('cards').sleeve).toBe('premium');
    expect(getProject().inventory![0].sleeve).toBe('premium');
  });
  it('splits quantities, names their pieces, rejects over-allocation and releases manual content', () => {
    const group = tokens();
    const a = addLooseTray(undefined, 'counter')!;
    const b = addLooseTray(undefined, 'counter')!;
    expect(setInventoryContent(a.id, content(group.id, 25))).toBeNull();
    expect(setInventoryContent(b.id, content(group.id, 26))).toContain('Not enough');
    expect(availableQuantity(getProject(), group.id)).toBe(25);
    expect(setInventoryContent(b.id, content(group.id, 25))).toBeNull();
    expect(groupAssignments(getProject(), group.id).map((a) => a.name)).toEqual(
      expect.arrayContaining([expect.stringContaining(a.name), expect.stringContaining(b.name)])
    );
    expect(updateInventoryGroup(group.id, { quantity: 49 })).toBeTruthy();
    expect(deleteInventoryGroup(group.id)).toBeTruthy();
    expect(setInventoryContent(a.id, [])).toBeNull();
    expect(availableQuantity(getProject(), group.id)).toBe(25);
  });
  it('keeps applied geometry as a snapshot until explicitly reapplied', () => {
    const group = tokens();
    const tray = addLooseTray(undefined, 'counter')!;
    expect(setInventoryContent(tray.id, content(group.id, 10))).toBeNull();
    const getTray = () => getProject().layers[0].looseTrays.find((t) => t.id === tray.id)!;
    const before = getTray();
    if (before.type !== 'counter') throw new Error('Wrong tray');
    const id = before.params.topLoadedStacks[0][0];
    expect(getProject().counterShapes.find((s) => s.id === id)?.width).toBe(20);
    updateInventoryGroup(group.id, { width: 22 });
    expect(getProject().counterShapes.find((s) => s.id === id)?.width).toBe(20);
    expect(setInventoryContent(tray.id, content(group.id, 10))).toBeNull();
    const after = getTray();
    if (after.type !== 'counter') throw new Error('Wrong tray');
    expect(getProject().counterShapes.find((s) => s.id === after.params.topLoadedStacks[0][0])?.width).toBe(22);
    expect(after.params.topLoadedStacks[0][1]).toBe(10);
    expect(duplicateTray(tray.id)?.inventoryAssignments).toBeUndefined();
  });
  it('round trips inventory, references and physical contents through JSON', () => {
    const group = tokens();
    const tray = addLooseTray(undefined, 'counter')!;
    setInventoryContent(tray.id, content(group.id, 12));
    const json = exportProjectToJson(getProject());
    importProject(importProjectFromJson(json));
    expect(getProject().inventory?.[0]).toMatchObject({ name: 'Health', quantity: 50, width: 20, depth: 20 });
    expect(availableQuantity(getProject(), group.id)).toBe(38);
    expect(groupAssignments(getProject(), group.id)[0].quantity).toBe(12);
  });
  it('rejects incomplete measurements and incompatible groups atomically', () => {
    const group = addInventoryGroup('dice');
    const cup = addLooseTray(undefined, 'cup')!;
    expect(setInventoryContent(cup.id, content(group.id, 1))).toContain('Complete');
    expect(getProject().layers[0].looseTrays[0].inventoryAssignments).toBeUndefined();
    updateInventoryGroup(group.id, { quantity: 20, width: 18 });
    expect(setInventoryContent(cup.id, content(group.id, 20))).toBeNull();
    const applied = getProject().layers[0].looseTrays[0];
    if (applied.type !== 'cup') throw new Error('Wrong tray');
    expect(applied.params.cupCavityHeight).toBe(20);
    expect(applied.params.trayWidth).toBeGreaterThan(18 * 5);
    const cards = addLooseTray(undefined, 'cardStorage')!;
    expect(setInventoryContent(cards.id, content(group.id, 1))).toContain('compatible');
  });
  it('does not silently combine different card sizes in one slot', () => {
    const a = addInventoryGroup('cards');
    const b = addInventoryGroup('cards');
    updateInventoryGroup(b.id, { width: 120 });
    const storage = addLooseTray(undefined, 'cardStorage')!;
    const requested = [...content(a.id, 1), ...content(b.id, 1)];
    expect(setInventoryContent(storage.id, requested)).toContain('identical');
    const divider = addLooseTray(undefined, 'cardDivider')!;
    expect(setInventoryContent(divider.id, requested)).toBeNull();
    const applied = getProject().layers[0].looseTrays.find((t) => t.id === divider.id)!;
    if (applied.type !== 'cardDivider') throw new Error('Wrong tray');
    expect(applied.params.stacks).toHaveLength(2);
  });
  it('rolls back assignments and generated definitions when a fixed layered box rejects content', () => {
    const group = tokens();
    const box = addLayeredBox(undefined, 'counter')!;
    const section = box.layers[0].sections[0];
    expect(setInventoryContent(section.id, content(group.id, 1))).toBeNull();
    const currentSection = () => getProject().layers[0].layeredBoxes[0].layers[0].sections[0];
    const saved = JSON.stringify(currentSection());
    const shapeCount = getProject().counterShapes.length;
    updateLayeredBox(box.id, { customWidth: 100, customDepth: 100 });
    updateInventoryGroup(group.id, { width: 500 });
    expect(setInventoryContent(section.id, content(group.id, 2))).toContain('does not fit');
    expect(JSON.stringify(currentSection())).toBe(saved);
    expect(getProject().counterShapes).toHaveLength(shapeCount);
    expect(availableQuantity(getProject(), group.id)).toBe(49);
  });
  it('rejects miniature counts that the generator would silently clamp', () => {
    const group = addInventoryGroup('miniatures');
    updateInventoryGroup(group.id, {
      name: 'Soldiers',
      quantity: 101,
      width: 32,
      depth: 32,
      height: 45,
      baseDiameter: 26,
      baseThickness: 3
    });
    const tray = addLooseTray(undefined, 'miniatureTray')!;
    expect(setInventoryContent(tray.id, content(group.id, 101))).toContain('100 miniatures');
    expect(availableQuantity(getProject(), group.id)).toBe(101);
    expect(setInventoryContent(tray.id, content(group.id, 10))).toBeNull();
  });
});
