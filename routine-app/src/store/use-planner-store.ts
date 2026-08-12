import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pad, toISO } from '@/utils/dates';
import type { Group, Plan, Profile, Settings } from './types';

export const uid = () => 'p_' + Math.random().toString(36).slice(2, 10);

function seedPlans(): Plan[] {
  const now = new Date();
  const today = toISO(now);
  const soon = new Date(now.getTime() + 4 * 60000);
  const soonTime = `${pad(soon.getHours())}:${pad(soon.getMinutes())}`;

  const relative = (days: number, name: string, time: string, color: string, groupId: string): Plan => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return {
      id: uid(),
      name,
      date: toISO(d),
      time,
      alert: '5',
      live: false,
      completed: false,
      color,
      groupId,
      repeatType: 'none',
    };
  };

  return [
    {
      id: uid(),
      name: 'Team Standup',
      date: today,
      time: soonTime,
      alert: '5',
      live: true,
      completed: false,
      color: '#5B5FEF',
      groupId: 'work',
      repeatType: 'none',
    },
    { ...relative(0, 'Morning Run', '07:00', '#2FB463', 'health'), completed: true },
    relative(0, 'Deep Work Block', '10:30', '#5B5FEF', 'work'),
    relative(0, 'Lunch with Sam', '12:30', '#FF6482', 'personal'),
    relative(0, 'Gym', '18:00', '#2FB463', 'health'),
    relative(1, 'Dentist Appointment', '10:00', '#2FB463', 'health'),
    relative(2, 'Grocery Run', '17:30', '#FF9F43', 'errands'),
    relative(3, 'Project Review', '14:00', '#5B5FEF', 'work'),
  ];
}

const SEED_GROUPS: Group[] = [
  { id: 'work', name: 'Work', color: '#5B5FEF' },
  { id: 'personal', name: 'Personal', color: '#FF6482' },
  { id: 'health', name: 'Health', color: '#2FB463' },
  { id: 'errands', name: 'Errands', color: '#FF9F43' },
];

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
  addPlan: (plan: Omit<Plan, 'id' | 'completed'>) => void;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  toggleComplete: (id: string) => void;
  deletePlan: (id: string) => void;
  bulkDeletePlans: (ids: string[]) => void;
  undoDelete: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setFilterGroupId: (groupId: string | null) => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      plans: seedPlans(),
      groups: SEED_GROUPS,
      profile: SEED_PROFILE,
      settings: SEED_SETTINGS,
      lastDeletedSnapshot: null,
      filterGroupId: null,

      addPlan: (plan) =>
        set((state) => ({
          plans: [...state.plans, { ...plan, id: uid(), completed: false }],
        })),

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

      bulkDeletePlans: (ids) => {
        const { plans } = get();
        const idSet = new Set(ids);
        set({ lastDeletedSnapshot: plans, plans: plans.filter((p) => !idSet.has(p.id)) });
      },

      undoDelete: () => {
        const { lastDeletedSnapshot } = get();
        if (lastDeletedSnapshot) set({ plans: lastDeletedSnapshot, lastDeletedSnapshot: null });
      },

      setProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      setFilterGroupId: (groupId) => set({ filterGroupId: groupId }),
    }),
    {
      name: 'routine-planner-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ plans: state.plans, groups: state.groups, profile: state.profile, settings: state.settings }),
    }
  )
);
