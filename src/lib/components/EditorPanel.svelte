<script lang="ts">
  import { Panel, Title, Input, FormControl, Spacer, Text, InputCheckbox, Select } from '@tableslayer/ui';
  import GlobalsPanel from './GlobalsPanel.svelte';
  import BoxesPanel from './BoxesPanel.svelte';
  import TraysPanel from './TraysPanel.svelte';
  import CounterTrayEditor from './panels/CounterTrayEditor.svelte';
  import CardDrawTrayEditor from './panels/CardDrawTrayEditor.svelte';
  import CardDividerTrayEditor from './panels/CardDividerTrayEditor.svelte';
  import CardWellTrayEditor from './panels/CardWellTrayEditor.svelte';
  import CupTrayEditor from './panels/CupTrayEditor.svelte';
  import { getTrayDimensions } from '$lib/models/box';
  import {
    getProject,
    getSelectedBox,
    getSelectedBoard,
    getSelectedLayeredBox,
    getSelectedLayeredBoxLayer,
    getSelectedLayeredBoxSection,
    addSectionToLayeredBoxLayer,
    deleteSectionFromLayeredBoxLayer,
    getSelectedTray,
    getSelectedLayer,
    addLayerToLayeredBox,
    deleteLayerFromLayeredBox,
    updateBoard,
    moveBoardToLayer,
    updateBox,
    updateLayeredBox,
    updateLayeredBoxLayer,
    updateLayeredBoxLayerOptions,
    updateLayeredBoxSection,
    updateTray,
    updateTrayParams,
    updateCardTrayParams,
    updateCardDividerTrayParams,
    updateCardWellTrayParams,
    updateCupTrayParams,
    updateLayer,
    getTrayLetterById,
    isCounterTray,
    isCardTray,
    isCardDividerTray,
    isCardWellTray,
    isCupTray,
    getGlobalSettings,
    updateGlobalSettings,
    moveLayeredBoxToLayer,
    type Board,
    type Box,
    type Layer,
    type LayeredBox,
    type LayeredBoxLayer,
    type LayeredBoxSection,
    type LayeredBoxSectionType,
    type CounterTray,
    type Tray
  } from '$lib/stores/project.svelte';
  import type { CounterTrayParams } from '$lib/models/counterTray';
  import type { CardDrawTrayParams } from '$lib/models/cardTray';
  import type { CardDividerTrayParams } from '$lib/models/cardDividerTray';
  import type { CardWellTrayParams } from '$lib/models/cardWellTray';
  import type { CupTrayParams } from '$lib/models/cupTray';
  import { countCups } from '$lib/types/cupLayout';
  import { countCells } from '$lib/types/cardWellLayout';
  import { layoutEditorState } from '$lib/stores/layoutEditor.svelte';
  import { getTrayDimensionsForTray } from '$lib/models/box';
  import { getBoxDimensions, calculateLayerHeight, getLayeredBoxExteriorDimensions, getLayeredBoxRenderLayout } from '$lib/models/layer';
  import { getLidHeight } from '$lib/models/box';

  type SelectionType = 'dimensions' | 'layer' | 'box' | 'tray' | 'board' | 'layeredBox' | 'layeredBoxLayer' | 'layeredBoxSection';

  interface Props {
    selectionType: SelectionType;
    isLayoutEditMode?: boolean;
    gameContainerWidth?: number;
    gameContainerDepth?: number;
  }

  let { selectionType, isLayoutEditMode = false, gameContainerWidth = 256, gameContainerDepth = 256 }: Props = $props();

  // Layout editor dimensions
  let interiorWidth = $derived(layoutEditorState.boundsWidth);
  let interiorDepth = $derived(layoutEditorState.boundsDepth);

  let project = $derived(getProject());
  let selectedLayer = $derived(getSelectedLayer());
  let selectedBox = $derived(getSelectedBox());
  let selectedBoard = $derived(getSelectedBoard());
  let selectedLayeredBox = $derived(getSelectedLayeredBox());
  let selectedLayeredBoxLayer = $derived(getSelectedLayeredBoxLayer());
  let selectedLayeredBoxSection = $derived(getSelectedLayeredBoxSection());
  let selectedTray = $derived(getSelectedTray());

  const layerOptions = $derived.by(() => {
    const options = project.layers.map((layer) => ({
      value: layer.id,
      label: layer.name
    }));
    options.push({
      value: 'new',
      label: '+ New Layer'
    });
    return options;
  });

  const selectedLayeredBoxCurrentLayerId = $derived.by(() => {
    if (!selectedLayeredBox) return '';
    for (const layer of project.layers) {
      if (layer.layeredBoxes?.some((b) => b.id === selectedLayeredBox.id)) {
        return layer.id;
      }
    }
    return '';
  });

  const selectedBoardCurrentLayerId = $derived.by(() => {
    if (!selectedBoard) return '';
    for (const layer of project.layers) {
      if (layer.boards?.some((b) => b.id === selectedBoard.id)) {
        return layer.id;
      }
    }
    return '';
  });

  function getLayeredBoxSectionTypeLabel(type: LayeredBoxSectionType): string {
    switch (type) {
      case 'counter':
        return 'Counter tray';
      case 'cardDraw':
        return 'Card draw';
      case 'cardDivider':
        return 'Card divider';
      case 'cardWell':
        return 'Card well';
      case 'cup':
        return 'Cup tray';
      case 'playerBoard':
        return 'Player board';
    }
  }

  function handleLayerUpdate(updates: Partial<Omit<Layer, 'id' | 'boxes' | 'looseTrays'>>) {
    if (selectedLayer) {
      updateLayer(selectedLayer.id, updates);
    }
  }

  function handleBoxUpdate(updates: Partial<Omit<Box, 'id' | 'trays'>>) {
    if (selectedBox) {
      updateBox(selectedBox.id, updates);
    }
  }

  function handleBoardUpdate(updates: Partial<Omit<Board, 'id'>>) {
    if (selectedBoard) {
      updateBoard(selectedBoard.id, updates);
    }
  }

  function handleLayeredBoxUpdate(updates: Partial<Omit<LayeredBox, 'id' | 'layers'>>) {
    if (selectedLayeredBox) {
      updateLayeredBox(selectedLayeredBox.id, updates);
    }
  }

  function handleLayeredBoxLayerChange(layerId: string) {
    if (!selectedLayeredBox) return;
    if (layerId !== 'new' && layerId === selectedLayeredBoxCurrentLayerId) return;
    moveLayeredBoxToLayer(selectedLayeredBox.id, layerId as string | 'new');
  }

  function handleBoardLayerChange(layerId: string) {
    if (!selectedBoard) return;
    if (layerId !== 'new' && layerId === selectedBoardCurrentLayerId) return;
    moveBoardToLayer(selectedBoard.id, layerId as string | 'new');
  }

  function handleLayeredBoxLayerRename(name: string) {
    if (selectedLayeredBox && selectedLayeredBoxLayer) {
      updateLayeredBoxLayer(selectedLayeredBox.id, selectedLayeredBoxLayer.id, name);
    }
  }

  function handleLayeredBoxLayerUpdate(updates: Partial<Omit<LayeredBoxLayer, 'id' | 'sections'>>) {
    if (selectedLayeredBox && selectedLayeredBoxLayer) {
      updateLayeredBoxLayerOptions(selectedLayeredBox.id, selectedLayeredBoxLayer.id, updates);
    }
  }

  function handleAddLayeredBoxLayer() {
    if (selectedLayeredBox) {
      addLayerToLayeredBox(selectedLayeredBox.id);
    }
  }

  function handleDeleteSelectedLayeredBoxLayer() {
    if (selectedLayeredBox && selectedLayeredBoxLayer) {
      deleteLayerFromLayeredBox(selectedLayeredBox.id, selectedLayeredBoxLayer.id);
    }
  }

  function handleAddLayeredBoxSection(type: LayeredBoxSectionType) {
    if (selectedLayeredBox && selectedLayeredBoxLayer) {
      addSectionToLayeredBoxLayer(selectedLayeredBox.id, selectedLayeredBoxLayer.id, type);
    }
  }

  function handleLayeredBoxSectionUpdate(updates: Partial<Omit<LayeredBoxSection, 'id' | 'type'>>) {
    if (selectedLayeredBox && selectedLayeredBoxLayer && selectedLayeredBoxSection) {
      updateLayeredBoxSection(selectedLayeredBox.id, selectedLayeredBoxLayer.id, selectedLayeredBoxSection.id, updates);
    }
  }

  function handleLayeredBoxSectionCounterParamsChange(newParams: CounterTrayParams) {
    handleLayeredBoxSectionUpdate({ counterParams: newParams });
  }

  function handleLayeredBoxSectionCardWellParamsChange(newParams: CardWellTrayParams) {
    handleLayeredBoxSectionUpdate({ cardWellParams: newParams });
  }

  function handleLayeredBoxSectionCardDrawParamsChange(newParams: CardDrawTrayParams) {
    handleLayeredBoxSectionUpdate({ cardDrawParams: newParams });
  }

  function handleLayeredBoxSectionCardDividerParamsChange(newParams: CardDividerTrayParams) {
    handleLayeredBoxSectionUpdate({ cardDividerParams: newParams });
  }

  function handleLayeredBoxSectionCupParamsChange(newParams: CupTrayParams) {
    handleLayeredBoxSectionUpdate({ cupParams: newParams });
  }

  function handleDeleteSelectedLayeredBoxSection() {
    if (selectedLayeredBox && selectedLayeredBoxLayer && selectedLayeredBoxSection) {
      deleteSectionFromLayeredBoxLayer(selectedLayeredBox.id, selectedLayeredBoxLayer.id, selectedLayeredBoxSection.id);
    }
  }

  function handleTrayUpdate(updates: Partial<Omit<Tray, 'id'>>) {
    if (selectedTray) {
      updateTray(selectedTray.id, updates);
    }
  }

  // Get global settings from project store
  let globalSettings = $derived(getGlobalSettings());

  function handleGlobalSettingsChange(updates: { gameContainerWidth?: number; gameContainerDepth?: number }) {
    updateGlobalSettings(updates);
  }

  function handleCounterParamsChange(newParams: CounterTrayParams) {
    if (selectedTray && isCounterTray(selectedTray)) {
      updateTrayParams(selectedTray.id, newParams);
    }
  }

  function handleCardParamsChange(newParams: CardDrawTrayParams) {
    if (selectedTray && isCardTray(selectedTray)) {
      updateCardTrayParams(selectedTray.id, newParams);
    }
  }

  function handleCardDividerParamsChange(newParams: CardDividerTrayParams) {
    if (selectedTray && isCardDividerTray(selectedTray)) {
      updateCardDividerTrayParams(selectedTray.id, newParams);
    }
  }

  function handleCupParamsChange(newParams: CupTrayParams) {
    if (selectedTray && isCupTray(selectedTray)) {
      updateCupTrayParams(selectedTray.id, newParams);
    }
  }

  function handleCardWellParamsChange(newParams: CardWellTrayParams) {
    if (selectedTray && isCardWellTray(selectedTray)) {
      updateCardWellTrayParams(selectedTray.id, newParams);
    }
  }

  // Get tray stats for display
  function getTrayStats(tray: Tray): {
    stacks: number;
    counters: number;
    letter: string;
    isCards: boolean;
    isCups: boolean;
  } {
    let stacks = 0;
    let counters = 0;
    let isCards = false;
    let isCups = false;

    if (isCupTray(tray)) {
      stacks = countCups(tray.params.layout);
      counters = stacks;
      isCups = true;
    } else if (isCardWellTray(tray)) {
      stacks = countCells(tray.params.layout);
      counters = tray.params.stacks.reduce((sum, s) => sum + s.count, 0);
      isCards = true;
    } else if (isCardDividerTray(tray)) {
      stacks = tray.params.stacks.length;
      counters = tray.params.stacks.reduce((sum, s) => sum + s.count, 0);
      isCards = true;
    } else if (isCounterTray(tray)) {
      const topCount = tray.params.topLoadedStacks.reduce((sum, s) => sum + s[1], 0);
      const edgeCount = tray.params.edgeLoadedStacks.reduce((sum, s) => sum + s[1], 0);
      stacks = tray.params.topLoadedStacks.length + tray.params.edgeLoadedStacks.length;
      counters = topCount + edgeCount;
    } else if (isCardTray(tray)) {
      stacks = 1;
      counters = tray.params.cardCount;
      isCards = true;
    }

    const project = getProject();
    let letter = getTrayLetterById(project.layers, tray.id);
    if (!letter) {
      letter = 'A';
    }
    return { stacks, counters, letter, isCards, isCups };
  }

  let panelTitle = $derived.by(() => {
    switch (selectionType) {
      case 'dimensions':
        return 'Dimensions';
      case 'layer':
        return selectedLayer?.name ?? 'Layer';
      case 'box':
        return selectedBox?.name ?? 'Box';
      case 'layeredBox':
        return selectedLayeredBox?.name ?? 'Layered Box';
      case 'layeredBoxLayer':
        return selectedLayeredBoxLayer?.name ?? 'Layered Box Layer';
      case 'layeredBoxSection':
        return selectedLayeredBoxSection?.name ?? 'Layered Box Section';
      case 'tray':
        return selectedTray?.name ?? 'Tray';
      case 'board':
        return selectedBoard?.name ?? 'Board';
    }
  });
</script>

<aside class="editorPanel">
  <Panel class="editorPanelInner">
    <!-- Header -->
    <div class="panelHeader">
      <Title as="h2" size="sm">
        {panelTitle}
      </Title>
      {#if selectionType === 'layer' && selectedLayer}
        {@const boxCount = selectedLayer.boxes.length + selectedLayer.layeredBoxes.length}
        {@const looseCount = selectedLayer.looseTrays.length + selectedLayer.boards.length}
        <span class="headerStats">{boxCount} {boxCount === 1 ? 'box' : 'boxes'}, {looseCount} loose</span>
      {:else if selectionType === 'box' && selectedBox}
        <span class="headerStats">{selectedBox.trays.length} {selectedBox.trays.length === 1 ? 'tray' : 'trays'}</span>
      {:else if selectionType === 'layeredBox' && selectedLayeredBox}
        <span class="headerStats">{selectedLayeredBox.layers.length} {selectedLayeredBox.layers.length === 1 ? 'layer' : 'layers'}</span>
      {:else if selectionType === 'layeredBoxLayer' && selectedLayeredBoxLayer}
        <span class="headerStats">Part of {selectedLayeredBox?.name ?? 'layered box'}</span>
      {:else if selectionType === 'layeredBoxSection' && selectedLayeredBoxSection}
        <span class="headerStats">{selectedLayeredBoxSection.type}</span>
      {:else if selectionType === 'board' && selectedBoard}
        <span class="headerStats">
          {selectedBoard.width} × {selectedBoard.depth} × {selectedBoard.height}mm
        </span>
      {:else if selectionType === 'tray' && selectedTray}
        {@const stats = getTrayStats(selectedTray)}
        <span class="headerStats">
          {stats.isCups
            ? `${stats.stacks} cups`
            : `${stats.counters} ${stats.isCards ? 'cards' : 'counters'} in ${stats.stacks} stacks`}
        </span>
      {/if}
    </div>
    <!-- Content -->
    <div class="panelContent">
      {#if isLayoutEditMode}
        <div class="layoutEditMessage">
          <p class="hint">Drag trays to reposition. Save or cancel to continue editing.</p>
          <div class="dimensionsInfo">
            <div class="dimensionRow">
              <span class="dimensionLabel">Game container</span>
              <span class="dimensionValue">{gameContainerWidth} × {gameContainerDepth}mm</span>
            </div>
            {#if selectedBox}
              <div class="dimensionRow">
                <span class="dimensionLabel">Wall + tolerance</span>
                <span class="dimensionValue">{selectedBox.wallThickness + selectedBox.tolerance}mm</span>
              </div>
            {/if}
            <div class="dimensionRow highlight">
              <span class="dimensionLabel">Interior cavity max</span>
              <span class="dimensionValue">{interiorWidth.toFixed(0)} × {interiorDepth.toFixed(0)}mm</span>
            </div>
          </div>
        </div>
      {:else if selectionType === 'dimensions'}
        <GlobalsPanel {globalSettings} onGlobalSettingsChange={handleGlobalSettingsChange} />
      {:else if selectionType === 'layer'}
        {#if selectedLayer}
          {@const cardSizes = project.cardSizes ?? []}
          {@const counterShapes = project.counterShapes ?? []}
          {@const layerHeight = calculateLayerHeight(selectedLayer, { cardSizes, counterShapes })}
          <div class="layerSettings">
            <div class="panelFormSection">
              <FormControl label="Layer name" name="layerName">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="text"
                    value={selectedLayer.name}
                    onchange={(e) => handleLayerUpdate({ name: (e.target as HTMLInputElement).value })}
                  />
                {/snippet}
              </FormControl>
              <Spacer size="1rem" />
              <Text size="0.875rem" color="fgMuted">
                A <Text as="span" size="0.875rem" weight={600}>layer</Text>
                represents a horizontal slice of your game container. When editing in the layout editor, you can drag and
                drop boxes and trays to visualize them within a layer, but this has no impact on the print.
              </Text>
              <Spacer size="1rem" />
              <Text size="0.875rem" color="fgMuted">
                All boxes and loose trays in a layer are normalized to be the same height as the tallest tray. Trays
                within a box will simlarly normalize to make sure the contents don't spill. If you are targeting
                specific heights for a layer or box, please edit the stacks and heights individually in their child
                trays.
              </Text>
              <Spacer size="1rem" />
              <div class="layerContents">
                <span class="contentsLabel">Layer content dimensions</span>
                <div class="contentsTree">
                  {#each selectedLayer.boxes as box (box.id)}
                    {@const boxDims = getBoxDimensions(box, cardSizes, counterShapes)}
                    {@const boxInteriorHeight = layerHeight - box.floorThickness}
                    <div class="treeItem treeItem--box">
                      <span class="treeItemName">{box.name}</span>
                      <span class="treeItemDims">
                        {boxDims.width.toFixed(0)} × {boxDims.depth.toFixed(0)} × {layerHeight.toFixed(0)}
                      </span>
                    </div>
                    {#each box.trays as tray (tray.id)}
                      {@const trayDims = getTrayDimensionsForTray(tray, cardSizes, counterShapes)}
                      <div class="treeItem treeItem--tray treeItem--nested">
                        <span class="treeItemName">{tray.name}</span>
                        <span class="treeItemDims">
                          {trayDims.width.toFixed(0)} × {trayDims.depth.toFixed(0)} × {boxInteriorHeight.toFixed(0)}
                        </span>
                      </div>
                    {/each}
                  {/each}
                  {#each selectedLayer.layeredBoxes as layeredBox (layeredBox.id)}
                    <div class="treeItem treeItem--box">
                      <span class="treeItemName">{layeredBox.name}</span>
                      <span class="treeItemDims">{layeredBox.layers.length} {layeredBox.layers.length === 1 ? 'layer' : 'layers'}</span>
                    </div>
                  {/each}
                  {#each selectedLayer.looseTrays as tray (tray.id)}
                    {@const trayDims = getTrayDimensionsForTray(tray, cardSizes, counterShapes)}
                    <div class="treeItem treeItem--looseTray">
                      <span class="treeItemName">{tray.name}</span>
                      <span class="treeItemDims">
                        {trayDims.width.toFixed(0)} × {trayDims.depth.toFixed(0)} × {layerHeight.toFixed(0)}
                      </span>
                    </div>
                  {/each}
                  {#each selectedLayer.boards as board (board.id)}
                    <div class="treeItem treeItem--looseTray">
                      <span class="treeItemName">{board.name}</span>
                      <span class="treeItemDims">
                        {board.width.toFixed(0)} × {board.depth.toFixed(0)} × {board.height.toFixed(0)}
                      </span>
                    </div>
                  {/each}
                  {#if selectedLayer.boxes.length === 0 && selectedLayer.layeredBoxes.length === 0 && selectedLayer.looseTrays.length === 0 && selectedLayer.boards.length === 0}
                    <div class="treeEmpty">No items in layer</div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="emptyState">
            <p>No layer selected</p>
          </div>
        {/if}
      {:else if selectionType === 'box'}
        {#if selectedBox}
          <BoxesPanel
            {selectedBox}
            onSelectBox={() => {}}
            onAddBox={() => {}}
            onDeleteBox={() => {}}
            onUpdateBox={handleBoxUpdate}
            hideList={true}
          />
        {:else}
          <div class="emptyState">
            <p>No box selected</p>
          </div>
        {/if}
      {:else if selectionType === 'layeredBox'}
        {#if selectedLayeredBox}
          {@const layeredBoxLayout = getLayeredBoxRenderLayout(selectedLayeredBox, project.cardSizes, project.counterShapes)}
          {@const layeredBoxExterior = getLayeredBoxExteriorDimensions(selectedLayeredBox, project.cardSizes, project.counterShapes)}
          {@const layeredBoxLidHeight = getLidHeight({
            id: selectedLayeredBox.id,
            name: selectedLayeredBox.name,
            trays: [],
            tolerance: selectedLayeredBox.tolerance,
            wallThickness: selectedLayeredBox.wallThickness,
            floorThickness: selectedLayeredBox.floorThickness,
            lidParams: selectedLayeredBox.lidParams
          })}
          {@const minBodyWidth = layeredBoxLayout.width + selectedLayeredBox.wallThickness * 2}
          {@const minBodyDepth = layeredBoxLayout.depth + selectedLayeredBox.wallThickness * 2}
          {@const minBodyHeight = layeredBoxLayout.height + selectedLayeredBox.floorThickness}
          {@const displayTotalHeight =
            selectedLayeredBox.customBoxHeight !== undefined
              ? selectedLayeredBox.customBoxHeight + layeredBoxLidHeight
              : undefined}
          <div class="panelFormSection">
            <FormControl label="Layered box name" name="layeredBoxName">
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="text"
                  value={selectedLayeredBox.name}
                  onchange={(e) => handleLayeredBoxUpdate({ name: (e.target as HTMLInputElement).value })}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <FormControl label="Layer" name="moveLayeredBoxToLayer">
              {#snippet input({ inputProps })}
                <Select
                  {...inputProps}
                  selected={selectedLayeredBoxCurrentLayerId ? [selectedLayeredBoxCurrentLayerId] : []}
                  options={layerOptions}
                  onSelectedChange={(selected) => {
                    if (selected[0]) {
                      handleLayeredBoxLayerChange(selected[0]);
                    }
                  }}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <div class="formGrid">
              <FormControl label="Tolerance" name="layeredBoxTolerance">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    step="0.1"
                    min="0"
                    value={selectedLayeredBox.tolerance}
                    onchange={(e) =>
                      handleLayeredBoxUpdate({
                        tolerance: parseFloat((e.target as HTMLInputElement).value) || 0.5
                      })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
              <FormControl label="Wall" name="layeredBoxWallThickness">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    step="0.5"
                    min="1"
                    value={selectedLayeredBox.wallThickness}
                    onchange={(e) =>
                      handleLayeredBoxUpdate({
                        wallThickness: parseFloat((e.target as HTMLInputElement).value) || 3
                      })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
              <FormControl label="Floor" name="layeredBoxFloorThickness">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    step="0.5"
                    min="1"
                    value={selectedLayeredBox.floorThickness}
                    onchange={(e) =>
                      handleLayeredBoxUpdate({
                        floorThickness: parseFloat((e.target as HTMLInputElement).value) || 2
                      })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
            </div>
            <Spacer size="1rem" />
            <div class="layerContents">
              <div class="sectionHeader">
                <span class="contentsLabel">Box size</span>
                <span class="treeItemDims">{layeredBoxExterior.width.toFixed(1)} × {layeredBoxExterior.depth.toFixed(1)} × {layeredBoxExterior.height.toFixed(1)} mm</span>
              </div>
              <Spacer size="0.5rem" />
              <div class="formGrid">
                <FormControl label="Width (min: {minBodyWidth.toFixed(1)})" name="layeredBoxCustomWidth">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.5"
                      min={minBodyWidth}
                      value={selectedLayeredBox.customWidth ?? ''}
                      onchange={(e) => {
                        const v = (e.target as HTMLInputElement).value.trim();
                        handleLayeredBoxUpdate({ customWidth: v ? parseFloat(v) : undefined });
                      }}
                      placeholder="Auto"
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                <FormControl label="Depth (min: {minBodyDepth.toFixed(1)})" name="layeredBoxCustomDepth">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.5"
                      min={minBodyDepth}
                      value={selectedLayeredBox.customDepth ?? ''}
                      onchange={(e) => {
                        const v = (e.target as HTMLInputElement).value.trim();
                        handleLayeredBoxUpdate({ customDepth: v ? parseFloat(v) : undefined });
                      }}
                      placeholder="Auto"
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                <FormControl label="Total Height (min: {(minBodyHeight + layeredBoxLidHeight).toFixed(1)})" name="layeredBoxCustomHeight" class="formGrid__spanTwo">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.5"
                      min={minBodyHeight + layeredBoxLidHeight}
                      value={displayTotalHeight ?? ''}
                      onchange={(e) => {
                        const v = (e.target as HTMLInputElement).value.trim();
                        const boxHeight = v ? parseFloat(v) - layeredBoxLidHeight : undefined;
                        handleLayeredBoxUpdate({ customBoxHeight: boxHeight });
                      }}
                      placeholder="Auto"
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
              </div>
            </div>
            <Spacer size="1rem" />
            <div class="layerContents">
              <div class="sectionHeader">
                <span class="contentsLabel">Print options</span>
              </div>
              <Spacer size="0.5rem" />
              <InputCheckbox
                checked={selectedLayeredBox.lidParams?.honeycombEnabled ?? false}
                onchange={(e) =>
                  handleLayeredBoxUpdate({
                    lidParams: {
                      ...selectedLayeredBox.lidParams,
                      honeycombEnabled: (e.target as HTMLInputElement).checked,
                      showName: (e.target as HTMLInputElement).checked
                        ? false
                        : (selectedLayeredBox.lidParams?.showName ?? true)
                    }
                  })}
                label="Honeycomb for lid and box bottom"
              />
              <Spacer size="0.5rem" />
              <InputCheckbox
                checked={!selectedLayeredBox.lidParams?.honeycombEnabled && (selectedLayeredBox.lidParams?.showName ?? true)}
                disabled={selectedLayeredBox.lidParams?.honeycombEnabled ?? false}
                onchange={(e) =>
                  handleLayeredBoxUpdate({
                    lidParams: {
                      ...selectedLayeredBox.lidParams,
                      showName: (e.target as HTMLInputElement).checked
                    }
                  })}
                label="Emboss name on lid top"
              />
              {#if selectedLayeredBox.lidParams?.honeycombEnabled}
                <Spacer size="0.5rem" />
                <Text size="0.875rem" color="fgMuted">
                  Text embossing is disabled when honeycomb pattern is enabled
                </Text>
              {/if}
            </div>
            <Spacer size="1rem" />
            <div class="layerContents">
              <div class="sectionHeader">
                <span class="contentsLabel">Internal layers</span>
              </div>
              <Spacer size="0.5rem" />
              <div class="buttonRow">
                <button class="secondaryButton" onclick={handleAddLayeredBoxLayer}>Add internal layer</button>
              </div>
              <Spacer size="0.5rem" />
              <div class="contentsTree">
                {#each selectedLayeredBox.layers as boxLayer (boxLayer.id)}
                  <div class="treeItem treeItem--box">
                    <span class="treeItemName">{boxLayer.name}</span>
                  </div>
                {/each}
              </div>
            </div>
            <Spacer size="1rem" />
            <Text size="0.875rem" color="fgMuted">
              Phase 1 only includes the layered box structure. Internal layer contents and geometry come next.
            </Text>
          </div>
        {:else}
          <div class="emptyState">
            <p>No layered box selected</p>
          </div>
        {/if}
      {:else if selectionType === 'layeredBoxLayer'}
        {#if selectedLayeredBox && selectedLayeredBoxLayer}
          <div class="panelFormSection">
            <FormControl label="Layer name" name="layeredBoxLayerName">
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="text"
                  value={selectedLayeredBoxLayer.name}
                  onchange={(e) => handleLayeredBoxLayerRename((e.target as HTMLInputElement).value)}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <InputCheckbox
              checked={selectedLayeredBoxLayer.fillSolidEmpty ?? true}
              onchange={(e) =>
                handleLayeredBoxLayerUpdate({
                  fillSolidEmpty: (e.target as HTMLInputElement).checked
                })}
              label="Fill empty space solid"
            />
            <Spacer size="1rem" />
            <div class="buttonRow">
              <button
                class="secondaryButton"
                onclick={handleDeleteSelectedLayeredBoxLayer}
                disabled={selectedLayeredBox.layers.length <= 1}
              >
                Delete layer
              </button>
            </div>
            <Spacer size="1rem" />
            <div class="buttonRow">
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('counter')}>Add counter tray</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('cardWell')}>Add card well</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('playerBoard')}>Add player board</button>
            </div>
            <Spacer size="1rem" />
            <div class="layerContents">
              <span class="contentsLabel">Layer sections</span>
              <div class="contentsTree">
                {#if selectedLayeredBoxLayer.sections.length > 0}
                  {#each selectedLayeredBoxLayer.sections as section (section.id)}
                    <div class="treeItem treeItem--looseTray">
                      <span class="treeItemName">{section.name}</span>
                      <span class="treeItemDims">{getLayeredBoxSectionTypeLabel(section.type)}</span>
                    </div>
                  {/each}
                {:else}
                  <div class="treeEmpty">No sections yet</div>
                {/if}
              </div>
            </div>
            <Spacer size="1rem" />
            <Text size="0.875rem" color="fgMuted">
              Sections can now be added to an internal layer. Geometry and parameter editing for these sections come next.
            </Text>
          </div>
        {:else}
          <div class="emptyState">
            <p>No layered box layer selected</p>
          </div>
        {/if}
      {:else if selectionType === 'layeredBoxSection'}
        {#if selectedLayeredBox && selectedLayeredBoxLayer && selectedLayeredBoxSection}
          <div class="panelFormSection">
            <FormControl label="Section name" name="layeredBoxSectionName">
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="text"
                  value={selectedLayeredBoxSection.name}
                  onchange={(e) => handleLayeredBoxSectionUpdate({ name: (e.target as HTMLInputElement).value })}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <div class="buttonRow">
              <button class="secondaryButton" onclick={handleDeleteSelectedLayeredBoxSection}>Delete section</button>
            </div>
            <Spacer size="1rem" />
            {#if (selectedLayeredBoxSection.type === 'counter' || selectedLayeredBoxSection.type === 'playerBoard') && selectedLayeredBoxSection.counterParams}
              {@const virtualCounterTray = {
                id: selectedLayeredBoxSection.id,
                type: 'counter',
                name: selectedLayeredBoxSection.name,
                color: selectedLayeredBoxSection.color ?? '#c9503c',
                rotationOverride: 'auto',
                params: selectedLayeredBoxSection.counterParams
              } satisfies CounterTray}
              {#if selectedLayeredBoxSection.type === 'playerBoard'}
                <Text size="0.875rem" color="fgMuted">
                  Player board sections reuse the counter tray generator with a single oversized board slot by default.
                </Text>
                <Spacer size="1rem" />
              {/if}
              <CounterTrayEditor
                tray={virtualCounterTray}
                trayLetter="S"
                onUpdateParams={handleLayeredBoxSectionCounterParamsChange}
                displayDimensions={getTrayDimensions(selectedLayeredBoxSection.counterParams, project.counterShapes)}
                allowedShapeCategory={selectedLayeredBoxSection.type === 'playerBoard' ? 'playerBoard' : 'counter'}
              />
            {:else if selectedLayeredBoxSection.type === 'cardDraw' && selectedLayeredBoxSection.cardDrawParams}
              {@const virtualCardDrawTray = {
                id: selectedLayeredBoxSection.id,
                type: 'cardDraw',
                name: selectedLayeredBoxSection.name,
                color: selectedLayeredBoxSection.color ?? '#c9503c',
                rotationOverride: 'auto',
                params: selectedLayeredBoxSection.cardDrawParams
              } as const}
              <CardDrawTrayEditor
                tray={virtualCardDrawTray}
                onUpdateParams={handleLayeredBoxSectionCardDrawParamsChange}
              />
            {:else if selectedLayeredBoxSection.type === 'cardDivider' && selectedLayeredBoxSection.cardDividerParams}
              {@const virtualCardDividerTray = {
                id: selectedLayeredBoxSection.id,
                type: 'cardDivider',
                name: selectedLayeredBoxSection.name,
                color: selectedLayeredBoxSection.color ?? '#c9503c',
                rotationOverride: 'auto',
                params: selectedLayeredBoxSection.cardDividerParams,
                showEmboss: true,
                showStackLabels: true
              } as const}
              <CardDividerTrayEditor
                tray={virtualCardDividerTray}
                trayLetter="S"
                onUpdateParams={handleLayeredBoxSectionCardDividerParamsChange}
                onUpdateTray={(updates) => handleLayeredBoxSectionUpdate(updates)}
              />
            {:else if selectedLayeredBoxSection.type === 'cardWell' && selectedLayeredBoxSection.cardWellParams}
              {@const virtualCardWellTray = {
                id: selectedLayeredBoxSection.id,
                type: 'cardWell',
                name: selectedLayeredBoxSection.name,
                color: selectedLayeredBoxSection.color ?? '#c9503c',
                rotationOverride: 'auto',
                params: selectedLayeredBoxSection.cardWellParams
              } as const}
              <CardWellTrayEditor
                tray={virtualCardWellTray}
                trayLetter="S"
                onUpdateParams={handleLayeredBoxSectionCardWellParamsChange}
              />
            {:else if selectedLayeredBoxSection.type === 'cup' && selectedLayeredBoxSection.cupParams}
              {@const virtualCupTray = {
                id: selectedLayeredBoxSection.id,
                type: 'cup',
                name: selectedLayeredBoxSection.name,
                color: selectedLayeredBoxSection.color ?? '#c9503c',
                rotationOverride: 'auto',
                params: selectedLayeredBoxSection.cupParams
              } as const}
              <CupTrayEditor
                tray={virtualCupTray}
                onUpdateParams={handleLayeredBoxSectionCupParamsChange}
              />
            {:else}
              <Text size="0.875rem" color="fgMuted">
                Editor for {selectedLayeredBoxSection.type} sections comes next.
              </Text>
            {/if}
          </div>
        {:else if selectedLayeredBox && selectedLayeredBoxLayer}
          <div class="panelFormSection">
            <Text size="0.875rem" color="fgMuted">
              This internal layer has no selected section. You can add a new section from here or delete the layer.
            </Text>
            <Spacer size="1rem" />
            <div class="buttonRow">
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('counter')}>Add counter tray</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('cardDraw')}>Add card draw</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('cardDivider')}>Add card divider</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('cardWell')}>Add card well</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('cup')}>Add cup tray</button>
              <button class="secondaryButton" onclick={() => handleAddLayeredBoxSection('playerBoard')}>Add player board</button>
            </div>
            <Spacer size="1rem" />
            <div class="buttonRow">
              <button
                class="secondaryButton"
                onclick={handleDeleteSelectedLayeredBoxLayer}
                disabled={selectedLayeredBox.layers.length <= 1}
              >
                Delete layer
              </button>
            </div>
          </div>
        {:else}
          <div class="emptyState">
            <p>No layered box section selected</p>
          </div>
        {/if}
      {:else if selectionType === 'board'}
        {#if selectedBoard}
          <div class="panelFormSection">
            <FormControl label="Board name" name="boardName">
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="text"
                  value={selectedBoard.name}
                  onchange={(e) => handleBoardUpdate({ name: (e.target as HTMLInputElement).value })}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <FormControl label="Layer" name="moveBoardToLayer">
              {#snippet input({ inputProps })}
                <Select
                  {...inputProps}
                  selected={selectedBoardCurrentLayerId ? [selectedBoardCurrentLayerId] : []}
                  options={layerOptions}
                  onSelectedChange={(selected) => {
                    if (selected[0]) {
                      handleBoardLayerChange(selected[0]);
                    }
                  }}
                />
              {/snippet}
            </FormControl>
            <Spacer size="1rem" />
            <div class="formGrid">
              <FormControl label="Width" name="boardWidth">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    min="1"
                    step="1"
                    value={selectedBoard.width}
                    onchange={(e) => handleBoardUpdate({ width: parseFloat((e.target as HTMLInputElement).value) })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
              <FormControl label="Depth" name="boardDepth">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    min="1"
                    step="1"
                    value={selectedBoard.depth}
                    onchange={(e) => handleBoardUpdate({ depth: parseFloat((e.target as HTMLInputElement).value) })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
              <FormControl label="Height" name="boardHeight">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={selectedBoard.height}
                    onchange={(e) => handleBoardUpdate({ height: parseFloat((e.target as HTMLInputElement).value) })}
                  />
                {/snippet}
                {#snippet end()}mm{/snippet}
              </FormControl>
              <FormControl label="Color" name="boardColor">
                {#snippet input({ inputProps })}
                  <Input
                    {...inputProps}
                    type="color"
                    value={selectedBoard.color}
                    onchange={(e) => handleBoardUpdate({ color: (e.target as HTMLInputElement).value })}
                  />
                {/snippet}
              </FormControl>
            </div>
            <Spacer size="1rem" />
            <Text size="0.875rem" color="fgMuted">
              Boards are visual-only planning blocks for checking whether the full game contents fit within a layer.
            </Text>
          </div>
        {:else}
          <div class="emptyState">
            <p>No board selected</p>
          </div>
        {/if}
      {:else if selectionType === 'tray'}
        {#if selectedTray}
          <TraysPanel
            {selectedBox}
            {selectedTray}
            onSelectTray={() => {}}
            onAddTray={() => {}}
            onDeleteTray={() => {}}
            onUpdateTray={handleTrayUpdate}
            onUpdateCounterParams={handleCounterParamsChange}
            onUpdateCardParams={handleCardParamsChange}
            onUpdateCardDividerParams={handleCardDividerParamsChange}
            onUpdateCardWellParams={handleCardWellParamsChange}
            onUpdateCupParams={handleCupParamsChange}
            hideList={true}
          />
        {:else}
          <div class="emptyState">
            <p>No tray selected</p>
          </div>
        {/if}
      {/if}
    </div>
  </Panel>
</aside>

<style>
  .editorPanel {
    height: 100%;
    background: var(--contrastEmpty);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :global(.editorPanelInner) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    margin: 1rem;
    margin-left: 0;
    margin-right: 0.75rem;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: var(--borderThin);
    flex-shrink: 0;
  }

  .panelContent {
    flex: 1;
    overflow-y: auto;
  }

  .emptyState {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: var(--fgMuted);
    font-size: 0.875rem;
  }

  .layoutEditMessage {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .layoutEditMessage .hint {
    font-size: 0.75rem;
    color: var(--fgMuted);
  }

  .dimensionsInfo {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.75rem;
    background: var(--contrastLowest);
    border-radius: var(--radius-2);
  }

  .dimensionRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .dimensionRow.highlight {
    padding-top: 0.5rem;
    margin-top: 0.25rem;
    border-top: var(--borderThin);
  }

  .dimensionLabel {
    color: var(--fgMuted);
  }

  .dimensionValue {
    font-family: var(--font-mono);
    color: var(--fg);
  }

  .dimensionRow.highlight .dimensionValue {
    font-weight: 600;
  }

  .headerStats {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fgMuted);
  }

  .layerSettings {
    padding: 0.75rem 0;
  }

  .panelFormSection {
    padding: 0 0.75rem;
  }

  .layerContents {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .contentsLabel {
    font-size: 0.75rem;
    color: var(--fgMuted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .contentsTree {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--contrastLowest);
    border-radius: var(--radius-2);
  }

  .treeItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    padding: 0.25rem 0;
    border-radius: var(--radius-1);
  }

  .treeItem--box {
    font-weight: 600;
  }

  .treeItem--nested {
    margin-left: 1rem;
    background: transparent;
    border-left: 2px solid var(--borderColor);
  }

  .treeItem--looseTray {
    background: transparent;
  }

  .treeItemName {
    color: var(--fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .treeItemDims {
    font-family: var(--font-mono);
    color: var(--fgMuted);
    font-size: 0.6875rem;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .treeEmpty {
    font-size: 0.75rem;
    color: var(--fgMuted);
    font-style: italic;
    padding: 0.5rem;
  }

  .buttonRow {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .secondaryButton {
    border: var(--borderThin);
    background: var(--contrastLowest);
    color: var(--fg);
    border-radius: var(--radius-2);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .secondaryButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

</style>
