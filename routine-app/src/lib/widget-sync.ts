import { Platform } from 'react-native';

import { setWidgetData } from '../../modules/tickle-live-activity';

import { Colors } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { lang, t } from '@/i18n';
import { fmtPlanDayTime } from '@/i18n/format';
import { deviceRegion, getHolidays } from '@/lib/holidays';
import { planDays, planDayRole, toISO } from '@/utils/dates';
import { colorForPlan } from '@/utils/plans';

const APP_GROUP = 'group.com.maywalan.tickle';
// The large widget shows this month's 6-week grid (up to ~6 days of last month), and its timeline
// keeps rolling at midnight while the app stays closed — so cover last month through two months out.
const DAYS_BACK = 45;
const DAYS_AHEAD = 75;

let syncRun = 0;

/**
 * Pushes plans around today (+ public holidays) into the shared App Group and reloads every
 * calendar widget (targets/widget/TickleCalendarWidgets.swift). iOS only.
 */
export async function syncWidgetData(plans: Plan[], groups: Group[]) {
  if (Platform.OS !== 'ios') return;
  const run = ++syncRun;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS_BACK);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DAYS_AHEAD);
  const fromISO = toISO(from);
  const toISODate = toISO(to);

  // A multi-day range goes in once per day it covers, so the widget lists and dots it on each of
  // them without a widget change (2026-11-25): the middle days as all-day, the last day at its end
  // time ("Ends 18:00"). Later days get their own id ("<id>~<day>") so SwiftUI lists never see a
  // duplicate; the Calendar tab strips the suffix when a widget tap opens the plan.
  const widgetPlans = plans
    .filter((p) => (p.endDate ?? p.date) >= fromISO && p.date <= toISODate)
    .flatMap((p) =>
      planDays(p)
        .filter((iso) => iso >= fromISO && iso <= toISODate)
        .map((iso) => {
          const role = planDayRole(p, iso);
          const allDay = !!p.allDay || role === 'middle';
          return {
            id: iso === p.date ? p.id : `${p.id}~${iso}`,
            title: p.name,
            date: iso,
            time: role === 'end' && p.endTime ? p.endTime : p.time,
            allDay,
            color: colorForPlan(p, groups, Colors.light.accent),
            done: p.completed,
            timeLabel: allDay ? t('common.allDay') : fmtPlanDayTime(p, iso),
          };
        })
    );

  // Holidays come from the same cached API as the Calendar screen; a miss just leaves dates uncoloured.
  const holidays: Record<string, string> = {};
  const region = deviceRegion();
  if (region) {
    const years = [...new Set([from.getFullYear(), to.getFullYear()])];
    const lists = await Promise.all(years.map((y) => getHolidays(y, region)));
    for (const h of lists.flat()) {
      if (h.date >= fromISO && h.date <= toISODate) holidays[h.date] = h.name;
    }
  }

  // A newer sync started while holidays loaded — let that one write instead of this stale snapshot.
  if (run !== syncRun) return;
  setWidgetData(APP_GROUP, lang(), { plans: widgetPlans, holidays });
}
