import { defaultMiniatureSocketRackParams, normalizeMiniatureSocketRackParams } from '$lib/models/miniatureSocketRack';
import { validateDiceTray } from '$lib/models/diceTray';
import type { CupLayoutNode } from '$lib/types/cupLayout';
import type { InventoryAssignment, InventoryGroup, Project, Tray } from '$lib/types/project';
import type { InventoryTarget } from './inventory';
import { missingMeasurements } from './inventory';

/** Applied definitions are immutable snapshots: editing inventory must not resize other pieces. */
export function applyInventoryGeometry(
  project: Project,
  target: InventoryTarget,
  assignments: InventoryAssignment[]
): void {
  if (!assignments.length) return;
  const entries = assignments.map((a) => ({
    assignment: a,
    group: project.inventory!.find((g) => g.id === a.groupId)!
  }));
  for (const { group } of entries) {
    const missing = missingMeasurements(group);
    if (missing) throw new Error(`${group.name}: ${missing}`);
  }
  const cardId = (g: InventoryGroup) => {
    const id = `inventory-card-${target.item.id}-${g.id}-${g.revision}`;
    if (!project.cardSizes.some((s) => s.id === id))
      project.cardSizes.push({
        id,
        name: `${g.name} (inventory)`,
        width: g.width!,
        length: g.depth!,
        thickness: g.thickness!
      });
    return id;
  };
  const shapeId = (g: InventoryGroup) => {
    const id = `inventory-shape-${target.item.id}-${g.id}-${g.revision}`;
    if (!project.counterShapes.some((s) => s.id === id))
      project.counterShapes.push({
        id,
        name: `${g.name} (inventory)`,
        baseShape: g.baseShape ?? 'rectangle',
        category: g.kind === 'boards' ? 'playerBoard' : target.type === 'tile' ? 'tile' : 'counter',
        width: g.width!,
        length: g.depth!,
        thickness: g.thickness!,
        pointyTop: g.pointyTop
      });
    return id;
  };
  const item = target.item;
  // Sections expose a different parameter property for each generator.
  const section = target.internalLayerId ? (item as import('$lib/types/project').LayeredBoxSection) : null;
  const tray = item as Tray;
  const first = entries[0];
  if (target.type === 'dice' && tray.type === 'dice') {
    const count = entries.reduce((n, e) => n + e.assignment.quantity, 0);
    if (count > 100) throw new Error('A dice tray supports up to 100 dice.');
    const params = { ...tray.params, diceKind: first.group.diceKind ?? 'd6', size: first.group.width!, count,
      groups: entries.map(({ group, assignment }) => ({ id: group.id, diceKind: group.diceKind ?? 'd6' as const, size: group.width!, count: assignment.quantity })) };
    if (!validateDiceTray(params)) throw new Error('Dice measurements exceed this tray’s supported range.');
    tray.params = params;
  } else if (target.type === 'board') {
    if (entries.length !== 1) throw new Error('A planning board can contain one inventory group.');
    Object.assign(item, {
      width: first.group.width,
      depth: first.group.depth,
      height: first.group.thickness! * first.assignment.quantity
    });
  } else if (target.type === 'cardDraw' || target.type === 'cardStorage') {
    if (
      entries.some(
        ({ group }) =>
          group.width !== first.group.width ||
          group.depth !== first.group.depth ||
          group.thickness !== first.group.thickness
      )
    ) {
      throw new Error(
        'This piece uses a shared card slot. Select groups with identical card dimensions, or use Card Divider / Card Well for separate slots.'
      );
    }
    const params = section ? section.cardDrawParams! : tray.params;
    const count = entries.reduce((n, e) => n + e.assignment.quantity, 0);
    Object.assign(params, {
      cardSizeId: cardId(first.group),
      ...(target.type === 'cardDraw' ? { cardCount: count } : { count, sizing: 'count' })
    });
  } else if (target.type === 'cardDivider') {
    const params = section ? section.cardDividerParams! : (tray as Extract<Tray, { type: 'cardDivider' }>).params;
    params.stacks = entries.map(({ group, assignment }) => ({
      cardSizeId: cardId(group),
      count: assignment.quantity,
      label: group.name
    }));
  } else if (target.type === 'cardWell') {
    const params = section ? section.cardWellParams! : (tray as Extract<Tray, { type: 'cardWell' }>).params;
    const cells = entries.map(({ group }) => `inventory-cell-${group.id}`);
    params.layout = { columns: cells.map((id) => [id]) };
    params.stacks = entries.map(({ group, assignment }, i) => ({
      id: cells[i],
      cellId: cells[i],
      cardSizeId: cardId(group),
      count: assignment.quantity,
      rotation: 0,
      label: group.name
    }));
  } else if (target.type === 'counter' || target.type === 'playerBoard') {
    const params = section ? section.counterParams! : (tray as Extract<Tray, { type: 'counter' }>).params;
    params.topLoadedStacks = entries
      .filter((e) => e.assignment.loading !== 'edge')
      .map(({ group, assignment }) => [shapeId(group), assignment.quantity, group.name]);
    params.edgeLoadedStacks = entries
      .filter((e) => e.assignment.loading === 'edge')
      .map(({ group, assignment }) => [
        shapeId(group),
        assignment.quantity,
        assignment.edgeOrientation ?? 'lengthwise',
        group.name
      ]);
  } else if (target.type === 'tile') {
    if (entries.length !== 1) throw new Error('Tile Tray supports one group. Use Counter Tray for several groups.');
    Object.assign(tray.params, { tileShapeId: shapeId(first.group), count: first.assignment.quantity });
  } else if (target.type === 'cup') {
    // Conservative rectangular envelopes, laid flat in a single layer, one cup per group.
    const params = section ? section.cupParams! : (tray as Extract<Tray, { type: 'cup' }>).params;
    const cells = entries.map(({ group: g, assignment: a }) => {
      const columns = Math.ceil(Math.sqrt(a.quantity));
      const hex = g.baseShape === 'hex' && (g.kind === 'tokens' || g.kind === 'tiles');
      const width = hex && !g.pointyTop ? g.width! / Math.cos(Math.PI / 6) : g.width!;
      const depth = g.kind === 'dice' ? g.width! : hex && g.pointyTop ? g.width! / Math.cos(Math.PI / 6) : g.depth!;
      return {
        id: `inventory-cup-${g.id}`,
        width: columns * (width + 1) + 2,
        depth: Math.ceil(a.quantity / columns) * (depth + 1) + 2,
        height:
          (g.kind === 'dice'
            ? g.width
            : g.kind === 'cards' || g.kind === 'tokens' || g.kind === 'tiles' || g.kind === 'boards'
              ? g.thickness
              : g.height)! + 2
      };
    });
    const wall = params.wallThickness;
    const split = (index: number): CupLayoutNode =>
      index === cells.length - 1
        ? { type: 'cup', id: cells[index].id }
        : {
            type: 'split',
            direction: 'vertical',
            ratio:
              (cells[index].width + wall / 2) /
              (cells.slice(index).reduce((n, c) => n + c.width, 0) + wall * (cells.length - index - 1)),
            first: { type: 'cup', id: cells[index].id },
            second: split(index + 1)
          };
    Object.assign(params, {
      layout: { root: split(0) },
      trayWidth: cells.reduce((n, c) => n + c.width, 0) + wall * (cells.length + 1),
      trayDepth: Math.max(...cells.map((c) => c.depth)) + 2 * wall,
      cupCavityHeight: Math.max(...cells.map((c) => c.height)),
      cornerRadius: 0
    });
  } else if (target.type === 'miniatureRack') {
    const params = (tray as Extract<Tray, { type: 'miniatureRack' }>).params;
    if (params.variant === 'sockets') {
      params.sockets = {
        ...defaultMiniatureSocketRackParams,
        ...params.sockets,
        sizingMode: 'models',
        quantityMode: 'all',
        models: entries.map(({ group: g, assignment: a }) => ({
          id: g.id,
          name: g.name,
          count: a.quantity,
          baseDiameter: g.baseDiameter!,
          baseThickness: g.baseThickness!,
          width: g.width!,
          depth: g.depth!,
          height: g.height!
        }))
      };
      const normalized = normalizeMiniatureSocketRackParams(params.sockets);
      if (
        JSON.stringify(
          normalized.models.map((m) => [m.count, m.baseDiameter, m.baseThickness, m.width, m.depth, m.height])
        ) !==
        JSON.stringify(
          params.sockets.models.map((m) => [m.count, m.baseDiameter, m.baseThickness, m.width, m.depth, m.height])
        )
      ) {
        throw new Error(
          'Miniature Tray supports up to 10 groups, 100 miniatures per group, bases 10–100 mm and thickness 1–15 mm. Check the model dimensions.'
        );
      }
    } else {
      params.slots = entries.flatMap(({ group: g, assignment: a }) =>
        Array.from({ length: a.quantity }, (_, i) => ({
          id: `${g.id}-${i}`,
          label: g.name,
          baseWidth: g.baseDiameter!,
          baseHeight: g.baseThickness!,
          miniatureHeight: g.height!,
          miniatureCount: 1,
          slotSpacingLeft: Math.max(6, (g.width! - g.baseDiameter!) / 2),
          slotSpacingRight: Math.max(6, (g.width! - g.baseDiameter!) / 2)
        }))
      );
    }
  }
}
