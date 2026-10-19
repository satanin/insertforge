import { describe, it, expect } from 'vitest';
import { selectExportElements } from './exportElements';

describe('individual exports', () => {
  const boxes = [{ elementId: 'box', trays: [{ elementId: 'inner', name: 'Same name', jscadGeom: 42 }] }];
  const loose = [{ elementId: 'rack', trayName: 'Same name', trayGeom: 1, parts: [{ id: 'body' }, { id: 'lid' }] }];
  const individuals = [{ elementId: 'board', trayName: 'Board', trayGeom: 3, parts: [] }];
  it('keeps dependent parts for a box and excludes unrelated elements', () => {
    const result = selectExportElements(boxes, loose, individuals, 'box');
    expect(result.boxes).toEqual(boxes); expect(result.trays).toEqual([]);
  });
  it('uses stable IDs for trays, nested trays and standalone parts', () => {
    expect(selectExportElements(boxes, loose, individuals, 'rack').trays).toEqual(loose);
    expect(selectExportElements(boxes, loose, individuals, 'inner').trays[0].trayGeom).toBe(42);
    expect(selectExportElements(boxes, loose, individuals, 'board').trays).toEqual(individuals);
    expect(selectExportElements(boxes, loose, individuals, 'missing').trays).toEqual([]);
  });
  it('exports only a requested lid without changing the cache or global exports', () => {
    expect(selectExportElements(boxes, loose, individuals, 'rack', 'lid').trays[0].parts).toEqual([{ id: 'lid' }]);
    expect(loose[0].parts).toHaveLength(2);
    expect(selectExportElements(boxes, loose, individuals)).toEqual({ boxes, trays: loose });
  });
});
