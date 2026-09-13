import { Anuphan_500Medium, Anuphan_600SemiBold, Anuphan_700Bold } from '@expo-google-fonts/anuphan';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TickleSplash } from '@/components/onboarding/tickle-splash';
import { Colors, setFontScale } from '@/constants/theme';
import { useEffectiveScheme } from '@/hooks/use-theme';
import { useNotificationsSync } from '@/hooks/use-notifications-sync';
import { useAuthStore } from '@/store/use-auth-store';
import { useOnboardingStore } from '@/store/use-onboarding-store';
import { usePlannerStore } from '@/store/use-planner-store';

SplashScreen.preventAutoHideAsync();

/** The branded splash's minimum on-screen time — matches the design's "1.2s max" progress bar. */
const SPLASH_MIN_DURATION_MS = 1200;

function useHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }) {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());
  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);
  return hydrated;
}

const NAV_THEME_LIGHT = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.light.bg } };
const NAV_THEME_DARK = { ...DarkTheme, colors: { ...DarkTheme.colors, background: Colors.dark.bg } };

export default function RootLayout() {
  const effectiveScheme = useEffectiveScheme();
  const theme = Colors[effectiveScheme];
  const fontScale = usePlannerStore((s) => s.settings.fontScale);
  // Typography reads this module-level scale synchronously — set it before children render so
  // first paint after a settings change is already correct, not just the one after.
  setFontScale(fontScale);
  const [fontsLoaded] = useFonts({
    Anuphan_500Medium,
    Anuphan_600SemiBold,
    Anuphan_700Bold,
  });

  const authInitializing = useAuthStore((s) => s.initializing);
  const hasSession = useAuthStore((s) => !!s.session);
  const plannerHydrated = useHydrated(usePlannerStore);
  const onboardingHydrated = useHydrated(useOnboardingStore);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasChosenGuest = useOnboardingStore((s) => s.hasChosenGuest);

  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const migratedExistingInstall = useRef(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Devices that already used the app before onboarding existed must never be dropped into the
  // carousel or an unexpected login gate — back-date them to "already decided" the first time we
  // can see both stores' real persisted values. Must read firstUsedAt (and decide) before
  // ensureFirstUsedAt() below can stamp it, or a brand-new install looks indistinguishable from
  // an existing one by the time this runs.
  useEffect(() => {
    if (migratedExistingInstall.current || !plannerHydrated || !onboardingHydrated) return;
    migratedExistingInstall.current = true;
    const onboarding = useOnboardingStore.getState();
    const planner = usePlannerStore.getState();
    const wasExistingInstall = !onboarding.hasCompletedOnboarding && !!planner.firstUsedAt;
    planner.ensureFirstUsedAt();
    if (wasExistingInstall) {
      onboarding.completeOnboarding();
      onboarding.chooseGuest();
    }
  }, [plannerHydrated, onboardingHydrated]);

  useNotificationsSync();

  const ready = fontsLoaded && !authInitializing && plannerHydrated && onboardingHydrated && minDurationElapsed;

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={effectiveScheme === 'dark' ? NAV_THEME_DARK : NAV_THEME_LIGHT}>
          <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
          <TickleSplash durationMs={SPLASH_MIN_DURATION_MS} />
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  const canEnterApp = hasCompletedOnboarding && (hasSession || hasChosenGuest);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={effectiveScheme === 'dark' ? NAV_THEME_DARK : NAV_THEME_LIGHT}>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
        <Stack key={fontScale} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Protected guard={!hasCompletedOnboarding}>
            <Stack.Screen name="onboarding-1" />
            <Stack.Screen name="onboarding-2" />
            <Stack.Screen name="onboarding-3" />
          </Stack.Protected>
          <Stack.Protected guard={canEnterApp}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          {/* Falls back to the app's initial route whenever neither group above is guarded in —
              onboarded, no session, never chose guest. Always reachable directly too (Profile's
              Log In row, or a push from onboarding step 3). */}
          <Stack.Screen name="login" />
          <Stack.Screen name="add-plan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
