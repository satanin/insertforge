import { expect, test } from '@playwright/test';

test('fully allocated groups are checked and disabled without selecting them for the current piece', async ({
  page
}) => {
  await page.addInitScript(() => {
    const params = {
      cardSizeId: 'card-standard',
      cardCount: 10,
      wallThickness: 4,
      floorThickness: 4,
      clearance: 1.5,
      floorSlopeAngle: 5,
      magnetHoleDiameter: 6,
      magnetHoleDepth: 3
    };
    localStorage.setItem(
      'counter-tray-project',
      JSON.stringify({
        schemaVersion: 3,
        appVersion: '1.2.22',
        name: 'Availability test',
        inventory: ['Reserved', 'Partial', 'Current', 'Free'].map((name, i) => ({
          id: `g${i}`,
          name,
          kind: 'cards',
          quantity: 10,
          revision: 1,
          width: 66,
          depth: 91,
          thickness: 0.5
        })),
        counterShapes: [],
        cardSizes: [{ id: 'card-standard', name: 'Standard', width: 66, length: 91, thickness: 0.5 }],
        layers: [
          {
            id: 'layer',
            name: 'Layer',
            boxes: [],
            layeredBoxes: [],
            boards: [],
            looseTrays: [
              {
                id: 'other',
                name: 'Other piece',
                color: '#cc5533',
                type: 'cardDraw',
                params,
                inventoryAssignments: [
                  { groupId: 'g0', quantity: 10, revision: 1 },
                  { groupId: 'g1', quantity: 5, revision: 1 }
                ]
              },
              {
                id: 'target',
                name: 'Target',
                color: '#cc5533',
                type: 'cardDraw',
                params,
                inventoryAssignments: [{ groupId: 'g2', quantity: 4, revision: 1 }]
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
  await content.getByRole('button', { name: 'Change inventory content' }).click();
  const reserved = content.getByRole('checkbox', { name: /^Reserved/ });
  await expect(reserved).toBeChecked();
  await expect(reserved).toBeDisabled();
  await expect(content).toContainText('10 in Layer / Other piece');
  const partial = content.getByRole('checkbox', { name: /^Partial/ });
  await expect(partial).not.toBeChecked();
  await expect(partial).toBeEnabled();
  await expect(content.getByRole('checkbox', { name: /^Current/ })).toBeChecked();
  await expect(content.getByRole('checkbox', { name: /^Current/ })).toBeEnabled();
  await expect(content.getByRole('checkbox', { name: /^Free/ })).not.toBeChecked();
  await content.getByRole('button', { name: 'Apply content', exact: true }).click();
  await expect(content.getByText('Current', { exact: true })).toBeVisible();
  await expect(content.getByText('Reserved', { exact: true })).toHaveCount(0);
});
