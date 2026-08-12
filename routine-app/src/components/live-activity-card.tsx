import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { usePlannerStore } from '@/store/use-planner-store';
import { findActiveLivePlan, formatCountdown, secondsUntilPlan } from '@/utils/countdown';

export function LiveActivityCard() {
  const plans = usePlannerStore((s) => s.plans);
  const liveActivitiesEnabled = usePlannerStore((s) => s.settings.liveActivitiesEnabled);
  const [tick, setTick] = useState(0);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const active = findActiveLivePlan(plans);
  if (!liveActivitiesEnabled || !active) return null;

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <View style={styles.textWrap}>
        <Text style={styles.label}>LIVE ACTIVITY</Text>
        <Text style={styles.name} numberOfLines={1}>
          {active.name}
        </Text>
      </View>
      <View style={styles.countdownPill}>
        <Text style={styles.countdownText} key={tick}>
          {formatCountdown(secondsUntilPlan(active))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111114',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 4,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#2FB463' },
  textWrap: { flex: 1, minWidth: 0 },
  label: { color: '#9E9EA6', fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  countdownPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  countdownText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
