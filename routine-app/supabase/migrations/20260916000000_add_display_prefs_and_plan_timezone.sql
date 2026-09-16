-- Sync device-local-only fields to the cloud: display/recap prefs (settings) and
-- per-plan IANA timezone (plans). Mirrors src/store/types.ts's Settings/Plan additions
-- that shipped 2026-08-29 as device-local only (see project memory).

alter table public.settings
  add column calendar_density text not null default 'compact'
    check (calendar_density in ('compact', 'detailed')),
  add column font_scale numeric not null default 1
    check (font_scale in (0.9, 1, 1.15, 1.3)),
  add column recap_enabled boolean not null default true,
  add column recap_hour smallint not null default 8
    check (recap_hour between 0 and 23);

alter table public.plans
  add column timezone text;
