<script lang="ts">
  import { FormControl, Input, InputCheckbox } from '@tableslayer/ui';
  import { IconChevronDown } from '@tabler/icons-svelte';
  import { getMiniatureSocketRackLayout, normalizeMiniatureSocketRackParams, type MiniatureSocketRackParams, type MiniatureRackModel } from '$lib/models/miniatureSocketRack';

  let { params, onUpdate, trayName = '' }: {
    trayName?: string;
    params?: MiniatureSocketRackParams;
    onUpdate: (params: MiniatureSocketRackParams) => void;
  } = $props();
  let layout = $derived(getMiniatureSocketRackLayout(params));
  type NumberKey = Exclude<keyof MiniatureSocketRackParams, 'lidText' | 'lidTextEnabled' | 'lid' | 'perforated' | 'tabOverlap' | 'sizingMode' | 'linkedSpacing' | 'models' | 'maxHeight' | 'quantityMode' | 'fillModelId' | 'fixedWidth' | 'fixedDepth' | 'fixedHeight'>;
  const fields: { key: NumberKey; label: string; min: number; max: number; step: number; mode?: string }[] = [
    { key: 'lidThickness', label: 'Lid thickness', min: 2.8, max: 8, step: 0.1 },
    { key: 'maxWidth', label: 'Maximum rack width', min: 30, max: 600, step: 1, mode: 'limits' },
    { key: 'maxDepth', label: 'Maximum rack depth', min: 30, max: 600, step: 1, mode: 'limits' },
    { key: 'requestedCount', label: 'Number of miniatures', min: 1, max: 100, step: 1, mode: 'free' },
    { key: 'rows', label: 'Rows', min: 1, max: 10, step: 1, mode: 'grid' },
    { key: 'columns', label: 'Columns', min: 1, max: 10, step: 1, mode: 'grid' },
    { key: 'baseDiameter', label: 'Base diameter', min: 10, max: 100, step: 0.1, mode: 'base' },
    { key: 'baseThickness', label: 'Base thickness', min: 1, max: 15, step: 0.1, mode: 'base' },
    { key: 'diameterClearance', label: 'Diameter clearance (total)', min: 0.2, max: 5, step: 0.1 },
    { key: 'verticalClearance', label: 'Clearance above base', min: 0.2, max: 5, step: 0.1 },
    { key: 'tabOverlapPercent', label: 'Retaining tab overlap (% of base diameter)', min: 1, max: 45, step: 1 },
    { key: 'tabThickness', label: 'Tab thickness', min: 1, max: 4, step: 0.1 },
    { key: 'spacingX', label: 'Spacing X', min: 0, max: 40, step: 0.5 },
    { key: 'spacingY', label: 'Spacing Y', min: 0, max: 40, step: 0.5 },
    { key: 'wallThickness', label: 'Wall thickness', min: 1.2, max: 5, step: 0.1 },
    { key: 'floorThickness', label: 'Floor thickness', min: 1.2, max: 8, step: 0.1 },
    { key: 'miniatureHeight', label: 'Miniature height including base', min: 5, max: 200, step: 0.5, mode: 'base' },
    { key: 'headroom', label: 'Headroom above miniature', min: 1, max: 30, step: 0.5 },
    { key: 'postWidth', label: 'Stacking post width', min: 8, max: 20, step: 0.5 },
    { key: 'stackingClearance', label: 'Stacking clearance per side', min: 0.1, max: 0.8, step: 0.1 }
  ];
  const modelFields: { key: Exclude<keyof MiniatureRackModel, 'id' | 'name'>; label: string; min: number; max: number }[] = [
    { key: 'count', label: 'Quantity', min: 1, max: 100 },
    { key: 'baseDiameter', label: 'Base diameter', min: 10, max: 100 },
    { key: 'baseThickness', label: 'Base thickness', min: 1, max: 15 },
    { key: 'width', label: 'Maximum miniature width', min: 1, max: 300 },
    { key: 'depth', label: 'Maximum miniature depth', min: 1, max: 300 },
    { key: 'height', label: 'Height including base', min: 5, max: 300 }
  ];
  const fixedFields = [
    { key: 'fixedWidth' as const, label: 'Fixed rack width', min: 30, max: 600 },
    { key: 'fixedDepth' as const, label: 'Fixed rack depth', min: 30, max: 600 },
    { key: 'fixedHeight' as const, label: 'Fixed rack height (includes pegs)', min: 5, max: 400 }
  ];
  function update(updates: Partial<MiniatureSocketRackParams>) {
    onUpdate(normalizeMiniatureSocketRackParams({ ...layout.p, ...updates }));
  }
  function addModel() {
    update({ models: [...layout.p.models, {
      id: crypto.randomUUID(), name: `Model ${layout.p.models.length + 1}`, count: 1,
      baseDiameter: layout.p.baseDiameter, baseThickness: layout.p.baseThickness,
      width: layout.p.baseDiameter, depth: layout.p.baseDiameter, height: layout.p.miniatureHeight
    }] });
  }
  function updateModel(index: number, values: Partial<MiniatureRackModel>) {
    update({ models: layout.p.models.map((model, i) => i === index ? { ...model, ...values } : model) });
  }
  function visible(mode?: string) {
    return !mode || mode === layout.p.sizingMode || mode === 'limits' && layout.p.sizingMode !== 'grid'
      || mode === 'base' && layout.p.sizingMode !== 'models';
  }
</script>

{#snippet numericFields(keys: NumberKey[])}
  <div class="socketFields">
    {#each fields.filter(field => keys.includes(field.key)) as field (field.key)}
      {#if visible(field.mode) && !(field.key === 'spacingY' && layout.p.linkedSpacing) && !(field.key === 'requestedCount' && layout.p.quantityMode === 'fill')}
        <FormControl label={field.label} name={`socket-${field.key}`}>
          {#snippet input({ inputProps })}
            <Input {...inputProps} type="number" min={field.min} max={field.max} step={field.step}
              value={layout.p[field.key]} onchange={(e) => {
                const value = Number.parseFloat(e.currentTarget.value);
                if (Number.isFinite(value)) update({ [field.key]: value });
              }} />
          {/snippet}
          {#snippet end()}{field.key === 'rows' || field.key === 'columns' || field.key === 'requestedCount' ? '' : field.key === 'tabOverlapPercent' ? '%' : 'mm'}{/snippet}
        </FormControl>
      {/if}
    {/each}
  </div>
{/snippet}

<div class="socketEditor">
  <aside class="experimentalNotice" role="note" aria-label="Experimental feature">
    <strong>Experimental · further print validation pending</strong>
    <p>Initial rack print tests passed. New options, including the lid, still need physical validation. Test fit and strength with a small sample first.</p>
  </aside>
  <div class="rackSummary" aria-label="Rack summary">
    <strong>{layout.width.toFixed(1)} × {layout.depth.toFixed(1)} × {layout.height.toFixed(1)} mm</strong>
    <span>
      {#if layout.p.quantityMode === 'fill' && layout.p.sizingMode !== 'grid'}
        {layout.seats.length} bases · fill available space
      {:else}
        {layout.seats.length} / {layout.requestedCount} bases
      {/if}
      · stacking pitch {layout.stackPitch.toFixed(1)} mm
    </span>
  </div>
  {#if layout.error}<p role="alert" class="error">{layout.error} No printable rack is generated for this configuration.</p>{/if}
  {#each layout.warnings as warning}<p role="alert" class="warning">{warning}</p>{/each}

  <section class="editorSection" aria-label="Rack dimensions">
    <h3>Rack dimensions</h3>
    <h4>Maximum dimensions</h4>
    {@render numericFields(['maxWidth', 'maxDepth'])}
    <FormControl label="Maximum rack height (includes pegs)" name="socket-maxHeight">
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="number" min="5" max="400" step="0.5" placeholder="No limit"
          value={layout.p.maxHeight ?? ''} onchange={(e) => {
            const value = Number.parseFloat(e.currentTarget.value);
            update({ maxHeight: Number.isFinite(value) ? value : null });
          }} />
      {/snippet}
      {#snippet end()}mm{/snippet}
    </FormControl>
    <h4>Fixed dimensions · optional</h4>
    <div class="socketFields">
      {#each fixedFields as field}
        <FormControl label={field.label} name={`socket-${field.key}`}>
          {#snippet input({ inputProps })}
            <Input {...inputProps} type="number" min={field.min} max={field.max} step="0.5" placeholder="Auto"
              value={layout.p[field.key] ?? ''} onchange={(e) => {
                const value = Number.parseFloat(e.currentTarget.value);
                update({ [field.key]: Number.isFinite(value) ? value : null });
              }} />
          {/snippet}
          {#snippet end()}mm{/snippet}
        </FormControl>
      {/each}
    </div>
    <p class="help">Leave fixed dimensions blank for automatic sizing. Fixed sizes must respect the maximum limits. Heights include pegs.</p>
  </section>

  <section class="editorSection" aria-label="Rack structure and stacking">
    <h3>Structure &amp; stacking</h3>
    {@render numericFields(['floorThickness', 'wallThickness', 'headroom', 'postWidth', 'stackingClearance'])}
    <InputCheckbox label="Lighten floor below each base" checked={layout.p.perforated}
      onchange={(e) => update({ perforated: e.currentTarget.checked })} />
    <p class="help">To stack racks, match width, depth, post width and stacking clearance. Each rack can have its own height.</p>
  </section>

  <section class="editorSection" aria-label="Rack lid">
    <h3>Lid</h3>
    <InputCheckbox label="Add flat stacking lid" checked={layout.p.lid}
      onchange={(e) => update({ lid: e.currentTarget.checked })} />
    {#if layout.p.lid}
      {@render numericFields(['lidThickness'])}
      <InputCheckbox label="Add lid text" checked={layout.p.lidTextEnabled}
        onchange={(e) => update({ lidTextEnabled: e.currentTarget.checked })} />
      {#if layout.p.lidTextEnabled}
        <FormControl label="Lid text" name="socket-lidText">
          {#snippet input({ inputProps })}
            <Input {...inputProps} value={layout.p.lidText ?? ''} placeholder={trayName} maxlength={100}
              onchange={(e) => update({ lidText: e.currentTarget.value })} />
          {/snippet}
        </FormControl>
        <p class="help">Leave blank to follow the tray name. Text is engraved 0.4 mm deep so the top stays flat for stacking.</p>
      {/if}
      <p class="help">Rests on the four posts and locates over the pegs. The top is flat for other items. Height limits include the lid. Exported separately, flat side down. Not a sealed or locking lid; load capacity needs print testing.</p>
    {/if}
  </section>

  <section class="editorSection" aria-label="Miniatures and layout">
    <h3>Miniatures &amp; layout</h3>
    <label class="modeLabel">Layout mode
      <span class="selectControl">
        <select value={layout.p.sizingMode} onchange={(e) => {
          const sizingMode = e.currentTarget.value as MiniatureSocketRackParams['sizingMode'];
          update({ sizingMode, requestedCount: layout.p.sizingMode === 'grid' ? layout.seats.length : layout.p.requestedCount,
            models: sizingMode === 'models' && layout.p.models.length === 0 ? [{
              id: crypto.randomUUID(), name: 'Model 1', count: 1,
              baseDiameter: layout.p.baseDiameter, baseThickness: layout.p.baseThickness,
              width: layout.p.baseDiameter, depth: layout.p.baseDiameter, height: layout.p.miniatureHeight
            }] : layout.p.models });
        }}>
          <option value="free">Free rack</option>
          <option value="models">By miniature models</option>
          <option value="grid">Manual grid</option>
        </select>
        <IconChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
    {#if layout.p.sizingMode !== 'grid'}
      <label class="modeLabel">Quantity mode
        <span class="selectControl">
          <select value={layout.p.quantityMode} onchange={(e) => update({ quantityMode: e.currentTarget.value as MiniatureSocketRackParams['quantityMode'] })}>
            <option value="all">Fit all miniatures</option>
            <option value="partial">Place what fits</option>
            <option value="fill">Fill available space</option>
          </select>
          <IconChevronDown size={16} aria-hidden="true" />
        </span>
      </label>
      <p class="help">
        {#if layout.p.quantityMode === 'all'}All requested miniatures must fit.
        {:else if layout.p.quantityMode === 'partial'}Create a rack with what fits and report the remaining quantities.
        {:else}Calculate the quantity from the available space.{/if}
      </p>
      {#if layout.p.quantityMode === 'fill' && layout.p.sizingMode === 'models'}
        <label class="modeLabel">Model to fill remaining space
          <span class="selectControl">
            <select value={layout.p.fillModelId ?? ''} onchange={(e) => update({ fillModelId: e.currentTarget.value })}>
              {#each layout.p.models as model}<option value={model.id}>{model.name}</option>{/each}
            </select>
            <IconChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <p class="help">Place the quantities of the other models first, then fill the remaining space with this model.</p>
      {/if}
    {/if}
    {@render numericFields(['requestedCount', 'rows', 'columns', 'baseDiameter', 'baseThickness', 'miniatureHeight'])}
    {#if layout.p.sizingMode === 'free'}
      <p class="help">Capacity at these limits: {layout.capacity}. Rows and columns are calculated from the quantity.</p>
    {/if}
    {#if layout.p.sizingMode === 'models'}
      <p class="help">Measure the whole miniature including its base, arms and weapons. Volumes are centred on the base.</p>
      {#each layout.p.models as model, index (model.id)}
        {@const counts = layout.modelCounts.find(c => c.id === model.id)}
        <fieldset class="modelCard">
          <legend>{model.name || `Model ${index + 1}`}</legend>
          {#if counts}
            <p class="modelCounts">Placed: {counts.placed}{counts.requested === null ? ' · calculated fill quantity' : ` / ${counts.requested} · Remaining: ${counts.remaining}`}</p>
          {/if}
          <FormControl label="Model name" name={`model-name-${model.id}`}>
            {#snippet input({ inputProps })}<Input {...inputProps} value={model.name}
              onchange={(e) => updateModel(index, { name: e.currentTarget.value })} />{/snippet}
          </FormControl>
          <div class="socketFields">
            {#each modelFields as field (field.key)}
              {#if !(field.key === 'count' && layout.p.quantityMode === 'fill' && layout.p.fillModelId === model.id)}
                <FormControl label={field.label} name={`model-${model.id}-${field.key}`}>
                  {#snippet input({ inputProps })}
                    <Input {...inputProps} type="number" min={field.min} max={field.max}
                      step={field.key === 'count' ? 1 : 0.1} value={model[field.key]}
                      onchange={(e) => {
                        const value = Number.parseFloat(e.currentTarget.value);
                        if (Number.isFinite(value)) updateModel(index, { [field.key]: value });
                      }} />
                  {/snippet}
                  {#snippet end()}{field.key === 'count' ? '' : 'mm'}{/snippet}
                </FormControl>
              {/if}
            {/each}
          </div>
          <button class="removeModel" onclick={() => update({ models: layout.p.models.filter((_, i) => i !== index) })}>Remove model</button>
        </fieldset>
      {/each}
      <button disabled={layout.p.models.length >= 10} onclick={addModel}>+ Add miniature model</button>
    {/if}
  </section>

  <section class="editorSection" aria-label="Sockets and retention">
    <h3>Sockets &amp; retention</h3>
    <h4>Spacing</h4>
    <InputCheckbox label="Use the same spacing in X and Y" checked={layout.p.linkedSpacing}
      onchange={(e) => update({ linkedSpacing: e.currentTarget.checked })} />
    {@render numericFields(['spacingX', 'spacingY'])}
    <h4>Base clearance &amp; retaining tab</h4>
    {@render numericFields(['diameterClearance', 'verticalClearance', 'tabOverlapPercent', 'tabThickness'])}
    <p class="help">
      Overlap: {layout.p.tabOverlapPercent.toFixed(1)}% of each base diameter.
      {#if layout.p.sizingMode !== 'models'}For this base: {(layout.p.baseDiameter * layout.p.tabOverlapPercent / 100).toFixed(2)} mm.{/if}
    </p>
    <details>
      <summary><span>Fit, handling &amp; preview</span><IconChevronDown size={16} aria-hidden="true" /></summary>
      <p class="help">Tilt the base under the tab, then lower it into the socket without pressing. Print a two-base sample first. Retention is not a transport lock.</p>
      <p class="help">Allow for off-centre arms and weapons. Preview counters shows approximate volumes, which are excluded from exports. Placement and filling may not find the densest layout.</p>
    </details>
  </section>
</div>

<style>
  .experimentalNotice { display: grid; gap: 0.4rem; padding: 0.75rem; border: 1px solid #d99522; border-radius: var(--radius-2); background: rgb(217 149 34 / 10%); font-size: 0.8125rem; line-height: 1.5; }
  .socketEditor { display: grid; gap: 1rem; }
  .rackSummary { display: grid; gap: 0.3rem; padding: 0.75rem; background: var(--inputBg); border: var(--borderThin); border-radius: var(--radius-2); }
  .rackSummary span, .help, .modelCounts { color: var(--fgMuted); font-size: 0.8125rem; line-height: 1.5; }
  .editorSection { display: grid; gap: 0.75rem; padding-top: 1rem; border-top: var(--borderThin); min-width: 0; }
  h3 { font-size: 0.875rem; font-weight: 650; margin: 0; }
  h4 { font-size: 0.75rem; font-weight: 600; color: var(--fgMuted); margin: 0.25rem 0 0; }
  p { margin: 0; }
  .socketFields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .modeLabel { display: grid; gap: 0.4rem; font-size: 0.875rem; font-weight: 500; }
  .selectControl { position: relative; display: block; min-width: 0; }
  .selectControl :global(svg) { position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--fgMuted); }
  select { appearance: none; width: 100%; min-height: 2.25rem; padding: 0.4rem 2rem 0.4rem 0.6rem; cursor: pointer; }
  select, button { font: inherit; border: var(--borderThin); border-radius: var(--radius-2); background: var(--inputBg); color: inherit; max-width: 100%; }
  select:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  button { padding: 0.5rem 0.75rem; cursor: pointer; }
  button:hover { background: var(--bgHover, var(--inputBg)); }
  button:disabled { opacity: 0.5; cursor: default; }
  .modelCard { display: grid; gap: 0.75rem; min-width: 0; border: var(--borderThin); border-radius: var(--radius-2); padding: 0.75rem; }
  legend { font-size: 0.875rem; font-weight: 600; padding: 0 0.25rem; }
  .removeModel { justify-self: start; font-size: 0.8125rem; color: var(--fgMuted); }
  summary { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; cursor: pointer; font-size: 0.8125rem; list-style: none; }
  details[open] > summary :global(svg) { transform: rotate(180deg); }
  details .help { margin-top: 0.5rem; }
  .error, .warning { padding: 0.75rem; border: 1px solid currentColor; border-radius: var(--radius-2); font-size: 0.875rem; }
  .error { color: var(--fgDanger); }
</style>
