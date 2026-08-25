import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * expo-router auto-navigates here the instant the OS delivers the OAuth redirect deep link
 * (see use-auth-store.ts's signInWithOAuth) — this screen has nothing to render, it just closes
 * itself back to wherever the login flow started. `useAuthStore` handles the actual session from
 * the same redirect URL independently.
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (router.canDismiss()) router.dismissAll();
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
}
