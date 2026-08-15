import type { NavModule } from '../types/api';
import {
  ACTIVITY_HUB_ROUTE_PATHS,
  activityModuleForPortal,
  type NavPortalKind,
} from './activityHub';
import { iconFromPrimeIcon } from './uiIcons';

/** Used if /modules/society is unreachable. Order matches backend module seed. */
/** Flat member app — read-only home, maintenance, support. */
export const MEMBER_PROFILE_MODULE: NavModule = {
  code: 'MEMBER_PROFILE',
  title: 'Profile',
  routePath: 'profile',
  icon: 'pi pi-user',
  sortOrder: 99,
};

/** Full member module catalog (API shape) before Activity hub layout is applied. */
export const FALLBACK_MEMBER_NAV_SOURCE: NavModule[] = [
  { code: 'MEMBER_DASHBOARD', title: 'Home', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'MEMBER_MAINTENANCE', title: 'My Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 2 },
  { code: 'MEMBER_NOTICES', title: 'Notices', routePath: 'notices', icon: 'pi pi-megaphone', sortOrder: 3 },
  { code: 'MEMBER_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-flag', sortOrder: 4 },
  { code: 'MEMBER_VISITORS', title: 'Visitors', routePath: 'visitors', icon: 'pi pi-user-plus', sortOrder: 5 },
  { code: 'MEMBER_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 6 },
  { code: 'MEMBER_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 6 },
];

/** @deprecated Use FALLBACK_MEMBER_NAV_SOURCE with prepareBottomTabModules */
export const FALLBACK_MEMBER_MODULES = FALLBACK_MEMBER_NAV_SOURCE;

export const MEMBER_SIDE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'profile', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

export const SOCIETY_SIDE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'appearance', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Subscription', routePath: 'subscription', icon: 'pi pi-id-card' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

/** Routes that live in the side menu only — not in the scrollable bottom tab bar. */
const SIDE_MENU_ROUTE_PATHS = new Set([
  'profile',
  'appearance',
  'about-us',
  'about-society',
  'help',
  'subscription',
]);

function isSideMenuOnlyRoute(routePath: string, portal: NavPortalKind): boolean {
  if (portal === 'gatekeeper' && routePath === 'about-society') {
    return false;
  }
  return SIDE_MENU_ROUTE_PATHS.has(routePath);
}

function sortNavModules(modules: NavModule[]): NavModule[] {
  return [...modules].sort((a, b) => {
    if (a.routePath === 'dashboard') return -1;
    if (b.routePath === 'dashboard') return 1;
    if (a.routePath === 'activity') return -1;
    if (b.routePath === 'activity') return 1;
    return a.sortOrder - b.sortOrder;
  });
}

/** Bottom tabs: scrollable modules + fixed profile tab as the last item. */
export function prepareBottomTabModules(modules: NavModule[], portal: NavPortalKind): NavModule[] {
  const sideFiltered = modules.filter((m) => !isSideMenuOnlyRoute(m.routePath, portal));
  const tabFiltered = sideFiltered.filter(
    (m) =>
      !ACTIVITY_HUB_ROUTE_PATHS.has(m.routePath) &&
      (portal !== 'gatekeeper' || (m.routePath !== 'activity' && m.routePath !== 'notifications'))
  );

  if (portal !== 'gatekeeper') {
    const activity = activityModuleForPortal(portal);
    if (!tabFiltered.some((m) => m.routePath === 'activity')) {
      tabFiltered.push(activity);
    }
  }

  const profileTab = profileTabForPortal(portal);
  const withoutProfile = sortNavModules(tabFiltered).filter(
    (module) => module.routePath !== profileTab.routePath
  );
  return [...withoutProfile, profileTab];
}

/** Hide profile and info screens from the bottom tab bar — they live in the side menu. */
export function filterBottomTabModules(modules: NavModule[], portal: NavPortalKind = 'society'): NavModule[] {
  return prepareBottomTabModules(modules, portal);
}

/** @deprecated Use filterBottomTabModules */
export function mergeMemberPortalModules(modules: NavModule[]): NavModule[] {
  return filterBottomTabModules(modules, 'member');
}

export const GATEKEEPER_PROFILE_MODULE: NavModule = {
  code: 'GATEKEEPER_PROFILE',
  title: 'Profile',
  routePath: 'profile',
  icon: 'pi pi-user',
  sortOrder: 99,
};

export const GATEKEEPER_SIDE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'profile', icon: 'pi pi-user' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

export const FALLBACK_GATEKEEPER_NAV_SOURCE: NavModule[] = [
  { code: 'GATEKEEPER_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'GATEKEEPER_VISITORS', title: 'Visitor Entry', routePath: 'visitor-entry', icon: 'pi pi-user-plus', sortOrder: 2 },
  { code: 'GATEKEEPER_HISTORY', title: 'History', routePath: 'visitor-history', icon: 'pi pi-history', sortOrder: 3 },
  { code: 'GATEKEEPER_ABOUT_SOCIETY', title: 'About Society', routePath: 'about-society', icon: 'pi pi-building', sortOrder: 4 },
];

export function profileTabForPortal(portal: NavPortalKind): NavModule {
  if (portal === 'member') {
    return { ...MEMBER_PROFILE_MODULE, title: 'Profile' };
  }
  if (portal === 'gatekeeper') {
    return GATEKEEPER_PROFILE_MODULE;
  }
  return {
    code: 'MOBILE_APPEARANCE',
    title: 'Profile',
    routePath: 'appearance',
    icon: 'pi pi-user',
    sortOrder: 99,
  };
}

export function splitTabBarModules(
  modules: NavModule[],
  portal: NavPortalKind
): { scrollableTabs: NavModule[]; profileTab: NavModule } {
  const profileTab = profileTabForPortal(portal);
  const scrollableTabs = modules.filter((module) => module.routePath !== profileTab.routePath);
  return { scrollableTabs, profileTab };
}

export const FALLBACK_SOCIETY_NAV_SOURCE: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 2 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 3 },
  { code: 'SOCIETY_NOTICES', title: 'Notices', routePath: 'notices', icon: 'pi pi-megaphone', sortOrder: 4 },
  { code: 'SOCIETY_EXPENSES', title: 'Income & Expenses', routePath: 'ledger', icon: 'pi pi-wallet', sortOrder: 5 },
  { code: 'SOCIETY_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-flag', sortOrder: 6 },
  { code: 'SOCIETY_VISITORS', title: 'Visitors', routePath: 'visitor-admin', icon: 'pi pi-users', sortOrder: 7 },
  { code: 'SOCIETY_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 8 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 9 },
  { code: 'SOCIETY_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 10 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 11 },
  { code: 'SOCIETY_SETTINGS', title: 'Services', routePath: 'settings', icon: 'pi pi-briefcase', sortOrder: 14 },
  { code: 'SOCIETY_SUBSCRIPTION', title: 'Subscription', routePath: 'subscription', icon: 'pi pi-id-card', sortOrder: 15 },
];

/** @deprecated Use FALLBACK_SOCIETY_NAV_SOURCE with prepareBottomTabModules */
export const FALLBACK_SOCIETY_MODULES = FALLBACK_SOCIETY_NAV_SOURCE;

/** Subset shown to a member assigned as treasurer (finance modules only). */
export const FALLBACK_TREASURER_NAV_SOURCE: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 2 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 3 },
  { code: 'SOCIETY_EXPENSES', title: 'Income & Expenses', routePath: 'ledger', icon: 'pi pi-wallet', sortOrder: 5 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 9 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 12 },
];

/** @deprecated Use FALLBACK_TREASURER_NAV_SOURCE with prepareBottomTabModules */
export const FALLBACK_TREASURER_MODULES = FALLBACK_TREASURER_NAV_SOURCE;

export function moduleGlyph(icon: string) {
  return iconFromPrimeIcon(icon);
}

/** @deprecated All tab icons use UiIcon — kept for compatibility. */
export function isColorfulModuleGlyph(_icon: string): boolean {
  return false;
}

export { ACTIVITY_HUB_ROUTE_PATHS };
