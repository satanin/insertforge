import { describe, expect, it } from 'vitest';

import type { Box } from '$lib/types/project';

import { createLid, createLidTextInlay, defaultLidParams } from './lid';

describe('lid text modes', () => {
  const baseBox: Box = {
    id: 'box-1',
    name: 'FJORDLAND',
    trays: [],
    tolerance: 0.5,
    wallThickness: 3,
    floorThickness: 2,
    fillSolidEmpty: true,
    customWidth: 120,
    customDepth: 60,
    customBoxHeight: 30,
    lidParams: { ...defaultLidParams, showName: true }
  };

  it('generates a separate inlay geometry in inlay mode', () => {
    const box: Box = {
      ...baseBox,
      lidParams: { ...baseBox.lidParams, textMode: 'inlay' }
    };

    expect(createLid(box)).not.toBeNull();
    expect(createLidTextInlay(box)).not.toBeNull();
  });

  it('does not generate a separate inlay geometry in emboss mode', () => {
    const box: Box = {
      ...baseBox,
      lidParams: { ...baseBox.lidParams, textMode: 'emboss' }
    };

    expect(createLid(box)).not.toBeNull();
    expect(createLidTextInlay(box)).toBeNull();
  });

  it('engraves lid text in emboss mode as well', () => {
    const withText: Box = {
      ...baseBox,
      lidParams: { ...baseBox.lidParams, textMode: 'emboss', showName: true }
    };
    const withoutText: Box = {
      ...baseBox,
      lidParams: { ...baseBox.lidParams, textMode: 'emboss', showName: false }
    };

    const lidWithText = createLid(withText);
    const lidWithoutText = createLid(withoutText);

    expect(lidWithText).not.toBeNull();
    expect(lidWithoutText).not.toBeNull();
    expect(lidWithText?.polygons.length).not.toBe(lidWithoutText?.polygons.length);
  });
});
