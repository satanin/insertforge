<script lang="ts">
  import type { Snippet } from 'svelte';
  import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom';

  let { label = 'Help', children }: { label?: string; children: Snippet } = $props();
  const id = $props.id();
  let trigger: HTMLButtonElement;
  let popup: HTMLDivElement;
  let open = $state(false);
  let pinned = $state(false);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function show() { clearTimeout(closeTimer); open = true; }
  function close() { clearTimeout(closeTimer); open = false; pinned = false; }
  function leave() {
    clearTimeout(closeTimer);
    if (!pinned) closeTimer = setTimeout(() => { open = false; }, 150);
  }

  $effect(() => {
    if (!open || !trigger || !popup) return;
    popup.style.visibility = 'hidden';
    popup.showPopover();
    const update = () => {
      void computePosition(trigger, popup, {
        strategy: 'fixed', placement: 'left-start', middleware: [flip({ padding: 12 }), shift({ padding: 12, crossAxis: true })]
      }).then(({ x, y }) => {
        popup.style.left = `${x}px`; popup.style.top = `${y}px`;
        popup.style.visibility = 'visible';
      });
    };
    const cleanup = autoUpdate(trigger, popup, update);
    const outside = (event: PointerEvent) => {
      if (!trigger.contains(event.target as Node) && !popup.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      cleanup(); popup.hidePopover(); clearTimeout(closeTimer);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  });
</script>

<span class="helpTip">
  <button bind:this={trigger} type="button" class="helpTipButton" aria-label={label}
    aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined}
    onpointerenter={(event) => { if (event.pointerType !== 'touch') show(); }} onpointerleave={leave}
    onfocus={show} onblur={leave} onclick={() => { if (pinned) close(); else { pinned = true; show(); } }}>?</button>
  <div bind:this={popup} {id} class="helpTipContent" popover="manual" role="tooltip"
    onpointerenter={show} onpointerleave={leave}>{@render children()}</div>
</span>

<style>
  .helpTip { display: inline-flex; vertical-align: middle; width: fit-content; }
  .helpTipButton {
    display: inline-grid; place-items: center; width: 1.75rem; height: 1.75rem;
    padding: 0; border: 1px solid var(--inputBorder, #aab8cc); border-radius: 50%;
    background: var(--inputBg, #f5f7fb); color: var(--fg, #172b45);
    font: 600 0.875rem/1 sans-serif; cursor: help;
  }
  .helpTipButton:hover, .helpTipButton[aria-expanded='true'] { border-color: var(--modernAccent, #4169a0); }
  .helpTipButton:focus-visible { outline: 2px solid var(--modernAccent, #4169a0); outline-offset: 2px; }
  .helpTipContent {
    position: fixed; inset: auto; margin: 0; box-sizing: border-box;
    width: min(22rem, calc(100vw - 24px)); max-height: min(28rem, calc(100dvh - 24px));
    overflow: auto; padding: 0.85rem 1rem; border: 1px solid var(--inputBorder, #aab8cc);
    border-radius: 0.5rem; background: var(--bg, #fff); color: var(--fg, #172b45);
    box-shadow: 0 6px 24px #0003; font-size: 0.875rem; font-weight: 400; line-height: 1.5;
    text-align: left; white-space: normal;
  }
  @media (pointer: coarse) { .helpTipButton { width: 2.25rem; height: 2.25rem; } }
</style>
