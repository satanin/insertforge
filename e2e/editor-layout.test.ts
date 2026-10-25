import { expect, test } from '@playwright/test';

test.use({ actionTimeout: 10_000 });

const railParams = {
  variant: 'rails', rackHeight: null, rackBaseDepth: 50, wallThickness: 2,
  sideWallThickness: 2, railWallThickness: 1.5, railLipInset: 1.5, rimHeight: 3,
  baseWidthTolerance: 1.8, baseHeightTolerance: 1,
  slots: [{ id: 'slot', baseWidth: 26, baseHeight: 3, miniatureHeight: 45, miniatureCount: 2,
    lipAngle: 45, slotSpacingLeft: 6, slotSpacingRight: 6 }]
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ rails }) => {
    localStorage.setItem('insertforge-interface', 'modern');
    localStorage.setItem('counter-tray-project', JSON.stringify({
      schemaVersion: 3, appVersion: '1.2.33', name: 'Editor layout test', inventory: [],
      cardSizes: [{ id: 'standard', name: 'Standard', width: 66, length: 91, thickness: 0.5 }],
      counterShapes: [], globalSettings: { gameContainerWidth: 250, gameContainerDepth: 250, gameContainerHeight: null },
      layers: [{ id: 'layer', name: 'Layer', boxes: [], boards: [], layeredBoxes: [], looseTrays: [
        { id: 'rails', name: 'Rail test', type: 'miniatureRack', color: '#83a8df', showEmboss: false, params: rails },
        { id: 'sockets', name: 'Socket test', type: 'miniatureRack', color: '#83a8df', showEmboss: false,
          params: { ...rails, variant: 'sockets', sockets: {} } },
        { id: 'well', name: 'Well test', type: 'cardWell', color: '#83a8df', showEmboss: false, autoHeight: false,
          params: { layout: { columns: [['cell']] }, stacks: [{ id: 'stack', cellId: 'cell', cardSizeId: 'standard', count: 30, rotation: 0 }],
            trayWidthOverride: null, trayDepthOverride: null, wallThickness: 2, floorThickness: 2, clearance: 1, rimHeight: 3,
            engraveStackLabels: false, outerCornerRadius: 3 } }
      ] }], selectedLayerId: 'layer', selectedBoxId: null, selectedTrayId: null
    }));
  }, { rails: railParams });
});

test.describe('Touch help', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('opens on tap and stays within the mobile viewport', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Expand editor', exact: true }).tap();
    const help = page.getByRole('button', { name: 'Help: Game container dimensions', exact: true });
    const text = page.getByRole('tooltip').filter({ hasText: 'Set to the inner dimensions' });
    await expect(text).toBeHidden();
    const titleRow = help.locator('xpath=ancestor::div[contains(@class,"helpRow")]');
    expect(await titleRow.getByRole('heading', { name: 'Game Container', exact: true }).count()).toBe(1);
    await help.tap();
    await expect(text).toBeVisible();
    const rect = await text.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(844);
    await page.touchscreen.tap(385, 839);
    await expect(text).toBeHidden();
  });
});

test('all printable piece editors use the same dimension and manufacturing categories', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const section = (title: string) => page.locator('.editorSectionGroup').filter({ has: page.locator('summary', { hasText: new RegExp(`^${title}`) }) });
  async function verify(dimLabel: RegExp, printLabel: RegExp, autoHeight = true) {
    const dims = section('Dimensions');
    const manufacturing = section('Manufacturing');
    await expect(dims).toHaveCount(1);
    await expect(manufacturing).toHaveCount(1);
    await expect(dims.getByRole('spinbutton', { name: dimLabel, includeHidden: true })).toHaveCount(dimLabel.source === '^never$' ? 0 : 1);
    await expect(manufacturing.getByRole('spinbutton', { name: printLabel, includeHidden: true })).toHaveCount(1);
    await expect(dims.getByRole('spinbutton', { name: printLabel, includeHidden: true })).toHaveCount(0);
    await expect(manufacturing.getByLabel('Auto-adjust height to layer', { exact: true })).toHaveCount(0);
    await expect(dims.getByLabel('Auto-adjust height to layer', { exact: true })).toHaveCount(autoHeight ? 1 : 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: /Well test.*loose/ }).click();
  await verify(/^Minimum width$/, /^Wall$/);
  await page.getByRole('button', { name: /Rail test.*loose/ }).click();
  await verify(/^Height$/, /^Wall Thickness$/);
  await page.getByRole('button', { name: /Socket test.*loose/ }).click();
  await verify(/^Maximum rack width$/, /^Wall thickness$/, false);
  await expect(section('Manufacturing').getByLabel('Diameter clearance (total)', { exact: true })).toHaveCount(1);
  for (const [menu, dimLabel, printLabel, autoHeight] of [
    [/^Counters Stacks/, /^Tray width/, /^Wall$/, true],
    [/^Cup tray Bowl/, /^Cavity height$/, /^Wall$/, true],
    [/^Tile tray Single/, /^never$/, /^Wall$/, true],
    [/^Card draw Single/, /^never$/, /^Wall$/, true],
    [/^Card divider Divided/, /^Max height$/, /^Wall$/, true],
    [/^Card Storage One/, /^Maximum total height/, /^Wall/, false],
    [/^Dice Tray Experimental Individual/, /^Minimum outer width$/, /^Wall thickness$/, false]
  ] as const) {
    await page.getByRole('button', { name: '+ Add loose tray', exact: true }).click();
    await page.getByRole('button', { name: menu }).click();
    await verify(dimLabel, printLabel, autoHeight);
    if (menu.source.startsWith('^Card draw')) {
      await expect(section('Manufacturing').getByLabel('Diameter', { exact: true })).toHaveCount(1);
    }
    if (menu.source.startsWith('^Card Storage')) {
      await section('Dimensions').getByRole('combobox', { name: 'Size by', exact: true }).selectOption('length');
      await expect(section('Dimensions').getByRole('spinbutton', { name: /^Exterior length/ })).toHaveCount(1);
      await section('Lid').getByRole('combobox', { name: 'Closure', exact: true }).selectOption('sliding');
      await expect(section('Lid').getByRole('spinbutton', { name: /^Lid thickness/ })).toHaveCount(1);
      await expect(section('Manufacturing').getByRole('spinbutton', { name: /^Lid thickness/, includeHidden: true })).toHaveCount(0);
    }
  }
  await expect(section('Distribution').getByLabel('Columns', { exact: true })).toHaveCount(1);
  await expect(section('Lid').getByLabel('Add lid', { exact: true })).toHaveCount(1);
  await section('Lid').getByLabel('Add lid', { exact: true }).check();
  await expect(section('Lid').getByLabel('Lid thickness', { exact: true })).toHaveCount(1);
  await expect(section('Manufacturing').getByLabel('Lid thickness', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '+ Add board', exact: true }).click();
  await expect(section('Dimensions').getByRole('spinbutton')).toHaveCount(3);
  await expect(section('Manufacturing')).toHaveCount(0);
});

for (const width of [1280, 1920]) {
  test(`Box categories and numeric widths agree with Layered Box at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: '+ Add box', exact: true }).click();
    await page.getByRole('button', { name: /^Empty box Empty container/ }).click();
    await expect(page.getByLabel('Fill empty space solid', { exact: true })).not.toBeChecked();
    async function verifyGroups() {
      const section = (title: string) => page.locator('.editorSectionGroup').filter({ has: page.locator('summary', { hasText: new RegExp(`^${title}$`) }) });
      const dimensions = section('Dimensions');
      const manufacturing = section('Manufacturing');
      const lid = section('Lid');
      await expect(dimensions.getByLabel(/^Width \(min:/)).toHaveCount(1);
      await expect(dimensions.getByLabel('Tolerance', { exact: true })).toHaveCount(0);
      for (const label of ['Tolerance', 'Wall', 'Floor']) await expect(manufacturing.getByLabel(label, { exact: true })).toHaveCount(1);
      await expect(lid.getByLabel('Show name on lid top', { exact: true })).toHaveCount(1);
      const sizes = await page.locator('.boxSection input[type="number"], .layeredBoxSection input[type="number"]').evaluateAll(inputs => inputs.map(input => input.closest('.control__inputWrapper')!.getBoundingClientRect().width));
      expect(sizes.length).toBeGreaterThanOrEqual(6);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await verifyGroups();
    await page.getByRole('button', { name: '+ Add layered box', exact: true }).click();
    await page.getByRole('button', { name: /^Empty layered box/ }).click();
    await verifyGroups();
  });

  test(`Beta editor aligns controls and scrolls expanded racks at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('geometry-ready')).toHaveCount(1, { timeout: 60_000 });
    const canvas = page.locator('.trayViewer canvas').first();
    const bounds = await canvas.boundingBox();
    const tabAlignment = await page.getByRole('tablist', { name: 'Dimension sections' }).getByRole('tab').evaluateAll(tabs => tabs.map(tab => {
      const label = tab.querySelector('.tabLabel')!.getBoundingClientRect();
      const count = tab.querySelector('.tabCount')?.getBoundingClientRect() ?? label;
      const b = tab.getBoundingClientRect();
      return Math.abs((label.left + count.right) / 2 - (b.left + b.right) / 2);
    }));
    expect(Math.max(...tabAlignment)).toBeLessThan(1);
    const measureWidth = await page.getByLabel('Width', { exact: true }).evaluate(input => input.parentElement!.getBoundingClientRect().width);
    expect(measureWidth).toBeLessThanOrEqual(162);
    expect(measureWidth).toBeGreaterThan(110);

    await page.getByRole('button', { name: /Well test.*loose/ }).click();
    const manufacturing = page.locator('.editorSectionGroup').filter({ has: page.locator('summary', { hasText: /^Manufacturing/ }) });
    const dimensionsSection = page.locator('.editorSectionGroup').filter({ has: page.locator('summary', { hasText: /^Dimensions/ }) });
    await dimensionsSection.locator('summary').click();
    await expect(dimensionsSection.getByLabel('Auto-adjust height to layer', { exact: true })).toBeVisible();
    await dimensionsSection.getByLabel('Auto-adjust height to layer', { exact: true }).check();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('counter-tray-project')!).layers[0].looseTrays.find((t: { id: string }) => t.id === 'well').autoHeight)).toBe(true);
    await expect(page.locator('.editorSectionGroup > summary').filter({ hasText: /^(Extraction|Corner finish)/ })).toHaveCount(0);
    await manufacturing.getByLabel('Outer corner radius', { exact: true }).fill('4');
    await manufacturing.getByLabel('Extraction notches', { exact: true }).check();
    await manufacturing.getByLabel('Notch diameter', { exact: true }).fill('24');
    await manufacturing.getByLabel('Notch diameter', { exact: true }).press('Tab');
    await expect.poll(() => page.evaluate(() => {
      const tray = JSON.parse(localStorage.getItem('counter-tray-project')!).layers[0].looseTrays.find((t: { id: string }) => t.id === 'well');
      return [tray.params.outerCornerRadius, tray.params.extractionNotches, tray.params.extractionNotchDiameter];
    })).toEqual([4, true, 24]);

    await page.getByRole('button', { name: /Rail test.*loose/ }).click();
    await expect(page.locator('.editorSectionGroup > summary').filter({ hasText: /^Manufacturing/ })).toBeVisible();
    const quantity = page.getByLabel('Miniatures in slot 1', { exact: true });
    await quantity.click();
    const alignment = await quantity.evaluate(input => {
      const parent = input.closest('.slotCountControl')!;
      const box = parent.getBoundingClientRect();
      const buttons = [...parent.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      return { left: box.left, right: box.right, buttons: buttons.map(b => ({ left: b.left, right: b.right })),
        font: parseFloat(getComputedStyle(parent.querySelector('.slotCountLabel')!).fontSize) };
    });
    for (const button of alignment.buttons) {
      expect(button.left).toBeGreaterThanOrEqual(alignment.left);
      expect(button.right).toBeLessThanOrEqual(alignment.right);
    }
    expect(alignment.font).toBeGreaterThanOrEqual(13);
    const baseDepth = page.getByLabel('Rack Base Depth', { exact: true });
    const wall = page.getByLabel('Wall Thickness', { exact: true });
    const fieldWidth = (input: Element) => input.closest('.control__inputWrapper')!.getBoundingClientRect().width;
    expect(await baseDepth.evaluate(fieldWidth)).toBe(await wall.evaluate(fieldWidth));
    const baseHelp = await page.getByRole('button', { name: 'Help: Rack base depth', exact: true }).boundingBox();
    const baseInput = await baseDepth.boundingBox();
    expect(baseHelp!.y + baseHelp!.height).toBeLessThanOrEqual(baseInput!.y);

    await page.getByRole('button', { name: /Socket test.*loose/ }).click();
    const help = page.getByRole('button', { name: 'Help: Fixed dimensions', exact: true });
    for (const [helpName, controlName] of [
      ['Help: Stacking racks', 'Lighten floor below each base'],
      ['Help: Capacity', null],
      ['Help: Corner radius', 'Outer corner radius']
    ] as const) {
      const tip = page.getByRole('button', { name: helpName, exact: true });
      const row = tip.locator('xpath=ancestor::div[contains(@class,"helpRow")]');
      const target = helpName === 'Help: Corner radius' ? row.locator('.control__label')
        : controlName ? row.getByLabel(controlName, { exact: true }) : row.locator('p');
      const a = await tip.boundingBox();
      const b = await target.boundingBox();
      expect(a!.x).toBeGreaterThan(b!.x + b!.width - 1);
      expect(a!.y).toBeLessThan(b!.y + b!.height);
      expect(a!.y + a!.height).toBeGreaterThan(b!.y);
    }
    const helpText = page.getByRole('tooltip').filter({ hasText: 'Leave fixed dimensions blank' });
    await expect(helpText).toBeHidden();
    await help.hover();
    await expect(helpText).toBeVisible();
    const helpBounds = await helpText.boundingBox();
    expect(helpBounds!.x).toBeGreaterThanOrEqual(0);
    expect(helpBounds!.x + helpBounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(helpText).toBeHidden();
    await help.click();
    await page.mouse.move(5, 5);
    await expect(helpText).toBeVisible();
    await help.click();
    await expect(helpText).toBeHidden();
    await help.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(helpText).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(helpText).toBeHidden();
    await page.getByLabel('Tab thickness', { exact: true }).click();
    expect(await page.locator('.socketEditor .editorSectionGroup[open]').count()).toBe(5);
    const bottom = await page.getByLabel('Tab thickness', { exact: true }).boundingBox();
    const footer = await page.getByRole('region', { name: 'Export selected element' }).boundingBox();
    expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(footer!.y);
    expect(await page.locator('.panelContent').evaluate(el => el.scrollTop)).toBeGreaterThan(100);
    expect(await canvas.boundingBox()).toEqual(bounds);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByLabel('Number of miniatures', { exact: true }).click();
    await expect(page.getByRole('group', { name: 'Distribution settings', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Miniature measurements', exact: true })).toBeVisible();
    expect(await page.getByLabel('Number of miniatures', { exact: true }).evaluate(input => input.closest('.control')!.querySelectorAll('.control__end').length)).toBe(0);
    await page.getByRole('combobox', { name: 'Layout mode', exact: true }).selectOption('models');
    await expect(page.getByRole('group', { name: 'Miniature measurements', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Model 1 count', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Layout mode', exact: true }).selectOption('grid');
    await expect(page.getByLabel('Rows', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Columns', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Layout mode', exact: true }).selectOption('free');
    await page.getByLabel('Add flat stacking lid', { exact: true }).check();
    await page.getByLabel('Add lid text', { exact: true }).check();
    await page.getByRole('combobox', { name: 'Lid text mode', exact: true }).selectOption('inlay');
    const labels = [];
    for (const name of ['Add flat stacking lid', 'Lid thickness', 'Add lid text', 'Lid text', 'Lid text mode', 'Lid text colour']) {
      const input = name === 'Lid text mode' ? page.getByRole('combobox', { name, exact: true }) : page.getByLabel(name, { exact: true });
      labels.push(await input.evaluate(input => {
        const style = getComputedStyle((input as HTMLInputElement).labels![0]);
        return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
      }));
    }
    for (const label of labels) expect(label).toEqual(labels[0]);
    await page.getByLabel('Lid text', { exact: true }).click();
    await page.screenshot({ path: `test-results/editor-layout-${width}.png` });
  });
}
