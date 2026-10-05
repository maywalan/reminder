import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/text';
import { CheckIcon } from '@/components/icon';
import { Radii, SwatchColors, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Group } from '@/store/types';

/**
 * Create Group — pushed over New/Edit Plan (`from=plan`) or from Home's Groups row. The name field
 * works like a tag search: existing groups that match what's typed show up as suggestions, and
 * tapping one uses it instead of creating a duplicate. An exact-name match can't be created twice.
 *
 * Coming from a plan, the chosen group goes back through the store's `pendingGroupPick` (see
 * add-plan.tsx) so the plan form underneath keeps everything already filled in.
 */
export default function CreateGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from, name: prefillName } = useLocalSearchParams<{ from?: string; name?: string }>();
  const fromPlan = from === 'plan';

  const groups = usePlannerStore((s) => s.groups);
  const addGroup = usePlannerStore((s) => s.addGroup);
  const setPendingGroupPick = usePlannerStore((s) => s.setPendingGroupPick);
  const setFilterGroupId = usePlannerStore((s) => s.setFilterGroupId);

  const [name, setName] = useState(prefillName ?? '');
  // Default to the first swatch no existing group uses yet, so new groups tell apart at a glance.
  const [color, setColor] = useState<string>(() => SwatchColors.find((c) => !groups.some((g) => g.color === c)) ?? SwatchColors[0]);

  const query = name.trim().toLowerCase();
  const suggestions = useMemo(
    () => (query ? groups.filter((g) => g.name.toLowerCase().includes(query)) : groups),
    [groups, query]
  );
  const exactMatch = groups.find((g) => g.name.trim().toLowerCase() === query);
  const canCreate = !!query && !exactMatch;

  function finish(group: Group) {
    if (fromPlan) setPendingGroupPick(group.id);
    else setFilterGroupId(group.id);
    router.back();
  }

  function handleCreate() {
    if (!canCreate) return;
    finish(addGroup({ name: name.trim(), color }));
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <View style={styles.headSide}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.heading, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </View>
        <Text style={{ color: theme.text, fontSize: Typography.title, fontWeight: '800' }}>New Group</Text>
        <View style={[styles.headSide, styles.headSideEnd]}>
          <Pressable onPress={handleCreate} disabled={!canCreate} hitSlop={8}>
            <Text style={{ color: canCreate ? theme.accent : theme.textQuaternary, fontSize: Typography.heading, fontWeight: '700' }}>Create</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>GROUP NAME</Text>
            <View style={styles.nameRow}>
              <View style={[styles.previewDot, { backgroundColor: color }]} />
              <TextInput
                value={name}
                onChangeText={setName}
                autoFocus
                placeholder="Search or name a new group"
                placeholderTextColor={theme.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                maxLength={30}
                style={[styles.input, { color: theme.text }]}
              />
            </View>
          </View>
          {exactMatch && (
            <Text style={[styles.hint, styles.fieldBorder, { color: theme.textSecondary, borderColor: theme.divider }]}>
              &ldquo;{exactMatch.name}&rdquo; already exists — tap it below to use it.
            </Text>
          )}
        </View>

        {suggestions.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{query ? 'MATCHING GROUPS' : 'YOUR GROUPS'}</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
              {suggestions.map((g, i) => (
                <Pressable
                  key={g.id}
                  onPress={() => finish(g)}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.fieldBorder,
                    { borderColor: theme.divider, backgroundColor: pressed ? theme.surface2 : 'transparent' },
                  ]}>
                  <View style={[styles.rowDot, { backgroundColor: g.color }]} />
                  <Text style={[styles.rowLabel, { color: theme.text }]} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={{ color: theme.accent, fontSize: Typography.body, fontWeight: '700' }}>Use</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>COLOR</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.swatchRow}>
            {SwatchColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === color ? theme.text : 'transparent' }]}>
                {c === color && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={handleCreate} disabled={!canCreate} style={[styles.saveBtn, !canCreate && { opacity: 0.4 }]}>
          <Text style={{ color: '#fff', fontSize: Typography.heading, fontWeight: '700' }}>
            {query ? `Create “${name.trim()}”` : 'Create group'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 20 },
  headSide: { flex: 1 },
  headSideEnd: { alignItems: 'flex-end' },
  group: { borderRadius: Radii.card, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldBorder: { borderTopWidth: 1 },
  label: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.4, marginBottom: 6 },
  sectionLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewDot: { width: 12, height: 12, borderRadius: 6 },
  input: { flex: 1, fontSize: Typography.heading, fontWeight: '600', paddingVertical: 2 },
  hint: { fontSize: Typography.body, paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: Typography.heading, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    height: 48,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B76E8',
    marginTop: 4,
  },
});
