import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('interface-test-seeded')) return;
    localStorage.setItem('interface-test-seeded', 'true');
    localStorage.setItem(
      'counter-tray-project',
      JSON.stringify({
        schemaVersion: 3,
        appVersion: '1.2.32',
        name: 'Interface test',
        cardSizes: [{ id: 'standard', name: 'Standard', width: 66, length: 91, thickness: 0.8 }],
        counterShapes: [],
        inventory: [],
        globalSettings: { gameContainerWidth: 250, gameContainerDepth: 250, gameContainerHeight: null },
        layers: [
          {
            id: 'layer',
            name: 'Bottom layer',
            boxes: [],
            layeredBoxes: [],
            boards: [],
            looseTrays: [
              {
                id: 'well',
                name: 'Cartas de inicio',
                type: 'cardWell',
                color: '#83a8df',
                autoHeight: false,
                showEmboss: false,
                params: {
                  layout: {
                    columns: [
                      ['a', 'b'],
                      ['c', 'd']
                    ]
                  },
                  stacks: ['a', 'b', 'c', 'd'].map((cellId, i) => ({
                    id: `s${i}`,
                    cellId,
                    cardSizeId: 'standard',
                    count: 20,
                    rotation: 0
                  })),
                  wallThickness: 2,
                  floorThickness: 2,
                  clearance: 1,
                  rimHeight: 3,
                  trayWidthOverride: null,
                  trayDepthOverride: null,
                  engraveStackLabels: false,
                  outerCornerRadius: 3
                }
              }
            ]
          }
        ],
        selectedLayerId: 'layer',
        selectedTrayId: 'well',
        selectedBoxId: null
      })
    );
  });
});

test('New Beta is the default and an explicit Classic preference survives reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Interface', { exact: true })).toHaveValue('modern');
  await expect(page.getByLabel('Interface', { exact: true }).locator('option')).toHaveCount(2);
  await page.getByLabel('Interface', { exact: true }).selectOption('classic');
  await page.reload();
  await expect(page.getByLabel('Interface', { exact: true })).toHaveValue('classic');
});

test('project card thickness updates a selected sleeve and survives reload', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.getByTestId('geometry-ready')).toHaveCount(1, { timeout: 60_000 });
  await page.getByRole('tab', { name: /^Cards/ }).click();
  await expect(page.getByText('Standard Premium', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('No sleeves', { exact: true })).toHaveValue('0.3');
  await expect(page.getByLabel('Standard sleeves', { exact: true })).toHaveValue('0.5');
  await page.getByLabel('Premium sleeves', { exact: true }).fill('0.9');
  await page.getByLabel('Premium sleeves', { exact: true }).press('Tab');
  await page.getByRole('button', { name: /Cartas de inicio.*loose/ }).click();
  await page.getByLabel('Sleeves A1', { exact: true }).click();
  await page.getByRole('option', { name: 'Premium sleeves · 0.9 mm', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('counter-tray-project')!);
    return [p.cardSleeveThicknesses.premium, p.layers[0].looseTrays[0].params.stacks[0].sleeve];
  })).toEqual([0.9, 'premium']);
  await expect(page.locator('.editorExterior')).toContainText('23.0');
  await page.reload();
  await expect(page.getByTestId('geometry-ready')).toHaveCount(1, { timeout: 60_000 });
  await page.getByRole('button', { name: /Cartas de inicio.*loose/ }).click();
  await expect(page.getByLabel('Sleeves A1', { exact: true })).toContainText('Premium sleeves · 0.9 mm');
  await page.screenshot({ path: 'test-results/project-card-sleeves.png' });
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 }
]) {
  test(`interface switching preserves canvas, project and selection at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('Interface', { exact: true }).selectOption('classic');
    await page.getByRole('button', { name: /Cartas de inicio.*loose/ }).click();
    await expect(page.getByTestId('geometry-ready')).toHaveCount(1, { timeout: 60_000 });
    // The second canvas is the existing ViewCube, not the piece viewport.
    const canvas = page.locator('.trayViewer canvas').first();
    await expect(canvas).toBeVisible();
    const before = await canvas.boundingBox();
    const handle = await canvas.elementHandle();
    const projectBefore = await page.evaluate(() => localStorage.getItem('counter-tray-project'));

    await page.getByLabel('Interface', { exact: true }).selectOption('modern');
    await expect(page.locator('.appContainer')).toHaveClass(/ui-modern/);
    const after = await canvas.boundingBox();
    expect(after).toEqual(before);
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('counter-tray-project'))).toBe(projectBefore);
    await expect(page.locator('.panelHeader')).toContainText('Cartas de inicio');

    await page.getByRole('button', { name: 'Top', exact: true }).click();
    await page.getByRole('button', { name: 'Perspective', exact: true }).click();
    const content = page
      .locator('.editorSectionGroup')
      .filter({ has: page.locator('summary', { hasText: /^Content/ }) });
    await content.getByRole('button', { name: 'Increase Cards in A1', exact: true }).click();
    await expect(content.getByLabel('Cards in A1', { exact: true })).toHaveValue('21');
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('counter-tray-project')!).layers[0].looseTrays[0].params.stacks[0].count
        )
      )
      .toBe(21);
    await page
      .locator('.editorSectionGroup > summary')
      .filter({ hasText: /^Dimensions/ })
      .click();
    await page.getByLabel('Minimum width', { exact: true }).fill('180');
    await page.getByLabel('Minimum width', { exact: true }).press('Tab');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('counter-tray-project')!).layers[0].looseTrays[0].params.trayWidthOverride
        )
      )
      .toBe(180);

    const projectAfterEditing = await page.evaluate(() => localStorage.getItem('counter-tray-project'));
    await page.getByLabel('Interface', { exact: true }).selectOption('classic');
    await expect(page.locator('.appContainer')).not.toHaveClass(/ui-modern/);
    expect(await canvas.boundingBox()).toEqual(before);
    expect(await handle!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('counter-tray-project'))).toBe(projectAfterEditing);
    await expect(page.getByLabel('Minimum width', { exact: true })).toHaveValue('180');

    await page.getByLabel('Interface', { exact: true }).selectOption('modern');
    await page.reload();
    await expect(page.getByLabel('Interface', { exact: true })).toHaveValue('modern');
    await page.getByRole('button', { name: /Cartas de inicio.*loose/ }).click();
    await expect(page.getByLabel('Cards in A1', { exact: true })).toHaveValue('21');
    await page.getByRole('button', { name: /Project ▴/ }).click();
    await expect(page.locator('#project-navigation .navMenu')).toBeHidden();
    await expect(canvas).toBeVisible();
    await page.getByRole('button', { name: /Project ▾/ }).click();
    await expect(page.locator('#project-navigation .navMenu')).toBeVisible();
    if (viewport.width === 1920) {
      await page.getByRole('button', { name: /Project ▴/ }).click();
      await page.screenshot({ path: 'test-results/interface-modern.png', fullPage: true });
    }
  });
}

test('interface preference tolerates unavailable browser storage', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'insertforge-interface') throw new DOMException('Storage blocked', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByLabel('Interface', { exact: true }).selectOption('modern');
  await expect(page.locator('.appContainer')).toHaveClass(/ui-modern/);
  await page.getByLabel('Interface', { exact: true }).selectOption('classic');
  await expect(page.locator('.appContainer')).not.toHaveClass(/ui-modern/);
});

test('modern interface keeps the existing responsive viewer and theme control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Interface', { exact: true }).selectOption('modern');
  await expect(page.locator('.trayViewer canvas').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Top', exact: true })).toBeVisible();
  if (await page.getByRole('button', { name: 'Switch to dark theme' }).count()) {
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  }
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('.appContainer')).toHaveClass(/light/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.appContainer')).toHaveClass(/dark/);
  await page.getByLabel('Interface', { exact: true }).selectOption('classic');
  await expect(page.locator('.trayViewer canvas').first()).toBeVisible();
});

test('modern quantity controls align in the inventory and piece editor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Interface', { exact: true }).selectOption('modern');
  await page.getByRole('button', { name: /Game components/ }).click();
  await page.getByRole('button', { name: '+ Cards', exact: true }).click();
  const inventoryHeight = await page.getByLabel('Group quantity', { exact: true }).evaluate((input) => {
    const height = input.getBoundingClientRect().height;
    return { height, buttons: [...input.parentElement!.querySelectorAll('button')].map(b => b.getBoundingClientRect().height) };
  });
  expect(inventoryHeight.buttons).toEqual([inventoryHeight.height, inventoryHeight.height]);
  await page.getByRole('button', { name: 'Close inventory' }).click();
  await page.getByRole('button', { name: /Cartas de inicio.*loose/ }).click();
  const pieceHeight = await page.getByLabel('Cards in A1', { exact: true }).evaluate(input => input.getBoundingClientRect().height);
  expect(pieceHeight).toBe(inventoryHeight.height);
  const centering = await page.getByRole('button', { name: 'Increase Cards in A1', exact: true }).evaluate(button => {
    const style = getComputedStyle(button);
    return { display: style.display, align: style.alignItems, justify: style.justifyItems, padding: style.padding };
  });
  expect(centering).toEqual({ display: 'grid', align: 'center', justify: 'center', padding: '0px' });
  await page.locator('.editorSectionGroup > summary').filter({ hasText: /^Dimensions/ }).click();
  const unit = await page.getByLabel('Minimum height', { exact: true }).evaluate(input => {
    const suffix = input.parentElement!.querySelector('.control__end')!;
    const field = input.getBoundingClientRect();
    const end = suffix.getBoundingClientRect();
    const style = getComputedStyle(input);
    return { fieldHeight: field.height, unitHeight: end.height, fieldY: field.y, unitY: end.y, corner: style.borderTopRightRadius };
  });
  expect(unit.unitHeight).toBe(unit.fieldHeight);
  expect(unit.unitY).toBe(unit.fieldY);
  expect(unit.corner).toBe('0px');
});
