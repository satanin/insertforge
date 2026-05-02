<script lang="ts">
  import {
    Input,
    InputCheckbox,
    FormControl,
    Spacer,
    Hr,
    Select,
    IconButton,
    Icon,
    ColorPicker,
    ColorPickerSwatch,
    Popover,
    Text
  } from '@tableslayer/ui';
  import { IconX, IconPlus } from '@tabler/icons-svelte';
  import type { Box, Tray } from '$lib/types/project';
  import {
    isCounterTray,
    isCardTray,
    isCardDividerTray,
    isCardWellTray,
    isCupTray,
    isMiniatureRackTray,
    isTileTray,
    type CounterTray,
    type CardDrawTray,
    type CardDividerTray,
    type CardWellTray,
    type CupTray,
    type MiniatureRackTray,
    type TileTray
  } from '$lib/types/project';
  import type { CounterTrayParams } from '$lib/models/counterTray';
  import type { CardDrawTrayParams } from '$lib/models/cardTray';
  import type { CardDividerTrayParams } from '$lib/models/cardDividerTray';
  import type { CardWellTrayParams } from '$lib/models/cardWellTray';
  import type { CupTrayParams } from '$lib/models/cupTray';
  import type { MiniatureRackParams } from '$lib/models/miniatureRack';
  import type { TileTrayParams } from '$lib/models/tileTray';
  import { countCups } from '$lib/types/cupLayout';
  import { countCells } from '$lib/types/cardWellLayout';
  import { getRequiredTrayHeightForLayer, getTrayDimensionsForTray, arrangeTrays } from '$lib/models/box';
  import { calculateLayerHeight } from '$lib/models/layer';
  import {
    getProject,
    getTrayLetterById,
    moveTray,
    moveTrayToLoose,
    getCardSizes,
    getCounterShapes
  } from '$lib/stores/project.svelte';

  // Editor components
  import CounterTrayEditor from './panels/CounterTrayEditor.svelte';
  import CardDrawTrayEditor from './panels/CardDrawTrayEditor.svelte';
  import CardDividerTrayEditor from './panels/CardDividerTrayEditor.svelte';
  import CardWellTrayEditor from './panels/CardWellTrayEditor.svelte';
  import CupTrayEditor from './panels/CupTrayEditor.svelte';
  import MiniatureRackTrayEditor from './panels/MiniatureRackTrayEditor.svelte';
  import TileTrayEditor from './panels/TileTrayEditor.svelte';

  interface Props {
    selectedBox: Box | null;
    selectedTray: Tray | null;
    onSelectTray: (tray: Tray) => void;
    onAddTray: (boxId: string) => void;
    onDeleteTray: (boxId: string, trayId: string) => void;
    onDuplicateTray?: (trayId: string) => void;
    onUpdateTray: (updates: Partial<Omit<Tray, 'id'>>) => void;
    onUpdateCounterParams?: (params: CounterTrayParams) => void;
    onUpdateCardParams?: (params: CardDrawTrayParams) => void;
    onUpdateCardDividerParams?: (params: CardDividerTrayParams) => void;
    onUpdateCardWellParams?: (params: CardWellTrayParams) => void;
    onUpdateCupParams?: (params: CupTrayParams) => void;
    onUpdateMiniatureRackParams?: (params: MiniatureRackParams) => void;
    onUpdateTileTrayParams?: (params: TileTrayParams) => void;
    hideList?: boolean;
  }

  let {
    selectedBox,
    selectedTray,
    onSelectTray,
    onAddTray,
    onDeleteTray,
    onDuplicateTray,
    onUpdateTray,
    onUpdateCounterParams,
    onUpdateCardParams,
    onUpdateCardDividerParams,
    onUpdateCardWellParams,
    onUpdateCupParams,
    onUpdateMiniatureRackParams,
    onUpdateTileTrayParams,
    hideList = false
  }: Props = $props();

  let activeStackedTrayTab = $state<'tray' | 'contents'>('tray');

  // Get the tray letter based on cumulative position across all layers
  let trayLetter = $derived.by(() => {
    const project = getProject();
    if (!selectedTray) return 'A';
    return getTrayLetterById(project.layers, selectedTray.id) || 'A';
  });

  // Build move destination options: all boxes + loose tray options per layer
  let moveDestinations = $derived.by(() => {
    const project = getProject();
    const options: { value: string; label: string; group?: string }[] = [];
    const boxMovesAllowed = !selectedTray || (!isMiniatureRackTray(selectedTray) && !isTileTray(selectedTray));

    for (const layer of project.layers) {
      // Add boxes in this layer
      if (boxMovesAllowed) {
        for (const box of layer.boxes) {
          options.push({
            value: `box:${box.id}`,
            label: box.name,
            group: layer.name
          });
        }
      }
      // Add loose tray option for this layer
      options.push({
        value: `loose:${layer.id}`,
        label: `Loose in ${layer.name}`,
        group: layer.name
      });
    }

    return options;
  });

  // Get current tray location for the select
  let currentTrayLocation = $derived.by(() => {
    if (!selectedTray) return '';
    if (selectedBox) {
      return `box:${selectedBox.id}`;
    }
    // Check if it's a loose tray
    const project = getProject();
    for (const layer of project.layers) {
      if (layer.looseTrays.some((t) => t.id === selectedTray.id)) {
        return `loose:${layer.id}`;
      }
    }
    return '';
  });

  // Handle move destination change
  function handleMoveDestination(value: string) {
    if (!selectedTray || !value) return;
    const [type, id] = value.split(':');

    if (type === 'box' && id !== selectedBox?.id) {
      moveTray(selectedTray.id, id);
    } else if (type === 'loose') {
      moveTrayToLoose(selectedTray.id, id);
    }
  }

  // Find the layer containing the selected box
  const selectedBoxLayer = $derived.by(() => {
    if (!selectedBox) return null;
    const project = getProject();
    return project.layers.find((layer) => layer.boxes.some((b) => b.id === selectedBox.id)) ?? null;
  });

  // Calculate layer-adjusted tray height
  // Trays expand to fill the box interior, which may be taller than natural to match layer height
  let maxTrayHeight = $derived.by(() => {
    if (!selectedBox) return 0;
    const cardSizes = getCardSizes();
    const counterShapes = getCounterShapes();

    // Get natural max tray height
    const naturalMaxHeight = Math.max(
      ...selectedBox.trays.map((tray) => getTrayDimensionsForTray(tray, cardSizes, counterShapes).height),
      0
    );

    // If box is in a layer, calculate layer-adjusted height
    if (selectedBoxLayer) {
      const layerHeight = calculateLayerHeight(selectedBoxLayer, { cardSizes, counterShapes });
      const requiredTrayHeight = getRequiredTrayHeightForLayer(selectedBox, layerHeight);
      return Math.max(naturalMaxHeight, requiredTrayHeight);
    }

    return naturalMaxHeight;
  });

  // Compute rotated dimensions for the selected tray (accounting for layout rotation)
  let selectedTrayDimensions = $derived.by(() => {
    if (!selectedBox || !selectedTray) return null;
    const cardSizes = getCardSizes();
    const counterShapes = getCounterShapes();
    const placements = arrangeTrays(selectedBox.trays, {
      customBoxWidth: selectedBox.customWidth,
      wallThickness: selectedBox.wallThickness,
      tolerance: selectedBox.tolerance,
      cardSizes,
      counterShapes,
      manualLayout: selectedBox.manualLayout
    });
    const placement = placements.find((p) => p.tray.id === selectedTray.id);
    if (!placement) return null;
    const height =
      (isCounterTray(selectedTray) ||
        isCardDividerTray(selectedTray) ||
        isCardTray(selectedTray) ||
        isCardWellTray(selectedTray) ||
        isCupTray(selectedTray) ||
        isTileTray(selectedTray)) &&
      selectedTray.autoHeight === false
        ? placement.dimensions.height
        : maxTrayHeight > placement.dimensions.height
          ? maxTrayHeight
          : placement.dimensions.height;
    // Use placement dimensions (already rotated) and apply layer height only when enabled.
    return {
      width: placement.dimensions.width,
      depth: placement.dimensions.depth,
      height
    };
  });

  function getTrayStats(tray: Tray): {
    stacks: number;
    counters: number;
    isCardTray: boolean;
    isCardDivider: boolean;
    isCardWell: boolean;
    isCupTray: boolean;
    isTileTray: boolean;
  } {
    if (isCupTray(tray)) {
      const cupTotal = countCups(tray.params.layout);
      return {
        stacks: cupTotal,
        counters: cupTotal,
        isCardTray: false,
        isCardDivider: false,
        isCardWell: false,
        isCupTray: true,
        isTileTray: false
      };
    }
    if (isMiniatureRackTray(tray)) {
      return {
        stacks: tray.params.slots.length,
        counters: tray.params.slots.length,
        isCardTray: false,
        isCardDivider: false,
        isCardWell: false,
        isCupTray: false,
        isTileTray: false
      };
    }
    if (isCardWellTray(tray)) {
      const cellTotal = countCells(tray.params.layout);
      const totalCards = tray.params.stacks.reduce((sum, s) => sum + s.count, 0);
      return {
        stacks: cellTotal,
        counters: totalCards,
        isCardTray: false,
        isCardDivider: false,
        isCardWell: true,
        isCupTray: false,
        isTileTray: false
      };
    }
    if (isCardDividerTray(tray)) {
      const totalCards = tray.params.stacks.reduce((sum, s) => sum + s.count, 0);
      return {
        stacks: tray.params.stacks.length,
        counters: totalCards,
        isCardTray: false,
        isCardDivider: true,
        isCardWell: false,
        isCupTray: false,
        isTileTray: false
      };
    }
    if (isCardTray(tray)) {
      return {
        stacks: 1,
        counters: tray.params.cardCount,
        isCardTray: true,
        isCardDivider: false,
        isCardWell: false,
        isCupTray: false,
        isTileTray: false
      };
    }
    if (isTileTray(tray)) {
      return {
        stacks: 1,
        counters: tray.params.count,
        isCardTray: false,
        isCardDivider: false,
        isCardWell: false,
        isCupTray: false,
        isTileTray: true
      };
    }
    // Counter tray
    const topCount = tray.params.topLoadedStacks.reduce((sum, s) => sum + s[1], 0);
    const edgeCount = tray.params.edgeLoadedStacks.reduce((sum, s) => sum + s[1], 0);
    return {
      stacks: tray.params.topLoadedStacks.length + tray.params.edgeLoadedStacks.length,
      counters: topCount + edgeCount,
      isCardTray: false,
      isCardDivider: false,
      isCardWell: false,
      isCupTray: false,
      isTileTray: false
    };
  }

  // Debounced color update to avoid excessive saves during color picker drag
  let colorUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleColorUpdate(hex: string) {
    if (colorUpdateTimeout) {
      clearTimeout(colorUpdateTimeout);
    }
    colorUpdateTimeout = setTimeout(() => {
      onUpdateTray({ color: hex });
      colorUpdateTimeout = null;
    }, 150);
  }
</script>

<div class="traysPanel">
  <!-- Tray List -->
  {#if selectedBox && !hideList}
    <div class="panelList">
      <div class="panelListHeader">
        <span class="panelListTitle">
          Trays {#if selectedBox}within {selectedBox.name}{/if}
        </span>

        <IconButton onclick={() => onAddTray(selectedBox.id)} title="Add new tray to box" size="sm" variant="ghost">
          <Icon Icon={IconPlus} />
        </IconButton>
      </div>
      <div class="panelListItems">
        {#each selectedBox.trays as tray, _trayIdx (tray.id)}
          {@const stats = getTrayStats(tray)}
          {@const letter = getTrayLetterById(getProject().layers, tray.id)}
          <div
            class="listItem {selectedTray?.id === tray.id ? 'listItem--selected' : ''}"
            onclick={() => onSelectTray(tray)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && onSelectTray(tray)}
            title="{tray.name}, tray {letter}, {stats.isCardTray
              ? stats.counters + ' cards'
              : stats.isCardDivider
                ? stats.counters + ' cards in ' + stats.stacks + ' stacks'
                : stats.isCardWell
                  ? stats.counters + ' cards in ' + stats.stacks + ' cells'
                  : stats.isTileTray
                    ? stats.counters + ' tiles'
                  : stats.isCupTray
                    ? stats.stacks + ' cups'
                    : isMiniatureRackTray(tray)
                      ? stats.stacks + ' slots'
                    : stats.counters + ' counters in ' + stats.stacks + ' stacks'}"
          >
            <span style="overflow: hidden; text-overflow: ellipsis;">{tray.name}</span>
            <span style="display: flex; align-items: center; gap: 0.25rem;">
              <span class="trayStats">
                {letter}: {stats.isCardTray
                  ? stats.counters + ' cards'
                  : stats.isCardDivider
                  ? stats.counters + ' cards/' + stats.stacks + 's'
                    : stats.isCardWell
                      ? stats.counters + ' cards/' + stats.stacks + 'c'
                      : stats.isTileTray
                        ? stats.counters + ' tiles'
                      : stats.isCupTray
                        ? stats.stacks + ' cups'
                        : isMiniatureRackTray(tray)
                          ? stats.stacks + ' slots'
                        : stats.counters + 'c in ' + stats.stacks + 's'}
              </span>
              <IconButton
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onDeleteTray(selectedBox.id, tray.id);
                }}
                title="Delete tray"
                size="sm"
                variant="ghost"
              >
                <Icon color="var(--fgMuted)" Icon={IconX} />
              </IconButton>
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Tray Settings -->
  {#if selectedTray}
    <div class="panelForm">
      {#if isCounterTray(selectedTray) || isCardDividerTray(selectedTray) || isMiniatureRackTray(selectedTray)}
        <div
          class="trayEditorTabs"
          role="tablist"
          aria-label={isCounterTray(selectedTray)
            ? 'Counter tray sections'
            : isCardDividerTray(selectedTray)
              ? 'Card divider sections'
              : 'Miniature rack sections'}
        >
          <button
            class:active={activeStackedTrayTab === 'tray'}
            role="tab"
            aria-selected={activeStackedTrayTab === 'tray'}
            onclick={() => (activeStackedTrayTab = 'tray')}
          >
            {isMiniatureRackTray(selectedTray) ? 'Rack' : 'Tray'}
          </button>
          <button
            class:active={activeStackedTrayTab === 'contents'}
            role="tab"
            aria-selected={activeStackedTrayTab === 'contents'}
            onclick={() => (activeStackedTrayTab = 'contents')}
          >
            {isCounterTray(selectedTray) ? 'Counters' : isCardDividerTray(selectedTray) ? 'Card Stacks' : 'Slots'}
          </button>
        </div>
      {/if}

      {#if (!isCounterTray(selectedTray) && !isCardDividerTray(selectedTray) && !isMiniatureRackTray(selectedTray)) || activeStackedTrayTab === 'tray'}
        <div class="panelFormSection trayForm">
          <section class="traySection">
            <div class="sectionHeader">
              <h4 class="sectionTitle">Details</h4>
            </div>
            <Spacer size="0.5rem" />
            <FormControl label="Name" name="trayName">
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="text"
                  value={selectedTray.name}
                  onchange={(e) => onUpdateTray({ name: (e.currentTarget as HTMLInputElement).value })}
                />
              {/snippet}
            </FormControl>

            <Spacer size="1rem" />

            <FormControl label="Location" name="moveToLocation">
              {#snippet input({ inputProps })}
                <Select
                  {...inputProps}
                  selected={currentTrayLocation ? [currentTrayLocation] : []}
                  options={moveDestinations}
                  onSelectedChange={(selected) => {
                    if (selected[0]) {
                      handleMoveDestination(selected[0]);
                    }
                  }}
                />
              {/snippet}
            </FormControl>
            {#if isMiniatureRackTray(selectedTray) || isTileTray(selectedTray)}
              <Spacer size="0.5rem" />
              <Text size="0.875rem" color="fgMuted">
                {isMiniatureRackTray(selectedTray)
                  ? 'Miniature racks are loose-only for now and cannot be moved into boxes.'
                  : 'Tile trays are loose-only for now and cannot be moved into boxes.'}
              </Text>
            {/if}
          </section>

          <Hr class="trayDivider" />

          <section class="traySection">
            <div class="sectionHeader">
              <h4 class="sectionTitle">Appearance</h4>
            </div>
            <Spacer size="0.5rem" />
            <FormControl label="Color" name="trayColor">
              {#snippet start()}
                <Popover>
                  {#snippet trigger()}
                    <ColorPickerSwatch color={selectedTray.color} />
                  {/snippet}
                  {#snippet content()}
                    <ColorPicker
                      showOpacity={false}
                      hex={selectedTray.color}
                      onUpdate={(colorData) => handleColorUpdate(colorData.hex)}
                    />
                  {/snippet}
                </Popover>
              {/snippet}
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  value={selectedTray.color}
                  oninput={(e) => handleColorUpdate(e.currentTarget.value)}
                />
              {/snippet}
            </FormControl>

            <Spacer size="1rem" />

            <InputCheckbox
              label="Emboss name on tray bottom"
              checked={selectedTray.showEmboss ?? true}
              onchange={(e) => onUpdateTray({ showEmboss: e.currentTarget.checked })}
            />
          </section>
        </div>

        <Hr class="trayDivider" />
      {/if}

      {#if isCounterTray(selectedTray) && onUpdateCounterParams}
        <CounterTrayEditor
          tray={selectedTray as CounterTray}
          {trayLetter}
          onUpdateParams={onUpdateCounterParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
          renderMode={activeStackedTrayTab === 'tray' ? 'settings' : 'counters'}
        />
      {:else if isCardDividerTray(selectedTray) && onUpdateCardDividerParams}
        <CardDividerTrayEditor
          tray={selectedTray as CardDividerTray}
          {trayLetter}
          onUpdateParams={onUpdateCardDividerParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
          renderMode={activeStackedTrayTab === 'tray' ? 'settings' : 'stacks'}
        />
      {:else if isCardTray(selectedTray) && onUpdateCardParams}
        <CardDrawTrayEditor
          tray={selectedTray as CardDrawTray}
          onUpdateParams={onUpdateCardParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
        />
      {:else if isCardWellTray(selectedTray) && onUpdateCardWellParams}
        <CardWellTrayEditor
          tray={selectedTray as CardWellTray}
          {trayLetter}
          onUpdateParams={onUpdateCardWellParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
        />
      {:else if isCupTray(selectedTray) && onUpdateCupParams}
        <CupTrayEditor
          tray={selectedTray as CupTray}
          onUpdateParams={onUpdateCupParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
        />
      {:else if isMiniatureRackTray(selectedTray) && onUpdateMiniatureRackParams}
        <MiniatureRackTrayEditor
          tray={selectedTray as MiniatureRackTray}
          onUpdateParams={onUpdateMiniatureRackParams}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
          renderMode={activeStackedTrayTab === 'tray' ? 'settings' : 'slots'}
        />
      {:else if isTileTray(selectedTray) && onUpdateTileTrayParams}
        <TileTrayEditor
          tray={selectedTray as TileTray}
          onUpdateParams={onUpdateTileTrayParams}
          {onUpdateTray}
          actualHeight={maxTrayHeight}
          displayDimensions={selectedTrayDimensions}
        />
      {/if}

      {#if onDuplicateTray && ((!isCounterTray(selectedTray) && !isCardDividerTray(selectedTray) && !isMiniatureRackTray(selectedTray)) || activeStackedTrayTab === 'tray')}
        <Hr class="trayDivider" />

        <section class="panelFormSection traySection">
          <div class="buttonRow">
            <button
              class="secondaryButton trayActionButton trayActionButton--info"
              type="button"
              onclick={() => selectedTray && onDuplicateTray(selectedTray.id)}
            >
              Duplicate tray
            </button>
          </div>
        </section>
      {/if}
    </div>
  {:else}
    <div class="emptyState">
      <p class="emptyStateText">No tray selected</p>
    </div>
  {/if}
</div>

<style>
  .traysPanel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .panelList {
    padding: 0.5rem;
    border-bottom: var(--borderThin);
    background: var(--contrastLow);
  }

  .panelListHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
    margin-bottom: 0.5rem;
  }

  .panelListTitle {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fgMuted);
  }

  .panelListItems {
    max-height: 10rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .listItem {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem;
    border-radius: var(--radius-2);
    font-size: 0.875rem;
  }

  .listItem:hover {
    background: var(--contrastMedium);
  }

  .listItem--selected {
    color: var(--fgPrimary);
    font-weight: 600;
  }

  .panelForm {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .panelFormSection {
    padding: 0 0.75rem;
  }

  .trayForm {
    padding-top: 0.75rem;
  }

  .traySection {
    display: flex;
    flex-direction: column;
  }

  :global(.trayDivider) {
    display: block;
    height: 1px;
    min-height: 1px;
    margin: 1.35rem 0 1rem;
    border: 0;
    background: var(--contrastMedium);
  }

  .sectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .sectionTitle {
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fgMuted);
  }

  .sectionHeader .sectionTitle {
    margin-bottom: 0;
  }

  :global(.sectionTitle--featured) {
    color: var(--fg);
    font-size: 0.875rem;
    letter-spacing: 0.025em;
  }

  .trayEditorTabs {
    position: sticky;
    top: -0.75rem;
    z-index: 1;
    display: flex;
    gap: 0;
    padding: 0 0.75rem;
    background: var(--contrastLowest);
  }

  .trayEditorTabs::before {
    content: '';
    position: absolute;
    inset: 0 0.75rem;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    pointer-events: none;
  }

  .trayEditorTabs button {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.55rem 0.5rem;
    border: 0;
    border-right: var(--borderThin);
    background: var(--contrastLowest);
    color: var(--fgMuted);
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.1;
  }

  .trayEditorTabs button:first-child {
    border-radius: var(--radius-2) 0 0 var(--radius-2);
  }

  .trayEditorTabs button:last-child {
    border-right: 0;
    border-radius: 0 var(--radius-2) var(--radius-2) 0;
  }

  .trayEditorTabs button:hover {
    background: var(--contrastLow);
    color: var(--fg);
  }

  .trayEditorTabs button.active {
    position: relative;
    background: var(--contrastEmpty);
    color: var(--fg);
    box-shadow:
      inset 0 0 0 1px var(--contrastHigh),
      inset 0 -2px 0 var(--fg);
  }

  .buttonRow {
    display: flex;
    gap: 0.5rem;
  }

  .secondaryButton {
    border: var(--borderThin);
    border-radius: var(--radius-2);
    background: var(--contrastLow);
    color: var(--fg);
    padding: 0.4rem 0.75rem;
    font: inherit;
    min-width: 0;
    flex: 1 1 8.5rem;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: center;
    cursor: pointer;
  }

  .secondaryButton:hover {
    background: var(--contrastMedium);
  }

  .trayActionButton {
    justify-content: center;
    background: var(--contrastLow);
    border-color: var(--contrastMedium);
    font-weight: 600;
  }

  .trayActionButton:hover {
    background: var(--contrastMedium);
  }

  .trayActionButton--info {
    border-color: #1d4ed8;
    background: #2563eb;
    color: #fff;
  }

  .trayActionButton--info:hover {
    background: #1d4ed8;
  }

  .emptyState {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: var(--fgMuted);
  }

  .emptyStateText {
    font-size: 0.875rem;
  }

  .trayStats {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fgMuted);
  }
</style>
