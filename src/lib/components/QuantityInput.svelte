<script lang="ts">
  import { Input } from '@tableslayer/ui';
  import { interfaceUi } from '$lib/stores/interface.svelte';

  let {
    value,
    onChange,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
    label,
    id,
    legacyStyle,
    class: className = ''
  }: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    label: string;
    id?: string;
    legacyStyle?: string;
    class?: string;
  } = $props();

  function commit(input: HTMLInputElement) {
    const parsed = input.valueAsNumber;
    const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : value;
    input.value = String(next);
    if (next !== value) onChange(next);
  }
</script>

{#if interfaceUi.mode === 'modern'}
  <div class="quantityInput {className}">
    <button
      type="button"
      aria-label={`Decrease ${label}`}
      disabled={value <= min}
      onclick={() => onChange(Math.max(min, value - 1))}
    >
      −
    </button>
    <Input
      {id}
      aria-label={label}
      type="number"
      {min}
      {max}
      step="1"
      {value}
      onchange={(e) => commit(e.currentTarget)}
    />
    <button
      type="button"
      aria-label={`Increase ${label}`}
      disabled={value >= max}
      onclick={() => onChange(Math.min(max, value + 1))}
    >
      +
    </button>
  </div>
{:else}
  <Input
    {id}
    aria-label={label}
    type="number"
    {min}
    {max}
    step="1"
    {value}
    onchange={(e) => commit(e.currentTarget)}
    class={className}
    style={legacyStyle}
  />
{/if}

<style>
  .quantityInput {
    display: grid;
    grid-template-columns: 2rem minmax(2rem, 1fr) 2rem;
    min-width: 0;
  }
  button {
    display: grid;
    place-items: center;
    padding: 0;
    text-align: center;
    line-height: 1;
    background: var(--inputBg);
    color: var(--fg);
    border: var(--borderThin);
    border-radius: var(--radius-2) 0 0 var(--radius-2);
    font: inherit;
    cursor: pointer;
  }
  button:last-child {
    border-radius: 0 var(--radius-2) var(--radius-2) 0;
  }
  button:hover:not(:disabled) {
    background: var(--contrastLow);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .quantityInput :global(input) {
    text-align: center;
    font-variant-numeric: tabular-nums;
    border-radius: 0;
    padding-inline: 0.25rem;
    appearance: textfield;
  }
  .quantityInput :global(input::-webkit-inner-spin-button) {
    appearance: none;
  }
  button:focus-visible {
    outline: 2px solid var(--fgPrimary);
    outline-offset: -2px;
  }
</style>
