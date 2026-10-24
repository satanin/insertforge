<script lang="ts">
  import CardSleeveControl from '../CardSleeveControl.svelte';
  import EditorSection from '../EditorSection.svelte';
  import { interfaceUi } from '$lib/stores/interface.svelte';
  import QuantityInput from '../QuantityInput.svelte';
  import { Input, InputCheckbox, FormControl, Spacer, Select, IconButton, Icon } from '@tableslayer/ui';
  import { IconRotate2 } from '@tabler/icons-svelte';
  import type { CardWellTray } from '$lib/types/project';
  import {
    type CardWellTrayParams,
    getCardWellTrayDimensions,
    getCardWellGripRadius,
    getCardWellCornerRadius,
    syncStacksWithLayout
  } from '$lib/models/cardWellTray';
  import { getAllCellIds, type CardWellLayout } from '$lib/types/cardWellLayout';
  import { getCardSizes, getProjectDefaultCardSizeId } from '$lib/stores/project.svelte';
  import CardWellLayoutEditor from './CardWellLayoutEditor.svelte';

  interface Props {
    tray: CardWellTray;
    trayLetter: string;
    onUpdateParams: (params: CardWellTrayParams) => void;
    onUpdateTray?: (updates: Partial<CardWellTray>) => void;
    actualHeight?: number;
    displayDimensions?: { width: number; depth: number; height: number } | null;
  }

  let { tray, trayLetter, onUpdateParams, onUpdateTray, actualHeight, displayDimensions }: Props = $props();

  // Get available cell IDs from layout
  let cellIds = $derived(getAllCellIds(tray.params.layout));

  // Get default card size ID for new stacks
  let defaultCardSizeId = $derived(getProjectDefaultCardSizeId());

  // Compute dimensions
  let dimensions = $derived.by(() => {
    if (displayDimensions) {
      return displayDimensions;
    }
    const baseDims = getCardWellTrayDimensions(tray.params, getCardSizes());
    return {
      ...baseDims,
      height: actualHeight && actualHeight > baseDims.height ? actualHeight : baseDims.height
    };
  });

  function updateParam<K extends keyof CardWellTrayParams>(key: K, value: CardWellTrayParams[K]) {
    onUpdateParams({ ...tray.params, [key]: value });
  }
  const minimumFields = [
    { key: 'trayWidthOverride', label: 'Minimum width', dimension: 'width', axis: 'X' },
    { key: 'trayDepthOverride', label: 'Minimum length', dimension: 'depth', axis: 'Y' },
    { key: 'minimumHeight', label: 'Minimum height', dimension: 'height', axis: 'Z' }
  ] as const;

  // Layout update handler - syncs stacks when layout changes (adds/removes as needed)
  function handleLayoutUpdate(layout: CardWellLayout) {
    const syncedStacks = syncStacksWithLayout(tray.params.stacks, layout, defaultCardSizeId);
    onUpdateParams({ ...tray.params, layout, stacks: syncedStacks });
  }

  // Stack handlers
  function updateStack(index: number, field: 'cardSizeId' | 'count' | 'rotation' | 'label', value: string | number) {
    const newStacks = [...tray.params.stacks];
    const current = newStacks[index];
    if (field === 'cardSizeId') {
      newStacks[index] = { ...current, cardSizeId: value as string, cardThicknessOverride: undefined };
    } else if (field === 'count') {
      newStacks[index] = { ...current, count: value as number };
    } else if (field === 'rotation') {
      newStacks[index] = { ...current, rotation: value as 0 | 90 };
    } else if (field === 'label') {
      newStacks[index] = { ...current, label: value as string };
    }
    onUpdateParams({ ...tray.params, stacks: newStacks });
  }

  // Toggle rotation between 0 and 90
  function toggleRotation(index: number) {
    const current = tray.params.stacks[index];
    const newRotation = (current.rotation ?? 0) === 0 ? 90 : 0;
    updateStack(index, 'rotation', newRotation);
  }

  // Get ref number for a cell ID (1-based)
  function getCellRefNumber(cellId: string): number {
    return cellIds.indexOf(cellId) + 1;
  }

  // Sort stacks by cell reference number for display
  let sortedStacks = $derived(
    [...tray.params.stacks].sort((a, b) => getCellRefNumber(a.cellId) - getCellRefNumber(b.cellId))
  );
</script>

{#snippet distributionSection()}
  <EditorSection title="Distribution" summary={`${cellIds.length} wells`} open={false}>
  <section class="section">
    <h3 class="sectionTitle">Layout</h3>
    <CardWellLayoutEditor
      layout={tray.params.layout}
      stacks={tray.params.stacks}
      cardSizes={getCardSizes()}
      {trayLetter}
      trayWidth={dimensions.width}
      trayDepth={dimensions.depth}
      clearance={tray.params.clearance}
      wallThickness={tray.params.wallThickness}
      gripInset={getCardWellGripRadius(tray.params)}
      onUpdateLayout={handleLayoutUpdate}
    />
  </section>
  </EditorSection>
{/snippet}

{#snippet contentSection()}
  <EditorSection title="Content" summary={`${tray.params.stacks.reduce((sum, s) => sum + s.count, 0)} cards in ${tray.params.stacks.length} stacks`}>
  <section class="section">
    <h3 class="sectionTitle">Card Stacks</h3>
    <Spacer size="0.5rem" />
    <div class="stackList">
      {#each sortedStacks as stack (stack.id)}
        {@const stackIndex = tray.params.stacks.findIndex((s) => s.id === stack.id)}
        {@const rotation = stack.rotation ?? 0}
        <div class="stackItem">
          <div class="stackRow">
            <span class="cellRef">{trayLetter}{getCellRefNumber(stack.cellId)}</span>
            <div class="stackCardSelect">
              <Select
                selected={[stack.cardSizeId]}
                options={getCardSizes().map((s) => ({
                  value: s.id,
                  label: s.name
                }))}
                onSelectedChange={(selected) => updateStack(stackIndex, 'cardSizeId', selected[0])}
              />
            </div>
            <QuantityInput
              legacyStyle="width: 3.5rem;"
              label={`Cards in ${trayLetter}${getCellRefNumber(stack.cellId)}`}
              value={stack.count}
              onChange={(value) => updateStack(stackIndex, 'count', value)}
            />
            <IconButton
              variant="ghost"
              onclick={() => toggleRotation(stackIndex)}
              title={rotation === 0 ? 'Rotate 90°' : 'Rotate 0°'}
              color={rotation === 90 ? 'var(--fg)' : 'var(--fgMuted)'}
            >
              <Icon Icon={IconRotate2} color={rotation === 90 ? 'var(--fg)' : 'var(--fgMuted)'} />
            </IconButton>
          </div>
          <CardSleeveControl selection={stack} label={`Sleeves ${trayLetter}${getCellRefNumber(stack.cellId)}`} onChange={(value) => onUpdateParams({ ...tray.params, stacks: tray.params.stacks.map(s => s.id === stack.id ? { ...s, ...value } : s) })} />
          <FormControl label="Stack name" name={`stackLabel-${stack.id}`}>
            {#snippet input({ inputProps })}
              <Input
                {...inputProps}
                type="text"
                aria-label={`Stack name ${trayLetter}${getCellRefNumber(stack.cellId)}`}
                placeholder="Optional name"
                value={stack.label ?? ''}
                onchange={(e) => updateStack(stackIndex, 'label', e.currentTarget.value)}
              />
            {/snippet}
          </FormControl>
        </div>
      {/each}
    </div>
    <Spacer size="0.5rem" />
    <InputCheckbox
      label="Engrave stack labels"
      checked={tray.params.engraveStackLabels ?? true}
      onchange={(e) => updateParam('engraveStackLabels', e.currentTarget.checked)}
    />
    <p class="minimumHint">
      Names are engraved in each well floor, away from the finger hole. Long names are scaled to fit.
    </p>
  </section>
  </EditorSection>
{/snippet}

{#snippet manufacturingSection()}
  <EditorSection title="Manufacturing" summary={`Wall ${tray.params.wallThickness} · floor ${tray.params.floorThickness} mm`}>
  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle sectionTitle--featured">Tray Settings</h3>
      {#if dimensions}
        <span class="dimensionsInfo">
          {dimensions.width.toFixed(1)} × {dimensions.depth.toFixed(1)} × {dimensions.height.toFixed(1)} mm
        </span>
      {/if}
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Wall" name="wallThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            value={tray.params.wallThickness}
            onchange={(e) => updateParam('wallThickness', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Floor" name="floorThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            value={tray.params.floorThickness}
            onchange={(e) => updateParam('floorThickness', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Clearance" name="clearance">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            value={tray.params.clearance}
            onchange={(e) => updateParam('clearance', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Rim" name="rimHeight">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            value={tray.params.rimHeight}
            onchange={(e) => updateParam('rimHeight', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
  </section>
  </EditorSection>
{/snippet}

{#snippet finishSection()}
  <EditorSection title="Corner finish" summary={`Requested radius ${tray.params.outerCornerRadius ?? 0} mm`} open={false}>
  <section class="section">
    <FormControl label="Outer corner radius" name="outerCornerRadius">
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          min="0"
          step="0.5"
          value={tray.params.outerCornerRadius ?? 0}
          onchange={(e) => {
            const value = Number(e.currentTarget.value);
            updateParam('outerCornerRadius', Number.isFinite(value) && value > 0 ? value : 0);
          }}
        />
      {/snippet}
      {#snippet end()}mm{/snippet}
    </FormControl>
    <p class="minimumHint">
      0 keeps square corners. Applied radius: {getCardWellCornerRadius(tray.params, getCardSizes()).toFixed(1)} mm, limited
      to protect the wells and extraction notches. Top and bottom stay flat for stacking.
    </p>
  </section>
  </EditorSection>
{/snippet}

{#snippet dimensionsSection()}
  <EditorSection title="Dimensions" summary={`${dimensions.width.toFixed(1)} × ${dimensions.depth.toFixed(1)} × ${dimensions.height.toFixed(1)} mm`} open={false}>
  <section class="section">
    <h3 class="sectionTitle">Minimum exterior dimensions</h3>
    <div class="formGrid">
      {#each minimumFields as field (field.key)}
        <div class="minimumField">
          <FormControl label={field.label} name={field.key}>
            {#snippet input({ inputProps })}
              <Input
                {...inputProps}
                type="number"
                min="0"
                step="0.1"
                placeholder="Auto"
                value={tray.params[field.key] ?? ''}
                onchange={(e) => {
                  const value = Number(e.currentTarget.value);
                  updateParam(field.key, Number.isFinite(value) && value > 0 ? value : null);
                }}
              />
            {/snippet}
            {#snippet end()}mm{/snippet}
          </FormControl>
          <small class="currentDimension">
            Current {field.label.replace('Minimum ', '')} ({field.axis}): {dimensions[field.dimension].toFixed(1)} mm
          </small>
        </div>
      {/each}
    </div>
    <p class="minimumHint">
      Empty or 0 keeps automatic sizing. Smaller values never reduce card space. Extra width and length are shared
      between outer margins and internal dividers; extra height raises the well floors.
    </p>
    {#if onUpdateTray}
      <Spacer size="1rem" />
      <InputCheckbox
        label="Auto-adjust height to layer"
        checked={tray.autoHeight ?? true}
        onchange={(e) => onUpdateTray({ autoHeight: e.currentTarget.checked })}
      />
    {/if}
  </section>
  </EditorSection>
{/snippet}

{#snippet extractionSection()}
  <EditorSection title="Extraction" summary={tray.params.extractionNotches ? 'Through notches enabled' : 'Notches disabled'} open={false}>
  <section class="section">
    <InputCheckbox
      label="Extraction notches"
      checked={tray.params.extractionNotches ?? false}
      onchange={(e) => updateParam('extractionNotches', e.currentTarget.checked)}
    />
    {#if tray.params.extractionNotches}
      <Spacer size="0.5rem" />
      <FormControl label="Notch diameter" name="extractionNotchDiameter">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="8"
            max="40"
            step="1"
            value={getCardWellGripRadius(tray.params) * 2}
            onchange={(e) => {
              const value = Number(e.currentTarget.value);
              updateParam('extractionNotchDiameter', Number.isFinite(value) ? Math.max(8, Math.min(40, value)) : 20);
            }}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <p class="minimumHint">
        Two centered recesses on the left and right sides (X). The central divider gets priority when both outer columns
        have several wells; otherwise side margins protect the cards. The recesses pass through the floor so aligned
        trays form a continuous finger channel when stacked.
      </p>
    {/if}
  </section>
  </EditorSection>
{/snippet}
<div class="panelFormSection">
  {#if interfaceUi.mode === 'modern'}
    {@render contentSection()}
    {@render distributionSection()}
    {@render dimensionsSection()}
    {@render manufacturingSection()}
    {@render extractionSection()}
    {@render finishSection()}
  {:else}
    {@render distributionSection()}
    <Spacer size="0.5rem" />
    {@render contentSection()}
    <Spacer size="0.5rem" />
    {@render manufacturingSection()}
    <Spacer size="0.5rem" />
    {@render finishSection()}
    <Spacer size="0.5rem" />
    {@render dimensionsSection()}
    <Spacer size="0.5rem" />
    {@render extractionSection()}
    <Spacer size="0.5rem" />
  {/if}
</div>

<style>
  .stackItem {
    display: grid;
    gap: 0.4rem;
    padding-bottom: 0.75rem;
    border-bottom: var(--borderThin);
  }
  .minimumField {
    min-width: 0;
  }
  .currentDimension {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--fgMuted);
  }
  .minimumHint {
    font-size: 0.75rem;
    color: var(--fgMuted);
    margin-top: 0.5rem;
  }
  .panelFormSection {
    padding: 0 0.75rem;
  }

  .section {
    margin-bottom: 1rem;
  }

  .sectionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .sectionTitle {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fgMuted);
  }

  .sectionHeader .sectionTitle {
    margin-bottom: 0;
  }

  .formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .stackList {
    display: flex;
    flex-direction: column;
  }

  .stackRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .cellRef {
    width: 2rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fgMuted);
    flex-shrink: 0;
  }

  .stackCardSelect {
    flex: 1;
    min-width: 0;
  }

  .dimensionsInfo {
    font-size: 0.75rem;
    color: var(--fgMuted);
    margin: 0;
  }
</style>
