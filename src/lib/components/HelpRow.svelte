<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="helpRow">{@render children()}</div>

<style>
  .helpRow { display: flex; align-items: center; gap: 0.5rem; min-width: 0; max-width: 100%; }
  .helpRow > :global(:not(.helpTip)) { min-width: 0; }
  .helpRow > :global(.helpTip) { flex: 0 0 auto; }
  .helpRow > :global(.control), .helpRow > :global(.modeLabel) { flex: 1; }
  .helpRow > :global(h3), .helpRow > :global(h4), .helpRow > :global(p) { margin-block: 0; }
  .helpRow:has(> :global(.control)) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 0.5rem;
    row-gap: var(--size-1);
    width: 100%;
  }
  .helpRow:has(> :global(.control input[type='number'])) { max-width: min(100%, 11.5rem); }
  .helpRow > :global(.control) { display: contents; }
  .helpRow > :global(.control > .control__label) { grid-column: 1; grid-row: 1; }
  .helpRow > :global(.control > .control__inputWrapper) { grid-column: 1 / -1; grid-row: 2; }
  .helpRow > :global(.control > .control__error) { grid-column: 1 / -1; grid-row: 3; }
  .helpRow:has(> :global(.control)) > :global(.helpTip) { grid-column: 2; grid-row: 1; }
</style>
