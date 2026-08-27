import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Typography } from '@/constants/theme';
import type { Plan } from '@/store/types';
import { usePlannerStore } from '@/store/use-planner-store';
import { findActiveLivePlans, formatCountdown, secondsUntilPlan } from '@/utils/countdown';

/** Cards taller than this many stacked at once switch the wrapper to a scrollable list. */
const STACK_LIMIT = 3;

function OneLiveActivity({ plan, pulse, tick }: { plan: Plan; pulse: Animated.Value; tick: number }) {
  return (
    <View style={styles.card}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <View style={styles.textWrap}>
        <Text style={styles.label}>LIVE ACTIVITY</Text>
        <Text style={styles.name} numberOfLines={1}>
          {plan.name}
        </Text>
      </View>
      <View style={styles.countdownPill}>
        <Text style={styles.countdownText} key={tick}>
          {formatCountdown(secondsUntilPlan(plan))}
        </Text>
      </View>
    </View>
  );
}

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

  const active = findActiveLivePlans(plans);
  if (!liveActivitiesEnabled || active.length === 0) return null;

  if (active.length <= STACK_LIMIT) {
    return (
      <View style={[styles.stack, styles.wrapMargin]}>
        {active.map((plan) => (
          <OneLiveActivity key={plan.id} plan={plan} pulse={pulse} tick={tick} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollStack, styles.wrapMargin]}
      contentContainerStyle={styles.stack}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled>
      {active.map((plan) => (
        <OneLiveActivity key={plan.id} plan={plan} pulse={pulse} tick={tick} />
      ))}
    </ScrollView>
  );
}

const CARD_HEIGHT = 62;

const styles = StyleSheet.create({
  stack: { gap: 8 },
  wrapMargin: { marginTop: 6, marginBottom: 4 },
  scrollStack: { maxHeight: CARD_HEIGHT * STACK_LIMIT + 8 * (STACK_LIMIT - 1) },
  card: {
    backgroundColor: '#111114',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 22,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#2FB463' },
  textWrap: { flex: 1, minWidth: 0 },
  label: { color: '#9E9EA6', fontSize: Typography.label, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  name: { color: '#fff', fontSize: Typography.heading, fontWeight: '700' },
  countdownPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  countdownText: { color: '#fff', fontSize: Typography.heading, fontWeight: '800' },
});
