import { Platform } from 'react-native';

import { setWidgetData } from '../../modules/tickle-live-activity';

import { Colors } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { lang, t } from '@/i18n';
import { fmtTime } from '@/i18n/format';
import { deviceRegion, getHolidays } from '@/lib/holidays';
import { toISO } from '@/utils/dates';
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

  const widgetPlans = plans
    .filter((p) => p.date >= fromISO && p.date <= toISODate)
    .map((p) => ({
      id: p.id,
      title: p.name,
      date: p.date,
      time: p.time,
      allDay: !!p.allDay,
      color: colorForPlan(p, groups, Colors.light.accent),
      done: p.completed,
      timeLabel: p.allDay ? t('common.allDay') : fmtTime(p.time),
    }));

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
