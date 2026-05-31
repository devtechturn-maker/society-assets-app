import type { ReactNode } from 'react';
import { ContractsModule } from './ContractsModule';
import { DashboardModule } from './DashboardModule';
import { MemberDashboardModule } from './MemberDashboardModule';
import { MemberMaintenanceModule } from './MemberMaintenanceModule';
import { ExpensesModule } from './ExpensesModule';
import { MaintenanceModule } from './MaintenanceModule';
import { MembersModule } from './MembersModule';
import { OtherIncomeModule } from './OtherIncomeModule';
import { ReportsModule } from './ReportsModule';
import { SettingsModule } from './SettingsModule';
import { SupportModule } from './SupportModule';
import { AppearanceModule } from './AppearanceModule';

export function ModuleRouter({
  routePath,
  memberPortal = false,
}: {
  routePath: string;
  memberPortal?: boolean;
}): ReactNode {
  if (memberPortal) {
    switch (routePath) {
      case 'dashboard':
        return <MemberDashboardModule />;
      case 'maintenance':
        return <MemberMaintenanceModule />;
      case 'support':
        return <SupportModule />;
      default:
        return <MemberDashboardModule />;
    }
  }

  switch (routePath) {
    case 'dashboard':
      return <DashboardModule />;
    case 'maintenance':
      return <MaintenanceModule />;
    case 'expenses':
      return <ExpensesModule />;
    case 'income':
      return <OtherIncomeModule />;
    case 'members':
      return <MembersModule />;
    case 'contracts':
      return <ContractsModule />;
    case 'reports':
      return <ReportsModule />;
    case 'settings':
      return <SettingsModule />;
    case 'support':
      return <SupportModule />;
    case 'appearance':
      return <AppearanceModule />;
    default:
      return <SupportModule />;
  }
}
