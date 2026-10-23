<script lang="ts">
  import { IconHelpCircle } from '@tabler/icons-svelte';
  import DiceIcon from './DiceIcon.svelte';
  import { tick } from 'svelte';
  import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
  import {
    addInventoryGroup,
    deleteInventoryGroup,
    getProject,
    updateInventoryGroup
  } from '$lib/stores/project.svelte';
  import type { CardSleeve, InventoryGroup, InventoryKind } from '$lib/types/project';
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
  function positionHelp(node: HTMLSpanElement) {
    const button = node.querySelector('button')!;
    const tooltip = node.querySelector<HTMLElement>('[role="tooltip"]')!;
    let stop: (() => void) | undefined;
    const reposition = async () => {
      const boundary = node.closest('dialog')!;
      const { x, y } = await computePosition(button, tooltip, {
        strategy: 'fixed',
        placement: 'bottom-start',
        middleware: [offset(6), flip({ boundary, padding: 8 }), shift({ boundary, padding: 8, crossAxis: true })]
      });
      Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px` });
    };
    const show = () => {
      stop ??= autoUpdate(button, tooltip, reposition);
    };
    const hide = () => {
      if (node.matches(':hover, :focus-within')) return;
      stop?.();
      stop = undefined;
    };
    node.addEventListener('mouseenter', show);
    node.addEventListener('focusin', show);
    node.addEventListener('mouseleave', hide);
    node.addEventListener('focusout', hide);
    return {
      destroy() {
        stop?.();
        node.removeEventListener('mouseenter', show);
        node.removeEventListener('focusin', show);
        node.removeEventListener('mouseleave', hide);
        node.removeEventListener('focusout', hide);
      }
    };
  }
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
    update(g, { cardSizeId: id, ...(size ? { width: size.width, depth: size.length } : {}) });
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

{#snippet help(text: string)}
  <span class="help" use:positionHelp>
    <button type="button" class="helpButton" aria-label="Help: {text}">
      <IconHelpCircle size={28} stroke={1.75} aria-hidden="true" />
    </button>
    <span class="helpText" role="tooltip">{text}</span>
  </span>
{/snippet}

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
      <p>All measurements in mm. {@render help("Record quantities from the manual and complete measurements as you go. New card groups inherit the first group's format and sleeve choice; each group can override them.")}</p>
    </div>
    <button onclick={() => (open = false)} aria-label="Close inventory">Close</button>
  </header>
  <div class="addControls" role="group" aria-label="Add inventory components">
    <button onclick={() => add('cards')}>+ Cards</button>
    <button onclick={() => add('tokens')}>+ Tokens</button>
    <button onclick={() => add('tiles')}>+ Tiles</button>
    <button onclick={() => add('dice')}>+ Dice</button>
    <button onclick={() => add('boards')}>+ Boards</button>
    <button onclick={() => add('miniatures')}>+ Miniatures</button>
    <span class="otherAction">
      <button onclick={() => add('other')}>+ Other</button>
      {@render help('For components outside the other categories, such as bags, pawns or irregular pieces. Enter their name, quantity and overall width, depth and height: the space each piece occupies. They can be assigned to a Cup Tray; these measurements do not reproduce their exact shape.')}
    </span>
    <small>Saved automatically in this project</small>
  </div>
  <div class="inventoryBody">
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
              <div class="fields cardFields">
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
                  <small class="formatSummary">{group.width ?? '—'} × {group.depth ?? '—'} mm</small>
                </label>
                <label>
                  Sleeves
                  <select
                    aria-label="Sleeves"
                    value={group.sleeve ?? 'normal'}
                    onchange={(e) => {
                      const sleeve = e.currentTarget.value as CardSleeve;
                      update(group, { sleeve, thickness: sleeve === 'manual' ? group.thickness : sleeveThickness[sleeve] });
                    }}
                  >
                    {#each sleeveOptions as option (option.value)}<option value={option.value}>
                        {option.label}
                      </option>{/each}
                  </select>
                  <small class="formatSummary">{group.thickness ?? '—'} mm / card{group.sleeve === 'manual' ? '' : ' · estimate'}</small>
                </label>
              </div>
              {#if group.sleeve === 'manual'}{@render measurement(group, 'thickness', 'Thickness per card')}{/if}
              <details open={!group.cardSizeId}>
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
                {@render help('Preset thickness is an estimate. Actual measurements include sleeves; printing clearance is set in the piece.')}
              </details>
            {:else if group.kind === 'tokens' || group.kind === 'tiles' || group.kind === 'boards'}
              <label>
                Project shape
                <select
                  aria-label="Project shape"
                  value={group.shapeId ?? ''}
                  onchange={(e) => changeShape(group, e.currentTarget.value)}
                >
                  <option value="">Custom rectangle</option>
                  {#each shapes.filter((s) => s.id === group.shapeId || (group.kind === 'boards' ? s.category === 'playerBoard' : group.kind === 'tiles' ? s.category === 'tile' : (s.category ?? 'counter') === 'counter')) as shape (shape.id)}
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
              {@const selectedDie = project.diceSizes?.find(d => d.id === group.projectDiceSizeId)
                ?? project.diceSizes?.find(d => d.kind === group.diceKind && d.size === group.width)}
              <div class="fields">
                <div class="inlineField">
                <label>Project die
                  <select aria-label="Project dice size" value={selectedDie?.id ?? ''} onchange={(e) => {
                    const die = project.diceSizes?.find(d => d.id === e.currentTarget.value);
                    if (die) update(group, { projectDiceSizeId: die.id, diceKind: die.kind, width: die.size });
                  }}>
                    <option value="" disabled>{group.width ? `Saved ${group.diceKind ?? 'd6'} (${group.width} mm)` : 'Select project die…'}</option>
                    {#each project.diceSizes ?? [] as die (die.id)}<option value={die.id}>{die.name} ({die.kind}, {die.size} mm)</option>{/each}
                  </select>
                </label>
                  <DiceIcon kind={group.diceKind ?? 'd6'} />
                </div>
                <div class="inlineField">
                {@render measurement(group, 'width', (group.diceKind ?? 'd6') === 'd6' ? 'Side (face to face)' : 'Maximum outer size')}
                {@render help('For d6 measure one side, face to face. For other dice measure the greatest distance between points, including tips. Project sizes copy measurements; later edits do not change this group.')}
                </div>
              </div>
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
          <div class="quantityField">
            <span class="mobileLabel">Quantity</span>
            <div class="quantityControl">
            <button type="button" aria-label="Decrease quantity of {group.name || 'group'}" disabled={group.quantity <= Math.max(1, assigned)} onclick={() => update(group, { quantity: group.quantity - 1 })}>−</button>
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
            <button type="button" aria-label="Increase quantity of {group.name || 'group'}" onclick={() => update(group, { quantity: group.quantity + 1 })}>+</button>
            </div>
          </div>
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
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
</dialog>

<style>
  .inventoryDialog {
    box-sizing: border-box;
    width: min(1440px, calc(100vw - 2rem));
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
  .inventoryDialog[open] {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    flex-shrink: 0;
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: var(--borderThin);
  }
  h2 {
    font-size: 20px;
    margin: 0;
  }
  p {
    margin: 0.4rem 0 0;
    color: var(--fgMuted);
    font-size: 0.875rem;
  }
  .inventoryBody {
    min-height: 0;
    overflow-y: auto;
    padding: 0 1.25rem 1.25rem;
  }
  .inventoryRow {
    display: grid;
    grid-template-columns: 145px minmax(150px, 1fr) minmax(300px, 2fr) 120px minmax(150px, 1fr) 100px;
    gap: 0.75rem;
    padding: 1rem 0;
    border-bottom: var(--borderThin);
    align-items: start;
  }
  .headings {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--contrastEmpty);
    padding: 0.75rem 0;
    color: var(--fgMuted);
    font-size: 14px;
  }
  input,
  select {
    display: block;
    width: 100%;
    min-width: 0;
    height: 40px;
    box-sizing: border-box;
    padding: 0.4rem 0.5rem;
    border: var(--borderThin);
    border-radius: var(--radius-1);
    font: inherit;
    color: var(--fg);
    background: var(--contrastLowest);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
    font-size: 14px;
    line-height: 20px;
  }
  label input,
  label select {
    font-size: 16px;
  }
  select {
    appearance: none;
    padding-right: 2rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='m4 6 4 4 4-4' fill='none' stroke='%23999999' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.6rem center;
    cursor: pointer;
  }
  input:focus-visible,
  select:focus-visible,
  button:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--fgMuted);
    outline-offset: 2px;
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    align-items: end;
  }
  .measurements {
    margin-top: 0.5rem;
  }
  .cardFields {
    align-items: start;
  }
  .formatSummary {
    margin: 0;
    line-height: 1.4;
  }
  .parameters > .measurements:first-child {
    margin-top: 0;
  }
  .parameters > label {
    margin-bottom: 0.5rem;
  }
  details {
    margin-top: 0.5rem;
  }
  summary {
    cursor: pointer;
    font-size: 14px;
    color: var(--fgMuted);
  }
  .typeField,
  .nameField,
  .quantityField,
  .assignments,
  .actions {
    padding-top: calc(20px + 0.375rem);
  }
  small {
    display: block;
    font-size: 13px;
    color: var(--fgMuted);
    margin-top: 0.3rem;
  }
  .pending {
    font-style: italic;
  }
  .assignments {
    font-size: 15px;
    overflow-wrap: anywhere;
  }
  .quantityControl {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .quantityField > .mobileLabel {
    margin-bottom: 0.375rem;
    line-height: 20px;
    font-size: 14px;
  }
  .quantityControl input {
    text-align: center;
    padding-inline: 2px;
    font-size: 16px;
    appearance: textfield;
    border-radius: 0;
  }
  .quantityControl input::-webkit-inner-spin-button,
  .quantityControl input::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
  .quantityControl button {
    flex: 0 0 24px;
    height: 40px;
    padding: 0;
    font-size: 18px;
  }
  .quantityControl button:first-child {
    border-radius: var(--radius-1) 0 0 var(--radius-1);
  }
  .quantityControl button:last-child {
    border-radius: 0 var(--radius-1) var(--radius-1) 0;
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
    font-size: 14px;
    cursor: pointer;
  }
  button:hover {
    background: var(--contrastMedium);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .addControls {
    display: flex;
    flex-shrink: 0;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.75rem 1.25rem;
    border-bottom: var(--borderThin);
  }
  .otherAction {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
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
  .inlineField {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    min-width: 0;
  }
  .inlineField > label {
    flex: 1;
  }
  .inlineField > :global(.diceIcon),
  .inlineField > .help {
    flex-shrink: 0;
    margin-bottom: 8px;
  }
  .inlineField > .help {
    margin-bottom: 4px;
  }
  .help {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
  }
  .helpButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    line-height: 0;
  }
  .helpText {
    pointer-events: none;
    visibility: hidden;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    width: min(280px, 65vw);
    box-sizing: border-box;
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 0.75rem;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    background: var(--contrastLow);
    color: var(--fg);
    font-size: 14px;
    line-height: 1.5;
    box-shadow: 0 4px 16px #0005;
  }
  .help:hover .helpText,
  .help:focus-within .helpText {
    visibility: visible;
  }
  @media (max-width: 1200px) {
    .inventoryRow {
      grid-template-columns: 110px 1fr 120px;
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
    .addControls,
    header {
      padding: 0.75rem;
    }
    .inventoryRow {
      grid-template-columns: 90px minmax(0, 1fr) 110px;
      gap: 0.4rem;
    }
    .actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
    }
    input,
    select {
      font-size: 16px !important;
    }
  }
</style>
