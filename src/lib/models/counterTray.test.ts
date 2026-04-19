import { describe, expect, it } from 'vitest';

import { defaultParams } from './counterTray';

describe('counter tray defaults', () => {
  it('uses a 1mm rim by default', () => {
    expect(defaultParams.rimHeight).toBe(1);
  });
});
