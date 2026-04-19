import { describe, expect, it } from 'vitest';

import { cleanGeometryForExport } from './exportGeometryCleanup';

describe('export geometry cleanup', () => {
  it('returns the original geometry unchanged', () => {
    const geometry = {
      polygons: []
    } as unknown as Parameters<typeof cleanGeometryForExport>[0];

    expect(cleanGeometryForExport(geometry)).toBe(geometry);
  });
});
