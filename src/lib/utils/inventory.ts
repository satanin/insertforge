import type { Board, InventoryAssignment, InventoryGroup, LayeredBoxSection, Project, Tray } from '$lib/types/project';

export const inventoryKinds = [
  { value: 'cards', label: 'Cards' },
  { value: 'tokens', label: 'Tokens / tiles' },
  { value: 'dice', label: 'Dice' },
  { value: 'boards', label: 'Boards' },
  { value: 'miniatures', label: 'Miniatures' },
  { value: 'other', label: 'Other' }
] as const;
export const sleeveOptions = [
  { value: 'none', label: 'No sleeves' },
  { value: 'normal', label: 'Normal sleeves' },
  { value: 'premium', label: 'Premium sleeves' },
  { value: 'manual', label: 'Manual thickness' }
] as const;
// Estimates only: measured thickness remains editable, including sleeved cards.
export const sleeveThickness = { none: 0.3, normal: 0.5, premium: 0.8, manual: undefined };
export interface InventoryTarget {
  item: Tray | LayeredBoxSection | Board;
  name: string;
  type: Tray['type'] | LayeredBoxSection['type'] | 'board';
  boxId?: string;
  internalLayerId?: string;
}
export function inventoryTargets(project: Project): InventoryTarget[] {
  return project.layers.flatMap((layer) => [
    ...layer.looseTrays.map((item) => ({ item, name: `${layer.name} / ${item.name}`, type: item.type })),
    ...layer.boxes.flatMap((box) =>
      box.trays.map((item) => ({ item, name: `${layer.name} / ${box.name} / ${item.name}`, type: item.type }))
    ),
    ...(layer.boards ?? []).map((item) => ({ item, name: `${layer.name} / ${item.name}`, type: 'board' as const })),
    ...(layer.layeredBoxes ?? []).flatMap((box) =>
      box.layers.flatMap((inner) =>
        inner.sections.map((item) => ({
          item,
          name: `${layer.name} / ${box.name} / ${inner.name} / ${item.name}`,
          type: item.type,
          boxId: box.id,
          internalLayerId: inner.id
        }))
      )
    )
  ]);
}
export function groupAssignments(project: Project, groupId: string, exceptId?: string) {
  return inventoryTargets(project)
    .filter((t) => t.item.id !== exceptId)
    .flatMap((t) =>
      (t.item.inventoryAssignments ?? [])
        .filter((a) => a.groupId === groupId)
        .map((a) => ({ ...a, targetId: t.item.id, name: t.name }))
    );
}
export function availableQuantity(project: Project, groupId: string, exceptId?: string): number {
  const group = project.inventory?.find((g) => g.id === groupId);
  return (group?.quantity ?? 0) - groupAssignments(project, groupId, exceptId).reduce((n, a) => n + a.quantity, 0);
}
export function compatibleInventory(type: InventoryTarget['type'], group: InventoryGroup): boolean {
  if (type === 'dice') return group.kind === 'dice';
  if (['cardStorage', 'cardDraw', 'cardDivider', 'cardWell'].includes(type)) return group.kind === 'cards';
  if (type === 'counter' || type === 'tile') return group.kind === 'tokens';
  if (type === 'playerBoard' || type === 'board') return group.kind === 'boards';
  if (type === 'miniatureRack') return group.kind === 'miniatures';
  return type === 'cup';
}
export function validateAssignments(
  project: Project,
  target: InventoryTarget,
  assignments: InventoryAssignment[]
): string | null {
  const seen = new Set<string>();
  for (const assignment of assignments) {
    const group = project.inventory?.find((g) => g.id === assignment.groupId);
    if (!group || !compatibleInventory(target.type, group)) return 'This component is not compatible with this piece.';
    if (seen.has(group.id)) return 'Each group can only appear once per piece.';
    seen.add(group.id);
    if (!Number.isSafeInteger(assignment.quantity) || assignment.quantity < 1)
      return 'Quantities must be positive whole numbers.';
    if (assignment.quantity > availableQuantity(project, group.id, target.item.id))
      return `Not enough unassigned components in “${group.name}”.`;
  }
  return null;
}
export function missingMeasurements(group: InventoryGroup): string | null {
  const keys: (keyof InventoryGroup)[] =
    group.kind === 'cards' || group.kind === 'tokens' || group.kind === 'boards'
      ? ['width', 'depth', 'thickness']
      : group.kind === 'dice'
        ? ['width']
        : group.kind === 'miniatures'
          ? ['width', 'depth', 'height', 'baseDiameter', 'baseThickness']
          : ['width', 'depth', 'height'];
  return keys.some((key) => typeof group[key] !== 'number' || !Number.isFinite(group[key]) || Number(group[key]) <= 0)
    ? 'Complete the measurements before applying this content to a piece.'
    : null;
}
