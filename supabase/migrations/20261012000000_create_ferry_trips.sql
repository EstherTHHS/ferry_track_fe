-- Ferry trips: one row per leg (morning / evening) per day per user.
-- Port of bus_track's `ferry_trips` table, with Supabase Auth users in place of `users`.

create table public.ferry_trips (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_date   date not null,
  leg         text not null check (leg in ('morning', 'evening')),
  trip_time   time,
  status      text not null default 'taken' check (status in ('taken', 'missed', 'cancelled')),
  note        varchar(255),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One morning + one evening per day, per user. Also the upsert conflict
  -- target and the index behind the "user's trips in this month" query.
  constraint ferry_trips_user_date_leg_key unique (user_id, trip_date, leg)
);

create function public.ferry_trips_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ferry_trips_set_updated_at
before update on public.ferry_trips
for each row execute function public.ferry_trips_set_updated_at();

-- Data API access: signed-in users only, never anon.
revoke all on public.ferry_trips from anon;
grant select, insert, update, delete on public.ferry_trips to authenticated;

-- Row access: a user only ever sees and writes their own legs.
alter table public.ferry_trips enable row level security;

create policy "ferry_trips_select_own" on public.ferry_trips
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ferry_trips_insert_own" on public.ferry_trips
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "ferry_trips_update_own" on public.ferry_trips
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "ferry_trips_delete_own" on public.ferry_trips
for delete to authenticated
using ((select auth.uid()) = user_id);
