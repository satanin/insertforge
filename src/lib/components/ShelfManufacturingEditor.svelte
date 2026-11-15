<script lang="ts">
  import type { CardSize } from '$lib/types/project';
  import type { ShelfDrawerModule } from '$lib/models/shelfStorage';
  import { defaultShelfManufacturing, resolveShelfManufacturing, type ShelfManufacturingSettings, type createShelfManufacturing } from '$lib/models/shelfManufacturing';
  import { updateShelfModule } from '$lib/stores/project.svelte';
  import { exportShelfManufacturing } from '$lib/utils/exportShelfModule';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  let { module, cards, model, onpreview }: { module: ShelfDrawerModule; cards: CardSize[];
    model: ReturnType<typeof createShelfManufacturing> | null; onpreview: (id: string) => void } = $props();
  const plan = $derived(resolveShelfManufacturing(module.params, cards));
  const settings = $derived(plan.settings);
  let busy = $state(false), error = $state('');
  const exportItems = $derived((model?.items ?? []).filter(item => item.part !== 'sample'));
  function update(key: keyof ShelfManufacturingSettings, value: number | boolean) {
    updateShelfModule(module.id, { manufacturing: { ...settings, [key]: value } });
  }
  async function download(id: string, format: 'stl' | '3mf') {
    busy = true; error = '';
    try { await exportShelfManufacturing(module, cards, id, format); }
    catch (e) { error = e instanceof Error ? e.message : 'Export failed.'; }
    finally { busy = false; }
  }
</script>

<details open>
  <summary>Printer &amp; depth sections</summary>
  <section>
    <HelpRow><label class="check"><input type="checkbox" checked={settings.split} onchange={e => update('split', e.currentTarget.checked)} /> Split to print volume</label><HelpTip label="About depth splitting">Experimental printed joints. Keeps assembled width, height, content space and external dovetails. Shell sections print rear end down; drawer sections print floor down. Automatic 90° bed rotation is allowed. Sections are exported separately, never as an oversized plate. Bed margin reserves space for a brim; build height is a hard usable limit. No automatic slicing, support generation or load certification.</HelpTip></HelpRow>
    <div class="grid">
      {#each [{ key: 'bedWidth', label: 'Bed width', min: 50, max: 2000 }, { key: 'bedDepth', label: 'Bed depth', min: 50, max: 2000 }, { key: 'buildHeight', label: 'Usable build height', min: 40, max: 2000 }, { key: 'margin', label: 'Bed margin / edge', min: 0, max: 30 }] as field}
        <label>{field.label} (mm)<input type="number" min={field.min} max={field.max} value={settings[field.key as keyof typeof defaultShelfManufacturing]} onchange={e => update(field.key as keyof ShelfManufacturingSettings, e.currentTarget.valueAsNumber)} /></label>
      {/each}
    </div>
    {#if settings.split}
      <HelpRow><label>Joint design<select value={settings.jointStyle ?? 'keys'} onchange={e => updateShelfModule(module.id, { manufacturing: { ...settings, jointStyle: e.currentTarget.value as ShelfManufacturingSettings['jointStyle'] } })}>
        <option value="keys">F · original through keys</option><option value="lap-keys">C+F · floor lap + seated keys</option>
        <option value="divider-dovetail">Divider dovetail · trial</option>
      </select></label><HelpTip label="About joint design">C+F adds a 12 mm central floor lap to the drawer, with two lips at least 0.8 mm thick and a 0.1 mm vertical gap. Side-wall roots keep full floor thickness. All keys have a 0.8 mm outer head seated 0.1 mm below the insertion face; a 1.2 mm-wide shoulder stops inward travel. This is an insertion stop, not an outward latch. Drawer front prints floor down, rear prints rear end down so the upper lip grows without a long suspended overhang. Current trial supports two drawer sections. Width, height and useful content space stay unchanged.</HelpTip></HelpRow>
      {#if plan.hybrid}
        <HelpRow><label class="check"><input type="checkbox" checked={settings.floorKeys === true} onchange={e => update('floorKeys', e.currentTarget.checked)} /> Seated floor keys</label><HelpTip label="About floor joining keys">Adds two keys per drawer seam, inserted from inside the drawer, downward. Their heads stop 0.1 mm below the interior floor surface, preserving the sliding surface and card space. Key seats occupy full-thickness floor lanes with at least 1.5 mm material beyond the head pocket; the overlap continues between these lanes. A 2 mm floor leaves a 1.1 mm-deep shoulder after the 0.9 mm seat. Do not place this seat inside a thin lap tongue. Stops do not latch against outward removal; friction or the tested glued assembly must still be checked physically. The front section prints floor down with the wide seats open upward; inspect both sections in the slicer before printing.</HelpTip></HelpRow>
        {#if plan.floorKeys}<output>Drawer seam: 4 side keys + 2 floor keys · floor seat shoulder {(module.params.drawerFloor - plan.keySeatDepth).toFixed(1)} mm deep</output>{/if}
      {/if}
      <label>Joint clearance / edge (mm)<input type="number" min="0.08" max="0.3" step="0.01" value={settings.jointClearance} onchange={e => update('jointClearance', e.currentTarget.valueAsNumber)} /></label>
      <output>{plan.shellCount} shell section(s) · {plan.drawerCount} drawer section(s) · same assembled envelope</output>
      {#if plan.divider}
        <HelpRow><output>Fixed divider: {plan.dividerDepth + 2.4} mm of drawer length</output><HelpTip label="About the divider dovetail">Both drawer sections print floor down. Lower the rear section into the front divider until seated and align the two floor faces. The drawer uses no separate keys. The shell still uses seated keys. Check the ramp in Bambu Studio and test fit and flex before loading.</HelpTip></HelpRow>
        {#if model?.items.some(item => item.id === 'divider-test-1')}
          <div class="grid">
            <button disabled={busy} onclick={() => download('divider-test-1', '3mf')}>Divider test 1 · 3MF</button>
            <button disabled={busy} onclick={() => download('divider-test-2', '3mf')}>Divider test 2 · 3MF</button>
          </div>
        {/if}
      {:else}
        <HelpRow><span>{plan.hybrid ? 'Floor lap + keys with insertion stops' : 'Flush double-dovetail keys'}</span><HelpTip label="About joining keys">Press the separate keys into paired pockets. Wall keys enter from outside and drawer floor keys from inside. Double dovetails resist longitudinal pull. Small ribs add friction but do not latch. Shell uses eight keys per seam. Drawer uses four side keys and two floor keys when enabled.</HelpTip></HelpRow>
      {/if}
      {#if plan.hybrid}<HelpRow><output>Floor lips: {plan.lapWeb.toFixed(2)} mm each · vertical gap {plan.lapGap.toFixed(2)} mm · overlap {plan.lapLength} mm · key seat {plan.keySeatDepth.toFixed(1)} mm</output><HelpTip label="About sample print assumptions">Trial dimensions target a 0.4 mm nozzle and 0.2 mm layers: a nominal 0.8 mm lip spans four layers when printed flat. No printer profile is enforced. Check thin features, first-layer expansion and the supplied rear-end-down orientation in your slicer. The 0.1 mm vertical gap and friction tips require a physical fit test.</HelpTip></HelpRow>{/if}
      <p class="warning">Experimental joints: test key fit and loaded extraction before printing a full set. Assemble shells before connecting neighbouring modules.</p>
    {/if}
    {#each plan.errors as message}<p role="alert">{message}</p>{/each}
  </section>
</details>
{#if model}
  <details open>
    <summary>Export parts</summary>
    <section>
      {#each exportItems as item (item.id)}
        <div class="part">
          <strong>{item.name}{item.quantity > 1 ? ` · print ×${item.quantity}` : ''}</strong>
          <output>In use (W × D × H): {item.assembledSize.map(v => v.toFixed(2)).join(' × ')} mm</output>
          <output>On bed (X × Y × Z): {item.size.map(v => v.toFixed(2)).join(' × ')} mm · {item.fits ? 'Fits' : 'Exceeds print volume'}</output>
          <div class="actions">
            <button onclick={() => onpreview(item.id)}>View part</button>
            <button disabled={!item.fits || busy} onclick={() => download(item.id, 'stl')}>STL</button>
            <button disabled={!item.fits || busy} onclick={() => download(item.id, '3mf')}>3MF</button>
          </div>
        </div>
      {/each}
      {#if plan.divider && module.params.depth === 390 && plan.drawerCuts.length === 1}
        <HelpRow><button disabled={busy} onclick={() => download('divider-rear-replacement-380', '3mf')}>Rear replacement for 380 mm shell · 3MF</button><HelpTip label="About rear replacement">For the front section already printed from this 390 mm drawer. Keeps its joint position and shortens the rear section by 10 mm. Use both original print settings and original joint clearance.</HelpTip></HelpRow>
      {/if}
      {#if error}<p role="alert">{error}</p>{/if}
    </section>
  </details>
{/if}

<style>
  details { border-bottom: var(--borderThin); }
  summary { padding: 0.85rem 1rem; font-weight: 600; cursor: pointer; }
  section { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
  .grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0.75rem; }
  label { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
  .check { flex-direction: row; align-items: center; }
  .check input { appearance: auto; position: static; opacity: 1; width: 1rem; height: 1rem; margin: 0; }
  input[type='number'], select { width: 100%; box-sizing: border-box; border: var(--borderThin); border-radius: 0.3rem; padding: 0.4rem; background: var(--inputBg); color: var(--fg); font: inherit; }
  button { font: inherit; color: var(--fg); padding: 0.4rem 0.65rem; background: var(--contrastLow); border: var(--borderThin); border-radius: 0.3rem; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: default; }
  .part { display: flex; flex-direction: column; gap: 0.4rem; border-top: var(--borderThin); padding-top: 0.65rem; }
  .actions { display: flex; gap: 0.4rem; }
  output, .warning { font-size: 0.8rem; }
  .warning { color: #edc68c; margin: 0; line-height: 1.5; }
  [role='alert'] { color: #ef987d; margin: 0; }
</style>
