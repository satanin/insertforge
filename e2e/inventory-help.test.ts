import { expect, test } from '@playwright/test';

test('inventory help stays inside the dialog on desktop and mobile', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Game components/ }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByRole('button', { name: '+ Dice', exact: true }).click();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const help of await dialog.locator('.help').all()) {
      await help.locator('button').focus();
      const tooltip = help.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      await expect.poll(async () => {
        const tip = await tooltip.boundingBox();
        const panel = await dialog.boundingBox();
        if (!tip || !panel) return false;
        return tip.x >= panel.x && tip.x + tip.width <= panel.x + panel.width
          && tip.y >= panel.y && tip.y + tip.height <= panel.y + panel.height
          && tip.x >= 0 && tip.x + tip.width <= viewport.width
          && tip.y >= 0 && tip.y + tip.height <= viewport.height;
      }, { timeout: 15_000 }).toBe(true);
    }
  }
});
