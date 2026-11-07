import type { AuthError, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { lang, t } from '@/i18n';
import { performInitialSync } from '@/lib/sync';
import { usePlannerStore } from '@/store/use-planner-store';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'apple';

/**
 * Supabase's auth emails (supabase/templates) pick English or Thai from `user_metadata.language`.
 * Keeps it equal to the app language, so a reset email arrives in the language the user reads.
 */
function syncEmailLanguage(user: User) {
  // Read the setting, not lang(): lang() only updates on the next render.
  const current = usePlannerStore.getState().settings.language === 'th' ? 'th' : 'en';
  if (user.user_metadata?.language === current) return;
  supabase.auth.updateUser({ data: { language: current } }).catch(() => {});
}


/**
 * Email links land on small Tickle pages (docs/auth on GitHub Pages) that work on any device: a
 * desktop browser can't open tickle:// links. The reset page hands the session on to
 * tickle://auth/reset on iPhone. `lang` picks the page's language.
 */
const AUTH_PAGES = 'https://maywalan.github.io/reminder/auth';

/** Where the password-reset email link sends the user back into the app (see app/auth/reset.tsx). */
export const PASSWORD_RESET_PATH = 'auth/reset';

/**
 * Turns a Supabase auth error into Tickle's own copy, in the current language. Supabase's raw
 * messages are English-only and technical ("Invalid login credentials"), so they never reach the UI.
 */
export function authErrorMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return t('auth.failed');
  const code = 'code' in error ? (error as AuthError).code : undefined;
  if (error.name === 'AuthRetryableFetchError' || /network request failed|fetch/i.test(error.message)) return t('auth.network');
  switch (code) {
    case 'invalid_credentials':
      return t('auth.invalidCredentials');
    case 'email_not_confirmed':
      return t('auth.emailNotConfirmed');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.alreadySignedUp');
    case 'weak_password':
      return t('auth.weakPassword');
    case 'email_address_invalid':
    case 'validation_failed':
      return t('login.invalidEmail');
    case 'over_request_rate_limit':
      return t('auth.tooMany');
    // The app-wide hourly email cap, not something this user did.
    case 'over_email_send_rate_limit':
      return t('auth.emailBusy');
    case 'otp_expired':
    case 'flow_state_expired':
      return t('auth.linkExpired');
    default:
      return t('auth.failed');
  }
}

interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the first auth-state event resolves, so the UI can avoid a login flash. */
  initializing: boolean;
  initialize: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  /** `emailTaken` is set when the email already has an account, so the UI can offer Sign In instead. */
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null; emailTaken?: boolean }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Emails a link that opens app/auth/reset.tsx. Always resolves without error for unknown emails. */
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Signs in from a reset link's URL (tokens in the fragment, or a PKCE `code`). */
  signInFromResetLink: (url: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  /** Permanently deletes the signed-in account and its synced data, then signs out locally. */
  deleteAccount: () => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  initializing: true,

  initialize: () => {
    // Changing the app language while signed in updates the email language too. Subscribed here,
    // not at module load: use-planner-store and this file import each other (via lib/sync), so
    // usePlannerStore is still undefined while this module first runs.
    usePlannerStore.subscribe((state, prev) => {
      if (state.settings.language === prev.settings.language) return;
      const user = useAuthStore.getState().user;
      if (user) syncEmailLanguage(user);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, initializing: false });

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        performInitialSync(session.user.id);
        syncEmailLanguage(session.user);
      } else if (event === 'SIGNED_OUT') {
        // Local plans/groups belong to whichever account was last active — clear them so the
        // next sign-in (a different account, or guest mode) doesn't inherit stale data.
        usePlannerStore.getState().resetData();
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? authErrorMessage(error) : null };
  },

  signUpWithEmail: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, language: lang() }, emailRedirectTo: `${AUTH_PAGES}/confirmed.html?lang=${lang()}` },
    });
    if (error) {
      const emailTaken = error.code === 'user_already_exists' || error.code === 'email_exists';
      return { error: authErrorMessage(error), emailTaken };
    }

    // Supabase returns 200 with a fake user (identities: []) instead of an error when the email
    // is already registered and confirmed — under any provider, Google included — to avoid
    // leaking which emails have accounts. An empty identities array is the only tell.
    if (data.user && data.user.identities?.length === 0) {
      return { error: t('auth.alreadySignedUp'), emailTaken: true };
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
    if (error || !data.url) return { error: error ? authErrorMessage(error) : t('auth.couldNotStart') };

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
    if (queryParams?.error) return { error: t('auth.failed') };

    const access_token = queryParams?.access_token as string | undefined;
    const refresh_token = queryParams?.refresh_token as string | undefined;
    if (!access_token || !refresh_token) return { error: t('auth.failed') };

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError ? authErrorMessage(sessionError) : null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_PAGES}/reset.html?lang=${lang()}`,
    });
    return { error: error ? authErrorMessage(error) : null };
  },

  signInFromResetLink: async (url) => {
    const { queryParams } = Linking.parse(url.replace('#', '?'));
    if (queryParams?.error_code) {
      return { error: authErrorMessage({ name: 'AuthApiError', message: '', code: String(queryParams.error_code) } as AuthError) };
    }
    const code = queryParams?.code as string | undefined;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { error: error ? authErrorMessage(error) : null };
    }
    const access_token = queryParams?.access_token as string | undefined;
    const refresh_token = queryParams?.refresh_token as string | undefined;
    if (!access_token || !refresh_token) return { error: t('auth.linkExpired') };
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: error ? authErrorMessage(error) : null };
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? authErrorMessage(error) : null };
  },

  deleteAccount: async () => {
    // The `delete-account` Edge Function (supabase/functions) deletes the auth user server-side;
    // the app's publishable key can't. Plans, groups and settings cascade with it.
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { error: t('profile.deleteAccountFailed') };
    // The account no longer exists, so only clear the local session. SIGNED_OUT then resets the
    // local plan store (see initialize above).
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  },
}));
