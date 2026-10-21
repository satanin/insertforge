import { expect, test } from '@playwright/test';

test('token inventory content offers top and edge loading per group', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'counter-tray-project',
      JSON.stringify({
        schemaVersion: 3,
        appVersion: '1.2.22',
        name: 'Loading test',
        inventory: [
          {
            id: 'tokens',
            name: 'Health',
            kind: 'tokens',
            quantity: 50,
            revision: 1,
            baseShape: 'square',
            width: 20,
            depth: 20,
            thickness: 2
          }
        ],
        cardSizes: [],
        counterShapes: [
          { id: 'shape-square', name: 'Square', baseShape: 'square', width: 20, length: 20, thickness: 2 }
        ],
        layers: [
          {
            id: 'layer',
            name: 'Layer',
            boxes: [],
            layeredBoxes: [],
            boards: [],
            looseTrays: [
              {
                id: 'target',
                name: 'Target',
                type: 'counter',
                color: '#cc5533',
                params: {
                  counterThickness: 2,
                  clearance: 0.3,
                  wallThickness: 2,
                  floorThickness: 2,
                  rimHeight: 1,
                  cutoutRatio: 0.35,
                  cutoutMax: 12,
                  trayWidthOverride: 0,
                  topLoadedStacks: [['shape-square', 1]],
                  edgeLoadedStacks: [],
                  gameContainerWidth: 250,
                  gameContainerDepth: 250
                }
              }
            ]
          }
        ],
        selectedLayerId: 'layer',
        selectedTrayId: 'target',
        selectedBoxId: null,
        globalSettings: { gameContainerWidth: 250, gameContainerDepth: 250, gameContainerHeight: null }
      })
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Target.*loose/ }).click();
  const content = page.getByRole('region', { name: 'Inventory content' });
  await content.getByRole('button', { name: 'Select from inventory' }).click();
  await content.getByRole('checkbox', { name: /^Health/ }).check();
  await content.getByLabel('Loading for Health').selectOption('edge');
  await content.getByLabel('Edge orientation for Health').selectOption('crosswise');
  await content.getByRole('button', { name: 'Apply content', exact: true }).click();
  await content.getByRole('button', { name: 'Change inventory content' }).click();
  await expect(content.getByLabel('Loading for Health')).toHaveValue('edge');
  await expect(content.getByLabel('Edge orientation for Health')).toHaveValue('crosswise');
  await content.getByLabel('Loading for Health').selectOption('top');
  await expect(content.getByLabel('Edge orientation for Health')).toHaveCount(0);
});
