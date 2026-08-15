export function visitorStatusLabel(status: string): string {
  return (status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function visitorStatusTone(status: string): { bg: string; border: string; text: string } {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING_APPROVAL':
      return { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' };
    case 'APPROVED':
      return { bg: '#ecfdf5', border: '#10b981', text: '#047857' };
    case 'CHECKED_IN':
      return { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' };
    case 'CHECKED_OUT':
      return { bg: '#f8fafc', border: '#94a3b8', text: '#475569' };
    case 'REJECTED':
    case 'EXPIRED':
      return { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' };
    default:
      return { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' };
  }
}
