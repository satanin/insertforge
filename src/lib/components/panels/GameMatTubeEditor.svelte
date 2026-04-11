<script lang="ts">
  import { FormControl, Input, InputCheckbox, Select, Spacer, Text } from '@tableslayer/ui';

  import {
    computeGameMatTubePieceCount,
    getGameMatTubeDimensions,
    normalizeGameMatTubeParams,
    type GameMatTubeParams
  } from '$lib/models/gameMatTube';
  import type { GameMatTubeAccessory } from '$lib/types/project';

  interface Props {
    accessory: GameMatTubeAccessory;
    onUpdateAccessory: (updates: Partial<Omit<GameMatTubeAccessory, 'id' | 'type' | 'params'>>) => void;
    onUpdateParams: (params: GameMatTubeParams) => void;
  }

  let { accessory, onUpdateAccessory, onUpdateParams }: Props = $props();

  let normalizedParams = $derived(normalizeGameMatTubeParams(accessory.params));
  let dimensions = $derived(getGameMatTubeDimensions(normalizedParams));
  let pieceCount = $derived(computeGameMatTubePieceCount(normalizedParams));

  function updateParams(updates: Partial<GameMatTubeParams>) {
    onUpdateParams({ ...accessory.params, ...updates });
  }
</script>

<div class="panelFormSection">
  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Accessory</h3>
      <span class="dimensionsInfo">
        {dimensions.outerDiameter.toFixed(1)}mm OD · {dimensions.totalLength.toFixed(1)}mm
      </span>
    </div>
    <Spacer size="0.5rem" />
    <FormControl label="Name" name="gameMatTubeName">
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          value={accessory.name}
          onchange={(e) => onUpdateAccessory({ name: e.currentTarget.value })}
        />
      {/snippet}
    </FormControl>
    <Spacer size="0.75rem" />
    <div class="formGrid">
      <FormControl label="Preview mode" name="gameMatTubePreviewMode">
        {#snippet input({ inputProps })}
          <Select
            {...inputProps}
            selected={[accessory.previewMode ?? 'assembled']}
            options={[
              { value: 'assembled', label: 'Assembled' },
              { value: 'printBed', label: 'Print bed' }
            ]}
            onSelectedChange={(selected) => onUpdateAccessory({ previewMode: (selected[0] as 'assembled' | 'printBed') ?? 'assembled' })}
          />
        {/snippet}
      </FormControl>
      <FormControl label="Color" name="gameMatTubeColor">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="color"
            value={accessory.color}
            onchange={(e) => onUpdateAccessory({ color: e.currentTarget.value })}
          />
        {/snippet}
      </FormControl>
    </div>
    <Spacer size="0.75rem" />
    <Text size="0.875rem" color="fgMuted">
      Current segmentation: {pieceCount} printable tube piece{pieceCount === 1 ? '' : 's'}{normalizedParams.labelEnabled ? ' + 1 label' : ''}.
    </Text>
  </section>

  <Spacer size="0.75rem" />

  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Tube</h3>
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Total length" name="totalLengthMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="70"
            step="1"
            value={accessory.params.totalLengthMm}
            onchange={(e) => updateParams({ totalLengthMm: parseFloat(e.currentTarget.value) || 70 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Inner diameter" name="innerDiameterMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="20"
            step="0.5"
            value={accessory.params.innerDiameterMm}
            onchange={(e) => updateParams({ innerDiameterMm: parseFloat(e.currentTarget.value) || 20 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Wall thickness" name="wallThicknessMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="2.5"
            step="0.1"
            value={accessory.params.wallThicknessMm}
            onchange={(e) => updateParams({ wallThicknessMm: parseFloat(e.currentTarget.value) || 2.5 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Thread length" name="threadLengthMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="20"
            step="0.5"
            value={accessory.params.threadLengthMm}
            onchange={(e) => updateParams({ threadLengthMm: parseFloat(e.currentTarget.value) || 20 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
  </section>

  <Spacer size="0.75rem" />

  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Segmentation</h3>
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Max piece height" name="maxPieceHeightMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="60"
            step="1"
            value={accessory.params.maxPieceHeightMm}
            onchange={(e) => updateParams({ maxPieceHeightMm: parseFloat(e.currentTarget.value) || 60 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Min pieces" name="minPieces">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="2"
            step="1"
            value={accessory.params.minPieces}
            onchange={(e) => updateParams({ minPieces: parseFloat(e.currentTarget.value) || 2 })}
          />
        {/snippet}
      </FormControl>
      <FormControl label="Thread clearance" name="threadClearanceMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0"
            step="0.05"
            value={accessory.params.threadClearanceMm}
            onchange={(e) => updateParams({ threadClearanceMm: parseFloat(e.currentTarget.value) || 0 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <div class="checkboxCell">
        <InputCheckbox
          checked={accessory.params.equalizeVisibleHeights}
          onchange={(e) => updateParams({ equalizeVisibleHeights: e.currentTarget.checked })}
          label="Equalize visible heights"
        />
      </div>
    </div>
  </section>

  <Spacer size="0.75rem" />

  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Print Bed</h3>
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Bed X" name="bedSizeXMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="120"
            step="1"
            value={accessory.params.bedSizeXMm}
            onchange={(e) => updateParams({ bedSizeXMm: parseFloat(e.currentTarget.value) || 120 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Bed Y" name="bedSizeYMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="120"
            step="1"
            value={accessory.params.bedSizeYMm}
            onchange={(e) => updateParams({ bedSizeYMm: parseFloat(e.currentTarget.value) || 120 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
  </section>

  <Spacer size="0.75rem" />

  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Label</h3>
    </div>
    <Spacer size="0.5rem" />
    <InputCheckbox
      checked={accessory.params.labelEnabled}
      onchange={(e) => updateParams({ labelEnabled: e.currentTarget.checked })}
      label="Enable printable label"
    />
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Width" name="labelWidthMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="10"
            step="0.5"
            value={accessory.params.labelWidthMm}
            onchange={(e) => updateParams({ labelWidthMm: parseFloat(e.currentTarget.value) || 10 })}
            disabled={!accessory.params.labelEnabled}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Length" name="labelLengthMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="8"
            step="0.5"
            value={accessory.params.labelLengthMm}
            onchange={(e) => updateParams({ labelLengthMm: parseFloat(e.currentTarget.value) || 8 })}
            disabled={!accessory.params.labelEnabled}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Thickness" name="labelThicknessMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0.8"
            step="0.1"
            value={accessory.params.labelThicknessMm}
            onchange={(e) => updateParams({ labelThicknessMm: parseFloat(e.currentTarget.value) || 0.8 })}
            disabled={!accessory.params.labelEnabled}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Insert clearance" name="labelInsertClearanceMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0"
            step="0.05"
            value={accessory.params.labelInsertClearanceMm}
            onchange={(e) => updateParams({ labelInsertClearanceMm: parseFloat(e.currentTarget.value) || 0 })}
            disabled={!accessory.params.labelEnabled}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
    <Spacer size="0.5rem" />
    <InputCheckbox
      checked={accessory.params.labelSnapEnabled}
      onchange={(e) => updateParams({ labelSnapEnabled: e.currentTarget.checked })}
      label="Enable label snap"
      disabled={!accessory.params.labelEnabled}
    />
  </section>

  <Spacer size="0.75rem" />

  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Pattern</h3>
    </div>
    <Spacer size="0.5rem" />
    <InputCheckbox
      checked={accessory.params.surfacePattern}
      onchange={(e) => updateParams({ surfacePattern: e.currentTarget.checked })}
      label="Enable surface pattern"
    />
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Depth" name="patternDepthMm">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0.01"
            step="0.05"
            value={accessory.params.patternDepthMm}
            onchange={(e) => updateParams({ patternDepthMm: parseFloat(e.currentTarget.value) || 0.01 })}
            disabled={!accessory.params.surfacePattern}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Lanes" name="patternLanes">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="2"
            step="1"
            value={accessory.params.patternLanes}
            onchange={(e) => updateParams({ patternLanes: parseFloat(e.currentTarget.value) || 2 })}
            disabled={!accessory.params.surfacePattern}
          />
        {/snippet}
      </FormControl>
      <FormControl label="Angle" name="patternAngle">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.5"
            value={accessory.params.patternAngle}
            onchange={(e) => updateParams({ patternAngle: parseFloat(e.currentTarget.value) || 0 })}
            disabled={!accessory.params.surfacePattern}
          />
        {/snippet}
        {#snippet end()}deg{/snippet}
      </FormControl>
      <FormControl label="Twist gain" name="patternTwistGain">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0.5"
            step="0.1"
            value={accessory.params.patternTwistGain}
            onchange={(e) => updateParams({ patternTwistGain: parseFloat(e.currentTarget.value) || 0.5 })}
            disabled={!accessory.params.surfacePattern}
          />
        {/snippet}
      </FormControl>
      <FormControl label="Line width" name="patternLineWidth">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0.2"
            step="0.05"
            value={accessory.params.patternLineWidth}
            onchange={(e) => updateParams({ patternLineWidth: parseFloat(e.currentTarget.value) || 0.2 })}
            disabled={!accessory.params.surfacePattern}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
  </section>
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
    margin: 0;
    font-size: 0.875rem;
  }

  .dimensionsInfo {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--fgMuted);
  }

  .formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .checkboxCell {
    display: flex;
    align-items: end;
  }
</style>
