-- FinQuest: one row of learning progress per account.
-- Run this once in the Supabase dashboard (SQL Editor) or with `supabase db push`.

create table if not exists public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row-level security: a signed-in user can only ever see or change their own row.
alter table public.user_progress enable row level security;

drop policy if exists "Users read own progress" on public.user_progress;
create policy "Users read own progress"
  on public.user_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own progress" on public.user_progress;
create policy "Users insert own progress"
  on public.user_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own progress" on public.user_progress;
create policy "Users update own progress"
  on public.user_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own progress" on public.user_progress;
create policy "Users delete own progress"
  on public.user_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Guests (anon role) get no access at all.
revoke all on public.user_progress from anon;
grant select, insert, update, delete on public.user_progress to authenticated;

-- Keep a single progress snapshot from growing without bound (~5 MB is far above real usage).
alter table public.user_progress
  drop constraint if exists user_progress_size_limit,
  add constraint user_progress_size_limit check (pg_column_size(data) < 5 * 1024 * 1024);
