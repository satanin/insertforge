<script lang="ts">
  import HelpRow from '$lib/components/HelpRow.svelte';
  import HelpTip from '$lib/components/HelpTip.svelte';
  import { IconChevronDown } from '@tabler/icons-svelte';
  export type TextMode = 'engraved' | 'inlay' | 'raised';
  let { label, mode, color, onMode, onColor }: {
    label: string; mode: TextMode; color: string;
    onMode: (mode: TextMode) => void; onColor: (color: string) => void;
  } = $props();
</script>

<label>{label} text mode
  <span class="selectControl">
    <select value={mode} onchange={(e) => onMode(e.currentTarget.value as TextMode)}>
      <option value="engraved">Engraved</option>
      <option value="inlay">Inlay (multicolour)</option>
      <option value="raised">Raised / extruded</option>
    </select>
    <IconChevronDown size={16} aria-hidden="true" />
  </span>
</label>
{#if mode !== 'engraved'}
  <HelpRow>
<label>{label} text colour
    <input type="color" value={color} oninput={(e) => onColor(e.currentTarget.value)} />
  </label>
<HelpTip label="Help: Text style and colour">3MF keeps the text as a separate body with the selected colour. STL combines the geometry without colour. Inlay is flush (0.4 mm); raised text is 0.6 mm high.</HelpTip>
</HelpRow>

{/if}

<style>
  label { display: grid; gap: .4rem; font-size: .875rem; }
  .selectControl { position: relative; display: flex; align-items: center; }
  select { appearance: none; width: 100%; padding: .5rem 2rem .5rem .65rem; background: var(--contrastLow); color: var(--fg); border: 1px solid var(--contrastMedium); border-radius: var(--radius-2); }
  .selectControl :global(svg) { position: absolute; right: .6rem; pointer-events: none; }
  input { appearance: auto; width: 3rem; height: 2rem; padding: .15rem; border: 1px solid var(--fgMuted); border-radius: var(--radius-2); cursor: pointer; }
  select:focus-visible, input:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
</style>
