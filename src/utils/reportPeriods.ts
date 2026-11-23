import type { ReportRange } from '../types/api';

export type ReportPeriod = 'LIFETIME' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'LAST_FY';

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'LAST_MONTH', label: 'Last month' },
  { value: 'THIS_FY', label: 'This year (Apr–Mar)' },
  { value: 'LAST_FY', label: 'Last year' },
  { value: 'LIFETIME', label: 'All time' },
];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function lastDay(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** The financial year (1 April to 31 March) that {@code today} falls in, as its starting calendar year. */
export function financialYearStart(today: Date): number {
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

/** Dates for a period; "This month" and "This year" run to today. */
export function periodRange(period: ReportPeriod, today: Date = new Date()): ReportRange {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const todayIso = iso(y, m, today.getDate());
  switch (period) {
    case 'THIS_MONTH':
      return { from: iso(y, m, 1), to: todayIso };
    case 'LAST_MONTH': {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { from: iso(ly, lm, 1), to: iso(ly, lm, lastDay(ly, lm)) };
    }
    case 'THIS_FY': {
      const fy = financialYearStart(today);
      return { from: iso(fy, 4, 1), to: todayIso };
    }
    case 'LAST_FY': {
      const fy = financialYearStart(today) - 1;
      return { from: iso(fy, 4, 1), to: iso(fy + 1, 3, 31) };
    }
    default:
      return {};
  }
}

export function periodLabel(range: ReportRange): string {
  if (!range.from && !range.to) return 'All time';
  return `${range.from ?? 'start'} to ${range.to ?? 'today'}`;
}
