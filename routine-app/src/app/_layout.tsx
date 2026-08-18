import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useEffectiveScheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

const NAV_THEME_LIGHT = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.light.bg } };
const NAV_THEME_DARK = { ...DarkTheme, colors: { ...DarkTheme.colors, background: Colors.dark.bg } };

export default function RootLayout() {
  const effectiveScheme = useEffectiveScheme();
  const theme = Colors[effectiveScheme];
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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={effectiveScheme === 'dark' ? NAV_THEME_DARK : NAV_THEME_LIGHT}>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-plan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
