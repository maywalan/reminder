import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { usePlannerStore } from '@/store/use-planner-store';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() call resolves, so the UI can avoid a login flash. */
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
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, initializing: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, initializing: false });
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (!error) usePlannerStore.getState().setProfile({ name });
    return { error: error?.message ?? null };
  },

  signInWithOAuth: async (provider) => {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { error: error?.message ?? 'Could not start sign-in.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return { error: null }; // user cancelled

    const { queryParams } = Linking.parse(result.url.replace('#', '?'));
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
