import * as Notifications from 'expo-notifications';

import type { Plan, Settings } from '@/store/types';
import { planDateTime } from '@/utils/countdown';
import { toISO } from '@/utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PLAN_ALERT_PREFIX = 'plan-alert:';
const RECAP_IDENTIFIER = 'daily-recap';

/**
 * iOS silently drops anything scheduled past ~64 pending local notifications — there's no error,
 * they just never fire. Reserve a few slots so the recap (rescheduled independently) is never
 * the thing that gets crowded out.
 */
const PLAN_ALERT_BUDGET = 60;

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function alertBody(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Starting now';
  if (offsetMinutes < 60) return `Starting in ${offsetMinutes} min`;
  if (offsetMinutes < 1440) return `Starting in ${Math.round(offsetMinutes / 60)} hr`;
  const days = Math.round(offsetMinutes / 1440);
  return `Starting in ${days} day${days > 1 ? 's' : ''}`;
}

interface AlertJob {
  plan: Plan;
  offsetMinutes: number;
  triggerDate: Date;
}

function buildAlertJobs(plans: Plan[]): AlertJob[] {
  const jobs: AlertJob[] = [];
  const now = Date.now();
  for (const plan of plans) {
    if (plan.completed) continue;
    for (const offset of plan.alerts) {
      const minutes = Number(offset);
      if (!Number.isFinite(minutes)) continue;
      const triggerDate = new Date(planDateTime(plan).getTime() - minutes * 60_000);
      if (triggerDate.getTime() <= now) continue;
      jobs.push({ plan, offsetMinutes: minutes, triggerDate });
    }
  }
  jobs.sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
  return jobs;
}

/**
 * Cancels every previously-scheduled plan-alert notification and reschedules from the current
 * plan list, soonest first, capped to PLAN_ALERT_BUDGET. Call after any plan mutation (add,
 * edit, delete, complete) while notifications are enabled — this "rebuild from scratch" approach
 * is simpler and less bug-prone than trying to patch individual scheduled notifications in place
 * as plans change.
 */
export async function rescheduleAllPlanAlerts(plans: Plan[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(PLAN_ALERT_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const jobs = buildAlertJobs(plans).slice(0, PLAN_ALERT_BUDGET);
  await Promise.all(
    jobs.map((job) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${PLAN_ALERT_PREFIX}${job.plan.id}:${job.offsetMinutes}`,
        content: { title: job.plan.name, body: alertBody(job.offsetMinutes), sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: job.triggerDate },
      })
    )
  );
}

export async function cancelAllPlanAlerts() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(PLAN_ALERT_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

function recapBody(dayPlans: Plan[]): string {
  if (dayPlans.length === 0) return 'Nothing on your plan today.';
  const sorted = [...dayPlans].sort((a, b) => a.time.localeCompare(b.time));
  const names = sorted.slice(0, 3).map((p) => p.name);
  const rest = dayPlans.length - names.length;
  return `${names.join(', ')}${rest > 0 ? `, +${rest} more` : ''}`;
}

/**
 * Schedules (or reschedules) a single one-off "morning agenda" notification for the next
 * upcoming recapHour — today's if that time hasn't passed yet, otherwise tomorrow's — listing
 * that date's plans.
 *
 * Real local notifications can't compute fresh content at fire time (no server, no background
 * task), so this recomputes and re-schedules the one-off notification every time it's called —
 * wired to fire on plan changes and app foreground (see useNotificationsSync). That keeps the
 * next recap accurate as of the last time the app was open. If the app isn't opened at all
 * between recaps, only the single already-scheduled one fires and content can't refresh further
 * until the app is reopened — an accepted limitation of a backend-less setup.
 */
export async function refreshDailyRecap(plans: Plan[], settings: Pick<Settings, 'recapEnabled' | 'recapHour'>) {
  await Notifications.cancelScheduledNotificationAsync(RECAP_IDENTIFIER).catch(() => {});
  if (!settings.recapEnabled) return;

  const now = new Date();
  const target = new Date(now);
  target.setHours(settings.recapHour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);

  const targetISO = toISO(target);
  const isToday = targetISO === toISO(now);
  const dayPlans = plans.filter((p) => p.date === targetISO && !p.completed);

  await Notifications.scheduleNotificationAsync({
    identifier: RECAP_IDENTIFIER,
    content: {
      title: isToday ? "Today's Agenda" : "Tomorrow's Agenda",
      body: recapBody(dayPlans),
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
}

export async function cancelDailyRecap() {
  await Notifications.cancelScheduledNotificationAsync(RECAP_IDENTIFIER).catch(() => {});
}
