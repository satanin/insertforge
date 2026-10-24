import type {
  CardSize,
  CardSleeveSelection,
  CardSleeveThicknesses,
  Project,
  ProjectCardSleeve
} from '$lib/types/project';

export const DEFAULT_CARD_SLEEVE_THICKNESSES: CardSleeveThicknesses = { none: 0.3, normal: 0.5, premium: 0.8 };
export const projectSleeveOptions = [
  { value: 'none', label: 'No sleeves' },
  { value: 'normal', label: 'Standard sleeves' },
  { value: 'premium', label: 'Premium sleeves' }
] as const;

export function getCardSleeveThicknesses(project: Pick<Project, 'cardSleeveThicknesses'>): CardSleeveThicknesses {
  return Object.fromEntries(
    Object.entries(DEFAULT_CARD_SLEEVE_THICKNESSES).map(([key, fallback]) => {
      const value = project.cardSleeveThicknesses?.[key as ProjectCardSleeve];
      return [key, typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback];
    })
  ) as CardSleeveThicknesses;
}

// Geometry receives a projection, keeping the catalogue and inventory snapshots untouched.
export function getProjectCardSizes(project: Pick<Project, 'cardSizes' | 'cardSleeveThicknesses'>): CardSize[] {
  const settings = getCardSleeveThicknesses(project);
  return project.cardSizes.map((card) =>
    card.id.startsWith('inventory-')
      ? card
      : {
          ...card,
          thickness: settings.normal,
          sleeveThicknesses: settings
        }
  );
}

export function effectiveCardSize(
  card: CardSize | undefined | null,
  selection: CardSleeveSelection
): CardSize | undefined {
  if (!card) return undefined;
  if (card.id.startsWith('inventory-')) return card;
  const override = selection.cardThicknessOverride;
  const thickness =
    typeof override === 'number' && Number.isFinite(override) && override > 0
      ? override
      : selection.sleeve
        ? (card.sleeveThicknesses ?? DEFAULT_CARD_SLEEVE_THICKNESSES)[selection.sleeve]
        : card.thickness;
  return { ...card, thickness };
}

// Called once after legacy storage migration; subsequent imports are idempotent.
export function migrateProjectCards(project: Project): Project {
  const legacy = !project.cardSleeveThicknesses;
  const settings = getCardSleeveThicknesses(project);
  const remap = new Map<string, string>();
  for (const card of project.cardSizes) {
    if (!card.id.startsWith('card-') || !card.id.endsWith('-premium')) continue;
    const base = project.cardSizes.find((c) => c.id === card.id.replace(/-premium$/, ''));
    if (base && base.width === card.width && base.length === card.length) remap.set(card.id, base.id);
  }
  function migrate(selection: CardSleeveSelection & { cardSizeId: string }) {
    const card = project.cardSizes.find((c) => c.id === selection.cardSizeId);
    if (!card || card.id.startsWith('inventory-')) return;
    if (!selection.sleeve || !Object.hasOwn(settings, selection.sleeve)) {
      selection.sleeve = legacy
        ? ((Object.keys(settings) as ProjectCardSleeve[]).find(
            (key) => Math.abs(settings[key] - card.thickness) < 1e-8
          ) ?? 'normal')
        : 'normal';
      if (legacy && Math.abs(settings[selection.sleeve] - card.thickness) > 1e-8)
        selection.cardThicknessOverride = card.thickness;
    }
    selection.cardSizeId = remap.get(selection.cardSizeId) ?? selection.cardSizeId;
  }
  function piece(type: string, params: unknown) {
    if (!params) return;
    if (type === 'cardDraw' || type === 'cardStorage') migrate(params as CardSleeveSelection & { cardSizeId: string });
    else if (type === 'cardWell' || type === 'cardDivider') {
      for (const stack of (params as { stacks: Array<CardSleeveSelection & { cardSizeId: string }> }).stacks ?? [])
        migrate(stack);
    }
  }
  for (const layer of project.layers) {
    for (const tray of [...layer.looseTrays, ...layer.boxes.flatMap((box) => box.trays)]) piece(tray.type, tray.params);
    for (const box of layer.layeredBoxes ?? [])
      for (const inner of box.layers)
        for (const section of inner.sections ?? []) {
          const params =
            section.type === 'cardDraw'
              ? section.cardDrawParams
              : section.type === 'cardDivider'
                ? section.cardDividerParams
                : section.type === 'cardWell'
                  ? section.cardWellParams
                  : undefined;
          piece(section.type, params);
        }
  }
  for (const group of project.inventory ?? [])
    if (group.cardSizeId) group.cardSizeId = remap.get(group.cardSizeId) ?? group.cardSizeId;
  if (project.defaultCardSizeId)
    project.defaultCardSizeId = remap.get(project.defaultCardSizeId) ?? project.defaultCardSizeId;
  if (project.inventoryCardDefaults)
    project.inventoryCardDefaults.cardSizeId =
      remap.get(project.inventoryCardDefaults.cardSizeId) ?? project.inventoryCardDefaults.cardSizeId;
  project.cardSizes = project.cardSizes.filter((card) => !remap.has(card.id));
  project.cardSleeveThicknesses = settings;
  return project;
}
