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
  { code: 'MEMBER_POLLS', title: 'Polls', routePath: 'polls', icon: 'pi pi-chart-pie', sortOrder: 3 },
  { code: 'MEMBER_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-exclamation-circle', sortOrder: 4 },
  { code: 'MEMBER_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 5 },
  { code: 'MEMBER_ABOUT_SOCIETY', title: 'About Society', routePath: 'about-society', icon: 'pi pi-building', sortOrder: 6 },
  { code: 'MEMBER_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 7 },
  { code: 'MEMBER_HELP', title: 'Help', routePath: 'help', icon: 'pi pi-question-circle', sortOrder: 8 },
  { code: 'MEMBER_ABOUT_US', title: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle', sortOrder: 9 },
  MEMBER_PROFILE_MODULE,
];

/** Ensures Profile tab is always available in member portal navigation. */
export function mergeMemberPortalModules(modules: NavModule[]): NavModule[] {
  const hasProfile = modules.some(
    (m) => m.code === 'MEMBER_PROFILE' || m.routePath === 'profile'
  );
  if (hasProfile) {
    return [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const maxOrder = modules.reduce((max, m) => Math.max(max, m.sortOrder), 0);
  return [...modules, { ...MEMBER_PROFILE_MODULE, sortOrder: maxOrder + 1 }].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

export const FALLBACK_SOCIETY_MODULES: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 2 },
  { code: 'SOCIETY_EXPENSES', title: 'Expenses', routePath: 'expenses', icon: 'pi pi-wallet', sortOrder: 3 },
  { code: 'SOCIETY_OTHER_INCOME', title: 'Other Income', routePath: 'income', icon: 'pi pi-plus-circle', sortOrder: 4 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 5 },
  { code: 'SOCIETY_POLLS', title: 'Polls', routePath: 'polls', icon: 'pi pi-chart-pie', sortOrder: 6 },
  { code: 'SOCIETY_COMPLAINTS', title: 'Complaints', routePath: 'complaints', icon: 'pi pi-exclamation-circle', sortOrder: 7 },
  { code: 'SOCIETY_AMENITIES', title: 'Amenities', routePath: 'amenities', icon: 'pi pi-calendar', sortOrder: 8 },
  { code: 'SOCIETY_ABOUT_SOCIETY', title: 'About Society', routePath: 'about-society', icon: 'pi pi-building', sortOrder: 9 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 10 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 11 },
  { code: 'SOCIETY_SUBSCRIPTION', title: 'Subscription', routePath: 'subscription', icon: 'pi pi-credit-card', sortOrder: 12 },
  { code: 'SOCIETY_SETTINGS', title: 'Services', routePath: 'settings', icon: 'pi pi-cog', sortOrder: 13 },
  { code: 'SOCIETY_SUPPORT', title: 'Group Chat', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 14 },
  { code: 'SOCIETY_HELP', title: 'Help', routePath: 'help', icon: 'pi pi-question-circle', sortOrder: 15 },
  { code: 'SOCIETY_ABOUT_US', title: 'About Us', routePath: 'about-us', icon: 'pi pi-info-circle', sortOrder: 16 },
];

export function moduleGlyph(icon: string): string {
  if (icon.includes('home')) return '⌂';
  if (icon.includes('credit') || icon.includes('list')) return '💳';
  if (icon.includes('subscription')) return '💳';
  if (icon.includes('wallet') || icon.includes('folder')) return '▤';
  if (icon.includes('plus')) return '+';
  if (icon.includes('users')) return '👥';
  if (icon.includes('file')) return '📄';
  if (icon.includes('chart-pie')) return '📊';
  if (icon.includes('exclamation')) return '⚠';
  if (icon.includes('calendar')) return '📅';
  if (icon.includes('book')) return '📖';
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
