import type { VisitorSummary } from '../types/api';

export function visitorHasPhoto(
  visitor: Pick<VisitorSummary, 'photoPath' | 'photoUrl' | 'memberPhotoUrl'>
): boolean {
  return Boolean(visitor.photoPath || visitor.photoUrl || visitor.memberPhotoUrl);
}

export type VisitorPhotoPortal = 'member' | 'gatekeeper' | 'society';

export function resolveVisitorPhotoPath(
  visitor: Pick<VisitorSummary, 'id' | 'photoUrl' | 'memberPhotoUrl' | 'photoPath'>,
  portal: VisitorPhotoPortal = 'gatekeeper'
): string | undefined {
  if (!visitorHasPhoto(visitor)) {
    return undefined;
  }
  if (portal === 'member') {
    return visitor.memberPhotoUrl ?? `/member/visitors/${visitor.id}/photo`;
  }
  if (portal === 'society') {
    return `/society/visitors/${visitor.id}/photo`;
  }
  return visitor.photoUrl ?? `/gatekeeper/visitors/${visitor.id}/photo`;
}

export function visitorInitials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
