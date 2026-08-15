import { memo } from 'react';
import { type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { UiIconName } from '../constants/uiIcons';

type Props = {
  name: UiIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle | ViewStyle>;
};

/**
 * Bundled Ionicons glyphs (shipped with Expo / @expo/vector-icons).
 * Do NOT load Icons8 (or any remote) PNGs here — that caused 1–2s icon pop-in on every screen.
 */
const IONICON_BY_NAME: Record<UiIconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  grid: 'grid-outline',
  'bank-card': 'card-outline',
  megaphone: 'megaphone-outline',
  flag: 'flag-outline',
  calendar: 'calendar-outline',
  comments: 'chatbubbles-outline',
  wallet: 'wallet-outline',
  'chart-line': 'stats-chart-outline',
  contract: 'document-text-outline',
  briefcase: 'briefcase-outline',
  'id-card': 'id-card-outline',
  users: 'people-outline',
  user: 'person-outline',
  directory: 'book-outline',
  family: 'people-circle-outline',
  car: 'car-outline',
  phone: 'call-outline',
  staff: 'shield-outline',
  admin: 'settings-outline',
  key: 'key-outline',
  statistics: 'calculator-outline',
  building: 'business-outline',
  help: 'help-circle-outline',
  info: 'information-circle-outline',
  search: 'search-outline',
  'chevron-left': 'chevron-back',
  'chevron-right': 'chevron-forward',
  document: 'receipt-outline',
  email: 'mail-outline',
  clock: 'time-outline',
  plus: 'add',
  share: 'share-outline',
  bell: 'notifications-outline',
};

function UiIconComponent({ name, size = 28, color = '#475569', style }: Props) {
  return <Ionicons name={IONICON_BY_NAME[name]} size={size} color={color} style={style} />;
}

export const UiIcon = memo(UiIconComponent);
