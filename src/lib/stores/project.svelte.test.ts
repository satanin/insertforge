import { beforeEach, describe, expect, it } from 'vitest';

import { APP_VERSION } from '$lib/appInfo';
import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_CARD_SIZE_IDS, DEFAULT_SHAPE_IDS, defaultParams } from '$lib/models/counterTray';
import type { CardDividerTray, CardDrawTray, LayeredBox, LayeredBoxSection, Project } from '$lib/types/project';

import {
  addBox,
  addDiceSize,
  updateDiceSize,
  deleteDiceSize,
  addInventoryGroup,
  updateInventoryGroup,
  addLooseTray,
  addTray,
  duplicateTray,
  updateCardStorageParams,
  clearLayeredBoxLayerLayout,
  getGlobalSettings,
  getProject,
  getProjectDefaultCardSizeId,
  getProjectName,
  importProject,
  moveTray,
  resetProject,
  resetProjectToBlank,
  saveLayeredBoxLayerLayout,
  selectLayeredBoxLayer,
  selectLayeredBoxSection,
  updateCardDividerTrayParams,
  updateCardDrawTrayParams,
  updateLayeredBoxSection,
  updateGlobalSettings,
  updateProjectName,
  updateTray
} from './project.svelte';
import { exportProjectToJson, importProjectFromJson } from '$lib/utils/storage';

describe('project dice sizes', () => {
  beforeEach(() => resetProject());

  it('persists sizes without changing inventory measurement snapshots', () => {
    addDiceSize();
    const die = getProject().diceSizes!.at(-1)!;
    updateDiceSize(die.id, { name: 'Large d20', kind: 'd20', size: 24 });
    const group = addInventoryGroup('dice');
    updateInventoryGroup(group.id, { diceKind: die.kind, width: die.size });
    updateDiceSize(die.id, { size: 28 });
    const restored = importProjectFromJson(exportProjectToJson(getProject()));
    expect(restored.diceSizes?.find(d => d.id === die.id)?.size).toBe(28);
    expect(restored.inventory?.find(g => g.id === group.id)?.width).toBe(24);
    deleteDiceSize(die.id);
    expect(getProject().diceSizes?.some(d => d.id === die.id)).toBe(false);
    expect(getProject().inventory?.find(g => g.id === group.id)?.width).toBe(24);
  });

  it('rejects invalid sizes and accepts projects without a dice catalogue', () => {
    addDiceSize();
    const die = getProject().diceSizes!.at(-1)!;
    for (const size of [0, -1, NaN, Infinity]) updateDiceSize(die.id, { size });
    expect(die.size).toBe(16);
    const legacy = JSON.parse(exportProjectToJson(getProject()));
    delete legacy.diceSizes;
    expect(importProjectFromJson(JSON.stringify(legacy)).diceSizes?.map(d => d.kind)).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
  });

  it('includes six editable types on new projects and preserves an intentionally empty catalogue', () => {
    for (const reset of [resetProject, resetProjectToBlank]) {
      reset();
      expect(getProject().diceSizes?.map(d => d.kind)).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
      updateDiceSize('dice-d6', { size: 18 });
      reset();
      expect(getProject().diceSizes?.find(d => d.kind === 'd6')?.size).toBe(16);
    }
    for (const die of [...getProject().diceSizes!]) deleteDiceSize(die.id);
    expect(importProjectFromJson(exportProjectToJson(getProject())).diceSizes).toEqual([]);
  });
});

describe('exterior corner persistence', () => {
  beforeEach(() => resetProject());

  for (const type of ['counter', 'cup', 'cardDraw', 'cardDivider', 'tile', 'cardStorage'] as const) {
    it(`${type}: preserves selected radii and keeps old saved trays square`, () => {
      const tray = addLooseTray(undefined, type);
      if (!tray) throw new Error('Missing tray');
      const params = getProject().layers.flatMap(layer => layer.looseTrays).find(item => item.id === tray.id)!.params as
        { outerCornerRadius?: number };
      expect(params.outerCornerRadius).toBe(3);
      const restore = () => {
        const project = importProjectFromJson(exportProjectToJson(getProject()));
        return project.layers.flatMap(layer => layer.looseTrays).find(item => item.id === tray.id)?.params as
          { outerCornerRadius?: number };
      };
      params.outerCornerRadius = 1.5;
      expect(restore().outerCornerRadius).toBe(1.5);
      params.outerCornerRadius = 0;
      expect(restore().outerCornerRadius).toBe(0);
      delete params.outerCornerRadius;
      expect(restore().outerCornerRadius ?? 0).toBe(0);
    });
  }
});

describe('miniature tray menu entry', () => {
  beforeEach(() => resetProject());
  it('creates and persists sockets directly while keeping the rail entry unchanged', () => {
    const tray = addLooseTray(undefined, 'miniatureTray');
    const rack = addLooseTray(undefined, 'miniatureRack');
    if (tray?.type !== 'miniatureRack' || rack?.type !== 'miniatureRack') throw new Error('Missing miniature trays');
    expect(tray.name).toMatch(/^Miniature Tray /);
    expect(tray.params.variant).toBe('sockets');
    expect(tray.params.sockets?.requestedCount).toBe(6);
    expect(tray.params.sockets?.baseDiameter).toBe(26);
    expect(tray.params.sockets?.postWidth).toBe(8);
    expect(tray.params.sockets?.wallThickness).toBe(1.5);
    expect(tray.params.sockets?.floorThickness).toBe(1.5);
    expect(rack.params.slots[0].baseWidth).toBe(26);
    expect(tray.autoHeight).toBe(false);
    expect(tray.showEmboss).toBe(false);
    expect(rack.params.variant).not.toBe('sockets');
    const restored = importProjectFromJson(exportProjectToJson(getProject()));
    const result = restored.layers.flatMap(l => l.looseTrays).find(t => t.id === tray.id);
    expect(result?.type).toBe('miniatureRack');
    if (result?.type !== 'miniatureRack') throw new Error('Wrong restored type');
    expect(result.params.variant).toBe('sockets');
    expect(addTray(addBox().id, 'miniatureTray')).toBeNull();
  });
});

describe('Card Storage persistence and placement', () => {
  beforeEach(() => resetProject());
  it('updates default lid lettering on successive renames, preserving custom and blank text', () => {
    const created = addLooseTray(undefined, 'cardStorage');
    const tray = getProject().layers.flatMap((layer) => layer.looseTrays).find((entry) => entry.id === created?.id);
    if (tray?.type !== 'cardStorage') throw new Error('Missing storage');
    updateTray(tray.id, { name: 'Player cards' });
    expect(tray.params.lidText).toBe('Player cards');
    updateTray(tray.id, { name: 'Encounter cards' });
    expect(tray.params.lidText).toBe('Encounter cards');
    for (const lidText of ['Custom label', '']) {
      updateCardStorageParams(tray.id, { ...tray.params, lidText });
      updateTray(tray.id, { name: 'Renamed storage' });
      expect(tray.params.lidText).toBe(lidText);
    }
  });
  it('creates only as a loose tray and gives duplicated dividers fresh IDs', () => {
    const tray = addLooseTray(undefined, 'cardStorage');
    expect(tray?.type).toBe('cardStorage');
    if (tray?.type !== 'cardStorage') throw new Error('Missing storage');
    updateCardStorageParams(tray.id, { ...tray.params, maxHeight: 60, lid: true });
    const copy = duplicateTray(tray.id);
    if (copy?.type !== 'cardStorage') throw new Error('Missing copy');
    expect(copy.params.dividers[0].id).not.toBe(tray.params.dividers[0].id);
    expect(copy.params.maxHeight).toBe(60);
    expect(copy.params.lid).toBe(true);
    const box = addBox();
    expect(addTray(box.id,'cardStorage')).toBeNull();
    moveTray(tray.id,box.id);
    expect(box.trays.some(t => t.id === tray.id)).toBe(false);
  });
  it('round trips labels, settings and card references without degrading the type', () => {
    const tray = addLooseTray(undefined, 'cardStorage');
    if (tray?.type !== 'cardStorage') throw new Error('Missing storage');
    updateCardStorageParams(tray.id,{ ...tray.params, sizing:'length', exteriorLength:120,
      dividers:[{id:'label',label:'Acción',tab:'right'}] });
    const restored = importProjectFromJson(exportProjectToJson(getProject()));
    const result = restored.layers.flatMap(l => l.looseTrays).find(t => t.id === tray.id);
    expect(result?.type).toBe('cardStorage');
    if (result?.type !== 'cardStorage') throw new Error('Wrong restored type');
    expect(result.params).toEqual({ ...tray.params, sizing:'length', exteriorLength:120,
      dividers:[{id:'label',label:'Acción',tab:'right'}] });
    expect(result.autoHeight).toBe(false);
  });
  it('upgrades legacy two-millimetre walls when a Card Storage has a sliding lid', () => {
    const tray = addLooseTray(undefined, 'cardStorage');
    if (tray?.type !== 'cardStorage') throw new Error('Missing storage');
    updateCardStorageParams(tray.id, { ...tray.params, lid: true, wallThickness: 2, lidClearance: 0.3 });
    const restored = importProjectFromJson(exportProjectToJson(getProject()));
    const result = restored.layers.flatMap((layer) => layer.looseTrays).find((entry) => entry.id === tray.id);
    expect(result?.type).toBe('cardStorage');
    if (result?.type !== 'cardStorage') throw new Error('Wrong restored type');
    expect(result.params.wallThickness).toBe(3);
  });
});

function createCounterSection(id: string, name: string): LayeredBoxSection {
  return {
    id,
    type: 'counter',
    name,
    color: '#c9503c',
    counterParams: {
      ...defaultParams,
      topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, name]],
      edgeLoadedStacks: []
    }
  };
}

function createLayeredBoxFixture(): LayeredBox {
  return {
    id: 'layered-box-1',
    name: 'Layered Box 1',
    tolerance: 0.5,
    wallThickness: 3,
    floorThickness: 2,
    lidParams: { ...defaultLidParams },
    customWidth: 46,
    customDepth: 36,
    customBoxHeight: 20,
    layers: [
      {
        id: 'internal-layer-a',
        name: 'Layer A',
        manualLayout: [{ trayId: 'section-a1', x: 0, y: 0, rotation: 0 }],
        sections: [createCounterSection('section-a1', 'Section A1'), createCounterSection('section-a2', 'Section A2')]
      },
      {
        id: 'internal-layer-b',
        name: 'Layer B',
        sections: [createCounterSection('section-b1', 'Section B1')]
      }
    ]
  };
}

function createProjectFixture(): Project {
  return {
    schemaVersion: 3,
    appVersion: '1.1.23',
    name: 'Test Project',
    layers: [
      {
        id: 'layer-1',
        name: 'Layer 1',
        boxes: [],
        layeredBoxes: [createLayeredBoxFixture()],
        looseTrays: [],
        boards: []
      }
    ],
    counterShapes: [
      {
        id: DEFAULT_SHAPE_IDS.square,
        name: 'Square',
        category: 'counter',
        baseShape: 'square',
        width: 16,
        length: 16,
        thickness: 1.3
      }
    ],
    cardSizes: [],
    selectedLayerId: 'layer-1',
    selectedBoxId: null,
    selectedLayeredBoxId: 'layered-box-1',
    selectedLayeredBoxLayerId: 'internal-layer-a',
    selectedLayeredBoxSectionId: 'section-a1',
    selectedTrayId: null,
    selectedBoardId: null,
    globalSettings: {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      gameContainerHeight: null
    }
  };
}

describe('project store layered box selection', () => {
  beforeEach(() => {
    resetProject();
    importProject(createProjectFixture());
  });

  it('selects the first section when switching internal layered-box layer', () => {
    selectLayeredBoxLayer('layered-box-1', 'internal-layer-b');

    const project = getProject();

    expect(project.selectedLayeredBoxId).toBe('layered-box-1');
    expect(project.selectedLayeredBoxLayerId).toBe('internal-layer-b');
    expect(project.selectedLayeredBoxSectionId).toBe('section-b1');
    expect(project.selectedBoxId).toBeNull();
    expect(project.selectedTrayId).toBeNull();
  });

  it('keeps layered-box layer selection in sync when selecting a section', () => {
    selectLayeredBoxSection('layered-box-1', 'internal-layer-a', 'section-a2');

    const project = getProject();

    expect(project.selectedLayeredBoxId).toBe('layered-box-1');
    expect(project.selectedLayeredBoxLayerId).toBe('internal-layer-a');
    expect(project.selectedLayeredBoxSectionId).toBe('section-a2');
    expect(project.selectedBoxId).toBeNull();
    expect(project.selectedTrayId).toBeNull();
  });

  it('rejects invalid internal layer layouts and preserves the previous manual layout', () => {
    const saved = saveLayeredBoxLayerLayout('layered-box-1', 'internal-layer-a', [
      { trayId: 'section-a1', x: 200, y: 0, rotation: 0 },
      { trayId: 'section-a2', x: 230, y: 0, rotation: 0 }
    ]);

    const manualLayout = getProject().layers[0].layeredBoxes[0].layers[0].manualLayout;

    expect(saved).toBe(false);
    expect(manualLayout).toEqual([{ trayId: 'section-a1', x: 0, y: 0, rotation: 0 }]);
  });

  it('clears manual layout for an internal layered-box layer', () => {
    clearLayeredBoxLayerLayout('layered-box-1', 'internal-layer-a');

    const manualLayout = getProject().layers[0].layeredBoxes[0].layers[0].manualLayout;

    expect(manualLayout).toBeUndefined();
  });

  it('allows reducing counters in an already width-constrained internal section', () => {
    const section = getProject().layers[0].layeredBoxes[0].layers[0].sections[0];
    section.counterParams = {
      ...section.counterParams!,
      trayWidthOverride: 20,
      topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, 'Section A1']],
      edgeLoadedStacks: []
    };

    const updated = updateLayeredBoxSection('layered-box-1', 'internal-layer-a', 'section-a1', {
      counterParams: {
        ...section.counterParams,
        topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 1, 'Section A1']]
      }
    });

    expect(updated).toBe(true);
    expect(section.counterParams.topLoadedStacks[0][1]).toBe(1);
  });
});

describe('project store project name', () => {
  beforeEach(() => {
    resetProject();
  });

  it('updates the project-level export name', () => {
    updateProjectName('Factions Insert');

    expect(getProjectName()).toBe('Factions Insert');
    expect(getProject().name).toBe('Factions Insert');
  });
});

describe('project store schema version', () => {
  beforeEach(() => {
    resetProject();
  });

  it('migrates legacy Counter Slayer version marker to InsertForge schema version', () => {
    importProject({
      ...createProjectFixture(),
      version: 2,
      schemaVersion: undefined as unknown as number,
      appVersion: undefined as unknown as string
    });

    expect(getProject().version).toBeUndefined();
    expect(getProject().schemaVersion).toBe(3);
    expect(getProject().appVersion).toBe(APP_VERSION);
  });
});

describe('project store global settings', () => {
  beforeEach(() => {
    resetProject();
  });

  it('updates the game container height', () => {
    updateGlobalSettings({ gameContainerHeight: 95 });

    expect(getGlobalSettings().gameContainerHeight).toBe(95);
  });

  it('supports automatic game container height', () => {
    updateGlobalSettings({ gameContainerHeight: null });

    expect(getGlobalSettings().gameContainerHeight).toBeNull();
  });
});

describe('project store blank reset', () => {
  beforeEach(() => {
    resetProject();
  });

  it('clears items and restores project-level defaults for a new project', () => {
    updateProjectName('Long Campaign Insert');
    updateGlobalSettings({ gameContainerWidth: 300, gameContainerDepth: 220, gameContainerHeight: 80 });
    resetProjectToBlank();

    const project = getProject();

    expect(project.name).toBe('InsertForge Project');
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0].name).toBe('Bottom layer');
    expect(project.layers[0].boxes).toEqual([]);
    expect(project.layers[0].layeredBoxes).toEqual([]);
    expect(project.layers[0].looseTrays).toEqual([]);
    expect(project.layers[0].boards).toEqual([]);
    expect(project.selectedLayerId).toBe(project.layers[0].id);
    expect(project.selectedBoxId).toBeNull();
    expect(project.selectedTrayId).toBeNull();
    expect(project.globalSettings).toEqual({
      gameContainerWidth: 250,
      gameContainerDepth: 250,
      gameContainerHeight: null
    });
    expect(project.counterShapes.length).toBeGreaterThan(0);
    expect(project.cardSizes.length).toBeGreaterThan(0);
    expect(project.appVersion).toBe(APP_VERSION);
  });
});

describe('project store card size defaults', () => {
  beforeEach(() => {
    resetProjectToBlank();
  });

  it('uses the last selected card size for the next card draw tray', () => {
    const firstTray = addLooseTray(undefined, 'cardDraw') as CardDrawTray;

    updateCardDrawTrayParams(firstTray.id, {
      ...firstTray.params,
      cardSizeId: DEFAULT_CARD_SIZE_IDS.miniAmericanPremium
    });

    const box = addBox(undefined, 'counter');
    const nextTray = addTray(box.id, 'cardDraw') as CardDrawTray;

    expect(getProjectDefaultCardSizeId()).toBe(DEFAULT_CARD_SIZE_IDS.miniAmericanPremium);
    expect(nextTray.params.cardSizeId).toBe(DEFAULT_CARD_SIZE_IDS.miniAmericanPremium);
  });

  it('uses the last selected card size for new card divider trays', () => {
    const firstTray = addLooseTray(undefined, 'cardDivider') as CardDividerTray;

    updateCardDividerTrayParams(firstTray.id, {
      ...firstTray.params,
      stacks: firstTray.params.stacks.map((stack, index) => ({
        ...stack,
        cardSizeId: index === 0 ? DEFAULT_CARD_SIZE_IDS.tarotPremium : stack.cardSizeId
      }))
    });

    const nextTray = addLooseTray(undefined, 'cardDivider') as CardDividerTray;

    expect(getProjectDefaultCardSizeId()).toBe(DEFAULT_CARD_SIZE_IDS.tarotPremium);
    expect(nextTray.params.stacks.every((stack) => stack.cardSizeId === DEFAULT_CARD_SIZE_IDS.tarotPremium)).toBe(true);
  });
});

describe('tile tray defaults', () => {
  beforeEach(() => {
    resetProject();
  });

  it('creates tile trays with auto-height disabled by default', () => {
    const tray = addLooseTray(undefined, 'tile');

    expect(tray?.type).toBe('tile');
    expect(tray?.autoHeight).toBe(false);
  });
});

describe('box placeholder dimensions', () => {
  beforeEach(() => {
    resetProject();
  });

  it('clears empty-box placeholder dimensions when moving the first tray into it', () => {
    importProject({
      schemaVersion: 3,
      appVersion: '1.1.23',
      name: 'Test Project',
      layers: [
        {
          id: 'layer-1',
          name: 'Layer 1',
          boxes: [
            {
              id: 'box-empty',
              name: 'Empty Box',
              trays: [],
              tolerance: 0.5,
              wallThickness: 3,
              floorThickness: 2,
              fillSolidEmpty: true,
              lidParams: { ...defaultLidParams },
              customWidth: 50,
              customDepth: 30,
              customBoxHeight: 20
            },
            {
              id: 'box-source',
              name: 'Source Box',
              trays: [
                {
                  id: 'tray-1',
                  type: 'counter',
                  name: 'Tray 1',
                  color: '#c9503c',
                  rotationOverride: 'auto',
                  params: {
                    ...defaultParams,
                    topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, 5, 'Tray 1']],
                    edgeLoadedStacks: []
                  }
                }
              ],
              tolerance: 0.5,
              wallThickness: 3,
              floorThickness: 2,
              fillSolidEmpty: true,
              lidParams: { ...defaultLidParams }
            }
          ],
          layeredBoxes: [],
          looseTrays: [],
          boards: []
        }
      ],
      counterShapes: [
        {
          id: DEFAULT_SHAPE_IDS.square,
          name: 'Square',
          category: 'counter',
          baseShape: 'square',
          width: 16,
          length: 16,
          thickness: 1.3
        }
      ],
      cardSizes: [],
      selectedLayerId: 'layer-1',
      selectedBoxId: 'box-source',
      selectedLayeredBoxId: null,
      selectedLayeredBoxLayerId: null,
      selectedLayeredBoxSectionId: null,
      selectedTrayId: 'tray-1',
      selectedBoardId: null,
      globalSettings: {
        gameContainerWidth: 256,
        gameContainerDepth: 256,
        gameContainerHeight: null
      }
    });

    moveTray('tray-1', 'box-empty');

    const targetBox = getProject().layers[0].boxes.find((box) => box.id === 'box-empty');

    expect(targetBox?.trays).toHaveLength(1);
    expect(targetBox?.customWidth).toBeUndefined();
    expect(targetBox?.customDepth).toBeUndefined();
    expect(targetBox?.customBoxHeight).toBeUndefined();
  });
});
