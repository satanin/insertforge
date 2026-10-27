<script lang="ts">
  import { PaneGroup, Pane, PaneResizer } from 'paneforge';
  import { getProject, addShelfModule, addShelfFrame, selectShelfModule, removeShelfModule, updateShelfModule } from '$lib/stores/project.svelte';
  import { getProjectCardSizes } from '$lib/utils/projectCards';
  import { resolveShelfDrawer, createShelfPreview, type ShelfDrawerParams, type ShelfPartId } from '$lib/models/shelfStorage';
  import { jscadToBufferGeometry } from '$lib/utils/jscadToThree';
  import { exportShelfModule } from '$lib/utils/exportShelfModule';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  import ShelfFitPreview from './ShelfFitPreview.svelte';
  import ShelfFrameEditor from './ShelfFrameEditor.svelte';
  import { createShelfFrame, resolveShelfFrame } from '$lib/models/shelfFrame';
  import type { BufferGeometry } from 'three';

  let { isMobile = false }: { isMobile?: boolean } = $props();
  const project = $derived(getProject());
  const modules = $derived(project.shelfModules ?? []);
  const selected = $derived(modules.find(m => m.id === project.selectedShelfModuleId) ?? modules[0]);
  const cards = $derived(getProjectCardSizes(project));
  const resolved = $derived(selected?.type === 'card-drawer' ? resolveShelfDrawer(selected.params, cards) : null);
  const frameResolved = $derived(selected?.type === 'open-frame' ? resolveShelfFrame(selected.params) : null);
  let extraction = $state(70);
  let contents = $state(true);
  let cutaway = $state(false);
  let stack = $state(false);
  let adjacent = $state(false);
  let print = $state(false);
  let shelfFit = $state(false);
  let removing = $state<string | null>(null);
  let busy = $state(false);
  let exportError = $state('');
  let geometry = $state<BufferGeometry | null>(null);
  $effect(() => {
    const next = selected?.type === 'open-frame' && frameResolved?.valid
      ? jscadToBufferGeometry(createShelfFrame(selected.params, print))
      : selected?.type === 'card-drawer' && resolved?.valid
        ? jscadToBufferGeometry(createShelfPreview(selected.params, cards, extraction, contents, { cutaway, stack, adjacent, print })) : null;
    geometry = next;
    return () => next?.dispose();
  });

  const manufacturing = [
    { key: 'shellThickness', label: 'Shell thickness', min: 1.2, max: 10 },
    { key: 'drawerWall', label: 'Drawer walls', min: 1.2, max: 10 },
    { key: 'drawerFloor', label: 'Drawer floor', min: 0.8, max: 10 },
    { key: 'slidingClearance', label: 'Sliding clearance / side', min: 0.1, max: 3 },
    { key: 'cardClearance', label: 'Card clearance / side', min: 0.2, max: 10 }
  ] as const;
  function numeric(key: keyof ShelfDrawerParams, input: HTMLInputElement) {
    if (selected) updateShelfModule(selected.id, { [key]: input.valueAsNumber });
  }
  async function download(part: ShelfPartId, format: 'stl' | '3mf') {
    if (!selected || busy || !resolved?.valid) return;
    busy = true;
    exportError = '';
    try { await exportShelfModule(selected, cards, part, format); }
    catch (e) { exportError = e instanceof Error ? e.message : 'Export failed.'; }
    finally { busy = false; }
  }
</script>

<PaneGroup direction={isMobile ? 'vertical' : 'horizontal'} class="shelfPanes">
  <Pane defaultSize={75} minSize={30}>
    <main class="shelfView">
      <nav aria-label="Shelf modules" class="moduleList">
        <strong>Modules</strong>
        {#each modules as module (module.id)}
          <div class="moduleRow">
            <button class="moduleName" class:active={module.id === selected?.id} onclick={() => { removing = null; selectShelfModule(module.id); }}>{module.name}</button>
            <button aria-label={`Remove ${module.name}`} title={`Remove ${module.name}`} onclick={() => removing = module.id}>×</button>
          </div>
          {#if removing === module.id}
            <div class="removePrompt"><span>Remove {module.name}?</span><div>
              <button onclick={() => { shelfFit = false; removeShelfModule(module.id); removing = null; }}>Remove</button>
              <button onclick={() => removing = null}>Cancel</button>
            </div></div>
          {/if}
        {/each}
        <button onclick={() => addShelfModule()}>+ Add card drawer</button>
        <button disabled={!modules.some(m => m.type === 'card-drawer' && m.params.stackingEnabled !== false)} onclick={() => { shelfFit = false; addShelfFrame(); }}>+ Add open frame</button>
      </nav>
      {#if selected}
        <div class="modelCanvas" class:modelHidden={shelfFit}>
        {#await import('./TrayViewer.svelte') then { default: TrayViewer }}
          <TrayViewer {geometry} selectedTrayId={selected.id} gameContainerWidth={Math.max(selected.params.depth * 1.8, (resolved?.height ?? 100) * 2)}
            gameContainerDepth={selected.params.depth} selectionType="tray" hidePrintBed={true} />
        {/await}
        </div>
        <div class="previewControls">
          {#if selected.type === 'card-drawer'}
          <button disabled={!resolved?.valid} onclick={() => shelfFit = true}>Try in a shelf</button>
          {/if}
          <label><input type="checkbox" bind:checked={print} /> Print orientation</label>
          {#if selected.type === 'card-drawer'}
          <HelpRow><label>Explode <input aria-label="Explode" type="range" min="0" max="100" bind:value={extraction} disabled={print} /> {extraction}%</label><HelpTip label="About disassembly preview">0–70% pulls out the drawer with its handle attached. 70–100% lifts the continuous inverted-U handle off the frontal edge. This is a preview only; exports retain each part's print orientation.</HelpTip></HelpRow>
          <label><input type="checkbox" bind:checked={contents} disabled={print} /> Preview cards</label>
          <label><input type="checkbox" bind:checked={cutaway} disabled={print} /> Cutaway shell</label>
          <label><input type="checkbox" bind:checked={stack} disabled={!resolved?.stacking || print} /> Preview stack</label>
          <label><input type="checkbox" bind:checked={adjacent} disabled={!resolved?.stacking || print} /> Preview adjacent</label>
          {/if}
        </div>
        {#if shelfFit && selected.type === 'card-drawer' && resolved?.valid}
          <ShelfFitPreview module={resolved} capacity={resolved.capacity} color={selected.params.handleColor ?? '#df9756'} onclose={() => shelfFit = false} />
        {/if}
      {:else}
        <div class="emptyState"><h1>Shelf storage</h1><button onclick={() => addShelfModule()}>Create first card drawer</button></div>
      {/if}
    </main>
  </Pane>
  <PaneResizer class="shelfResizer" />
  <Pane defaultSize={25} minSize={20}>
    <aside class="shelfEditor" aria-label="Shelf module editor">
      <header><small>SHELF STORAGE · EXPERIMENTAL</small><h2>{selected?.name ?? 'New module'}</h2></header>
      {#if selected?.type === 'open-frame'}
        <ShelfFrameEditor module={selected} />
      {:else if selected?.type === 'card-drawer' && resolved}
        <section>
          <label>Name <input value={selected.name} onchange={e => updateShelfModule(selected.id, {}, e.currentTarget.value)} /></label>
        </section>
        <details open><summary>Content</summary><section>
          <label>Card format <select value={selected.params.cardSizeId} onchange={e => updateShelfModule(selected.id, { cardSizeId: e.currentTarget.value })}>
            {#each project.cardSizes as card}<option value={card.id}>{card.name} · {card.width} × {card.length} mm</option>{/each}
          </select></label>
          <div class="fieldGrid">
            <label>Sleeve <select value={selected.params.sleeve} onchange={e => updateShelfModule(selected.id, { sleeve: e.currentTarget.value as ShelfDrawerParams['sleeve'] })}>
              <option value="none">None</option><option value="normal">Normal</option><option value="premium">Premium</option>
            </select></label>
            <label>Orientation <select value={selected.params.orientation} onchange={e => updateShelfModule(selected.id, { orientation: e.currentTarget.value as ShelfDrawerParams['orientation'] })}>
              <option value="vertical">Portrait</option><option value="horizontal">Landscape</option>
            </select></label>
          </div>
          <output>Estimated capacity: {resolved.valid ? resolved.capacity : '—'} cards</output>
          <label class="checkField"><input type="checkbox" checked={selected.params.labelWindow !== false} onchange={e => updateShelfModule(selected.id, { labelWindow: e.currentTarget.checked })} /> Identification card window</label>
          {#if resolved.labelWindow}
            <div class="fieldGrid">
              <label>Bare label card width (mm)<input type="number" min="20" max="150" value={selected.params.labelWidth ?? 63} onchange={e => numeric('labelWidth', e.currentTarget)} /></label>
              <label>Bare label card height (mm)<input type="number" min="20" max="180" value={selected.params.labelHeight ?? 88} onchange={e => numeric('labelHeight', e.currentTarget)} /></label>
            </div>
            <output>Premium label allowance: {resolved.labelWidth.toFixed(1)} × {resolved.labelHeight.toFixed(1)} × {resolved.premiumThickness.toFixed(1)} mm · slot depth: {resolved.labelSlotDepth.toFixed(1)} mm</output>
            <HelpRow><span>Top-loading label behind handle</span><HelpTip label="About identification card">Remove the U handle upwards to change the label. Bare card dimensions gain 1.5 mm per edge for a sleeve, plus 0.3 mm sliding clearance per side. Slot depth reserves at least the project's Premium thickness (minimum 0.8 mm), plus 0.6 mm clearance. Front lips and solid back are at least 2.4 mm each. Check your sleeve's actual footprint; adjust the card dimensions if needed. The slot remains open at the top for printing.</HelpTip></HelpRow>
          {/if}
        </section></details>
        <details open><summary>Dimensions</summary><section>
          <HelpRow><button onclick={() => updateShelfModule(selected.id, { shellThickness: 2, drawerFloor: 1.2, drawerWall: 2, slidingClearance: 0.5, cardClearance: 1, headroom: 1 })}>Compact for Kallax</button><HelpTip label="About compact preset">Sets shell skin 2 mm, drawer floor 1.2 mm, drawer walls 2 mm, sliding clearance 0.5 mm, card clearance 1 mm and headroom 1 mm. Bottom/left keep at least 3.8 mm for the tested dovetail sockets. The 8 mm handle leaves the entire Premium label clear. Changes module pitch; existing printed shells and frame snapshots use the previous dimensions. This is a trial configuration, not a load rating.</HelpTip></HelpRow>
          <div class="fieldGrid">
            <label>Exterior depth (mm)<input type="number" min="45" max="1000" step="1" value={selected.params.depth} onchange={e => numeric('depth', e.currentTarget)} /></label>
            <label>Headroom (mm)<input type="number" min="0" max="40" step="1" value={selected.params.headroom} onchange={e => numeric('headroom', e.currentTarget)} /></label>
          </div>
          {#if resolved.valid}
            <output>Carcass: {resolved.width.toFixed(1)} × {resolved.depth.toFixed(1)} × {resolved.height.toFixed(1)} mm</output>
            <output>Depth with handle: {(resolved.depth + resolved.handleProjection).toFixed(1)} mm</output>
            {#if resolved.stacking}<output>Module pitch: {resolved.bodyWidth.toFixed(1)} × {resolved.bodyHeight.toFixed(1)} mm · males project right and up</output>{/if}
          {/if}
          <HelpRow><span>Automatic width and height</span><HelpTip label="About module dimensions">Width and height follow the card format, headroom, walls and sliding clearances. Depth measures the carcass; the handle projects beyond the front. Capacity is an estimate based on the project card thickness.</HelpTip></HelpRow>
        </section></details>
        <details open><summary>Manufacturing</summary><section>
          <div class="fieldGrid">
            {#each manufacturing as field}
              <label>{field.label} (mm)<input type="number" min={field.min} max={field.max} step="0.1" value={selected.params[field.key]} onchange={e => numeric(field.key, e.currentTarget)} /></label>
            {/each}
          </div>
          <label class="checkField"><input type="checkbox" checked={selected.params.stackingEnabled !== false} onchange={e => updateShelfModule(selected.id, { stackingEnabled: e.currentTarget.checked })} /> Dovetail module connections</label>
          <output>Reinforced front: {resolved.frontThickness.toFixed(1)} mm · bearing tracks: {resolved.trackWidth.toFixed(1)} × {resolved.trackHeight.toFixed(1)} mm</output>
          {#if resolved.labelWindow}<output>Window support: {resolved.labelFaceWall.toFixed(1)} mm front · at least {resolved.labelBackWall.toFixed(1)} mm solid back</output>{/if}
          <output>Shell lip clearance: {resolved.lipClearance.toFixed(1)} mm · flat rail thickness: {resolved.lipRootThickness.toFixed(1)} mm</output>
          <output>Shell skins: {resolved.shellSkin.toFixed(1)} mm · bottom/left: {resolved.panelThickness.toFixed(1)} mm{resolved.stacking ? ` · material behind socket: ${resolved.socketWeb.toFixed(1)} mm` : ''}</output>
          <label>Handle colour <input type="color" value={selected.params.handleColor ?? '#df9756'} onchange={e => updateShelfModule(selected.id, { handleColor: e.currentTarget.value })} /></label>
          <output>L grip: {resolved.handleDrop.toFixed(1)} mm · label clearance at stops: {(resolved.drawerHeight - resolved.handleDrop - 0.25 - resolved.labelZ - resolved.labelHeight).toFixed(1)} mm</output>
          <HelpRow><span>Printed handle mounting</span><HelpTip label="About handle mounting">The {resolved.handleTongueThickness.toFixed(1)} mm front tongue enters the {resolved.labelSlotDepth.toFixed(1)} mm label channel, with at least 0.25 mm clearance on each face. A 2.4 mm rear tongue wraps the continuous solid backing; both tongues are {resolved.handleDrop.toFixed(1)} mm deep and the upper bridge remains 2.4 mm thick. The backing is retained up to the underside of the bridge, with a 0.25 mm seating gap. It supports the handle and transmits pull/push forces; the card is below the entire handle with at least 0.6 mm clearance after seating. Side walls remain intact. Lift the handle off before changing the label. No upward snap latch is fitted. Print upside down on its flat top. Previous shell/frame pitches are not interchangeable.</HelpTip></HelpRow>
          <HelpRow><span>Drawer capture lips</span><HelpTip label="About drawer capture">Two rectangular rails inside the shell have flat upper and lower bearing faces, retaining their full root thickness through the tip. Their undersides sit 2 mm above the existing drawer side walls. They start behind the tall frontal transition, allowing free extraction without extra ledges on the drawer. The upper faces reserve a bearing surface for a future tier; sustained load still needs physical testing. Bottom tracks carry the current drawer weight. Support depends on remaining overlap; support the drawer near full extraction. Rails grow from the back wall when printed on the rear.</HelpTip></HelpRow>
          <HelpRow><span>Connection and stop direction</span><HelpTip label="About stacking">Male dovetails are above and right when looking into the front; sockets are below and left, keeping the left exterior free of projections beside a wall. Rails stop 10 mm before the front; sockets open at the back. The blind end stops the female module moving backwards; forward movement can undo assembly. As agreed, no rear lock is fitted for this first trial. The undercut resists pulling modules directly apart vertically or sideways. These connections are not certified for unsupported arrangements.</HelpTip></HelpRow>
          <p class="printReview">Trial without rear lock: a female module can slide forward to disconnect. With the drawer open, the handle lifts off without a snap latch.</p>
        </section></details>
        {#if !resolved.valid}<section role="alert">{#each resolved.errors as error}<p>{error}</p>{/each}</section>{/if}
        <details open><summary>Export parts</summary><section>
          <div class="fieldGrid">
            {#each ['shell', 'drawer', 'handle'] as part}
              <div class="partExport"><strong>{part === 'shell' ? 'Shell' : part === 'drawer' ? 'Drawer' : 'Handle'}</strong><div>
                <button disabled={!resolved.valid || busy} onclick={() => download(part as ShelfPartId, 'stl')}>STL</button>
                <button disabled={!resolved.valid || busy} onclick={() => download(part as ShelfPartId, '3mf')}>3MF</button>
              </div></div>
            {/each}
          </div>
          <HelpRow><span>Print orientation</span><HelpTip label="About print orientation">Shell: rear face down, opening up; lips and rails grow from the rear wall. Drawer: flat floor down, wide frontal base on the bed, card slot and handle seat open upwards. Handle: flat upper face down, U legs and finger lip growing from the bed without a suspended bridge. Preview and exports share transforms and Z=0. Parts are separated, not packed onto a specific printer bed. Slicing and physical validation remain required.</HelpTip></HelpRow>
          <p class="prototypeStatus">Prototype: fit, printability and load capacity unvalidated. No drawer extraction stop yet.</p>
          {#if exportError}<p role="alert">{exportError}</p>{/if}
        </section></details>
      {/if}
    </aside>
  </Pane>
</PaneGroup>

<style>
  :global(.shelfPanes) { flex: 1; min-height: 0; }
  :global(.shelfResizer) { width: 5px; background: var(--contrastLow); }
  .shelfView { height: 100%; position: relative; }
  .modelCanvas { height: 100%; }
  .modelHidden { visibility: hidden; }
  .moduleList { position: absolute; z-index: 5; top: 1rem; left: 1rem; display: flex; flex-direction: column; gap: 0.4rem; max-width: 13rem; padding: 0.75rem; background: var(--bg); border: var(--borderThin); border-radius: 0.5rem; }
  button, input, select { font: inherit; color: var(--fg); }
  button { padding: 0.4rem 0.65rem; background: var(--contrastLow); border: var(--borderThin); border-radius: 0.3rem; cursor: pointer; }
  button.active { border-color: var(--fgPrimary); }
  .moduleRow { display:flex; gap:0.3rem; }
  .moduleName { flex:1; min-width:0; text-align:left; overflow-wrap:anywhere; }
  .removePrompt { display:flex; flex-direction:column; gap:0.4rem; font-size:0.8rem; }
  .removePrompt div { display:flex; gap:0.4rem; }
  button:disabled { opacity: 0.4; cursor: default; }
  .shelfEditor { height: 100%; overflow-y: auto; background: var(--bg); font-size: 0.85rem; }
  header { padding: 1rem; border-bottom: var(--borderThin); }
  h2 { font-size: 1.15rem; margin: 0.5rem 0 0; }
  small, .prototypeStatus { color: var(--fgMuted); }
  section { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.8rem; }
  details { border-bottom: var(--borderThin); }
  summary { padding: 0.85rem 1rem; font-weight: 600; cursor: pointer; }
  label { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
  .checkField { flex-direction: row; align-items: center; }
  .checkField input, .previewControls input[type='checkbox'] { appearance: auto; position: static; opacity: 1; width: 1rem; height: 1rem; margin: 0; flex: 0 0 auto; accent-color: #9fb8d5; }
  input:not([type='checkbox'], [type='range']), select { width: 100%; min-width: 0; box-sizing: border-box; border: var(--borderThin); border-radius: 0.3rem; padding: 0.4rem; background: var(--inputBg); }
  .shelfEditor input[type='color'] { height: 2.1rem; padding: 0.15rem; }
  .fieldGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  output { display: block; font-size: 0.8rem; }
  .previewControls { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem; width: max-content; max-width: calc(100% - 2rem); box-sizing: border-box; padding: 0.75rem; background: var(--bg); border: var(--borderThin); border-radius: 0.5rem; font-size: 0.8rem; }
  .previewControls label { flex-direction: row; align-items: center; white-space: nowrap; }
  .emptyState { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .partExport { display: flex; flex-direction: column; gap: 0.5rem; }
  .prototypeStatus { font-size: 0.75rem; margin: 0; }
  .printReview { font-size: 0.75rem; margin: 0; color: #edc68c; line-height: 1.5; }
  [role='alert'] { color: #ef987d; }
</style>
