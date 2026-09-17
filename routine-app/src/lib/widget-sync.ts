import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Group, Plan } from '@/store/types';
import { fmtTime12, toISO } from '@/utils/dates';

const APP_GROUP = 'group.com.maywalan.tickle';
const WIDGET_KIND = 'TickleWidget';
const MAX_ITEMS = 8;

const storage = Platform.OS === 'ios' ? new ExtensionStorage(APP_GROUP) : null;

function colorForPlan(plan: Plan, groups: Group[]): string {
  return plan.color || groups.find((g) => g.id === plan.groupId)?.color || Colors.light.accent;
}

/** Pushes today's incomplete plans into the shared App Group and asks WidgetKit to redraw. iOS only. */
export function syncWidgetData(plans: Plan[], groups: Group[]) {
  if (!storage) return;

  const now = new Date();
  const todayISO = toISO(now);
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const todays = plans
    .filter((p) => p.date === todayISO && !p.completed)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, MAX_ITEMS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      time: p.allDay ? 'All Day' : fmtTime12(p.time),
      color: colorForPlan(p, groups),
    }));

  storage.set('dateLabel', dateLabel);
  storage.set('todayPlans', todays);
  ExtensionStorage.reloadWidget(WIDGET_KIND);
}
