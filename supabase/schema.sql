-- Run this once in Supabase Dashboard → SQL Editor.
-- The frontend uses only the public anon key; RLS is the security boundary.

create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  company text not null check (char_length(company) between 1 and 120),
  role text not null check (char_length(role) between 1 and 160),
  stage text not null check (stage in ('applied', 'screening', 'interview', 'offer', 'rejected')),
  location text not null,
  work_type text not null check (work_type in ('Remote', 'Hybrid', 'On-site')),
  salary text not null,
  applied_date date not null,
  next_action text not null,
  next_action_date date,
  url text,
  contact text,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  logo text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  type text not null check (type in ('move', 'note', 'created', 'reminder')),
  text text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists applications_owner_updated_idx on public.applications(owner_id, updated_at desc);
create index if not exists activities_owner_occurred_idx on public.activities(owner_id, occurred_at desc);
create index if not exists activities_application_occurred_idx on public.activities(application_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.record_application_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities (owner_id, application_id, type, text)
    values (new.owner_id, new.id, 'created', 'Added ' || new.company || ' to your pipeline');
  elsif new.stage is distinct from old.stage then
    insert into public.activities (owner_id, application_id, type, text)
    values (new.owner_id, new.id, 'move', 'Moved ' || new.company || ' to ' || case when new.stage = 'rejected' then 'Closed' else initcap(new.stage) end);
  elsif new.notes is distinct from old.notes then
    insert into public.activities (owner_id, application_id, type, text)
    values (new.owner_id, new.id, 'note', 'Updated notes for ' || new.company);
  end if;
  return new;
end;
$$;

drop trigger if exists applications_record_activity on public.applications;
create trigger applications_record_activity
after insert or update on public.applications
for each row execute function public.record_application_activity();

alter table public.applications enable row level security;
alter table public.activities enable row level security;

drop policy if exists "Users can read their own applications" on public.applications;
create policy "Users can read their own applications"
on public.applications for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create their own applications" on public.applications;
create policy "Users can create their own applications"
on public.applications for insert
with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own applications" on public.applications;
create policy "Users can update their own applications"
on public.applications for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their own applications" on public.applications;
create policy "Users can delete their own applications"
on public.applications for delete
using (auth.uid() = owner_id);

drop policy if exists "Users can read their own activities" on public.activities;
create policy "Users can read their own activities"
on public.activities for select
using (auth.uid() = owner_id);

drop policy if exists "Users can create activities for their applications" on public.activities;
create policy "Users can create activities for their applications"
on public.activities for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.applications
    where applications.id = application_id
      and applications.owner_id = auth.uid()
  )
);

alter table public.applications replica identity full;
alter table public.activities replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.applications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.activities;
exception when duplicate_object then null;
end $$;
