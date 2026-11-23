import { financialYearStart, periodRange } from '../../src/utils/reportPeriods';

describe('report periods', () => {
  it('starts the financial year on 1 April', () => {
    expect(financialYearStart(new Date(2026, 2, 31))).toBe(2025);
    expect(financialYearStart(new Date(2026, 3, 1))).toBe(2026);
  });

  it('gives this and last financial year', () => {
    const today = new Date(2026, 10, 23);
    expect(periodRange('THIS_FY', today)).toEqual({ from: '2026-04-01', to: '2026-11-23' });
    expect(periodRange('LAST_FY', today)).toEqual({ from: '2025-04-01', to: '2026-03-31' });
  });

  it('handles last month across a year end', () => {
    expect(periodRange('LAST_MONTH', new Date(2027, 0, 10))).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(periodRange('LAST_MONTH', new Date(2028, 2, 5))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('this month runs to today, all time has no dates', () => {
    expect(periodRange('THIS_MONTH', new Date(2026, 10, 23))).toEqual({ from: '2026-11-01', to: '2026-11-23' });
    expect(periodRange('LIFETIME')).toEqual({});
  });
});
