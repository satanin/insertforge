import { describe, expect, it } from 'vitest';

import { defaultLidParams } from '$lib/models/lid';
import { DEFAULT_SHAPE_IDS, defaultParams, type CounterTrayParams } from '$lib/models/counterTray';
import type { Box, CounterTray, Project, Tray } from '$lib/types/project';
import {
  layerGeometryFingerprint,
  projectGeometryFingerprint,
  selectedGeometryFingerprint
} from './geometryFingerprint';

function createTray(id: string, name: string, count: number): Tray {
  return {
    id,
    type: 'counter',
    name,
    color: '#c9503c',
    rotationOverride: 'auto',
    params: {
      ...defaultParams,
      topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, count, name]],
      edgeLoadedStacks: []
    }
  };
}

function updateCounterCount(tray: Tray, count: number): void {
  (tray as CounterTray).params = {
    ...((tray as CounterTray).params as CounterTrayParams),
    topLoadedStacks: [[DEFAULT_SHAPE_IDS.square, count, tray.name]],
    edgeLoadedStacks: []
  };
}

function createBox(id: string, name: string, trays: Tray[]): Box {
  return {
    id,
    name,
    trays,
    tolerance: 0.5,
    wallThickness: 3,
    floorThickness: 2,
    lidParams: { ...defaultLidParams }
  };
}

function createProject(): Project {
  const selectedTray = createTray('tray-a', 'Selected tray', 4);
  const otherTray = createTray('tray-b', 'Other tray', 3);
  const otherLayerTray = createTray('tray-c', 'Far tray', 2);

  return {
    schemaVersion: 3,
    appVersion: '1.1.42',
    name: 'Fingerprint project',
    layers: [
      {
        id: 'layer-a',
        name: 'Layer A',
        boxes: [createBox('box-a', 'Selected box', [selectedTray]), createBox('box-b', 'Neighbor box', [otherTray])],
        layeredBoxes: [],
        looseTrays: [],
        boards: []
      },
      {
        id: 'layer-b',
        name: 'Layer B',
        boxes: [createBox('box-c', 'Far box', [otherLayerTray])],
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
    selectedLayerId: 'layer-a',
    selectedBoxId: 'box-a',
    selectedTrayId: 'tray-a',
    selectedBoardId: null,
    globalSettings: {
      gameContainerWidth: 256,
      gameContainerDepth: 256,
      gameContainerHeight: null
    }
  };
}

describe('geometry fingerprints', () => {
  it('does not invalidate selected geometry when an unrelated layer changes', () => {
    const project = createProject();
    const selectedBox = project.layers[0].boxes[0];
    const selectedTray = selectedBox.trays[0];
    const before = selectedGeometryFingerprint(project, selectedBox, selectedTray, false, false, 'tray');

    project.layers[1].boxes[0].trays[0].name = 'Changed far away';
    updateCounterCount(project.layers[1].boxes[0].trays[0], 9);

    expect(selectedGeometryFingerprint(project, selectedBox, selectedTray, false, false, 'tray')).toBe(before);
  });

  it('invalidates layer geometry when a tray inside that layer changes', () => {
    const project = createProject();
    const before = layerGeometryFingerprint(project, 'layer-a');

    updateCounterCount(project.layers[0].boxes[1].trays[0], 8);

    expect(layerGeometryFingerprint(project, 'layer-a')).not.toBe(before);
  });

  it('keeps the full-project fingerprint sensitive to unrelated layers', () => {
    const project = createProject();
    const before = projectGeometryFingerprint(project);

    project.layers[1].boxes[0].trays[0].name = 'Changed far away';

    expect(projectGeometryFingerprint(project)).not.toBe(before);
  });
});
