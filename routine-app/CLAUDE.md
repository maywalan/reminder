@AGENTS.md

## Working across multiple machines

This project is cloned on more than one laptop, sharing history through
`https://github.com/maywalan/reminder.git`. At the start of any session here, `git pull` before
making changes; at the end, commit and push before switching machines — otherwise the two copies
drift apart and conflict.

See `README.md` in this folder for current feature status and architecture — that's kept up to
date as the authoritative source, not duplicated here.

## Searching this repo

When searching or listing files with find/grep/bash, always exclude these folders — they're huge and not useful to search:
- node_modules
- ios/Pods
- ios/build
- android/build
- .git
- dist

## Supabase: new tables and functions

Every change to the database schema must keep user data owner-only:
- Every new table in `public` gets `enable row level security` plus owner-only policies
  (`auth.uid() = user_id`, or `= id` for per-user rows), copied from the four in
  `supabase/migrations/20260823000000_init_schema.sql`. Grant to `authenticated` only, never `anon`.
- New functions: set `search_path = ''`. A `security definer` function that is only a trigger gets
  `revoke execute ... from public, anon, authenticated`.
- After running a migration, re-run the Security Advisor (Dashboard → Advisors → Security Advisor)
  and expect 0 errors. The only accepted warning is "Leaked Password Protection Disabled" (needs Pro).
- Never put a `sb_secret_…` or service-role key in the app or the repo; the app only ships the
  publishable key.
