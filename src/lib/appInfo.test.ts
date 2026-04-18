import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';
import { APP_VERSION } from './appInfo';

describe('app version metadata', () => {
  it('keeps the visible app version aligned with package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });
});
