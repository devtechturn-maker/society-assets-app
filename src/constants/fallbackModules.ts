import type { NavModule } from '../types/api';

/** Used if /modules/society is unreachable. Order matches backend module seed. */
/** Flat member app — read-only home, maintenance, support. */
export const FALLBACK_MEMBER_MODULES: NavModule[] = [
  { code: 'MEMBER_DASHBOARD', title: 'Home', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'MEMBER_MAINTENANCE', title: 'My Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 2 },
  { code: 'MEMBER_SUPPORT', title: 'Chat Groups', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 3 },
];

export const FALLBACK_SOCIETY_MODULES: NavModule[] = [
  { code: 'SOCIETY_DASHBOARD', title: 'Dashboard', routePath: 'dashboard', icon: 'pi pi-home', sortOrder: 1 },
  { code: 'SOCIETY_COLLECTIONS', title: 'Maintenance', routePath: 'maintenance', icon: 'pi pi-credit-card', sortOrder: 2 },
  { code: 'SOCIETY_EXPENSES', title: 'Expenses', routePath: 'expenses', icon: 'pi pi-wallet', sortOrder: 3 },
  { code: 'SOCIETY_OTHER_INCOME', title: 'Other Income', routePath: 'income', icon: 'pi pi-plus-circle', sortOrder: 4 },
  { code: 'SOCIETY_CONTRACTS', title: 'Contracts', routePath: 'contracts', icon: 'pi pi-file-edit', sortOrder: 5 },
  { code: 'SOCIETY_MEMBERS', title: 'Members', routePath: 'members', icon: 'pi pi-users', sortOrder: 6 },
  { code: 'SOCIETY_REPORTS', title: 'Reports', routePath: 'reports', icon: 'pi pi-chart-line', sortOrder: 7 },
  { code: 'SOCIETY_SUBSCRIPTION', title: 'Subscription', routePath: 'subscription', icon: 'pi pi-credit-card', sortOrder: 8 },
  { code: 'SOCIETY_SETTINGS', title: 'Settings', routePath: 'settings', icon: 'pi pi-cog', sortOrder: 9 },
  { code: 'SOCIETY_SUPPORT', title: 'Chat Groups', routePath: 'chat', icon: 'pi pi-comments', sortOrder: 10 },
];

export function moduleGlyph(icon: string): string {
  if (icon.includes('home')) return '⌂';
  if (icon.includes('credit') || icon.includes('list')) return '💳';
  if (icon.includes('subscription')) return '💳';
  if (icon.includes('wallet') || icon.includes('folder')) return '▤';
  if (icon.includes('plus')) return '+';
  if (icon.includes('users')) return '👥';
  if (icon.includes('file')) return '📄';
  if (icon.includes('chart')) return '📊';
  if (icon.includes('cog')) return '⚙';
  if (icon.includes('comment')) return '💬';
  if (icon.includes('question')) return '?';
  if (icon.includes('moon')) return '🌙';
  return '•';
}
