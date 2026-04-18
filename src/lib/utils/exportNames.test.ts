import { describe, expect, it } from 'vitest';

import { sanitizeExportName } from './exportNames';

describe('sanitizeExportName', () => {
  it('removes characters that would break 3MF XML object names', () => {
    expect(sanitizeExportName('dice-&-tokens')).toBe('dice-tokens');
    expect(sanitizeExportName('box <lid> "v2"')).toBe('box-lid-v2');
    expect(sanitizeExportName("player's / tray")).toBe('player-s-tray');
  });

  it('returns a fallback when the input has no safe characters', () => {
    expect(sanitizeExportName('&&&', 'box')).toBe('box');
  });
});
