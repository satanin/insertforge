<script lang="ts">
  let { label, size }: { label: string; size: number[] } = $props();
</script>

<div class="uiDimensionReadout">
  <span class="uiDimensionLabel">{label}</span>
  <output class="uiDimensionMeasure" data-ui-measure>{#each size as value, index}{#if index > 0}{' × '}{/if}<span>{value.toFixed(2)}{#if index === size.length - 1}{' mm'}{/if}</span>{/each}</output>
</div>

<style>
  .uiDimensionReadout { display: grid; gap: 0.25rem; min-width: 0; }
  .uiDimensionLabel { color: var(--fgMuted); font-size: 0.75rem; }
  .uiDimensionMeasure { font-variant-numeric: tabular-nums; }
  .uiDimensionMeasure > span { white-space: nowrap; }
</style>
