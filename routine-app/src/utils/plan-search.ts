import type { Group, Plan } from '@/store/types';
import { t } from '@/i18n';
import { fmtDate, MONTH_LONG, MONTH_SHORT, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/i18n/format';
import { fmtTime12, fromISO, toISO } from '@/utils/dates';

/**
 * Home's search: matches a plan's title, group name, time and date. Every word typed must match
 * somewhere ("work tue" = Work-group plans on a Tuesday). Times match as "14:30", "2:30 pm",
 * "2:30pm" or "2pm"; dates as "2026-10-06", "oct 6", "6 oct", "october", "tue", "tuesday", and
 * "today" / "tomorrow" / "yesterday". Thai words match too, whatever the app language: "ต.ค.",
 * "ตุลาคม", "จันทร์", "วันนี้" / "พรุ่งนี้" / "เมื่อวาน", "ทั้งวัน".
 */

function timeForms(time: string): string[] {
  const twelve = fmtTime12(time).toLowerCase(); // "2:30 pm"
  const [clock, ap] = twelve.split(' ');
  const forms = [time, twelve, `${clock}${ap}`];
  if (clock.endsWith(':00')) forms.push(`${clock.slice(0, -3)}${ap}`, `${clock.slice(0, -3)} ${ap}`); // "2pm"
  return forms;
}

function dateForms(dateISO: string, todayISO: string): string[] {
  const d = fromISO(dateISO);
  const day = d.getDate();
  const monShort = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const monLong = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const forms = [
    dateISO,
    d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(),
    d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
    `${monShort} ${day}`,
    `${day} ${monShort}`,
    `${monLong} ${day}`,
    `${day} ${monLong}`,
    `${d.getMonth() + 1}/${day}`,
    `${day}/${d.getMonth() + 1}`,
  ];
  const m = d.getMonth();
  const wd = d.getDay();
  forms.push(
    MONTH_SHORT.th[m],
    MONTH_LONG.th[m],
    WEEKDAY_SHORT.th[wd],
    WEEKDAY_LONG.th[wd],
    WEEKDAY_LONG.th[wd].replace(/^วัน/, ''),
    `${day} ${MONTH_SHORT.th[m]}`,
    `${day} ${MONTH_LONG.th[m]}`
  );
  const offset = relativeDay(dateISO, todayISO);
  if (offset === 0) forms.push('today', 'วันนี้');
  if (offset === 1) forms.push('tomorrow', 'พรุ่งนี้');
  if (offset === -1) forms.push('yesterday', 'เมื่อวาน');
  return forms;
}

function relativeDay(dateISO: string, todayISO: string) {
  return Math.round((fromISO(dateISO).getTime() - fromISO(todayISO).getTime()) / 86_400_000);
}

export function searchPlans(plans: Plan[], groups: Group[], query: string, nowMs: number): Plan[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const todayISO = toISO(new Date(nowMs));
  const groupName = new Map(groups.map((g) => [g.id, g.name.toLowerCase()]));

  return plans.filter((p) => {
    const haystack = [
      p.name.toLowerCase(),
      p.groupId ? (groupName.get(p.groupId) ?? '') : '',
      ...(p.allDay ? ['all day', 'ทั้งวัน'] : timeForms(p.time)),
      ...(p.endTime && !p.allDay ? timeForms(p.endTime) : []),
      ...dateForms(p.date, todayISO),
    ].join(' | ');
    // "oct 6" is two words but one date form — also try the whole query as a phrase.
    return haystack.includes(words.join(' ')) || words.every((w) => haystack.includes(w));
  });
}

export interface SearchSection {
  dateISO: string;
  title: string;
  plans: Plan[];
}

/** Today and later first (soonest at top), then past days (most recent first), one section per date. */
export function groupSearchResults(results: Plan[], nowMs: number): SearchSection[] {
  const todayISO = toISO(new Date(nowMs));
  const byDate = new Map<string, Plan[]>();
  for (const p of results) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  const dates = [...byDate.keys()];
  const upcoming = dates.filter((d) => d >= todayISO).sort();
  const past = dates.filter((d) => d < todayISO).sort().reverse();
  return [...upcoming, ...past].map((dateISO) => ({
    dateISO,
    title: sectionTitle(dateISO, todayISO),
    plans: byDate
      .get(dateISO)!
      .sort((a, b) => (a.allDay === b.allDay ? a.time.localeCompare(b.time) : a.allDay ? -1 : 1)),
  }));
}

function sectionTitle(dateISO: string, todayISO: string) {
  const offset = relativeDay(dateISO, todayISO);
  const rel = offset === 0 ? t('home.today') : offset === 1 ? t('date.tomorrow') : offset === -1 ? t('date.yesterday') : null;
  const label = fmtDate(fromISO(dateISO), { weekday: 'short' });
  return rel ? `${rel} · ${label}` : label;
}
