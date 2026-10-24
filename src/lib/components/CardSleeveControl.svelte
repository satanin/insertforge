<script lang="ts">
  import { FormControl, Select } from '@tableslayer/ui';
  import { getProject, getCardSizes } from '$lib/stores/project.svelte';
  import { getCardSleeveThicknesses, projectSleeveOptions } from '$lib/utils/projectCards';
  import type { CardSleeveSelection, ProjectCardSleeve } from '$lib/types/project';
  let {
    selection,
    label = 'Sleeves',
    onChange
  }: {
    selection: CardSleeveSelection & { cardSizeId: string };
    label?: string;
    onChange: (value: CardSleeveSelection) => void;
  } = $props();
  const settings = $derived(getCardSleeveThicknesses(getProject()));
  const snapshot = $derived(selection.cardSizeId.startsWith('inventory-'));
  const thickness = $derived(getCardSizes().find((card) => card.id === selection.cardSizeId)?.thickness);
  function change(sleeve: ProjectCardSleeve) {
    onChange({ sleeve, cardThicknessOverride: undefined });
  }
</script>

<div class="cardSleeveControl">
  {#if snapshot}
    <small>Inventory measurements · {thickness} mm per card</small>
  {:else}
    <FormControl {label} name={label}>
      {#snippet input({ inputProps })}
        <Select
          {...inputProps}
          selected={[selection.sleeve ?? 'normal']}
          options={projectSleeveOptions.map((option) => ({
            value: option.value,
            label: `${option.label} · ${settings[option.value]} mm`
          }))}
          onSelectedChange={(values) => {
            if (values[0]) change(values[0] as ProjectCardSleeve);
          }}
        />
      {/snippet}
    </FormControl>
    {#if selection.cardThicknessOverride !== undefined}
      <small>Saved custom thickness: {selection.cardThicknessOverride} mm.</small>
      <button type="button" onclick={() => change(selection.sleeve ?? 'normal')}>Use project thickness</button>
    {/if}
  {/if}
</div>

<style>
  .cardSleeveControl {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
    margin-block: 0.5rem;
  }
  small {
    color: var(--fgMuted);
    font-size: 0.75rem;
  }
  button {
    cursor: pointer;
    color: var(--fgPrimary);
    font-size: 0.75rem;
    text-align: left;
  }
</style>
