/** App icon name → bundled Ionicons glyph (see `UiIcon`). */
export type UiIconName =
  | 'home'
  | 'grid'
  | 'bank-card'
  | 'megaphone'
  | 'flag'
  | 'calendar'
  | 'comments'
  | 'wallet'
  | 'chart-line'
  | 'contract'
  | 'briefcase'
  | 'id-card'
  | 'users'
  | 'user'
  | 'directory'
  | 'family'
  | 'car'
  | 'phone'
  | 'staff'
  | 'admin'
  | 'key'
  | 'statistics'
  | 'building'
  | 'help'
  | 'info'
  | 'search'
  | 'chevron-left'
  | 'chevron-right'
  | 'document'
  | 'email'
  | 'clock'
  | 'plus'
  | 'share'
  | 'bell';

/**
 * Legacy Icons8 slug map — kept for reference only.
 * Runtime icons use Ionicons via `UiIcon` (bundled; no network).
 */
export const ICONS8_SLUGS: Record<UiIconName, string> = {
  home: 'home',
  grid: 'grid',
  'bank-card': 'bank-cards',
  megaphone: 'megaphone',
  flag: 'flag',
  calendar: 'calendar',
  comments: 'comments',
  wallet: 'wallet',
  'chart-line': 'line-chart',
  contract: 'agreement',
  briefcase: 'briefcase',
  'id-card': 'identification-documents',
  users: 'conference-call',
  user: 'user',
  directory: 'address-book',
  family: 'family',
  car: 'car',
  phone: 'phone',
  staff: 'manager',
  admin: 'admin-settings-male',
  key: 'key',
  statistics: 'calculator',
  building: 'office',
  help: 'help',
  info: 'info',
  search: 'search',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  document: 'invoice',
  email: 'mail',
  clock: 'clock',
  plus: 'plus',
  share: 'share',
  bell: 'appointment-reminders',
};

export function iconFromPrimeIcon(icon: string): UiIconName {
  if (icon.includes('home')) return 'home';
  if (icon.includes('th-large')) return 'grid';
  if (icon.includes('credit') || icon.includes('list')) return 'bank-card';
  if (icon.includes('subscription') || icon.includes('id-card')) return 'id-card';
  if (icon.includes('wallet') || icon.includes('folder')) return 'wallet';
  if (icon.includes('users')) return 'users';
  if (icon.includes('file')) return 'contract';
  if (icon.includes('chart')) return 'chart-line';
  if (icon.includes('flag')) return 'flag';
  if (icon.includes('briefcase')) return 'briefcase';
  if (icon.includes('calendar')) return 'calendar';
  if (icon.includes('megaphone')) return 'megaphone';
  if (icon.includes('building')) return 'building';
  if (icon.includes('comment')) return 'comments';
  if (icon.includes('bell')) return 'bell';
  if (icon.includes('user')) return 'user';
  if (icon.includes('question')) return 'help';
  if (icon.includes('info')) return 'info';
  if (icon.includes('moon')) return 'info';
  return 'grid';
}

export function iconForRoutePath(routePath: string): UiIconName {
  switch (routePath) {
    case 'dashboard':
      return 'home';
    case 'activity':
      return 'grid';
    case 'maintenance':
      return 'bank-card';
    case 'notices':
      return 'megaphone';
    case 'complaints':
      return 'flag';
    case 'amenities':
      return 'calendar';
    case 'chat':
      return 'comments';
    case 'ledger':
    case 'expenses':
    case 'income':
      return 'wallet';
    case 'reports':
      return 'chart-line';
    case 'contracts':
      return 'contract';
    case 'settings':
      return 'briefcase';
    case 'subscription':
      return 'id-card';
    case 'members':
      return 'users';
    case 'directory':
      return 'directory';
    case 'profile':
    case 'appearance':
      return 'user';
    case 'about-society':
      return 'building';
    case 'help':
      return 'help';
    case 'notifications':
      return 'bell';
    case 'about-us':
      return 'info';
    default:
      return 'grid';
  }
}
