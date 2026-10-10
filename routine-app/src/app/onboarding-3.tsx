import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Tickle } from '@/components/tickle';
import { t } from '@/i18n';
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
          <Text style={{ fontSize: 9.5, color: theme.textTertiary }}>{t('onb3.now')}</Text>
        </View>
        <Text style={{ fontFamily: Fonts[700], fontWeight: '700', fontSize: 13, color: theme.text, marginTop: 3 }}>{t('onb3.sampleTitle')}</Text>
        <Text style={{ fontFamily: Fonts[500], fontWeight: '500', fontSize: 11.5, color: theme.textSecondary, marginTop: 1 }}>{t('onb3.sampleTime')}</Text>
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
      title={t('onb3.title')}
      body={t('onb3.body')}
      primaryLabel={t('onb3.allow')}
      onPrimary={handleAllow}
      primaryBusy={requesting}
      secondaryLabel={t('onb3.later')}
      onSecondary={handleMaybeLater}
    />
  );
}
