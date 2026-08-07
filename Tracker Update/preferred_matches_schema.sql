create table if not exists public.preferred_match_table_settings (
  id text primary key,
  headers jsonb not null default '["Project name", "Caller", "Designer"]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.preferred_match_rows (
  id uuid primary key default gen_random_uuid(),
  project_name text not null default '',
  caller text not null default '',
  designer text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.preferred_match_table_settings (id, headers)
values ('preferred-client-matches', '["Project name", "Caller", "Designer"]'::jsonb)
on conflict (id) do nothing;

alter table public.preferred_match_table_settings enable row level security;
alter table public.preferred_match_rows enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferred_match_table_settings'
      and policyname = 'Managers and coordinators can read preferred match settings'
  ) then
    create policy "Managers and coordinators can read preferred match settings"
      on public.preferred_match_table_settings
      for select
      using (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) in ('manager', 'coordinator')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferred_match_table_settings'
      and policyname = 'Managers can edit preferred match settings'
  ) then
    create policy "Managers can edit preferred match settings"
      on public.preferred_match_table_settings
      for all
      using (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) = 'manager'
        )
      )
      with check (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) = 'manager'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferred_match_rows'
      and policyname = 'Managers and coordinators can read Preferred Matches'
  ) then
    create policy "Managers and coordinators can read Preferred Matches"
      on public.preferred_match_rows
      for select
      using (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) in ('manager', 'coordinator')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferred_match_rows'
      and policyname = 'Managers and coordinators can add Preferred Matches'
  ) then
    create policy "Managers and coordinators can add Preferred Matches"
      on public.preferred_match_rows
      for insert
      with check (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) in ('manager', 'coordinator')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferred_match_rows'
      and policyname = 'Managers and coordinators can edit Preferred Matches'
  ) then
    create policy "Managers and coordinators can edit Preferred Matches"
      on public.preferred_match_rows
      for update
      using (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) in ('manager', 'coordinator')
        )
      )
      with check (
        exists (
          select 1
          from public.user_profiles
          where user_profiles.id = auth.uid()
            and coalesce(user_profiles.permissions, user_profiles.role) in ('manager', 'coordinator')
        )
      );
  end if;
end $$;
