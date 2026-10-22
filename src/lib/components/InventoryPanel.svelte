<script lang="ts">
  import DiceIcon from './DiceIcon.svelte';
  import { tick } from 'svelte';
  import {
    addInventoryGroup,
    deleteInventoryGroup,
    getProject,
    updateInventoryGroup
  } from '$lib/stores/project.svelte';
  import type { CardSleeve, DiceKind, InventoryGroup, InventoryKind } from '$lib/types/project';
  import {
    groupAssignments,
    inventoryKinds,
    missingMeasurements,
    sleeveOptions,
    sleeveThickness
  } from '$lib/utils/inventory';

  let { open = $bindable(false) }: { open?: boolean } = $props();
  let dialog: HTMLDialogElement;
  let error = $state('');
  const project = $derived(getProject());
  const groups = $derived(project.inventory ?? []);
  const sizes = $derived(
    project.cardSizes.filter((s) => !s.id.startsWith('inventory-') && !s.name.endsWith(' Premium'))
  );
  const shapes = $derived(project.counterShapes.filter((s) => !s.id.startsWith('inventory-')));
  $effect(() => {
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  });

  function update(g: InventoryGroup, changes: Partial<InventoryGroup>) {
    error = updateInventoryGroup(g.id, changes) ?? '';
  }
  function measure(
    g: InventoryGroup,
    key: 'width' | 'depth' | 'thickness' | 'height' | 'baseDiameter' | 'baseThickness',
    input: HTMLInputElement
  ) {
    update(g, { [key]: input.value === '' ? undefined : input.valueAsNumber });
    input.value = String(g[key] ?? '');
  }
  async function add(kind: InventoryKind, source?: string) {
    const group = addInventoryGroup(kind, source);
    error = '';
    await tick();
    dialog.querySelector<HTMLInputElement>(`[data-group="${group.id}"] .groupName`)?.focus();
  }
  function changeSize(g: InventoryGroup, id: string) {
    const size = project.cardSizes.find((s) => s.id === id);
    update(g, { cardSizeId: id, width: size?.width, depth: size?.length });
  }
  function changeShape(g: InventoryGroup, id: string) {
    const shape = shapes.find((s) => s.id === id);
    update(g, {
      shapeId: id,
      baseShape: shape?.baseShape ?? 'rectangle',
      pointyTop: shape?.pointyTop,
      width: shape?.width,
      depth: shape?.length,
      thickness: shape?.thickness
    });
  }
</script>

{#snippet measurement(
  g: InventoryGroup,
  key: 'width' | 'depth' | 'thickness' | 'height' | 'baseDiameter' | 'baseThickness',
  label: string
)}
  <label>
    {label}
    <input
      type="number"
      min="0.01"
      step="any"
      placeholder="Pending"
      value={g[key] ?? ''}
      onchange={(e) => measure(g, key, e.currentTarget)}
    />
  </label>
{/snippet}

<dialog bind:this={dialog} class="inventoryDialog" aria-labelledby="inventory-title" onclose={() => (open = false)}>
  <header>
    <div>
      <h2 id="inventory-title">Game components</h2>
      <p>Record quantities from the manual; complete measurements as you go. All measurements in mm.</p>
    </div>
    <button onclick={() => (open = false)} aria-label="Close inventory">Close</button>
  </header>
  <div class="inventoryBody">
    {#if project.inventoryCardDefaults}
      <p class="defaults">
        New card groups inherit the first group's format and sleeve choice. Each group can override them.
      </p>
    {/if}
    <div class="inventoryRows">
      <div class="inventoryRow headings" aria-hidden="true">
        <span>Type</span>
        <span>Group name</span>
        <span>Format & measurements</span>
        <span>Quantity</span>
        <span>Assigned to</span>
        <span>Actions</span>
      </div>
      {#each groups as group (group.id)}
        {@const assignments = groupAssignments(project, group.id)}
        {@const assigned = assignments.reduce((n, a) => n + a.quantity, 0)}
        <div class="inventoryRow" data-group={group.id}>
          <label class="typeField">
            <span class="mobileLabel">Type</span>
            <select
              aria-label="Component type"
              value={group.kind}
              onchange={(e) => {
                update(group, { kind: e.currentTarget.value as InventoryKind });
                e.currentTarget.value = group.kind;
              }}
            >
              {#each inventoryKinds as kind (kind.value)}<option value={kind.value}>{kind.label}</option>{/each}
            </select>
          </label>
          <label class="nameField">
            <span class="mobileLabel">Group name</span>
            <input
              class="groupName"
              aria-label="Group name"
              placeholder="e.g. Starting cards"
              value={group.name}
              oninput={(e) => update(group, { name: e.currentTarget.value })}
            />
          </label>
          <div class="parameters">
            {#if group.kind === 'cards'}
              <div class="fields">
                <label>
                  Card format
                  <select
                    aria-label="Card format"
                    value={sizes.find((s) => s.id === group.cardSizeId)?.id ??
                      sizes.find(
                        (s) => project.cardSizes.find((p) => p.id === group.cardSizeId)?.name === `${s.name} Premium`
                      )?.id ??
                      ''}
                    onchange={(e) => changeSize(group, e.currentTarget.value)}
                  >
                    <option value="">Custom measurements</option>
                    {#each sizes as size (size.id)}<option value={size.id}>{size.name}</option>{/each}
                  </select>
                </label>
                <label>
                  Sleeves
                  <select
                    aria-label="Sleeves"
                    value={group.sleeve ?? 'normal'}
                    onchange={(e) => {
                      const sleeve = e.currentTarget.value as CardSleeve;
                      update(group, { sleeve, thickness: sleeveThickness[sleeve] });
                    }}
                  >
                    {#each sleeveOptions as option (option.value)}<option value={option.value}>
                        {option.label}
                      </option>{/each}
                  </select>
                </label>
              </div>
              {#if group.sleeve === 'manual'}{@render measurement(group, 'thickness', 'Thickness per card')}{/if}
              <details>
                <summary>Actual measurements / thickness</summary>
                <div class="fields measurements">
                  {@render measurement(group, 'width', 'Width incl. sleeve')}{@render measurement(
                    group,
                    'depth',
                    'Length incl. sleeve'
                  )}
                  {#if group.sleeve !== 'manual'}{@render measurement(group, 'thickness', 'Thickness per card')}{/if}
                  <label>
                    Full stack thickness
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Measure the full group"
                      value={group.thickness ? Number((group.thickness * group.quantity).toFixed(3)) : ''}
                      onchange={(e) => {
                        const value = e.currentTarget.valueAsNumber;
                        update(group, { sleeve: 'manual', thickness: value / group.quantity });
                      }}
                    />
                  </label>
                </div>
                <small>
                  Preset thickness is an estimate. Actual measurements include sleeves; printing clearance is set in the
                  piece.
                </small>
              </details>
            {:else if group.kind === 'tokens' || group.kind === 'boards'}
              <label>
                Project shape
                <select
                  aria-label="Project shape"
                  value={group.shapeId ?? ''}
                  onchange={(e) => changeShape(group, e.currentTarget.value)}
                >
                  <option value="">Custom rectangle</option>
                  {#each shapes.filter( (s) => (group.kind === 'boards' ? s.category === 'playerBoard' : (s.category ?? 'counter') !== 'playerBoard') ) as shape (shape.id)}
                    <option value={shape.id}>{shape.name} · {shape.baseShape}</option>{/each}
                </select>
              </label>
              <div class="fields measurements">
                {@render measurement(
                  group,
                  'width',
                  group.baseShape === 'circle' ? 'Diameter' : group.baseShape === 'hex' ? 'Across flats' : 'Width'
                )}
                {#if group.baseShape !== 'circle' && group.baseShape !== 'square' && group.baseShape !== 'hex'}{@render measurement(
                    group,
                    'depth',
                    'Length'
                  )}{/if}
                {@render measurement(group, 'thickness', 'Thickness')}
              </div>
            {:else if group.kind === 'dice'}
              <DiceIcon kind={group.diceKind ?? 'd6'} />
              <div class="fields">
                <label>Project size
                  <select aria-label="Project dice size" value="" onchange={(e) => {
                    const die = project.diceSizes?.find(d => d.id === e.currentTarget.value);
                    if (die) update(group, { diceKind: die.kind, width: die.size });
                  }}>
                    <option value="">Copy measurements from…</option>
                    {#each project.diceSizes ?? [] as die (die.id)}<option value={die.id}>{die.name} ({die.kind}, {die.size} mm)</option>{/each}
                  </select>
                </label>
                <label>
                  Die type
                  <select
                    aria-label="Die type"
                    value={group.diceKind ?? 'd6'}
                    onchange={(e) => update(group, { diceKind: e.currentTarget.value as DiceKind })}
                  >
                    {#each ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as die (die)}<option value={die}>
                        {die}
                      </option>{/each}
                  </select>
                </label>
                {@render measurement(group, 'width', (group.diceKind ?? 'd6') === 'd6' ? 'Side (face to face)' : 'Maximum outer size')}
              </div>
              <small>For d6 measure one side, face to face. For other dice measure the greatest distance between points, including tips. Project sizes copy measurements; later edits do not change this group.</small>
            {:else if group.kind === 'miniatures'}
              <div class="fields measurements">
                {@render measurement(group, 'baseDiameter', 'Base diameter')}{@render measurement(
                  group,
                  'baseThickness',
                  'Base thickness'
                )}
                {@render measurement(group, 'width', 'Full width')}{@render measurement(
                  group,
                  'depth',
                  'Full depth'
                )}{@render measurement(group, 'height', 'Full height')}
              </div>
            {:else}
              <div class="fields measurements">
                {@render measurement(group, 'width', 'Width')}{@render measurement(
                  group,
                  'depth',
                  'Depth'
                )}{@render measurement(group, 'height', 'Height')}
              </div>
            {/if}
            {#if missingMeasurements(group)}<small class="pending">Measurements pending</small>{/if}
          </div>
          <label class="quantityField">
            <span class="mobileLabel">Quantity</span>
            <input
              aria-label="Group quantity"
              type="number"
              min={Math.max(1, assigned)}
              step="1"
              value={group.quantity}
              onchange={(e) => {
                update(group, { quantity: e.currentTarget.valueAsNumber });
                e.currentTarget.value = String(group.quantity);
              }}
            />
          </label>
          <div class="assignments">
            <strong>{assigned} / {group.quantity}</strong>
            <small>{group.quantity - assigned} unassigned</small>
            {#each assignments as assignment (assignment.targetId)}<div class="assignment">
                <span>{assignment.name}</span>
                <strong>{assignment.quantity}</strong>
              </div>{/each}
          </div>
          <div class="actions">
            <button onclick={() => add(group.kind, group.id)}>Duplicate</button>
            <button disabled={assigned > 0} onclick={() => (error = deleteInventoryGroup(group.id) ?? '')}>
              Delete
            </button>
          </div>
        </div>
      {:else}<p class="empty">Add your first group of components. You can leave measurements pending.</p>{/each}
    </div>
    <footer>
      <button onclick={() => add('cards')}>+ Cards</button>
      <button onclick={() => add('tokens')}>+ Tokens / tiles</button>
      <button onclick={() => add('dice')}>+ Dice</button>
      <button onclick={() => add('boards')}>+ Boards</button>
      <button onclick={() => add('miniatures')}>+ Miniatures</button>
      <button onclick={() => add('other')}>+ Other</button>
      <small>Saved automatically in this project</small>
    </footer>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
</dialog>

<style>
  .inventoryDialog {
    width: min(1280px, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    background: var(--contrastEmpty);
    color: var(--fg);
  }
  .inventoryDialog::backdrop {
    background: #0008;
  }
  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: var(--borderThin);
  }
  h2 {
    font-size: 1.125rem;
    margin: 0;
  }
  p {
    margin: 0.4rem 0 0;
    color: var(--fgMuted);
    font-size: 0.875rem;
  }
  .inventoryBody {
    padding: 0 1.25rem 1.25rem;
  }
  .defaults {
    padding: 0.75rem 0;
  }
  .inventoryRow {
    display: grid;
    grid-template-columns: 130px minmax(130px, 1fr) minmax(260px, 2fr) 80px minmax(140px, 1fr) 90px;
    gap: 0.75rem;
    padding: 1rem 0;
    border-bottom: var(--borderThin);
    align-items: start;
  }
  .headings {
    padding: 0.75rem 0;
    color: var(--fgMuted);
    font-size: 0.75rem;
  }
  input,
  select {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: 2.2rem;
    padding: 0.4rem 0.5rem;
    border: var(--borderThin);
    border-radius: var(--radius-1);
    font: inherit;
    color: var(--fg);
    background: var(--contrastLowest);
  }
  label {
    display: block;
    min-width: 0;
    font-size: 0.75rem;
  }
  label input,
  label select {
    font-size: 0.8125rem;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .measurements {
    margin-top: 0.5rem;
  }
  .parameters > label {
    margin-bottom: 0.5rem;
  }
  details {
    margin-top: 0.5rem;
  }
  summary {
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--fgMuted);
  }
  .typeField,
  .nameField,
  .quantityField,
  .assignments,
  .actions {
    padding-top: 0.9rem;
  }
  small {
    display: block;
    font-size: 0.75rem;
    color: var(--fgMuted);
    margin-top: 0.3rem;
  }
  .pending {
    font-style: italic;
  }
  .assignments {
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
  }
  .assignment {
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    padding-top: 0.5rem;
  }
  .actions {
    display: grid;
    gap: 0.5rem;
  }
  button {
    padding: 0.4rem 0.65rem;
    border: var(--borderThin);
    border-radius: var(--radius-1);
    color: var(--fg);
    background: var(--contrastLow);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  button:hover {
    background: var(--contrastMedium);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  footer {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    padding-top: 1rem;
  }
  .error {
    color: #df665c;
  }
  .mobileLabel {
    display: none;
  }
  .empty {
    padding: 1rem 0;
  }
  @media (max-width: 1050px) {
    .inventoryRow {
      grid-template-columns: 110px 1fr 80px;
    }
    .headings {
      display: none;
    }
    .mobileLabel {
      display: block;
    }
    .typeField,
    .nameField,
    .quantityField,
    .assignments,
    .actions {
      padding-top: 0;
    }
    .parameters {
      grid-column: 1 / -1;
      grid-row: 2;
    }
    .quantityField {
      grid-column: 3;
      grid-row: 1;
    }
    .assignments {
      grid-column: 1 / 3;
    }
    .actions {
      grid-column: 3;
    }
  }
  @media (max-width: 480px) {
    .inventoryDialog {
      width: calc(100vw - 0.5rem);
    }
    .inventoryBody,
    header {
      padding: 0.75rem;
    }
    .inventoryRow {
      grid-template-columns: 90px minmax(0, 1fr) 64px;
      gap: 0.4rem;
    }
    input,
    select {
      font-size: 16px !important;
    }
  }
</style>
