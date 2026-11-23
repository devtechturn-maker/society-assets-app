import type { KpiItem } from '../components/dashboard/KpiGrid';
import type { SocietyOverview } from '../types/api';

/** Chairman dashboard tiles. A value the server did not send, or the plan excludes, gets no tile instead of a 0. */
export function dashboardKpis(data: SocietyOverview): KpiItem[] {
  const items: KpiItem[] = [];
  if (data.totalMaintenanceIncome != null) {
    items.push({ label: 'Maintenance Collected', value: data.totalMaintenanceIncome });
  }
  if (data.totalOutstanding != null) {
    items.push({ label: 'Maintenance Pending', value: data.totalOutstanding });
  }
  if (data.openComplaints != null) {
    items.push({ label: 'Open Complaints', value: data.openComplaints, isCurrency: false });
  }
  if (data.todayVisitors != null) {
    items.push({ label: "Today's Visitors", value: data.todayVisitors, isCurrency: false });
  }
  items.push(
    { label: 'Total Income', value: data.totalIncome },
    { label: 'Other Income', value: data.totalOtherIncome ?? 0 },
    { label: 'Total Expenses', value: data.totalExpenses },
    { label: 'Cash On Hand', value: data.cashOnHand },
    { label: 'Bank Balance', value: data.bankBalance ?? 0 },
    { label: 'Expense Count', value: data.expenseCount, isCurrency: false },
    { label: 'Total Members', value: data.totalUsers, isCurrency: false }
  );
  return items;
}
