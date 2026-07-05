import type { ReactNode } from 'react';
import type { NavPortalKind } from '../../constants/activityHub';
import { ActivityModule } from './ActivityModule';
import { DirectoryModule } from './DirectoryModule';
import { ContractsModule } from './ContractsModule';
import { DashboardModule } from './DashboardModule';
import { MemberDashboardModule } from './MemberDashboardModule';
import { MemberProfileModule } from './MemberProfileModule';
import { MemberMaintenanceModule } from './MemberMaintenanceModule';
import { IncomeExpensesModule } from './IncomeExpensesModule';
import { MaintenanceModule } from './MaintenanceModule';
import { MembersModule } from './MembersModule';
import { ReportsModule } from './ReportsModule';
import { SettingsModule } from './SettingsModule';
import { SupportModule } from './SupportModule';
import { ComplaintModule } from './ComplaintModule';
import { AmenityBookingModule } from './AmenityBookingModule';
import { NoticeModule } from './NoticeModule';
import { AboutSocietyModule } from './AboutSocietyModule';
import { HelpModule } from './HelpModule';
import { AboutUsModule } from './AboutUsModule';
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
  initialRuleId,
  onRuleConsumed,
  initialNoticeId,
  onNoticeConsumed,
  initialBookingId,
  onBookingConsumed,
  onUserUpdated,
  onNavigateProfile,
  onLogout,
  onOpenNotice,
  onNavigateFromActivity,
  navPortal = 'society',
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
  initialRuleId?: string | null;
  onRuleConsumed?: () => void;
  initialNoticeId?: string | null;
  onNoticeConsumed?: () => void;
  initialBookingId?: string | null;
  onBookingConsumed?: () => void;
  onUserUpdated?: (patch: Partial<import('../../types/api').LoginData>) => void;
  onNavigateProfile?: () => void;
  onLogout?: () => void;
  onOpenNotice?: (noticeId: string) => void;
  onNavigateFromActivity?: (routePath: string) => void;
  navPortal?: NavPortalKind;
}): ReactNode {
  if (memberPortal) {
    switch (routePath) {
      case 'activity':
        return (
          <ActivityModule
            portal={navPortal}
            onNavigate={(path) => onNavigateFromActivity?.(path)}
          />
        );
      case 'directory':
        return <DirectoryModule memberPortal />;
      case 'dashboard':
        return (
          <MemberDashboardModule
            onOpenProfile={() => onNavigateProfile?.()}
            onOpenNotice={onOpenNotice}
          />
        );
      case 'maintenance':
        return <MemberMaintenanceModule />;
      case 'chat':
        return (
          <ChatModule
            memberPortal
            userId={userId}
            initialGroupId={initialChatGroupId}
            initialPollId={initialPollId}
            onInitialGroupConsumed={onChatGroupConsumed}
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
      case 'about-society':
        return (
          <AboutSocietyModule
            memberPortal
            initialRuleId={initialRuleId}
            onInitialRuleConsumed={onRuleConsumed}
          />
        );
      case 'notices':
        return (
          <NoticeModule
            memberPortal
            initialNoticeId={initialNoticeId}
            onInitialNoticeConsumed={onNoticeConsumed}
          />
        );
      case 'amenities':
        return (
          <AmenityBookingModule
            memberPortal
            initialBookingId={initialBookingId}
            onInitialBookingConsumed={onBookingConsumed}
          />
        );
      case 'profile':
        return <MemberProfileModule onUserUpdated={onUserUpdated} onLogout={onLogout} />;
      case 'help':
        return <HelpModule memberPortal />;
      case 'about-us':
        return <AboutUsModule />;
      case 'support':
        return <SupportModule />;
      default:
        return <MemberDashboardModule />;
    }
  }

  switch (routePath) {
    case 'activity':
      return (
        <ActivityModule portal={navPortal} onNavigate={(path) => onNavigateFromActivity?.(path)} />
      );
    case 'directory':
      return <DirectoryModule />;
    case 'dashboard':
      return <DashboardModule />;
    case 'maintenance':
      return <MaintenanceModule />;
    case 'ledger':
    case 'expenses':
    case 'income':
      return <IncomeExpensesModule />;
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
          initialPollId={initialPollId}
          onInitialGroupConsumed={onChatGroupConsumed}
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
    case 'about-society':
      return (
        <AboutSocietyModule
          initialRuleId={initialRuleId}
          onInitialRuleConsumed={onRuleConsumed}
        />
      );
    case 'notices':
      return (
        <NoticeModule
          canManageNotices={(userRole ?? '').toUpperCase() === 'CHAIRMAN'}
          initialNoticeId={initialNoticeId}
          onInitialNoticeConsumed={onNoticeConsumed}
        />
      );
    case 'amenities':
      return (
        <AmenityBookingModule
          canManageBookings={(userRole ?? '').toUpperCase() === 'CHAIRMAN'}
          initialBookingId={initialBookingId}
          onInitialBookingConsumed={onBookingConsumed}
        />
      );
    case 'help':
      return <HelpModule />;
    case 'about-us':
      return <AboutUsModule />;
    case 'support':
      return <SupportModule />;
    case 'appearance':
      return <AppearanceModule onLogout={onLogout} />;
    case 'subscription':
      return <SubscriptionModule />;
    default:
      return <SupportModule />;
  }
}
