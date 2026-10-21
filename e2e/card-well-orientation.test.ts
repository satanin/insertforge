import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

for (const rotation of [0, 90]) {
  test(`individual Card Well preview follows ${rotation}° layer placement`, async ({ page }) => {
    const project = JSON.parse(readFileSync('src/lib/data/defaultProject.json', 'utf8'));
    const tray = project.layers
      .flatMap((l: { looseTrays: { type: string }[] }) => l.looseTrays)
      .find((t: { type: string }) => t.type === 'cardWell');
    tray.color = '#ff0000';
    tray.showEmboss = false;
    tray.autoHeight = false;
    tray.params.layout = { columns: [['cell']] };
    tray.params.stacks = [{ id: 'stack', cellId: 'cell', cardSizeId: 'card-standard', count: 10, rotation: 0 }];
    tray.params.trayWidthOverride = 80;
    tray.params.trayDepthOverride = 160;
    project.layers = [
      {
        id: 'layer',
        name: 'Layer',
        boxes: [],
        boards: [],
        layeredBoxes: [],
        looseTrays: [tray],
        manualLayout: {
          boxes: [],
          boards: [],
          looseTrays: [{ trayId: tray.id, x: 0, y: 0, rotation }]
        }
      }
    ];
    project.selectedLayerId = 'layer';
    project.selectedBoxId = null;
    project.selectedTrayId = tray.id;
    project.globalSettings = { gameContainerWidth: 200, gameContainerDepth: 180, gameContainerHeight: null };
    await page.addInitScript((p) => localStorage.setItem('counter-tray-project', JSON.stringify(p)), project);
    await page.goto(`/?debug=1&angle=top&trayId=${tray.id}&hideUI=1`);
    // Measure the actual coloured WebGL body, rather than just checking stored rotation metadata.
    await expect
      .poll(
        async () => {
          const png = await page.locator('canvas').first().screenshot();
          return page.evaluate(async (encoded) => {
            const image = new Image();
            image.src = `data:image/png;base64,${encoded}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let minX = canvas.width,
              maxX = -1,
              minY = canvas.height,
              maxY = -1;
            for (let y = 0; y < canvas.height; y++)
              for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                if (pixels[i] > 60 && pixels[i] > pixels[i + 1] * 1.8 && pixels[i] > pixels[i + 2] * 1.8) {
                  minX = Math.min(minX, x);
                  maxX = Math.max(maxX, x);
                  minY = Math.min(minY, y);
                  maxY = Math.max(maxY, y);
                }
              }
            return maxX > minX && maxY > minY ? (maxX - minX) / (maxY - minY) : 0;
          }, png.toString('base64'));
        },
        { timeout: 30_000 }
      )
      .toBeCloseTo(rotation === 90 ? 2 : 0.5, 1);
    await page.screenshot({ path: test.info().outputPath(`card-well-${rotation}.png`) });
  });
}
