import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icon';
import { Radii, SwatchColors } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { usePlannerStore } from '@/store/use-planner-store';
import { fmtTime12, fromISO, pad, toISO } from '@/utils/dates';

function combineDateAndTime(dateISO: string, time: string) {
  const d = fromISO(dateISO);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function AddPlanScreen() {
  const theme = useTheme();
  const scheme = useEffectiveScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const plans = usePlannerStore((s) => s.plans);
  const groups = usePlannerStore((s) => s.groups);
  const addPlan = usePlannerStore((s) => s.addPlan);
  const updatePlan = usePlannerStore((s) => s.updatePlan);
  const deletePlan = usePlannerStore((s) => s.deletePlan);

  const editing = useMemo(() => plans.find((p) => p.id === id), [plans, id]);

  const [name, setName] = useState(editing?.name ?? '');
  const [dateTime, setDateTime] = useState(() => combineDateAndTime(editing?.date ?? toISO(new Date()), editing?.time ?? '09:00'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [color, setColor] = useState(editing?.color ?? SwatchColors[0]);
  const [groupId, setGroupId] = useState<string | null>(editing?.groupId ?? null);
  const [live, setLive] = useState(editing?.live ?? false);
  const [error, setError] = useState(false);

  const dateLabel = dateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = fmtTime12(`${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`);

  function onChangeDate(event: { type: string }, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (!selected || event.type === 'dismissed') return;
    setDateTime((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  }

  function onChangeTime(event: { type: string }, selected?: Date) {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selected || event.type === 'dismissed') return;
    setDateTime((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    const date = toISO(dateTime);
    const time = `${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`;
    if (editing) {
      updatePlan(editing.id, { name: name.trim(), date, time, color, groupId, live });
    } else {
      addPlan({ name: name.trim(), date, time, color, groupId, live, alert: '5', repeatType: 'none' });
    }
    router.back();
  }

  function handleDelete() {
    if (editing) deletePlan(editing.id);
    router.back();
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{editing ? 'Edit Plan' : 'New Plan'}</Text>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>PLAN NAME</Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(false);
              }}
              placeholder="e.g. Morning Run"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: error ? theme.danger : 'transparent' }]}
            />
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>DATE</Text>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosPickerRow}>
                <DateTimePicker
                  value={dateTime}
                  mode="date"
                  display="compact"
                  themeVariant={scheme}
                  accentColor={theme.accent}
                  onChange={onChangeDate}
                />
              </View>
            ) : (
              <Pressable onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}>{dateLabel}</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>TIME</Text>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosPickerRow}>
                <DateTimePicker
                  value={dateTime}
                  mode="time"
                  display="compact"
                  themeVariant={scheme}
                  accentColor={theme.accent}
                  onChange={onChangeTime}
                />
              </View>
            ) : (
              <Pressable onPress={() => setShowTimePicker(true)}>
                <Text style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}>{timeLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker value={dateTime} mode="date" display="default" onChange={onChangeDate} />
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker value={dateTime} mode="time" display="default" onChange={onChangeTime} />
        )}

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Text style={[styles.label, { color: theme.textTertiary, paddingHorizontal: 14, paddingTop: 12 }]}>COLOR</Text>
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
                style={[styles.chip, { borderColor: theme.divider, backgroundColor: groupId === g.id ? g.color : theme.surface }]}>
                <Text style={{ color: groupId === g.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>{g.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>Live Activity</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                Show a live countdown on the home screen as this plan approaches.
              </Text>
            </View>
            <Switch value={live} onValueChange={setLive} trackColor={{ true: theme.success }} />
          </View>
        </View>

        {editing && (
          <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft }]}>
            <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '700' }}>Delete Plan</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 8 },
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldBorder: { borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  input: { fontSize: 15.5, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2 },
  iosPickerRow: { alignItems: 'flex-start' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  deleteBtn: { padding: 14, borderRadius: Radii.md, alignItems: 'center' },
});
