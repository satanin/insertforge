<script lang="ts">
  import { resolveShelfFit, type ShelfEnvelope } from '$lib/models/shelfFit';
  import HelpRow from './HelpRow.svelte';
  import HelpTip from './HelpTip.svelte';
  let { module, capacity, color, onclose }: { module: ShelfEnvelope; capacity: number; color: string; onclose: () => void } = $props();
  let width = $state(330), height = $state(330), depth = $state(390), margin = $state(2);
  const fit = $derived(resolveShelfFit(module, { width, height, depth, margin }));
  const viewWidth = $derived(fit.valid ? width : 330);
  const viewHeight = $derived(fit.valid ? height : 330);
  function preset() { width = 330; height = 330; depth = 390; margin = 2; }
</script>

<div class="fitPreview" aria-label="Shelf fit preview">
  <header><div><small>DESIGN PREVIEW</small><h2>Try in a shelf</h2></div><button onclick={onclose}>Back to model</button></header>
  <div class="controls">
    <button onclick={preset}>Kallax reference</button>
    <label>Opening width (mm)<input type="number" min="1" max="2000" bind:value={width} /></label>
    <label>Opening height (mm)<input type="number" min="1" max="2000" bind:value={height} /></label>
    <label>Usable depth (mm)<input type="number" min="1" max="2000" bind:value={depth} /></label>
    <label>Fitting margin (mm)<input type="number" min="0" max="100" step="0.5" bind:value={margin} /></label>
  </div>
  <HelpRow><span>One opening · current drawer repeated</span><HelpTip label="About shelf dimensions">Kallax reference: 330 × 330 × 390 mm, based on IKEA's published opening dimensions. Measure your own opening. Margin is reserved on each side, above/below, and behind. Connected modules share their body pitch; only the exposed top/right connectors add to the overall envelope. Changing this preview does not resize the drawer or affect exports. This is a space check, not a shelf load rating.</HelpTip></HelpRow>
  {#if fit.valid}
    <div class="results" aria-live="polite"><strong>{fit.columns} columns × {fit.rows} rows = {fit.total} drawers</strong><span>≈ {fit.total * capacity} cards</span><span>Free width: {fit.freeWidth.toFixed(1)} mm · free height: {fit.freeHeight.toFixed(1)} mm</span></div>
    <div class="drawings">
      <figure><figcaption>Front · {width} × {height} mm</figcaption>
        <svg viewBox={`-12 -12 ${viewWidth + 24} ${viewHeight + 24}`} role="img" aria-label={`${fit.columns} columns and ${fit.rows} rows in the shelf opening`}>
          <defs><pattern id="shelf-drawer-grid" width={module.bodyWidth} height={module.bodyHeight} patternUnits="userSpaceOnUse" x={margin} y={height - margin - fit.rows * module.bodyHeight}>
            <rect width={module.bodyWidth} height={module.bodyHeight} fill="#7f97a8" stroke="#273340" stroke-width="1" />
            <rect x="5" y="8" width={Math.max(1, module.bodyWidth - 10)} height={Math.max(1, module.bodyHeight - 14)} fill="#526778" rx="1" />
            <rect x="6" y="8" width={Math.max(1, module.bodyWidth - 12)} height="12" fill={color} rx="1" />
          </pattern></defs>
          <rect width={width} height={height} fill="#17202a" stroke="#d3c8b4" stroke-width="8" />
          {#if fit.total > 0}
            <rect x={margin} y={height - margin - fit.usedHeight} width={fit.usedWidth} height={fit.usedHeight} fill="#7f97a8" opacity="0.5" />
            <rect x={margin} y={height - margin - fit.rows * module.bodyHeight} width={fit.columns * module.bodyWidth} height={fit.rows * module.bodyHeight} fill="url(#shelf-drawer-grid)" />
          {/if}
        </svg>
      </figure>
      <figure><figcaption>Side · rear aligned · {fit.totalDepth.toFixed(1)} mm with handle</figcaption>
        <svg viewBox={`${-25 - fit.depthOverflow} -12 ${depth + fit.depthOverflow + 50} ${viewHeight + 24}`} role="img" aria-label="Side view of drawer depth within shelf">
          <path d={`M 0 0 H ${depth} V ${height} H 0`} fill="none" stroke="#d3c8b4" stroke-width="8" />
          <rect x={depth - margin - module.depth} y={height - margin - module.bodyHeight} width={module.depth} height={module.bodyHeight} fill="#526778" stroke="#9bb0bf" />
          <rect x={depth - margin - fit.totalDepth} y={height - margin - module.bodyHeight + 8} width={module.handleProjection} height="16" fill={color} />
          <path d={`M 0 0 V ${height}`} stroke="#a6bed3" stroke-dasharray="4 4" />
        </svg>
        <span>{fit.depthOverflow > 0 ? `Projects ${fit.depthOverflow.toFixed(1)} mm beyond the shelf front` : `${(depth - margin - fit.totalDepth).toFixed(1)} mm depth remaining including handle`}</span>
      </figure>
    </div>
    {#if fit.total === 0}<p role="alert">The module does not fit the opening with this margin.</p>{/if}
    {#if fit.shellOverflow > 0}<p role="alert">The shell itself exceeds usable depth by {fit.shellOverflow.toFixed(1)} mm.</p>{/if}
  {:else}<p role="alert">Enter opening dimensions between 1 and 2000 mm and a margin between 0 and 100 mm.</p>{/if}
</div>

<style>
  .fitPreview { position:absolute; inset:0; z-index:50; background:var(--bg); overflow:auto; padding:1.25rem; box-sizing:border-box; display:flex; flex-direction:column; gap:1rem; }
  header { display:flex; justify-content:space-between; align-items:center; gap:1rem; } h2 { margin:0.25rem 0; } small { color:var(--fgMuted); }
  .controls { display:flex; flex-wrap:wrap; gap:0.75rem; align-items:end; } label { display:flex; flex-direction:column; gap:0.35rem; flex:1 1 120px; }
  input, button { font:inherit; color:var(--fg); background:var(--inputBg); border:var(--borderThin); border-radius:0.3rem; padding:0.5rem; } input { width:100%; box-sizing:border-box; } button { cursor:pointer; }
  .results { display:flex; flex-wrap:wrap; gap:0.5rem 1.5rem; padding:0.75rem; background:var(--contrastLow); border-radius:0.4rem; }
  .drawings { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; flex:1; min-height:280px; } figure { margin:0; display:flex; flex-direction:column; gap:0.5rem; min-width:0; } svg { width:100%; flex:1; min-height:240px; max-height:55vh; } figcaption { font-weight:600; } figure span { font-size:0.85rem; } [role='alert'] { color:#ef987d; }
  @media(max-width:700px) { .drawings { grid-template-columns:1fr; } }
</style>
