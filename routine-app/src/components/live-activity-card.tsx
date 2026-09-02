import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Plan } from '@/store/types';
import { usePlannerStore } from '@/store/use-planner-store';
import { findActiveLivePlans, formatCountdown, secondsUntilPlan } from '@/utils/countdown';

/** Cards taller than this many stacked at once switch the wrapper to a scrollable list. */
const STACK_LIMIT = 3;

function OneLiveActivity({ plan, pulse, tick, theme }: { plan: Plan; pulse: Animated.Value; tick: number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.successSoft, borderColor: theme.successBorder }]}>
      <Animated.View style={[styles.dot, { backgroundColor: theme.successLive, opacity: pulse }]} />
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: theme.textTertiary }]}>LIVE ACTIVITY</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {plan.name}
        </Text>
      </View>
      <View style={[styles.countdownPill, { backgroundColor: theme.surface }]}>
        <Text style={[styles.countdownText, { color: theme.success }]} key={tick}>
          {formatCountdown(secondsUntilPlan(plan))}
        </Text>
      </View>
    </View>
  );
}

export function LiveActivityCard() {
  const theme = useTheme();
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
          <OneLiveActivity key={plan.id} plan={plan} pulse={pulse} tick={tick} theme={theme} />
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
        <OneLiveActivity key={plan.id} plan={plan} pulse={pulse} tick={tick} theme={theme} />
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
    borderRadius: Radii.card,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 22,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  textWrap: { flex: 1, minWidth: 0 },
  label: { fontSize: Typography.caption, fontWeight: '700', letterSpacing: 0.9, marginBottom: 2 },
  name: { fontSize: Typography.rowLabel, fontWeight: '700' },
  countdownPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.chip },
  countdownText: { fontSize: Typography.rowLabel, fontWeight: '800' },
});
