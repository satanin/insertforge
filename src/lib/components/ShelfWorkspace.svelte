<script lang="ts">
  import { PaneGroup, Pane, PaneResizer } from 'paneforge';
  import { getProject, addShelfModule, addShelfFrame, selectShelfModule, removeShelfModule, updateShelfModule, syncShelfFrames } from '$lib/stores/project.svelte';
  import { getProjectCardSizes } from '$lib/utils/projectCards';
  import { resolveShelfDrawer, createShelfPreview, type ShelfDrawerParams, type ShelfPartId, type ShelfPreviewCote } from '$lib/models/shelfStorage';
  import { jscadToBufferGeometry } from '$lib/utils/jscadToThree';
  import { exportShelfModule } from '$lib/utils/exportShelfModule';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  import ShelfFitPreview from './ShelfFitPreview.svelte';
  import ShelfFrameEditor from './ShelfFrameEditor.svelte';
  import ShelfManufacturingEditor from './ShelfManufacturingEditor.svelte';
  import { createShelfManufacturing, shelfJointPreview, shelfBedPreview } from '$lib/models/shelfManufacturing';
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
  let frameSyncMessage = $state('');
  let busy = $state(false);
  let exportError = $state('');
  let unlockedModuleId = $state<string | null>(null);
  const systemEditing = $derived(!!selected && unlockedModuleId === selected.id);
  let geometry = $state<BufferGeometry | null>(null);
  let cotes = $state<ShelfPreviewCote[]>([]);
  let measuredPart = $state('');
  const partCote = $derived(cotes.find(cote => cote.part === measuredPart));
  let manufacturingPart = $state('shell-1');
  let jointPreview = $state(false), jointSeparation = $state(25);
  const manufacturingModel = $derived.by(() => {
    if (selected?.type !== 'card-drawer' || !selected.params.manufacturing) return null;
    try { return createShelfManufacturing(selected.params, cards); } catch { return null; }
  });
  const manufacturingItems = $derived(manufacturingModel?.items.filter(item => item.part !== 'sample') ?? []);
  const manufacturingItem = $derived(manufacturingItems.find(item => item.id === manufacturingPart) ?? manufacturingItems[0]);
  $effect(() => {
    const nextCotes: ShelfPreviewCote[] = [];
    const next = selected?.type === 'open-frame' && frameResolved?.valid
      ? jscadToBufferGeometry(createShelfFrame(selected.params, print))
      : selected?.type === 'card-drawer' && resolved?.valid
        ? jscadToBufferGeometry(print && manufacturingItem && manufacturingModel ? shelfBedPreview(manufacturingItem, manufacturingModel.settings)
          : jointPreview && manufacturingModel ? shelfJointPreview(manufacturingModel, jointSeparation, nextCotes)
          : createShelfPreview(selected.params, cards, extraction, contents, { cutaway, stack, adjacent, print, cotes: nextCotes })) : null;
    geometry = next;
    cotes = nextCotes;
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
  function transferBottomTracks() {
    if (selected?.type !== 'card-drawer' || !resolved?.bottomTracks) return;
    updateShelfModule(selected.id, { bottomTracks: false, drawerFloor: selected.params.drawerFloor + resolved.trackHeight });
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
            <button class="moduleName" class:active={module.id === selected?.id} onclick={() => { removing = null; unlockedModuleId = null; selectShelfModule(module.id); }}>{module.name}</button>
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
        {#if selected?.type === 'card-drawer' && modules.some(m => m.type === 'open-frame')}
          <HelpRow><button disabled={!resolved?.valid || !resolved.stacking} onclick={() => { const count = syncShelfFrames(selected.id); frameSyncMessage = `${count} frame(s) updated from ${selected.name}`; }}>Update all frames</button><HelpTip label="About updating all frames">Copies this drawer's current cell pitch and depth to every open frame in this project. Keeps each frame's columns, rows, walls and name. Use after a deliberate revision of the system unit; saved frames never resize silently.</HelpTip></HelpRow>
        {/if}
        {#if frameSyncMessage}<small role="status">{frameSyncMessage}</small>{/if}
      </nav>
      {#if selected}
        <div class="modelCanvas" class:modelHidden={shelfFit}>
        {#await import('./TrayViewer.svelte') then { default: TrayViewer }}
          <TrayViewer {geometry} {partCote} selectedTrayId={selected.id} gameContainerWidth={Math.max(selected.params.depth * 1.8, (resolved?.height ?? 100) * 2)}
            gameContainerDepth={selected.params.depth} selectionType="tray" hidePrintBed={true} />
        {/await}
        </div>
        <div class="previewControls">
          {#if !print && cotes.length}
            <label>Dimensions <select aria-label="Part dimensions" value={partCote?.part ?? ''} onchange={e => measuredPart = e.currentTarget.value}>
              <option value="">Off</option>
              {#each cotes as cote}<option value={cote.part}>{cote.part}</option>{/each}
            </select></label>
          {/if}
          {#if selected.type === 'card-drawer' && resolved?.valid}
            {#if print && manufacturingItem}
              <output>{manufacturingItem.name} · X × Y × Z: {manufacturingItem.size.map(v => v.toFixed(2)).join(' × ')} mm</output>
            {:else}
              <output>Depth · Shell {resolved.depth.toFixed(2)} mm · Drawer assembled {resolved.drawerDepth.toFixed(2)} mm without handle</output>
            {/if}
          {/if}
          {#if selected.type === 'card-drawer'}
          <button disabled={!resolved?.valid} onclick={() => shelfFit = true}>Try in a shelf</button>
          {/if}
          <label><input type="checkbox" bind:checked={print} /> Print orientation</label>
          {#if print && manufacturingModel}
            <select aria-label="Manufacturing part" value={manufacturingItem?.id} onchange={e => manufacturingPart = e.currentTarget.value}>
              {#each manufacturingItems as item}<option value={item.id}>{item.name}</option>{/each}
            </select>
          {/if}
          {#if selected.type === 'card-drawer'}
          {#if selected.params.manufacturing?.split && manufacturingModel && !print}
            <label><input type="checkbox" bind:checked={jointPreview} /> Preview depth joints</label>
            {#if jointPreview}<label>Joint separation <input aria-label="Joint separation" type="range" min="0" max="50" bind:value={jointSeparation} /> {jointSeparation} mm</label>{/if}
          {/if}
          {#if !jointPreview || !manufacturingModel}
          <HelpRow><label>Explode <input aria-label="Explode" type="range" min="0" max="100" bind:value={extraction} disabled={print} /> {extraction}%</label><HelpTip label="About disassembly preview">0–70% pulls out the drawer with its handle attached. 70–100% lifts the continuous inverted-U handle off the frontal edge. This is a preview only; exports retain each part's print orientation.</HelpTip></HelpRow>
          <label><input type="checkbox" bind:checked={contents} disabled={print} /> Preview cards</label>
          <label><input type="checkbox" bind:checked={cutaway} disabled={print} /> Cutaway shell</label>
          <label><input type="checkbox" bind:checked={stack} disabled={!resolved?.stacking || print} /> Preview stack</label>
          <label><input type="checkbox" bind:checked={adjacent} disabled={!resolved?.stacking || print} /> Preview adjacent</label>
          {/if}
          {/if}
        </div>
        {#if shelfFit && selected.type === 'card-drawer' && resolved?.valid}
          <ShelfFitPreview module={resolved} capacity={resolved.capacity} color={selected.params.handleColor ?? '#df9756'} initialMargin={selected.params.bottomTracks === false && selected.params.drawerFloor >= 2 ? 1.5 : 2} onclose={() => shelfFit = false} />
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
          <HelpRow><strong>System dimensions {systemEditing ? 'unlocked' : 'locked'}</strong><HelpTip label="About system compatibility">Depth remains editable. Card format, label, walls and clearances currently determine the cell dimensions and mating interfaces, so they are protected together. Unlock only for a deliberate prototype revision; changes may make existing drawers, shells and frame snapshots incompatible. Unlocking does not change any values.</HelpTip></HelpRow>
          <button onclick={() => unlockedModuleId = systemEditing ? null : selected.id}>{systemEditing ? 'Lock system settings' : 'Unlock prototype settings'}</button>
          {#if systemEditing}<output>Prototype editing: changes can break compatibility with printed parts.</output>{/if}
        </section>
        <details open><summary>Content</summary><section>
          {#if systemEditing}
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
          {:else}
            <output>Card format: {cards.find(card => card.id === selected.params.cardSizeId)?.name ?? selected.params.cardSizeId} · {selected.params.orientation}</output>
            <output>Sleeve: {selected.params.sleeve} · estimated capacity: {resolved.valid ? resolved.capacity : '—'} cards</output>
            <output>Identification window: {resolved.labelWindow ? 'Yes' : 'No'}</output>
            {#if resolved.labelWindow}<output>Premium label allowance: {resolved.labelWidth.toFixed(1)} × {resolved.labelHeight.toFixed(1)} mm · slot: {resolved.labelSlotDepth.toFixed(2)} mm</output>{/if}
          {/if}
        </section></details>
        <details open><summary>Dimensions</summary><section>
          {#if systemEditing}
          <HelpRow><button onclick={() => updateShelfModule(selected.id, { shellThickness: 2, roofThickness: 2, socketWebThickness: 1.2, handleClearance: 0.25, handleRetention: false, drawerFloor: 1.2, bottomTracks: true, drawerWall: 2, slidingClearance: 0.5, cardClearance: 1, headroom: 1 })}>Compact for Kallax</button><HelpTip label="About compact preset">Restores the earlier compact trial: shell skin/roof 2 mm, socket backing 1.2 mm, handle clearance 0.25 mm without clip, drawer floor 1.2 mm, drawer walls 2 mm, sliding clearance 0.5 mm, card clearance 1 mm and headroom 1 mm. Bottom/left keep at least 3.8 mm for the tested dovetail sockets. The 8 mm handle leaves the entire Premium label clear. Changes module pitch; existing printed shells and frame snapshots use the previous dimensions. This is a trial configuration, not a load rating.</HelpTip></HelpRow>
          {/if}
          <div class="fieldGrid">
            <label>Exterior depth (mm)<input type="number" min="45" max="1000" step="1" value={selected.params.depth} onchange={e => numeric('depth', e.currentTarget)} /></label>
            {#if systemEditing}<label>Headroom (mm)<input type="number" min="0" max="40" step="1" value={selected.params.headroom} onchange={e => numeric('headroom', e.currentTarget)} /></label>{:else}<output>Headroom: {selected.params.headroom} mm</output>{/if}
          </div>
          {#if resolved.valid}
            <output>Carcass: {resolved.width.toFixed(1)} × {resolved.depth.toFixed(1)} × {resolved.height.toFixed(1)} mm</output>
            <output>Depth with handle: {(resolved.depth + resolved.handleProjection).toFixed(1)} mm</output>
            <output>Drawer assembled without handle (W × D × H): {resolved.drawerWidth.toFixed(2)} × {resolved.drawerDepth.toFixed(2)} × {resolved.drawerHeight.toFixed(2)} mm</output>
            {#if resolved.stacking}<output>Module pitch: {resolved.bodyWidth.toFixed(1)} × {resolved.bodyHeight.toFixed(1)} mm · males project right and up</output>{/if}
          {/if}
          <HelpRow><span>Automatic width and height</span><HelpTip label="About module dimensions">Width and height follow the card format, headroom, walls and sliding clearances. Depth measures the carcass; the handle projects beyond the front. Capacity is an estimate based on the project card thickness.</HelpTip></HelpRow>
        </section></details>
        <details open><summary>Manufacturing</summary><section>
          {#if systemEditing}
          <div class="fieldGrid">
            {#each manufacturing as field}
              <label>{field.label} (mm)<input type="number" min={field.min} max={field.max} step="0.1" value={selected.params[field.key]} onchange={e => numeric(field.key, e.currentTarget)} /></label>
            {/each}
            <label>Roof thickness (mm)<input type="number" min="1.2" max="10" step="0.1" value={selected.params.roofThickness ?? selected.params.shellThickness} onchange={e => numeric('roofThickness', e.currentTarget)} /></label>
            <label>Socket backing (mm)<input type="number" min="1" max="3" step="0.1" value={selected.params.socketWebThickness ?? 1.2} onchange={e => numeric('socketWebThickness', e.currentTarget)} /></label>
            <label>Handle clearance / face (mm)<input type="number" min="0.08" max="0.5" step="0.01" value={selected.params.handleClearance ?? 0.25} onchange={e => numeric('handleClearance', e.currentTarget)} /></label>
          </div>
          <label class="checkField"><input type="checkbox" checked={selected.params.handleRetention === true} onchange={e => updateShelfModule(selected.id, { handleRetention: e.currentTarget.checked })} /> Printed handle retention clip</label>
          <HelpRow><button onclick={() => updateShelfModule(selected.id, { shellThickness: 3.6, roofThickness: 3.6, socketWebThickness: 1, handleClearance: 0.12, handleRetention: true, drawerFloor: 2, bottomTracks: false, drawerWall: 2, slidingClearance: 0.5, cardClearance: 1, headroom: 1 })}>Trial 3.6 + handle fit</button><HelpTip label="About reinforced trial">Trial walls/roof: 3.6 mm, minimum socket backing: 1 mm. Drawer floor and side walls 2 mm, without bottom tracks. Floor thickening from 1.7 to 2 mm adds 0.3 mm to shell height while preserving useful space and clearances; update frame snapshots explicitly. Handle clearance 0.12 mm per face with rear retention clip. Shelf preview starts at 1.5 mm margin per face for this trial. Flat-floor sliding and loaded strength need physical testing.</HelpTip></HelpRow>
          <label class="checkField"><input type="checkbox" checked={selected.params.stackingEnabled !== false} onchange={e => updateShelfModule(selected.id, { stackingEnabled: e.currentTarget.checked })} /> Dovetail module connections</label>
          {:else}
            <div class="fieldGrid">
              {#each manufacturing as field}<output>{field.label}: {selected.params[field.key]} mm</output>{/each}
              <output>Handle clearance / face: {resolved.handleClearance.toFixed(2)} mm</output>
            </div>
            <output>Handle retention clip: {resolved.handleRetention ? 'Yes' : 'No'} · dovetail connections: {resolved.stacking ? 'Yes' : 'No'}</output>
          {/if}
          <output>Reinforced front: {resolved.frontThickness.toFixed(1)} mm · {resolved.bottomTracks ? `bearing tracks: ${resolved.trackWidth.toFixed(1)} × ${resolved.trackHeight.toFixed(1)} mm` : 'flat shell floor · no bottom tracks'}</output>
          {#if systemEditing}<HelpRow><button disabled={!resolved.bottomTracks} onclick={transferBottomTracks}>Transfer bottom tracks to drawer floor</button><HelpTip label="About floor thickness transfer">Removes the bottom tracks and transfers their height to the drawer floor. Export both shell and drawer; older shells with tracks are incompatible.</HelpTip></HelpRow>{/if}
          {#if resolved.labelWindow}<output>Window support: {resolved.labelFaceWall.toFixed(1)} mm front · at least {resolved.labelBackWall.toFixed(1)} mm solid back</output>{/if}
          <output>Shell lip clearance: {resolved.lipClearance.toFixed(1)} mm · flat rail thickness: {resolved.lipRootThickness.toFixed(1)} mm</output>
          <output>Shell sides/back: {resolved.shellSkin.toFixed(1)} mm · roof: {resolved.roofThickness.toFixed(1)} mm · bottom/left: {resolved.panelThickness.toFixed(1)} mm{resolved.stacking ? ` · material behind socket: ${resolved.socketWeb.toFixed(1)} mm` : ''}</output>
          <label>Handle colour <input type="color" value={selected.params.handleColor ?? '#df9756'} onchange={e => updateShelfModule(selected.id, { handleColor: e.currentTarget.value })} /></label>
          <output>L grip: {resolved.handleDrop.toFixed(1)} mm · label clearance at stops: {(resolved.drawerHeight - resolved.handleDrop - 0.25 - resolved.labelZ - resolved.labelHeight).toFixed(1)} mm</output>
          <HelpRow><span>Printed handle mounting</span><HelpTip label="About handle mounting">The {resolved.handleTongueThickness.toFixed(1)} mm front tongue enters the {resolved.labelSlotDepth.toFixed(1)} mm label channel, with at least {resolved.handleClearance.toFixed(2)} mm clearance on each face. A 2.4 mm rear tongue wraps the continuous solid backing; both tongues are {resolved.handleDrop.toFixed(1)} mm deep and the upper bridge remains 2.4 mm thick. The backing supports the bridge after 0.25 mm downward travel and transmits pull/push forces; the card stays at least 0.6 mm below the seated handle. {resolved.handleRetention ? 'A rear spring tongue engages a shallow pocket in the drawer backing to resist accidental lifting. Its ramp allows removal by lifting with elastic deflection; print and test this trial clip before loading.' : 'No upward snap latch is fitted.'} Side walls remain intact. Remove the handle before changing the label. Print upside down on its flat top. Previous shell/frame pitches are not interchangeable.</HelpTip></HelpRow>
          <HelpRow><span>Drawer capture lips</span><HelpTip label="About drawer capture">Two rectangular rails inside the shell have flat upper and lower bearing faces, retaining their full root thickness through the tip. Their undersides sit 2 mm above the existing drawer side walls. They start behind the tall frontal transition, allowing free extraction without extra ledges on the drawer. The upper faces reserve a bearing surface for a future tier; sustained load still needs physical testing. {resolved.bottomTracks ? 'Bottom tracks carry the current drawer weight.' : 'The drawer rests directly on the flat shell floor; the capture lips remain unchanged.'} Support depends on remaining overlap; support the drawer near full extraction. Rails grow from the back wall when printed on the rear.</HelpTip></HelpRow>
          <HelpRow><span>Connection and stop direction</span><HelpTip label="About stacking">Male dovetails are above and right when looking into the front; sockets are below and left, keeping the left exterior free of projections beside a wall. Rails stop 10 mm before the front; sockets open at the back. The blind end stops the female module moving backwards; forward movement can undo assembly. As agreed, no rear lock is fitted for this first trial. The undercut resists pulling modules directly apart vertically or sideways. These connections are not certified for unsupported arrangements.</HelpTip></HelpRow>
          <p class="printReview">Trial without shell rear lock: a female module can slide forward to disconnect. {resolved.handleRetention ? 'Handle clip fit and elastic release require physical testing.' : 'With the drawer open, the handle lifts off without a snap latch.'}</p>
        </section></details>
        {#if !resolved.valid}<section role="alert">{#each resolved.errors as error}<p>{error}</p>{/each}</section>{/if}
        <ShelfManufacturingEditor module={selected} {cards} model={manufacturingModel} onpreview={id => { manufacturingPart = id; print = true; shelfFit = false; }} />
        {#if !manufacturingModel}
        <details open><summary>Export parts</summary><section>
          <div class="fieldGrid">
            {#each ['shell', 'drawer', 'handle'] as part}
              <div class="partExport"><strong>{part === 'shell' ? 'Shell' : part === 'drawer' ? 'Drawer' : 'Handle'}</strong><div>
                <button disabled={!resolved.valid || busy || (selected.params.manufacturing?.split && part !== 'handle')} onclick={() => download(part as ShelfPartId, 'stl')}>STL</button>
                <button disabled={!resolved.valid || busy || (selected.params.manufacturing?.split && part !== 'handle')} onclick={() => download(part as ShelfPartId, '3mf')}>3MF</button>
              </div></div>
            {/each}
          </div>
          {#if selected.params.manufacturing?.split}<output>Export numbered sections and joining keys from Printer &amp; depth sections above.</output>{/if}
          <HelpRow><span>Print orientation</span><HelpTip label="About print orientation">Shell: rear face down, opening up; lips and rails grow from the rear wall. Drawer: flat floor down, wide frontal base on the bed, card slot and handle seat open upwards. Handle: flat upper face down, U legs and finger lip growing from the bed without a suspended bridge. Preview and exports share transforms and Z=0. Parts are separated, not packed onto a specific printer bed. Slicing and physical validation remain required.</HelpTip></HelpRow>
          <p class="prototypeStatus">Prototype: fit, printability and load capacity unvalidated. No drawer extraction stop yet.</p>
          {#if exportError}<p role="alert">{exportError}</p>{/if}
        </section></details>
        {/if}
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
