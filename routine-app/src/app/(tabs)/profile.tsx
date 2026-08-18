import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
  WarningIcon,
} from '@/components/icon';
import { Toast } from '@/components/toast';
import { WidgetPreview } from '@/components/widget-preview';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { usePlannerStore } from '@/store/use-planner-store';
import type { AlertStyle, Language, ThemeMode } from '@/store/types';
import { profileInitials } from '@/utils/profile';

const THEME_LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const LANGUAGE_LABEL: Record<Language, string> = { en: 'English', th: 'ไทย', zh: '中文' };
const LANGUAGE_SUB: Record<Language, string> = { en: 'English', th: 'Thai', zh: 'Chinese' };

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePlannerStore((s) => s.profile);
  const settings = usePlannerStore((s) => s.settings);
  const updateSettings = usePlannerStore((s) => s.updateSettings);
  const resetData = usePlannerStore((s) => s.resetData);
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
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifOptionsOpen, setNotifOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <View style={styles.profileHeader}>
          <Pressable onPress={() => router.push('/edit-profile')} style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
            <Text style={styles.avatarInitials}>{profileInitials(profile.name)}</Text>
            <View style={[styles.avatarEdit, { backgroundColor: theme.surface, borderColor: theme.bg }]}>
              <CameraIcon size={14} color={theme.accentStrong} strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push('/edit-profile')} style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]}>{profile.name}</Text>
            <PencilIcon size={15} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.sub, { color: theme.textTertiary }]}>Tap photo or name to edit</Text>
        </View>

        <View style={[styles.guestBanner, { backgroundColor: theme.accentSoft, borderColor: theme.divider }]}>
          <WarningIcon size={18} color={theme.accentStrong} strokeWidth={1.8} />
          <Text style={[styles.guestText, { color: theme.text }]}>Guest Mode — your data is stored only on this device.</Text>
          <Pressable onPress={() => showToast("Accounts aren't available yet")} hitSlop={6}>
            <Text style={[styles.guestLogin, { color: theme.accentStrong }]}>Log In</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>NOTIFICATIONS</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <BellIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Notifications</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
              trackColor={{ true: theme.success }}
            />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <DeviceIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Live Activities</Text>
            <Switch
              value={settings.liveActivitiesEnabled}
              onValueChange={(v) => updateSettings({ liveActivitiesEnabled: v })}
              trackColor={{ true: theme.success }}
            />
          </View>
          <Pressable onPress={() => setNotifOptionsOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GridIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Notification Options</Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>PREFERENCES</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Pressable onPress={() => setAppearanceOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <CircleHalfIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Appearance</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 13, marginRight: 4 }}>{THEME_LABEL[settings.themeMode]}</Text>
          </Pressable>
          <Pressable onPress={() => setLanguageOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GlobeIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Language</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 13, marginRight: 4 }}>{LANGUAGE_LABEL[settings.language]}</Text>
          </Pressable>
          <Pressable onPress={() => setPrivacyOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <ShieldIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Data Privacy</Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>IOS WIDGETS</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
          <Pressable onPress={() => setWidgetsOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GridIcon size={16} color={theme.accentStrong} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Home Screen Widgets</Text>
            <ChevronRightIcon size={16} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>

      <Toast message={toastMessage} />

      <BottomSheet visible={appearanceOpen} onClose={() => setAppearanceOpen(false)} title="Appearance">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
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

      <BottomSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title="Language">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
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
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 1 }}>{LANGUAGE_SUB[lang]}</Text>
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
            <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        }
        right={
          <Pressable onPress={() => setNotifOptionsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Done</Text>
          </Pressable>
        }>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider, marginTop: 10 }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSettings({ soundEnabled: v })}
              trackColor={{ true: theme.success }}
            />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Badges</Text>
            <Switch
              value={settings.badgesEnabled}
              onValueChange={(v) => updateSettings({ badgesEnabled: v })}
              trackColor={{ true: theme.success }}
            />
          </View>
        </View>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>ALERT STYLE</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
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
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 1 }}>{opt.sub}</Text>
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
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Close</Text>
          </Pressable>
        }>
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
          Your plans are stored only on this device — Routine doesn&apos;t have a backend yet, so nothing is uploaded or synced.
          Sharing a calendar or account sync will require a future update.
        </Text>
        <Pressable onPress={handleClearData} style={[styles.clearDataBtn, { backgroundColor: theme.dangerSoft }]}>
          <Text style={{ color: theme.danger, fontSize: 15, fontWeight: '700' }}>Clear All Data</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={widgetsOpen}
        onClose={() => setWidgetsOpen(false)}
        title="Home Screen Widgets"
        right={
          <Pressable onPress={() => setWidgetsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>Done</Text>
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
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitials: { color: '#fff', fontSize: 30, fontWeight: '800' },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.2 },
  sub: { fontSize: 12.5, fontWeight: '600', marginTop: 5 },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  guestText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  guestLogin: { fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 24, marginBottom: 8, marginTop: 6 },
  group: { borderRadius: Radii.md, borderWidth: 1, marginHorizontal: 20, overflow: 'hidden', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14.5, fontWeight: '600', flex: 1 },
  privacyText: { fontSize: 13.5, lineHeight: 20, marginTop: 12 },
  clearDataBtn: { padding: 14, borderRadius: Radii.md, alignItems: 'center', marginTop: 16 },
  footnote: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  widgetWrap: { alignItems: 'center', marginBottom: 4 },
});
