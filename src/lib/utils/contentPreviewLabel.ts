import type { CounterShape, Layer, Project, Tray, LayeredBoxSection } from '$lib/types/project';

type Item = Tray | LayeredBoxSection;
function contentName(item: Item, shapes: CounterShape[]): string {
  if (['card', 'cardDraw', 'cardDivider', 'cardWell', 'cardStorage'].includes(item.type)) return 'cards';
  if (item.type === 'dice') return 'dice';
  if (item.type === 'tile') return 'tiles';
  if (item.type === 'miniatureRack') return 'miniatures';
  if (item.type === 'playerBoard') return 'player boards';
  if (item.type === 'counter') {
    const params = 'params' in item ? item.params : item.counterParams;
    const ids = params ? [...params.topLoadedStacks, ...params.edgeLoadedStacks].map(stack => stack[0]) : [];
    if (ids.length) {
      const names = new Set(ids.map(id => {
        const category = shapes.find(shape => shape.id === id)?.category;
        return category === 'playerBoard' ? 'player boards' : category === 'tile' ? 'tiles' : 'counters';
      }));
      return names.size === 1 ? [...names][0] : 'contents';
    }
    return 'counters';
  }
  return 'contents';
}
function layerItems(layer: Layer): Item[] {
  return [...layer.looseTrays, ...layer.boxes.flatMap(box => box.trays),
    ...(layer.layeredBoxes ?? []).flatMap(box => box.layers.flatMap(inner => inner.sections))];
}

export function getContentPreviewLabel(project: Project, viewMode: string, selectionType: string): string {
  const layer = project.layers.find(layer => layer.id === project.selectedLayerId);
  const all = project.layers.flatMap(layerItems);
  const box = project.layers.flatMap(layer => layer.boxes).find(box => box.id === project.selectedBoxId);
  const layeredBox = project.layers.flatMap(layer => layer.layeredBoxes ?? []).find(box => box.id === project.selectedLayeredBoxId);
  let items: Item[];
  if (viewMode === 'tray') items = all.filter(item => item.id === project.selectedTrayId);
  else if (viewMode === 'all-no-lid') items = all;
  else if (viewMode === 'layer') {
    if (selectionType === 'layeredBoxSection') items = (layeredBox?.layers.flatMap(inner => inner.sections) ?? []).filter(item => item.id === project.selectedLayeredBoxSectionId);
    else if (selectionType === 'layeredBoxLayer') items = layeredBox?.layers.find(inner => inner.id === project.selectedLayeredBoxLayerId)?.sections ?? [];
    else if (selectionType === 'layeredBox') items = layeredBox?.layers.flatMap(inner => inner.sections) ?? [];
    else items = layer ? layerItems(layer) : [];
  } else items = box?.trays ?? all;
  const names = new Set(items.map(item => contentName(item, project.counterShapes)));
  return `Preview ${names.size === 1 ? [...names][0] : 'contents'}`;
}
