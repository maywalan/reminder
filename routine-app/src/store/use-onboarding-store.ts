import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  /** True once the user has exited the onboarding carousel (finished step 3, or hit Skip on any step). */
  hasCompletedOnboarding: boolean;
  /** True once the user has ever tapped "Keep using without an account" on the sign-in screen. */
  hasChosenGuest: boolean;
  completeOnboarding: () => void;
  chooseGuest: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasChosenGuest: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      chooseGuest: () => set({ hasChosenGuest: true }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
