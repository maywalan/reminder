import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBreathe, useBurst, useDrift, useHop, usePulse, useSink, useSquash } from '@/utils/motion';

interface Props {
  streak: number;
  longest: number;
}

type Pose = 'growing' | 'record' | 'paused';

const AMBER = '#F0A32E';
const GREEN = '#4FC98A';

/**
 * The streak card's Tickle (design_handoff_tickle_draft2's 15a, section 03) — a bespoke 48pt
 * construction rather than the shared `Tickle` component: the "paused" pose needs closed
 * eye-slits and the "record" pose needs two extra spark particles, neither of which the
 * parametric component's mood system covers (same reasoning as live-activity-card's
 * `MiniLiveTickle`).
 */
function StreakTickle({ pose }: { pose: Pose }) {
  const breathe = useBreathe(pose === 'growing');
  const sink = useSink(pose === 'paused');
  const squash = useSquash(pose === 'record');
  const bodyStyle = pose === 'growing' ? breathe : pose === 'paused' ? sink : squash;

  const hop = useHop(pose === 'growing');
  const drift = useDrift(pose === 'paused');
  const pulse = usePulse(pose === 'record');
  const bubbleStyle = pose === 'growing' ? hop : pose === 'paused' ? drift : pulse;

  const burst1 = useBurst();
  const burst2 = useBurst();
  useEffect(() => {
    if (pose !== 'record') return;
    burst1.fire();
    const t1 = setInterval(() => burst1.fire(), 1900);
    const startT2 = setTimeout(() => burst2.fire(), 300);
    const t2 = setInterval(() => burst2.fire(), 1900);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearTimeout(startT2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose]);

  return (
    <View style={styles.tickle}>
      <Animated.View style={[styles.body, bodyStyle]}>
        <LinearGradient colors={['#E3F0FE', '#B9D8FA']} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {pose === 'paused' ? (
        <>
          <View style={[styles.eyeClosed, { left: 14, top: 28 }]} />
          <View style={[styles.eyeClosed, { left: 26, top: 28 }]} />
        </>
      ) : (
        <>
          <View style={[styles.eyeOpen, { left: 14, top: 27 }]} />
          <View style={[styles.eyeOpen, { left: 26, top: 27 }]} />
        </>
      )}
      <Animated.View style={[styles.bubble, { left: 34, top: pose === 'paused' ? 5 : pose === 'record' ? 4 : 3 }, bubbleStyle]} />
      {pose === 'record' && (
        <>
          <Animated.View style={[styles.spark, { left: 2, top: 6, width: 5, height: 5, borderRadius: 2.5, backgroundColor: AMBER }, burst1.style]} />
          <Animated.View style={[styles.spark, { left: 20, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: GREEN }, burst2.style]} />
        </>
      )}
    </View>
  );
}

/** 15a's streak card — pose follows real data (`README`: "changes pose with what the data says"), not the selected period tab, so it reads the same across Week/Month/Year. */
export function ProgressStreakCard({ streak, longest }: Props) {
  const theme = useTheme();

  const pose: Pose = streak === 0 ? 'paused' : streak >= longest ? 'record' : 'growing';

  const title =
    pose === 'record' ? 'Best streak yet!' : pose === 'growing' ? `${streak}-day streak` : longest > 0 ? 'Streak paused' : 'No streak yet';

  const subtitle =
    pose === 'record'
      ? `You're on a ${streak}-day streak — your longest yet.`
      : pose === 'growing'
        ? `${longest - streak} more to match your record of ${longest}.`
        : longest > 0
          ? `Complete a plan today to start climbing back toward your record of ${longest}.`
          : 'Complete a plan today to start your first streak.';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <StreakTickle pose={pose} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.subcard,
    borderWidth: 1,
    padding: 13,
    marginHorizontal: 14,
    marginTop: 14,
  },
  tickle: { width: 48, height: 48, flexShrink: 0 },
  body: { position: 'absolute', left: 5, top: 15, width: 37, height: 31, borderTopLeftRadius: 19, borderTopRightRadius: 19, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  eyeOpen: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#10203A' },
  eyeClosed: { position: 'absolute', width: 6, height: 2.4, borderRadius: 1.2, backgroundColor: '#10203A' },
  bubble: { position: 'absolute', width: 9, height: 9, borderRadius: 4.5, backgroundColor: AMBER },
  spark: { position: 'absolute' },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: Typography.heading, fontWeight: '700' },
  subtitle: { fontSize: Typography.body, fontWeight: '500', marginTop: 2, lineHeight: 16 },
});
