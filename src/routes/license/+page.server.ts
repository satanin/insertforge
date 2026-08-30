import licenseText from '../../../LICENSE.md?raw';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
  licenseText
});
