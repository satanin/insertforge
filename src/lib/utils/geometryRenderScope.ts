import type { GenerationScope } from './geometryWorker';

export type GeometryViewMode = 'tray' | 'all' | 'exploded' | 'all-no-lid' | 'layer';

export function getGeometryGenerationScopeForViewMode(viewMode: GeometryViewMode): GenerationScope {
  if (viewMode === 'all-no-lid') return 'all';
  if (viewMode === 'layer') return 'layer';
  return 'selected';
}
