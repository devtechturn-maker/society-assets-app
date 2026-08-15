import { dayBoundsIso, formatIsoDateLabel, rangeBoundsIso, todayIsoDate } from './dates';

export type VisitorDateSelection =
  | { mode: 'today' }
  | { mode: 'single'; date: string }
  | { mode: 'range'; from: string; to: string };

export function defaultVisitorDateSelection(): VisitorDateSelection {
  return { mode: 'today' };
}

export function resolveDateSelectionBounds(selection: VisitorDateSelection): { from: string; to: string } {
  if (selection.mode === 'today') {
    return dayBoundsIso(todayIsoDate());
  }
  if (selection.mode === 'single') {
    return dayBoundsIso(selection.date);
  }
  return rangeBoundsIso(selection.from, selection.to);
}

export function visitorDateSelectionLabel(selection: VisitorDateSelection): string {
  if (selection.mode === 'today') {
    return 'Date';
  }
  if (selection.mode === 'single') {
    return formatIsoDateLabel(selection.date);
  }
  return `${formatIsoDateLabel(selection.from)} – ${formatIsoDateLabel(selection.to)}`;
}

export function visitorDatePeriodLabel(selection: VisitorDateSelection): string {
  if (selection.mode === 'today') {
    return `Today · ${formatIsoDateLabel(todayIsoDate())}`;
  }
  if (selection.mode === 'single') {
    return formatIsoDateLabel(selection.date);
  }
  return `${formatIsoDateLabel(selection.from)} – ${formatIsoDateLabel(selection.to)}`;
}
