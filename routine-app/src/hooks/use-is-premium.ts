import { usePlannerStore } from '@/store/use-planner-store';
import { isPremium } from '@/utils/premium';

/** True on a trial or paid Premium; re-renders when the subscription changes. */
export function useIsPremium(): boolean {
  return usePlannerStore((s) => isPremium(s.mockSubscriptionState));
}
