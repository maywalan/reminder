import * as Notifications from 'expo-notifications';

import { alarmSoundFile, DEFAULT_ALARM_SOUND } from '@/constants/alarm-sounds';
import { t } from '@/i18n';
import type { Plan, Settings } from '@/store/types';
import { usePlannerStore } from '@/store/use-planner-store';
import { planDateTime, planEndDateTime } from '@/utils/countdown';
import { fromISO, toISO } from '@/utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async (n) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // An alarm the user turned on for this plan always rings, even with app sounds off.
    shouldPlaySound: n.request.content.data?.alarm === true || usePlannerStore.getState().settings.soundEnabled,
    // Tickle never sets a badge count, so leave the icon alone.
    shouldSetBadge: false,
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

/** All-day plans have no real start time, so their alerts fire at this hour (like iOS Calendar). */
const ALL_DAY_ALERT_HOUR = 9;

/** Roughly one Lock Screen line of body text; a second line gets clipped when iOS stacks notifications. */
const RECAP_LINE_BUDGET = 36;

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * iOS only ever shows its native permission popup once per install — a second
 * requestPermissionsAsync() after a denial just silently re-returns 'denied', no dialog. Callers
 * use `canAskAgain` to tell "never asked" (safe to call requestNotificationPermissions) apart
 * from "already denied" (must send the user to Settings instead).
 */
export async function getNotificationPermissionStatus() {
  return Notifications.getPermissionsAsync();
}

function alertBody(plan: Plan, offsetMinutes: number): string {
  if (plan.allDay) {
    const days = Math.floor(offsetMinutes / 1440);
    if (days === 0) return t('notif.allDayToday');
    if (days === 1) return t('notif.allDayTomorrow');
    return t('notif.inDays', { count: days });
  }
  if (offsetMinutes === 0) return t('notif.startingNow');
  if (offsetMinutes < 60) return t('notif.inMin', { n: offsetMinutes });
  if (offsetMinutes < 1440) return t('notif.inHr', { n: Math.round(offsetMinutes / 60) });
  if (offsetMinutes % 10080 === 0) return t('notif.inWeeks', { count: offsetMinutes / 10080 });
  return t('notif.inDays', { count: Math.round(offsetMinutes / 1440) });
}

/**
 * When a plan's alert fires. A timed plan counts back from its start; an all-day plan's stored
 * time is a leftover placeholder, so its alerts land at ALL_DAY_ALERT_HOUR on the day itself
 * (any offset under a day) or that many whole days before.
 */
function alertTriggerDate(plan: Plan, offsetMinutes: number): Date {
  if (!plan.allDay) return new Date(planDateTime(plan).getTime() - offsetMinutes * 60_000);
  const d = fromISO(plan.date);
  d.setDate(d.getDate() - Math.floor(offsetMinutes / 1440));
  d.setHours(ALL_DAY_ALERT_HOUR, 0, 0, 0);
  return d;
}

interface AlertJob {
  plan: Plan;
  offsetMinutes: number;
  triggerDate: Date;
  /** Set for alarm-style rings (2026-11-11): at the start, or at the end of a time range. */
  alarm?: 'start' | 'end';
}

/**
 * Skips any plan whose date/time/timezone can't resolve to a real Date. This isn't defensive
 * padding: expo-notifications' native iOS layer hard-crashes the whole app (an uncatchable Swift
 * trap, not a JS-catchable error) if it's ever handed a NaN trigger timestamp, so an Invalid Date
 * must never reach scheduleNotificationAsync.
 */
function buildAlertJobs(plans: Plan[]): AlertJob[] {
  const jobs: AlertJob[] = [];
  const now = Date.now();
  for (const plan of plans) {
    if (plan.completed) continue;
    // Two all-day alerts under a day ("5 min" + "15 min") land on the same 9:00 — send one.
    const seen = new Set<number>();
    for (const offset of plan.alerts) {
      const minutes = Number(offset);
      if (!Number.isFinite(minutes) || minutes < 0) continue;
      // The alarm already rings at the start; a plain "Starting now" on top would double up.
      if (minutes === 0 && plan.alarm && !plan.allDay) continue;
      const triggerDate = alertTriggerDate(plan, minutes);
      const at = triggerDate.getTime();
      if (!Number.isFinite(at) || at <= now || seen.has(at)) continue;
      seen.add(at);
      jobs.push({ plan, offsetMinutes: minutes, triggerDate });
    }
    // Alarms are for timed plans only; an all-day plan has no moment to ring at.
    if (plan.alarm && !plan.allDay) {
      const start = planDateTime(plan);
      const end = planEndDateTime(plan);
      // A range whose end isn't after its start (e.g. 14:00–14:00) would ring twice at once: start only.
      const hasEnd = !!end && end.getTime() > start.getTime();
      const ends: [Date | null, 'start' | 'end'][] = [[start, 'start'], [hasEnd ? end : null, 'end']];
      for (const [date, alarm] of ends) {
        const at = date?.getTime();
        if (date && at !== undefined && Number.isFinite(at) && at > now) jobs.push({ plan, offsetMinutes: 0, triggerDate: date, alarm });
      }
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
export async function rescheduleAllPlanAlerts(plans: Plan[], sound = true) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(PLAN_ALERT_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const jobs = buildAlertJobs(plans).slice(0, PLAN_ALERT_BUDGET);
  await Promise.all(
    jobs.map((job) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${PLAN_ALERT_PREFIX}${job.plan.id}:${job.alarm ? `alarm-${job.alarm}` : job.offsetMinutes}`,
        content: job.alarm
          ? {
              title: job.plan.name,
              body: t(job.alarm === 'start' ? 'notif.alarmStart' : 'notif.alarmEnd'),
              // Bundled sound (app.json expo-notifications `sounds`); rings even with app sounds off.
              sound: alarmSoundFile(job.plan.alarmSound ?? DEFAULT_ALARM_SOUND),
              // No interruptionLevel 'timeSensitive' yet: it needs the Time Sensitive capability on the
              // App ID, which build 6 failed without (2026-11-11). Add back with the AlarmKit work.
              data: { alarm: true, planId: job.plan.id },
            }
          : { title: job.plan.name, body: alertBody(job.plan, job.offsetMinutes), sound },
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

/** Thai vowel and tone marks sit above or below a letter and take no width of their own. */
const THAI_MARKS = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;
const visualLength = (text: string) => text.replace(THAI_MARKS, '').length;

function recapBody(dayPlans: Plan[]): string {
  if (dayPlans.length === 0) return t('notif.nothingToday');
  const sorted = [...dayPlans].sort((a, b) =>
    !!a.allDay !== !!b.allDay ? (a.allDay ? -1 : 1) : a.time.localeCompare(b.time)
  );
  // Fit as many names as one line holds, counting the "+N more" tail too.
  const line = (names: string[]) => {
    const rest = sorted.length - names.length;
    return `${names.join(', ')}${rest > 0 ? t('notif.more', { n: rest }) : ''}`;
  };
  const names: string[] = [];
  for (const plan of sorted) {
    if (names.length > 0 && visualLength(line([...names, plan.name])) > RECAP_LINE_BUDGET) break;
    names.push(plan.name);
  }
  // A single long first name still gets cut to the budget rather than wrapping.
  const tail = line(names).slice(names.join(', ').length);
  const room = RECAP_LINE_BUDGET - visualLength(tail);
  const head = names.join(', ');
  if (visualLength(head) <= room) return `${head}${tail}`;
  // Cut by visible width, never between a Thai letter and its mark.
  let cut = '';
  for (const ch of head) {
    if (visualLength(cut + ch) > Math.max(room - 1, 8)) break;
    cut += ch;
  }
  return `${cut.trimEnd()}…${tail}`;
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
export async function refreshDailyRecap(
  plans: Plan[],
  settings: Pick<Settings, 'recapEnabled' | 'recapHour' | 'recapMinute' | 'soundEnabled'>
) {
  await Notifications.cancelScheduledNotificationAsync(RECAP_IDENTIFIER).catch(() => {});
  if (!settings.recapEnabled) return;

  const now = new Date();
  const target = new Date(now);
  target.setHours(settings.recapHour, settings.recapMinute ?? 0, 0, 0);
  // Guards against a corrupted/non-numeric recapHour producing an Invalid Date — see
  // buildAlertJobs' comment above for why this must never reach scheduleNotificationAsync.
  if (!Number.isFinite(target.getTime())) return;
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);

  const targetISO = toISO(target);
  const isToday = targetISO === toISO(now);
  const dayPlans = plans.filter((p) => p.date === targetISO && !p.completed);

  await Notifications.scheduleNotificationAsync({
    identifier: RECAP_IDENTIFIER,
    content: {
      title: isToday ? t('notif.todayAgenda') : t('notif.tomorrowAgenda'),
      body: recapBody(dayPlans),
      sound: settings.soundEnabled,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
}

export async function cancelDailyRecap() {
  await Notifications.cancelScheduledNotificationAsync(RECAP_IDENTIFIER).catch(() => {});
}
