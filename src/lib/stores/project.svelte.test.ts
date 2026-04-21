import { beforeEach, describe, expect, it } from 'vitest';

import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_SHAPE_IDS, defaultParams } from '$lib/models/counterTray';
import type { LayeredBox, LayeredBoxSection, Project } from '$lib/types/project';

import {
  clearLayeredBoxLayerLayout,
  getGlobalSettings,
  getProject,
  getProjectName,
  importProject,
  moveTray,
  resetProject,
  saveLayeredBoxLayerLayout,
  selectLayeredBoxLayer,
  selectLayeredBoxSection,
  updateLayeredBoxSection,
  updateGlobalSettings,
  updateProjectName
} from './project.svelte';

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
    appVersion: '1.1.0',
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
    expect(getProject().appVersion).toBe('1.1.0');
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

describe('box placeholder dimensions', () => {
  beforeEach(() => {
    resetProject();
  });

  it('clears empty-box placeholder dimensions when moving the first tray into it', () => {
    importProject({
      schemaVersion: 3,
      appVersion: '1.1.0',
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
