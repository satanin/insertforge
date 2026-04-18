import { beforeEach, describe, expect, it } from 'vitest';

import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_SHAPE_IDS, defaultParams } from '$lib/models/counterTray';
import type { LayeredBox, LayeredBoxSection, Project } from '$lib/types/project';

import {
  clearLayeredBoxLayerLayout,
  getProject,
  importProject,
  resetProject,
  saveLayeredBoxLayerLayout,
  selectLayeredBoxLayer,
  selectLayeredBoxSection
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
    version: 2,
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
      gameContainerDepth: 256
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
});
