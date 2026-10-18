-- design_handoff_tickle_home_timeline: plans can carry a picked icon, and Home's Earlier list
-- shows when a plan was checked off ("done 06:34").
alter table public.plans add column if not exists icon text;
alter table public.plans add column if not exists completed_at timestamptz;
