-- The daily recap can now be set to any minute, not just on the hour.
alter table public.settings
  add column recap_minute smallint not null default 0
    check (recap_minute between 0 and 59);
