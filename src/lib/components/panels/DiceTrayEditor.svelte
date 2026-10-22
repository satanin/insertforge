<script lang="ts">
  import { getDiceTrayMeasuredSpacing } from '$lib/models/diceTray';
  import { FormControl, Input, InputCheckbox, Select, Text, Spacer, Button, Hr } from '@tableslayer/ui';
  import { getProject, updateDiceTrayParams } from '$lib/stores/project.svelte';
  import type { DiceTray } from '$lib/types/project';
  import { getDiceTrayDimensions, getDiceExposure, getDicePocketWallHeight, getDiceTrayBodyDimensions, getDiceTrayCornerRadius, getDiceTrayMinimumWallThickness, getDiceTrayGroups, getDiceTrayPositions, type DiceTrayParams, type DiceTrayGroup } from '$lib/models/diceTray';
  import TextStyleControls from './TextStyleControls.svelte';
  import DiceIcon from '../DiceIcon.svelte';
  let { tray }: { tray: DiceTray } = $props();
  const dimensions = $derived(getDiceTrayDimensions(tray.params));
  const measuredSpacing = $derived(getDiceTrayMeasuredSpacing(tray.params));
  const groups = $derived(getDiceTrayGroups(tray.params));
  const positions = $derived(getDiceTrayPositions(tray.params));
  const exposedPercent = $derived(tray.params.exposedPercent ?? Math.round(100 * getDiceExposure(tray.params, positions[0].thickness) / positions[0].thickness));
  const bodyDimensions = $derived(getDiceTrayBodyDimensions(tray.params));
  const effectiveRadius = $derived(getDiceTrayCornerRadius(tray.params));
  const projectTypes = $derived(getProject().diceSizes ?? []);
  function selectedType(group: DiceTrayGroup) {
    return projectTypes.find(d => d.id === group.projectDiceSizeId && d.kind === group.diceKind) ??
      projectTypes.find(d => d.kind === group.diceKind && d.size === group.size) ??
      projectTypes.find(d => d.kind === group.diceKind);
  }
  function update(updates: Partial<DiceTrayParams>) { updateDiceTrayParams(tray.id, { ...tray.params, ...updates }); }
  function changeGroups(next: DiceTrayGroup[]) {
    const first = next[0];
    if (!first) return;
    update({ groups: next, diceKind: first.diceKind, size: first.size, count: next.reduce((n, g) => n + g.count, 0) });
  }
  function changeGroup(id: string, patch: Partial<DiceTrayGroup>) { changeGroups(groups.map(g => g.id === id ? { ...g, ...patch } : g)); }
  const fields = [
    ['columns', 'Columns', 1, 100, 1],
    ['clearance', 'Total clearance', 0, 20, 0.1],
    ['wallThickness', 'Wall thickness', 0.1, 600, 0.1], ['floorThickness', 'Floor thickness', 0.1, 600, 0.1]
  ] as const;
</script>

<section class="diceEditor">
  <DiceIcon kind={tray.params.diceKind} size={32} />
  <Text weight={600}>Dice Tray · Experimental</Text>
  <Text size="0.875rem">{dimensions.width.toFixed(1)} × {dimensions.depth.toFixed(1)} × {dimensions.height.toFixed(1)} mm</Text>
  <Spacer size="0.5rem" />
  <div class="fields">
    {#each [['minimumWidth', 'Minimum outer width'], ['minimumDepth', 'Minimum outer depth']] as [field, label]}
      {@const key = field as 'minimumWidth' | 'minimumDepth'}
      <FormControl {label} name="dice-{key}">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0" max="600" step="0.5" placeholder="Auto" value={tray.params[key] ?? ''} onchange={(e) => update({ [key]: e.currentTarget.value === '' ? undefined : e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    {/each}
    <InputCheckbox label="Box walls above dice" checked={tray.params.asBox || tray.params.lid || false} onchange={(e) => update({ asBox: e.currentTarget.checked, ...(!e.currentTarget.checked ? { lid: false } : {}) })} />
    <InputCheckbox label="Add lid" checked={tray.params.lid ?? false} onchange={(e) => update({ lid: e.currentTarget.checked, ...(e.currentTarget.checked ? { asBox: true } : {}) })} />
    <FormControl label="Outer corner radius" name="dice-radius">
      {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0" max="100" step="0.5" value={tray.params.outerCornerRadius ?? 0} onchange={(e) => update({ outerCornerRadius: e.currentTarget.valueAsNumber })} />{/snippet}
      {#snippet end()}mm{/snippet}
    </FormControl>
    {#if tray.params.asBox || tray.params.lid}
      <FormControl label="Clearance above dice" name="dice-headroom">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0.5" max="100" step="0.5" value={tray.params.stackingClearance ?? 2} onchange={(e) => update({ stackingClearance: e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    {/if}
    {#if tray.params.lid}
      <FormControl label="Lid type" name="dice-lid-type">
        {#snippet input({ inputProps })}<Select {...inputProps} selected={[tray.params.lidType ?? 'removable']} options={[{ value: 'removable', label: 'Removable' }, { value: 'sliding', label: 'Sliding' }]} onSelectedChange={(v) => update({ lidType: v[0] as DiceTrayParams['lidType'] })} />{/snippet}
      </FormControl>
      <FormControl label="Lid thickness" name="dice-lid-thickness">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0.5" max="20" step="0.1" value={tray.params.lidThickness ?? 2} onchange={(e) => update({ lidThickness: e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      <FormControl label="Lid clearance per side" name="dice-lid-clearance">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0.05" max="2" step="0.05" value={tray.params.lidClearance ?? 0.3} onchange={(e) => update({ lidClearance: e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    {/if}
  </div>
  <Text size="0.875rem" color="var(--fgMuted)">Rows share unused width between dice; a single die is centred. Optional outer dimensions fill a larger footprint without shrinking pockets. Smaller values are limited by the space needed for the dice.</Text>
  {#if tray.params.lid}
    {#if tray.params.lidType === 'sliding'}<Text size="0.875rem" color="var(--fgMuted)">Sliding guides require at least {getDiceTrayMinimumWallThickness(tray.params).toFixed(1)} mm walls; wall thickness adjusts when needed. Additional height keeps the guides above the dice.</Text>{/if}
    <InputCheckbox label="Add lid text" checked={tray.params.lidTextEnabled ?? false} onchange={(e) => update({ lidTextEnabled: e.currentTarget.checked })} />
    {#if tray.params.lidTextEnabled}
      <div class="fields">
        <FormControl label="Lid text" name="dice-lid-text">
          {#snippet input({ inputProps })}<Input {...inputProps} value={tray.params.lidText ?? ''} placeholder={tray.name} maxlength={100} onchange={(e) => update({ lidText: e.currentTarget.value })} />{/snippet}
        </FormControl>
        <TextStyleControls label="Lid" mode={tray.params.lidTextMode ?? 'engraved'} color={tray.params.lidTextColor ?? '#202020'} onMode={(lidTextMode) => update({ lidTextMode })} onColor={(lidTextColor) => update({ lidTextColor })} />
      </div>
      <Text size="0.875rem" color="var(--fgMuted)">Leave blank to use the tray name. Engraved and inlay keep the top flat; raised text adds 0.6 mm and affects flat stacking. Raised text prints facing up; inspect support needs under the plate.</Text>
    {/if}
  {/if}
  <Text size="0.875rem" color="var(--fgMuted)">Effective corner radius: {effectiveRadius.toFixed(1)} mm, limited to preserve cavities. {tray.params.asBox || tray.params.lid ? `Box rim is ${(bodyDimensions.height - Math.max(...positions.map(p => p.z + p.thickness))).toFixed(1)} mm above the highest die. Flat rim supports a flat item placed above.` : ''} {tray.params.lid ? 'Use Explode to open the lid in the preview. Body and lid export as separate printable parts.' : ''}</Text>
  <Spacer size="0.5rem" />
  <div class="fields">
    <FormControl label="Storage mode" name="dice-mode">
      {#snippet input({ inputProps })}<Select {...inputProps} selected={[tray.params.mode]} options={[{ value: 'individual', label: 'Individual pockets' }, { value: 'compartment', label: 'Shared compartment' }]} onSelectedChange={(v) => update({ mode: v[0] as DiceTrayParams['mode'] })} />{/snippet}
    </FormControl>
    {#each ['x', 'y'] as axis}
      {@const key = axis as 'x' | 'y'}
      <FormControl label={axis === 'x' ? 'Die spacing X' : 'Die spacing Y'} name="dice-spacing-{axis}">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0" max="600" step="0.5" value={tray.params.diceSpacing?.[key] ?? (measuredSpacing[key] === null ? 0 : Number(measuredSpacing[key]!.toFixed(2)))} onchange={(e) => update({ diceSpacing: { x: tray.params.diceSpacing?.x ?? measuredSpacing.x ?? 0, y: tray.params.diceSpacing?.y ?? measuredSpacing.y ?? 0, [key]: e.currentTarget.valueAsNumber } })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
    {/each}
    {#if tray.params.mode === 'individual'}
      <InputCheckbox label="Finger notch" checked={tray.params.fingerNotchEnabled ?? (tray.params.fingerNotchDiameter ?? 0) > 0} onchange={(e) => update({ fingerNotchEnabled: e.currentTarget.checked, ...(e.currentTarget.checked && !tray.params.fingerNotchDiameter ? { fingerNotchDiameter: 10 } : {}) })} />
      {#if tray.params.fingerNotchEnabled ?? (tray.params.fingerNotchDiameter ?? 0) > 0}
      <FormControl label="Finger notch diameter" name="dice-finger-notch">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0.5" max="40" step="0.5" value={tray.params.fingerNotchDiameter ?? 10} onchange={(e) => update({ fingerNotchDiameter: e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}mm{/snippet}
      </FormControl>
      {/if}
    {/if}
    {#each fields as [key, label, min, max, step]}
      <FormControl {label} name="dice-{key}">
        {#snippet input({ inputProps })}<Input {...inputProps} type="number" {min} {max} {step} value={tray.params[key]} onchange={(e) => update({ [key]: e.currentTarget.valueAsNumber })} />{/snippet}
        {#snippet end()}{key === 'columns' ? '' : 'mm'}{/snippet}
      </FormControl>
    {/each}
    {#if tray.params.mode === 'individual' || (!tray.params.asBox && !tray.params.lid)}
    <FormControl label="Exposed die" name="dice-exposure">
      {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="10" max="80" step="5" value={exposedPercent} onchange={(e) => update({ exposedPercent: e.currentTarget.valueAsNumber })} />{/snippet}
      {#snippet end()}%{/snippet}
    </FormControl>
    {/if}
  </div>
  <Hr />
  <Text size="0.875rem" color="var(--fgMuted)">Die spacing is measured edge to edge between the dice, not between their centres and not extra padding. Actual minimum: X {measuredSpacing.x === null ? '—' : `${measuredSpacing.x.toFixed(2)} mm`}, Y {measuredSpacing.y === null ? '—' : `${measuredSpacing.y.toFixed(2)} mm`}. Editing spacing fits the actual die sizes. Finger recesses and material between pockets may require more than the requested gap; — means there are no neighbours on that axis.</Text>
  {#if tray.params.mode === 'individual'}<Text size="0.875rem" color="var(--fgMuted)">Finger notch: rounded access on the left of each pocket, stopping at the pocket floor. Turning it off preserves its diameter. Boxes leave at least 1.5 mm between each pocket, including its notch, and the inside wall.</Text>{/if}
  {#each groups as group (group.id)}
    {@const source = selectedType(group)}
    <div class="group">
      <DiceIcon kind={group.diceKind} />
      <div class="fields">
        <FormControl label="Project die type" name="dice-source-{group.id}">
          {#snippet input({ inputProps })}<Select {...inputProps} selected={[source?.id ?? `saved-${group.id}`]} options={[
            ...(!source ? [{ value: `saved-${group.id}`, label: `${group.diceKind.toUpperCase()} (saved type)` }] : []),
            ...projectTypes.map(d => ({ value: d.id, label: `${d.name} (${d.kind.toUpperCase()})` }))
          ]} onSelectedChange={(v) => { const d = projectTypes.find(d => d.id === v[0]); if (d) changeGroup(group.id, { projectDiceSizeId: d.id, diceKind: d.kind, size: d.size }); }} />{/snippet}
        </FormControl>
        <FormControl label="Die size" name="dice-size-{group.id}">
          {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="0.1" max="600" step="0.1" value={group.size} onchange={(e) => changeGroup(group.id, { size: e.currentTarget.valueAsNumber })} />{/snippet}
          {#snippet end()}mm{/snippet}
        </FormControl>
        <FormControl label="Dice count" name="dice-count-{group.id}">
          {#snippet input({ inputProps })}<Input {...inputProps} type="number" min="1" max="100" step="1" value={group.count} onchange={(e) => changeGroup(group.id, { count: e.currentTarget.valueAsNumber })} />{/snippet}
        </FormControl>
      </div>
      <Text size="0.875rem" color="var(--fgMuted)">{group.diceKind === 'd6' ? 'Measure one side, face to face.' : 'Measure the maximum distance between tips.'} Die size is editable for this group.{source ? ` Project measurement: ${source.size} mm.` : ''} {source && group.size !== source.size ? 'Using a custom measurement.' : ''} Selecting a project type copies its measurement; editing Die size keeps the project unchanged.</Text>
      <Button size="sm" variant="ghost" disabled={groups.length === 1} onclick={() => changeGroups(groups.filter(g => g.id !== group.id))}>Remove group</Button>
    </div>
  {/each}
  <Button size="sm" disabled={tray.params.count >= 100 || projectTypes.length === 0} onclick={() => {
    const d = projectTypes.find(d => d.id === selectedType(groups.at(-1)!)?.id) ?? projectTypes[0];
    if (d) changeGroups([...groups, { id: crypto.randomUUID(), projectDiceSizeId: d.id, diceKind: d.kind, size: d.size, count: 1 }]);
  }}>Add dice group</Button>
  {#if projectTypes.length === 0}<Text size="0.875rem">Add a die type in Project &amp; dimensions → Dice to create new groups.</Text>{/if}
  <Spacer size="0.5rem" />
  <Text size="0.875rem" color="var(--fgMuted)">Individual pockets share one flat upper surface. Smaller dice have raised supports so each die keeps the requested exposure above that surface. For example, 40% exposed leaves 60% of each die’s oriented height inside its pocket. The structural floor, box dimensions and lid stay fixed when exposure changes; support heights may adjust. {tray.params.mode === 'compartment' && (tray.params.asBox || tray.params.lid) ? 'A shared box has only the enclosing walls, with no individual retaining walls to adjust.' : `Lowest exposure above retaining walls: ${Math.min(...positions.map(pos => 100 * (pos.thickness - getDicePocketWallHeight(tray.params, pos.thickness)) / pos.thickness)).toFixed(0)}%.`} Enable Preview dice to inspect the fit.</Text>
</section>

<style>
  .diceEditor { padding: 0.75rem; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; align-items: end; }
  .group { padding: 0.75rem 0; border-bottom: 1px solid var(--contrastLow); margin-bottom: 0.75rem; }
</style>
