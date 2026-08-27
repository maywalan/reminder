import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Group, Plan, Profile, Settings } from './types';
import { syncClearAll, syncDeletePlan, syncDeletePlans, syncUpdateProfile, syncUpdateSettings, syncUpsertGroup, syncUpsertPlan, syncUpsertPlans } from '@/lib/sync';
import { findFuturePlans, findPastPlans } from '@/utils/countdown';
import { toISO } from '@/utils/dates';

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
  language: 'en',
};

interface PlannerState {
  plans: Plan[];
  groups: Group[];
  profile: Profile;
  settings: Settings;
  lastDeletedSnapshot: Plan[] | null;
  filterGroupId: string | null;
  filterColor: string | null;
  selectMode: boolean;
  selectedIds: string[];
  pendingSaveToast: string | null;
  /** ISO date this device first used the app — bounds how far back guest-mode Progress can navigate. */
  firstUsedAt: string | null;
  ensureFirstUsedAt: () => void;
  setPendingSaveToast: (message: string | null) => void;
  addPlan: (plan: Omit<Plan, 'id' | 'completed'>) => void;
  addPlans: (plans: Omit<Plan, 'id' | 'completed'>[]) => void;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  toggleComplete: (id: string) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string) => void;
  undoDelete: () => void;
  reorderPlans: (date: string, orderedVisibleIds: string[]) => void;
  addGroup: (group: Omit<Group, 'id'>) => Group;
  setProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setFilterGroupId: (groupId: string | null) => void;
  setFilterColor: (color: string | null) => void;
  resetData: () => void;
  setSelectMode: (on: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deleteSelected: () => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      plans: [],
      groups: [],
      profile: SEED_PROFILE,
      settings: SEED_SETTINGS,
      lastDeletedSnapshot: null,
      filterGroupId: null,
      filterColor: null,
      selectMode: false,
      selectedIds: [],
      pendingSaveToast: null,
      firstUsedAt: null,

      ensureFirstUsedAt: () => {
        if (!get().firstUsedAt) set({ firstUsedAt: toISO(new Date()) });
      },

      setPendingSaveToast: (message) => set({ pendingSaveToast: message }),

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
          plans: state.plans.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)),
        }));
        const updated = get().plans.find((p) => p.id === id);
        if (updated) syncUpsertPlan(updated);
      },

      deletePlan: (id) => {
        const { plans } = get();
        set({ lastDeletedSnapshot: plans, plans: plans.filter((p) => p.id !== id) });
        syncDeletePlan(id);
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
          set({ plans: lastDeletedSnapshot, lastDeletedSnapshot: null });
          syncUpsertPlans(lastDeletedSnapshot);
        }
      },

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

      setFilterGroupId: (groupId) => set({ filterGroupId: groupId }),
      setFilterColor: (color) => set({ filterColor: color }),

      resetData: () => {
        set({
          plans: [],
          groups: [],
          lastDeletedSnapshot: null,
          filterGroupId: null,
          filterColor: null,
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
        const { plans, filterGroupId, filterColor, selectedIds } = get();
        const todayISO = toISO(new Date());
        const matchesFilter = (p: Plan) => (!filterGroupId || p.groupId === filterGroupId) && (!filterColor || p.color === filterColor);
        const todayIds = plans.filter((p) => p.date === todayISO && matchesFilter(p)).map((p) => p.id);
        const pastIds = findPastPlans(plans).filter(matchesFilter).map((p) => p.id);
        const futureIds = findFuturePlans(plans).filter(matchesFilter).map((p) => p.id);
        const allIds = [...todayIds, ...pastIds, ...futureIds];
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
        set({ selectedIds: allSelected ? [] : allIds });
      },

      deleteSelected: () => {
        const { plans, selectedIds } = get();
        const idSet = new Set(selectedIds);
        set({
          lastDeletedSnapshot: plans,
          plans: plans.filter((p) => !idSet.has(p.id)),
          selectedIds: [],
          selectMode: false,
        });
        syncDeletePlans(selectedIds);
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
      }),
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { plans?: (Plan & { alert?: string; photoUri?: string })[] };
        if (state?.plans) {
          state.plans = state.plans.map((p) => ({
            ...p,
            alerts: p.alerts ?? (p.alert && p.alert !== 'none' ? [p.alert] : []),
            photoUris: p.photoUris ?? (p.photoUri ? [p.photoUri] : []),
          }));
        }
        return state;
      },
    }
  )
);
