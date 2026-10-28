import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceLanguage } from '@/i18n';

import type { Group, Plan, Profile, Settings, SubscriptionDetails, SubscriptionState } from './types';
import { syncClearAll, syncDeletePlan, syncDeletePlans, syncUpdateProfile, syncUpdateSettings, syncUpsertGroup, syncUpsertPlan, syncUpsertPlans } from '@/lib/sync';
import { findFuturePlans, findPastPlans } from '@/utils/countdown';
import { pad, timeToMinutes, toISO } from '@/utils/dates';
import { seriesFrom } from '@/utils/repeat-scope';

/**
 * A real UUID (not the old 'p_'-prefixed random string) so ids generated offline are already
 * valid primary keys for the `plans`/`groups` uuid columns in Supabase — no id remapping needed
 * when a locally-created row gets synced up.
 */
export const uid = () => Crypto.randomUUID();

/** Once a date has any manually-ordered plan, new plans for that date append to the end of that order. */
function nextOrderForDate(plans: Plan[], date: string): number | undefined {
  const dayOrders = plans.filter((p) => p.date === date && p.order !== undefined).map((p) => p.order as number);
  return dayOrders.length === 0 ? undefined : Math.max(...dayOrders) + 1;
}

const SEED_PROFILE: Profile = { name: 'Alex Kim', avatarColor: '#5B5FEF' };

const SEED_SETTINGS: Settings = {
  notificationsEnabled: true,
  liveActivitiesEnabled: true,
  themeMode: 'system',
  soundEnabled: true,
  badgesEnabled: true,
  alertStyle: 'banners',
  language: deviceLanguage(),
  fontScale: 1,
  recapEnabled: true,
  recapHour: 8,
};

interface PlannerState {
  plans: Plan[];
  groups: Group[];
  profile: Profile;
  settings: Settings;
  /** The plans removed by the last delete, for Undo (only those plans, so Undo can't roll back anything else). */
  lastDeletedSnapshot: Plan[] | null;
  /** Home's Groups filter: a plan shows when it's in any of these. Empty = every group. */
  filterGroupIds: string[];
  filterColors: string[];
  selectMode: boolean;
  selectedIds: string[];
  pendingSaveToast: string | null;
  /** ISO date this device first used the app — bounds how far back guest-mode Progress can navigate. */
  firstUsedAt: string | null;
  ensureFirstUsedAt: () => void;
  /**
   * The user's entitlement. Refreshed from StoreKit at launch and on every return to the
   * foreground (`useSubscriptionSync`), so it drops back to 'free' once a subscription lapses.
   * Still device-local and not server-verified.
   */
  mockSubscriptionState: SubscriptionState;
  setMockSubscriptionState: (state: SubscriptionState) => void;
  /** Dates/plan behind `mockSubscriptionState`, from the same StoreKit refresh. Null on Free. */
  subscriptionDetails: SubscriptionDetails | null;
  setSubscriptionDetails: (details: SubscriptionDetails | null) => void;
  /** Set from Profile > Testing > Subscription State: StoreKit refreshes leave the state alone. */
  subscriptionTestOverride: boolean;
  setSubscriptionTestOverride: (on: boolean) => void;
  /** When Profile's upgrade banner was last dismissed (epoch ms) — it stays hidden for 7 days. */
  upgradeBannerDismissedAt: number | null;
  dismissUpgradeBanner: () => void;
  /** Home's one-time "swipe to delete · hold and drag to reorder" tip has been closed or acted on (this device only). */
  homeGestureHintSeen: boolean;
  dismissHomeGestureHint: () => void;
  setPendingSaveToast: (message: string | null) => void;
  /**
   * A group the Create Group screen picked or created for the New/Edit Plan form underneath it.
   * The form reads and clears it on focus — handing it over this way (instead of a route param)
   * leaves the form mounted, so everything already typed into it survives the round trip.
   */
  pendingGroupPick: string | null;
  setPendingGroupPick: (groupId: string | null) => void;
  addPlan: (plan: Omit<Plan, 'id' | 'completed'>) => void;
  addPlans: (plans: Omit<Plan, 'id' | 'completed'>[]) => void;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  toggleComplete: (id: string) => void;
  deletePlan: (id: string) => void;
  /** Deletes `id` and every later occurrence of its repeating series (iOS Calendar's "Delete All Future Events"). */
  deletePlanSeries: (id: string) => void;
  /**
   * Applies an edit to `id` and every later occurrence of its series. Each occurrence keeps its own
   * day and completion; a moved date or time shifts them all by the same amount.
   */
  updatePlanSeries: (id: string, patch: Partial<Plan>) => void;
  duplicatePlan: (id: string) => void;
  undoDelete: () => void;
  /** Drops the Undo option once its toast times out. */
  clearDeletedSnapshot: () => void;
  reorderPlans: (date: string, orderedVisibleIds: string[]) => void;
  addGroup: (group: Omit<Group, 'id'>) => Group;
  setProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleFilterGroup: (groupId: string) => void;
  clearFilterGroups: () => void;
  addFilterGroup: (groupId: string) => void;
  toggleFilterColor: (color: string) => void;
  clearFilterColors: () => void;
  resetData: () => void;
  setSelectMode: (on: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  /** Deletes the selected plans; `withFuture` also takes the later occurrences of any repeating ones. */
  deleteSelected: (withFuture?: boolean) => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      plans: [],
      groups: [],
      profile: SEED_PROFILE,
      settings: SEED_SETTINGS,
      lastDeletedSnapshot: null,
      filterGroupIds: [],
      filterColors: [],
      selectMode: false,
      selectedIds: [],
      pendingSaveToast: null,
      pendingGroupPick: null,
      firstUsedAt: null,
      mockSubscriptionState: 'free',
      subscriptionDetails: null,
      subscriptionTestOverride: false,
      upgradeBannerDismissedAt: null,
      homeGestureHintSeen: false,

      ensureFirstUsedAt: () => {
        if (!get().firstUsedAt) set({ firstUsedAt: toISO(new Date()) });
      },

      setMockSubscriptionState: (state) => set({ mockSubscriptionState: state }),

      setSubscriptionDetails: (details) => set({ subscriptionDetails: details }),

      setSubscriptionTestOverride: (on) => set({ subscriptionTestOverride: on }),

      dismissUpgradeBanner: () => set({ upgradeBannerDismissedAt: Date.now() }),

      dismissHomeGestureHint: () => set({ homeGestureHintSeen: true }),

      setPendingSaveToast: (message) => set({ pendingSaveToast: message }),

      setPendingGroupPick: (groupId) => set({ pendingGroupPick: groupId }),

      addPlan: (plan) => {
        const order = nextOrderForDate(get().plans, plan.date);
        const newPlan: Plan = { ...plan, id: uid(), completed: false, ...(order !== undefined ? { order } : {}) };
        set((state) => ({ plans: [...state.plans, newPlan] }));
        syncUpsertPlan(newPlan);
      },

      addPlans: (newPlans) => {
        const added: Plan[] = [];
        for (const plan of newPlans) {
          const order = nextOrderForDate([...get().plans, ...added], plan.date);
          added.push({ ...plan, id: uid(), completed: false, ...(order !== undefined ? { order } : {}) });
        }
        set((state) => ({ plans: [...state.plans, ...added] }));
        syncUpsertPlans(added);
      },

      updatePlan: (id, patch) => {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        const updated = get().plans.find((p) => p.id === id);
        if (updated) syncUpsertPlan(updated);
      },

      toggleComplete: (id) => {
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, completed: !p.completed, completedAt: p.completed ? undefined : Date.now() } : p)),
        }));
        const updated = get().plans.find((p) => p.id === id);
        if (updated) syncUpsertPlan(updated);
      },

      deletePlan: (id) => {
        const { plans } = get();
        set({ lastDeletedSnapshot: plans.filter((p) => p.id === id), plans: plans.filter((p) => p.id !== id) });
        syncDeletePlan(id);
      },

      deletePlanSeries: (id) => {
        const { plans } = get();
        const plan = plans.find((p) => p.id === id);
        if (!plan) return;
        const removed = seriesFrom(plans, plan);
        const ids = new Set(removed.map((p) => p.id));
        set({ lastDeletedSnapshot: removed, plans: plans.filter((p) => !ids.has(p.id)) });
        syncDeletePlans([...ids]);
      },

      updatePlanSeries: (id, patch) => {
        const { plans } = get();
        const plan = plans.find((p) => p.id === id);
        if (!plan) return;
        const { date: newDate = plan.date, time: newTime = plan.time, ...rest } = patch;
        const startMs = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();
        const shiftMs = startMs(newDate, newTime) - startMs(plan.date, plan.time);
        // The edited plan's length, so every occurrence ends the same time after it starts (capped at 23:59).
        const length = 'endTime' in patch ? (patch.endTime ? timeToMinutes(patch.endTime) - timeToMinutes(newTime) : null) : undefined;
        const ids = new Set(seriesFrom(plans, plan).map((p) => p.id));
        const updated: Plan[] = [];
        const next = plans.map((p) => {
          if (!ids.has(p.id)) return p;
          const at = new Date(startMs(p.date, p.time) + shiftMs);
          const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
          const endMins = length == null ? null : Math.min(23 * 60 + 59, timeToMinutes(time) + length);
          const endTime = length === undefined ? p.endTime : endMins === null ? undefined : `${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`;
          const u = { ...p, ...rest, date: toISO(at), time, endTime };
          updated.push(u);
          return u;
        });
        set({ plans: next });
        syncUpsertPlans(updated);
      },

      duplicatePlan: (id) => {
        const original = get().plans.find((p) => p.id === id);
        if (!original) return;
        const { order: _order, repeatId: _repeatId, ...rest } = original;
        const newOrder = nextOrderForDate(get().plans, original.date);
        const copy: Plan = {
          ...rest,
          id: uid(),
          completed: false,
          repeatType: 'none',
          ...(newOrder !== undefined ? { order: newOrder } : {}),
        };
        set((state) => ({ plans: [...state.plans, copy] }));
        syncUpsertPlan(copy);
      },

      undoDelete: () => {
        const { lastDeletedSnapshot } = get();
        if (lastDeletedSnapshot) {
          // Put back just the deleted plans; whatever was added or changed since stays as it is.
          set((state) => {
            const present = new Set(state.plans.map((p) => p.id));
            return { plans: [...state.plans, ...lastDeletedSnapshot.filter((p) => !present.has(p.id))], lastDeletedSnapshot: null };
          });
          syncUpsertPlans(lastDeletedSnapshot);
        }
      },

      clearDeletedSnapshot: () => set({ lastDeletedSnapshot: null }),

      reorderPlans: (date, orderedVisibleIds) => {
        set((state) => {
          const dayPlans = state.plans.filter((p) => p.date === date);
          const visibleSet = new Set(orderedVisibleIds);
          const hidden = dayPlans
            .filter((p) => !visibleSet.has(p.id))
            .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.time.localeCompare(b.time));
          const finalOrder = [...orderedVisibleIds, ...hidden.map((p) => p.id)];
          const orderMap = new Map(finalOrder.map((id, i) => [id, i]));
          return {
            plans: state.plans.map((p) => (p.date === date && orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id) } : p)),
          };
        });
        syncUpsertPlans(get().plans.filter((p) => p.date === date));
      },

      addGroup: (group) => {
        const newGroup: Group = { ...group, id: uid() };
        set((state) => ({ groups: [...state.groups, newGroup] }));
        syncUpsertGroup(newGroup);
        return newGroup;
      },

      setProfile: (patch) => {
        set((state) => ({ profile: { ...state.profile, ...patch } }));
        syncUpdateProfile(patch);
      },

      updateSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
        syncUpdateSettings(patch);
      },

      toggleFilterGroup: (groupId) =>
        set((state) => ({
          filterGroupIds: state.filterGroupIds.includes(groupId)
            ? state.filterGroupIds.filter((id) => id !== groupId)
            : [...state.filterGroupIds, groupId],
        })),
      clearFilterGroups: () => set({ filterGroupIds: [] }),
      addFilterGroup: (groupId) =>
        set((state) => (state.filterGroupIds.includes(groupId) ? state : { filterGroupIds: [...state.filterGroupIds, groupId] })),
      toggleFilterColor: (color) =>
        set((state) => ({
          filterColors: state.filterColors.includes(color)
            ? state.filterColors.filter((c) => c !== color)
            : [...state.filterColors, color],
        })),
      clearFilterColors: () => set({ filterColors: [] }),

      resetData: () => {
        set({
          plans: [],
          groups: [],
          lastDeletedSnapshot: null,
          filterGroupIds: [],
          filterColors: [],
          selectMode: false,
          selectedIds: [],
        });
        syncClearAll();
      },

      setSelectMode: (on) => set({ selectMode: on, selectedIds: [] }),

      toggleSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        })),

      selectAll: () => {
        const { plans, filterGroupIds, filterColors, selectedIds } = get();
        const todayISO = toISO(new Date());
        const matchesFilter = (p: Plan) =>
          (filterGroupIds.length === 0 || (!!p.groupId && filterGroupIds.includes(p.groupId))) && (filterColors.length === 0 || filterColors.includes(p.color));
        const todayIds = plans.filter((p) => p.date === todayISO && matchesFilter(p)).map((p) => p.id);
        const pastIds = findPastPlans(plans).filter(matchesFilter).map((p) => p.id);
        const futureIds = findFuturePlans(plans).filter(matchesFilter).map((p) => p.id);
        const allIds = [...todayIds, ...pastIds, ...futureIds];
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
        set({ selectedIds: allSelected ? [] : allIds });
      },

      deleteSelected: (withFuture = false) => {
        const { plans, selectedIds } = get();
        const idSet = new Set(selectedIds);
        if (withFuture) {
          for (const p of plans) if (idSet.has(p.id)) for (const s of seriesFrom(plans, p)) idSet.add(s.id);
        }
        set({
          lastDeletedSnapshot: plans.filter((p) => idSet.has(p.id)),
          plans: plans.filter((p) => !idSet.has(p.id)),
          selectedIds: [],
          selectMode: false,
        });
        syncDeletePlans([...idSet]);
      },
    }),
    {
      name: 'routine-planner-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        plans: state.plans,
        groups: state.groups,
        profile: state.profile,
        settings: state.settings,
        firstUsedAt: state.firstUsedAt,
        mockSubscriptionState: state.mockSubscriptionState,
        subscriptionDetails: state.subscriptionDetails,
        subscriptionTestOverride: state.subscriptionTestOverride,
        upgradeBannerDismissedAt: state.upgradeBannerDismissedAt,
        homeGestureHintSeen: state.homeGestureHintSeen,
      }),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as {
          plans?: (Plan & { alert?: string; photoUri?: string })[];
          settings?: Partial<Settings>;
        };
        if (state?.plans) {
          state.plans = state.plans.map((p) => ({
            ...p,
            alerts: p.alerts ?? (p.alert && p.alert !== 'none' ? [p.alert] : []),
            photoUris: p.photoUris ?? (p.photoUri ? [p.photoUri] : []),
          }));
        }
        if (state?.settings) {
          state.settings = { ...SEED_SETTINGS, ...state.settings };
        }
        return state;
      },
    }
  )
);
