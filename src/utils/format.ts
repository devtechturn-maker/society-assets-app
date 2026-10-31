export function formatInr(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10" -> "Oct 2026"; anything else is returned unchanged. */
export function formatMonth(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  const index = m ? Number(m[2]) - 1 : -1;
  return m && index >= 0 && index < 12 ? `${MONTHS[index]} ${m[1]}` : value;
}

export function formatMonthRange(from?: string | null, to?: string | null): string {
  if (!from) return '—';
  if (!to || to === from) return formatMonth(from);
  return `${formatMonth(from)} to ${formatMonth(to)}`;
}
