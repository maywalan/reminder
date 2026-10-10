import { Platform } from 'react-native';

import { setWidgetData } from '../../modules/tickle-live-activity';

import { Colors } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { lang, t } from '@/i18n';
import { fmtDate, fmtTime } from '@/i18n/format';
import { toISO } from '@/utils/dates';

const APP_GROUP = 'group.com.maywalan.tickle';
const WIDGET_KIND = 'TickleWidget';
const MAX_ITEMS = 8;

function colorForPlan(plan: Plan, groups: Group[]): string {
  return plan.color || groups.find((g) => g.id === plan.groupId)?.color || Colors.light.accent;
}

/** Pushes today's incomplete plans into the shared App Group and asks WidgetKit to redraw. iOS only. */
export function syncWidgetData(plans: Plan[], groups: Group[]) {
  if (Platform.OS !== 'ios') return;

  const now = new Date();
  const todayISO = toISO(now);
  const dateLabel = fmtDate(now, { weekday: 'short' });

  const todays = plans
    .filter((p) => p.date === todayISO && !p.completed)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, MAX_ITEMS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      time: p.allDay ? t('common.allDay') : fmtTime(p.time),
      color: colorForPlan(p, groups),
    }));

  setWidgetData(APP_GROUP, WIDGET_KIND, { language: lang(), dateLabel, plans: todays });
}
