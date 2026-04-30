<script lang="ts">
  import { Input, FormControl, Spacer, Select, InputCheckbox } from '@tableslayer/ui';
  import type { TileTray } from '$lib/types/project';
  import { getCounterShapes } from '$lib/stores/project.svelte';
  import { type TileTrayParams, getTileTrayDimensions } from '$lib/models/tileTray';

  interface Props {
    tray: TileTray;
    onUpdateParams: (params: TileTrayParams) => void;
    onUpdateTray?: (updates: Partial<TileTray>) => void;
    actualHeight?: number;
    displayDimensions?: { width: number; depth: number; height: number } | null;
  }

  let { tray, onUpdateParams, onUpdateTray, actualHeight, displayDimensions }: Props = $props();

  const tileShapes = $derived(getCounterShapes().filter((shape) => (shape.category ?? 'counter') === 'tile'));

  const dimensions = $derived.by(() => {
    if (displayDimensions) return displayDimensions;
    const base = getTileTrayDimensions(tray.params, getCounterShapes());
    return {
      ...base,
      height: actualHeight && actualHeight > base.height ? actualHeight : base.height
    };
  });

  function updateParam<K extends keyof TileTrayParams>(key: K, value: TileTrayParams[K]) {
    onUpdateParams({
      ...tray.params,
      [key]: value
    });
  }
</script>

<div class="panelFormSection">
  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle">Tile Tray</h3>
      <span class="dimensionsInfo">
        {dimensions.width.toFixed(1)} × {dimensions.depth.toFixed(1)} × {dimensions.height.toFixed(1)} mm
      </span>
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Tile shape" name="tileShapeId">
        {#snippet input({ inputProps })}
          <Select
            {...inputProps}
            selected={[tray.params.tileShapeId]}
            options={tileShapes.map((shape) => ({ value: shape.id, label: shape.name }))}
            onSelectedChange={(selected) => selected[0] && updateParam('tileShapeId', selected[0])}
          />
        {/snippet}
      </FormControl>

      <FormControl label="Count" name="tileCount">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="1"
            step="1"
            value={tray.params.count}
            onchange={(e) => updateParam('count', parseInt(e.currentTarget.value))}
          />
        {/snippet}
      </FormControl>

      <FormControl label="Orientation" name="tileOrientation">
        {#snippet input({ inputProps })}
          <Select
            {...inputProps}
            selected={[tray.params.orientation]}
            options={[
              { value: 'vertical', label: 'Vertical' },
              { value: 'horizontal', label: 'Horizontal' }
            ]}
            onSelectedChange={(selected) =>
              selected[0] && updateParam('orientation', selected[0] as TileTrayParams['orientation'])}
          />
        {/snippet}
      </FormControl>

      <FormControl label="Clearance" name="tileClearance">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            min="0"
            value={tray.params.clearance}
            onchange={(e) => updateParam('clearance', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>

      <FormControl label="Wall" name="tileWallThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            min="0.8"
            value={tray.params.wallThickness}
            onchange={(e) => updateParam('wallThickness', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>

      <FormControl label="Floor" name="tileFloorThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            min="0.8"
            value={tray.params.floorThickness}
            onchange={(e) => updateParam('floorThickness', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>

      <FormControl label="Rim" name="tileRimHeight">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            step="0.1"
            min="0"
            value={tray.params.rimHeight}
            onchange={(e) => updateParam('rimHeight', parseFloat(e.currentTarget.value))}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
    <Spacer size="0.75rem" />
    {#if onUpdateTray}
      <InputCheckbox
        label="Auto-adjust height to layer"
        checked={tray.autoHeight ?? false}
        onchange={(e) => onUpdateTray({ autoHeight: e.currentTarget.checked })}
      />
    {/if}
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

  .dimensionsInfo {
    font-size: 0.75rem;
    color: var(--fgMuted);
  }

  .formGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
