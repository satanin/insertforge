import { describe, expect, it } from 'vitest';

import jscad from '@jscad/modeling';

import { vectorTextWithAccents } from './vectorTextWithAccents';

describe('vectorTextWithAccents', () => {
  it('matches original JSCAD output for plain ASCII text', () => {
    const original = jscad.text.vectorText({ height: 8, align: 'left' }, 'FJORDLAND');
    const enhanced = vectorTextWithAccents({ height: 8, text: 'FJORDLAND' });

    expect(enhanced).toEqual(original);
  });

  it('adds accent support when needed', () => {
    const accented = vectorTextWithAccents({ height: 8, text: 'SEÑOR' });

    expect(accented.length).toBeGreaterThan(0);
  });
});
