import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollEdgeFades } from '@/components/scroll-edge-fades';
import { Text } from '@/components/text';
import { BottomSheet } from '@/components/bottom-sheet';
import {
  BellIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHalfIcon,
  DeviceIcon,
  DocumentIcon,
  GlobeIcon,
  GridIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  ShieldIcon,
  SlidersIcon,
  SparkleIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/icon';
import { useHomeTokens } from '@/components/home/tokens';
import { Tickle } from '@/components/tickle';
import { Toast } from '@/components/toast';
import { ProfileAvatar } from '@/components/profile-avatar';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { WidgetPreview } from '@/components/widget-preview';
import { PRIVACY_URL, termsUrl } from '@/constants/legal';
import { Radii, RowMinHeight, Spacing, SwatchColors, Typography } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { useToast } from '@/hooks/use-toast';
import { refreshSubscriptionState } from '@/lib/iap';
import { getNotificationPermissionStatus, requestNotificationPermissions } from '@/lib/notifications';
import { useAuthStore } from '@/store/use-auth-store';
import { useOnboardingStore } from '@/store/use-onboarding-store';
import { usePlannerStore } from '@/store/use-planner-store';
import { lang, t } from '@/i18n';
import { fmtTime, uses12hTime } from '@/i18n/format';
import type { StringKey } from '@/i18n/strings';
import type { Language, ThemeMode } from '@/store/types';
import { toISO } from '@/utils/dates';
import { useTestToolsAllowed } from '@/utils/testers';
import { SUBSCRIPTION_STATES, subscriptionStateLabel } from '@/utils/subscription';

const THEME_LABEL: Record<ThemeMode, StringKey> = { light: 'theme.light', dark: 'theme.dark', system: 'theme.system' };
const LANGUAGE_LABEL: Record<Language, string> = { en: 'English', th: 'ไทย', zh: '中文' };
const LANGUAGE_FLAG: Record<Language, string> = { en: '🇺🇸', th: '🇹🇭', zh: '🇨🇳' };
const SELECTABLE_LANGUAGES: Language[] = ['en', 'th'];
const SUPPORT_EMAIL = 'tickle.daily.app@gmail.com';
const APP_VERSION = Constants.expoConfig?.version ?? '';

export default function ProfileScreen() {
  const theme = useTheme();
  // Tinted like the other tabs, so the white groups read as cards (critique, 2026-11-01).
  const page = useHomeTokens().page;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Tapping this tab again while on it scrolls back to the top.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const profile = usePlannerStore((s) => s.profile);
  const settings = usePlannerStore((s) => s.settings);
  const updateSettings = usePlannerStore((s) => s.updateSettings);
  const resetData = usePlannerStore((s) => s.resetData);
  const addPlans = usePlannerStore((s) => s.addPlans);
  const mockSubscriptionState = usePlannerStore((s) => s.mockSubscriptionState);
  const subscriptionTestOverride = usePlannerStore((s) => s.subscriptionTestOverride);
  const setSubscriptionTestOverride = usePlannerStore((s) => s.setSubscriptionTestOverride);
  const setMockSubscriptionState = usePlannerStore((s) => s.setMockSubscriptionState);
  const authUser = useAuthStore((s) => s.user);
  const showTestTools = useTestToolsAllowed();
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const { toastMessage, showToast } = useToast();

  // The switch shows ON only when our setting is on AND iOS has granted permission. The setting
  // defaults to true, so showing it alone read "on" while iOS was never asked and nothing fired.
  const { granted: osGranted, refresh: refreshPermission } = useNotificationPermission();
  const notificationsOn = settings.notificationsEnabled && osGranted === true;

  // Turning it on checks the real permission: asks iOS if it never has, or sends the user to
  // Settings after a denial (iOS won't show its popup twice).
  async function handleNotificationsToggle(value: boolean) {
    if (!value) {
      updateSettings({ notificationsEnabled: false });
      return;
    }
    const { status, canAskAgain } = await getNotificationPermissionStatus();
    if (status === 'granted') {
      updateSettings({ notificationsEnabled: true });
      refreshPermission();
      return;
    }
    if (canAskAgain) {
      const granted = await requestNotificationPermissions();
      updateSettings({ notificationsEnabled: granted });
      refreshPermission();
      return;
    }
    // Keep the setting on, so the switch turns on by itself once they allow it in Settings.
    updateSettings({ notificationsEnabled: true });
    Alert.alert(t('profile.notifOffTitle'), t('profile.notifOffBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
    ]);
  }

  // Testing tool (dev builds and tester accounts): replays the launch flow without reinstalling.
  function handleReplayOnboarding() {
    useOnboardingStore.setState({ hasCompletedOnboarding: false, hasChosenGuest: false });
    router.replace('/onboarding-1');
  }

  /**
   * Testing tool: plans that use real New Plan alert options, plus the daily recap moved to the next
   * minute. The two soon ones fire within ~7 minutes; the later ones only check scheduling.
   */
  function handleTestReminders() {
    const at = (min: number) => {
      const d = new Date(Date.now() + min * 60_000);
      return { date: toISO(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
    };
    const inDays = (n: number, time: string) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return { date: toISO(d), time };
    };
    const base = { live: false, groupId: null, repeatType: 'none' };
    const th = settings.language === 'th';
    addPlans([
      { ...base, ...at(6), name: th ? 'ประชุมทีมเช้า' : 'Team standup', alerts: ['0', '5'], color: SwatchColors[0], icon: 'people' },
      { ...base, ...at(7), name: th ? 'โทรหาแม่' : 'Call Mom', alerts: ['0'], color: SwatchColors[4] },
      { ...base, ...inDays(8, '10:00'), name: th ? 'หาหมอฟัน' : 'Dentist', alerts: ['15', '120', '1440', '10080'], color: SwatchColors[6] },
      { ...base, ...inDays(2, '00:00'), allDay: true, name: th ? 'เที่ยวเชียงใหม่' : 'Songkran trip', alerts: ['5', '15', '1440'], color: SwatchColors[2] },
    ]);
    const recap = new Date(Date.now() + 60_000);
    updateSettings({ recapEnabled: true, recapHour: recap.getHours(), recapMinute: recap.getMinutes() });
    showToast('Test reminders added: recap in ~1 min, plans in 1, 6 and 7 min');
  }

  function handleClearData() {
    Alert.alert(t('profile.clearTitle'), t('profile.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.clearAll'),
        style: 'destructive',
        onPress: () => {
          resetData();
          showToast(t('profile.cleared'));
        },
      },
    ]);
  }

  const [deletingAccount, setDeletingAccount] = useState(false);

  // App Store Guideline 5.1.1(v): accounts made in the app must be deletable in the app.
  function handleDeleteAccount() {
    Alert.alert(t('profile.deleteAccountTitle'), t('profile.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteAccountConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeletingAccount(true);
          const { error } = await deleteAccount();
          setDeletingAccount(false);
          if (error) {
            showToast(error);
            return;
          }
          setPrivacyOpen(false);
          showToast(t('profile.accountDeleted'));
        },
      },
    ]);
  }

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notifOptionsOpen, setNotifOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [subscriptionStateOpen, setSubscriptionStateOpen] = useState(false);

  const scheme = useEffectiveScheme();
  const recapMinute = settings.recapMinute ?? 0;
  const recapTimeLabel = fmtTime(`${settings.recapHour}:${String(recapMinute).padStart(2, '0')}`);
  const recapDate = new Date();
  recapDate.setHours(settings.recapHour, recapMinute, 0, 0);
  const pickerLocale = lang() === 'th' ? 'th-TH' : uses12hTime() ? 'en-US' : 'en-GB';

  return (
    <View style={[styles.screen, { backgroundColor: page }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: 130 }}>
        <View style={styles.profileHeader}>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.photoChange')}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
            <ProfileAvatar name={profile.name} avatarColor={profile.avatarColor} photo={profile.photo} size={74} />
            <View style={[styles.avatarEdit, { backgroundColor: theme.surface, borderColor: theme.surface }]}>
              <CameraIcon size={13} color={theme.accent} strokeWidth={2} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityHint={t('profile.tapToEdit')}
            style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]}>{profile.name}</Text>
            <PencilIcon size={14} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
          {/* The account status is one line under the name, not a full-width banner (critique, 2026-11-01). */}
          {authUser ? (
            <View style={styles.accountLine}>
              <ShieldIcon size={13} color={theme.success} strokeWidth={2} />
              <Text style={[styles.accountText, { color: theme.textSecondary }]} numberOfLines={1}>
                {t('profile.signedInAs', { email: authUser.email ?? '' })}
              </Text>
            </View>
          ) : (
            <View style={styles.accountLine}>
              <WarningIcon size={13} color={theme.textTertiary} strokeWidth={2} />
              <Text style={[styles.accountText, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {t('profile.guestShort')}
              </Text>
              <Pressable onPress={() => router.push({ pathname: '/login', params: { from: 'profile' } })} hitSlop={10} accessibilityRole="button">
                <Text style={[styles.accountLink, { color: theme.accentStrong }]}>{t('profile.logIn')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <UpgradeBanner />

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{t('profile.section.notifications')}</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <BellIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.notifications')}</Text>
            <Switch
              value={notificationsOn}
              onValueChange={handleNotificationsToggle}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <DeviceIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.liveActivities')}</Text>
            <Switch
              value={settings.liveActivitiesEnabled}
              onValueChange={(v) => updateSettings({ liveActivitiesEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          <Pressable onPress={() => setNotifOptionsOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <SlidersIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.notifOptions')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{t('profile.section.preferences')}</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => setAppearanceOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <CircleHalfIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.appearance')}</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{t(THEME_LABEL[settings.themeMode])}</Text>
          </Pressable>
          <Pressable onPress={() => setLanguageOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GlobeIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.language')}</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
              {LANGUAGE_FLAG[settings.language]} {LANGUAGE_LABEL[settings.language]}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPrivacyOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <ShieldIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.dataPrivacy')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{t('profile.section.subscription')}</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => router.push('/subscription')} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <SparkleIcon size={16} color={theme.accent} strokeWidth={1.8} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.manageSub')}</Text>
            <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{subscriptionStateLabel(mockSubscriptionState)}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{t('profile.section.widgets')}</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => setWidgetsOpen(true)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <GridIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.widgets')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>{t('profile.section.help')}</Text>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Tickle ${APP_VERSION}`)}`)} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <MailIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.contactSupport')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL(termsUrl())} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <DocumentIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.terms')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
              <LockIcon size={16} color={theme.accent} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.privacyPolicyRow')}</Text>
            <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Dev builds and tester accounts only (utils/testers): never shown to regular users.
            Subscription State overrides what StoreKit reports on this device only. */}
        {showTestTools && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>TESTING</Text>
            <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Pressable onPress={handleReplayOnboarding} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
                  <SparkleIcon size={16} color={theme.accent} strokeWidth={1.8} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Replay Onboarding</Text>
                <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
              </Pressable>
              <Pressable onPress={handleTestReminders} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
                <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
                  <BellIcon size={16} color={theme.accent} strokeWidth={2} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Add Test Reminders</Text>
                <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
              </Pressable>
              {/* Forces an entitlement state over what StoreKit reports, on this device only. */}
              <Pressable onPress={() => setSubscriptionStateOpen(true)} style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
                <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
                  <SparkleIcon size={16} color={theme.accent} strokeWidth={1.8} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Subscription State</Text>
                <Text style={[styles.rowValue, { color: theme.textTertiary }]}>
                  {subscriptionTestOverride ? subscriptionStateLabel(mockSubscriptionState) : 'Real'}
                </Text>
                <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
              </Pressable>
            </View>
          </>
        )}

        {authUser && (
          <Pressable
            onPress={() => {
              signOut();
              showToast(t('profile.signedOut'));
            }}
            style={[styles.logOutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}>
            <Text style={{ color: theme.danger, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('profile.logOut')}</Text>
          </Pressable>
        )}
        <Text style={[styles.version, { color: theme.textTertiary }]}>{t('profile.version', { version: APP_VERSION })}</Text>
      </ScrollView>
      <ScrollEdgeFades color={page} />

      <Toast message={toastMessage} />

      <BottomSheet visible={subscriptionStateOpen} onClose={() => setSubscriptionStateOpen(false)} title="Subscription State">
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          <Pressable
            onPress={() => {
              setSubscriptionTestOverride(false);
              refreshSubscriptionState();
              setSubscriptionStateOpen(false);
            }}
            style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text, flex: 1 }]}>Real (from StoreKit)</Text>
            {!subscriptionTestOverride && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
          </Pressable>
          {SUBSCRIPTION_STATES.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setSubscriptionTestOverride(true);
                setMockSubscriptionState(s);
                setSubscriptionStateOpen(false);
              }}
              style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.rowLabel, { color: theme.text, flex: 1 }]}>{subscriptionStateLabel(s)}</Text>
              {subscriptionTestOverride && mockSubscriptionState === s && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
        <Text style={[styles.footnote, { color: theme.textTertiary }]}>
          Testing only — forces a state over what StoreKit reports, so you can preview locks and the Subscription screen. Pick Real to go back.
        </Text>
      </BottomSheet>

      <BottomSheet visible={appearanceOpen} onClose={() => setAppearanceOpen(false)} title={t('profile.appearance')}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode, i) => (
            <Pressable
              key={mode}
              onPress={() => {
                updateSettings({ themeMode: mode });
                setAppearanceOpen(false);
              }}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.rowLabel, { color: theme.text, flex: 1 }]}>{t(THEME_LABEL[mode])}</Text>
              {settings.themeMode === mode && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title={t('profile.language')}>
        <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          {SELECTABLE_LANGUAGES.map((lang, i) => (
            <Pressable
              key={lang}
              onPress={() => {
                updateSettings({ language: lang });
                setLanguageOpen(false);
              }}
              style={[styles.row, i > 0 && styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={styles.languageFlag}>{LANGUAGE_FLAG[lang]}</Text>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{LANGUAGE_LABEL[lang]}</Text>
              {settings.language === lang && <CheckIcon size={16} color={theme.accent} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={notifOptionsOpen}
        onClose={() => setNotifOptionsOpen(false)}
        title={t('profile.notifOptions')}
        // Every change saves as it's made (like iOS Settings), so there's nothing for a Cancel to undo.
        right={
          <Pressable onPress={() => setNotifOptionsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('common.done')}</Text>
          </Pressable>
        }>
        <View style={[styles.group, styles.sheetGroup, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginTop: 10 }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.sound')}</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSettings({ soundEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
        </View>
        <Text style={[styles.sectionLabel, styles.sheetLabel, { color: theme.textTertiary }]}>{t('profile.section.dailyRecap')}</Text>
        <View style={[styles.group, styles.sheetGroup, styles.sheetGroupTight, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, styles.stackedLabel, { color: theme.text }]}>{t('profile.morningAgenda')}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: Typography.rowValue, marginTop: 1 }}>
                {t('profile.morningAgendaSub')}
              </Text>
            </View>
            <Switch
              value={settings.recapEnabled}
              onValueChange={(v) => updateSettings({ recapEnabled: v })}
              trackColor={{ true: theme.success, false: theme.switchOff }}
            />
          </View>
          {settings.recapEnabled && (
            <View style={[styles.row, styles.rowBorder, { borderColor: theme.divider }]}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{t('profile.recapTime')}</Text>
              <DateTimePicker
                value={recapDate}
                mode="time"
                display="compact"
                locale={pickerLocale}
                themeVariant={scheme}
                accentColor={theme.accent}
                onChange={(_, d) => d && updateSettings({ recapHour: d.getHours(), recapMinute: d.getMinutes() })}
              />
            </View>
          )}
        </View>
        <View style={[styles.previewCard, styles.sheetGroup, { backgroundColor: theme.accentSoft }]}>
          <Tickle size={40} mood={settings.recapEnabled ? 'idle' : 'off'} />
          <Text style={[styles.previewText, { color: theme.text }]}>
            {settings.recapEnabled
              ? t('profile.agendaOn', { time: recapTimeLabel })
              : t('profile.agendaOff')}
          </Text>
        </View>
        {/* Banner vs. persistent, lock screen and grouping are only settable by the user in iOS Settings. */}
        <View style={[styles.group, styles.sheetGroup, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => Linking.openSettings()} accessibilityRole="link" style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, styles.stackedLabel, { color: theme.text }]}>{t('profile.iosNotifSettings')}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: Typography.rowValue, marginTop: 1 }}>{t('profile.iosNotifSettingsSub')}</Text>
            </View>
            <ChevronRightIcon size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title={t('profile.dataPrivacy')}
        right={
          <Pressable onPress={() => setPrivacyOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('common.close')}</Text>
          </Pressable>
        }>
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
          {authUser
            ? t('profile.privacySynced')
            : t('profile.privacyGuest')}
        </Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={4}>
          <Text style={[styles.privacyText, { color: theme.accentStrong, marginTop: -6 }]}>{t('profile.privacyPolicy')}</Text>
        </Pressable>
        <Pressable onPress={handleClearData} style={[styles.clearDataBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder }]}>
          <TrashIcon size={16} color={theme.danger} strokeWidth={1.8} />
          <Text style={{ color: theme.danger, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('profile.clearAll')}</Text>
        </Pressable>
        {authUser && (
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            hitSlop={4}
            style={[styles.deleteAccountBtn, deletingAccount && { opacity: 0.5 }]}>
            {deletingAccount ? (
              <ActivityIndicator size="small" color={theme.danger} />
            ) : (
              <Text style={{ color: theme.danger, fontSize: Typography.rowLabel, fontWeight: '600' }}>{t('profile.deleteAccount')}</Text>
            )}
          </Pressable>
        )}
      </BottomSheet>

      <BottomSheet
        visible={widgetsOpen}
        onClose={() => setWidgetsOpen(false)}
        title={t('profile.widgets')}
        right={
          <Pressable onPress={() => setWidgetsOpen(false)} hitSlop={8}>
            <Text style={{ color: theme.accentStrong, fontSize: Typography.rowLabel, fontWeight: '700' }}>{t('common.done')}</Text>
          </Pressable>
        }>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.footnote, { color: theme.textSecondary, marginTop: 10 }]}>
            {t('profile.widgetsHelp')}
          </Text>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>{t('profile.widgetMini')}</Text>
          <View style={styles.widgetWrap}>
            <WidgetPreview variant="mini" />
          </View>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary, paddingHorizontal: 4 }]}>{t('profile.widgetCompact')}</Text>
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
  avatar: { width: 74, height: 74, marginBottom: 12 },
  avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 27, height: 27, borderRadius: 13.5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: Typography.screenTitle, fontWeight: '800', letterSpacing: -0.2 },
  accountLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, maxWidth: '100%' },
  accountText: { fontSize: Typography.rowValue, fontWeight: '500', flexShrink: 1 },
  accountLink: { fontSize: Typography.rowValue, fontWeight: '700', marginLeft: 2 },
  // Strings carry their own casing, so "iOS" survives (critique, 2026-11-01: uppercase transform gave "IOS").
  sectionLabel: { fontSize: Typography.label, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 24, marginBottom: 8, marginTop: 6 },
  version: { fontSize: Typography.label, fontWeight: '500', textAlign: 'center', marginTop: 18 },
  group: { borderRadius: Radii.card, borderWidth: 1, marginHorizontal: 20, overflow: 'hidden', marginBottom: Spacing.cardGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: RowMinHeight, paddingVertical: 9, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1 },
  rowIcon: { width: 30, height: 30, borderRadius: Radii.iconTile, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: Typography.rowLabel, fontWeight: '600', flex: 1 },
  languageFlag: { fontSize: 20 },
  rowValue: { fontSize: Typography.rowValue, marginRight: 4 },
  privacyText: { fontSize: Typography.rowValue, lineHeight: 20, marginTop: 12 },
  clearDataBtn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: Radii.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  deleteAccountBtn: { minHeight: RowMinHeight, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  logOutBtn: { padding: 14, borderRadius: Radii.button, borderWidth: 1, alignItems: 'center', marginHorizontal: 20, marginTop: 10 },
  footnote: { fontSize: Typography.rowValue, lineHeight: 17, marginTop: 10 },
  widgetWrap: { alignItems: 'center', marginBottom: 4 },
  // rowLabel's flex: 1 is for a row; inside a column it squeezes the title to nothing.
  stackedLabel: { flex: 0 },
  // Inside a sheet, which already pads 20 each side: boxes go full width, labels line up with row text,
  // 24 between sections and 8 between a box and what belongs to it.
  sheetGroup: { marginHorizontal: 0, marginBottom: 24 },
  sheetGroupTight: { marginBottom: 8 },
  sheetLabel: { paddingHorizontal: 14, marginTop: 0, marginBottom: 8 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radii.card, padding: 13, marginBottom: Spacing.cardGap },
  previewText: { flex: 1, fontSize: Typography.rowValue, lineHeight: 17, fontWeight: '500' },
});
