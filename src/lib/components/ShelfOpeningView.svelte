<script lang="ts">
  import { getProject, selectShelfModule, addShelfModule, canAddShelfModule, removeShelfModule, populateKallaxOpening, shelfMergeNeighbours, convertShelfDrawers } from '$lib/stores/project.svelte';
  import { getProjectCardSizes } from '$lib/utils/projectCards';
  import { layoutShelfOpening } from '$lib/models/shelfLayout';
  import { KALLAX_REFERENCE } from '$lib/models/shelfReference';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  import { createShelfOpeningBuilder, type OpeningFaceRange } from '$lib/models/shelfOpeningGeometry';
  import { jscadToBufferGeometry } from '$lib/utils/jscadToThree';
  import type { BufferGeometry } from 'three';
  let { onOpenModule }: { onOpenModule: () => void } = $props();
  const project = $derived(getProject());
  const modules = $derived(project.shelfModules ?? []);
  const layout = $derived(layoutShelfOpening(modules, getProjectCardSizes(project)));
  const selected = $derived(modules.find(module => module.id === project.selectedShelfModuleId));
  const mergeNeighbours = $derived(selected ? shelfMergeNeighbours(selected.id) : []);
  const mergeCandidates = $derived(mergeNeighbours.filter(item => !item.differences.length));
  const selectedPlaced = $derived(layout.placed.find(module => module.id === selected?.id));
  const canAddSingle = $derived(canAddShelfModule(1));
  const canAddDouble = $derived(canAddShelfModule(2));
  let conversionError = $state('');
  function convert(neighbourId?: string) {
    if (!selected) return;
    conversionError = convertShelfDrawers(selected.id, neighbourId) ? '' : 'Could not convert these drawers. Check their positions and settings.';
    removing = false;
  }
  let removing = $state(false);
  let view = $state<'2d' | '3d'>('3d');
  let alignment = $state<'front' | 'rear'>('front');
  let geometry = $state<BufferGeometry | null>(null);
  const buildOpening = createShelfOpeningBuilder();
  let geometryError = $state('');
  let faceRanges = $state<OpeningFaceRange[]>([]);
  $effect(() => {
    if (view !== '3d') return;
    let next: BufferGeometry | null = null;
    try {
      const ranges: OpeningFaceRange[] = [];
      next = jscadToBufferGeometry(buildOpening(modules, getProjectCardSizes(project), ranges, alignment));
      next.userData.baseColors = next.getAttribute('color').array.slice();
      faceRanges = ranges;
      geometryError = '';
    } catch (error) { geometryError = error instanceof Error ? error.message : 'Could not generate opening preview.'; }
    geometry = next;
    return () => next?.dispose();
  });
  $effect(() => {
    if (!geometry) return;
    const colors = geometry.getAttribute('color');
    colors.array.set(geometry.userData.baseColors);
    const range = faceRanges.find(range => range.id === selected?.id);
    if (range) for (let vertex = range.start * 3; vertex < range.end * 3; vertex++) {
      colors.setXYZ(vertex, colors.getX(vertex) * 0.65 + 0.1, colors.getY(vertex) * 0.65 + 0.25, colors.getZ(vertex) * 0.65 + 0.35);
    }
    colors.needsUpdate = true;
  });
  function selectFace(face: number) {
    const range = faceRanges.find(range => face >= range.start && face < range.end);
    if (range) { removing = false; selectShelfModule(range.id); }
  }
</script>

<section class="openingView" aria-label="KALLAX opening layout">
  <header>
    <HelpRow><h2>KALLAX opening</h2><HelpTip label="About the opening layout">3D shows the actual assembled shells, drawers and handles. Rotate and zoom to inspect them; choose a drawer using Selected drawer. The 2D layout is a front schematic with clickable drawers, identification windows and handle colours. Modules are arranged left to right from the bottom with 1.5 mm fitting margin. Adding or removing a drawer repacks the opening. Exposed top/right connectors are included in the fit calculation. Furniture boards are visual context only and are never exported. Measure your furniture before printing.</HelpTip></HelpRow>
    <span>335 × 335 mm · depth {KALLAX_REFERENCE.depth} mm</span>
    <div class="actions" role="group" aria-label="Opening view">
      <button aria-pressed={view === '2d'} onclick={() => view = '2d'}>2D layout</button>
      <button aria-pressed={view === '3d'} onclick={() => view = '3d'}>3D opening</button>
      {#if view === '3d'}
        <div class="alignmentControl">
          <HelpRow><strong>Alignment</strong><HelpTip label="About assembly alignment">View placement only. Front aligned places the shell fronts at the opening. Rear aligned moves the whole assembly until the longest shell is 1.5 mm from the rear. Every drawer keeps the same frontal plane, including custom lengths. Changing project length in rear view reveals the free space in front. Parts, joints and exports are unchanged.</HelpTip></HelpRow>
          <div class="actions" role="group" aria-label="Assembly alignment">
            <button aria-pressed={alignment === 'front'} onclick={() => alignment = 'front'}>Front aligned</button>
            <button aria-pressed={alignment === 'rear'} onclick={() => alignment = 'rear'}>Rear aligned</button>
          </div>
        </div>
      {/if}
      <label>Selected drawer <select value={selected?.id ?? ''} onchange={event => { selectShelfModule(event.currentTarget.value); removing = false; }}>
        {#if !selected}<option value="">No drawer</option>{/if}
        {#each modules as module}<option value={module.id}>{module.name}</option>{/each}
      </select></label>
    </div>
  </header>
  <div class="drawing">
    <div class="openingCanvas" class:hidden={view !== '3d'}>
      {#await import('./TrayViewer.svelte') then { default: TrayViewer }}
        <TrayViewer {geometry} onMeshFaceClick={selectFace} selectedTrayId="kallax-opening" gameContainerWidth={370} gameContainerDepth={390} gameContainerHeight={367} gameContainerHeightIsAuto={false} cameraPosition={[550, 420, 1100]} cameraLookAt={[0, 167.5, 195]} selectionType="tray" hidePrintBed={true} />
      {/await}
    </div>
    {#if view === '2d'}
    <svg viewBox="-15 -15 365 365" role="group" aria-label="Front view of the KALLAX opening">
      <rect width="335" height="335" fill="var(--contrastLow)" stroke="#b8ab94" stroke-width="9" />
      {#each layout.placed as module (module.id)}
        <g role="button" tabindex="0" aria-label={`Select ${module.name}`} aria-pressed={module.id === selected?.id}
          onclick={() => { removing = false; selectShelfModule(module.id); }}
          onkeydown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removing = false; selectShelfModule(module.id); } }}
          class:selected={module.id === selected?.id}>
          <title>{module.name} · {module.width.toFixed(1)} × {module.height.toFixed(1)} mm</title>
          <rect class="shell" x={module.x} y={module.y} width={module.width} height={module.height} fill="#7f97a8" stroke="#263744" stroke-width="1" />
          <rect x={module.x + 4} y={module.y + 5} width={module.width - 8} height={module.height - 9} rx="1" fill="#344b5b" />
          {#if module.labelWindow}
            {#each Array(module.labelWindows) as _, index}
              <rect aria-label="Identification window" x={module.x + 10 + index * (module.width - 16) / module.labelWindows} y={module.y + 24}
                width={(module.width - 16) / module.labelWindows - 4} height={module.height - 54} rx="1" fill="#d9c7a7" />
            {/each}
          {/if}
          <rect x={module.x + (module.wideHandle ? 7 : module.width * 0.18)} y={module.y + 8} width={module.wideHandle ? module.width - 14 : module.width * 0.64} height="12" rx="1" fill={module.color} />
          <text x={module.x + module.width / 2} y={module.y + module.height / 2 + 8} text-anchor="middle" fill="#e8f0f5" font-size="8">{module.columns === 2 ? 'Double' : 'Single'}</text>
          <text x={module.x + module.width / 2} y={module.y + module.height / 2 + 20} text-anchor="middle" fill="#e8f0f5" font-size="6">{modules.findIndex(item => item.id === module.id) + 1}</text>
        </g>
      {/each}
    </svg>
    {/if}
  </div>
  {#if geometryError}<p role="alert">{geometryError}</p>{/if}
  <footer>
    <output>{layout.placed.length} drawers in opening · {layout.placed.filter(module => module.columns === 1).length} single · {layout.placed.filter(module => module.columns === 2).length} double</output>
    <div class="actions" aria-label="Add drawers">
      {#if !modules.length}<button onclick={populateKallaxOpening}>Use default · 10 single + 1 double</button>{/if}
      <button disabled={!canAddSingle} onclick={() => { removing = false; addShelfModule(1, true); }}>+ Single drawer</button>
      <button disabled={!canAddDouble} onclick={() => { removing = false; addShelfModule(2, true); }}>+ Double drawer</button>
    </div>
    {#if !canAddSingle && !canAddDouble}
      <output class="spaceStatus">No space for another drawer with the current settings. Delete a drawer to free cells.</output>
    {:else if !canAddDouble}
      <output class="spaceStatus">No two adjacent cells available for a double drawer with the current settings.</output>
    {/if}
    {#if selected}
      <div class="selectedActions">
        <strong class="actionLabel">Selected · {selected.name}</strong>
        <div class="actions">
          <button class="shelfPrimary" onclick={onOpenModule}>Inspect selected module</button>
          <button class="shelfDanger" onclick={() => removing = true}>Delete selected drawer</button>
        </div>
      </div>
    {/if}
    {#if removing && selected}
      <div class="deletePrompt" role="group" aria-label="Confirm drawer deletion"><strong>Delete {selected.name}?</strong><div class="actions"><button class="shelfDanger" onclick={() => { removeShelfModule(selected.id); removing = false; }}>Confirm delete</button><button onclick={() => removing = false}>Cancel</button></div></div>
    {/if}
    {#if selected?.type === 'card-drawer' && selectedPlaced}
      <HelpRow>
        <div class="actions">
          {#if selectedPlaced.columns === 2}
            <button onclick={() => convert()}>Split into two single drawers</button>
          {:else}
            {#each mergeCandidates as neighbour}
              <button onclick={() => convert(neighbour.id)}>Merge with {neighbour.name}</button>
            {:else}
              <span>{mergeNeighbours.length ? 'Align the settings below to merge' : 'No adjacent single drawer in this row'}</span>
            {/each}
          {/if}
        </div>
        <HelpTip label="About splitting and merging drawers">Split keeps depth, content format, colour and manufacturing settings, and creates two single drawers with standard handles. Merge needs two side-by-side singles in the same row with matching settings, including depth, colour and window choice. The double uses a centre divider, wide handle and two identification windows when enabled. Existing cells stay in place. These actions change the shell, drawer and handle parts required for printing.</HelpTip>
      </HelpRow>
      {#if selectedPlaced.columns === 1}
        {#each mergeNeighbours.filter(item => item.differences.length) as neighbour}
          <output class="mergeDifference">{neighbour.name} · {neighbour.differences.join(' · ')} (selected / neighbour)</output>
        {/each}
      {/if}
    {/if}
    {#if conversionError}<p role="alert">{conversionError}</p>{/if}
    {#if layout.unplaced.length}
      <section class="unplacedList" aria-label="Modules outside the opening">
        <strong>⚠ Outside the opening · {layout.unplaced.length}</strong>
        {#each layout.unplaced as module}
          <div class="unplaced">
            <div><strong>{module.name}</strong><span>{module.reason}</span></div>
            <div class="actions"><button onclick={() => { selectShelfModule(module.id); removing = false; }}>Select</button><button class="shelfDanger" aria-label={`Delete ${module.name}`} onclick={() => { selectShelfModule(module.id); removing = true; }}>Delete</button></div>
          </div>
        {/each}
      </section>
    {/if}
  </footer>
</section>

<style>
  .openingView { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; box-sizing: border-box; background: var(--bg); overflow: auto; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; }
  h2 { margin: 0; font-size: 1.1rem; }
  header span, output { color: var(--fgMuted); font-size: 0.85rem; }
  .drawing { position: relative; flex: 1; min-height: 240px; display: flex; justify-content: center; }
  .openingCanvas { position: absolute; inset: 0; }
  .hidden { visibility: hidden; }
  label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
  select { font: inherit; color: var(--fg); background: var(--inputBg); border: var(--borderThin); border-radius: 0.35rem; padding: 0.4rem; max-width: 15rem; }
  button[aria-pressed='true'] { border-color: var(--fgPrimary); }
  [role='alert'] { color: #ed987d; }
  svg { width: 100%; max-width: 680px; height: 100%; min-height: 240px; }
  g { cursor: pointer; outline: none; }
  g:hover .shell, g:focus-visible .shell, g.selected .shell { stroke: #79c7ff; stroke-width: 2.5; }
  text { pointer-events: none; }
  footer { display: flex; flex-direction: column; gap: 0.65rem; }
  footer { padding: 0.85rem; border: 1px solid var(--shelf-control-border); border-radius: 0.5rem; background: var(--bg); }
  .selectedActions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; border-top: var(--borderThin); padding-top: 0.65rem; }
  .actionLabel { font-size: 0.85rem; overflow-wrap: anywhere; }
  .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
  .alignmentControl { display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem; padding: 0.5rem 0.65rem; border: 1px solid var(--shelf-control-border); border-radius: 0.5rem; background: var(--inputBg); font-size: 0.85rem; }
  button { font: inherit; color: var(--fg); padding: 0.45rem 0.65rem; background: var(--contrastLow); border: var(--borderThin); border-radius: 0.35rem; cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--fgPrimary); outline-offset: 2px; }
  .unplacedList, .deletePrompt { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.85rem; color: #583108; background: #fff3d9; border: 1px solid #a86817; border-radius: 0.4rem; font-size: 0.9rem; }
  .unplaced { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.65rem; align-items: center; border-top: 1px solid #bfa477; padding-top: 0.65rem; }
  .unplaced > div:first-child { display: flex; flex-direction: column; gap: 0.25rem; }
  .spaceStatus { color: var(--fg); padding: 0.5rem 0.65rem; border-left: 3px solid var(--shelf-control-border); font-size: 0.85rem; }
  .mergeDifference { color: var(--fg); font-size: 0.85rem; }
</style>
