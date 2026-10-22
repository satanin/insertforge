import { beforeEach, describe, expect, it } from 'vitest';
import { addBox, addLayer, addLayeredBox, addLooseTray, getProject, resetProjectToBlank } from '$lib/stores/project.svelte';
import { getContentPreviewLabel } from './contentPreviewLabel';

describe('content preview label', () => {
  beforeEach(() => resetProjectToBlank());
  it('recognises player-board shapes stored in counter trays', () => {
    const tray = addLooseTray(undefined, 'counter');
    if (tray?.type !== 'counter') throw new Error('Missing tray');
    const project = getProject();
    project.counterShapes[0].category = 'playerBoard';
    tray.params.topLoadedStacks = [[project.counterShapes[0].id, 1]];
    tray.params.edgeLoadedStacks = [];
    expect(getContentPreviewLabel(project, 'tray', 'tray')).toBe('Preview player boards');
    const current = project.layers[0].looseTrays.find(item => item.id === tray.id)!;
    if (current.type !== 'counter') throw new Error('Missing tray');
    current.params.topLoadedStacks.push([project.counterShapes[1].id, 1]);
    expect(getContentPreviewLabel(project, 'tray', 'tray')).toBe('Preview contents');
  });
  for (const [type, label] of [
    ['dice', 'dice'], ['cardDraw', 'cards'], ['cardDivider', 'cards'], ['cardWell', 'cards'],
    ['cardStorage', 'cards'], ['tile', 'tiles'], ['counter', 'counters'],
    ['miniatureRack', 'miniatures'], ['miniatureTray', 'miniatures'], ['cup', 'contents']
  ] as const) {
    it(`labels selected ${type} content`, () => {
      addLooseTray(undefined, type);
      expect(getContentPreviewLabel(getProject(), 'tray', 'tray')).toBe(`Preview ${label}`);
    });
  }
  it('uses generic contents for mixed/global/empty views while keeping layer labels scoped', () => {
    expect(getContentPreviewLabel(getProject(), 'all-no-lid', 'dimensions')).toBe('Preview contents');
    addLooseTray(undefined, 'dice');
    expect(getContentPreviewLabel(getProject(), 'all-no-lid', 'dimensions')).toBe('Preview dice');
    addLayer();
    addLooseTray(undefined, 'cardDraw');
    expect(getContentPreviewLabel(getProject(), 'layer', 'layer')).toBe('Preview cards');
    expect(getContentPreviewLabel(getProject(), 'all-no-lid', 'dimensions')).toBe('Preview contents');
  });
  it('labels a box by all its trays, including card variants', () => {
    const box = addBox(undefined, 'cardDraw');
    expect(getContentPreviewLabel(getProject(), 'exploded', 'box')).toBe('Preview cards');
    const cardWell = addLooseTray(undefined, 'cardWell')!;
    box.trays.push(cardWell);
    expect(getContentPreviewLabel(getProject(), 'all', 'box')).toBe('Preview cards');
    box.trays.push(addLooseTray(undefined, 'dice')!);
    expect(getContentPreviewLabel(getProject(), 'exploded', 'box')).toBe('Preview contents');
  });
  it('uses the selected internal section or internal layer rather than the rest of the project', () => {
    const box = addLayeredBox();
    if (!box) throw new Error('Missing layered box');
    const project = getProject();
    const stored = project.layers.flatMap(layer => layer.layeredBoxes ?? []).find(item => item.id === box.id)!;
    stored.layers[0].sections = [{ id: 'cards', name: 'Cards', type: 'cardWell' }, { id: 'boards', name: 'Boards', type: 'playerBoard' }];
    project.selectedLayeredBoxId = box.id;
    project.selectedLayeredBoxLayerId = stored.layers[0].id;
    project.selectedLayeredBoxSectionId = 'boards';
    expect(getContentPreviewLabel(project, 'layer', 'layeredBoxSection')).toBe('Preview player boards');
    expect(getContentPreviewLabel(project, 'layer', 'layeredBoxLayer')).toBe('Preview contents');
    stored.layers[0].sections.pop();
    expect(getContentPreviewLabel(project, 'layer', 'layeredBox')).toBe('Preview cards');
  });
});
