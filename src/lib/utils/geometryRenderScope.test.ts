import { describe, expect, it } from 'vitest';
import { getGeometryGenerationScopeForViewMode, type GeometryViewMode } from './geometryRenderScope';

describe('geometry render scope', () => {
  it.each([
    ['tray', 'selected'],
    ['all', 'selected'],
    ['exploded', 'selected'],
    ['all-no-lid', 'all'],
    ['layer', 'layer']
  ] satisfies Array<[GeometryViewMode, 'selected' | 'layer' | 'all']>)('uses %s view scope as %s', (viewMode, expectedScope) => {
    expect(getGeometryGenerationScopeForViewMode(viewMode)).toBe(expectedScope);
  });
});
