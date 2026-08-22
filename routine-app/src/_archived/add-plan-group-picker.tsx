/**
 * ARCHIVED — the Group picker was removed from the Add/Edit Plan screen (src/app/add-plan.tsx)
 * at the user's request, kept here in case it's wanted back later. Not imported anywhere; has no
 * effect on the running app. The underlying data model (groups, groupId on Plan, addGroup in the
 * store, Today's filter-by-group chips) was NOT touched — only this screen's picker UI is gone.
 *
 * To restore: in add-plan.tsx —
 * 1. Re-add state: `const [newGroupOpen, setNewGroupOpen] = useState(false);`
 *    `const [newGroupName, setNewGroupName] = useState('');`
 *    `const [newGroupColor, setNewGroupColor] = useState<string>(SwatchColors[0]);`
 *    (`groupId`/`setGroupId` and `addGroup` are still there — only the New Group state was removed)
 * 2. Re-add `handleCreateGroup` (below).
 * 3. Paste the GROUP `<View style={styles.group}>...` block back into the form, and the
 *    "New Group" `<BottomSheet>` block back before the closing `</View>` of the screen.
 * 4. Re-add `PlusIcon` to the icon import if it's no longer used elsewhere in the file.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CheckIcon, PlusIcon } from '@/components/icon';
import { Radii, SwatchColors, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import type { Group } from '@/store/types';

function handleCreateGroupSnippet(
  newGroupName: string,
  newGroupColor: string,
  addGroup: (g: Omit<Group, 'id'>) => Group,
  setGroupId: (id: string | null) => void,
  setNewGroupName: (v: string) => void,
  setNewGroupColor: (v: string) => void,
  setNewGroupOpen: (v: boolean) => void
) {
  if (!newGroupName.trim()) return;
  const group = addGroup({ name: newGroupName.trim(), color: newGroupColor });
  setGroupId(group.id);
  setNewGroupName('');
  setNewGroupColor(SwatchColors[0]);
  setNewGroupOpen(false);
}

/** Not rendered anywhere — reference only. */
export function ArchivedGroupPicker() {
  const theme = useTheme();
  const groups = usePlannerStore((s) => s.groups);
  const addGroup = usePlannerStore((s) => s.addGroup);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<string>(SwatchColors[0]);

  function handleCreateGroup() {
    handleCreateGroupSnippet(newGroupName, newGroupColor, addGroup, setGroupId, setNewGroupName, setNewGroupColor, setNewGroupOpen);
  }

  return (
    <>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
        <Text style={[styles.label, { color: theme.textTertiary, paddingHorizontal: 14, paddingTop: 12 }]}>GROUP</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setGroupId(null)}
            style={[styles.chip, { borderColor: theme.divider, backgroundColor: groupId === null ? theme.accent : theme.surface }]}>
            <Text style={{ color: groupId === null ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>No Group</Text>
          </Pressable>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setGroupId(g.id)}
              style={[styles.chip, { borderColor: theme.divider, backgroundColor: groupId === g.id ? theme.accent : theme.surface }]}>
              <Text style={{ color: groupId === g.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>{g.name}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setNewGroupOpen(true)}
            style={[styles.chip, styles.addGroupChip, { borderColor: theme.divider, backgroundColor: theme.surface }]}>
            <PlusIcon size={12} color={theme.accent} strokeWidth={2.6} />
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>Add Group</Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet
        visible={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        title="New Group"
        left={
          <Pressable onPress={() => setNewGroupOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.heading, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        }
        right={
          <Pressable onPress={handleCreateGroup} hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: Typography.heading, fontWeight: '700' }}>Save</Text>
          </Pressable>
        }>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>GROUP NAME</Text>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="e.g. Study"
              placeholderTextColor={theme.textTertiary}
              maxLength={24}
              style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}
            />
          </View>
        </View>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginBottom: 20 }]}>
          <Text style={[styles.label, { color: theme.textTertiary, paddingHorizontal: 14, paddingTop: 12 }]}>COLOR</Text>
          <View style={styles.swatchRow}>
            {SwatchColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewGroupColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: c === newGroupColor ? theme.text : 'transparent' }]}>
                {c === newGroupColor && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  label: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4, textAlign: 'left' },
  input: { fontSize: Typography.heading, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2, textAlign: 'left' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  addGroupChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
