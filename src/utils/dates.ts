/** Today as yyyy-MM-dd (maintenance date). */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Current month as yyyy-MM (from / to month fields). */
export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYearMonth(value: string): boolean {
  return MONTH_RE.test(value.trim());
}

export function isValidIsoDate(value: string): boolean {
  return DATE_RE.test(value.trim());
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}

export function compareIsoDate(a: string, b: string): number {
  return a.trim().localeCompare(b.trim());
}

/** Local calendar day → UTC instants for API `from` (inclusive) and `to` (exclusive). */
export function dayBoundsIso(date: string): { from: string; to: string } {
  const iso = isValidIsoDate(date) ? date.trim() : todayIsoDate();
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function rangeBoundsIso(fromDate: string, toDate: string): { from: string; to: string } {
  const from = isValidIsoDate(fromDate) ? fromDate.trim() : todayIsoDate();
  const to = isValidIsoDate(toDate) ? toDate.trim() : from;
  const orderedFrom = compareIsoDate(from, to) <= 0 ? from : to;
  const orderedTo = compareIsoDate(from, to) <= 0 ? to : from;
  return {
    from: dayBoundsIso(orderedFrom).from,
    to: dayBoundsIso(orderedTo).to,
  };
}

export function formatIsoDateLabel(date: string): string {
  if (!isValidIsoDate(date)) return date;
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
