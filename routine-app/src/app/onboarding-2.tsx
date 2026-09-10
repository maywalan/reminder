import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Tickle } from '@/components/tickle';
import { Fonts, Radii } from '@/constants/theme';

const FREQ_OPTIONS = ['Daily', 'Weekly', 'Monthly'];
const WEEKDAYS = [
  { label: 'M', active: true },
  { label: 'T', active: false },
  { label: 'W', active: true },
  { label: 'T', active: false },
  { label: 'F', active: true },
  { label: 'S', active: false },
  { label: 'S', active: false },
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
            <Text style={{ fontFamily: Fonts[600], fontWeight: '600', fontSize: 11.5, color: i === 0 ? '#fff' : '#10203A' }}>{label}</Text>
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
            <Text style={{ fontFamily: Fonts[600], fontWeight: '600', fontSize: 11, color: day.active ? '#fff' : 'rgba(16,32,58,0.3)' }}>{day.label}</Text>
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
      title={'Set it once,\nit keeps coming back'}
      body="Weekdays at 9, rent on the 1st, gym every other day. Change it any time."
      primaryLabel="Next"
      onPrimary={handleNext}
    />
  );
}
