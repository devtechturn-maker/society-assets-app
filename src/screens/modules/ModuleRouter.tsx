import type { ReactNode } from 'react';
import { ContractsModule } from './ContractsModule';
import { DashboardModule } from './DashboardModule';
import { MemberDashboardModule } from './MemberDashboardModule';
import { MemberProfileModule } from './MemberProfileModule';
import { MemberMaintenanceModule } from './MemberMaintenanceModule';
import { ExpensesModule } from './ExpensesModule';
import { MaintenanceModule } from './MaintenanceModule';
import { MembersModule } from './MembersModule';
import { OtherIncomeModule } from './OtherIncomeModule';
import { ReportsModule } from './ReportsModule';
import { SettingsModule } from './SettingsModule';
import { SupportModule } from './SupportModule';
import { PollModule } from './PollModule';
import { ComplaintModule } from './ComplaintModule';
import { ChatModule } from './ChatModule';
import { AppearanceModule } from './AppearanceModule';
import { SubscriptionModule } from './SubscriptionModule';

export function ModuleRouter({
  routePath,
  memberPortal = false,
  userId,
  userRole,
  initialChatGroupId,
  onChatGroupConsumed,
  initialPollId,
  onPollConsumed,
  initialComplaintId,
  onComplaintConsumed,
  onUserUpdated,
  onNavigateProfile,
}: {
  routePath: string;
  memberPortal?: boolean;
  userId?: string;
  userRole?: string;
  initialChatGroupId?: string | null;
  onChatGroupConsumed?: () => void;
  initialPollId?: string | null;
  onPollConsumed?: () => void;
  initialComplaintId?: string | null;
  onComplaintConsumed?: () => void;
  onUserUpdated?: (patch: Partial<import('../../types/api').LoginData>) => void;
  onNavigateProfile?: () => void;
}): ReactNode {
  if (memberPortal) {
    switch (routePath) {
      case 'dashboard':
        return <MemberDashboardModule onOpenProfile={() => onNavigateProfile?.()} />;
      case 'maintenance':
        return <MemberMaintenanceModule />;
      case 'chat':
        return (
          <ChatModule
            memberPortal
            userId={userId}
            initialGroupId={initialChatGroupId}
            onInitialGroupConsumed={onChatGroupConsumed}
          />
        );
      case 'polls':
        return (
          <PollModule
            memberPortal
            initialPollId={initialPollId}
            onInitialPollConsumed={onPollConsumed}
          />
        );
      case 'complaints':
        return (
          <ComplaintModule
            memberPortal
            initialComplaintId={initialComplaintId}
            onInitialComplaintConsumed={onComplaintConsumed}
          />
        );
      case 'profile':
        return <MemberProfileModule onUserUpdated={onUserUpdated} />;
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
    case 'chat':
      return (
        <ChatModule
          userId={userId}
          canManageGroups={(userRole ?? '').toUpperCase() === 'CHAIRMAN'}
          initialGroupId={initialChatGroupId}
          onInitialGroupConsumed={onChatGroupConsumed}
        />
      );
    case 'polls':
      return (
        <PollModule
          canManagePolls={(userRole ?? '').toUpperCase() === 'CHAIRMAN'}
          initialPollId={initialPollId}
          onInitialPollConsumed={onPollConsumed}
        />
      );
    case 'complaints':
      return (
        <ComplaintModule
          canManageComplaints={(userRole ?? '').toUpperCase() === 'CHAIRMAN'}
          initialComplaintId={initialComplaintId}
          onInitialComplaintConsumed={onComplaintConsumed}
        />
      );
    case 'support':
      return <SupportModule />;
    case 'appearance':
      return <AppearanceModule />;
    case 'subscription':
      return <SubscriptionModule />;
    default:
      return <SupportModule />;
  }
}
