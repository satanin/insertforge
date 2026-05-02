<script lang="ts">
  import { FormControl, Input, Link, Spacer, Text, IconButton, Icon } from '@tableslayer/ui';
  import { IconX } from '@tabler/icons-svelte';

  import {
    DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE,
    DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE,
    createDefaultMiniatureRackSlot,
    DEFAULT_MINIATURE_RACK_LIP_ANGLE,
    DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET,
    DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS,
    getMiniatureRackDimensions,
    getMiniatureRackMinimumBaseDepth,
    type MiniatureRackParams,
    type MiniatureRackSlot
  } from '$lib/models/miniatureRack';
  import type { MiniatureRackTray } from '$lib/types/project';

  interface Props {
    tray: MiniatureRackTray;
    onUpdateParams: (params: MiniatureRackParams) => void;
    actualHeight?: number;
    displayDimensions?: { width: number; depth: number; height: number } | null;
    renderMode?: 'all' | 'settings' | 'slots';
  }

  let { tray, onUpdateParams, actualHeight, displayDimensions, renderMode = 'all' }: Props = $props();

  let dimensions = $derived.by(() => {
    if (displayDimensions) return displayDimensions;
    return getMiniatureRackDimensions(tray.params, actualHeight);
  });

  let minimumBaseDepth = $derived(getMiniatureRackMinimumBaseDepth(tray.params.rackHeight));

  function updateParams(updates: Partial<MiniatureRackParams>) {
    onUpdateParams({ ...tray.params, ...updates });
  }

  function updateSlot(slotId: string, updates: Partial<MiniatureRackSlot>) {
    updateParams({
      slots: tray.params.slots.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot))
    });
  }

  function addSlot() {
    updateParams({
      slots: [...tray.params.slots, createDefaultMiniatureRackSlot(tray.params.slots.length + 1)]
    });
  }

  function removeSlot(slotId: string) {
    if (tray.params.slots.length <= 1) return;
    updateParams({
      slots: tray.params.slots.filter((slot) => slot.id !== slotId)
    });
  }
</script>

{#if renderMode === 'all' || renderMode === 'settings'}
<div class="panelFormSection">
  <section class="section">
    <div class="sectionHeader">
      <h3 class="sectionTitle sectionTitle--featured">Rack Settings</h3>
      <span class="dimensionsInfo">
        {dimensions.width.toFixed(1)} × {dimensions.depth.toFixed(1)} × {dimensions.height.toFixed(1)} mm
      </span>
    </div>
    <Spacer size="0.5rem" />
    <div class="formGrid">
      <FormControl label="Height" name="rackHeight">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="20"
            step="0.5"
            value={tray.params.rackHeight}
            onchange={(e) => updateParams({ rackHeight: parseFloat(e.currentTarget.value) || 20 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Rack Base Depth" name="rackBaseDepth">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min={minimumBaseDepth}
            step="0.5"
            value={tray.params.rackBaseDepth}
            onchange={(e) => updateParams({ rackBaseDepth: parseFloat(e.currentTarget.value) || minimumBaseDepth })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Wall Thickness" name="wallThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="1"
            step="0.5"
            value={tray.params.wallThickness}
            onchange={(e) => updateParams({ wallThickness: parseFloat(e.currentTarget.value) || 1 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Side Wall Thickness" name="sideWallThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="1"
            step="0.5"
            value={tray.params.sideWallThickness}
            onchange={(e) => updateParams({ sideWallThickness: parseFloat(e.currentTarget.value) || 1 })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Rail Wall Thickness" name="railWallThickness">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="1"
            step="0.5"
            value={tray.params.railWallThickness ?? DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS}
            onchange={(e) =>
              updateParams({
                railWallThickness:
                  parseFloat(e.currentTarget.value) || DEFAULT_MINIATURE_RACK_RAIL_WALL_THICKNESS
              })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Rail Lip Inset" name="railLipInset">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0.5"
            step="0.5"
            value={tray.params.railLipInset ?? DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET}
            onchange={(e) =>
              updateParams({
                railLipInset:
                  parseFloat(e.currentTarget.value) || DEFAULT_MINIATURE_RACK_RAIL_LIP_INSET
              })}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Base Width Tolerance" name="baseWidthTolerance">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0"
            step="0.1"
            value={tray.params.baseWidthTolerance ?? DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE}
            onchange={(e) =>
              updateParams((() => {
                const value = parseFloat(e.currentTarget.value);
                return {
                  baseWidthTolerance: Number.isFinite(value)
                    ? value
                    : DEFAULT_MINIATURE_RACK_BASE_WIDTH_TOLERANCE
                };
              })())}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Base Height Tolerance" name="baseHeightTolerance">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            min="0"
            step="0.1"
            value={tray.params.baseHeightTolerance ?? DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE}
            onchange={(e) =>
              updateParams((() => {
                const value = parseFloat(e.currentTarget.value);
                return {
                  baseHeightTolerance: Number.isFinite(value)
                    ? value
                    : DEFAULT_MINIATURE_RACK_BASE_HEIGHT_TOLERANCE
                };
              })())}
          />
        {/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    </div>
    <Spacer size="0.5rem" />
    <Text size="0.875rem" color="fgMuted">
      Rack Base Depth controls how far the lower shelf extends forward. The minimum depth scales with rack height to keep the rack stable.
    </Text>
  </section>
</div>
{/if}

{#if renderMode === 'all' || renderMode === 'slots'}
<div class="panelFormSection">
  {#if renderMode === 'all'}
  <Spacer size="0.5rem" />
  {/if}

  <section class="section">
    <h3 class="sectionTitle">Slots</h3>
    <Spacer size="0.5rem" />
    <div class="slotList">
      {#each tray.params.slots as slot, index (slot.id)}
        <div class="slotCard">
          <div class="slotHeader">
            <span class="slotTitle">Slot {index + 1}</span>
            <IconButton
              variant="ghost"
              title="Remove slot"
              disabled={tray.params.slots.length <= 1}
              onclick={() => removeSlot(slot.id)}
            >
              <Icon Icon={IconX} color="var(--fgMuted)" />
            </IconButton>
          </div>
          <div class="formGrid">
            <FormControl label="Label" name={`slotLabel-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  value={slot.label ?? ''}
                  onchange={(e) => updateSlot(slot.id, { label: e.currentTarget.value })}
                />
              {/snippet}
            </FormControl>
            <FormControl label="Lip Angle" name={`slotLipAngle-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="number"
                  min="0"
                  max="80"
                  step="1"
                  value={slot.lipAngle ?? DEFAULT_MINIATURE_RACK_LIP_ANGLE}
                  onchange={(e) =>
                    updateSlot(
                      slot.id,
                      (() => {
                        const value = parseFloat(e.currentTarget.value);
                        return {
                          lipAngle: Number.isFinite(value) ? value : DEFAULT_MINIATURE_RACK_LIP_ANGLE
                        };
                      })()
                    )}
                />
              {/snippet}
              {#snippet end()}deg{/snippet}
            </FormControl>
          </div>
          <Spacer size="0.5rem" />
          <div class="formGrid">
            <FormControl label="Base Width" name={`slotBaseWidth-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="number"
                  min="10"
                  step="0.5"
                  value={slot.baseWidth}
                  onchange={(e) => updateSlot(slot.id, { baseWidth: parseFloat(e.currentTarget.value) || 10 })}
                />
              {/snippet}
              {#snippet end()}mm{/snippet}
            </FormControl>
            <FormControl label="Base Height" name={`slotBaseHeight-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="number"
                  min="1"
                  step="0.1"
                  value={slot.baseHeight}
                  onchange={(e) => updateSlot(slot.id, { baseHeight: parseFloat(e.currentTarget.value) || 1 })}
                />
              {/snippet}
              {#snippet end()}mm{/snippet}
            </FormControl>
            <FormControl label="Slot Spacing Left" name={`slotSpacingLeft-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="number"
                  min="0"
                  step="0.5"
                  value={slot.slotSpacingLeft}
                  onchange={(e) =>
                    updateSlot(slot.id, { slotSpacingLeft: parseFloat(e.currentTarget.value) || 0 })}
                />
              {/snippet}
              {#snippet end()}mm{/snippet}
            </FormControl>
            <FormControl label="Slot Spacing Right" name={`slotSpacingRight-${slot.id}`}>
              {#snippet input({ inputProps })}
                <Input
                  {...inputProps}
                  type="number"
                  min="0"
                  step="0.5"
                  value={slot.slotSpacingRight}
                  onchange={(e) =>
                    updateSlot(slot.id, { slotSpacingRight: parseFloat(e.currentTarget.value) || 0 })}
                />
              {/snippet}
              {#snippet end()}mm{/snippet}
            </FormControl>
          </div>
        </div>
      {/each}
      <Spacer size="0.5rem" />
      <Link as="button" onclick={addSlot}>Add slot</Link>
    </div>
  </section>
</div>
{/if}

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

  :global(.sectionTitle--featured) {
    color: var(--fg);
    font-size: 0.875rem;
    letter-spacing: 0.025em;
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

  .slotList {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .slotCard {
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.75rem;
    background: var(--contrastLow);
  }

  .slotHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .slotTitle {
    font-size: 0.875rem;
    font-weight: 600;
  }
</style>
