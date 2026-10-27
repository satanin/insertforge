import { describe, expect, it } from 'vitest';
import { resolveShelfFit } from './shelfFit';
const module = { bodyWidth: 92.4, bodyHeight: 109.3, stackKeyHeight: 2.4, depth: 250, handleProjection: 17.5 };
const space = { width: 330, height: 330, depth: 390, margin: 2 };
describe('shelf fit', () => {
  it('counts only exposed connectors and respects fitting margins', () => {
    const fit = resolveShelfFit(module, space);
    expect([fit.columns, fit.rows, fit.total]).toEqual([3, 2, 6]);
    expect(fit.usedWidth).toBeCloseTo(279.6);
    // A third row fits only once its exposed top key and both margins fit.
    expect(resolveShelfFit(module, { ...space, height: 334.3 }).rows).toBe(3);
    expect(resolveShelfFit(module, { ...space, height: 334.29 }).rows).toBe(2);
  });
  it('reports handle projection separately from shell overflow', () => {
    const fit = resolveShelfFit(module, { ...space, depth: 260 });
    expect(fit.depthOverflow).toBe(9.5);
    expect(fit.shellOverflow).toBe(0);
    expect(resolveShelfFit(module, { ...space, depth: 240 }).shellOverflow).toBe(12);
  });
  it('supports disconnected modules, no-fit openings, and invalid input', () => {
    expect(resolveShelfFit({ ...module, stackKeyHeight: 0 }, { ...space, height: 331.9 }).rows).toBe(3);
    expect(resolveShelfFit(module, { ...space, width: 50 }).total).toBe(0);
    expect(resolveShelfFit(module, { ...space, width: NaN }).valid).toBe(false);
    expect(resolveShelfFit(module, { ...space, margin: -1 }).valid).toBe(false);
  });
});
