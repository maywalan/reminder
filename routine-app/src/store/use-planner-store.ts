import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Group, Plan, Profile, Settings } from './types';
import { findPastLivePlans } from '@/utils/countdown';
import { toISO } from '@/utils/dates';

export const uid = () => 'p_' + Math.random().toString(36).slice(2, 10);

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
  selectMode: boolean;
  selectedIds: string[];
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
  resetData: () => void;
  setSelectMode: (on: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAllToday: () => void;
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
      selectMode: false,
      selectedIds: [],

      addPlan: (plan) =>
        set((state) => {
          const order = nextOrderForDate(state.plans, plan.date);
          return {
            plans: [...state.plans, { ...plan, id: uid(), completed: false, ...(order !== undefined ? { order } : {}) }],
          };
        }),

      addPlans: (newPlans) =>
        set((state) => {
          const added = newPlans.map((plan) => {
            const order = nextOrderForDate(state.plans, plan.date);
            return { ...plan, id: uid(), completed: false, ...(order !== undefined ? { order } : {}) };
          });
          return { plans: [...state.plans, ...added] };
        }),

      updatePlan: (id, patch) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      toggleComplete: (id) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)),
        })),

      deletePlan: (id) => {
        const { plans } = get();
        set({ lastDeletedSnapshot: plans, plans: plans.filter((p) => p.id !== id) });
      },

      duplicatePlan: (id) =>
        set((state) => {
          const original = state.plans.find((p) => p.id === id);
          if (!original) return state;
          const { order: _order, repeatId: _repeatId, ...rest } = original;
          const newOrder = nextOrderForDate(state.plans, original.date);
          const copy: Plan = {
            ...rest,
            id: uid(),
            completed: false,
            repeatType: 'none',
            ...(newOrder !== undefined ? { order: newOrder } : {}),
          };
          return { plans: [...state.plans, copy] };
        }),

      undoDelete: () => {
        const { lastDeletedSnapshot } = get();
        if (lastDeletedSnapshot) set({ plans: lastDeletedSnapshot, lastDeletedSnapshot: null });
      },

      reorderPlans: (date, orderedVisibleIds) =>
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
        }),

      addGroup: (group) => {
        const newGroup: Group = { ...group, id: uid() };
        set((state) => ({ groups: [...state.groups, newGroup] }));
        return newGroup;
      },

      setProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      setFilterGroupId: (groupId) => set({ filterGroupId: groupId }),

      resetData: () =>
        set({ plans: [], groups: [], lastDeletedSnapshot: null, filterGroupId: null, selectMode: false, selectedIds: [] }),

      setSelectMode: (on) => set({ selectMode: on, selectedIds: [] }),

      toggleSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        })),

      selectAllToday: () => {
        const { plans, filterGroupId, selectedIds } = get();
        const todayISO = toISO(new Date());
        const todayIds = plans
          .filter((p) => p.date === todayISO && (!filterGroupId || p.groupId === filterGroupId))
          .map((p) => p.id);
        const pastIds = findPastLivePlans(plans).map((p) => p.id);
        const allIds = [...todayIds, ...pastIds];
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
      },
    }),
    {
      name: 'routine-planner-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ plans: state.plans, groups: state.groups, profile: state.profile, settings: state.settings }),
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
