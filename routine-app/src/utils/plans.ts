import type { Group, Plan } from '@/store/types';

export function colorForPlan(plan: Plan, groups: Group[], fallback: string): string {
  if (plan.color) return plan.color;
  const group = groups.find((g) => g.id === plan.groupId);
  return group?.color ?? fallback;
}
