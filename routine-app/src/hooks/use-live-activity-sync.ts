import { useEffect } from 'react';
import { AppState } from 'react-native';

import { planPalette } from '@/components/home/tokens';
import { usePlannerStore } from '@/store/use-planner-store';
import { planDateTime, planEndDateTime } from '@/utils/countdown';
import { addMinutesToTime, findLiveActivityPlan } from '@/utils/home-feed';
import { syncLiveActivity, takePendingLiveActivityActions } from '../../modules/tickle-live-activity';

/** Re-check this often while the app is open — catches a task entering its 1-hour window or starting. */
const TICK_MS = 30_000;

/** Applies Lock Screen Done / +10 min taps (queued natively while the app was closed) to the store. */
function applyPendingActions() {
  const actions = takePendingLiveActivityActions();
  if (actions.length === 0) return;
  const { plans, toggleComplete, updatePlan } = usePlannerStore.getState();
  for (const { action, planId } of actions) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) continue;
    if (action === 'complete' && !plan.completed) toggleComplete(planId);
    if (action === 'extend' && plan.endTime) updatePlan(planId, { endTime: addMinutesToTime(plan.endTime, 10) });
  }
}

function sync() {
  const { plans, groups, settings } = usePlannerStore.getState();
  const target = settings.liveActivitiesEnabled ? findLiveActivityPlan(plans, Date.now()) : null;
  if (!target) {
    syncLiveActivity(null);
    return;
  }
  const { plan, phase } = target;
  const palette = planPalette(plan.color, false);
  syncLiveActivity({
    planId: plan.id,
    title: plan.name,
    groupName: groups.find((g) => g.id === plan.groupId)?.name,
    baseHex: palette.base,
    textHex: palette.text,
    tintHex: palette.cardTint,
    trackHex: palette.track,
    pillBorderHex: palette.pillBorder,
    pillTextHex: palette.pillText,
    phase,
    startMs: planDateTime(plan).getTime(),
    endMs: planEndDateTime(plan)?.getTime(),
  });
}

/**
 * Keeps the Lock Screen / Dynamic Island Live Activity matched to the store. Mounted once at the
 * root layout, like useWidgetSync. iOS only lets an app *start* a Live Activity while it's
 * running, so this also syncs on the way into the background — the last chance to put an
 * upcoming task's countdown on the Lock Screen before the app is closed.
 */
export function useLiveActivitySync() {
  useEffect(() => {
    applyPendingActions();
    sync();

    const unsubscribe = usePlannerStore.subscribe((state, prev) => {
      if (state.plans !== prev.plans || state.groups !== prev.groups || state.settings !== prev.settings) sync();
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') applyPendingActions();
      sync();
    });

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        applyPendingActions();
        sync();
      }
    }, TICK_MS);

    return () => {
      unsubscribe();
      appStateSub.remove();
      clearInterval(timer);
    };
  }, []);
}
