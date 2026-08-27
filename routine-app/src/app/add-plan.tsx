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
import { CameraIcon, CheckIcon, ChevronRightIcon, XIcon } from '@/components/icon';
import { Toast } from '@/components/toast';
import { Radii, SwatchColors, Typography } from '@/constants/theme';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { uid, usePlannerStore } from '@/store/use-planner-store';
import { fmtTime12, fromISO, pad, toISO } from '@/utils/dates';
import {
  type CustomRepeatConfig,
  customRepeatLabel,
  defaultRepeatUntil,
  generateRepeatOccurrences,
  REPEAT_OPTIONS,
  type RepeatType,
  WEEKDAY_ABBR,
} from '@/utils/repeat';
import { COMMON_TIME_ZONES, deviceTimeZone, listTimeZones, timeZoneCityLabel, timeZoneOffsetLabel } from '@/utils/timezone';

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
  const { id, date: prefillDate } = useLocalSearchParams<{ id?: string; date?: string }>();

  const plans = usePlannerStore((s) => s.plans);
  const addPlan = usePlannerStore((s) => s.addPlan);
  const addPlans = usePlannerStore((s) => s.addPlans);
  const updatePlan = usePlannerStore((s) => s.updatePlan);
  const deletePlan = usePlannerStore((s) => s.deletePlan);
  const duplicatePlan = usePlannerStore((s) => s.duplicatePlan);
  const setPendingSaveToast = usePlannerStore((s) => s.setPendingSaveToast);

  const editing = useMemo(() => plans.find((p) => p.id === id), [plans, id]);
  const initialDate = editing?.date ?? prefillDate ?? toISO(new Date());

  const [name, setName] = useState(editing?.name ?? '');
  const [dateTime, setDateTime] = useState(() => combineDateAndTime(initialDate, editing?.time ?? '09:00'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [timeMode, setTimeMode] = useState<'specific' | 'range'>(editing?.endTime ? 'range' : 'specific');
  const [endDateTime, setEndDateTime] = useState(() =>
    combineDateAndTime(initialDate, editing?.endTime ?? editing?.time ?? '10:00')
  );
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [color, setColor] = useState(editing?.color ?? SwatchColors[0]);
  const [groupId] = useState<string | null>(editing?.groupId ?? null);
  const [live, setLive] = useState(editing?.live ?? false);
  const [alert1, setAlert1] = useState(editing?.alerts?.[0] ?? '5');
  const [alert2, setAlert2] = useState(editing?.alerts?.[1] ?? 'none');
  const [alert3, setAlert3] = useState(editing?.alerts?.[2] ?? 'none');
  // Alert1 defaults to '5' even on a brand-new plan, but Second Alert should only reveal once
  // the user has actually gone through the picker for Alert -- not just because of that preset.
  const [alert1Touched, setAlert1Touched] = useState(() => (editing?.alerts?.length ?? 0) > 0);
  const [alertSlot, setAlertSlot] = useState<1 | 2 | 3 | null>(null);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [showRepeatUntilPicker, setShowRepeatUntilPicker] = useState(false);
  const [customRepeatOpen, setCustomRepeatOpen] = useState(false);
  const [customRepeat, setCustomRepeat] = useState<CustomRepeatConfig>({ interval: 1, unit: 'week', weekdays: [] });
  const [timezone, setTimezone] = useState(editing?.timezone ?? deviceTimeZone());
  const [timeZoneOpen, setTimeZoneOpen] = useState(false);
  const [timeZoneQuery, setTimeZoneQuery] = useState('');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [locationFocused, setLocationFocused] = useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>(editing?.photoUris ?? []);
  const [error, setError] = useState(false);

  const { suggestions: placeSuggestions, loading: placesLoading } = usePlaceSearch(location);
  const filteredTimeZones = useMemo(() => {
    const q = timeZoneQuery.trim().toLowerCase();
    if (!q) return COMMON_TIME_ZONES;
    return listTimeZones().filter((tz) => tz.toLowerCase().includes(q.replace(/\s+/g, '_')) || timeZoneCityLabel(tz).toLowerCase().includes(q));
  }, [timeZoneQuery]);
  const { toastMessage, showToast } = useToast();

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
      showToast('Plan name required');
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
      alerts: [alert1, alert2, alert3].filter((a) => a !== 'none'),
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      photoUris,
      endTime,
      allDay,
      timezone,
    };
    if (editing) {
      updatePlan(editing.id, { ...common, date, time });
    } else if (repeatType !== 'none' && repeatUntil) {
      const occurrences = generateRepeatOccurrences(
        date,
        time,
        repeatType,
        toISO(repeatUntil),
        repeatType === 'custom' ? customRepeat : undefined
      );
      const repeatId = uid();
      addPlans(occurrences.map((o) => ({ ...common, date: o.date, time: o.time, repeatType, repeatId })));
    } else {
      addPlan({ ...common, date, time, repeatType: 'none' });
    }
    // Today's screen only lists today's plans, so a plan saved for another day won't visibly
    // appear there — without this, saving one looks like it silently failed. Today picks this
    // up on focus and surfaces it as a toast (see index.tsx).
    if (!editing && date !== toISO(new Date())) {
      const label = dateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setPendingSaveToast(`Saved "${name.trim()}" for ${label} — view it on Calendar`);
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

  function selectAlert(value: string) {
    if (alertSlot === 1) {
      setAlert1(value);
      setAlert1Touched(value !== 'none');
      if (value === 'none') {
        setAlert2('none');
        setAlert3('none');
      }
    } else if (alertSlot === 2) {
      setAlert2(value);
      if (value === 'none') setAlert3('none');
    } else if (alertSlot === 3) {
      setAlert3(value);
    }
    setAlertSlot(null);
  }

  function removeAlert(slot: 2 | 3) {
    if (slot === 2) {
      setAlert2('none');
      setAlert3('none');
    } else {
      setAlert3('none');
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ color: theme.textSecondary, fontSize: Typography.heading, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: Typography.title, fontWeight: '800' }}>{editing ? 'Edit Plan' : 'New Plan'}</Text>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={{ color: theme.accent, fontSize: Typography.heading, fontWeight: '700' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.field}>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(false);
              }}
              placeholder="Title"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { color: theme.text, borderColor: error ? theme.danger : 'transparent' }]}
            />
          </View>
          <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
            <TextInput
              value={location}
              onChangeText={setLocation}
              onFocus={() => setLocationFocused(true)}
              onBlur={() => setTimeout(() => setLocationFocused(false), 150)}
              placeholder="Location"
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
                    <Text style={{ color: theme.textTertiary, fontSize: Typography.body, marginTop: 1 }} numberOfLines={1}>
                      {s.secondaryText}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          {!allDay && (
            <View style={styles.field}>
              <View style={styles.segmentRow}>
                <Pressable
                  onPress={() => setTimeMode('specific')}
                  style={[styles.segment, { backgroundColor: timeMode === 'specific' ? theme.accent : theme.surface2, borderColor: theme.divider }]}>
                  <Text style={{ color: timeMode === 'specific' ? '#fff' : theme.text, fontSize: Typography.body, fontWeight: '700' }}>
                    Specific Time
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTimeMode('range')}
                  style={[styles.segment, { backgroundColor: timeMode === 'range' ? theme.accent : theme.surface2, borderColor: theme.divider }]}>
                  <Text style={{ color: timeMode === 'range' ? '#fff' : theme.text, fontSize: Typography.body, fontWeight: '700' }}>Time Range</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={[styles.fieldRow, !allDay && styles.fieldBorder, { borderColor: theme.divider }]}>
            <Text style={{ flex: 1, color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>All Day</Text>
            <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: theme.success }} />
          </View>

          {allDay ? (
            <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
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
          ) : timeMode === 'specific' ? (
            <View style={[styles.timeRangeRow, styles.fieldBorder, { borderColor: theme.divider }]}>
              <View style={styles.timeRangeCol}>
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
              <View style={[styles.timeRangeCol, styles.timeRangeColBorder, { borderColor: theme.divider }]}>
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
          ) : (
            <>
              <View style={[styles.field, styles.fieldBorder, { borderColor: theme.divider }]}>
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
            </>
          )}

          <Pressable onPress={() => setTimeZoneOpen(true)} style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
            <Text style={{ flex: 1, color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>Time Zone</Text>
            <Text style={{ color: theme.textTertiary, fontSize: Typography.heading }} numberOfLines={1}>
              {timeZoneCityLabel(timezone)}
            </Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>

          <Pressable onPress={() => setAlertSlot(1)} style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
            <Text style={{ flex: 1, color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>Alert</Text>
            <Text style={{ color: theme.textTertiary, fontSize: Typography.heading }}>{alertLabel(alert1)}</Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
          {alert1Touched && (
            <Pressable onPress={() => setAlertSlot(2)} style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={{ flex: 1, color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>Second Alert</Text>
              <Text style={{ color: theme.textTertiary, fontSize: Typography.heading }}>{alertLabel(alert2)}</Text>
              {alert2 !== 'none' && (
                <Pressable onPress={() => removeAlert(2)} hitSlop={8} style={styles.removeAlertBtn}>
                  <XIcon size={14} color={theme.textTertiary} strokeWidth={2.2} />
                </Pressable>
              )}
              <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
            </Pressable>
          )}
          {alert1Touched && alert2 !== 'none' && (
            <Pressable onPress={() => setAlertSlot(3)} style={[styles.fieldRow, styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={{ flex: 1, color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>Third Alert</Text>
              <Text style={{ color: theme.textTertiary, fontSize: Typography.heading }}>{alertLabel(alert3)}</Text>
              {alert3 !== 'none' && (
                <Pressable onPress={() => removeAlert(3)} hitSlop={8} style={styles.removeAlertBtn}>
                  <XIcon size={14} color={theme.textTertiary} strokeWidth={2.2} />
                </Pressable>
              )}
              <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
            </Pressable>
          )}
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
                  {repeatType === 'custom' ? customRepeatLabel(customRepeat) : (REPEAT_OPTIONS.find((o) => o.value === repeatType)?.label ?? 'Does not repeat')}
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
              <Text style={{ color: theme.text, fontSize: Typography.heading, fontWeight: '600' }}>Live Activity</Text>
              <Text style={{ color: theme.textSecondary, fontSize: Typography.body, marginTop: 2 }}>
                Show a live countdown on the home screen as this plan approaches.
              </Text>
            </View>
            <Switch value={live} onValueChange={setLive} trackColor={{ true: theme.success }} />
          </View>
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
                <Text style={{ color: theme.textSecondary, fontSize: Typography.label, fontWeight: '600', marginTop: 4 }}>Add</Text>
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

        {editing && (
          <Pressable onPress={handleDuplicate} style={[styles.deleteBtn, { backgroundColor: theme.surface, borderColor: theme.divider, borderWidth: 1, marginBottom: 10 }]}>
            <Text style={{ color: theme.accent, fontSize: Typography.heading, fontWeight: '700' }}>Duplicate Plan</Text>
          </Pressable>
        )}

        {editing && (
          <Pressable onPress={handleDelete} style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft }]}>
            <Text style={{ color: theme.danger, fontSize: Typography.heading, fontWeight: '700' }}>Delete Plan</Text>
          </Pressable>
        )}
      </ScrollView>

      <Toast message={toastMessage} />

      <BottomSheet
        visible={alertSlot !== null}
        onClose={() => setAlertSlot(null)}
        title={alertSlot === 3 ? 'Third Alert' : alertSlot === 2 ? 'Second Alert' : 'Alert'}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10, marginBottom: 20 }]}>
          {ALERT_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              onPress={() => selectAlert(opt.value)}
              style={[styles.sheetRow, i > 0 && styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.sheetRowLabel, { color: theme.text }]}>{opt.label}</Text>
              {(alertSlot === 1 ? alert1 : alertSlot === 2 ? alert2 : alert3) === opt.value && (
                <CheckIcon size={16} color={theme.accent} strokeWidth={3} />
              )}
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
                if (opt.value === 'custom') {
                  setRepeatUntil(defaultRepeatUntil(dateTime, 'custom', customRepeat));
                  setRepeatOpen(false);
                  setCustomRepeatOpen(true);
                  return;
                }
                if (opt.value !== 'none') setRepeatUntil(defaultRepeatUntil(dateTime, opt.value));
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
        visible={customRepeatOpen}
        onClose={() => setCustomRepeatOpen(false)}
        title="Custom Repeat"
        right={
          <Pressable
            onPress={() => {
              setRepeatUntil(defaultRepeatUntil(dateTime, 'custom', customRepeat));
              setCustomRepeatOpen(false);
            }}
            hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: Typography.heading, fontWeight: '700' }}>Done</Text>
          </Pressable>
        }>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>EVERY</Text>
            <View style={styles.intervalRow}>
              <Pressable
                onPress={() => setCustomRepeat((c) => ({ ...c, interval: Math.max(1, c.interval - 1) }))}
                style={[styles.stepBtn, { borderColor: theme.divider }]}>
                <Text style={{ color: theme.text, fontSize: Typography.heading, fontWeight: '700' }}>−</Text>
              </Pressable>
              <Text style={[styles.intervalValue, { color: theme.text }]}>{customRepeat.interval}</Text>
              <Pressable
                onPress={() => setCustomRepeat((c) => ({ ...c, interval: Math.min(30, c.interval + 1) }))}
                style={[styles.stepBtn, { borderColor: theme.divider }]}>
                <Text style={{ color: theme.text, fontSize: Typography.heading, fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
          {(['day', 'week', 'month'] as const).map((unit, i) => (
            <Pressable
              key={unit}
              onPress={() => setCustomRepeat((c) => ({ ...c, unit }))}
              style={[styles.sheetRow, i > 0 && styles.fieldBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.sheetRowLabel, { color: theme.text, textTransform: 'capitalize' }]}>{unit}{customRepeat.interval > 1 ? 's' : ''}</Text>
              {customRepeat.unit === unit && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>

        {customRepeat.unit === 'week' && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>ON THESE DAYS</Text>
            <View style={styles.weekdayRow}>
              {WEEKDAY_ABBR.map((label, wd) => {
                const active = customRepeat.weekdays.includes(wd);
                return (
                  <Pressable
                    key={wd}
                    onPress={() =>
                      setCustomRepeat((c) => ({
                        ...c,
                        weekdays: c.weekdays.includes(wd) ? c.weekdays.filter((d) => d !== wd) : [...c.weekdays, wd],
                      }))
                    }
                    style={[styles.weekdayChip, { borderColor: active ? theme.accent : theme.divider, backgroundColor: active ? theme.accentSoft : 'transparent' }]}>
                    <Text style={{ color: active ? theme.accent : theme.textSecondary, fontSize: Typography.body, fontWeight: '700' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.footnote, { color: theme.textTertiary }]}>Leave none selected to repeat on {WEEKDAY_ABBR[dateTime.getDay()]} only.</Text>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        visible={timeZoneOpen}
        onClose={() => {
          setTimeZoneOpen(false);
          setTimeZoneQuery('');
        }}
        title="Time Zone"
        right={
          <Pressable
            onPress={() => {
              setTimeZoneOpen(false);
              setTimeZoneQuery('');
            }}
            hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: Typography.heading, fontWeight: '700' }}>Done</Text>
          </Pressable>
        }>
        <View style={[styles.field, { paddingHorizontal: 0 }]}>
          <TextInput
            value={timeZoneQuery}
            onChangeText={setTimeZoneQuery}
            placeholder="Search city or region"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, styles.searchInput, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.surface2 }]}
          />
        </View>
        <ScrollView style={styles.timeZoneList} showsVerticalScrollIndicator={false}>
          <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginBottom: 20 }]}>
            {filteredTimeZones.map((tz, i) => (
              <Pressable
                key={tz}
                onPress={() => {
                  setTimezone(tz);
                  setTimeZoneOpen(false);
                  setTimeZoneQuery('');
                }}
                style={[styles.sheetRow, i > 0 && styles.fieldBorder, { borderColor: theme.divider }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetRowLabel, { color: theme.text }]}>{timeZoneCityLabel(tz)}</Text>
                  <Text style={{ color: theme.textTertiary, fontSize: Typography.body, marginTop: 1 }}>{tz}</Text>
                </View>
                <Text style={{ color: theme.textTertiary, fontSize: Typography.body, marginRight: 8 }}>{timeZoneOffsetLabel(tz)}</Text>
                {timezone === tz && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
              </Pressable>
            ))}
            {filteredTimeZones.length === 0 && (
              <Text style={[styles.footnote, { color: theme.textTertiary, marginBottom: 0 }]}>No matching time zones.</Text>
            )}
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: 20 },
  group: { borderRadius: Radii.md, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldBorder: { borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  removeAlertBtn: { padding: 2 },
  label: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4, textAlign: 'left' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  labelMeta: { fontSize: Typography.label, fontWeight: '600' },
  input: { fontSize: Typography.heading, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingVertical: 2, textAlign: 'left' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  pickerValue: { flex: 1 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 },
  sheetRowLabel: { fontSize: Typography.heading, fontWeight: '600' },
  footnote: { fontSize: Typography.body, lineHeight: 17, paddingHorizontal: 4, marginBottom: 14 },
  sectionLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intervalValue: { fontSize: Typography.title, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 8 },
  weekdayChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchInput: { borderWidth: 1, borderRadius: Radii.sm, paddingHorizontal: 12, paddingVertical: 9, marginTop: 6, marginBottom: 10 },
  timeZoneList: { maxHeight: 380 },
  iosPickerRow: { alignItems: 'flex-start' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
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
