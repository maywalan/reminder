import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii, Typography } from '@/constants/theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { findActiveLivePlans, formatCountdown, formatElapsedClock, formatMinutesLeft, secondsUntilPlan, secondsUntilPlanEnd } from '@/utils/countdown';
import { usePulse } from '@/utils/motion';

/** Cards taller than this many stacked at once switch the wrapper to a scrollable list. */
const STACK_LIMIT = 3;

/**
 * The mini Tickle that rides inside every Live Activity card (design_handoff_tickle_draft2's
 * 11b, section 03) — a static (no breathe/blink) 32pt badge, only its dot pulses. Kept as bespoke
 * markup rather than the shared `Tickle` component: 11b positions this bubble left-of-center over
 * the body rather than the component's standard top-right placement, and this instance never
 * breathes or blinks, so reusing the parametric component would need more special-casing than just
 * drawing the four fixed layers it actually is.
 */
function MiniLiveTickle({ dotColor }: { dotColor: string }) {
  const pulse = usePulse(true);
  return (
    <View style={styles.miniTickle}>
      <LinearGradient
        colors={['#D6E8FC', '#A8CCF6']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.miniTickleBody}
      />
      <View style={[styles.miniTickleEye, { left: 10, top: 19 }]} />
      <View style={[styles.miniTickleEye, { left: 19, top: 19 }]} />
      <Animated.View style={[styles.miniTickleDot, { backgroundColor: dotColor, shadowColor: dotColor }, pulse]} />
    </View>
  );
}

/**
 * Every live-toggled plan gets this one ink card (design_handoff_tickle_draft2's 11b / section
 * 03) — a countdown before it starts, an elapsed clock + progress rail once it has. No controls on
 * the card itself; tapping it opens the plan, where rescheduling and stopping live.
 */
function LiveCard({ plan, tick, groupName, onPress }: { plan: Plan; tick: number; groupName: string | undefined; onPress: () => void }) {
  void tick; // forces a re-render each second so the clock and progress bar stay live
  const untilStart = secondsUntilPlan(plan);
  const started = untilStart <= 0;
  const elapsedSec = Math.max(0, -untilStart);
  const remainingSec = secondsUntilPlanEnd(plan);
  const totalSec = plan.endTime ? elapsedSec + Math.max(0, remainingSec ?? 0) : null;
  const percent = started && totalSec && totalSec > 0 ? Math.min(1, elapsedSec / totalSec) : null;

  return (
    <Pressable onPress={onPress} style={styles.runningCard}>
      <MiniLiveTickle dotColor={started ? '#4FC98A' : '#1B76E8'} />
      <View style={styles.runningText}>
        <Text style={styles.runningLabel} numberOfLines={1}>
          LIVE ACTIVITY{groupName ? ` · ${groupName.toUpperCase()}` : ''}
        </Text>
        <Text style={styles.runningTitle} numberOfLines={1}>
          {plan.name}
        </Text>
        {percent !== null && remainingSec !== null && (
          <View style={styles.runningProgressRow}>
            <View style={styles.runningTrack}>
              <LinearGradient
                colors={['#5AA0F5', '#8FC2FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.runningFill, { width: `${percent * 100}%` }]}
              />
            </View>
            <Text style={styles.runningRemaining}>{formatMinutesLeft(remainingSec)}</Text>
          </View>
        )}
      </View>
      <View style={styles.elapsedPill}>
        <Text style={styles.elapsedText}>{started ? formatElapsedClock(elapsedSec) : formatCountdown(untilStart).replace(/^in /, '')}</Text>
      </View>
    </Pressable>
  );
}

export function LiveActivityCard() {
  const router = useRouter();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const liveActivitiesEnabled = usePlannerStore((s) => s.settings.liveActivitiesEnabled);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const active = findActiveLivePlans(plans);
  if (!liveActivitiesEnabled || active.length === 0) return null;

  const renderOne = (plan: Plan) => {
    const groupName = groups.find((g) => g.id === plan.groupId)?.name;
    const onPress = () => router.push({ pathname: '/add-plan', params: { id: plan.id } });
    return <LiveCard key={plan.id} plan={plan} tick={tick} groupName={groupName} onPress={onPress} />;
  };

  if (active.length <= STACK_LIMIT) {
    return <View style={[styles.stack, styles.wrapMargin]}>{active.map(renderOne)}</View>;
  }

  return (
    <ScrollView
      style={[styles.scrollStack, styles.wrapMargin]}
      contentContainerStyle={styles.stack}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled>
      {active.map(renderOne)}
    </ScrollView>
  );
}

const CARD_HEIGHT = 62;

const styles = StyleSheet.create({
  stack: { gap: 8 },
  wrapMargin: { marginTop: 6, marginBottom: 4 },
  scrollStack: { maxHeight: CARD_HEIGHT * STACK_LIMIT + 8 * (STACK_LIMIT - 1) },

  // Ink card — 11b / section 03. No controls: tapping opens the plan.
  runningCard: {
    marginHorizontal: 22,
    borderRadius: 22,
    backgroundColor: '#10203A',
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowColor: '#10203A',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  miniTickle: { width: 32, height: 32, flexShrink: 0 },
  miniTickleBody: { position: 'absolute', left: 3, top: 10, width: 25, height: 21, borderRadius: 13, borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },
  miniTickleEye: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10203A' },
  miniTickleDot: {
    position: 'absolute',
    left: 12,
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  runningText: { flex: 1, minWidth: 0 },
  runningLabel: { fontSize: 9.5, fontWeight: '600', fontFamily: Fonts[600], letterSpacing: 0.4, color: 'rgba(255,255,255,0.6)' },
  runningTitle: { fontSize: Typography.rowLabel, fontWeight: '700', fontFamily: Fonts[700], color: '#fff', marginTop: 1 },
  runningProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  runningTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  runningFill: { height: '100%', borderRadius: 2 },
  runningRemaining: { fontSize: 9.5, fontWeight: '500', fontFamily: Fonts[500], color: 'rgba(255,255,255,0.55)' },
  elapsedPill: { flexShrink: 0, paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radii.chip, backgroundColor: 'rgba(255,255,255,0.14)' },
  elapsedText: { fontSize: 15, fontWeight: '700', fontFamily: Fonts[700], color: '#fff' },
});
