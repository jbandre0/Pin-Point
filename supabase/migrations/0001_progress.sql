-- Per-user familiarity progress.
--
-- One row per user; the entire fact-state map is stored as a single JSONB blob:
--   { "bg.language.script": "mastered", "se.architecture.roof_style": "familiar", ... }
-- (keys are fact-ids "{recordId}.{category}.{field}"; values "familiar" | "mastered";
--  "new" is never stored — absence means new).

create table if not exists public.progress (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  fact_state  jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Each user may read and write only their own row.
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own"
  on public.progress for select
  using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own"
  on public.progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at current on every write.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch
  before update on public.progress
  for each row execute function public.touch_updated_at();
