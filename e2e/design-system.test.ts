import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const reference = JSON.parse(readFileSync(new URL('../static/projects/kallax-4x3-vertical-v1.json', import.meta.url), 'utf8'));
test.use({ actionTimeout: 10_000 });

for (const width of [1280, 1920]) {
  test(`Selected module camera controls do not overlap the orientation cube or KALLAX reference at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(project => {
      localStorage.setItem('counter-tray-project', JSON.stringify(project));
      localStorage.setItem('insertforge-interface', 'modern');
    }, reference);
    await page.goto('/');
    await page.getByRole('button', { name: 'Selected module', exact: true }).click();
    const view = page.locator('.moduleView');
    expect((await view.boundingBox())!.y).toBeLessThan(60);
    const toolbar = view.locator('.viewerCameraToolbar');
    await expect(toolbar).toBeVisible();
    const cube = await view.locator('.viewCube').boundingBox();
    const controls = await toolbar.boundingBox();
    const referenceBox = await page.locator('.shelfReference').boundingBox();
    const overlaps = (a: NonNullable<typeof cube>, b: NonNullable<typeof cube>) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps(controls!, cube!)).toBe(false);
    expect(overlaps(controls!, referenceBox!)).toBe(false);
    expect(overlaps(cube!, referenceBox!)).toBe(false);
    await toolbar.getByRole('button', { name: 'Front', exact: true }).click();
    await page.screenshot({ path: `/tmp/insertforge-camera-controls-${width}.png` });
  });
}

for (const theme of ['light', 'dark']) for (const density of ['balanced', 'compact']) {
  test(`${theme} ${density}: shared fields, equal actions, theme and density retain project and canvas`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(({ project, theme, density }) => {
      localStorage.setItem('counter-tray-project', JSON.stringify(project));
      localStorage.setItem('insertforge-interface', 'modern');
      localStorage.setItem('insertforge-density', density);
      localStorage.setItem('mode-watcher-mode', theme);
    }, { project: reference, theme, density });
    await page.goto('/');
    const editor = page.getByRole('complementary', { name: 'Shelf module editor' });
    await expect(editor.getByRole('heading', { name: 'Drawer · Dovetail · 380 mm', exact: true })).toBeVisible();
    await expect(page.locator('.appContainer')).toHaveClass(new RegExp(theme));
    await expect(page.locator('.appContainer')).toHaveAttribute('data-density', density);
    const projectLength = editor.getByLabel('Drawer length (mm)', { exact: true });
    const name = editor.getByLabel('Name', { exact: true });
    const depth = editor.getByLabel('Exterior depth (mm)', { exact: true });
    const joint = editor.getByRole('combobox', { name: 'Drawer joint design', exact: true });
    const selectedDrawer = page.getByRole('combobox', { name: 'Selected drawer', exact: true });
    const appearances = await Promise.all([projectLength, name, depth, joint, selectedDrawer].map(field => field.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width };
    })));
    expect(new Set(appearances.map(field => field.background)).size).toBe(1);
    expect(new Set(appearances.map(field => field.height)).size).toBe(1);
    expect(appearances[0].height).toBeCloseTo(density === 'balanced' ? 36 : 32, 0);
    expect(Math.max(...appearances.slice(0, 4).map(field => field.width)) - Math.min(...appearances.slice(0, 4).map(field => field.width))).toBeLessThan(2);
    const part = editor.locator('.part').first();
    const actions = part.locator('[data-ui-actions]');
    await expect(actions).toHaveAttribute('data-ui-actions', '');
    const first = await actions.getByRole('button').nth(0).boundingBox();
    const second = await actions.getByRole('button').nth(1).boundingBox();
    expect(Math.abs(first!.width - second!.width)).toBeLessThan(1);
    expect(Math.abs(first!.height - second!.height)).toBeLessThan(1);
    for (const measure of await editor.locator('[data-ui-measure]').all()) {
      expect(await measure.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    const sample = editor.getByRole('button', { name: 'Closed front fit test · 3MF', exact: true });
    await sample.scrollIntoViewIfNeeded();
    await sample.hover();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Exports the front' })).toHaveCount(0);
    await expect(page.getByRole('tooltip').filter({ hasText: 'Exports the closed front' })).toBeVisible();
    await expect(editor.getByRole('button', { name: 'About the front fit test', exact: true })).toBeHidden();
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip').filter({ hasText: 'Exports the closed front' })).toBeHidden();
    await editor.evaluate(element => element.scrollTop = 0);
    await page.screenshot({ path: `/tmp/insertforge-design-${theme}-${density}.png`, fullPage: true });
    const canvasCount = await page.locator('canvas').count();
    const next = density === 'balanced' ? 'compact' : 'balanced';
    await page.getByLabel('Interface density', { exact: true }).selectOption(next);
    await expect(page.locator('.appContainer')).toHaveAttribute('data-density', next);
    expect(await page.locator('canvas').count()).toBe(canvasCount);
    await expect(depth).toHaveValue('380');
    expect(await page.evaluate(() => localStorage.getItem('insertforge-density'))).toBe(next);
  });
}
