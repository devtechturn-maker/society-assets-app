import type { UiIconName } from './uiIcons';

export type DirectoryPortal = 'member' | 'society';

export type DirectoryHubTile = {
  id: string;
  title: string;
  icon: UiIconName;
};

export const MEMBER_DIRECTORY_TILES: DirectoryHubTile[] = [
  { id: 'members', title: 'Members', icon: 'users' },
  { id: 'family-members', title: 'Family Members', icon: 'family' },
  { id: 'vehicles', title: 'Vehicles', icon: 'car' },
  { id: 'important-contacts', title: 'Important Contacts', icon: 'phone' },
  { id: 'society-staff', title: 'Society Staff', icon: 'staff' },
];

export const SOCIETY_DIRECTORY_TILES: DirectoryHubTile[] = [
  { id: 'members', title: 'Members', icon: 'user' },
  { id: 'vehicles', title: 'Vehicles', icon: 'car' },
  { id: 'emergency', title: 'Emergency', icon: 'phone' },
  { id: 'staff', title: 'Staff', icon: 'staff' },
  { id: 'admin', title: 'Admin', icon: 'admin' },
  { id: 'permission', title: 'Permission', icon: 'key' },
  { id: 'statistics', title: 'Statistics', icon: 'statistics' },
];

export function directoryTilesFor(portal: DirectoryPortal): DirectoryHubTile[] {
  return portal === 'member' ? MEMBER_DIRECTORY_TILES : SOCIETY_DIRECTORY_TILES;
}

export function directorySectionTitle(portal: DirectoryPortal, sectionId: string): string {
  return directoryTilesFor(portal).find((tile) => tile.id === sectionId)?.title ?? 'Directory';
}
