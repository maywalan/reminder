// Supabase Edge Function (Deno): permanently deletes the signed-in user's account.
// Required by App Store Review Guideline 5.1.1(v) — apps that allow account creation must let
// users delete the account from inside the app.
//
// The caller is identified only from their own access token (the Authorization header), so a user
// can only ever delete themselves. Deleting the auth user cascades to every public table
// (profiles, settings, groups, plans all reference auth.users on delete cascade).
//
// Sign in with Apple (2026-11-18): Apple asks apps to revoke the user's Apple tokens when the
// account is deleted. The app re-confirms with Apple and sends a fresh `appleAuthorizationCode`;
// this function swaps it for a refresh token and revokes it. Needs three function secrets
// (Dashboard → Edge Functions → Secrets), set by the account owner, never in the repo:
//   APPLE_TEAM_ID      the Apple Developer team ID
//   APPLE_KEY_ID       ID of a "Sign in with Apple" key (developer.apple.com → Keys)
//   APPLE_PRIVATE_KEY  that key's .p8 file contents
// If they're missing or Apple refuses, the account is still deleted (the revoke is best effort).
//
// The service-role key is read from the function's own environment, which Supabase injects at
// runtime. It never ships in the app or the repo.
//
// Deploy: Dashboard → Edge Functions → delete-account → Code → paste this file → Deploy,
// or `npx supabase functions deploy delete-account`.

import { createClient } from 'jsr:@supabase/supabase-js@2';

/** The app's bundle ID: the Sign in with Apple client ID for the native flow. */
const APPLE_CLIENT_ID = 'com.maywalan.tickle';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

/** Apple's client secret: an ES256 JWT signed with the Sign in with Apple key, valid 5 minutes. */
async function appleClientSecret(teamId: string, keyId: string, pem: string): Promise<string> {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64urlJson({ alg: 'ES256', kid: keyId })}.${b64urlJson({
    iss: teamId,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  })}`;
  // WebCrypto's ECDSA signature is already the raw r||s form that JWS ES256 expects.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

/** Best effort: returns a short status for the logs, never throws. */
async function revokeApple(code: string): Promise<string> {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!teamId || !keyId || !privateKey) return 'skipped: Apple secrets not set';
  try {
    const secret = await appleClientSecret(teamId, keyId, privateKey);
    const form = (fields: Record<string, string>) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: APPLE_CLIENT_ID, client_secret: secret, ...fields }),
    });
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', form({ grant_type: 'authorization_code', code }));
    const tokens = await tokenRes.json().catch(() => ({}));
    const token: string | undefined = tokens.refresh_token ?? tokens.access_token;
    if (!tokenRes.ok || !token) return `token exchange failed (${tokenRes.status} ${tokens.error ?? ''})`;
    const hint = tokens.refresh_token ? 'refresh_token' : 'access_token';
    const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', form({ token, token_type_hint: hint }));
    return revokeRes.ok ? 'revoked' : `revoke failed (${revokeRes.status})`;
  } catch (e) {
    return `revoke error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return json({ error: 'Not signed in' }, 401);

  const body = await req.json().catch(() => ({}));
  const appleCode = typeof body?.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : null;
  if (appleCode) console.log('[delete-account] apple:', await revokeApple(appleCode));

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});
