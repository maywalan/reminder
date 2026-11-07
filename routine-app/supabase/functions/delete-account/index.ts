// Supabase Edge Function (Deno): permanently deletes the signed-in user's account.
// Required by App Store Review Guideline 5.1.1(v) — apps that allow account creation must let
// users delete the account from inside the app.
//
// The caller is identified only from their own access token (the Authorization header), so a user
// can only ever delete themselves. Deleting the auth user cascades to every public table
// (profiles, settings, groups, plans all reference auth.users on delete cascade).
//
// The service-role key is read from the function's own environment, which Supabase injects at
// runtime. It never ships in the app or the repo.
//
// Deploy: Dashboard → Edge Functions → Deploy a new function → name it `delete-account` and paste
// this file, or `npx supabase functions deploy delete-account`.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return json({ error: 'Not signed in' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});
