import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Tickle } from '@/components/tickle';
import { t } from '@/i18n';
import { weekdayLetter } from '@/i18n/format';
import { Fonts, Radii } from '@/constants/theme';

const FREQ_OPTIONS = ['onb2.daily', 'onb2.weekly', 'onb2.monthly'] as const;
// Mon-first week, Mon/Wed/Fri picked (weekday indexes, Sunday = 0).
const WEEKDAYS = [
  { wd: 1, active: true },
  { wd: 2, active: false },
  { wd: 3, active: true },
  { wd: 4, active: false },
  { wd: 5, active: true },
  { wd: 6, active: false },
  { wd: 0, active: false },
];

function Illustration() {
  return (
    <View style={{ width: 236, height: 210, borderRadius: Radii.lg, backgroundColor: '#F4F8FF', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {FREQ_OPTIONS.map((label, i) => (
          <View
            key={label}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: i === 0 ? '#1B76E8' : '#fff',
              shadowColor: '#10203A',
              shadowOpacity: i === 0 ? 0 : 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            }}>
            <Text style={{ fontFamily: Fonts[600], fontWeight: '600', fontSize: 11.5, color: i === 0 ? '#fff' : '#10203A' }}>{t(label)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {WEEKDAYS.map((day, i) => (
          <View
            key={i}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: day.active ? '#1B76E8' : '#fff',
            }}>
            <Text style={{ fontFamily: Fonts[600], fontWeight: '600', fontSize: 11, color: day.active ? '#fff' : 'rgba(16,32,58,0.3)' }}>{weekdayLetter(day.wd)}</Text>
          </View>
        ))}
      </View>
      <Tickle size={66} mood="idle" bodyMotion="squash" bubbleMotion="hop" animated />
    </View>
  );
}

export default function Onboarding2Screen() {
  const router = useRouter();

  function handleNext() {
    router.push('/onboarding-3');
  }

  return (
    <OnboardingShell
      step={1}
      illustration={<Illustration />}
      title={t('onb2.title')}
      body={t('onb2.body')}
      primaryLabel={t('onb.next')}
      onPrimary={handleNext}
    />
  );
}
