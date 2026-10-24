<script lang="ts">
  import type { Snippet } from 'svelte';
  import { interfaceUi } from '$lib/stores/interface.svelte';

  let {
    title,
    summary,
    open = true,
    children
  }: {
    title: string;
    summary?: string;
    open?: boolean;
    children: Snippet;
  } = $props();
</script>

{#if interfaceUi.mode === 'modern'}
  <details class="editorSectionGroup" {open}>
    <summary>
      <span>
        {title}{#if summary}<small>{summary}</small>{/if}
      </span>
    </summary>
    <div class="editorSectionBody">{@render children()}</div>
  </details>
{:else}
  {@render children()}
{/if}

<style>
  .editorSectionGroup {
    border-bottom: var(--borderThin);
  }
  summary {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 1rem 0.9rem;
    list-style: none;
    cursor: pointer;
    font-weight: 600;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::before {
    content: '›';
    color: var(--fgMuted);
    font-size: 1.2rem;
  }
  details[open] > summary::before {
    transform: rotate(90deg);
  }
  small {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--fgMuted);
  }
  .editorSectionBody {
    padding: 0 0 0.8rem;
  }
  .editorSectionBody :global(.sectionTitle),
  .editorSectionBody :global(.editorSection > h3) {
    display: none;
  }
  .editorSectionBody :global(.section) {
    margin-bottom: 0;
  }
  summary:focus-visible {
    outline: 2px solid var(--fgPrimary);
    outline-offset: -3px;
  }
</style>
