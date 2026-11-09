-- How long before a plan starts its Live Activity countdown appears (minutes).
-- null = the app default (60). Set in New Plan → Live Activity → Start countdown (2026-11-09).
alter table public.plans
  add column if not exists live_lead_minutes integer
  check (live_lead_minutes is null or (live_lead_minutes between 1 and 720));
