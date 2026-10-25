<script lang="ts">
  import HelpRow from '$lib/components/HelpRow.svelte';
  import HelpTip from '$lib/components/HelpTip.svelte';
  import { Input, FormControl } from '@tableslayer/ui';
  import { getOuterCornerRadius } from '$lib/models/outerCorners';
  let {
    value,
    width,
    depth,
    margin,
    onchange
  }: {
    value: number | undefined;
    width: number;
    depth: number;
    margin: number;
    onchange: (value: number) => void;
  } = $props();
</script>

<div class="corners">
  <HelpRow>
<FormControl label="Outer corner radius" name="outerCornerRadius">
    {#snippet input({ inputProps })}
      <Input
        {...inputProps}
        type="number"
        min="0"
        step="0.5"
        value={value ?? 0}
        onchange={(e) => {
          const number = Number(e.currentTarget.value);
          onchange(Number.isFinite(number) ? Math.max(0, number) : 0);
        }}
      />
    {/snippet}
    {#snippet end()}mm{/snippet}
  </FormControl>
<HelpTip label="Help: Outer corner radius">
    0 keeps square corners. Applied radius: {getOuterCornerRadius(value, width, depth, margin).toFixed(1)} mm, limited to
    protect cavities and fittings. Top and bottom stay flat.
  </HelpTip>
</HelpRow>

</div>

<style>
  .corners {
    min-width: 0;
  }
</style>
