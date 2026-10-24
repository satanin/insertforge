import { defaultCardDividerTrayParams, getCardDividerTrayDimensions } from '$lib/models/cardDividerTray';
import { defaultCardStorageParams, resolveCardStorage } from '$lib/models/cardStorageTray';
import { defaultCardDrawTrayParams, getCardDrawTrayDimensions } from '$lib/models/cardTray';
import { defaultCardWellTrayParams, getCardWellTrayDimensions } from '$lib/models/cardWellTray';
import { projectGeometryFingerprint } from '$lib/utils/geometryFingerprint';
import { effectiveCardSize, getCardSleeveThicknesses, getProjectCardSizes } from '$lib/utils/projectCards';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addBox,
  addLayeredBox,
  addLooseTray,
  getCardSizes,
  getProject,
  importProject,
  resetProjectToBlank,
  updateCardSleeveThickness
} from './project.svelte';
import { getTrayDimensionsForTray } from '$lib/models/box';
import { getLayeredBoxExteriorDimensions } from '$lib/models/layer';

describe('project card formats and sleeves', () => {
  beforeEach(resetProjectToBlank);

  it('keeps seven formats and validates the three independent project thicknesses', () => {
    expect(getCardSizes()).toHaveLength(7);
    expect(getCardSizes().some((card) => card.name.endsWith(' Premium'))).toBe(false);
    expect(getCardSleeveThicknesses(getProject())).toEqual({ none: 0.3, normal: 0.5, premium: 0.8 });
    updateCardSleeveThickness('normal', 0.65);
    for (const value of [0, -1, NaN, Infinity]) updateCardSleeveThickness('normal', value);
    expect(getCardSleeveThicknesses(getProject()).normal).toBe(0.65);
    expect(getProject().cardSizes[0].thickness).toBe(0.5); // Catalogue is not rewritten.
    expect(exportProjectToJson(getProject())).not.toContain('"sleeveThicknesses"');
  });

  it('uses project thickness in the dimensions of all four card generators', () => {
    const id = getCardSizes()[0].id;
    const cardSizes = getCardSizes();
    const well = structuredClone(defaultCardWellTrayParams);
    well.stacks[0] = { ...well.stacks[0], cardSizeId: id, count: 100, sleeve: 'none' };
    const wellNone = getCardWellTrayDimensions(well, cardSizes).height;
    well.stacks[0].sleeve = 'premium';
    expect(getCardWellTrayDimensions(well, cardSizes).height - wellNone).toBeCloseTo(50);
    const draw = { ...defaultCardDrawTrayParams, cardSizeId: id, cardCount: 100, sleeve: 'none' as const };
    expect(
      getCardDrawTrayDimensions({ ...draw, sleeve: 'premium' }, cardSizes).height -
        getCardDrawTrayDimensions(draw, cardSizes).height
    ).toBeCloseTo(50);
    const divider = {
      ...defaultCardDividerTrayParams,
      stacks: [{ cardSizeId: id, count: 100, sleeve: 'none' as const }]
    };
    expect(
      getCardDividerTrayDimensions({ ...divider, stacks: [{ ...divider.stacks[0], sleeve: 'premium' }] }, cardSizes)
        .depth - getCardDividerTrayDimensions(divider, cardSizes).depth
    ).toBeCloseTo(50);
    const storage = { ...defaultCardStorageParams, cardSizeId: id, count: 100, sleeve: 'none' as const };
    const bare = resolveCardStorage(storage, cardSizes);
    const premium = resolveCardStorage({ ...storage, sleeve: 'premium' }, cardSizes);
    expect(premium.cardThickness).toBe(0.8);
    expect(premium.depth).toBeGreaterThan(bare.depth);
    expect(
      resolveCardStorage({ ...storage, sleeve: 'premium', sizing: 'length', exteriorLength: 150 }, cardSizes).capacity
    ).toBeLessThan(resolveCardStorage({ ...storage, sizing: 'length', exteriorLength: 150 }, cardSizes).capacity);
    const fingerprint = projectGeometryFingerprint(getProject());
    updateCardSleeveThickness('premium', 0.9);
    expect(projectGeometryFingerprint(getProject())).not.toBe(fingerprint);
    expect(resolveCardStorage({ ...storage, sleeve: 'premium' }, getProjectCardSizes(getProject())).cardThickness).toBe(
      0.9
    );
  });

  it('migrates premium references, preserves custom thickness and round trips selections', () => {
    const draw = addLooseTray(undefined, 'cardDraw')!;
    const divider = addLooseTray(undefined, 'cardDivider')!;
    const well = addLooseTray(undefined, 'cardWell')!;
    if (draw.type !== 'cardDraw' || divider.type !== 'cardDivider' || well.type !== 'cardWell')
      throw Error('Wrong fixture');
    const base = getProject().cardSizes[0];
    getProject().cardSizes.push({ ...base, id: `${base.id}-premium`, name: `${base.name} Premium`, thickness: 0.8 });
    getProject().cardSizes.push({ ...base, id: 'measured', name: 'Measured', thickness: 0.61 });
    draw.params.cardSizeId = 'measured';
    delete getProject().cardSleeveThicknesses; // Simulate a pre-sleeve-settings project.
    delete draw.params.sleeve;
    divider.params.stacks[0].cardSizeId = `${base.id}-premium`;
    delete divider.params.stacks[0].sleeve;
    divider.params.stacks[1].sleeve = 'none';
    well.params.stacks[0].sleeve = 'premium';
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restored = getProject().layers[0].looseTrays;
    const restoredDraw = restored.find((t) => t.id === draw.id)!;
    const restoredDivider = restored.find((t) => t.id === divider.id)!;
    const restoredWell = restored.find((t) => t.id === well.id)!;
    if (restoredDraw.type !== 'cardDraw' || restoredDivider.type !== 'cardDivider' || restoredWell.type !== 'cardWell')
      throw Error('Wrong restored type');
    expect(restoredDraw.params.cardThicknessOverride).toBe(0.61);
    expect(restoredDivider.params.stacks[0]).toMatchObject({ cardSizeId: base.id, sleeve: 'premium' });
    expect(restoredDivider.params.stacks[1].sleeve).toBe('none');
    expect(restoredWell.params.stacks[0].sleeve).toBe('premium');
    expect(getCardSizes().some((card) => card.id.endsWith('-premium'))).toBe(false);
    const saved = exportProjectToJson(getProject());
    expect(exportProjectToJson(importProjectFromJson(saved))).toBe(saved);
  });

  it('preserves inventory snapshots regardless of project settings and legacy overrides', () => {
    getProject().cardSizes.push({
      id: 'inventory-card-snapshot',
      name: 'Snapshot',
      width: 67,
      length: 92,
      thickness: 0.47
    });
    updateCardSleeveThickness('normal', 0.7);
    const card = getCardSizes().find((c) => c.id === 'inventory-card-snapshot')!;
    expect(effectiveCardSize(card, { sleeve: 'premium', cardThicknessOverride: 0.9 })?.thickness).toBe(0.47);
    const restored = importProjectFromJson(exportProjectToJson(getProject()));
    expect(restored.cardSizes.find((c) => c.id === card.id)?.thickness).toBe(0.47);
    expect(restored.cardSleeveThicknesses?.normal).toBe(0.7);
  });

  it('preserves Premium geometry in boxes and Layered Box sections during migration', () => {
    const box = addBox(undefined, 'cardDraw');
    const layered = addLayeredBox(undefined, 'cardWell')!;
    const tray = box.trays[0];
    const section = layered.layers[0].sections[0];
    if (tray.type !== 'cardDraw' || !section.cardWellParams) throw Error('Wrong fixture');
    const base = getProject().cardSizes[0];
    const premiumId = `${base.id}-premium`;
    getProject().cardSizes.push({ ...base, id: premiumId, name: `${base.name} Premium`, thickness: 0.8 });
    tray.params.cardSizeId = premiumId;
    section.cardWellParams.stacks[0].cardSizeId = premiumId;
    delete getProject().cardSleeveThicknesses;
    const trayBefore = getTrayDimensionsForTray(tray, getProject().cardSizes, getProject().counterShapes);
    const boxBefore = getLayeredBoxExteriorDimensions(layered, getProject().cardSizes, getProject().counterShapes);
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restoredBox = getProject().layers[0].boxes[0];
    const restoredLayered = getProject().layers[0].layeredBoxes[0];
    expect(getTrayDimensionsForTray(restoredBox.trays[0], getCardSizes(), getProject().counterShapes)).toEqual(trayBefore);
    expect(getLayeredBoxExteriorDimensions(restoredLayered, getCardSizes(), getProject().counterShapes)).toEqual(boxBefore);
    expect(restoredLayered.layers[0].sections[0].cardWellParams?.stacks[0]).toMatchObject({ cardSizeId: base.id, sleeve: 'premium' });
  });

  it('keeps new stacks linked to project settings across reload', () => {
    updateCardSleeveThickness('normal', 0.66);
    const tray = addLooseTray(undefined, 'cardWell')!;
    if (tray.type !== 'cardWell') throw Error('Wrong fixture');
    importProject(importProjectFromJson(exportProjectToJson(getProject())));
    const restored = getProject().layers[0].looseTrays[0];
    if (restored.type !== 'cardWell') throw Error('Wrong fixture');
    expect(restored.params.stacks[0].cardThicknessOverride).toBeUndefined();
    expect(
      effectiveCardSize(
        getCardSizes().find((c) => c.id === restored.params.stacks[0].cardSizeId),
        restored.params.stacks[0]
      )?.thickness
    ).toBe(0.66);
  });
});
