import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';
import type { FontScale } from '@/constants/theme';
import type { AlertStyle, CalendarDensity, Group, Language, Plan, Profile, Settings, ThemeMode } from '@/store/types';

/**
 * All Supabase read/write logic for syncing `usePlannerStore`'s local data to the
 * `plans`/`groups`/`profiles`/`settings` tables. Writes here are fire-and-forget (logged on
 * failure, not retried/queued) — acceptable for now since the local AsyncStorage copy stays the
 * source of truth for the UI; a dropped write just means that one change hasn't reached the
 * account yet, not that it's lost from the device.
 */

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

// ---------------------------------------------------------------------------
// row <-> local type mappers
// ---------------------------------------------------------------------------

function planToRow(plan: Plan, userId: string) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name,
    date: plan.date,
    time: plan.time,
    end_time: plan.endTime ?? null,
    all_day: plan.allDay ?? false,
    alerts: plan.alerts,
    notes: plan.notes ?? null,
    location: plan.location ?? null,
    photo_uris: plan.photoUris ?? [],
    live: plan.live,
    completed: plan.completed,
    color: plan.color,
    group_id: plan.groupId,
    repeat_type: plan.repeatType,
    repeat_id: plan.repeatId ?? null,
    plan_order: plan.order ?? null,
  };
}

function rowToPlan(row: Record<string, any>): Plan {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time,
    endTime: row.end_time ?? undefined,
    allDay: row.all_day ?? undefined,
    alerts: row.alerts ?? [],
    notes: row.notes ?? undefined,
    location: row.location ?? undefined,
    photoUris: row.photo_uris ?? undefined,
    live: row.live,
    completed: row.completed,
    color: row.color,
    groupId: row.group_id,
    repeatType: row.repeat_type,
    repeatId: row.repeat_id ?? undefined,
    order: row.plan_order ?? undefined,
  };
}

function groupToRow(group: Group, userId: string) {
  return { id: group.id, user_id: userId, name: group.name, color: group.color };
}

function rowToGroup(row: Record<string, any>): Group {
  return { id: row.id, name: row.name, color: row.color };
}

function settingsToRow(patch: Partial<Settings>) {
  const row: Record<string, unknown> = {};
  if (patch.notificationsEnabled !== undefined) row.notifications_enabled = patch.notificationsEnabled;
  if (patch.liveActivitiesEnabled !== undefined) row.live_activities_enabled = patch.liveActivitiesEnabled;
  if (patch.themeMode !== undefined) row.theme_mode = patch.themeMode;
  if (patch.soundEnabled !== undefined) row.sound_enabled = patch.soundEnabled;
  if (patch.badgesEnabled !== undefined) row.badges_enabled = patch.badgesEnabled;
  if (patch.alertStyle !== undefined) row.alert_style = patch.alertStyle;
  if (patch.language !== undefined) row.language = patch.language;
  return row;
}

function rowToSettings(row: Record<string, any>): Settings {
  return {
    notificationsEnabled: row.notifications_enabled,
    liveActivitiesEnabled: row.live_activities_enabled,
    themeMode: row.theme_mode as ThemeMode,
    soundEnabled: row.sound_enabled,
    badgesEnabled: row.badges_enabled,
    alertStyle: row.alert_style as AlertStyle,
    language: row.language as Language,
    // Not in the Supabase schema yet — these stay device-local for now.
    calendarDensity: (row.calendar_density as CalendarDensity) ?? 'compact',
    fontScale: (row.font_scale as FontScale) ?? 1,
    recapEnabled: row.recap_enabled ?? true,
    recapHour: row.recap_hour ?? 8,
  };
}

function profileToRow(patch: Partial<Profile>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
  return row;
}

function rowToProfile(row: Record<string, any>): Profile {
  return { name: row.name, avatarColor: row.avatar_color };
}

function warn(label: string, error: unknown) {
  if (error) console.warn(`[sync] ${label} failed`, error);
}

// ---------------------------------------------------------------------------
// initial sync: runs once right after a session appears
// ---------------------------------------------------------------------------

/**
 * First login on an account with no cloud data yet: adopt whatever's on this device as the
 * account's starting state. Any later login (this device or another): the account's cloud data
 * wins and replaces local state. This is a deliberately simple "first write wins" strategy —
 * no merge UI, no conflict resolution.
 */
export async function performInitialSync(userId: string) {
  let [plansRes, groupsRes, profileRes, settingsRes] = await Promise.all([
    supabase.from('plans').select('*').eq('user_id', userId),
    supabase.from('groups').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  // A token minted moments ago (fresh sign-in) can momentarily fail validation with "JWT issued
  // at future" before it settles server-side — harmless, self-resolving; retry once after a beat.
  const isClockSkew = (err: { code?: string } | null) => err?.code === 'PGRST303';
  if (isClockSkew(plansRes.error) || isClockSkew(groupsRes.error)) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    [plansRes, groupsRes, profileRes, settingsRes] = await Promise.all([
      supabase.from('plans').select('*').eq('user_id', userId),
      supabase.from('groups').select('*').eq('user_id', userId),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);
  }

  if (plansRes.error || groupsRes.error) {
    warn('initial fetch', plansRes.error ?? groupsRes.error);
    return;
  }

  const cloudPlans = (plansRes.data ?? []).map(rowToPlan);
  const cloudGroups = (groupsRes.data ?? []).map(rowToGroup);
  const local = usePlannerStore.getState();

  if (cloudPlans.length === 0 && cloudGroups.length === 0) {
    if (local.plans.length > 0) {
      const { error } = await supabase.from('plans').upsert(local.plans.map((p) => planToRow(p, userId)));
      warn('push local plans', error);
    }
    if (local.groups.length > 0) {
      const { error } = await supabase.from('groups').upsert(local.groups.map((g) => groupToRow(g, userId)));
      warn('push local groups', error);
    }
    const { error: profileErr } = await supabase.from('profiles').update(profileToRow(local.profile)).eq('id', userId);
    warn('push local profile', profileErr);
    const { error: settingsErr } = await supabase.from('settings').update(settingsToRow(local.settings)).eq('user_id', userId);
    warn('push local settings', settingsErr);
  } else {
    usePlannerStore.setState({
      plans: cloudPlans,
      groups: cloudGroups,
      ...(profileRes.data ? { profile: rowToProfile(profileRes.data) } : {}),
      ...(settingsRes.data ? { settings: rowToSettings(settingsRes.data) } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// per-mutation write-through — called after each local store change while signed in
// ---------------------------------------------------------------------------

export function syncUpsertPlan(plan: Plan) {
  const userId = currentUserId();
  if (!userId) return;
  supabase
    .from('plans')
    .upsert(planToRow(plan, userId))
    .then(({ error }) => warn('upsert plan', error));
}

export function syncUpsertPlans(plans: Plan[]) {
  const userId = currentUserId();
  if (!userId || plans.length === 0) return;
  supabase
    .from('plans')
    .upsert(plans.map((p) => planToRow(p, userId)))
    .then(({ error }) => warn('upsert plans', error));
}

export function syncDeletePlan(id: string) {
  if (!currentUserId()) return;
  supabase
    .from('plans')
    .delete()
    .eq('id', id)
    .then(({ error }) => warn('delete plan', error));
}

export function syncDeletePlans(ids: string[]) {
  if (!currentUserId() || ids.length === 0) return;
  supabase
    .from('plans')
    .delete()
    .in('id', ids)
    .then(({ error }) => warn('delete plans', error));
}

export function syncUpsertGroup(group: Group) {
  const userId = currentUserId();
  if (!userId) return;
  supabase
    .from('groups')
    .upsert(groupToRow(group, userId))
    .then(({ error }) => warn('upsert group', error));
}

export function syncClearAll() {
  const userId = currentUserId();
  if (!userId) return;
  Promise.all([supabase.from('plans').delete().eq('user_id', userId), supabase.from('groups').delete().eq('user_id', userId)]).then(
    ([plansRes, groupsRes]) => {
      warn('clear plans', plansRes.error);
      warn('clear groups', groupsRes.error);
    }
  );
}

export function syncUpdateSettings(patch: Partial<Settings>) {
  const userId = currentUserId();
  const row = settingsToRow(patch);
  if (!userId || Object.keys(row).length === 0) return;
  supabase
    .from('settings')
    .update(row)
    .eq('user_id', userId)
    .then(({ error }) => warn('update settings', error));
}

export function syncUpdateProfile(patch: Partial<Profile>) {
  const userId = currentUserId();
  const row = profileToRow(patch);
  if (!userId || Object.keys(row).length === 0) return;
  supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .then(({ error }) => warn('update profile', error));
}
