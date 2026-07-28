-- ============================================================================
-- FRONTIER 2026 — database schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables ---

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  join_code  text not null unique,
  track      text not null check (track in (
               'LLM Fine-Tuning',
               'Agentic Systems',
               'Automation',
               'Dev Productivity',
               'AI Safety & Observability')),
  leader_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  reg_no     text unique,
  phone      text,
  year       smallint check (year between 1 and 5),
  team_id    uuid references public.teams(id) on delete set null,
  role       text not null default 'participant' check (role in ('participant','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null unique references public.teams(id) on delete cascade,
  file_path    text not null,
  file_name    text not null,
  version      int  not null default 1,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles(team_id);
create index if not exists teams_join_code_idx  on public.teams(join_code);

-- ------------------------------------------------------------- helpers ----
-- SECURITY DEFINER so they run as the table owner and bypass RLS. This is what
-- stops the profiles policies from recursing into themselves.

create or replace function public.my_team_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.generate_join_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  -- no I, O, 0 or 1: they get misread when a code is copied off a phone screen
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.teams where join_code = code);
  end loop;
  return code;
end $$;

-- ------------------------------------------------------------ triggers ----

-- 1. Registration is restricted to VIT Chennai student email addresses.
--    The web form checks this too, but that check is trivially bypassed —
--    this one is not.
create or replace function public.enforce_vit_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) not like '%@vitstudent.ac.in' then
    raise exception 'Registration is restricted to VIT Chennai student emails (@vitstudent.ac.in).';
  end if;
  return new;
end $$;

drop trigger if exists enforce_vit_domain_trg on auth.users;
create trigger enforce_vit_domain_trg
  before insert on auth.users
  for each row execute function public.enforce_vit_domain();

-- 2. Every new auth user gets a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Hard cap of 4 members per team. The advisory lock makes the count-then-insert
--    atomic, so two people joining at the same instant cannot both slip through.
create or replace function public.enforce_team_size()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  member_count int;
begin
  if new.team_id is not null
     and (tg_op = 'INSERT' or new.team_id is distinct from old.team_id) then
    perform pg_advisory_xact_lock(hashtext(new.team_id::text));
    select count(*) into member_count from public.profiles where team_id = new.team_id;
    if member_count >= 4 then
      raise exception 'That team is already full (4 members maximum).';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_team_size_trg on public.profiles;
create trigger enforce_team_size_trg
  before insert or update on public.profiles
  for each row execute function public.enforce_team_size();

-- 4. Users may edit their own name/reg no/phone/year — nothing else.
--    Without this, anyone could PATCH their own row to role='admin', or set
--    team_id to a team they were never invited to.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id or lower(new.email) is distinct from lower(old.email) then
    raise exception 'Identity fields cannot be changed.';
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'You cannot change your own role.';
  end if;

  -- team_id may only move through the RPCs below, which set this flag
  if new.team_id is distinct from old.team_id
     and coalesce(current_setting('app.team_change', true), '') <> 'on' then
    raise exception 'Join with a code or ask your team lead — team membership cannot be set directly.';
  end if;

  return new;
end $$;

drop trigger if exists protect_profile_columns_trg on public.profiles;
create trigger protect_profile_columns_trg
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------- RPCs ----
-- Every team mutation goes through one of these. They check permissions
-- explicitly, which is far easier to get right than expressing the same rules
-- as RLS policies on cross-referencing tables.

create or replace function public.create_team(p_name text, p_track text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_me   public.profiles;
  v_team public.teams;
begin
  if v_uid is null then raise exception 'You are signed out.'; end if;

  select * into v_me from public.profiles where id = v_uid;
  if v_me.full_name is null or v_me.reg_no is null then
    raise exception 'Fill in your name and registration number first.';
  end if;
  if v_me.team_id is not null then
    raise exception 'You are already on a team.';
  end if;

  insert into public.teams (name, join_code, track, leader_id)
  values (trim(p_name), public.generate_join_code(), p_track, v_uid)
  returning * into v_team;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = v_team.id where id = v_uid;

  return v_team;
end $$;

create or replace function public.join_team_by_code(p_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_me   public.profiles;
  v_team public.teams;
begin
  if v_uid is null then raise exception 'You are signed out.'; end if;

  select * into v_me from public.profiles where id = v_uid;
  if v_me.full_name is null or v_me.reg_no is null then
    raise exception 'Fill in your name and registration number first.';
  end if;
  if v_me.team_id is not null then
    raise exception 'You are already on a team. Leave it before joining another.';
  end if;

  select * into v_team from public.teams where join_code = upper(trim(p_code));
  if not found then
    raise exception 'No team has that code. Check it with your team lead.';
  end if;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = v_team.id where id = v_uid;

  return v_team;
end $$;

create or replace function public.add_member_by_email(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
  v_target  public.profiles;
begin
  select team_id into v_team_id from public.profiles where id = v_uid;
  if v_team_id is null then raise exception 'You are not on a team.'; end if;
  if not exists (select 1 from public.teams where id = v_team_id and leader_id = v_uid) then
    raise exception 'Only the team lead can add members.';
  end if;

  select * into v_target from public.profiles where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'Nobody has registered with that email yet. Send them your join code instead.';
  end if;
  if v_target.full_name is null or v_target.reg_no is null then
    raise exception 'They have signed up but have not filled in their details yet.';
  end if;
  if v_target.team_id = v_team_id then
    raise exception 'They are already on your team.';
  end if;
  if v_target.team_id is not null then
    raise exception 'They are already on another team.';
  end if;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = v_team_id where id = v_target.id;
end $$;

create or replace function public.remove_member(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
begin
  select team_id into v_team_id from public.profiles where id = v_uid;
  if v_team_id is null then raise exception 'You are not on a team.'; end if;
  if not exists (select 1 from public.teams where id = v_team_id and leader_id = v_uid) then
    raise exception 'Only the team lead can remove members.';
  end if;
  if p_id = v_uid then
    raise exception 'Hand the lead to someone else, then leave the team.';
  end if;
  if not exists (select 1 from public.profiles where id = p_id and team_id = v_team_id) then
    raise exception 'They are not on your team.';
  end if;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = null where id = p_id;
end $$;

create or replace function public.transfer_lead(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
begin
  select team_id into v_team_id from public.profiles where id = v_uid;
  if v_team_id is null then raise exception 'You are not on a team.'; end if;
  if not exists (select 1 from public.teams where id = v_team_id and leader_id = v_uid) then
    raise exception 'Only the current lead can transfer the lead.';
  end if;
  if not exists (select 1 from public.profiles where id = p_id and team_id = v_team_id) then
    raise exception 'They are not on your team.';
  end if;

  update public.teams set leader_id = p_id where id = v_team_id;
end $$;

create or replace function public.update_team(p_name text, p_track text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
begin
  select team_id into v_team_id from public.profiles where id = v_uid;
  if v_team_id is null then raise exception 'You are not on a team.'; end if;
  if not exists (select 1 from public.teams where id = v_team_id and leader_id = v_uid) then
    raise exception 'Only the team lead can change team details.';
  end if;

  update public.teams set name = trim(p_name), track = p_track where id = v_team_id;
end $$;

create or replace function public.leave_team()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
  v_count   int;
begin
  select team_id into v_team_id from public.profiles where id = v_uid;
  if v_team_id is null then raise exception 'You are not on a team.'; end if;

  select count(*) into v_count from public.profiles where team_id = v_team_id;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = null where id = v_uid;

  if exists (select 1 from public.teams where id = v_team_id and leader_id = v_uid) then
    if v_count > 1 then
      raise exception 'Hand the team lead to someone else before you leave.';
    end if;
    delete from public.teams where id = v_team_id;
  end if;
end $$;

-- --------------------------------------------------------- row security ---

alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.submissions enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (team_id is not null and team_id = public.my_team_id())
    or public.is_admin()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (id = public.my_team_id() or public.is_admin());

-- teams are only ever written through the RPCs above, so there are
-- deliberately no insert/update/delete policies here

drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions for select to authenticated
  using (team_id = public.my_team_id() or public.is_admin());

drop policy if exists submissions_write on public.submissions;
create policy submissions_write on public.submissions for insert to authenticated
  with check (team_id = public.my_team_id());

drop policy if exists submissions_update on public.submissions;
create policy submissions_update on public.submissions for update to authenticated
  using (team_id = public.my_team_id())
  with check (team_id = public.my_team_id());

-- -------------------------------------------------------------- grants ----

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select          on public.teams       to authenticated;
grant select, insert, update on public.submissions to authenticated;

revoke all on function
  public.create_team(text, text),
  public.join_team_by_code(text),
  public.add_member_by_email(text),
  public.remove_member(uuid),
  public.transfer_lead(uuid),
  public.update_team(text, text),
  public.leave_team()
from public, anon;

grant execute on function
  public.create_team(text, text),
  public.join_team_by_code(text),
  public.add_member_by_email(text),
  public.remove_member(uuid),
  public.transfer_lead(uuid),
  public.update_team(text, text),
  public.leave_team()
to authenticated;

-- ------------------------------------------------------------- storage ----
-- Built now, used when you open submissions. Files live under <team_id>/…

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions', 'submissions', false, 26214400,
  array['application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists submission_files_read on storage.objects;
create policy submission_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = public.my_team_id()::text or public.is_admin())
  );

drop policy if exists submission_files_write on storage.objects;
create policy submission_files_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.my_team_id()::text
  );

drop policy if exists submission_files_update on storage.objects;
create policy submission_files_update on storage.objects for update to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.my_team_id()::text
  );
