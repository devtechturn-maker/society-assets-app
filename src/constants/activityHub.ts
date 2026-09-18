import type { NavModule } from '../types/api';
import type { UiIconName } from './uiIcons';

export type NavPortalKind = 'member' | 'society' | 'treasurer' | 'gatekeeper';

export type ActivityTile = {
  title: string;
  routePath: string;
  icon: UiIconName;
};

/** Routes opened from the Activity hub — hidden from the bottom tab bar. */
export const ACTIVITY_HUB_ROUTE_PATHS = new Set([
  'maintenance',
  'members',
  'notices',
  'complaints',
  'amenities',
  'directory',
]);

export const ACTIVITY_MODULE: NavModule = {
  code: 'SOCIETY_ACTIVITY',
  title: 'Activity',
  routePath: 'activity',
  icon: 'pi pi-th-large',
  sortOrder: 2,
};

export const MEMBER_ACTIVITY_MODULE: NavModule = {
  code: 'MEMBER_ACTIVITY',
  title: 'Activity',
  routePath: 'activity',
  icon: 'pi pi-th-large',
  sortOrder: 2,
};

const MEMBER_TILES: ActivityTile[] = [
  { title: 'My Maintenance', routePath: 'maintenance', icon: 'bank-card' },
  { title: 'Notices', routePath: 'notices', icon: 'megaphone' },
  { title: 'Complaints', routePath: 'complaints', icon: 'flag' },
  { title: 'Amenities', routePath: 'amenities', icon: 'calendar' },
  { title: 'Directory', routePath: 'directory', icon: 'directory' },
];

const SOCIETY_TILES: ActivityTile[] = [
  { title: 'Maintenance', routePath: 'maintenance', icon: 'bank-card' },
  { title: 'Members', routePath: 'members', icon: 'users' },
  { title: 'Notices', routePath: 'notices', icon: 'megaphone' },
  { title: 'Amenities', routePath: 'amenities', icon: 'calendar' },
  { title: 'Complaints', routePath: 'complaints', icon: 'flag' },
  { title: 'Directory', routePath: 'directory', icon: 'directory' },
];

const TREASURER_TILES: ActivityTile[] = [
  { title: 'Maintenance', routePath: 'maintenance', icon: 'bank-card' },
  { title: 'Members', routePath: 'members', icon: 'users' },
  { title: 'Directory', routePath: 'directory', icon: 'directory' },
];

export function activityTilesForPortal(portal: NavPortalKind): ActivityTile[] {
  if (portal === 'member') return MEMBER_TILES;
  if (portal === 'treasurer') return TREASURER_TILES;
  return SOCIETY_TILES;
}

export function activityModuleForPortal(portal: NavPortalKind): NavModule {
  return portal === 'member' ? MEMBER_ACTIVITY_MODULE : ACTIVITY_MODULE;
}
