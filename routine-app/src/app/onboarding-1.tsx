import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Tickle } from '@/components/tickle';
import { Radii, SwatchColors } from '@/constants/theme';

const ROW_HUES = [SwatchColors[0], SwatchColors[1], SwatchColors[2]];

function Illustration() {
  return (
    <View style={{ width: 236, height: 210, borderRadius: Radii.lg, backgroundColor: '#F4F8FF', overflow: 'hidden' }}>
      {ROW_HUES.map((hue, i) => (
        <View
          key={hue}
          style={{
            position: 'absolute',
            left: 18,
            top: 26 + i * 44,
            width: 150 - i * 18,
            height: 34,
            borderRadius: 12,
            backgroundColor: '#fff',
            borderLeftWidth: 4,
            borderLeftColor: hue,
            shadowColor: '#10203A',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
          }}
        />
      ))}
      <View style={{ position: 'absolute', right: 10, bottom: 8 }}>
        <Tickle size={76} mood="idle" animated />
      </View>
    </View>
  );
}

export default function Onboarding1Screen() {
  const router = useRouter();

  function handleNext() {
    router.push('/onboarding-2');
  }

  return (
    <OnboardingShell
      step={0}
      illustration={<Illustration />}
      title={'Everything you owe\ntoday, in one list'}
      body="Daily, weekly or monthly — add it once and it comes back on its own."
      primaryLabel="Next"
      onPrimary={handleNext}
    />
  );
}
