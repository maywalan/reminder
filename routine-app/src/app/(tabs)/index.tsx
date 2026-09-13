import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon, ShareIcon } from '@/components/icon';
import { LiveActivityCard } from '@/components/live-activity-card';
import { PastActivityList } from '@/components/past-activity-list';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { TodoItem } from '@/components/todo-item';
import { UpcomingList } from '@/components/upcoming-list';
import { Fonts, Radii, RowMinHeight, SwatchColors, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Plan } from '@/store/types';
import { toISO } from '@/utils/dates';

const SHARE_LINK = 'routine.app/cal/share/9f2ab1c';
const SHARE_CONTACTS = [
  { initials: 'JL', name: 'Jamie Lin' },
  { initials: 'MP', name: 'Marcus Patel' },
];

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const toggleComplete = usePlannerStore((s) => s.toggleComplete);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const reorderPlans = usePlannerStore((s) => s.reorderPlans);
  const undoDelete = usePlannerStore((s) => s.undoDelete);
  const lastDeletedSnapshot = usePlannerStore((s) => s.lastDeletedSnapshot);
  const filterGroupId = usePlannerStore((s) => s.filterGroupId);
  const setFilterGroupId = usePlannerStore((s) => s.setFilterGroupId);
  const filterColor = usePlannerStore((s) => s.filterColor);
  const setFilterColor = usePlannerStore((s) => s.setFilterColor);
  const selectMode = usePlannerStore((s) => s.selectMode);
  const selectedIds = usePlannerStore((s) => s.selectedIds);
  const setSelectMode = usePlannerStore((s) => s.setSelectMode);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const pendingSaveToast = usePlannerStore((s) => s.pendingSaveToast);
  const setPendingSaveToast = usePlannerStore((s) => s.setPendingSaveToast);

  const [shareOpen, setShareOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [colorsMounted, setColorsMounted] = useState(false);
  const colorAnim = useRef(new Animated.Value(0)).current;
  const { toastMessage, showToast } = useToast();

  function toggleColors() {
    if (!colorsOpen) {
      setColorsOpen(true);
      setColorsMounted(true);
      Animated.timing(colorAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    } else {
      setColorsOpen(false);
      Animated.timing(colorAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setColorsMounted(false);
      });
    }
  }

  useFocusEffect(
    useCallback(() => {
      return () => setSelectMode(false);
    }, [setSelectMode])
  );

  useFocusEffect(
    useCallback(() => {
      if (pendingSaveToast) {
        showToast(pendingSaveToast);
        setPendingSaveToast(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingSaveToast])
  );

  const now = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISO(now), [now]);
  const dateLabel = useMemo(
    () => now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [now]
  );

  const dayPlans = plans.filter((p) => p.date === todayISO);
  const hasManualOrder = dayPlans.some((p) => p.order !== undefined);
  const todays = dayPlans
    .filter((p) => (!filterGroupId || p.groupId === filterGroupId) && (!filterColor || p.color === filterColor))
    .sort((a, b) => (hasManualOrder ? (a.order ?? Infinity) - (b.order ?? Infinity) : a.time.localeCompare(b.time)));

  async function handleCopyLink() {
    await Clipboard.setStringAsync(SHARE_LINK);
    showToast('Link copied');
  }

  const header = (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Tickle size={34} mood="idle" animated />
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{greeting(now.getHours())}</Text>
            <Text style={[styles.h1, { color: theme.text }]}>{dateLabel}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShareOpen(true)}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <ShareIcon size={18} color={theme.text} strokeWidth={1.9} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable
          onPress={toggleColors}
          style={[
            styles.chip,
            { borderColor: colorsOpen ? 'transparent' : theme.cardBorder, backgroundColor: colorsOpen ? theme.accentSoft : theme.surface },
          ]}>
          <Text style={{ color: colorsOpen ? theme.accentStrong : theme.text, fontSize: 12, fontWeight: '700', fontFamily: Fonts[700] }}>Colors</Text>
        </Pressable>
        {colorsMounted && (
          <Animated.View
            style={[
              styles.colorRevealRow,
              {
                opacity: colorAnim,
                transform: [{ translateX: colorAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
              },
            ]}>
            <Pressable
              onPress={() => setFilterColor(null)}
              style={[
                styles.chip,
                { borderColor: filterColor === null ? 'transparent' : theme.cardBorder, backgroundColor: filterColor === null ? theme.accentSoft : theme.surface },
              ]}>
              <Text style={{ color: filterColor === null ? theme.accentStrong : theme.text, fontSize: 12, fontWeight: '700', fontFamily: Fonts[700] }}>All</Text>
            </Pressable>
            {SwatchColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setFilterColor(filterColor === c ? null : c)}
                style={[styles.colorSwatch, { backgroundColor: c, borderColor: filterColor === c ? theme.text : 'transparent' }]}>
                {filterColor === c && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={() => setFilterGroupId(null)}
            style={[
              styles.chip,
              { borderColor: filterGroupId === null ? 'transparent' : theme.cardBorder, backgroundColor: filterGroupId === null ? theme.accentSoft : theme.surface },
            ]}>
            <Text style={{ color: filterGroupId === null ? theme.accentStrong : theme.text, fontSize: 12, fontWeight: '700', fontFamily: Fonts[700] }}>All</Text>
          </Pressable>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setFilterGroupId(filterGroupId === g.id ? null : g.id)}
              style={[
                styles.chip,
                { borderColor: theme.cardBorder, backgroundColor: filterGroupId === g.id ? g.color : theme.surface },
              ]}>
              {filterGroupId !== g.id && <View style={[styles.chipDot, { backgroundColor: g.color }]} />}
              <Text style={{ color: filterGroupId === g.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '700', fontFamily: Fonts[700] }}>
                {g.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <LiveActivityCard />

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>TODAY</Text>
        <Pressable onPress={() => setSelectMode(!selectMode)} hitSlop={8}>
          <Text style={[styles.editBtn, { color: theme.accentStrong }]}>{selectMode ? 'Done' : 'Edit'}</Text>
        </Pressable>
      </View>
    </>
  );

  const footer = (
    <>
      {lastDeletedSnapshot && !selectMode && (
        <Pressable onPress={undoDelete} style={[styles.undoBar, { backgroundColor: theme.surface2, borderColor: theme.cardBorder }]}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.rowValue, fontFamily: Fonts[500] }}>Undo last delete</Text>
        </Pressable>
      )}

      <UpcomingList />
      <PastActivityList />
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.surface }]}>
      <DraggableFlatList
        data={todays}
        keyExtractor={(item) => item.id}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}
        onDragEnd={({ data }) => reorderPlans(todayISO, data.map((p) => p.id))}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.rowLabel, fontFamily: Fonts[500] }}>
              {filterGroupId || filterColor ? 'Nothing matches this filter today.' : 'Nothing planned for today.'}
            </Text>
          </View>
        }
        renderItem={({ item, drag, isActive }: { item: Plan; drag: () => void; isActive: boolean }) => (
          <TodoItem
            plan={item}
            group={groups.find((g) => g.id === item.groupId)}
            selectMode={selectMode}
            selected={selectedIds.includes(item.id)}
            isActive={isActive}
            onToggleComplete={() => toggleComplete(item.id)}
            onToggleSelect={() => toggleSelected(item.id)}
            onPress={() => router.push({ pathname: '/add-plan', params: { id: item.id } })}
            onDelete={() => deletePlan(item.id)}
            onDrag={drag}
          />
        )}
      />

      <Toast message={toastMessage} />

      <BottomSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share Calendar"
        left={
          <Pressable onPress={() => setShareOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.rowLabel, fontWeight: '600', fontFamily: Fonts[600] }}>Cancel</Text>
          </Pressable>
        }
        right={
          <Pressable onPress={() => setShareOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700', fontFamily: Fonts[700] }}>Done</Text>
          </Pressable>
        }>
        <Text style={[styles.shareNote, { color: theme.textSecondary, fontFamily: Fonts[500] }]}>
          People you add can view your full calendar but can&apos;t add, edit, or remove plans — viewer access only.
        </Text>
        <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {SHARE_CONTACTS.map((c, i) => (
            <View key={c.name} style={[styles.listRow, i > 0 && styles.listRowBorder, { borderColor: theme.divider }]}>
              <View style={[styles.contactAvatar, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.accent, fontSize: Typography.rowValue, fontWeight: '700', fontFamily: Fonts[700] }}>{c.initials}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: Typography.rowLabel, fontWeight: '600', fontFamily: Fonts[600], flex: 1 }}>{c.name}</Text>
              <View style={[styles.rolePill, { backgroundColor: theme.surface2, borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.textSecondary, fontSize: Typography.caption, fontWeight: '700', fontFamily: Fonts[700] }}>Viewer</Text>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => showToast('Invite sent')}
            style={[styles.listRow, styles.listRowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.contactAvatar, styles.dashedAvatar, { borderColor: theme.dividerStrong }]}>
              <Text style={{ color: theme.textTertiary, fontSize: 16, fontWeight: '700', fontFamily: Fonts[700] }}>+</Text>
            </View>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '600', fontFamily: Fonts[600] }}>Add someone</Text>
          </Pressable>
        </View>
        <View style={[styles.shareLinkRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.rowValue, fontFamily: Fonts[500], flex: 1 }} numberOfLines={1}>
            {SHARE_LINK}
          </Text>
          <Pressable onPress={handleCopyLink} style={[styles.copyBtn, { backgroundColor: theme.accent }]}>
            <Text style={{ color: '#fff', fontSize: Typography.rowValue, fontWeight: '700', fontFamily: Fonts[700] }}>Copy Link</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: Typography.label, fontWeight: '500', fontFamily: Fonts[500], marginBottom: 2 },
  h1: { fontSize: Typography.headerDate, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: -0.2 },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 13, borderRadius: Radii.chip + 6, borderWidth: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  colorSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorRevealRow: { flexDirection: 'row', gap: 8 },
  list: { borderRadius: Radii.card, borderWidth: 1, overflow: 'hidden', marginTop: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  listRowBorder: { borderTopWidth: 1 },
  shareNote: { fontSize: Typography.rowValue, lineHeight: 18, marginTop: 12 },
  contactAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dashedAvatar: { borderWidth: 1, borderStyle: 'dashed', backgroundColor: 'transparent' },
  rolePill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: Radii.chip, borderWidth: 1 },
  shareLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  copyBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radii.iconTile },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: Typography.caption, fontWeight: '700', fontFamily: Fonts[700], letterSpacing: 0.9 },
  editBtn: { fontSize: Typography.rowValue, fontWeight: '700', fontFamily: Fonts[700] },
  empty: {
    marginHorizontal: 22,
    minHeight: RowMinHeight,
    padding: 26,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  undoBar: { marginHorizontal: 22, marginTop: 4, padding: 12, borderRadius: Radii.card, borderWidth: 1, alignItems: 'center' },
});
