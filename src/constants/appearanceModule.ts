import type { NavModule } from '../types/api';

/** Mobile-only module (not from backend). */
export const APPEARANCE_MODULE: NavModule = {
  code: 'MOBILE_APPEARANCE',
  title: 'Appearance',
  routePath: 'appearance',
  icon: 'pi pi-moon',
  sortOrder: 99,
};
