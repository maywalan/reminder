-- Alarm-style alert for a plan (2026-11-11): rings at the start, and at the end of a time range.
-- alarm_sound is one of the app's bundled sounds (constants/alarm-sounds.ts); null = default.
-- Both nullable: older app versions never send them, and the app strips them if they're missing.
alter table public.plans
  add column if not exists alarm boolean,
  add column if not exists alarm_sound text
  check (alarm_sound is null or alarm_sound in ('chime', 'classic', 'beep', 'marimba', 'rise', 'pulse'));
