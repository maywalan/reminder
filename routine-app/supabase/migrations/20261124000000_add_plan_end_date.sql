-- A time range can end on a later day (2026-11-24): end_date is that day; null = ends on `date`.
-- Nullable: older app versions never send it, and the app strips it if the column is missing.
alter table public.plans
  add column if not exists end_date date;
