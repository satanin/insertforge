<script lang="ts">
  import type { CardStorageTray } from '$lib/types/project';
  import { getCardSizes, updateCardStorageParams } from '$lib/stores/project.svelte';
  import {
    DEFAULT_STORAGE_DIVIDER_COLOR,
    minimumCardStorageLidWallThickness,
    resolveCardStorage,
    type CardStorageParams,
    type StorageDivider
  } from '$lib/models/cardStorageTray';
  import { ColorPicker, ColorPickerSwatch, FormControl, Input, Popover } from '@tableslayer/ui';
  let { tray }: { tray: CardStorageTray } = $props();
  let result = $derived(resolveCardStorage(tray.params, getCardSizes()));
  let selectedPart = $state('all');
  let exportError = $state('');
  let busy = $state(false);
  $effect(() => {
    const exists =
      ['all', 'body', 'dividers'].includes(selectedPart) ||
      (selectedPart === 'lid' && tray.params.lid) ||
      tray.params.dividers.some((d) => d.id === selectedPart);
    if (!exists) selectedPart = 'all';
  });
  function update<K extends keyof CardStorageParams>(key: K, value: CardStorageParams[K]) {
    updateCardStorageParams(tray.id, { ...tray.params, [key]: value });
  }
  function setClosure(lid: boolean) {
    updateCardStorageParams(tray.id, {
      ...tray.params,
      lid,
      wallThickness: lid
        ? Math.max(tray.params.wallThickness, minimumCardStorageLidWallThickness(tray.params.lidClearance))
        : tray.params.wallThickness
    });
  }
  function editDivider(id: string, values: Partial<StorageDivider>) {
    update(
      'dividers',
      tray.params.dividers.map((d) => (d.id === id ? { ...d, ...values } : d))
    );
  }
  function dividerColor(divider?: StorageDivider) {
    return divider?.color ?? tray.params.dividerColor ?? DEFAULT_STORAGE_DIVIDER_COLOR;
  }
  function move(id: string, direction: number) {
    const dividers = [...tray.params.dividers];
    const i = dividers.findIndex((d) => d.id === id),
      j = i + direction;
    if (j < 0 || j >= dividers.length) return;
    [dividers[i], dividers[j]] = [dividers[j], dividers[i]];
    update('dividers', dividers);
  }
  async function download(format: 'stl' | '3mf') {
    busy = true;
    exportError = '';
    try {
      const { exportCardStorage } = await import('$lib/utils/exportCardStorage');
      await exportCardStorage(tray, getCardSizes(), selectedPart, format);
    } catch (error) {
      exportError = error instanceof Error ? error.message : String(error);
    } finally {
      busy = false;
    }
  }
</script>

<section class="storageEditor">
  <h3>Card Storage</h3>
  <label>
    Card size
    <select value={tray.params.cardSizeId} onchange={(e) => update('cardSizeId', e.currentTarget.value)}>
      {#each getCardSizes() as card}<option value={card.id}>{card.name}</option>{/each}
    </select>
  </label>
  <label>
    Orientation
    <select
      value={tray.params.orientation}
      onchange={(e) => update('orientation', e.currentTarget.value as 'vertical' | 'horizontal')}
    >
      <option value="horizontal">Landscape</option>
      <option value="vertical">Portrait</option>
    </select>
  </label>
  <label>
    Size by
    <select value={tray.params.sizing} onchange={(e) => update('sizing', e.currentTarget.value as 'count' | 'length')}>
      <option value="count">Total card count</option>
      <option value="length">Exterior length</option>
    </select>
  </label>
  {#if tray.params.sizing === 'count'}
    <label>
      Number of cards <input
        type="number"
        min="1"
        step="1"
        value={tray.params.count}
        onchange={(e) => update('count', e.currentTarget.valueAsNumber)}
      />
    </label>
  {:else}
    <label>
      Exterior length (mm) <input
        type="number"
        min="1"
        step="1"
        value={tray.params.exteriorLength}
        onchange={(e) => update('exteriorLength', e.currentTarget.valueAsNumber)}
      />
    </label>
  {/if}
  <label>
    Maximum total height (mm)
    <input
      type="number"
      min="1"
      step="1"
      placeholder="Auto"
      value={tray.params.maxHeight ?? ''}
      onchange={(e) => update('maxHeight', e.currentTarget.value === '' ? null : e.currentTarget.valueAsNumber)}
    />
  </label>
  <label>
    Closure
    <select
      value={tray.params.lid ? 'sliding' : 'none'}
      onchange={(e) => setClosure(e.currentTarget.value === 'sliding')}
    >
      <option value="none">No lid</option>
      <option value="sliding">Sliding lid (Box lock)</option>
    </select>
  </label>
  {#if tray.params.lid}
    <label>
      Lid text
      <input
        value={tray.params.lidText ?? 'Card Storage'}
        maxlength="100"
        placeholder="No text"
        onchange={(e) => update('lidText', e.currentTarget.value)}
      />
    </label>
    <label>
      Lid text mode
      <select
        value={tray.params.lidTextMode ?? 'emboss'}
        onchange={(e) => update('lidTextMode', e.currentTarget.value as 'emboss' | 'inlay')}
      >
        <option value="emboss">Engraved</option>
        <option value="inlay">Inlay (multicolour)</option>
      </select>
    </label>
    <p class="hint">Uses the Box sliding lock. The lid opens along the card-storage direction.</p>
  {/if}
  <p class="summary">
    {result.width.toFixed(1)} × {result.depth.toFixed(1)} × {result.height.toFixed(1)} mm
    <br />
    Capacity: {result.capacity} cards · Tilt: {((result.angle * 180) / Math.PI).toFixed(1)}° from upright
  </p>
  {#each result.errors as error}<p class="error" role="alert">{error}</p>{/each}
  <h3>Removable dividers</h3>
  <FormControl label="Default divider colour" name="defaultDividerColor">
    {#snippet start()}
      <Popover>
        {#snippet trigger()}<ColorPickerSwatch color={dividerColor()} />{/snippet}
        {#snippet content()}
          <ColorPicker
            showOpacity={false}
            hex={dividerColor()}
            onUpdate={(colorData) => update('dividerColor', colorData.hex)}
          />
        {/snippet}
      </Popover>
    {/snippet}
    {#snippet input({ inputProps })}
      <Input
        {...inputProps}
        value={dividerColor()}
        oninput={(e) => update('dividerColor', e.currentTarget.value)}
      />
    {/snippet}
  </FormControl>
  <p class="hint">Positions are illustrative. Move the printed dividers freely between cards.</p>
  {#each tray.params.dividers as divider, index (divider.id)}
    <fieldset>
      <legend>Divider {index + 1}</legend>
      <label>
        Label <input
          value={divider.label}
          placeholder="Blank divider"
          maxlength="100"
          onchange={(e) => editDivider(divider.id, { label: e.currentTarget.value })}
        />
      </label>
      <label>
        Tab
        <select
          value={divider.tab}
          onchange={(e) => editDivider(divider.id, { tab: e.currentTarget.value as StorageDivider['tab'] })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="full">Full width</option>
        </select>
      </label>
      <FormControl label="Colour" name={`dividerColor-${divider.id}`}>
        {#snippet start()}
          <Popover>
            {#snippet trigger()}<ColorPickerSwatch color={dividerColor(divider)} />{/snippet}
            {#snippet content()}
              <ColorPicker
                showOpacity={false}
                hex={dividerColor(divider)}
                onUpdate={(colorData) => editDivider(divider.id, { color: colorData.hex })}
              />
            {/snippet}
          </Popover>
        {/snippet}
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            value={dividerColor(divider)}
            oninput={(e) => editDivider(divider.id, { color: e.currentTarget.value })}
          />
        {/snippet}
      </FormControl>
      {#if divider.label.length > (divider.tab === 'full' ? 35 : 12)}<p class="hint">
          Long labels are scaled down. Check readability before printing.
        </p>{/if}
      <div class="actions">
        <button disabled={index === 0} onclick={() => move(divider.id, -1)} aria-label="Move divider up">↑</button>
        <button
          disabled={index === tray.params.dividers.length - 1}
          onclick={() => move(divider.id, 1)}
          aria-label="Move divider down"
        >
          ↓
        </button>
        <button onclick={() => update('dividers', [...tray.params.dividers, { ...divider, id: crypto.randomUUID() }])}>
          Duplicate
        </button>
        <button
          onclick={() => {
            update(
              'dividers',
              tray.params.dividers.filter((d) => d.id !== divider.id)
            );
            if (selectedPart === divider.id) selectedPart = 'all';
          }}
        >
          Remove
        </button>
      </div>
    </fieldset>
  {/each}
  <button
    onclick={() =>
      update('dividers', [
        ...tray.params.dividers,
        { id: crypto.randomUUID(), label: '', tab: 'left', color: dividerColor() }
      ])}
  >
    Add divider
  </button>
  <details>
    <summary>Print settings</summary>
    {#each [['wallThickness', 'Wall'], ['floorThickness', 'Floor'], ['clearance', 'Card clearance'], ['dividerThickness', 'Divider thickness'], ['tabHeight', 'Tab height'], ...(tray.params.lid ? [['lidThickness', 'Lid thickness'], ['lidClearance', 'Lid clearance']] : [])] as [key, label]}
      <label>
        {label} (mm)
        <input
          type="number"
          min={key === 'wallThickness' && tray.params.lid
            ? minimumCardStorageLidWallThickness(tray.params.lidClearance)
            : 0.1}
          step="0.1"
          value={tray.params[key as keyof CardStorageParams] as number}
          onchange={(e) => update(key as keyof CardStorageParams, e.currentTarget.valueAsNumber)}
        />
      </label>
    {/each}
  </details>
  <h3>Export parts</h3>
  <label>
    Parts
    <select bind:value={selectedPart}>
      <option value="all">All parts</option>
      <option value="body">Tray only</option>
      {#if tray.params.lid}<option value="lid">Lid only</option>{/if}
      <option value="dividers">All dividers</option>
      {#each tray.params.dividers as divider, index}<option value={divider.id}>
          Divider {index + 1}: {divider.label || 'Blank'}
        </option>{/each}
    </select>
  </label>
  <div class="actions">
    <button disabled={!result.valid || busy} onclick={() => download('stl')}>Export STL</button>
    <button disabled={!result.valid || busy} onclick={() => download('3mf')}>Export 3MF</button>
  </div>
  <p class="hint">Use 3MF to assign a separate colour to the text. Dividers export flat for printing.</p>
  {#if exportError}<p class="error" role="alert">{exportError}</p>{/if}
</section>

<style>
  .storageEditor {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
  }
  h3,
  p {
    margin: 0;
  }
  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.85rem;
  }
  input,
  select,
  button {
    color: var(--fg);
    background: var(--bg);
    border: 1px solid var(--border, #555);
    border-radius: 5px;
    padding: 0.45rem;
    min-width: 0;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  fieldset {
    display: grid;
    gap: 0.6rem;
    min-width: 0;
    border: 1px solid var(--border, #555);
    border-radius: 6px;
  }
  .actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .hint,
  .summary {
    font-size: 0.8rem;
    color: var(--fgMuted);
    line-height: 1.5;
  }
  .error {
    color: #e87878;
    font-size: 0.85rem;
  }
  details label {
    margin-top: 0.65rem;
  }
</style>
