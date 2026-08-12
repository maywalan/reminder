import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { fmtTime12, toISO } from '@/utils/dates';

interface WidgetPreviewProps {
  variant: 'mini' | 'compact';
}

/** Static mockup of the iOS home-screen widget, matching the prototype's #widget-mini / #widget-compact preview. */
export function WidgetPreview({ variant }: WidgetPreviewProps) {
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const todayISO = toISO(new Date());

  const todays = plans.filter((p) => p.date === todayISO && !p.completed).sort((a, b) => a.time.localeCompare(b.time));

  const limit = variant === 'mini' ? 3 : 5;
  const items = todays.slice(0, limit);
  const more = todays.length - items.length;

  const colorForPlan = (p: (typeof plans)[number]) =>
    p.color || groups.find((g) => g.id === p.groupId)?.color || Colors.light.accent;

  return (
    <View style={[styles.widget, variant === 'mini' ? styles.mini : styles.compact]}>
      <View style={styles.head}>
        <LinearGradient colors={[Colors.light.accent, Colors.light.accentStrong]} style={styles.appIcon} />
        <Text style={styles.appName} numberOfLines={1}>
          Routine{variant === 'compact' ? ' · Today' : ''}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing planned today</Text>
      ) : (
        items.map((p) => (
          <View key={p.id} style={styles.taskRow}>
            <View style={[styles.taskDot, { backgroundColor: colorForPlan(p) }]} />
            <Text style={styles.taskName} numberOfLines={1}>
              {p.name}
            </Text>
            {variant === 'compact' && <Text style={styles.taskTime}>{fmtTime12(p.time)}</Text>}
          </View>
        ))
      )}
      {more > 0 && <Text style={styles.more}>+{more} more</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  widget: { backgroundColor: '#2A2A2E', borderRadius: 24, padding: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12 },
  mini: { width: 155, height: 155 },
  compact: { width: '100%', maxWidth: 320, height: 155 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  appIcon: { width: 16, height: 16, borderRadius: 5 },
  appName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', flexShrink: 1 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  taskDot: { width: 6, height: 6, borderRadius: 3 },
  taskName: { fontSize: 11.5, fontWeight: '600', color: '#fff', flex: 1 },
  taskTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  more: { fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginTop: 2 },
  empty: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
});
