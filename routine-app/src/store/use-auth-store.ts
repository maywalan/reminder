import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { performInitialSync } from '@/lib/sync';
import { usePlannerStore } from '@/store/use-planner-store';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the first auth-state event resolves, so the UI can avoid a login flash. */
  initializing: boolean;
  initialize: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  initializing: true,

  initialize: () => {
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, initializing: false });

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        performInitialSync(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // Local plans/groups belong to whichever account was last active — clear them so the
        // next sign-in (a different account, or guest mode) doesn't inherit stale data.
        usePlannerStore.getState().resetData();
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: Linking.createURL('auth/callback') },
    });
    if (error) return { error: error.message };

    // Supabase returns 200 with a fake user (identities: []) instead of an error when the email
    // is already registered and confirmed — under any provider, Google included — to avoid
    // leaking which emails have accounts. An empty identities array is the only tell.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'This email is already signed up. Try logging in instead.' };
    }

    usePlannerStore.getState().setProfile({ name });
    return { error: null };
  },

  signInWithOAuth: async (provider) => {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { error: error?.message ?? 'Could not start sign-in.' };

    // openAuthSessionAsync (ASWebAuthenticationSession) is unreliable at catching the final
    // exp://... redirect in Expo Go — it shows "Safari cannot open the page" even though the
    // OAuth flow completed. Opening a plain browser tab and watching for the OS to route the
    // callback URL back into the app as a normal deep link is more robust here, since that OS
    // level routing is what expo-router relies on anyway.
    const callbackUrl = await new Promise<string | null>((resolve) => {
      const subscription = Linking.addEventListener('url', (event) => {
        if (!event.url.startsWith(redirectTo)) return;
        subscription.remove();
        resolve(event.url);
      });
      WebBrowser.openBrowserAsync(data.url).then(() => {
        subscription.remove();
        resolve(null);
      });
    });
    await WebBrowser.dismissBrowser().catch(() => {});
    if (!callbackUrl) return { error: null }; // user cancelled without completing sign-in

    const { queryParams } = Linking.parse(callbackUrl.replace('#', '?'));
    if (queryParams?.error) return { error: (queryParams.error_description as string) ?? 'Sign-in failed.' };

    const access_token = queryParams?.access_token as string | undefined;
    const refresh_token = queryParams?.refresh_token as string | undefined;
    if (!access_token || !refresh_token) return { error: 'Sign-in did not return a session.' };

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
