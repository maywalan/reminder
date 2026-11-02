-- Security Advisor warnings (2026-11-02). Both functions only run as triggers, so nothing
-- calls them directly and these changes don't affect the app.

-- Trigger-only: no one needs to call this through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Pin the search path so the function can't be pointed at a look-alike now().
alter function public.set_updated_at() set search_path = '';
