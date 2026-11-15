<script lang="ts">
  import type { ShelfFrameModule, ShelfFrameParams } from '$lib/models/shelfStorage';
  import { resolveShelfFrame } from '$lib/models/shelfFrame';
  import { getProject, updateShelfFrame, syncShelfFrames } from '$lib/stores/project.svelte';
  import { exportShelfModule } from '$lib/utils/exportShelfModule';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  let { module }: { module: ShelfFrameModule } = $props();
  const r = $derived(resolveShelfFrame(module.params));
  let busy = $state(false), error = $state('');
  let sourceId = $state('');
  const drawers = $derived((getProject().shelfModules ?? []).filter(m => m.type === 'card-drawer'));
  const source = $derived(drawers.find(m => m.id === sourceId) ?? drawers[0]);
  const fields = [
    { key: 'columns', label: 'Columns', min: 1, max: 8, step: 1 },
    { key: 'rows', label: 'Rows', min: 1, max: 8, step: 1 },
    { key: 'depth', label: 'Depth (mm)', min: 45, max: 1000, step: 1 },
    { key: 'wall', label: 'Frame wall (mm)', min: 6, max: 30, step: 0.5 }
  ] as const;
  function change(key: keyof ShelfFrameParams, input: HTMLInputElement) { updateShelfFrame(module.id, { [key]: input.valueAsNumber }); }
  async function download(format: 'stl' | '3mf') {
    busy = true; error = '';
    try { await exportShelfModule(module, [], 'shell', format); }
    catch (e) { error = e instanceof Error ? e.message : 'Export failed'; }
    finally { busy = false; }
  }
</script>
<section>
  <label>Name<input value={module.name} onchange={e => updateShelfFrame(module.id, {}, e.currentTarget.value)} /></label>
  <h3>Dimensions</h3>
  <div class="grid">{#each fields as field}
    <label>{field.label}<input type="number" min={field.min} max={field.max} step={field.step} value={module.params[field.key]} onchange={e => change(field.key, e.currentTarget)} /></label>
  {/each}</div>
  <output>Cell pitch: {module.params.pitchWidth.toFixed(2)} × {module.params.pitchHeight.toFixed(2)} mm</output>
  <label>Reference drawer<select value={source?.id ?? ''} onchange={e => sourceId = e.currentTarget.value} disabled={!drawers.length}>
    {#each drawers as drawer}<option value={drawer.id}>{drawer.name}</option>{/each}
  </select></label>
  <HelpRow><button disabled={!source} onclick={() => { error = source && syncShelfFrames(source.id, module.id) ? '' : 'Choose a valid drawer with dovetail connections enabled.'; }}>Update from reference drawer</button><HelpTip label="About frame compatibility">Copies cell pitch and depth from the reference drawer now, retaining this frame's columns, rows and wall thickness. Later drawer changes do not resize saved frames automatically. Connections stay aligned to each cell. Male above/right, female below/left. Assemble by sliding from the rear; allow access behind the composition.</HelpTip></HelpRow>
  {#if r.valid}
    <output>Exterior: {r.width.toFixed(1)} × {r.depth.toFixed(1)} × {r.height.toFixed(1)} mm</output>
    <output>Clear opening: {r.openingWidth.toFixed(1)} × {r.openingHeight.toFixed(1)} mm</output>
    <h3>Manufacturing</h3>
    <HelpRow><span>One-piece frame</span><HelpTip label="About frame printing">Print on its rear rim with the opening pointing upwards. Preview and exports share orientation and sit at Z=0. Check the complete footprint including connectors against your printer bed. Split printing is not implemented yet. Thick frame walls form the load path around the opening; support for loaded drawers above still needs physical testing.</HelpTip></HelpRow>
    <output>Print footprint: {r.width.toFixed(1)} × {r.height.toFixed(1)} mm · height {r.depth.toFixed(1)} mm</output>
    <div class="grid"><button disabled={busy} onclick={() => download('stl')}>Frame STL</button><button disabled={busy} onclick={() => download('3mf')}>Frame 3MF</button></div>
  {:else}{#each r.errors as message}<p role="alert">{message}</p>{/each}{/if}
  <p class="status">Prototype · dovetail fit and structural load pending physical validation.</p>
  {#if error}<p role="alert">{error}</p>{/if}
</section>
<style>
  section { padding:1rem; display:flex; flex-direction:column; gap:0.85rem; } h3 { margin:0.5rem 0 0; font-size:0.95rem; } label { display:flex; flex-direction:column; gap:0.35rem; } .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
  input, select, button { width:100%; box-sizing:border-box; min-width:0; font:inherit; color:var(--fg); background:var(--inputBg); border:var(--borderThin); padding:0.45rem; border-radius:0.3rem; } button { cursor:pointer; } output, .status { font-size:0.8rem; } .status { color:var(--fgMuted); } [role='alert'] { color:#ef987d; }
</style>
