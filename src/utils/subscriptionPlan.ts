import type { PublicSubscriptionPlan } from '../types/api';

export function planCycleLabel(plan: PublicSubscriptionPlan): string {
  return plan.billingCycle === 'MONTHLY' ? '/ month' : '/ year';
}

export function formatPlanPrice(plan: PublicSubscriptionPlan): string {
  return `₹${Math.round(plan.price).toLocaleString('en-IN')}${planCycleLabel(plan)}`;
}

export function memberLimitLabel(plan: PublicSubscriptionPlan): string {
  if (plan.memberLimit < 0) return 'Unlimited members';
  return `Up to ${plan.memberLimit} members included`;
}

export function canBuyExtraMembers(plan: PublicSubscriptionPlan): boolean {
  return plan.memberLimit >= 0 && (plan.additionalMemberPrice ?? 0) > 0;
}

export function registrationTotal(plan: PublicSubscriptionPlan, extraSlots: number): number {
  const base = plan.price ?? 0;
  const extra = canBuyExtraMembers(plan)
    ? Math.max(0, extraSlots) * (plan.additionalMemberPrice ?? 0)
    : 0;
  return base + extra;
}
