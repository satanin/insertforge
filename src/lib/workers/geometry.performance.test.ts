import project from '$lib/data/defaultProject.json';
import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// Manual benchmark: BENCH_GEOMETRY=1 pnpm exec vitest run src/lib/workers/geometry.performance.test.ts
// A fresh worker module per pass measures construction, rather than a warm geometry cache.
describe.skipIf(!process.env.BENCH_GEOMETRY)('default project geometry benchmark', () => {
  it('measures complete worker generation without touching browser storage', async () => {
    const results: unknown[] = [];
    for (let pass = 0; pass < 3; pass++) {
      vi.resetModules();
      const logs: string[] = [];
      const log = vi.spyOn(console, 'log').mockImplementation((message) => logs.push(String(message)));
      const start = performance.now();
      const result = await new Promise<Record<string, unknown>>(async (resolve, reject) => {
        vi.stubGlobal('self', {
          postMessage: (message: Record<string, unknown>) => {
            if (message.type === 'generate-result') resolve(message);
          }
        });
        try {
          await import('./geometry.worker');
          const sample = structuredClone(project);
          const layers = sample.layers.map((layer) => ({ ...layer, boards: [], layeredBoxes: [] }));
          self.onmessage!({
            data: {
              type: 'generate',
              id: pass + 1,
              project: { ...sample, layers },
              selectedBoxId: '',
              selectedTrayId: '',
              scope: 'all'
            }
          } as MessageEvent);
        } catch (error) {
          reject(error);
        }
      });
      const elapsed = performance.now() - start;
      log.mockRestore();
      vi.unstubAllGlobals();
      expect(result.error).toBeUndefined();
      const meshes = JSON.parse(
        JSON.stringify(result, (key, value) => {
          if (!ArrayBuffer.isView(value)) return value;
          const array = value as Float32Array;
          if (key !== 'positions') return { length: array.length };
          let volume = 0;
          const min = [Infinity, Infinity, Infinity],
            max = [-Infinity, -Infinity, -Infinity];
          for (let i = 0; i < array.length; i += 3) {
            for (let axis = 0; axis < 3; axis++) {
              min[axis] = Math.min(min[axis], array[i + axis]);
              max[axis] = Math.max(max[axis], array[i + axis]);
            }
          }
          for (let i = 0; i < array.length; i += 9) {
            volume +=
              (array[i] * (array[i + 4] * array[i + 8] - array[i + 5] * array[i + 7]) +
                array[i + 1] * (array[i + 5] * array[i + 6] - array[i + 3] * array[i + 8]) +
                array[i + 2] * (array[i + 3] * array[i + 7] - array[i + 4] * array[i + 6])) /
              6;
          }
          return { length: array.length, volume, min, max };
        })
      );
      results.push({ pass, elapsed, logs, meshes });
      console.log(JSON.stringify({ pass, elapsed, logs }));
    }
    if (process.env.BENCH_OUTPUT) writeFileSync(process.env.BENCH_OUTPUT, JSON.stringify(results, null, 2));
  }, 120000);
});
