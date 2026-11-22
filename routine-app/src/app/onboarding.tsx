import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActionSheetIOS, InteractionManager, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Reanimated, { Easing, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { ChevronLeftIcon, ChevronRightIcon, PlanIcon, PlusIcon } from '@/components/icon';
import { FreeIconsNote, IconGrid, IconPickerSheet } from '@/components/icon-picker';
import {
  hhmm,
  LiveActivityDemo,
  MockHome,
  NotificationDemo,
  WidgetDemo,
  type OnbDraft,
  type OnbRepeat,
  type WidgetSize,
} from '@/components/onboarding/onboarding-demos';
import { KeyboardDoneBar } from '@/components/keyboard-done-bar';
import { useIsPremium } from '@/hooks/use-is-premium';
import { Text, TextInput } from '@/components/text';
import { Tickle } from '@/components/tickle';
import { Fonts, scaledFont, SwatchColors } from '@/constants/theme';
import { useEffectiveScheme, useTheme } from '@/hooks/use-theme';
import { lang, t } from '@/i18n';
import type { StringKey } from '@/i18n/strings';
import { fmtDate, uses12hTime } from '@/i18n/format';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useOnboardingStore } from '@/store/use-onboarding-store';
import { uid, usePlannerStore } from '@/store/use-planner-store';
import { toISO } from '@/utils/dates';
import { LIVE_LEAD_DEFAULT_MIN } from '@/utils/home-feed';
import { iconUsage, recentIcons, suggestIcons, type PlanIconId } from '@/utils/plan-icons';
import { countActivePlans, FREE_ACTIVE_PLAN_LIMIT, isPremium } from '@/utils/premium';
import { defaultRepeatUntil, generateRepeatOccurrences } from '@/utils/repeat';

/**
 * Onboarding, "learn by doing" (Tickle onboarding.pdf, 2026-11-22): Welcome → Tap + → New Plan →
 * Live Activity → Notification + widgets. One route with the step in state, so the plan being
 * built carries across every screen and Back is just the previous step.
 *
 * The plan is saved once, on "Go to Home", so going back and changing it never makes a second
 * copy, and quitting halfway leaves nothing behind. Onboarding is marked done only then too
 * (doing it earlier flips the Stack.Protected guard and throws the user out mid-flow).
 */

type Step = 0 | 1 | 2 | 3 | 4;

/**
 * 07:30 on the next weekday it hasn't passed yet: never a missed first plan, and the default
 * "Weekdays" repeat really starts on the date shown (a Saturday start would quietly skip to Monday).
 */
function defaultStart() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30);
  if (d.getTime() <= now.getTime() + 5 * 60_000) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

const REPEATS: { value: OnbRepeat; key: StringKey }[] = [
  { value: 'none', key: 'onb.repeatNone' },
  { value: 'daily', key: 'onb.repeatDaily' },
  { value: 'weekdays', key: 'onb.repeatWeekdays' },
  { value: 'weekly', key: 'onb.repeatWeekly' },
];

// Step label colours follow the Welcome list's 1·2·3 chips (blue, amber, green).
function useStepTones() {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  return {
    1: { ink: theme.accentStrong, chip: dark ? 'rgba(90,160,255,0.16)' : '#E6F0FF' },
    2: { ink: dark ? '#E9B260' : '#9A6416', chip: dark ? 'rgba(240,163,46,0.18)' : '#FDF0DC' },
    3: { ink: dark ? '#6FD08C' : '#2E7D4F', chip: dark ? 'rgba(53,185,120,0.18)' : '#E2F5EA' },
  } as const;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<OnbDraft>(() => {
    const start = defaultStart();
    return {
      name: t('onb.sampleName'),
      icon: 'run',
      color: SwatchColors[0],
      timeMode: 'specific',
      start,
      end: new Date(start.getTime() + 30 * 60_000),
      repeat: 'weekdays',
      live: true,
    };
  });
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('large');
  const [asking, setAsking] = useState(false);

  const forward = useRef(true);
  const go = (next: Step) => {
    Haptics.selectionAsync().catch(() => {});
    forward.current = next > step;
    setStep(next);
  };

  async function turnOnReminders() {
    setAsking(true);
    const granted = await requestNotificationPermissions();
    if (granted) usePlannerStore.getState().updateSettings({ notificationsEnabled: true });
    setAsking(false);
    go(4);
  }

  function savePlan() {
    const store = usePlannerStore.getState();
    // Replaying onboarding on a full free account shouldn't add a 4th plan behind the user's back.
    if (!isPremium(store.mockSubscriptionState) && countActivePlans(store.plans) >= FREE_ACTIVE_PLAN_LIMIT) return;
    const date = toISO(draft.start);
    const time = hhmm(draft.start);
    const common = {
      name: draft.name.trim(),
      color: draft.color,
      groupId: null,
      live: draft.live && draft.timeMode !== 'allDay',
      liveLeadMinutes: LIVE_LEAD_DEFAULT_MIN,
      alerts: ['5'],
      icon: draft.icon ?? undefined,
      endTime: draft.timeMode === 'range' ? hhmm(draft.end) : undefined,
      allDay: draft.timeMode === 'allDay',
    };
    if (draft.repeat === 'none') {
      store.addPlan({ ...common, date, time, repeatType: 'none' });
      return;
    }
    const type = draft.repeat === 'daily' ? '1d' : draft.repeat === 'weekly' ? 'week' : 'custom';
    const custom = draft.repeat === 'weekdays' ? { interval: 1, unit: 'week' as const, weekdays: [1, 2, 3, 4, 5] } : undefined;
    const until = toISO(defaultRepeatUntil(draft.start, type, custom));
    const repeatId = uid();
    const occ = generateRepeatOccurrences(date, time, type, until, custom);
    if (occ.length) store.addPlans(occ.map((o) => ({ ...common, date: o.date, time: o.time, repeatType: type, repeatId })));
  }

  /** Skip (user, 2026-11-23): straight to Home as a guest. A plan they already added (step 3+) is kept. */
  function skip() {
    if (step >= 3) return finish();
    Haptics.selectionAsync().catch(() => {});
    const onb = useOnboardingStore.getState();
    onb.chooseGuest();
    onb.completeOnboarding();
    router.replace('/');
  }

  function finish() {
    const onb = useOnboardingStore.getState();
    onb.chooseGuest();
    onb.completeOnboarding();
    router.replace('/');
    // Saving a repeating plan (and the reminder scheduling it sets off) takes a moment, so it runs
    // once Home is on screen instead of freezing the button. Home picks the plan up when it lands.
    InteractionManager.runAfterInteractions(savePlan);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insets.top + 6 }]}>
      {/* Welcome has no progress bar, but Skip sits in the same top-right spot as on the steps. */}
      {step === 0 && (
        <View style={[styles.progressRow, { justifyContent: 'flex-end' }]}>
          <SkipButton onPress={skip} />
        </View>
      )}
      {step > 0 && <ProgressHeader step={step} onBack={() => go((step - 1) as Step)} onSkip={step < 4 ? skip : undefined} />}
      {/* A plain iOS-style push: forward slides in from the right, Back from the left. Quick ease-out,
          no spring or delay (user, 2026-11-23). Reduce Motion skips it (Reanimated's system default). */}
      <View style={styles.stage}>
      <Reanimated.View
        key={step}
        entering={(forward.current ? SlideInRight : SlideInLeft).duration(SLIDE_MS).easing(SLIDE_EASE)}
        exiting={(forward.current ? SlideOutLeft : SlideOutRight).duration(SLIDE_MS).easing(SLIDE_EASE)}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}>
        {step === 0 && <Welcome onStart={() => go(1)} onAccount={() => router.push('/login')} bottom={insets.bottom} />}
        {step === 1 && <TapPlus onPlus={() => go(2)} bottom={insets.bottom} />}
        {step === 2 && <NewPlan draft={draft} setDraft={setDraft} onCancel={() => go(1)} onAdd={() => go(3)} bottom={insets.bottom} />}
        {step === 3 && <Nudge draft={draft} busy={asking} onTurnOn={turnOnReminders} onNotNow={() => go(4)} bottom={insets.bottom} />}
        {step === 4 && <InSight draft={draft} size={widgetSize} setSize={setWidgetSize} onHome={finish} bottom={insets.bottom} />}
      </Reanimated.View>
      </View>
    </View>
  );
}

// ─── Shared chrome ──────────────────────────────────────────────────────────────────────────

function SkipButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.5 : 1 }]}>
      <Text style={[styles.skipText, { color: theme.textSecondary }]}>{t('onb.skip')}</Text>
    </Pressable>
  );
}

function ProgressHeader({ step, onBack, onSkip }: { step: Step; onBack: () => void; onSkip?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.progressRow}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('onb.back')} style={styles.backBtn}>
        <ChevronLeftIcon size={22} color={theme.text} />
      </Pressable>
      <View style={styles.segments} accessible accessibilityLabel={t('onb.progress', { n: step })}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= step ? theme.accent : theme.dividerStrong }]} />
        ))}
      </View>
      {/* The last step keeps the slot so the bar doesn't jump wider. */}
      {onSkip ? <SkipButton onPress={onSkip} /> : <View style={styles.skipBtn} />}
    </View>
  );
}

function StepIntro({ tone, label, title, body }: { tone: 1 | 2 | 3; label: string; title: string; body: string }) {
  const theme = useTheme();
  const tones = useStepTones();
  return (
    <View style={styles.intro}>
      <Text style={[styles.stepLabel, { color: tones[tone].ink, letterSpacing: track(0.6) }]}>{label}</Text>
      <Text style={[styles.h1, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.lead, { color: theme.textSecondary }]}>{body}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, busy, icon }: { label: string; onPress: () => void; busy?: boolean; icon?: ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, { backgroundColor: theme.accentFill, opacity: busy ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {icon}
      <Text style={[styles.primaryText, { color: theme.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={styles.textBtn}>
      <Text style={[styles.textBtnLabel, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function Footer({ children, bottom }: { children: ReactNode; bottom: number }) {
  return <View style={[styles.footer, { paddingBottom: bottom + 14 }]}>{children}</View>;
}

// ─── 01 · Welcome ───────────────────────────────────────────────────────────────────────────

function Welcome({ onStart, onAccount, bottom }: { onStart: () => void; onAccount: () => void; bottom: number }) {
  const theme = useTheme();
  const tones = useStepTones();
  const dark = useEffectiveScheme() === 'dark';
  const rows = [
    { n: 1 as const, title: t('onb.loop1Title'), body: t('onb.loop1Body') },
    { n: 2 as const, title: t('onb.loop2Title'), body: t('onb.loop2Body') },
    { n: 3 as const, title: t('onb.loop3Title'), body: t('onb.loop3Body') },
  ];
  return (
    <>
      <ScrollView contentContainerStyle={styles.welcomeBody} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Tickle size={132} mood="idle" animated />
          <View style={[styles.heroFloor, { backgroundColor: dark ? 'rgba(0,0,0,0.35)' : 'rgba(16,32,58,0.08)' }]} />
        </View>
        <Text style={[styles.hi, { color: theme.text }]} accessibilityRole="header">
          {t('onb.hi')}
        </Text>
        <Text style={[styles.hiSub, { color: theme.textSecondary }]}>{t('onb.intro')}</Text>
        <View style={styles.loop}>
          {rows.map((r) => {
            const first = r.n === 1;
            return (
              <View
                key={r.n}
                style={[
                  styles.loopRow,
                  { backgroundColor: theme.surface, borderColor: first ? theme.accent : theme.cardBorder, borderWidth: first ? 1.5 : 1 },
                  first && { shadowColor: theme.accent, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
                ]}>
                <View style={[styles.loopChip, { backgroundColor: first ? theme.accentFill : tones[r.n].chip }]}>
                  {first ? (
                    <PlusIcon size={16} color={theme.onAccent} strokeWidth={2.6} />
                  ) : (
                    <Text style={[styles.loopNum, { color: tones[r.n].ink }]}>{r.n}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.loopTitle, { color: theme.text }]}>{r.title}</Text>
                  <Text style={[styles.loopBody, { color: theme.textSecondary }]}>{r.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Footer bottom={bottom}>
        <PrimaryButton label={t('onb.start')} onPress={onStart} />
        <TextButton label={t('onb.haveAccount')} onPress={onAccount} />
      </Footer>
    </>
  );
}

// ─── 02 · Tap + ─────────────────────────────────────────────────────────────────────────────

function TapPlus({ onPlus, bottom }: { onPlus: () => void; bottom: number }) {
  const theme = useTheme();
  return (
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StepIntro tone={1} label={t('onb.step1')} title={t('onb.tapTitle')} body={t('onb.tapBody')} />
        <MockHome onPlus={onPlus} />
      </ScrollView>
      <Footer bottom={bottom}>
        {/* Soft until they tap + (design note 02); it still works, for anyone who reaches for it. */}
        <Pressable onPress={onPlus} accessibilityRole="button" style={({ pressed }) => [styles.primary, { backgroundColor: theme.accentSoft, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Text style={[styles.primaryText, { color: theme.accentStrong }]}>{t('onb.tryPlus')}</Text>
        </Pressable>
      </Footer>
    </>
  );
}

// ─── 03 · New Plan ──────────────────────────────────────────────────────────────────────────

function NewPlan({
  draft,
  setDraft,
  onCancel,
  onAdd,
  bottom,
}: {
  draft: OnbDraft;
  setDraft: (fn: (d: OnbDraft) => OnbDraft) => void;
  onCancel: () => void;
  onAdd: () => void;
  bottom: number;
}) {
  const theme = useTheme();
  const scheme = useEffectiveScheme();
  const plans = usePlannerStore((s) => s.plans);
  const usage = useMemo(() => iconUsage(plans), [plans]);
  const router = useRouter();
  const premium = useIsPremium();
  const suggested = useMemo(() => suggestIcons(draft.name, usage, draft.icon ?? undefined, 6, premium), [draft.name, usage, draft.icon, premium]);
  const openPaywall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    router.push('/paywall');
  };
  const [iconSheet, setIconSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [nameError, setNameError] = useState(false);
  const pickerLocale = lang() === 'th' ? 'th-TH' : uses12hTime() ? 'en-US' : 'en-GB';
  const set = (patch: Partial<OnbDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const ink45 = scheme === 'dark' ? 'rgba(242,245,250,0.45)' : 'rgba(16,32,58,0.45)';

  function add() {
    if (!draft.name.trim()) {
      setNameError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    onAdd();
  }

  function pickRepeat() {
    const labels = REPEATS.map((r) => t(r.key));
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...labels, t('common.cancel')], cancelButtonIndex: labels.length, title: t('plan.repeat'), userInterfaceStyle: scheme }, (i) => {
        if (i < labels.length) set({ repeat: REPEATS[i].value });
      });
    } else {
      const i = REPEATS.findIndex((r) => r.value === draft.repeat);
      set({ repeat: REPEATS[(i + 1) % REPEATS.length].value });
    }
  }

  // Changing the date keeps the time, and the range end moves along with the start.
  function changeStart(next: Date) {
    const gap = draft.end.getTime() - draft.start.getTime();
    set({ start: next, end: new Date(next.getTime() + Math.max(gap, 15 * 60_000)) });
  }

  const modes = [
    { value: 'specific' as const, label: t('plan.specificTime') },
    { value: 'range' as const, label: t('plan.timeRange') },
    { value: 'allDay' as const, label: t('plan.allDay') },
  ];
  const picker = { locale: pickerLocale, themeVariant: scheme, accentColor: theme.accent } as const;

  return (
    <>
      <View style={styles.formHead}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.formHeadSide, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={[styles.formHeadTitle, { color: theme.text }]}>{t('plan.new')}</Text>
        <Pressable onPress={add} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.formHeadSide, { color: theme.accentStrong, fontFamily: Fonts[700], fontWeight: '700' }]}>{t('common.save')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { gap: 10 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: nameError ? theme.danger : theme.cardBorder }]}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => {
              set({ name });
              if (name.trim()) setNameError(false);
            }}
            placeholder={t('onb.namePlaceholder')}
            placeholderTextColor={theme.textTertiary}
            returnKeyType="done"
            inputAccessoryViewID="onboarding-keyboard"
            maxLength={80}
            style={[styles.nameInput, { color: theme.text }]}
          />
        </View>
        {nameError && <Text style={[styles.error, { color: theme.danger }]}>{t('onb.nameNeeded')}</Text>}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder, gap: 10, padding: 14 }]}>
          <View style={styles.iconTop}>
            <Pressable onPress={() => setIconSheet(true)} accessibilityLabel={t('plan.allIcons')} style={[styles.iconSel, { borderColor: draft.color, backgroundColor: `${draft.color}1F` }]}>
              {draft.icon ? <PlanIcon id={draft.icon} size={26} color={draft.color} /> : <PlusIcon size={20} color={draft.color} />}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('plan.icon')}</Text>
              <Text numberOfLines={1} style={[styles.rowSub, { color: theme.textSecondary }]}>
                {t('onb.iconSub')}
              </Text>
            </View>
            <Pressable onPress={() => setIconSheet(true)} hitSlop={10} style={styles.allIcons}>
              <Text style={[styles.link, { color: theme.accentStrong }]}>{t('plan.allIcons')}</Text>
              <ChevronRightIcon size={14} color={theme.accentStrong} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={[styles.caps, { color: ink45, letterSpacing: track(0.8) }]}>{t('plan.iconSuggested')}</Text>
          <IconGrid ids={suggested.ids} selected={draft.icon} color={draft.color} onPick={(icon: PlanIconId) => set({ icon })} premium={premium} onLocked={openPaywall} />
          {!premium && <FreeIconsNote />}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <View style={styles.modes}>
            {modes.map((m) => {
              const on = draft.timeMode === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => set({ timeMode: m.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.mode, { backgroundColor: on ? theme.accentFill : 'transparent', borderColor: on ? theme.accentFill : theme.cardBorder }]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.modeText, { color: on ? theme.onAccent : theme.text }]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.when, { borderColor: theme.divider }]}>
            <View style={styles.whenCol}>
              <Text style={[styles.caps, { color: ink45, letterSpacing: track(0.8) }]}>{t('onb.date')}</Text>
              {/* The app's own date label: the system compact picker shows the phone's calendar (e.g. "2569 BE"). */}
              <Pressable
                onPress={() => setDateSheet(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.dateChip, { backgroundColor: scheme === 'dark' ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)', opacity: pressed ? 0.6 : 1 }]}>
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 17 }}>
                  {fmtDate(draft.start, { weekday: 'short' })}
                </Text>
              </Pressable>
            </View>
            {draft.timeMode !== 'allDay' && (
              <View style={[styles.whenCol, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.divider, paddingLeft: 14 }]}>
                <Text style={[styles.caps, { color: ink45, letterSpacing: track(0.8) }]}>{draft.timeMode === 'range' ? t('onb.start_') : t('onb.time')}</Text>
                <DateTimePicker value={draft.start} mode="time" display="compact" {...picker} onChange={(_, d) => d && changeStart(d)} />
              </View>
            )}
            {draft.timeMode === 'range' && (
              <View style={[styles.whenCol, { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.divider, paddingLeft: 14 }]}>
                <Text style={[styles.caps, { color: ink45, letterSpacing: track(0.8) }]}>{t('onb.end')}</Text>
                <DateTimePicker
                  value={draft.end}
                  mode="time"
                  display="compact"
                  minimumDate={draft.start}
                  {...picker}
                  onChange={(_, d) => d && set({ end: new Date(draft.start.getFullYear(), draft.start.getMonth(), draft.start.getDate(), d.getHours(), d.getMinutes()) })}
                />
              </View>
            )}
          </View>
          <Pressable onPress={pickRepeat} accessibilityRole="button" style={[styles.repeatRow, { borderColor: theme.divider }]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{t('plan.repeat')}</Text>
            <View style={styles.repeatValue}>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{t(REPEATS.find((r) => r.value === draft.repeat)!.key)}</Text>
              <ChevronRightIcon size={14} color={theme.textTertiary} strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>

        {draft.timeMode !== 'allDay' && (
          <View style={[styles.card, styles.liveCard, { backgroundColor: theme.surface, borderColor: theme.accent, shadowColor: theme.accent }]}>
            <Tickle size={46} mood="live" bubbleMotion="hop" animated />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{t('plan.liveActivity')}</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{t('onb.liveSub')}</Text>
            </View>
            <Switch value={draft.live} onValueChange={(live) => set({ live })} trackColor={{ true: '#35B978' }} accessibilityLabel={t('plan.liveActivity')} />
          </View>
        )}
      </ScrollView>
      <Footer bottom={bottom}>
        <PrimaryButton label={t('onb.addPlan')} onPress={add} icon={<PlusIcon size={18} color={theme.onAccent} strokeWidth={2.6} />} />
      </Footer>
      <KeyboardDoneBar id="onboarding-keyboard" />
      <BottomSheet visible={dateSheet} onClose={() => setDateSheet(false)} title={t('plan.dateTitle')}>
        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <DateTimePicker
            value={draft.start}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            {...picker}
            onChange={(_, d) => {
              if (!d) return;
              changeStart(new Date(d.getFullYear(), d.getMonth(), d.getDate(), draft.start.getHours(), draft.start.getMinutes()));
              setDateSheet(false);
            }}
          />
        </View>
      </BottomSheet>
      <IconPickerSheet
        visible={iconSheet}
        onClose={() => setIconSheet(false)}
        selected={draft.icon}
        color={draft.color}
        colors={SwatchColors}
        onColor={(color) => set({ color })}
        recent={recentIcons(usage)}
        onPick={(icon) => {
          set({ icon });
          setIconSheet(false);
        }}
        premium={premium}
        onLocked={() => {
          setIconSheet(false);
          setTimeout(openPaywall, 260);
        }}
      />
    </>
  );
}

// ─── 04 · Live Activity ─────────────────────────────────────────────────────────────────────

function Nudge({ draft, busy, onTurnOn, onNotNow, bottom }: { draft: OnbDraft; busy: boolean; onTurnOn: () => void; onNotNow: () => void; bottom: number }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StepIntro tone={2} label={t('onb.step2')} title={t('onb.countTitle')} body={t('onb.countBody')} />
        <LiveActivityDemo draft={draft} />
      </ScrollView>
      <Footer bottom={bottom}>
        <PrimaryButton label={t('onb.turnOn')} onPress={onTurnOn} busy={busy} />
        <TextButton label={t('onb.notNow')} onPress={onNotNow} />
      </Footer>
    </>
  );
}

// ─── 05 · Notification + widgets ────────────────────────────────────────────────────────────

function InSight({ draft, size, setSize, onHome, bottom }: { draft: OnbDraft; size: WidgetSize; setSize: (s: WidgetSize) => void; onHome: () => void; bottom: number }) {
  const theme = useTheme();
  const dark = useEffectiveScheme() === 'dark';
  const sizes: { value: WidgetSize; label: string }[] = [
    { value: 'small', label: t('onb.small') },
    { value: 'medium', label: t('onb.medium') },
    { value: 'large', label: t('onb.large') },
  ];
  return (
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StepIntro tone={3} label={t('onb.step3')} title={t('onb.sightTitle')} body={t('onb.sightBody')} />
        <View style={[styles.sightStage, { backgroundColor: dark ? theme.surface2 : '#E8EEFC' }]}>
          <NotificationDemo draft={draft} />
          <View style={[styles.sizes, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)' }]}>
            {sizes.map((s) => {
              const on = s.value === size;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSize(s.value);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.sizeBtn, on && { backgroundColor: dark ? theme.surface : '#FFFFFF' }]}>
                  <Text style={[styles.sizeText, { color: theme.text }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <WidgetDemo draft={draft} size={size} />
        </View>
      </ScrollView>
      <Footer bottom={bottom}>
        <PrimaryButton label={t('onb.goHome')} onPress={onHome} />
      </Footer>
    </>
  );
}

const SLIDE_MS = 300;
const SLIDE_EASE = Easing.out(Easing.cubic);

/** Tracking for caps labels in English only: Thai has no capitals and spacing pulls its tone marks apart. */
const track = (v: number) => (lang() === 'th' ? 0 : v);
/** Onboarding type sits on the app scale only: 28 heading · 17 button/form title · 15 body/rows · 13 sub/pills · 12 caps. */
const f = (size: number, weight: 500 | 600 | 700) => ({ fontSize: scaledFont(size), fontWeight: String(weight) as '500', fontFamily: Fonts[weight] });

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stage: { flex: 1, overflow: 'hidden' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, height: 36 },
  backBtn: { width: 28, height: 36, justifyContent: 'center' },
  skipBtn: { minWidth: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { ...f(15, 600) },
  segments: { flex: 1, flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  intro: { gap: 6, marginBottom: 16 },
  stepLabel: { ...f(12, 700) },
  h1: { ...f(28, 700), letterSpacing: -0.4, lineHeight: scaledFont(28) * 1.25 },
  lead: { ...f(15, 500), lineHeight: scaledFont(15) * 1.45 },
  footer: { paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  primary: { height: 54, borderRadius: 27, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  primaryText: { ...f(17, 700) },
  textBtn: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  textBtnLabel: { ...f(15, 600) },

  welcomeBody: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 16, alignItems: 'center' },
  hero: { alignItems: 'center', marginBottom: 18 },
  heroFloor: { width: 92, height: 8, borderRadius: 50, marginTop: 6, opacity: 0.7, shadowColor: '#10203A', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  hi: { ...f(28, 700), letterSpacing: -0.5, textAlign: 'center' },
  hiSub: { ...f(15, 500), textAlign: 'center', marginTop: 8, lineHeight: scaledFont(15) * 1.45, maxWidth: 320 },
  loop: { alignSelf: 'stretch', gap: 10, marginTop: 26 },
  loopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13 },
  loopChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  loopNum: { ...f(15, 700) },
  loopTitle: { ...f(15, 700) },
  loopBody: { ...f(13, 500), marginTop: 1 },

  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  formHeadTitle: { ...f(17, 700) },
  formHeadSide: { ...f(15, 600) },
  card: { borderRadius: 18, borderWidth: 1 },
  nameInput: { ...f(15, 600), paddingHorizontal: 16, paddingVertical: 14 },
  error: { ...f(13, 600), marginTop: -4, marginLeft: 4 },
  iconTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconSel: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  allIcons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { ...f(15, 600) },
  rowTitle: { ...f(15, 600) },
  rowSub: { ...f(13, 500), marginTop: 1 },
  rowValue: { ...f(15, 500) },
  caps: { ...f(12, 600) },
  modes: { flexDirection: 'row', gap: 6, padding: 10 },
  mode: { flex: 1, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  modeText: { ...f(13, 700) },
  when: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, gap: 14 },
  whenCol: { gap: 6, alignItems: 'flex-start' },
  dateChip: { height: 34, borderRadius: 8, paddingHorizontal: 11, justifyContent: 'center' },
  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 50 },
  repeatValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },

  sightStage: { borderRadius: 26, padding: 12, gap: 12 },
  sizes: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  sizeBtn: { flex: 1, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sizeText: { ...f(13, 700) },
});
