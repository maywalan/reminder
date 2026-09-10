import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Tickle } from '@/components/tickle';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestNotificationPermissions } from '@/lib/notifications';

function NotificationPreview() {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 260,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        borderRadius: 22,
        padding: 14,
        shadowColor: '#10203A',
        shadowOpacity: 0.1,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 14 },
      }}>
      <Tickle size={40} mood="idle" bodyMotion="none" bubbleMotion="tap" animated />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: Fonts[600], fontWeight: '600', fontSize: 10.5, color: theme.textSecondary, letterSpacing: 0.3 }}>TICKLE</Text>
          <Text style={{ fontSize: 9.5, color: theme.textTertiary }}>now</Text>
        </View>
        <Text style={{ fontFamily: Fonts[700], fontWeight: '700', fontSize: 13, color: theme.text, marginTop: 3 }}>Standup in 10 minutes</Text>
        <Text style={{ fontFamily: Fonts[500], fontWeight: '500', fontSize: 11.5, color: theme.textSecondary, marginTop: 1 }}>9:30 – 9:45 AM</Text>
      </View>
    </View>
  );
}

export default function Onboarding3Screen() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    await requestNotificationPermissions();
    setRequesting(false);
    router.replace('/login');
  }

  function handleMaybeLater() {
    router.replace('/login');
  }

  return (
    <OnboardingShell
      step={2}
      illustration={<NotificationPreview />}
      title={'Let me tap you\non the shoulder'}
      body="Up to 5 alerts per plan, and you pick how early. Silent otherwise — I don't chase."
      primaryLabel="Turn on reminders"
      onPrimary={handleAllow}
      primaryBusy={requesting}
      secondaryLabel="Maybe later"
      onSecondary={handleMaybeLater}
    />
  );
}
