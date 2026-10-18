import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BouncyPressable } from '@/components/bouncy-pressable';
import { PlanIcon, SearchIcon } from '@/components/icon';
import { Text, TextInput } from '@/components/text';
import { Fonts, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { STRINGS } from '@/i18n/strings';
import { PLAN_ICON_CATEGORIES, PLAN_ICONS, type PlanIconId } from '@/utils/plan-icons';

/**
 * New plan's icon picking (design_handoff_tickle_home_timeline, screens 2–3): the square icon
 * chips, a 6-column grid of them, and the full-height "Choose icon" sheet.
 */

const scale = () => Typography.body / 13;
const font = (size: number, weight: 500 | 600 | 700) => ({ fontSize: size * scale(), fontWeight: String(weight) as '500', fontFamily: Fonts[weight] });

export function useIconChipColors() {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  return {
    offBg: dark ? theme.surface2 : '#F4F7FC',
    offStroke: dark ? 'rgba(242,245,250,0.55)' : 'rgba(16,32,58,0.55)',
  };
}

/** One square chip: off = grey with an ink icon, on = tinted with the plan colour and a 2pt ring. */
function IconChip({ id, on, color, onPress }: { id: PlanIconId; on: boolean; color: string; onPress: () => void }) {
  const c = useIconChipColors();
  const label = PLAN_ICONS.find((i) => i.id === id)!.labelKey;
  return (
    <BouncyPressable
      pressedScale={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      accessibilityState={{ selected: on }}
      style={[styles.chip, { backgroundColor: on ? `${color}1F` : c.offBg }]}>
      {on && <View pointerEvents="none" style={[styles.chipRing, { borderColor: color }]} />}
      <PlanIcon id={id} size={22} color={on ? color : c.offStroke} />
    </BouncyPressable>
  );
}

/** Icons in rows of 6, the last row padded so every chip stays the same size. */
export function IconGrid({ ids, selected, color, onPick }: { ids: PlanIconId[]; selected: string | null; color: string; onPick: (id: PlanIconId) => void }) {
  const rows: PlanIconId[][] = [];
  for (let i = 0; i < ids.length; i += 6) rows.push(ids.slice(i, i + 6));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((id) => (
            <View key={id} style={styles.cellBox}>
              <IconChip id={id} on={id === selected} color={color} onPress={() => onPick(id)} />
            </View>
          ))}
          {Array.from({ length: 6 - row.length }, (_, i) => (
            <View key={`pad${i}`} style={styles.cellBox} />
          ))}
        </View>
      ))}
    </View>
  );
}

function matchesQuery(id: PlanIconId, q: string) {
  const def = PLAN_ICONS.find((i) => i.id === id)!;
  const entry = STRINGS[def.labelKey];
  return [entry.en, entry.th, ...def.en, ...def.th].some((w) => w.toLowerCase().includes(q));
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  selected: string | null;
  color: string;
  colors: readonly string[];
  onColor: (c: string) => void;
  recent: PlanIconId[];
  onPick: (id: PlanIconId) => void;
}

/** The full-height "Choose icon" sheet: search, colour dots, then RECENT and the four categories. */
export function IconPickerSheet({ visible, onClose, selected, color, colors, onColor, recent, onPick }: SheetProps) {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [query, setQuery] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 24, mass: 0.9, stiffness: 220 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          setQuery('');
        }
      });
    }
  }, [visible, progress]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => (q ? PLAN_ICONS.map((i) => i.id).filter((id) => matchesQuery(id, q)) : []), [q]);

  if (!mounted) return null;

  const sheetBg = dark ? theme.bg : '#F4F7FC';
  const card = theme.surface;
  const ink = theme.text;
  const ink45 = dark ? 'rgba(242,245,250,0.45)' : 'rgba(16,32,58,0.45)';
  const ink55 = dark ? 'rgba(242,245,250,0.55)' : 'rgba(16,32,58,0.55)';
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [800, 0], extrapolate: 'clamp' });

  const pick = (id: PlanIconId) => {
    Haptics.selectionAsync();
    onPick(id);
  };

  const section = (key: string, label: string, note: string | null, ids: PlanIconId[]) => (
    <View key={key} style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[font(11.5, 600), styles.caps, { color: ink45 }]}>{label}</Text>
        {note && <Text style={[font(11.5, 500), { color: ink45 }]}>{note}</Text>}
      </View>
      <View style={[styles.card, { backgroundColor: card }]}>
        <IconGrid ids={ids} selected={selected} color={color} onPick={pick} />
      </View>
    </View>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,32,58,0.28)', opacity: progress }]} />
        </Pressable>
        <Animated.View style={[styles.sheet, { backgroundColor: sheetBg, top: Math.max(96, insets.top + 40), transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={[font(17, 700), { color: ink }]}>{t('icon.sheetTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={[font(16, 700), { color: theme.accent }]}>{t('common.done')}</Text>
            </Pressable>
          </View>

          <View style={[styles.search, { backgroundColor: card, borderColor: dark ? theme.cardBorder : '#E3EAF4' }]}>
            <SearchIcon size={16} color={ink45} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('icon.search')}
              placeholderTextColor={dark ? 'rgba(242,245,250,0.4)' : 'rgba(16,32,58,0.4)'}
              autoCorrect={false}
              returnKeyType="search"
              style={[font(14.5, 500), styles.searchInput, { color: ink }]}
            />
          </View>

          {/* The app has 8 plan colours (the mock shows 5), so the dots get their own line under the label. */}
          <Text style={[font(13, 500), styles.colourLabel, { color: ink55 }]}>{t('icon.colourFollows')}</Text>
          <View style={styles.colourRow}>
            {colors.map((c) => (
              <Pressable key={c} onPress={() => onColor(c)} hitSlop={4} accessibilityLabel={c} accessibilityState={{ selected: c === color }}>
                {c === color && <View pointerEvents="none" style={[styles.dotRing, { borderColor: c }]} />}
                <View style={[styles.dot, { backgroundColor: c }]} />
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {q ? (
              results.length ? (
                <View style={[styles.card, styles.section, { backgroundColor: card }]}>
                  <IconGrid ids={results} selected={selected} color={color} onPick={pick} />
                </View>
              ) : (
                <Text style={[font(13, 500), styles.none, { color: ink45 }]}>{t('icon.noResults')}</Text>
              )
            ) : (
              <>
                {section('recent', t('icon.recent'), t('icon.recentNote'), recent)}
                {PLAN_ICON_CATEGORIES.map((c) => section(c.labelKey, t(c.labelKey), null, c.icons.map((i) => i.id)))}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1, aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 16, borderWidth: 2 },
  grid: { gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  cellBox: { flex: 1, aspectRatio: 1 },

  root: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(120,120,128,0.3)', alignSelf: 'center', marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  search: { height: 42, borderRadius: 21, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, marginTop: 14, marginHorizontal: 16 },
  searchInput: { flex: 1, paddingVertical: 0 },
  colourLabel: { paddingTop: 14, paddingHorizontal: 20 },
  colourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 24, paddingBottom: 4 },
  dot: { width: 22, height: 22, borderRadius: 11 },
  dotRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 15, borderWidth: 2 },
  scroll: { flex: 1, marginTop: 6 },
  section: { marginHorizontal: 16, marginTop: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  caps: { letterSpacing: 0.8 },
  card: { borderRadius: 20, padding: 12 },
  none: { textAlign: 'center', paddingVertical: 32 },
});
