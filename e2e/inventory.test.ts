import { expect, test } from '@playwright/test';
test.use({ actionTimeout: 15_000 });

test('inventory entry, inheritance and assigning card content to a piece', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: /Game components/ }).click();
  const inventory = page.locator('dialog[open]');
  await inventory.getByRole('button', { name: '+ Cards', exact: true }).click();
  const rows = inventory.locator('[data-group]');
  await expect(rows.first().getByRole('button', { name: /Decrease quantity/ })).toBeDisabled();
  await rows.first().getByRole('button', { name: /Increase quantity/ }).click();
  await expect(rows.first().getByLabel('Group quantity')).toHaveValue('2');
  await rows.first().getByRole('button', { name: /Decrease quantity/ }).click();
  await expect(rows.first().getByLabel('Group quantity')).toHaveValue('1');
  await rows.first().getByRole('textbox', { name: 'Group name', exact: true }).fill('Starting cards');
  await rows.first().getByLabel('Group quantity').fill('128');
  await rows.first().getByLabel('Group quantity').press('Tab');
  await rows.first().getByLabel('Sleeves', { exact: true }).selectOption('premium');
  await inventory.getByRole('button', { name: '+ Cards', exact: true }).click();
  await expect(rows.nth(1).getByLabel('Sleeves', { exact: true })).toHaveValue('premium');
  await rows.nth(1).getByRole('textbox', { name: 'Group name', exact: true }).fill('Events');
  await rows.nth(1).getByLabel('Sleeves', { exact: true }).selectOption('manual');
  await rows.nth(1).getByLabel('Thickness per card', { exact: true }).first().fill('0.6');
  await rows.nth(1).getByLabel('Thickness per card', { exact: true }).first().press('Tab');
  await inventory.getByRole('button', { name: '+ Tokens', exact: true }).click();
  await rows.nth(2).getByRole('textbox', { name: 'Group name', exact: true }).fill('Health tokens');
  await rows.nth(2).getByLabel('Project shape', { exact: true }).selectOption('shape-square');
  await rows.nth(2).getByLabel('Width', { exact: true }).fill('20');
  await rows.nth(2).getByLabel('Width', { exact: true }).press('Tab');
  await inventory.getByRole('button', { name: '+ Dice', exact: true }).click();
  const projectDie = rows.nth(3).getByLabel('Project dice size', { exact: true });
  const d10Id = await projectDie.locator('option').filter({ hasText: /\(d10,/ }).first().getAttribute('value');
  await projectDie.selectOption(d10Id!);
  await expect(rows.nth(3).getByRole('combobox')).toHaveCount(2); // Component type + project die.
  await rows.nth(3).getByLabel('Maximum outer size', { exact: true }).fill('16');
  await rows.nth(3).getByLabel('Maximum outer size', { exact: true }).press('Tab');
  await expect(projectDie).toHaveValue(d10Id!);
  await inventory.getByRole('button', { name: 'Close inventory' }).click();
  await page.getByRole('button', { name: '+ Add loose tray', exact: true }).first().click();
  await page.getByRole('button', { name: 'Card Storage One cavity with removable, labelled dividers' }).click();
  const content = page.getByRole('region', { name: 'Inventory content' });
  await content.getByRole('button', { name: 'Select from inventory', exact: true }).click();
  await content.getByRole('checkbox', { name: /Starting cards/ }).check();
  await content.getByLabel('Quantity of Starting cards').fill('64');
  await content.getByLabel('Quantity of Starting cards').press('Tab');
  await content.getByRole('button', { name: 'Apply content', exact: true }).click();
  await expect(content).toContainText('Inventory dimensions and quantities applied.');
  await expect(page.locator('.storageEditor').getByLabel('Number of cards')).toHaveValue('64');
  await content.getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(inventory.locator('[data-group]').first().locator('.assignments')).toContainText('64 / 128');
  await expect(inventory.locator('[data-group]').first().locator('.assignments')).toContainText('Card Storage');
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('counter-tray-project') ?? '{}').inventory?.[0]?.quantity)
    )
    .toBe(128);
  await page.screenshot({ path: test.info().outputPath('inventory-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inventory).toBeVisible();
  expect(await inventory.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('inventory-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await inventory.getByRole('button', { name: 'Close inventory' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Game components/ }).click();
  await expect(
    page.locator('dialog[open] [data-group]').first().getByRole('textbox', { name: 'Group name', exact: true })
  ).toHaveValue('Starting cards');
  await expect(page.locator('dialog[open] [data-group]').first().locator('.assignments')).toContainText('64 / 128');
  const restoredDice = page.locator('dialog[open] [data-group]').nth(3);
  await expect(restoredDice.getByLabel('Project dice size')).toHaveValue(d10Id!);
  await expect(restoredDice.getByLabel('Maximum outer size', { exact: true })).toHaveValue('16');
  expect(errors).toEqual([]);
});
