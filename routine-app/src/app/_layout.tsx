import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, setFontScale } from '@/constants/theme';
import { useEffectiveScheme } from '@/hooks/use-theme';
import { useNotificationsSync } from '@/hooks/use-notifications-sync';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';

SplashScreen.preventAutoHideAsync();

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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    useAuthStore.getState().initialize();
    usePlannerStore.getState().ensureFirstUsedAt();
  }, []);

  useNotificationsSync();

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={effectiveScheme === 'dark' ? NAV_THEME_DARK : NAV_THEME_LIGHT}>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
        <Stack key={fontScale} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-plan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
