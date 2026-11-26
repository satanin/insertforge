<script lang="ts">
  import { getProject, applyShelfProjectOptions } from '$lib/stores/project.svelte';
  import { defaultShelfDrawerParams } from '$lib/models/shelfStorage';
  import { KALLAX_REFERENCE } from '$lib/models/shelfReference';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  const project = $derived(getProject());
  const drawers = $derived((project.shelfModules ?? []).filter(module => module.type === 'card-drawer'));
  const depth = $derived(project.shelfOptions?.depth ?? drawers[0]?.params.depth ?? defaultShelfDrawerParams.depth);
  const labelWindow = $derived(project.shelfOptions?.labelWindow ?? (drawers[0]?.params.labelWindow !== false));
  let error = $state(''), message = $state('');
  const customCount = $derived(drawers.filter(module => module.customSettings?.depth || module.customSettings?.labelWindow).length);
  const mixedDepth = $derived(new Set(drawers.map(module => module.params.depth)).size > 1);
  const mixedWindows = $derived(new Set(drawers.map(module => module.params.labelWindow !== false)).size > 1);
  function apply(options: Partial<import('$lib/types/project').ShelfProjectOptions>) {
    const result = applyShelfProjectOptions(options);
    error = result.error;
    message = error ? '' : `Updated ${result.count} drawers.`;
  }
</script>

<details open class="projectOptions">
  <summary>Project options · all drawers</summary>
  <div class="optionsBody">
    <HelpRow><label>Drawer length (mm)<input type="number" min="45" max="1000" step="1" value={depth} onchange={event => apply({ depth: event.currentTarget.valueAsNumber })} /></label><HelpTip label="About project drawer length">Exterior shell length. Changing this updates every single and double drawer, including custom lengths, and sets the length for new drawers. Existing walls, sliding clearances, manufacturing joints and front alignment are preserved. Frame snapshots keep their saved dimensions.</HelpTip></HelpRow>
    <HelpRow><label class="check"><input type="checkbox" checked={labelWindow} onchange={event => apply({ labelWindow: event.currentTarget.checked })} /> Identification window</label><HelpTip label="About project identification windows">Changing this enables or closes the identification windows on every drawer, including custom window options, and sets the default for new drawers. Double drawers retain their one/two window setting and handle width. Drawer geometry, exports and both previews update together.</HelpTip></HelpRow>
    <output>{drawers.length} drawers in project</output>
    {#if mixedDepth || mixedWindows}<output>Current drawers have different {mixedDepth && mixedWindows ? 'lengths and window options' : mixedDepth ? 'lengths' : 'window options'}.</output>{/if}
    {#if customCount}<output>{customCount} customised drawer(s). Changing a project option replaces that option on every drawer.</output>{/if}
    {#if (project.shelfModules ?? []).some(module => module.type === 'open-frame')}<output>Open frames keep their saved dimensions.</output>{/if}
    {#if depth > KALLAX_REFERENCE.depth}<output class="notice">Requested shell length exceeds the {KALLAX_REFERENCE.depth} mm reference opening depth by {(depth - KALLAX_REFERENCE.depth).toFixed(1)} mm.</output>{/if}
    {#if error}<p role="alert">{error}</p>{/if}
    {#if message}<output>{message}</output>{/if}
  </div>
</details>

<style>
  .projectOptions { border-bottom: 2px solid var(--shelf-control-border); }
  .optionsBody { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; }
  label { display: flex; flex-direction: column; gap: 0.35rem; width: 100%; }
  .check { flex-direction: row; align-items: center; }
  input[type='number'] { width: 100%; box-sizing: border-box; background: var(--inputBg); color: var(--fg); font: inherit; min-height: 2.5rem; border-radius: 0.4rem; padding: 0.45rem 0.6rem; }
  input[type='checkbox'] { appearance: auto; position: static; opacity: 1; width: 1rem; height: 1rem; flex-shrink: 0; margin: 0; }
  output, p { font-size: 0.85rem; margin: 0; }
  .notice, [role='alert'] { padding: 0.65rem; background: #fff3d9; color: #583108; border: 1px solid #a86817; border-radius: 0.35rem; }
</style>
