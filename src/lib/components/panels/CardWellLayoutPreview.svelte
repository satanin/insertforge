<script lang="ts">
  import type { CardWellLayout, CellId } from '$lib/types/cardWellLayout';
  import { getAllCellIds, getLayoutDimensions } from '$lib/types/cardWellLayout';
  import type { CardWellStack } from '$lib/models/cardWellTray';
  import { computeCellPositions } from '$lib/models/cardWellTray';
  import type { CardSize } from '$lib/types/project';
  import CardWellCell from './CardWellCell.svelte';

  interface Props {
    layout: CardWellLayout;
    stacks: CardWellStack[];
    cardSizes: CardSize[];
    trayLetter: string;
    selectedCellId: CellId | null;
    trayWidth: number; // Tray width in mm
    trayDepth: number; // Tray depth in mm
    clearance: number; // Clearance in mm
    wallThickness: number; // Wall thickness in mm
    gripInset?: number;
    onSelectCell: (id: CellId) => void;
  }

  let {
    layout,
    stacks,
    cardSizes,
    trayLetter,
    selectedCellId,
    trayWidth,
    trayDepth,
    clearance,
    wallThickness,
    gripInset = 0,
    onSelectCell
  }: Props = $props();

  // Track container dimensions
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  // Calculate max preview width to fit within 500x500 while maintaining aspect ratio
  const MAX_PREVIEW_SIZE = 500;
  let previewMaxWidth = $derived(
    trayWidth >= trayDepth ? MAX_PREVIEW_SIZE : MAX_PREVIEW_SIZE * (trayWidth / trayDepth)
  );

  // Inset from container edges
  const EDGE_INSET = 1;

  // Data structure for rendered cells
  interface RenderedCell {
    id: CellId;
    refNumber: number;
    colIndex: number;
    cellIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    // Actual card cavity dimensions (may be smaller than cell if column has larger cards)
    cavityWidth: number;
    cavityHeight: number;
    cardSizeName?: string;
    stackLabel?: string;
  }

  // Get all cell IDs in order for ref number calculation
  let allCellIds = $derived(getAllCellIds(layout));

  // Helper to get card size for a cell
  function getCardSizeForCell(cellId: CellId): CardSize | undefined {
    const stack = stacks.find((s) => s.cellId === cellId);
    if (!stack) return undefined;
    return cardSizes.find((cs) => cs.id === stack.cardSizeId);
  }

  // Helper to get stack for a cell
  function getStackForCell(cellId: CellId) {
    return stacks.find((s) => s.cellId === cellId);
  }

  // Compute rendered cells from column layout with vertical centering
  let renderedCells = $derived.by(() => {
    const cells: RenderedCell[] = [];

    if (containerWidth === 0 || containerHeight === 0) {
      return cells;
    }

    const { numColumns } = getLayoutDimensions(layout);
    if (numColumns === 0) {
      return cells;
    }

    // Available pixel space
    const availableWidth = containerWidth - 2 * EDGE_INSET;
    const availableHeight = containerHeight - 2 * EDGE_INSET;

    // Scale factors
    const scaleX = availableWidth / trayWidth;
    const scaleY = availableHeight / trayDepth;

    for (const cell of computeCellPositions(
      layout,
      stacks,
      cardSizes,
      wallThickness,
      clearance,
      trayWidth,
      trayDepth,
      gripInset
    )) {
      const { id: cellId, colIndex, cellIndex, depth: cellDepth, x: currentX, y: currentY } = cell;
      const columnInfo = { width: cell.width };
      const refNumber = allCellIds.indexOf(cellId) + 1;

      // Convert mm to pixels
      const x = EDGE_INSET + currentX * scaleX;
      const y = EDGE_INSET + currentY * scaleY;
      const width = columnInfo.width * scaleX;
      const height = cellDepth * scaleY;

      // Calculate actual cavity dimensions based on card size
      const cardSize = getCardSizeForCell(cellId);
      const stack = getStackForCell(cellId);
      let cavityWidthMm = columnInfo.width; // Default to full cell width
      let cavityDepthMm = cellDepth; // Default to full cell depth

      if (cardSize && stack) {
        // Get effective dimensions based on rotation
        const rotation = stack.rotation ?? 0;
        const effectiveWidth = rotation === 90 ? cardSize.length : cardSize.width;
        const effectiveDepth = rotation === 90 ? cardSize.width : cardSize.length;
        cavityWidthMm = effectiveWidth + clearance * 2;
        cavityDepthMm = effectiveDepth + clearance * 2;
      }

      const cavityWidth = cavityWidthMm * scaleX;
      const cavityHeight = cavityDepthMm * scaleY;

      cells.push({
        id: cellId,
        refNumber,
        colIndex,
        cellIndex,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        cavityWidth: Math.round(cavityWidth),
        cavityHeight: Math.round(cavityHeight),
        cardSizeName: cardSize?.name,
        stackLabel: stack?.label
      });
    }

    return cells;
  });
</script>

<div class="dimensionedPreview" style="max-width: {previewMaxWidth + 28}px;">
  <div class="widthLabel">↔ Width (X): {trayWidth.toFixed(1)} mm</div>
  <div class="lengthLabel">↔ Length (Y): {trayDepth.toFixed(1)} mm</div>
  <div
    class="cardWellLayoutPreview"
    style="aspect-ratio: {trayWidth} / {trayDepth}; max-width: {previewMaxWidth}px;"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
  >
    {#each renderedCells as cell (cell.id)}
      <CardWellCell
        id={cell.id}
        {trayLetter}
        refNumber={cell.refNumber}
        x={cell.x}
        y={cell.y}
        width={cell.width}
        height={cell.height}
        cavityWidth={cell.cavityWidth}
        cavityHeight={cell.cavityHeight}
        selected={selectedCellId === cell.id}
        cardSizeName={cell.cardSizeName}
        stackLabel={cell.stackLabel}
        onSelect={onSelectCell}
      />
    {/each}
  </div>
</div>

<style>
  .dimensionedPreview {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr);
    gap: 0.35rem;
    width: 100%;
  }
  .widthLabel,
  .lengthLabel {
    color: var(--fgMuted);
    font-size: 0.75rem;
    text-align: center;
  }
  .widthLabel {
    grid-column: 2;
  }
  .lengthLabel {
    grid-column: 1;
    grid-row: 2;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    align-self: center;
  }
  .cardWellLayoutPreview {
    position: relative;
    width: 100%;
    overflow: hidden;
  }
</style>
