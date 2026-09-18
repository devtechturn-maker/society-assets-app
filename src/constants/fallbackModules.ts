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
  title: 'More',
  routePath: 'profile',
  icon: 'pi pi-ellipsis-h',
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

/** Items shown in the bottom More menu (formerly the right-side profile drawer). */
export const MEMBER_MORE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'profile', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

/** @deprecated Use MEMBER_MORE_MENU_ITEMS */
export const MEMBER_SIDE_MENU_ITEMS = MEMBER_MORE_MENU_ITEMS;

export const SOCIETY_MORE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'appearance', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Subscription', routePath: 'subscription', icon: 'pi pi-id-card' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

/** @deprecated Use SOCIETY_MORE_MENU_ITEMS */
export const SOCIETY_SIDE_MENU_ITEMS = SOCIETY_MORE_MENU_ITEMS;

/** Routes that live in the More menu only — not in the scrollable bottom tab bar. */
const MORE_MENU_ROUTE_PATHS = new Set([
  'profile',
  'appearance',
  'about-us',
  'about-society',
  'help',
  'subscription',
]);

function isMoreMenuOnlyRoute(routePath: string, portal: NavPortalKind): boolean {
  if (portal === 'gatekeeper' && routePath === 'about-society') {
    return false;
  }
  return MORE_MENU_ROUTE_PATHS.has(routePath);
}

/** Fixed primary bottom tabs — everything else (plus Profile/Help/etc.) lives in More. */
export function primaryBottomTabRoutes(portal: NavPortalKind): string[] {
  if (portal === 'member') {
    return ['dashboard', 'activity', 'chat'];
  }
  if (portal === 'treasurer') {
    return ['dashboard', 'activity', 'ledger'];
  }
  if (portal === 'gatekeeper') {
    return ['dashboard', 'visitor-entry', 'visitor-history'];
  }
  return ['dashboard', 'activity', 'chat'];
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

export type MoreMenuNavItem = {
  label: string;
  routePath: string;
  icon: string;
};

function staticMoreMenuItems(portal: NavPortalKind): MoreMenuNavItem[] {
  if (portal === 'member') {
    return MEMBER_MORE_MENU_ITEMS.map((item) => ({ ...item }));
  }
  if (portal === 'gatekeeper') {
    return GATEKEEPER_MORE_MENU_ITEMS.map((item) => ({ ...item }));
  }
  return SOCIETY_MORE_MENU_ITEMS.map((item) => ({ ...item }));
}

/**
 * Builds the More bottom-grid items: former sidebar entries + every non-primary module.
 * No drawer — this is the only secondary menu.
 */
export function buildMoreMenuItems(
  bottomTabModules: NavModule[],
  portal: NavPortalKind,
  options?: { switchRoleLabel?: string }
): MoreMenuNavItem[] {
  const moreTab = profileTabForPortal(portal);
  const primary = new Set(primaryBottomTabRoutes(portal));
  const seen = new Set<string>();
  const items: MoreMenuNavItem[] = [];

  const push = (item: MoreMenuNavItem) => {
    if (!item.routePath || item.routePath === moreTab.routePath || seen.has(item.routePath)) {
      return;
    }
    seen.add(item.routePath);
    items.push(item);
  };

  if (options?.switchRoleLabel) {
    push({ label: options.switchRoleLabel, routePath: '__switch_role__', icon: 'pi pi-sync' });
  }

  for (const item of staticMoreMenuItems(portal)) {
    push(item);
  }

  for (const module of sortNavModules(bottomTabModules)) {
    if (primary.has(module.routePath) || module.routePath === moreTab.routePath) {
      continue;
    }
    push({
      label: module.title,
      routePath: module.routePath,
      icon: module.icon,
    });
  }

  return items;
}

/** Bottom tabs: primary modules only + fixed More tab as the last item. */
export function prepareBottomTabModules(modules: NavModule[], portal: NavPortalKind): NavModule[] {
  const moreFiltered = modules.filter((m) => !isMoreMenuOnlyRoute(m.routePath, portal));
  const tabFiltered = moreFiltered.filter(
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

  const moreTab = profileTabForPortal(portal);
  const primaryOrder = primaryBottomTabRoutes(portal);
  const byPath = new Map(sortNavModules(tabFiltered).map((module) => [module.routePath, module]));
  const primaryTabs = primaryOrder
    .map((routePath) => byPath.get(routePath))
    .filter((module): module is NavModule => !!module);

  // Keep overflow modules in the array so More can reuse them (splitTabBarModules / buildMoreMenuItems).
  const overflow = sortNavModules(tabFiltered).filter(
    (module) => module.routePath !== moreTab.routePath && !primaryOrder.includes(module.routePath)
  );

  return [...primaryTabs, ...overflow, moreTab];
}

/** Hide profile and info screens from the bottom tab bar — they live in the More menu. */
export function filterBottomTabModules(modules: NavModule[], portal: NavPortalKind = 'society'): NavModule[] {
  return prepareBottomTabModules(modules, portal);
}

/** @deprecated Use filterBottomTabModules */
export function mergeMemberPortalModules(modules: NavModule[]): NavModule[] {
  return filterBottomTabModules(modules, 'member');
}

export const GATEKEEPER_PROFILE_MODULE: NavModule = {
  code: 'GATEKEEPER_PROFILE',
  title: 'More',
  routePath: 'profile',
  icon: 'pi pi-ellipsis-h',
  sortOrder: 99,
};

export const GATEKEEPER_MORE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'profile', icon: 'pi pi-user' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

/** @deprecated Use GATEKEEPER_MORE_MENU_ITEMS */
export const GATEKEEPER_SIDE_MENU_ITEMS = GATEKEEPER_MORE_MENU_ITEMS;

export const FALLBACK_GATEKEEPER_NAV_SOURCE: NavModule[] = [
  { code: 'GATEKEEPER_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'GATEKEEPER_VISITORS', title: 'Visitor Entry', routePath: 'visitor-entry', icon: 'pi pi-user-plus', sortOrder: 2 },
  { code: 'GATEKEEPER_HISTORY', title: 'History', routePath: 'visitor-history', icon: 'pi pi-history', sortOrder: 3 },
  { code: 'GATEKEEPER_ABOUT_SOCIETY', title: 'About Society', routePath: 'about-society', icon: 'pi pi-building', sortOrder: 4 },
];

export function profileTabForPortal(portal: NavPortalKind): NavModule {
  if (portal === 'member') {
    return { ...MEMBER_PROFILE_MODULE, title: 'More' };
  }
  if (portal === 'gatekeeper') {
    return GATEKEEPER_PROFILE_MODULE;
  }
  return {
    code: 'MOBILE_APPEARANCE',
    title: 'More',
    routePath: 'appearance',
    icon: 'pi pi-ellipsis-h',
    sortOrder: 99,
  };
}

export function splitTabBarModules(
  modules: NavModule[],
  portal: NavPortalKind
): { scrollableTabs: NavModule[]; profileTab: NavModule } {
  const profileTab = profileTabForPortal(portal);
  const primary = primaryBottomTabRoutes(portal);
  const byPath = new Map(
    modules
      .filter((module) => module.routePath !== profileTab.routePath)
      .map((module) => [module.routePath, module])
  );
  const scrollableTabs = primary
    .map((routePath) => byPath.get(routePath))
    .filter((module): module is NavModule => !!module);
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
