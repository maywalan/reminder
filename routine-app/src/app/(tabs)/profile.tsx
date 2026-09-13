import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import {
  BellIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHalfIcon,
  DeviceIcon,
  GlobeIcon,
  GridIcon,
  PencilIcon,
  ShieldIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/icon';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { WidgetPreview } from '@/components/widget-preview';
import { FONT_SCALE_OPTIONS, Radii, RowMinHeight, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/use-auth-store';
import { usePlannerStore } from '@/store/use-planner-store';
import type { AlertStyle, Language, ThemeMode } from '@/store/types';
import { profileInitials } from '@/utils/profile';

const THEME_LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const LANGUAGE_LABEL: Record<Language, string> = { en: 'English', th: 'ไทย', zh: '中文' };
const LANGUAGE_SUB: Record<Language, string> = { en: 'English', th: 'Thai', zh: 'Chinese' };
const RECAP_HOURS = [6, 7, 8, 9, 10];

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePlannerStore((s) => s.profile);
  const settings = usePlannerStore((s) => s.settings);
  const updateSettings = usePlannerStore((s) => s.updateSettings);
  const resetData = usePlannerStore((s) => s.resetData);
  const authUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { toastMessage, showToast } = useToast();

  function handleClearData() {
    Alert.alert('Clear All Data?', 'This deletes every plan and group on this device. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All Data',
        style: 'destructive',
        onPress: () => {
          resetData();
          showToast('All data cleared');
        },
      },
    ]);
  }

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifOptionsOpen, setNotifOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);

  const recapHourLabel = settings.recapHour === 12 ? '12 PM' : `${settings.recapHour} AM`;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <View style={styles.profileHeader}>
          <Pressable onPress={() => router.push('/edit-profile')} style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
            <Text style={styles.avatarInitials}>{profileInitials(profile.name)}</Text>
            <View style={[styles.avatarEdit, { backgroundColor: theme.surface, borderColor: theme.bg }]}>
              <CameraIcon size={13} color={theme.accent} strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/edit-profile')} style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]}>{profile.name}</Text>
            <PencilIcon size={14} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.sub, { color: theme.textTertiary }]}>Tap photo or name to edit</Text>
        </View>

        {authUser ? (
          <View style={[styles.banner, { backgroundColor: theme.successSoft, borderColor: theme.successBorder }]}>
            <ShieldIcon size={18} color={theme.success} strokeWidth={1.8} />
            <Text style={[styles.bannerText, { color: theme.text }]} numberOfLines={1}>
              Signed in as {authUser.email}
            </Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: theme.accentSoft, borderColor: theme.dividerStrong }]}>
            <WarningIcon size={18} color={theme.accent} strokeWidth={1.8} />
            <Text style={[styles.bannerText, { color: theme.text }]}>Guest Mode — your data is stored only on this device.</Text>
            <Pressable onPress={() => router.push('/login')} hitSlop={6}>
              <Text style={[styles.bannerLink, { color: theme.accentStrong }]}>Log In</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>NOTIFICATIONS</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <BellIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Notifications</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <DeviceIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Live Activities</Text>
            <Switch
              value={settings.liveActivitiesEnabled}
              onValueChange={(v) => updateSettings({ liveActivitiesEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          <Pressable onPress={() => setNotifOptionsOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <BellIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Notification Options</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>PREFERENCES</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => setAppearanceOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <CircleHalfIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Appearance</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{THEME_LABEL[settings.themeMode]}</Text>
          </Pressable>
          <Pressable onPress={() => setFontSizeOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800' }}>A</Text>
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Font Size</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
              {FONT_SCALE_OPTIONS.find((o) => o.value === settings.fontScale)?.label}
            </Text>
          </Pressable>
          <Pressable onPress={() => setLanguageOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GlobeIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Language</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{LANGUAGE_LABEL[settings.language]}</Text>
          </Pressable>
          <Pressable onPress={() => setPrivacyOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <ShieldIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Data Privacy</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>IOS WIDGETS</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => setWidgetsOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GridIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Home Screen Widgets</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        {authUser && (
          <Pressable
            onPress={() => {
              signOut();
              showToast('Signed out');
            }}
            style={[styles.logOutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}>
            <Text style={{ color: theme.danger, fontSize: Typography.rowLabel, fontWeight: '700' }}>Log Out</Text>
          </Pressable>
        )}
      </ScrollView>

      <Toast message={toastMessage} />

      <BottomSheet visible={appearanceOpen} onClose={() => setAppearanceOpen(false)} title="Appearance">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode, i) => (
            <Pressable
              key={mode}
              onPress={() => {
                updateSettings({ themeMode: mode });
                setAppearanceOpen(false);
              }}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.rowLabel, { color: theme.text, flex: 1 }]}>{THEME_LABEL[mode]}</Text>
              {settings.themeMode === mode && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={fontSizeOpen} onClose={() => setFontSizeOpen(false)} title="Font Size">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          {FONT_SCALE_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                updateSettings({ fontScale: opt.value });
                setFontSizeOpen(false);
              }}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.rowLabel, { color: theme.text, fontSize: Typography.rowLabel * opt.value, flex: 1 }]}>{opt.label}</Text>
              {settings.fontScale === opt.value && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
        <Text style={[styles.footnote, { color: theme.textTertiary }]}>Applies throughout the app.</Text>
      </BottomSheet>

      <BottomSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title="Language">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          {(['th', 'en', 'zh'] as Language[]).map((lang, i) => (
            <Pressable
              key={lang}
              onPress={() => {
                updateSettings({ language: lang });
                setLanguageOpen(false);
              }}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{LANGUAGE_LABEL[lang]}</Text>
                <Text style={{ color: theme.text, fontSize: Typography.rowLabel, fontWeight: '600', marginTop: 4 }}>
                  {LANGUAGE_SUB[lang]}
                </Text>
              </View>
              {settings.language === lang && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
        <Text style={[styles.footnote, { color: theme.textTertiary }]}>
          Your choice is saved. Full in-app translation is coming in a later update.
        </Text>
      </BottomSheet>

      <BottomSheet
        visible={notifOptionsOpen}
        onClose={() => setNotifOptionsOpen(false)}
        title="Notification Options"
        left={
          <Pressable onPress={() => setNotifOptionsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.textSecondary, fontSize: Typography.rowLabel, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        }
        right={
          <Pressable onPress={() => setNotifOptionsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>Done</Text>
          </Pressable>
        }>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSettings({ soundEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Badges</Text>
            <Switch
              value={settings.badgesEnabled}
              onValueChange={(v) => updateSettings({ badgesEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
        </View>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>DAILY RECAP</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Morning Agenda</Text>
              <Text style={{ color: theme.textTertiary, fontSize: Typography.rowValue, marginTop: 1 }}>
                One notification listing that day&apos;s plans.
              </Text>
            </View>
            <Switch
              value={settings.recapEnabled}
              onValueChange={(v) => updateSettings({ recapEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          {settings.recapEnabled && (
            <View style={[styles.row, styles.rowBorder, styles.hourRow, { borderColor: theme.divider }]}>
              {RECAP_HOURS.map((hour) => {
                const active = settings.recapHour === hour;
                return (
                  <Pressable
                    key={hour}
                    onPress={() => updateSettings({ recapHour: hour })}
                    style={[styles.hourChip, { borderColor: active ? theme.accent : theme.divider, backgroundColor: active ? theme.accentSoft : 'transparent' }]}>
                    <Text style={{ color: active ? theme.accentStrong : theme.textSecondary, fontSize: Typography.rowValue, fontWeight: '700' }}>
                      {hour === 12 ? '12 PM' : `${hour} AM`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        <View style={[styles.previewCard, { backgroundColor: theme.accentSoft }]}>
          <Tickle size={40} mood={settings.recapEnabled ? 'idle' : 'off'} />
          <Text style={[styles.previewText, { color: theme.text }]}>
            {settings.recapEnabled
              ? `Every morning at ${recapHourLabel}, I'll tap you with that day's plans.`
              : "Turn Morning Agenda on and I'll tap you each morning with the day's plans."}
          </Text>
        </View>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>ALERT STYLE</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {(
            [
              { key: 'banners' as AlertStyle, label: 'Banners', sub: 'Appear briefly, then go away on their own.' },
              { key: 'persistent' as AlertStyle, label: 'Persistent', sub: 'Stay on screen until dismissed.' },
            ] as const
          ).map((opt, i) => (
            <Pressable
              key={opt.key}
              onPress={() => updateSettings({ alertStyle: opt.key })}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{opt.label}</Text>
                <Text style={{ color: theme.textTertiary, fontSize: Typography.rowValue, marginTop: 1 }}>{opt.sub}</Text>
              </View>
              {settings.alertStyle === opt.key && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Data Privacy"
        right={
          <Pressable onPress={() => setPrivacyOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>Close</Text>
          </Pressable>
        }>
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
          {authUser
            ? 'Your plans sync to your account so they’re available if you sign in elsewhere. Photos stay on this device — only a local reference is saved, not the image itself.'
            : 'You’re browsing as a guest — your plans are stored only on this device and nothing is uploaded.'}
        </Text>
        <Pressable onPress={() => Linking.openURL('https://maywalan.github.io/reminder/privacy.html')} hitSlop={4}>
          <Text style={[styles.privacyText, { color: theme.accentStrong, marginTop: -6 }]}>Read the full privacy policy</Text>
        </Pressable>
        <Pressable onPress={handleClearData} style={[styles.clearDataBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}>
          <TrashIcon size={16} color={theme.danger} strokeWidth={1.8} />
          <Text style={{ color: theme.danger, fontSize: Typography.rowLabel, fontWeight: '700' }}>Clear All Data</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={widgetsOpen}
        onClose={() => setWidgetsOpen(false)}
        title="Home Screen Widgets"
        right={
          <Pressable onPress={() => setWidgetsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>Done</Text>
          </Pressable>
        }>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.footnote, { color: theme.textSecondary, marginTop: 10 }]}>
            Preview only for now — real home-screen widgets need a native build (not available in Expo Go). Once added,
            long-press an empty area on your Home Screen, tap the + button, then search for Routine.
          </Text>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>MINI — TODAY&apos;S LIST</Text>
          <View style={styles.widgetWrap}>
            <WidgetPreview variant="mini" />
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>COMPACT — LIST WITH DETAILS</Text>
          <View style={styles.widgetWrap}>
            <WidgetPreview variant="compact" />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  avatar: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitials: { color: '#fff', fontSize: 27, fontWeight: '800' },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 27, height: 27, borderRadius: 13.5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: Typography.screenTitle, fontWeight: '800', letterSpacing: -0.2 },
  sub: { fontSize: Typography.label, fontWeight: '600', marginTop: 5 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: Typography.rowValue, fontWeight: '600', lineHeight: 16 },
  bannerLink: { fontSize: Typography.rowValue, fontWeight: '700' },
  sectionLabel: { fontSize: Typography.caption, fontWeight: '700', letterSpacing: 0.9, paddingHorizontal: 24, marginBottom: 8, marginTop: 6, textTransform: 'uppercase' },
  group: { borderRadius: Radii.card, borderWidth: 1, marginHorizontal: 20, overflow: 'hidden', marginBottom: Spacing.cardGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: RowMinHeight, paddingVertical: 9, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1 },
  rowIcon: { width: 30, height: 30, borderRadius: Radii.iconTile, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: Typography.rowLabel, fontWeight: '600', flex: 1 },
  rowValue: { fontSize: Typography.rowValue, marginRight: 4 },
  privacyText: { fontSize: Typography.rowValue, lineHeight: 20, marginTop: 12 },
  clearDataBtn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: Radii.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  logOutBtn: { padding: 14, borderRadius: Radii.button, borderWidth: 1, alignItems: 'center', marginHorizontal: 20, marginTop: 10 },
  footnote: { fontSize: Typography.rowValue, lineHeight: 17, marginTop: 10 },
  widgetWrap: { alignItems: 'center', marginBottom: 4 },
  hourRow: { gap: 8, flexWrap: 'wrap' },
  hourChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radii.chip, borderWidth: 1 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radii.card, padding: 13, marginBottom: Spacing.cardGap },
  previewText: { flex: 1, fontSize: Typography.rowValue, lineHeight: 17, fontWeight: '500' },
});
