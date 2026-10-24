import { expect, test } from '@playwright/test';

test('Card Well minimum dimensions are editable and persist without shrinking the card layout', async ({ page }) => {
  test.setTimeout(60_000);
  // This regression exercises the original always-visible controls.
  // New Beta's collapsible sections are covered by interface-mode.test.ts.
  await page.addInitScript(() => localStorage.setItem('insertforge-interface', 'classic'));
  await page.goto('/');
  await page.getByRole('button', { name: /Card well.*loose/ }).click();
  await page
    .getByLabel(/^Stack name /)
    .first()
    .fill('Cartas de inicio');
  await page
    .getByLabel(/^Stack name /)
    .first()
    .press('Tab');
  await expect(page.locator('.cardWellCell').getByText('Cartas de inicio', { exact: true })).toBeVisible();
  await page.getByLabel('Engrave stack labels', { exact: true }).uncheck();
  await page.getByLabel('Minimum width', { exact: true }).fill('300');
  await page.getByLabel('Minimum length', { exact: true }).fill('300');
  await page.getByLabel('Minimum height', { exact: true }).fill('120');
  await page.getByLabel('Minimum height', { exact: true }).press('Tab');
  await expect(page.locator('.dimensionsInfo').filter({ hasText: '300.0 × 300.0 × 120.0' })).toBeVisible();
  await expect(page.getByText('Current width (X): 300.0 mm', { exact: true })).toBeVisible();
  await expect(page.getByText('Current length (Y): 300.0 mm', { exact: true })).toBeVisible();
  await expect(page.getByText('Current height (Z): 120.0 mm', { exact: true })).toBeVisible();
  await expect(page.locator('.widthLabel')).toHaveText('↔ Width (X): 300.0 mm');
  await expect(page.locator('.lengthLabel')).toHaveText('↔ Length (Y): 300.0 mm');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const project = JSON.parse(localStorage.getItem('counter-tray-project') ?? '{}');
        return project.layers
          ?.flatMap((l: { looseTrays: { type: string; params: { minimumHeight: number } }[] }) => l.looseTrays)
          .find((t: { type: string }) => t.type === 'cardWell')?.params.minimumHeight;
      })
    )
    .toBe(120);
  await page.reload();
  await page.getByRole('button', { name: /Card well.*loose/ }).click();
  await expect(page.getByLabel('Minimum width', { exact: true })).toHaveValue('300');
  await expect(page.getByLabel('Minimum length', { exact: true })).toHaveValue('300');
  await expect(page.getByLabel('Minimum height', { exact: true })).toHaveValue('120');
  await page.getByLabel('Minimum width', { exact: true }).fill('0');
  await page.getByLabel('Minimum length', { exact: true }).fill('');
  await page.getByLabel('Minimum height', { exact: true }).fill('');
  await page.getByLabel('Minimum height', { exact: true }).press('Tab');
  await expect(page.locator('.dimensionsInfo').filter({ hasText: '300.0 × 300.0 × 120.0' })).toHaveCount(0);
  await page.getByLabel('Extraction notches', { exact: true }).check();
  await expect(page.getByLabel('Notch diameter', { exact: true })).toHaveValue('20');
  await page.getByLabel('Notch diameter', { exact: true }).fill('24');
  await page.getByLabel('Notch diameter', { exact: true }).press('Tab');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem('counter-tray-project') ?? '{}');
        return p.layers
          ?.flatMap(
            (l: { looseTrays: { type: string; params: { extractionNotchDiameter: number } }[] }) => l.looseTrays
          )
          .find((t: { type: string }) => t.type === 'cardWell')?.params.extractionNotchDiameter;
      })
    )
    .toBe(24);
  await page.getByLabel('Outer corner radius', { exact: true }).fill('8');
  await page.getByLabel('Outer corner radius', { exact: true }).press('Tab');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem('counter-tray-project') ?? '{}');
        return p.layers
          ?.flatMap((l: { looseTrays: { type: string; params: { outerCornerRadius: number } }[] }) => l.looseTrays)
          .find((t: { type: string }) => t.type === 'cardWell')?.params.outerCornerRadius;
      })
    )
    .toBe(8);
  await page.reload();
  await page.getByRole('button', { name: /Card well.*loose/ }).click();
  await expect(page.getByLabel('Outer corner radius', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel(/^Stack name /).first()).toHaveValue('Cartas de inicio');
  await expect(page.getByLabel('Engrave stack labels', { exact: true })).not.toBeChecked();
});
