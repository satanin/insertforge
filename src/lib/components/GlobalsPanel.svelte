<script lang="ts">
  import {
    Input,
    InputCheckbox,
    FormControl,
    Spacer,
    Hr,
    Select,
    Link,
    Icon,
    Panel,
    Button,
    ConfirmActionButton,
    Text
  } from '@tableslayer/ui';
  import { IconSquare, IconCircle, IconHexagon, IconTriangle, IconRectangle, IconCards } from '@tabler/icons-svelte';
  import type { CounterShape, CounterBaseShape, CardSize, CounterShapeCategory } from '$lib/types/project';
  import {
    getProject,
    isCounterTray,
    isCardDrawTray,
    isCardDividerTray,
    getCounterShapes,
    getCardSizes,
    addCounterShape,
    updateCounterShape,
    deleteCounterShape,
    addCardSize,
    updateCardSize,
    deleteCardSize,
    DEFAULT_COUNTER_THICKNESS
  } from '$lib/stores/project.svelte';

  interface Props {
    projectName: string;
    globalSettings: { gameContainerWidth: number; gameContainerDepth: number; gameContainerHeight: number | null };
    effectiveGameContainerHeight: number;
    onProjectNameChange: (name: string) => void;
    onGlobalSettingsChange: (updates: {
      gameContainerWidth?: number;
      gameContainerDepth?: number;
      gameContainerHeight?: number | null;
    }) => void;
    onResetProject?: () => void;
  }

  let {
    projectName,
    globalSettings,
    effectiveGameContainerHeight,
    onProjectNameChange,
    onGlobalSettingsChange,
    onResetProject
  }: Props = $props();

  // Track which counter is expanded (null = none)
  let expandedCounterIndex: number | null = $state(null);
  let expandedPlayerBoardIndex: number | null = $state(null);
  let expandedTileIndex: number | null = $state(null);
  // Track which card size is expanded (null = none)
  let expandedCardIndex: number | null = $state(null);
  let activeTab = $state<'project' | 'counters' | 'cards' | 'tiles' | 'boards'>('project');

  // Get shapes and card sizes from project level
  let counterShapes = $derived(getCounterShapes());
  let counterTokenShapes = $derived(counterShapes.filter((s) => (s.category ?? 'counter') === 'counter'));
  let playerBoardShapes = $derived(counterShapes.filter((s) => (s.category ?? 'counter') === 'playerBoard'));
  let tileShapes = $derived(counterShapes.filter((s) => (s.category ?? 'counter') === 'tile'));
  let cardSizes = $derived(getCardSizes());

  // Get the shape icon component for a base shape
  function getShapeIcon(baseShape: CounterBaseShape) {
    switch (baseShape) {
      case 'square':
        return IconSquare;
      case 'circle':
        return IconCircle;
      case 'hex':
        return IconHexagon;
      case 'triangle':
        return IconTriangle;
      case 'rectangle':
      default:
        return IconRectangle;
    }
  }

  // Calculate icon scale relative to max size (with clamping)
  function getRelativeIconScale(shape: CounterShape, shapes: CounterShape[]): number {
    if (shapes.length === 0) return 1;
    const maxWidth = Math.max(...shapes.map((s) => Math.max(s.width, s.length)));
    const shapeSize = Math.max(shape.width, shape.length);
    const minScale = 0.6;
    const maxScale = 1.4;
    const ratio = maxWidth > 0 ? shapeSize / maxWidth : 1;
    return minScale + ratio * (maxScale - minScale);
  }

  // Get display size string for a shape
  function getSizeDisplay(shape: CounterShape): string {
    const baseShape = shape.baseShape ?? 'rectangle';
    if (baseShape === 'rectangle') {
      return `${shape.width} × ${shape.length}`;
    }
    return `${shape.width}`;
  }

  const baseShapeOptions: { value: CounterBaseShape; label: string }[] = [
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'square', label: 'Square' },
    { value: 'circle', label: 'Circle' },
    { value: 'hex', label: 'Hex' },
    { value: 'triangle', label: 'Triangle' }
  ];

  // Custom shape handlers - now using project-level store functions
  function handleAddShape(category: CounterShapeCategory) {
    const sourceShapes = category === 'playerBoard' ? playerBoardShapes : category === 'tile' ? tileShapes : counterTokenShapes;
    const newName =
      category === 'playerBoard'
        ? `Player Board ${sourceShapes.length + 1}`
        : category === 'tile'
          ? `Tile ${sourceShapes.length + 1}`
          : `Custom ${sourceShapes.length + 1}`;
    const newShape = addCounterShape({
      name: newName,
      category,
      baseShape: 'rectangle',
      width: category === 'playerBoard' ? 114 : category === 'tile' ? 30 : 20,
      length: category === 'playerBoard' ? 280 : category === 'tile' ? 30 : 30,
      thickness: category === 'tile' ? 2 : DEFAULT_COUNTER_THICKNESS
    });
    const newShapes = getCounterShapes().filter((s) => (s.category ?? 'counter') === category);
    const newIndex = newShapes.findIndex((s) => s.id === newShape.id);
    if (category === 'playerBoard') {
      expandedPlayerBoardIndex = newIndex;
      expandedCounterIndex = null;
      expandedTileIndex = null;
    } else if (category === 'tile') {
      expandedTileIndex = newIndex;
      expandedCounterIndex = null;
      expandedPlayerBoardIndex = null;
    } else {
      expandedCounterIndex = newIndex;
      expandedPlayerBoardIndex = null;
      expandedTileIndex = null;
    }
  }

  function handleUpdateShape(
    shapeId: string,
    field: keyof CounterShape | 'cornerRadius' | 'pointyTop',
    value: string | number | boolean
  ) {
    const shape = counterShapes.find((s) => s.id === shapeId);
    if (!shape) return;

    if (field === 'name') {
      const newName = value as string;
      // Don't allow duplicate names
      if (counterShapes.some((s) => s.id !== shapeId && s.name === newName)) {
        return;
      }
      updateCounterShape(shapeId, { name: newName });
      return;
    }

    // Handle baseShape changes - sync length to width for non-rectangle shapes
    if (field === 'baseShape') {
      const baseShape = value as CounterBaseShape;
      if (baseShape !== 'rectangle') {
        updateCounterShape(shapeId, { baseShape, length: shape.width });
      } else {
        updateCounterShape(shapeId, { baseShape });
      }
      return;
    }

    // Handle width changes for non-rectangle shapes - sync length
    if (field === 'width') {
      const baseShape = shape.baseShape ?? 'rectangle';
      if (baseShape !== 'rectangle') {
        updateCounterShape(shapeId, { width: value as number, length: value as number });
      } else {
        updateCounterShape(shapeId, { width: value as number });
      }
      return;
    }

    // Handle other fields
    updateCounterShape(shapeId, { [field]: value });
  }

  // Count stacks using a given shape across ALL counter trays in the project
  function countStacksUsingShape(shapeId: string): number {
    const project = getProject();
    let count = 0;

    for (const layer of project.layers) {
      for (const box of layer.boxes) {
        for (const tray of box.trays) {
          if (isCounterTray(tray)) {
            count += tray.params.topLoadedStacks.filter((stack) => stack[0] === shapeId).length;
            count += tray.params.edgeLoadedStacks.filter((stack) => stack[0] === shapeId).length;
          } else if (tray.type === 'tile') {
            count += tray.params.tileShapeId === shapeId ? 1 : 0;
          }
        }
      }
      for (const tray of layer.looseTrays) {
        if (isCounterTray(tray)) {
          count += tray.params.topLoadedStacks.filter((stack) => stack[0] === shapeId).length;
          count += tray.params.edgeLoadedStacks.filter((stack) => stack[0] === shapeId).length;
        } else if (tray.type === 'tile') {
          count += tray.params.tileShapeId === shapeId ? 1 : 0;
        }
      }
      for (const layeredBox of layer.layeredBoxes) {
        for (const layeredBoxLayer of layeredBox.layers) {
          for (const section of layeredBoxLayer.sections) {
            if (section.counterParams) {
              count += section.counterParams.topLoadedStacks.filter((stack) => stack[0] === shapeId).length;
              count += section.counterParams.edgeLoadedStacks.filter((stack) => stack[0] === shapeId).length;
            }
          }
        }
      }
    }

    return count;
  }

  function handleRemoveShape(shapeId: string) {
    deleteCounterShape(shapeId);
    expandedCounterIndex = null;
    expandedPlayerBoardIndex = null;
    expandedTileIndex = null;
  }

  // Card size handlers - now using project-level store functions
  function handleAddCardSize() {
    const newName = `Custom Card ${cardSizes.length + 1}`;
    const newCardSize = addCardSize({
      name: newName,
      width: 66,
      length: 91,
      thickness: 0.5
    });
    // Find the index of the newly added card size
    const newIndex = getCardSizes().findIndex((s) => s.id === newCardSize.id);
    expandedCardIndex = newIndex;
  }

  function handleUpdateCardSize(cardSizeId: string, field: keyof CardSize, value: string | number) {
    if (field === 'name') {
      const newName = value as string;
      // Don't allow duplicate names
      if (cardSizes.some((s) => s.id !== cardSizeId && s.name === newName)) {
        return;
      }
    }
    updateCardSize(cardSizeId, { [field]: value });
  }

  // Count card trays using a given card size
  function countTraysUsingCardSize(cardSizeId: string): number {
    const project = getProject();
    let count = 0;

    for (const layer of project.layers) {
      for (const box of layer.boxes) {
        for (const tray of box.trays) {
          if (isCardDrawTray(tray)) {
            if (tray.params.cardSizeId === cardSizeId) {
              count++;
            }
          }
          if (isCardDividerTray(tray)) {
            count += tray.params.stacks.filter((s) => s.cardSizeId === cardSizeId).length;
          }
        }
      }
      for (const tray of layer.looseTrays) {
        if (isCardDrawTray(tray)) {
          if (tray.params.cardSizeId === cardSizeId) {
            count++;
          }
        }
        if (isCardDividerTray(tray)) {
          count += tray.params.stacks.filter((s) => s.cardSizeId === cardSizeId).length;
        }
      }
    }

    return count;
  }

  function handleRemoveCardSize(cardSizeId: string) {
    deleteCardSize(cardSizeId);
    expandedCardIndex = null;
  }
</script>

<div class="globalsPanel">
  <div class="tabs" role="tablist" aria-label="Dimension sections">
    <button
      class:active={activeTab === 'project'}
      role="tab"
      aria-selected={activeTab === 'project'}
      onclick={() => (activeTab = 'project')}
    >
      <span class="tabLabel">Project</span>
    </button>
    <button
      class:active={activeTab === 'counters'}
      role="tab"
      aria-selected={activeTab === 'counters'}
      onclick={() => (activeTab = 'counters')}
    >
      <span class="tabLabel">Counters</span> <span class="tabCount">{counterTokenShapes.length}</span>
    </button>
    <button
      class:active={activeTab === 'cards'}
      role="tab"
      aria-selected={activeTab === 'cards'}
      onclick={() => (activeTab = 'cards')}
    >
      <span class="tabLabel">Cards</span> <span class="tabCount">{cardSizes.length}</span>
    </button>
    <button
      class:active={activeTab === 'tiles'}
      role="tab"
      aria-selected={activeTab === 'tiles'}
      onclick={() => (activeTab = 'tiles')}
    >
      <span class="tabLabel">Tiles</span> <span class="tabCount">{tileShapes.length}</span>
    </button>
    <button
      class:active={activeTab === 'boards'}
      role="tab"
      aria-selected={activeTab === 'boards'}
      onclick={() => (activeTab = 'boards')}
    >
      <span class="tabLabel">Boards</span> <span class="tabCount">{playerBoardShapes.length}</span>
    </button>
  </div>

  {#if activeTab === 'project'}
    <section class="section">
      <h3 class="sectionTitle">Project</h3>
      <Spacer size="0.5rem" />
      <FormControl label="Name" name="projectName">
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="text"
            value={projectName}
            onchange={(e) => onProjectNameChange(e.currentTarget.value)}
            placeholder="InsertForge Project"
          />
        {/snippet}
      </FormControl>
      <Spacer size="0.5rem" />
      <Text size="0.875rem" color="var(--fgMuted)">Used as the default filename for project exports.</Text>
    </section>

    <Hr />

    <section class="section">
      <h3 class="sectionTitle">Game Container</h3>
      <div class="gameContainerInputs">
        <FormControl label="Width" name="gameContainerWidth">
          {#snippet input({ inputProps })}
            <Input
              {...inputProps}
              type="number"
              step="1"
              min="100"
              value={globalSettings.gameContainerWidth}
              onchange={(e) => onGlobalSettingsChange({ gameContainerWidth: parseInt(e.currentTarget.value) })}
            />
          {/snippet}
          {#snippet end()}mm{/snippet}
        </FormControl>
        <FormControl label="Depth" name="gameContainerDepth">
          {#snippet input({ inputProps })}
            <Input
              {...inputProps}
              type="number"
              step="1"
              min="100"
              value={globalSettings.gameContainerDepth}
              onchange={(e) => onGlobalSettingsChange({ gameContainerDepth: parseInt(e.currentTarget.value) })}
            />
          {/snippet}
          {#snippet end()}mm{/snippet}
        </FormControl>
        <FormControl label="Height" name="gameContainerHeight">
          {#snippet input({ inputProps })}
            <Input
              {...inputProps}
              type="number"
              step="1"
              min="1"
              value={globalSettings.gameContainerHeight ?? ''}
              placeholder={`Auto (${effectiveGameContainerHeight.toFixed(0)}mm)`}
              onchange={(e) => {
                const value = e.currentTarget.value.trim();
                onGlobalSettingsChange({ gameContainerHeight: value ? parseInt(value) : null });
              }}
            />
          {/snippet}
          {#snippet end()}mm{/snippet}
        </FormControl>
      </div>
      <Spacer size="0.5rem" />
      <Text size="0.875rem" color="var(--fgMuted)">
        Set to the inner dimensions of the actual cardboard box your game uses. It provides the bounding area for layout
        calculations. Leave height empty to use the current stacked layer height automatically.
      </Text>
    </section>

    {#if onResetProject}
      <Hr />

      <section class="section dangerSection">
        <h3 class="sectionTitle">Reset Project</h3>
        <Text size="0.875rem" color="var(--fgMuted)">
          Clear all layers, boxes, trays, boards, and reset the project name and game container dimensions.
        </Text>
        <Spacer size="0.75rem" />
        <Button class="resetProjectButton" variant="danger" onclick={onResetProject}>
          Reset project
        </Button>
      </section>
    {/if}
  {:else if activeTab === 'counters'}
    <section class="section">
    <h3 class="sectionTitle">Counters</h3>
    <Spacer size="0.5rem" />
    <div class="customShapesList">
      {#each counterTokenShapes as shape, index (shape.id)}
        {@const baseShape = shape.baseShape ?? 'rectangle'}
        {@const isExpanded = expandedCounterIndex === index}
        {#if isExpanded}
          <!-- Expanded view: full form in Panel -->
          <Panel class="shapePanel">
            <div class="shapePanelContent">
              <div class="shapeFormGrid">
                <FormControl label="Name" name="name-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="text"
                      value={shape.name}
                      onchange={(e) => handleUpdateShape(shape.id, 'name', e.currentTarget.value)}
                      placeholder="Name"
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Shape" name="baseShape-{index}">
                  {#snippet input({ inputProps })}
                    <Select
                      selected={[baseShape]}
                      onSelectedChange={(selected) => handleUpdateShape(shape.id, 'baseShape', selected[0])}
                      options={baseShapeOptions}
                      {...inputProps}
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Thickness" name="thickness-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={shape.thickness}
                      onchange={(e) => handleUpdateShape(shape.id, 'thickness', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                {#if baseShape === 'rectangle'}
                  <FormControl label="Width" name="width-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Length" name="length-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.length}
                        onchange={(e) => handleUpdateShape(shape.id, 'length', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'square'}
                  <FormControl label="Size" name="size-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'circle'}
                  <FormControl label="Diameter" name="diameter-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'hex'}
                  <FormControl label="Flat-to-flat" name="flatToFlat-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <InputCheckbox
                    checked={shape.pointyTop ?? false}
                    onchange={(e) => handleUpdateShape(shape.id, 'pointyTop', e.currentTarget.checked ? 1 : 0)}
                    label="Pointy top"
                  />
                {:else if baseShape === 'triangle'}
                  <FormControl label="Side" name="side-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Radius" name="cornerRadius-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="0"
                        value={shape.cornerRadius ?? 1.5}
                        onchange={(e) => handleUpdateShape(shape.id, 'cornerRadius', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {/if}
              </div>
            </div>
            <Hr />
            {@const stackCount = countStacksUsingShape(shape.id)}
            <div class="shapePanelActions">
              <Button size="sm" onclick={() => (expandedCounterIndex = null)}>Save</Button>
              <ConfirmActionButton action={() => handleRemoveShape(shape.id)} actionButtonText="Delete counter">
                {#snippet trigger({ triggerProps })}
                  <Button {...triggerProps} size="sm" variant="ghost">Delete</Button>
                {/snippet}
                {#snippet actionMessage()}
                  <div style="max-width: 15rem;">
                    <Text weight={600} color="var(--fgDanger)">Warning</Text>
                    <Spacer size="0.5rem" />
                    {#if stackCount > 0}
                      <Text size="0.875rem">
                        Deleting the "{shape.name}" counter will also remove
                        <Text as="span" color="var(--fgDanger)">
                          {stackCount}
                          stack{stackCount === 1 ? '' : 's'}
                        </Text> using it.
                      </Text>
                    {:else}
                      <Text size="0.875rem">Delete the "{shape.name}" counter?</Text>
                    {/if}
                    <Spacer size="0.5rem" />
                  </div>
                {/snippet}
              </ConfirmActionButton>
            </div>
          </Panel>
        {:else}
          {@const iconScale = getRelativeIconScale(shape, counterTokenShapes)}
          <div class="shapeCard">
            <!-- Collapsed view: compact summary -->
            <button class="shapeSummary" onclick={() => (expandedCounterIndex = index)} title="Click to edit {shape.name}">
              <span class="shapeIcon" style="transform: scale({iconScale}); --stroke-width: {2 / iconScale};">
                <Icon Icon={getShapeIcon(baseShape)} size={16} />
              </span>
              <span class="shapeName">{shape.name}</span>
              <span class="shapeSize">{getSizeDisplay(shape)} mm</span>
            </button>
          </div>
        {/if}
      {/each}
    </div>
    <Spacer />
    <Link as="button" onclick={() => handleAddShape('counter')}>+ New counter</Link>
  </section>
  {:else if activeTab === 'tiles'}
    <section class="section">
    <h3 class="sectionTitle">Tiles</h3>
    <Spacer size="0.5rem" />
    <div class="customShapesList">
      {#each tileShapes as shape, index (shape.id)}
        {@const baseShape = shape.baseShape ?? 'rectangle'}
        {@const isExpanded = expandedTileIndex === index}
        {#if isExpanded}
          <Panel class="shapePanel">
            <div class="shapePanelContent">
              <div class="shapeFormGrid">
                <FormControl label="Name" name="tileName-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="text"
                      value={shape.name}
                      onchange={(e) => handleUpdateShape(shape.id, 'name', e.currentTarget.value)}
                      placeholder="Name"
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Shape" name="tileBaseShape-{index}">
                  {#snippet input({ inputProps })}
                    <Select
                      selected={[baseShape]}
                      onSelectedChange={(selected) => handleUpdateShape(shape.id, 'baseShape', selected[0])}
                      options={baseShapeOptions}
                      {...inputProps}
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Thickness" name="tileThickness-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={shape.thickness}
                      onchange={(e) => handleUpdateShape(shape.id, 'thickness', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                {#if baseShape === 'rectangle'}
                  <FormControl label="Width" name="tileWidth-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Length" name="tileLength-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.length}
                        onchange={(e) => handleUpdateShape(shape.id, 'length', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'square'}
                  <FormControl label="Size" name="tileSize-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'circle'}
                  <FormControl label="Diameter" name="tileDiameter-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'hex'}
                  <FormControl label="Flat-to-flat" name="tileFlatToFlat-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <InputCheckbox
                    checked={shape.pointyTop ?? false}
                    onchange={(e) => handleUpdateShape(shape.id, 'pointyTop', e.currentTarget.checked ? 1 : 0)}
                    label="Pointy top"
                  />
                {:else if baseShape === 'triangle'}
                  <FormControl label="Side" name="tileSide-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Radius" name="tileCornerRadius-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="0"
                        value={shape.cornerRadius ?? 1.5}
                        onchange={(e) => handleUpdateShape(shape.id, 'cornerRadius', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {/if}
              </div>
            </div>
            <Hr />
            {@const stackCount = countStacksUsingShape(shape.id)}
            <div class="shapePanelActions">
              <Button size="sm" onclick={() => (expandedTileIndex = null)}>Save</Button>
              <ConfirmActionButton action={() => handleRemoveShape(shape.id)} actionButtonText="Delete tile">
                {#snippet trigger({ triggerProps })}
                  <Button {...triggerProps} size="sm" variant="ghost">Delete</Button>
                {/snippet}
                {#snippet actionMessage()}
                  <div style="max-width: 15rem;">
                    <Text weight={600} color="var(--fgDanger)">Warning</Text>
                    <Spacer size="0.5rem" />
                    {#if stackCount > 0}
                      <Text size="0.875rem">
                        Deleting the "{shape.name}" tile will also remove
                        <Text as="span" color="var(--fgDanger)">
                          {stackCount}
                          use{stackCount === 1 ? '' : 's'}
                        </Text>.
                      </Text>
                    {:else}
                      <Text size="0.875rem">Delete the "{shape.name}" tile?</Text>
                    {/if}
                    <Spacer size="0.5rem" />
                  </div>
                {/snippet}
              </ConfirmActionButton>
            </div>
          </Panel>
        {:else}
          {@const iconScale = getRelativeIconScale(shape, tileShapes)}
          <div class="shapeCard">
            <button class="shapeSummary" onclick={() => (expandedTileIndex = index)} title="Click to edit {shape.name}">
              <span class="shapeIcon" style="transform: scale({iconScale}); --stroke-width: {2 / iconScale};">
                <Icon Icon={getShapeIcon(baseShape)} size={16} />
              </span>
              <span class="shapeName">{shape.name}</span>
              <span class="shapeSize">{getSizeDisplay(shape)} mm</span>
            </button>
          </div>
        {/if}
      {/each}
    </div>
    <Spacer />
    <Link as="button" onclick={() => handleAddShape('tile')}>+ New tile</Link>
  </section>
  {:else if activeTab === 'boards'}
    <section class="section">
    <h3 class="sectionTitle">Player Boards</h3>
    <Spacer size="0.5rem" />
    <div class="customShapesList">
      {#each playerBoardShapes as shape, index (shape.id)}
        {@const baseShape = shape.baseShape ?? 'rectangle'}
        {@const isExpanded = expandedPlayerBoardIndex === index}
        {#if isExpanded}
          <Panel class="shapePanel">
            <div class="shapePanelContent">
              <div class="shapeFormGrid">
                <FormControl label="Name" name="playerBoardName-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="text"
                      value={shape.name}
                      onchange={(e) => handleUpdateShape(shape.id, 'name', e.currentTarget.value)}
                      placeholder="Name"
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Shape" name="playerBoardBaseShape-{index}">
                  {#snippet input({ inputProps })}
                    <Select
                      selected={[baseShape]}
                      onSelectedChange={(selected) => handleUpdateShape(shape.id, 'baseShape', selected[0])}
                      options={baseShapeOptions}
                      {...inputProps}
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Thickness" name="playerBoardThickness-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={shape.thickness}
                      onchange={(e) => handleUpdateShape(shape.id, 'thickness', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                {#if baseShape === 'rectangle'}
                  <FormControl label="Width" name="playerBoardWidth-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Length" name="playerBoardLength-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.length}
                        onchange={(e) => handleUpdateShape(shape.id, 'length', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'square'}
                  <FormControl label="Size" name="playerBoardSize-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'circle'}
                  <FormControl label="Diameter" name="playerBoardDiameter-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {:else if baseShape === 'hex'}
                  <FormControl label="Flat-to-flat" name="playerBoardFlatToFlat-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <InputCheckbox
                    checked={shape.pointyTop ?? false}
                    onchange={(e) => handleUpdateShape(shape.id, 'pointyTop', e.currentTarget.checked ? 1 : 0)}
                    label="Pointy top"
                  />
                {:else if baseShape === 'triangle'}
                  <FormControl label="Side" name="playerBoardSide-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="1"
                        value={shape.width}
                        onchange={(e) => handleUpdateShape(shape.id, 'width', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                  <FormControl label="Radius" name="playerBoardCornerRadius-{index}">
                    {#snippet input({ inputProps })}
                      <Input
                        {...inputProps}
                        type="number"
                        step="0.1"
                        min="0"
                        value={shape.cornerRadius ?? 1.5}
                        onchange={(e) => handleUpdateShape(shape.id, 'cornerRadius', parseFloat(e.currentTarget.value))}
                      />
                    {/snippet}
                    {#snippet end()}mm{/snippet}
                  </FormControl>
                {/if}
              </div>
            </div>
            <Hr />
            {@const stackCount = countStacksUsingShape(shape.id)}
            <div class="shapePanelActions">
              <Button size="sm" onclick={() => (expandedPlayerBoardIndex = null)}>Save</Button>
              <ConfirmActionButton action={() => handleRemoveShape(shape.id)} actionButtonText="Delete player board">
                {#snippet trigger({ triggerProps })}
                  <Button {...triggerProps} size="sm" variant="ghost">Delete</Button>
                {/snippet}
                {#snippet actionMessage()}
                  <div style="max-width: 15rem;">
                    <Text weight={600} color="var(--fgDanger)">Warning</Text>
                    <Spacer size="0.5rem" />
                    {#if stackCount > 0}
                      <Text size="0.875rem">
                        Deleting "{shape.name}" will also remove
                        <Text as="span" color="var(--fgDanger)">
                          {stackCount}
                          use{stackCount === 1 ? '' : 's'}
                        </Text> of this player board.
                      </Text>
                    {:else}
                      <Text size="0.875rem">Delete the "{shape.name}" player board?</Text>
                    {/if}
                    <Spacer size="0.5rem" />
                  </div>
                {/snippet}
              </ConfirmActionButton>
            </div>
          </Panel>
        {:else}
          {@const iconScale = getRelativeIconScale(shape, playerBoardShapes)}
          <div class="shapeCard">
            <button
              class="shapeSummary"
              onclick={() => (expandedPlayerBoardIndex = index)}
              title="Click to edit {shape.name}"
            >
              <span class="shapeIcon" style="transform: scale({iconScale}); --stroke-width: {2 / iconScale};">
                <Icon Icon={getShapeIcon(baseShape)} size={16} />
              </span>
              <span class="shapeName">{shape.name}</span>
              <span class="shapeSize">{getSizeDisplay(shape)} mm</span>
            </button>
          </div>
        {/if}
      {/each}
    </div>
    <Spacer />
    <Link as="button" onclick={() => handleAddShape('playerBoard')}>+ New player board</Link>
  </section>
  {:else if activeTab === 'cards'}
    <section class="section">
    <h3 class="sectionTitle">Card Sizes (Sleeved)</h3>
    <p class="sectionHint">Default thickness is for regular sleeves, change it to 0.75~0.8 for premium sleeves.</p>
    <Spacer size="0.5rem" />
    <div class="customShapesList">
      {#each cardSizes as cardSize, index (cardSize.id)}
        {@const isExpanded = expandedCardIndex === index}
        {#if isExpanded}
          <!-- Expanded view: full form in Panel -->
          <Panel class="shapePanel">
            <div class="shapePanelContent">
              <div class="shapeFormGrid">
                <FormControl label="Name" name="cardName-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="text"
                      value={cardSize.name}
                      onchange={(e) => handleUpdateCardSize(cardSize.id, 'name', e.currentTarget.value)}
                      placeholder="Name"
                    />
                  {/snippet}
                </FormControl>
                <FormControl label="Width" name="cardWidth-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.5"
                      min="10"
                      value={cardSize.width}
                      onchange={(e) => handleUpdateCardSize(cardSize.id, 'width', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                <FormControl label="Length" name="cardLength-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.5"
                      min="10"
                      value={cardSize.length}
                      onchange={(e) => handleUpdateCardSize(cardSize.id, 'length', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
                <FormControl label="Thickness" name="cardThickness-{index}">
                  {#snippet input({ inputProps })}
                    <Input
                      {...inputProps}
                      type="number"
                      step="0.05"
                      min="0.1"
                      value={cardSize.thickness}
                      onchange={(e) =>
                        handleUpdateCardSize(cardSize.id, 'thickness', parseFloat(e.currentTarget.value))}
                    />
                  {/snippet}
                  {#snippet end()}mm{/snippet}
                </FormControl>
              </div>
            </div>
            <Hr />
            {@const trayCount = countTraysUsingCardSize(cardSize.id)}
            <div class="shapePanelActions">
              <Button size="sm" onclick={() => (expandedCardIndex = null)}>Save</Button>
              <ConfirmActionButton action={() => handleRemoveCardSize(cardSize.id)} actionButtonText="Delete card size">
                {#snippet trigger({ triggerProps })}
                  <Button {...triggerProps} size="sm" variant="ghost">Delete</Button>
                {/snippet}
                {#snippet actionMessage()}
                  <div style="max-width: 15rem;">
                    <Text weight={600} color="var(--fgDanger)">Warning</Text>
                    <Spacer size="0.5rem" />
                    {#if trayCount > 0}
                      <Text size="0.875rem">
                        Deleting "{cardSize.name}" will affect
                        <Text as="span" color="var(--fgDanger)">
                          {trayCount}
                          card tray{trayCount === 1 ? '' : 's'}
                        </Text> using it.
                      </Text>
                    {:else}
                      <Text size="0.875rem">Delete the "{cardSize.name}" card size?</Text>
                    {/if}
                    <Spacer size="0.5rem" />
                  </div>
                {/snippet}
              </ConfirmActionButton>
            </div>
          </Panel>
        {:else}
          <div class="shapeCard">
            <!-- Collapsed view: compact summary -->
            <button
              class="shapeSummary"
              onclick={() => (expandedCardIndex = index)}
              title="Click to edit {cardSize.name}"
            >
              <span class="shapeIcon">
                <Icon Icon={IconCards} size={16} />
              </span>
              <span class="shapeName">{cardSize.name}</span>
              <span class="shapeSize">{cardSize.width}×{cardSize.length} mm</span>
            </button>
          </div>
        {/if}
      {/each}
    </div>
    <Spacer />
    <Link as="button" onclick={handleAddCardSize}>+ New card size</Link>
  </section>
  {/if}
</div>

<style>
  .globalsPanel {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem 0;
  }

  .tabs {
    position: sticky;
    top: 0;
    z-index: 1;
    container-type: inline-size;
    display: flex;
    gap: 0;
    padding: 0 0.75rem 0.5rem;
    background: var(--panel);
  }

  .tabs::before {
    content: '';
    position: absolute;
    inset: 0 0.75rem 0.5rem;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    pointer-events: none;
  }

  .tabs button {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.5rem 0.25rem;
    border: 0;
    border-right: var(--borderThin);
    background: var(--contrastLowest);
    color: var(--fgMuted);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
  }

  .tabs button:first-child {
    border-radius: var(--radius-2) 0 0 var(--radius-2);
  }

  .tabs button:last-child {
    border-right: 0;
    border-radius: 0 var(--radius-2) var(--radius-2) 0;
  }

  .tabs button:hover {
    background: var(--contrastLow);
    color: var(--fg);
  }

  .tabs button.active {
    position: relative;
    background: var(--contrastEmpty);
    color: var(--fg);
    box-shadow:
      inset 0 0 0 1px var(--contrastHigh),
      inset 0 -2px 0 var(--fg);
  }

  .tabLabel {
    font-size: clamp(0.8125rem, 2.8cqi, 1rem);
  }

  .tabCount {
    color: var(--fgMuted);
    font-family: var(--font-mono);
    font-size: clamp(0.6875rem, 1.8cqi, 0.75rem);
    font-weight: 500;
  }

  .section {
    padding: 0 0.75rem;
  }

  .gameContainerInputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .sectionTitle {
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fgMuted);
  }

  .sectionHint {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--fgMuted);
  }

  .dangerSection {
    padding-bottom: 0.25rem;
  }

  :global(.resetProjectButton) {
    width: 100%;
    justify-content: center;
    border-color: #a63b2d !important;
    background: #c9503c !important;
    color: #fff !important;
    font-weight: 700;
  }

  :global(.resetProjectButton:hover) {
    background: #a63b2d !important;
  }

  .customShapesList {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .shapeCard {
    border-radius: var(--radius-2);
    background: var(--contrastLowest);
    overflow: hidden;
  }

  :global(.panel.shapePanel) {
    padding: 0;
    background: var(--contrastLow) !important;
  }

  .shapePanelContent {
    padding: 0.75rem;
  }

  .shapeFormGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .shapePanelActions {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .shapeSummary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
  }

  .shapeSummary:hover {
    background: var(--contrastLow);
  }

  .shapeIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    color: var(--fgMuted);
  }

  .shapeIcon :global(svg) {
    stroke-width: var(--stroke-width, 2);
  }

  .shapeName {
    flex: 1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shapeSize {
    font-size: 0.75rem;
    color: var(--fgMuted);
    font-family: var(--font-mono);
  }
</style>
