import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { CameraIcon, CheckIcon, ChevronRightIcon, PlusIcon } from '@/components/icon';
import { Radii, SwatchColors } from '@/constants/theme';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { uid, usePlannerStore } from '@/store/use-planner-store';
import { fmtTime12, fromISO, pad, toISO } from '@/utils/dates';
import { isPlacesSearchAvailable } from '@/utils/places';
import { generateRepeatOccurrences, REPEAT_OPTIONS, type RepeatType } from '@/utils/repeat';

const MAX_PHOTOS = 3;

const ALERT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '0', label: 'At time of event' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '2880', label: '2 days before' },
  { value: '10080', label: '1 week before' },
];

function alertLabel(value: string) {
  return ALERT_OPTIONS.find((o) => o.value === value)?.label ?? 'None';
}

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
  const addPlans = usePlannerStore((s) => s.addPlans);
  const updatePlan = usePlannerStore((s) => s.updatePlan);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const duplicatePlan = usePlannerStore((s) => s.duplicatePlan);
  const addGroup = usePlannerStore((s) => s.addGroup);

  const editing = useMemo(() => plans.find((p) => p.id === id), [plans, id]);

  const [name, setName] = useState(editing?.name ?? '');
  const [dateTime, setDateTime] = useState(() => combineDateAndTime(editing?.date ?? toISO(new Date()), editing?.time ?? '09:00'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [timeMode, setTimeMode] = useState<'specific' | 'range'>(editing?.endTime ? 'range' : 'specific');
  const [endDateTime, setEndDateTime] = useState(() =>
    combineDateAndTime(editing?.date ?? toISO(new Date()), editing?.endTime ?? editing?.time ?? '10:00')
  );
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [color, setColor] = useState(editing?.color ?? SwatchColors[0]);
  const [groupId, setGroupId] = useState<string | null>(editing?.groupId ?? null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<string>(SwatchColors[0]);
  const [live, setLive] = useState(editing?.live ?? false);
  const [alert1, setAlert1] = useState(editing?.alerts?.[0] ?? '5');
  const [alert2, setAlert2] = useState(editing?.alerts?.[1] ?? 'none');
  const [alertSlot, setAlertSlot] = useState<1 | 2 | null>(null);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [showRepeatUntilPicker, setShowRepeatUntilPicker] = useState(false);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [locationFocused, setLocationFocused] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>(editing?.photoUris ?? []);
  const [error, setError] = useState(false);

  const { suggestions: placeSuggestions, loading: placesLoading } = usePlaceSearch(location);

  const dateLabel = dateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = fmtTime12(`${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`);
  const endTimeLabel = fmtTime12(`${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}`);

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

  function onChangeEndTime(event: { type: string }, selected?: Date) {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (!selected || event.type === 'dismissed') return;
    setEndDateTime((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  }

  function onChangeRepeatUntil(event: { type: string }, selected?: Date) {
    if (Platform.OS === 'android') setShowRepeatUntilPicker(false);
    if (!selected || event.type === 'dismissed') return;
    setRepeatUntil(selected);
  }

  function handleSave() {
    if (!name.trim()) {
      setError(true);
      return;
    }
    const date = toISO(dateTime);
    const time = `${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`;
    const endTime =
      !allDay && timeMode === 'range' ? `${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}` : undefined;
    const common = {
      name: name.trim(),
      color,
      groupId,
      live,
      alerts: [alert1, alert2].filter((a) => a !== 'none'),
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      photoUris,
      endTime,
      allDay,
    };
    if (editing) {
      updatePlan(editing.id, { ...common, date, time });
    } else if (repeatType !== 'none' && repeatUntil) {
      const occurrences = generateRepeatOccurrences(date, time, repeatType, toISO(repeatUntil));
      const repeatId = uid();
      addPlans(occurrences.map((o) => ({ ...common, date: o.date, time: o.time, repeatType, repeatId })));
    } else {
      addPlan({ ...common, date, time, repeatType: 'none' });
    }
    router.back();
  }

  function handleDelete() {
    if (editing) deletePlan(editing.id);
    router.back();
  }

  function handleDuplicate() {
    if (editing) duplicatePlan(editing.id);
    router.back();
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const remaining = MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotoUris((prev) => prev.filter((p) => p !== uri));
  }

  function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    const group = addGroup({ name: newGroupName.trim(), color: newGroupColor });
    setGroupId(group.id);
    setNewGroupName('');
    setNewGroupColor(SwatchColors[0]);
    setNewGroupOpen(false);
  }

  function selectAlert(value: string) {
    if (alertSlot === 1) {
      setAlert1(value);
      if (value === 'none') setAlert2('none');
    } else if (alertSlot === 2) {
      setAlert2(value);
    }
    setAlertSlot(null);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
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
          <View style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
            <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>All Day</Text>
            <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: theme.success }} />
          </View>

          {!allDay && (
            <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
              <View style={styles.segmentRow}>
                <Pressable
                  onPress={() => setTimeMode('specific')}
                  style={[styles.segment, { backgroundColor: timeMode === 'specific' ? theme.accent : theme.surface2, borderColor: theme.divider }]}>
                  <Text style={{ color: timeMode === 'specific' ? '#fff' : theme.text, fontSize: 12.5, fontWeight: '700' }}>
                    Specific Time
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTimeMode('range')}
                  style={[styles.segment, { backgroundColor: timeMode === 'range' ? theme.accent : theme.surface2, borderColor: theme.divider }]}>
                  <Text style={{ color: timeMode === 'range' ? '#fff' : theme.text, fontSize: 12.5, fontWeight: '700' }}>Time Range</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!allDay && (timeMode === 'specific' ? (
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
          ) : (
            <View style={[styles.timeRangeRow, styles.fieldBorder, { borderColor: theme.divider }]}>
              <View style={styles.timeRangeCol}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>START TIME</Text>
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
              <View style={[styles.timeRangeCol, styles.timeRangeColBorder, { borderColor: theme.divider }]}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>END TIME</Text>
                {Platform.OS === 'ios' ? (
                  <View style={styles.iosPickerRow}>
                    <DateTimePicker
                      value={endDateTime}
                      mode="time"
                      display="compact"
                      themeVariant={scheme}
                      accentColor={theme.accent}
                      onChange={onChangeEndTime}
                    />
                  </View>
                ) : (
                  <Pressable onPress={() => setShowEndTimePicker(true)}>
                    <Text style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}>{endTimeLabel}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker value={dateTime} mode="date" display="default" onChange={onChangeDate} />
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker value={dateTime} mode="time" display="default" is24Hour={false} onChange={onChangeTime} />
        )}
        {Platform.OS === 'android' && showEndTimePicker && (
          <DateTimePicker value={endDateTime} mode="time" display="default" is24Hour={false} onChange={onChangeEndTime} />
        )}

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Pressable onPress={() => setAlertSlot(1)} style={styles.fieldRow}>
            <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>Alert</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 14.5 }}>{alertLabel(alert1)}</Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
          {alert1 !== 'none' && (
            <Pressable onPress={() => setAlertSlot(2)} style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>Second Alert</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 14.5 }}>{alertLabel(alert2)}</Text>
              <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>DETAILS</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes, links, or anything else..."
              placeholderTextColor={theme.textTertiary}
              multiline
              style={[styles.input, styles.notesInput, { color: theme.text, borderColor: 'transparent' }]}
            />
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>LOCATION (OPTIONAL)</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              onFocus={() => setLocationFocused(true)}
              onBlur={() => setTimeout(() => setLocationFocused(false), 150)}
              placeholder="Search for a place or address"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}
            />
          </View>
          {locationFocused && placesLoading && (
            <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={theme.textTertiary} />
            </View>
          )}
          {locationFocused &&
            !placesLoading &&
            placeSuggestions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setLocation(s.secondaryText ? `${s.primaryText}, ${s.secondaryText}` : s.primaryText);
                  setLocationFocused(false);
                }}
                style={[styles.sheetRow, styles.fieldBorder, { borderColor: theme.divider }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetRowLabel, { color: theme.text }]} numberOfLines={1}>
                    {s.primaryText}
                  </Text>
                  {!!s.secondaryText && (
                    <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                      {s.secondaryText}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          {!isPlacesSearchAvailable() && (
            <Text style={[styles.footnote, { color: theme.textTertiary, paddingHorizontal: 14, marginBottom: 0, paddingBottom: 12 }]}>
              Location suggestions are off — add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to enable them (see README).
            </Text>
          )}
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.textTertiary, marginBottom: 0 }]}>PHOTOS (OPTIONAL)</Text>
            <Text style={[styles.labelMeta, { color: theme.textTertiary }]}>
              {photoUris.length}/{MAX_PHOTOS}
            </Text>
          </View>
          <View style={styles.photoRow}>
            {photoUris.map((uri) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <Pressable onPress={() => removePhoto(uri)} style={[styles.photoRemoveDot, { backgroundColor: theme.danger }]}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>×</Text>
                </Pressable>
              </View>
            ))}
            {photoUris.length < MAX_PHOTOS && (
              <Pressable onPress={handlePickPhoto} style={[styles.photoPicker, { borderColor: theme.dividerStrong }]}>
                <CameraIcon size={18} color={theme.textTertiary} strokeWidth={1.8} />
                <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '600', marginTop: 4 }}>Add</Text>
              </Pressable>
            )}
          </View>
        </View>

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

        {editing ? (
          <Text style={[styles.footnote, { color: theme.textTertiary }]}>
            Repeat can only be set when creating a new plan. This edits just this occurrence.
          </Text>
        ) : (
          <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
            <Pressable onPress={() => setRepeatOpen(true)} style={styles.field}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>REPEAT</Text>
              <View style={styles.pickerRow}>
                <Text style={[styles.input, styles.pickerValue, { color: theme.text, borderColor: 'transparent' }]}>
                  {REPEAT_OPTIONS.find((o) => o.value === repeatType)?.label ?? 'Does not repeat'}
                </Text>
                <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
              </View>
            </Pressable>
            {repeatType !== 'none' && (
              <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>REPEAT UNTIL</Text>
                {Platform.OS === 'ios' ? (
                  <View style={styles.iosPickerRow}>
                    <DateTimePicker
                      value={repeatUntil ?? dateTime}
                      mode="date"
                      display="compact"
                      minimumDate={dateTime}
                      themeVariant={scheme}
                      accentColor={theme.accent}
                      onChange={onChangeRepeatUntil}
                    />
                  </View>
                ) : (
                  <Pressable onPress={() => setShowRepeatUntilPicker(true)}>
                    <Text style={[styles.input, { color: theme.text, borderColor: 'transparent' }]}>
                      {(repeatUntil ?? dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {Platform.OS === 'android' && showRepeatUntilPicker && (
          <DateTimePicker
            value={repeatUntil ?? dateTime}
            mode="date"
            display="default"
            minimumDate={dateTime}
            onChange={onChangeRepeatUntil}
          />
        )}

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
          <Pressable onPress={handleDuplicate} style={[styles.deleteBtn, { backgroundColor: theme.surface, borderColor: theme.divider, borderWidth: 1, marginBottom: 10 }]}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Duplicate Plan</Text>
          </Pressable>
        )}

        {editing && (
          <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft }]}>
            <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '700' }}>Delete Plan</Text>
          </Pressable>
        )}
      </ScrollView>

      <BottomSheet visible={alertSlot !== null} onClose={() => setAlertSlot(null)} title={alertSlot === 2 ? 'Second Alert' : 'Alert'}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10, marginBottom: 20 }]}>
          {ALERT_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              onPress={() => selectAlert(opt.value)}
              style={[styles.sheetRow, i > 0 && styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.sheetRowLabel, { color: theme.text }]}>{opt.label}</Text>
              {(alertSlot === 1 ? alert1 : alert2) === opt.value && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={repeatOpen} onClose={() => setRepeatOpen(false)} title="Repeat">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10, marginBottom: 20 }]}>
          {REPEAT_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setRepeatType(opt.value);
                if (opt.value !== 'none' && !repeatUntil) setRepeatUntil(dateTime);
                setRepeatOpen(false);
              }}
              style={[styles.sheetRow, i > 0 && styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.sheetRowLabel, { color: theme.text }]}>{opt.label}</Text>
              {repeatType === opt.value && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        title="New Group"
        left={
          <Pressable onPress={() => setNewGroupOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        }
        right={
          <Pressable onPress={handleCreateGroup} hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Save</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: 4 },
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldBorder: { borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4, textAlign: 'left' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  labelMeta: { fontSize: 11.5, fontWeight: '600' },
  input: { fontSize: 15.5, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2, textAlign: 'left' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  pickerValue: { flex: 1 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 },
  sheetRowLabel: { fontSize: 14.5, fontWeight: '600' },
  footnote: { fontSize: 12.5, lineHeight: 17, paddingHorizontal: 4, marginBottom: 14 },
  iosPickerRow: { alignItems: 'flex-start' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  addGroupChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteBtn: { padding: 14, borderRadius: Radii.md, alignItems: 'center' },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  timeRangeRow: { flexDirection: 'row' },
  timeRangeCol: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  timeRangeColBorder: { borderLeftWidth: 1 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  photoThumbWrap: { width: 84, height: 84 },
  photoThumb: { width: 84, height: 84, borderRadius: Radii.sm },
  photoRemoveDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPicker: {
    width: 84,
    height: 84,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
