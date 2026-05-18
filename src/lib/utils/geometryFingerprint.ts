import type { Box, Layer, Project, Tray } from '$lib/types/project';
import { isCardDividerTray } from '$lib/types/project';

export type SelectedGenerationView = 'tray' | 'assembly';

function trayFingerprint(tray: Tray) {
  return {
    id: tray.id,
    type: tray.type,
    name: tray.name,
    params: tray.params,
    rotationOverride: tray.rotationOverride,
    showEmboss: tray.showEmboss,
    showStackLabels: isCardDividerTray(tray) ? tray.showStackLabels : undefined,
    autoHeight: tray.autoHeight
  };
}

function boxShellFingerprint(box: Box) {
  return {
    id: box.id,
    name: box.name,
    tolerance: box.tolerance,
    wallThickness: box.wallThickness,
    floorThickness: box.floorThickness,
    lidParams: box.lidParams,
    customWidth: box.customWidth,
    customDepth: box.customDepth,
    customBoxHeight: box.customBoxHeight,
    autoHeight: box.autoHeight,
    fillSolidEmpty: box.fillSolidEmpty,
    bottomHoneycombEnabled: box.bottomHoneycombEnabled
  };
}

function boxFingerprint(box: Box) {
  return {
    ...boxShellFingerprint(box),
    manualLayout: box.manualLayout ?? null,
    trays: box.trays.map(trayFingerprint)
  };
}

function layerFingerprint(layer: Layer) {
  return {
    id: layer.id,
    manualLayout: layer.manualLayout ?? null,
    boxes: layer.boxes.map(boxFingerprint),
    looseTrays: layer.looseTrays.map(trayFingerprint),
    boards: layer.boards,
    layeredBoxes: layer.layeredBoxes
  };
}

function sharedProjectGeometryFingerprint(project: Project) {
  return {
    globalSettings: project.globalSettings ?? null,
    cardSizes: project.cardSizes ?? [],
    counterShapes: project.counterShapes ?? []
  };
}

function findLayerForBox(project: Project, boxId: string): Layer | null {
  return project.layers.find((layer) => layer.boxes.some((box) => box.id === boxId)) ?? null;
}

function findLayerForLooseTray(project: Project, trayId: string): Layer | null {
  return project.layers.find((layer) => layer.looseTrays.some((tray) => tray.id === trayId)) ?? null;
}

function stableKey(value: unknown): string {
  return JSON.stringify(value);
}

export function selectedGeometryFingerprint(
  project: Project,
  generationBox: Box | null,
  generationTray: Tray | null,
  isLoose: boolean,
  selectedEmptyBox: boolean,
  selectedView: SelectedGenerationView
): string {
  const shared = sharedProjectGeometryFingerprint(project);

  if (selectedEmptyBox && generationBox) {
    const layer = findLayerForBox(project, generationBox.id);
    return stableKey({
      scope: 'selected-empty-box',
      selectedView,
      boxId: generationBox.id,
      ...shared,
      layer: layer ? layerFingerprint(layer) : null
    });
  }

  if (generationTray && isLoose) {
    const layer = findLayerForLooseTray(project, generationTray.id);
    return stableKey({
      scope: 'selected-loose-tray',
      selectedView,
      trayId: generationTray.id,
      ...shared,
      layer: layer ? layerFingerprint(layer) : null
    });
  }

  if (generationTray && generationBox) {
    const layer = findLayerForBox(project, generationBox.id);
    return stableKey({
      scope: 'selected-boxed-tray',
      selectedView,
      boxId: generationBox.id,
      trayId: generationTray.id,
      ...shared,
      layer: layer ? layerFingerprint(layer) : null
    });
  }

  return '';
}

export function layerGeometryFingerprint(project: Project, layerId: string | null): string {
  if (!layerId) return '';
  const layer = project.layers.find((entry) => entry.id === layerId);
  if (!layer) return '';

  return stableKey({
    scope: 'layer',
    layerId,
    ...sharedProjectGeometryFingerprint(project),
    layer: layerFingerprint(layer)
  });
}

export function projectGeometryFingerprint(project: Project): string {
  return stableKey({
    scope: 'all',
    ...sharedProjectGeometryFingerprint(project),
    layers: project.layers.map(layerFingerprint)
  });
}

export function structureFingerprint(project: Project): string {
  return stableKey({
    layerIds: project.layers.map((layer) => layer.id),
    layerMapping: project.layers.map((layer) => ({
      layerId: layer.id,
      boxes: layer.boxes.map((box) => ({
        boxId: box.id,
        trayIds: box.trays.map((tray) => tray.id)
      })),
      looseTrayIds: layer.looseTrays.map((tray) => tray.id),
      boardIds: layer.boards.map((board) => board.id),
      layeredBoxes: layer.layeredBoxes.map((box) => ({
        layeredBoxId: box.id,
        layers: box.layers.map((entry) => ({
          layerId: entry.id,
          sectionIds: entry.sections.map((section) => section.id),
          manualLayoutTrayIds: entry.manualLayout?.map((placement) => placement.trayId) ?? []
        }))
      }))
    }))
  });
}
