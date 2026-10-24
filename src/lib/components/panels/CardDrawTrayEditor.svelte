<script lang="ts">
  import { effectiveCardSize } from '$lib/utils/projectCards';
  import CardSleeveControl from '../CardSleeveControl.svelte';
  import EditorSection from '../EditorSection.svelte';
  import QuantityInput from '../QuantityInput.svelte';
  import OuterCornerControls from './OuterCornerControls.svelte';
  import { Input, InputCheckbox, FormControl, Spacer, Select } from '@tableslayer/ui';
  import type { CardDrawTray } from '$lib/types/project';
  import { type CardDrawTrayParams, getCardDrawTrayDimensions } from '$lib/models/cardTray';
  import { getCardSizes } from '$lib/stores/project.svelte';

  interface Props {
    tray: CardDrawTray;
    onUpdateParams: (params: CardDrawTrayParams) => void;
    onUpdateTray?: (updates: Partial<CardDrawTray>) => void;
    actualHeight?: number;
    displayDimensions?: { width: number; depth: number; height: number } | null;
  }

  let { tray, onUpdateParams, onUpdateTray, actualHeight, displayDimensions }: Props = $props();

  let cardSizes = $derived(getCardSizes());
  let selectedCardSize = $derived(effectiveCardSize(cardSizes.find((s) => s.id === tray.params.cardSizeId), tray.params));

  // Compute dimensions, using actualHeight if provided (when tray expands to match box height)
  // If displayDimensions is provided (with rotation applied), use those for display
  let dimensions = $derived.by(() => {
    if (displayDimensions) {
      return displayDimensions;
    }
    const baseDims = getCardDrawTrayDimensions(tray.params, getCardSizes());
    return {
      ...baseDims,
      height: actualHeight && actualHeight > baseDims.height ? actualHeight : baseDims.height
    };
  });

  function updateParam<K extends keyof CardDrawTrayParams>(key: K, value: CardDrawTrayParams[K]) {
    onUpdateParams({ ...tray.params, [key]: value, ...(key === 'cardSizeId' ? { cardThicknessOverride: undefined } : {}) });
  }
</script>

<div class="panelFormSection">
  <EditorSection title="Content · card format">
  <section class="section">
    <h3 class="sectionTitle">Card Size</h3>
    <Spacer size="0.5rem" />
    <FormControl label="Card size" name="cardSizeId">
      {#snippet input({ inputProps })}
        <Select
          {...inputProps}
          selected={[tray.params.cardSizeId]}
          options={cardSizes.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.width}×${s.length}mm)`
          }))}
          onSelectedChange={(selected) => {
            if (selected[0]) {
              updateParam('cardSizeId', selected[0]);
            }
          }}
        />
      {/snippet}
    </FormControl>
    <CardSleeveControl selection={tray.params} onChange={(value) => onUpdateParams({ ...tray.params, ...value })} />
    {#if selectedCardSize}
      <Spacer size="0.25rem" />
      <p class="cardSizeInfo">
        {selectedCardSize.width}mm × {selectedCardSize.length}mm, {selectedCardSize.thickness}mm per card
      </p>
    {/if}
  </section>
  </EditorSection>

  <Spacer size="0.5rem" />

  <EditorSection title="Content · card stack">
  <section class="section">
    <h3 class="sectionTitle">Card Stack</h3>
    <Spacer size="0.5rem" />
    <FormControl label="Card count" name="cardCount">
      {#snippet input({ inputProps })}
        <QuantityInput
          id={inputProps.id}
          label="Card count"
          value={tray.params.cardCount}
          onChange={(value) => updateParam('cardCount', value)}
        />
      {/snippet}
    </FormControl>
  </section>
  </EditorSection>

  <Spacer size="0.5rem" />

  <EditorSection title="Manufacturing">
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
      <OuterCornerControls value={tray.params.outerCornerRadius} width={dimensions.width} depth={dimensions.depth}
        margin={Math.min(tray.params.wallThickness, 2)} onchange={(value) => updateParam('outerCornerRadius', value)} />
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
      <FormControl label="Slope angle" name="floorSlopeAngle">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="1"
            min="0"
            max="30"
            value={tray.params.floorSlopeAngle}
            onchange={(e) => updateParam('floorSlopeAngle', parseInt(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}°{/snippet}
      </FormControl>
    </div>
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

  <Spacer size="0.5rem" />

  <EditorSection title="Magnet holes">
  <section class="section">
    <h3 class="sectionTitle">Magnet Holes</h3>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Diameter" name="magnetHoleDiameter">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.5"
            value={tray.params.magnetHoleDiameter}
            onchange={(e) => updateParam('magnetHoleDiameter', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Depth" name="magnetHoleDepth">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            value={tray.params.magnetHoleDepth}
            onchange={(e) => updateParam('magnetHoleDepth', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
  </section>
  </EditorSection>
</div>

<style>
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

  .formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .cardSizeInfo {
    font-size: 0.75rem;
    color: var(--fgMuted);
    margin: 0;
  }

  .dimensionsInfo {
    font-size: 0.75rem;
    color: var(--fgMuted);
    margin: 0;
  }
</style>
