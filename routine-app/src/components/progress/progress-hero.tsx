import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';

interface Props {
  periodLabel: string;
  completed: number;
  deltaPct: number;
}

export function ProgressHero({ periodLabel, completed, deltaPct }: Props) {
  const up = deltaPct >= 0;
  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.label}>{periodLabel.toUpperCase()}</Text>
      <Text style={styles.value}>{completed}</Text>
      <View style={styles.subRow}>
        <Text style={styles.sub}>tasks completed</Text>
        <View style={[styles.pill, up ? styles.pillUp : styles.pillDown]}>
          <Text style={[styles.pillText, { color: up ? '#6FE39B' : '#FF8079' }]}>
            {up ? '▲' : '▼'} {Math.abs(deltaPct)}% vs last period
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0F12',
    borderRadius: Radii.lg,
    padding: 20,
    marginHorizontal: 22,
    marginTop: 6,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -46,
    right: -46,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#5B5FEF',
    opacity: 0.35,
  },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  value: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
  subRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.body },
  pill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
  pillUp: { backgroundColor: 'rgba(48,209,88,0.22)' },
  pillDown: { backgroundColor: 'rgba(255,69,58,0.20)' },
  pillText: { fontSize: 12, fontWeight: '700' },
});
