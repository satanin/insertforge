import { expect, test } from '@playwright/test';

test('inventory add controls and column headings stay visible while rows scroll', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Game components/ }).click();
  const dialog = page.locator('dialog[open]');
  const add = dialog.getByRole('button', { name: '+ Cards', exact: true });
  for (let i = 0; i < 8; i++) await add.click();
  const body = dialog.locator('.inventoryBody');
  for (const viewport of [{ width: 1440, height: 700 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await body.evaluate(el => { el.scrollTop = 0; });
    const initial = await add.boundingBox();
    await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect((await add.boundingBox())!.y).toBe(initial!.y);
    await expect(add).toBeInViewport();
    if (viewport.width > 1200) {
      await expect(dialog.locator('.headings')).toBeInViewport();
      const headings = await dialog.locator('.headings').boundingBox();
      const scrollArea = await body.boundingBox();
      expect(Math.abs(headings!.y - scrollArea!.y)).toBeLessThan(2);
    }
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await add.click();
    await expect(dialog.locator('[data-group]').last().getByLabel('Group name', { exact: true })).toBeFocused();
    await expect(add).toBeInViewport();
  }
});
