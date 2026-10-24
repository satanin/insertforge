<script lang="ts">
  import QuantityInput from './QuantityInput.svelte';
  import { getProject, setInventoryContent } from '$lib/stores/project.svelte';
  import type { InventoryAssignment } from '$lib/types/project';
  import {
    availableQuantity,
    compatibleInventory,
    groupAssignments,
    inventoryTargets,
    missingMeasurements
  } from '$lib/utils/inventory';
  import { inventoryUi } from '$lib/stores/inventoryUi.svelte';

  let { targetId }: { targetId: string } = $props();
  const project = $derived(getProject());
  const target = $derived(inventoryTargets(project).find((t) => t.item.id === targetId));
  const assignments = $derived(target?.item.inventoryAssignments ?? []);
  const groups = $derived((project.inventory ?? []).filter((g) => target && compatibleInventory(target.type, g)));
  let editing = $state(false);
  let draft = $state<InventoryAssignment[]>([]);
  let error = $state('');
  let message = $state('');
  const stale = $derived(
    assignments.some((a) => project.inventory?.find((g) => g.id === a.groupId)?.revision !== a.revision)
  );

  function start() {
    draft = assignments.map((a) => ({ ...a }));
    editing = true;
    error = '';
    message = '';
  }
  function toggle(id: string, checked: boolean) {
    draft = draft.filter((a) => a.groupId !== id);
    if (checked)
      draft.push({ groupId: id, quantity: Math.max(0, availableQuantity(project, id, targetId)), revision: 0 });
  }
  function apply(content = draft) {
    error = setInventoryContent(targetId, content) ?? '';
    if (!error) {
      editing = false;
      message = content.length
        ? 'Inventory dimensions and quantities applied.'
        : 'Manual configuration. Inventory quantities released; current geometry kept.';
    }
  }
</script>

{#if target}
  <section class="inventoryContent" aria-label="Inventory content">
    <div class="title">
      <h3>Content</h3>
      <button onclick={() => (inventoryUi.open = true)}>Inventory</button>
    </div>
    {#if !editing}
      {#each assignments as assignment (assignment.groupId)}
        {@const group = project.inventory?.find((g) => g.id === assignment.groupId)}
        <div class="assigned">
          <span>{group?.name || 'Unnamed group'}</span>
          <strong>{assignment.quantity}</strong>
        </div>
      {:else}<p>Manual configuration. You can use groups from the game inventory instead.</p>{/each}
      {#if stale}<p class="warning">Inventory measurements changed. Reapply the content to update this piece.</p>{/if}
      <div class="buttons">
        <button onclick={start}>{assignments.length ? 'Change inventory content' : 'Select from inventory'}</button>
        {#if assignments.length}<button onclick={() => apply(assignments)}>Reapply</button>
          <button onclick={() => apply([])}>Use manual configuration</button>{/if}
      </div>
      {#if assignments.length}<small>
          Applied as a snapshot. Manual geometry edits remain possible; reapplying replaces the content dimensions.
        </small>{/if}
    {:else}
      {#each groups as group (group.id)}
        {@const selected = draft.find((a) => a.groupId === group.id)}
        {@const elsewhere = groupAssignments(project, group.id, targetId)}
        {@const available = availableQuantity(project, group.id, targetId)}
        <div class="choice">
          <label class="check">
            <input
              type="checkbox"
              checked={!!selected || available <= 0}
              disabled={!selected && available <= 0}
              onchange={(e) => toggle(group.id, e.currentTarget.checked)}
            />
            <span>
              {group.name || 'Unnamed group'}
              <small>{available} available · {group.quantity} total</small>
            </span>
          </label>
          {#if selected}<label class="count">
              In this piece
              <QuantityInput
                max={available}
                label={`Quantity of ${group.name}`}
                value={selected.quantity}
                onChange={(value) => {
                  selected.quantity = value;
                }}
              />
            </label>
            {#if target.type === 'counter' || target.type === 'playerBoard'}
              <label class="count">
                Loading
                <select
                  aria-label={`Loading for ${group.name}`}
                  value={selected.loading ?? 'top'}
                  onchange={(e) => (selected.loading = e.currentTarget.value as 'top' | 'edge')}
                >
                  <option value="top">Top-loaded</option>
                  <option value="edge">Edge-loaded</option>
                </select>
              </label>
              {#if selected.loading === 'edge'}
                <label class="count">
                  Orientation
                  <select
                    aria-label={`Edge orientation for ${group.name}`}
                    value={selected.edgeOrientation ?? 'lengthwise'}
                    onchange={(e) => (selected.edgeOrientation = e.currentTarget.value as 'lengthwise' | 'crosswise')}
                  >
                    <option value="lengthwise">Lengthwise</option>
                    <option value="crosswise">Crosswise</option>
                  </select>
                </label>
              {/if}
            {/if}
          {/if}
          {#each elsewhere as assignment (assignment.targetId)}<small class="elsewhere">
              {assignment.quantity} in {assignment.name}
            </small>{/each}
          {#if selected && missingMeasurements(group)}<small class="warning">
              Measurements pending — complete them in Inventory.
            </small>{/if}
        </div>
      {:else}<p>No compatible groups yet. Add components to the inventory first.</p>{/each}
      {#if target.type === 'cup'}<small>
          Cups use a conservative, single-layer arrangement of rectangular envelopes, one compartment per group. Review
          the dimensions before printing.
        </small>
      {:else if target.type === 'cardStorage' || target.type === 'cardDraw'}<small>
          Selected card groups share one slot and must have identical card dimensions.
        </small>
      {:else if target.type === 'cardDivider' || target.type === 'cardWell' || target.type === 'counter'}<small>
          One compartment / stack per group.
        </small>{/if}
      <div class="buttons">
        <button onclick={() => apply()}>Apply content</button>
        <button onclick={() => (editing = false)}>Cancel</button>
      </div>
    {/if}
    {#if error}<p class="warning" role="alert">{error}</p>{/if}
    {#if message}<small role="status">{message}</small>{/if}
  </section>
{/if}

<style>
  .inventoryContent {
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.75rem;
    margin-bottom: 1rem;
    background: var(--contrastLowest);
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  h3 {
    font-size: 0.875rem;
    margin: 0;
  }
  p {
    margin: 0.5rem 0;
    font-size: 0.8125rem;
    color: var(--fgMuted);
  }
  small {
    display: block;
    color: var(--fgMuted);
    font-size: 0.75rem;
    margin-top: 0.35rem;
  }
  .buttons {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }
  button {
    border: var(--borderThin);
    border-radius: var(--radius-1);
    padding: 0.35rem 0.5rem;
    background: var(--contrastLow);
    color: var(--fg);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  button:hover {
    background: var(--contrastMedium);
  }
  .assigned {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .choice {
    padding: 0.65rem 0;
    border-bottom: var(--borderThin);
  }
  .check {
    display: flex;
    gap: 0.5rem;
    align-items: start;
    font-size: 0.8125rem;
  }
  .check input {
    margin-top: 0.3rem;
    display: block;
    position: static;
    appearance: auto;
    opacity: 1;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
  .count {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }
  .count :global(input) {
    width: 5rem;
    padding: 0.35rem;
    border: var(--borderThin);
    border-radius: var(--radius-1);
    background: var(--contrastEmpty);
    color: var(--fg);
    font: inherit;
  }
  .count select {
    max-width: 65%;
    padding: 0.35rem;
    border: var(--borderThin);
    border-radius: var(--radius-1);
    background: var(--contrastEmpty);
    color: var(--fg);
    font: inherit;
  }
  .elsewhere {
    overflow-wrap: anywhere;
  }
  .warning {
    color: #df665c;
  }
</style>
