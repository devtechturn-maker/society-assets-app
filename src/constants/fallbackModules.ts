import type { NavModule } from '../types/api';

/** Used if /modules/society is unreachable. Order matches backend module seed. */
/** Flat member app — read-only home, maintenance, support. */
export const MEMBER_PROFILE_MODULE: NavModule = {
  code: 'MEMBER_PROFILE',
  title: 'Profile',
  routePath: 'profile',
  icon: 'pi pi-user',
  sortOrder: 99,
};

export const FALLBACK_MEMBER_MODULES: NavModule[] = [
  { code: 'MEMBER_DASHBOARD', title: 'Home', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'MEMBER_MAINTENANCE', title: 'My Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 2 },
  { code: 'MEMBER_NOTICES', title: 'Notices', routePath: 'notices', icon: 'pi pi-megaphone', sortOrder: 3 },
  { code: 'MEMBER_POLLS', title: 'Polls', routePath: 'polls', icon: 'pi pi-chart-pie', sortOrder: 4 },
  { code: 'MEMBER_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-flag', sortOrder: 5 },
  { code: 'MEMBER_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 6 },
  { code: 'MEMBER_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 7 },
];

export const MEMBER_SIDE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'profile', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

export const SOCIETY_SIDE_MENU_ITEMS = [
  { label: 'My Profile', routePath: 'appearance', icon: 'pi pi-user' },
  { label: 'About Society', routePath: 'about-society', icon: 'pi pi-building' },
  { label: 'Help', routePath: 'help', icon: 'pi pi-question-circle' },
  { label: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle' },
] as const;

const SIDE_MENU_ROUTE_PATHS = new Set([
  'profile',
  'appearance',
  'about-us',
  'about-society',
  'help',
]);

/** Hide profile and info screens from the bottom tab bar — they live in the side menu. */
export function filterBottomTabModules(modules: NavModule[]): NavModule[] {
  return [...modules]
    .filter((m) => !SIDE_MENU_ROUTE_PATHS.has(m.routePath) && m.code !== 'MEMBER_PROFILE')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** @deprecated Use filterBottomTabModules */
export function mergeMemberPortalModules(modules: NavModule[]): NavModule[] {
  return filterBottomTabModules(modules);
}

export const FALLBACK_SOCIETY_MODULES: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 2 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 3 },
  { code: 'SOCIETY_NOTICES', title: 'Notices', routePath: 'notices', icon: 'pi pi-megaphone', sortOrder: 4 },
  { code: 'SOCIETY_EXPENSES', title: 'Expenses', routePath: 'expenses', icon: 'pi pi-wallet', sortOrder: 5 },
  { code: 'SOCIETY_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-flag', sortOrder: 6 },
  { code: 'SOCIETY_OTHER_INCOME', title: 'Other Income', routePath: 'income', icon: 'pi pi-plus-circle', sortOrder: 7 },
  { code: 'SOCIETY_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 8 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 9 },
  { code: 'SOCIETY_POLLS', title: 'Polls', routePath: 'polls', icon: 'pi pi-chart-pie', sortOrder: 10 },
  { code: 'SOCIETY_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 11 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 12 },
  { code: 'SOCIETY_SETTINGS', title: 'Services', routePath: 'settings', icon: 'pi pi-briefcase', sortOrder: 14 },
  { code: 'SOCIETY_SUBSCRIPTION', title: 'Subscription', routePath: 'subscription', icon: 'pi pi-id-card', sortOrder: 15 },
];

/** Subset shown to a member assigned as treasurer (finance modules only). */
export const FALLBACK_TREASURER_MODULES: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 3 },
  { code: 'SOCIETY_EXPENSES', title: 'Expenses', routePath: 'expenses', icon: 'pi pi-wallet', sortOrder: 5 },
  { code: 'SOCIETY_OTHER_INCOME', title: 'Other Income', routePath: 'income', icon: 'pi pi-plus-circle', sortOrder: 7 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 9 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 12 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 2 },
];

export function moduleGlyph(icon: string): string {
  if (icon.includes('home')) return '🏠';
  if (icon.includes('credit') || icon.includes('list')) return '💳';
  if (icon.includes('subscription')) return '💳';
  if (icon.includes('wallet') || icon.includes('folder')) return '▤';
  if (icon.includes('plus')) return '+';
  if (icon.includes('users')) return '👥';
  if (icon.includes('file')) return '📄';
  if (icon.includes('chart-pie')) return '📊';
  if (icon.includes('exclamation')) return '⚠';
  if (icon.includes('flag')) return '🚩';
  if (icon.includes('briefcase')) return '💼';
  if (icon.includes('calendar')) return '📅';
  if (icon.includes('book')) return '📖';
  if (icon.includes('megaphone')) return '📢';
  if (icon.includes('building')) return '🏢';
  if (icon.includes('chart')) return '📊';
  if (icon.includes('cog')) return '⚙';
  if (icon.includes('comment')) return '💬';
  if (icon.includes('user')) return '👤';
  if (icon.includes('question')) return '?';
  if (icon.includes('info')) return 'ℹ';
  if (icon.includes('moon')) return '🌙';
  return '•';
}

/** Emoji tab icons keep native colours — do not tint with label text colour. */
export function isColorfulModuleGlyph(icon: string): boolean {
  return icon.includes('home');
}
