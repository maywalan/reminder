import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Tickle } from '@/components/tickle';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TickleSplashProps {
  /** How long the progress bar takes to fill — matches the app's own bootstrap gate duration. */
  durationMs: number;
}

/**
 * The branded loading gate shown while fonts/auth/onboarding state resolve (design_handoff_
 * tickle_draft2, section 01, "01 · Splash"). Doubles as the first screen of a new user's
 * onboarding sequence and the loading moment for everyone else — see _layout.tsx.
 */
export function TickleSplash({ durationMs }: TickleSplashProps) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: false }).start();
  }, [durationMs, progress]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.screen, { backgroundColor: theme.surface }]}>
      <View style={styles.center}>
        <Tickle size={132} mood="idle" animated />
        <View style={styles.wordmark}>
          <Text style={[styles.title, { color: theme.text }]}>Tickle</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>a friendly nudge, on time</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: theme.accent }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 26 },
  wordmark: { alignItems: 'center' },
  title: { fontFamily: Fonts[700], fontWeight: '700', fontSize: 28, letterSpacing: -0.6 },
  subtitle: { fontFamily: Fonts[500], fontWeight: '500', fontSize: 13, marginTop: 5 },
  progressRow: { position: 'absolute', bottom: 60, alignItems: 'center' },
  track: { width: 120, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
});
