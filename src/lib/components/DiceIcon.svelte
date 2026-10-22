<script lang="ts">
  import type { DiceKind } from '$lib/types/project';
  let { kind, size = 24 }: { kind: DiceKind; size?: number } = $props();
</script>

<span aria-hidden="true" class="diceIcon" style:width="{size}px" style:height="{size}px" style:mask-image="url('/icons/dice/{kind}.svg')"></span>

<style>
  .diceIcon {
    display: inline-block;
    flex-shrink: 0;
    background: currentColor;
    mask-size: contain;
    mask-mode: luminance;
    mask-position: center;
    mask-repeat: no-repeat;
  }
</style>
