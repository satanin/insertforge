import type { CardSize } from '$lib/types/project';
import { resolveShelfDrawer, type ShelfModule } from './shelfStorage';
import { KALLAX_REFERENCE } from './shelfReference';

/** Pack compatible modules left to right, starting at the bottom of the opening. */
export function layoutShelfOpening(modules: ShelfModule[], cards: CardSize[]) {
  const drawers = modules.filter(module => module.type === 'card-drawer');
  const reference = drawers[0] && resolveShelfDrawer(drawers[0].params, cards);
  const placed: { id: string; name: string; column: number; row: number; x: number; y: number; width: number; height: number; color: string; columns: number; labelWindow: boolean; labelWindows: number; wideHandle: boolean }[] = [];
  const unplaced: { id: string; name: string; reason: string }[] = [];
  const margin = 1.5;
  const occupied: { x: number; y: number; width: number }[] = [];
  if (!reference?.valid || !reference.stacking) {
    return { placed, unplaced: modules.map(module => ({ id: module.id, name: module.name, reason: 'Needs a valid stacking drawer reference.' })) };
  }
  const columns = Math.max(0, Math.floor((KALLAX_REFERENCE.width - 2 * margin - reference.stackKeyHeight) / reference.cellWidth));
  const rows = Math.max(0, Math.floor((KALLAX_REFERENCE.height - 2 * margin - reference.stackKeyHeight) / reference.bodyHeight));
  // Reserve saved cells first so adding a module cannot displace converted drawers.
  const ordered = [...modules].sort((a, b) => Number(b.type === 'card-drawer' && !!b.placement) - Number(a.type === 'card-drawer' && !!a.placement));
  for (const module of ordered) {
    if (module.type !== 'card-drawer') {
      unplaced.push({ id: module.id, name: module.name, reason: 'Open frames are shown in the module view.' });
      continue;
    }
    const r = resolveShelfDrawer(module.params, cards);
    if (!r.valid || !r.stacking || Math.abs(r.cellWidth - reference.cellWidth) > 0.01 || Math.abs(r.bodyHeight - reference.bodyHeight) > 0.01) {
      unplaced.push({ id: module.id, name: module.name, reason: 'Different or invalid cell pitch. Review system settings.' });
      continue;
    }
    let position: { x: number; y: number; width: number } | undefined;
    if (module.placement) {
      const { column: x, row: y } = module.placement;
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x + r.columns <= columns && y >= 0 && y < rows
        && !occupied.some(cell => cell.y === y && x < cell.x + cell.width && x + r.columns > cell.x)) {
        position = { x, y, width: r.columns };
      } else {
        unplaced.push({ id: module.id, name: module.name, reason: 'Saved cells overlap or exceed this opening.' });
        continue;
      }
    }
    for (let y = 0; y < rows && !position; y++) {
      for (let x = 0; x <= columns - r.columns; x++) {
        if (!occupied.some(cell => cell.y === y && x < cell.x + cell.width && x + r.columns > cell.x)) {
          position = { x, y, width: r.columns };
          break;
        }
      }
    }
    if (!position) {
      unplaced.push({ id: module.id, name: module.name, reason: 'No space left in this opening.' });
      continue;
    }
    occupied.push(position);
    placed.push({ id: module.id, name: module.name, column: position.x, row: position.y, x: margin + position.x * reference.cellWidth,
      y: KALLAX_REFERENCE.height - margin - (position.y + 1) * reference.bodyHeight,
      width: r.bodyWidth, height: r.bodyHeight, color: module.params.handleColor ?? '#df9756', columns: r.columns,
      labelWindow: r.labelWindow, labelWindows: r.labelWindows, wideHandle: module.params.wideHandle === true });
  }
  return { placed, unplaced };
}
