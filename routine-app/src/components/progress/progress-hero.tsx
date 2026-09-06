import { StyleSheet, Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { Radii } from '@/constants/theme';

const RING_SIZE = 76;
const RING_STROKE = 9;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const HOLE_SIZE = 58;

interface Props {
  eyebrow: string;
  completed: number;
  total: number;
  completionRate: number;
  deltaPct: number;
  compareLabel: string;
}

/** Progress screen's hero card — 15a's dark conic-ring, ported to react-native-svg (a stroked circle standing in for the CSS conic-gradient, since RN has no native conic paint). */
export function ProgressHero({ eyebrow, completed, total, completionRate, deltaPct, compareLabel }: Props) {
  const pct = Math.max(0, Math.min(1, completionRate / 100));
  const up = deltaPct >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {pct > 0 && (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#4FC98A"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE * pct} ${RING_CIRCUMFERENCE}`}
              fill="none"
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          )}
        </Svg>
        <View style={styles.hole}>
          <Text style={styles.holeValue}>{completionRate}</Text>
          <Text style={styles.holeCaption}>PERCENT</Text>
        </View>
      </View>

      <View style={styles.text}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text style={styles.line} numberOfLines={1}>
          {completed} of {total} done
        </Text>
        <Text style={styles.delta} numberOfLines={1}>
          {up ? 'Up' : 'Down'} {Math.abs(deltaPct)} points on {compareLabel}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: Radii.panel,
    backgroundColor: '#10203A',
    padding: 15,
    marginHorizontal: 14,
    marginTop: 14,
    shadowColor: '#10203A',
    shadowOpacity: 0.2,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  hole: {
    width: HOLE_SIZE,
    height: HOLE_SIZE,
    borderRadius: HOLE_SIZE / 2,
    backgroundColor: '#10203A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeValue: { fontWeight: '500', fontSize: 18, color: '#fff' },
  holeCaption: { fontWeight: '600', fontSize: 8.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.4 },
  text: { flex: 1, minWidth: 0 },
  eyebrow: { fontWeight: '600', fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },
  line: { fontWeight: '700', fontSize: 16, color: '#fff', marginTop: 3, lineHeight: 21 },
  delta: { fontWeight: '500', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
