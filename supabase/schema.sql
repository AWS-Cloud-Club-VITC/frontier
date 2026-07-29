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

create table if not exists public.registrations (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  full_name  text,
  reg_no     text,
  added_by   uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles(team_id);
create index if not exists teams_join_code_idx  on public.teams(join_code);
-- case-insensitive: the pre-event Excel import and reg-desk entries won't agree on case
create unique index if not exists registrations_email_lower_idx on public.registrations (lower(email));

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

create or replace function public.is_my_team_lead(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = p_team_id and leader_id = auth.uid())
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

-- 1b. Only people on the registrations allowlist may sign in — imported from the
--     pre-event Excel, or added on the spot by reg-desk staff via add_walkin_registration.
create or replace function public.enforce_preregistered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.registrations where lower(email) = lower(new.email)
  ) then
    raise exception 'This email is not on the FRONTIER registration list. See the registration desk to be added.';
  end if;
  return new;
end $$;

drop trigger if exists enforce_preregistered_trg on auth.users;
create trigger enforce_preregistered_trg
  before insert on auth.users
  for each row execute function public.enforce_preregistered();

-- 2. Every new auth user gets a profile row, pre-filled from their registrations
--    entry if the Excel import (or reg-desk walk-in add) had a name/reg_no on file —
--    so pre-registered students don't have to retype what's already known.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
  v_reg_no    text;
begin
  select full_name, reg_no into v_full_name, v_reg_no
  from public.registrations
  where lower(email) = lower(new.email)
  limit 1;

  -- reg_no is unique on profiles — a bad import with a duplicate reg_no must not
  -- block account creation outright, so just skip pre-filling it in that case.
  if v_reg_no is not null and exists (select 1 from public.profiles where reg_no = v_reg_no) then
    v_reg_no := null;
  end if;

  insert into public.profiles (id, email, full_name, reg_no)
  values (new.id, lower(new.email), v_full_name, v_reg_no)
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

  -- auth.uid() is only set for updates that came through the Supabase API with a
  -- user's JWT. A direct SQL editor / migration query has no session, so auth.uid()
  -- is null here — and whoever has that kind of DB access already has full control,
  -- so the checks below (which exist to stop a participant's own token from
  -- escalating itself) don't need to apply to them.
  if auth.uid() is not null then
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'You cannot change your own role.';
    end if;

    -- team_id may only move through the RPCs below, which set this flag
    if new.team_id is distinct from old.team_id
       and coalesce(current_setting('app.team_change', true), '') <> 'on' then
      raise exception 'Join with a code or ask your team lead — team membership cannot be set directly.';
    end if;
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

-- Returns the departing solo lead's submission file_path (or null), so the
-- caller can clean up storage — same reasoning as admin_delete_team below,
-- since the team-delete branch here cascades the submissions row away too.
create or replace function public.leave_team()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_team_id uuid;
  v_count   int;
  v_path    text;
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
    select file_path into v_path from public.submissions where team_id = v_team_id;
    delete from public.teams where id = v_team_id;
  end if;

  return v_path;
end $$;

-- Reg-desk staff (admins) use this to let a last-minute walk-in sign in, when
-- they're not already in the imported Excel. Idempotent: re-running it for the
-- same email (e.g. to fill in a name found afterwards) updates rather than errors.
create or replace function public.add_walkin_registration(
  p_email text,
  p_full_name text default null,
  p_reg_no text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(trim(p_email));
begin
  if v_uid is null then raise exception 'You are signed out.'; end if;
  if not public.is_admin() then
    raise exception 'Only organisers can add walk-in registrations.';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if v_email not like '%@vitstudent.ac.in' then
    raise exception 'Only @vitstudent.ac.in emails can be added.';
  end if;

  insert into public.registrations (email, full_name, reg_no, added_by)
  values (
    v_email,
    nullif(trim(coalesce(p_full_name, '')), ''),
    nullif(upper(trim(coalesce(p_reg_no, ''))), ''),
    v_uid
  )
  on conflict (lower(email)) do update
    set full_name = coalesce(excluded.full_name, public.registrations.full_name),
        reg_no    = coalesce(excluded.reg_no, public.registrations.reg_no);
end $$;

-- --------------------------------------------------------- admin RPCs -----
-- Organiser-only mutations for the /admin data portal. Unlike the self-service
-- RPCs above (scoped to the caller's own team), each of these can act on any
-- participant, team, registration or submission — gated purely on is_admin().

create or replace function public.admin_update_profile(
  p_id uuid,
  p_full_name text,
  p_reg_no text,
  p_phone text,
  p_year smallint
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only organisers can edit participant details.';
  end if;
  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'Name cannot be empty.';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      reg_no    = nullif(upper(trim(coalesce(p_reg_no, ''))), ''),
      phone     = nullif(trim(coalesce(p_phone, '')), ''),
      year      = p_year
  where id = p_id;
end $$;

-- Kicks a participant off their team. A lead with teammates must be
-- transferred off the lead first (admin_transfer_lead) — mirrors the same
-- rule leave_team() applies to self-service departures. A lead who is the
-- sole member takes the team down with them, same as leave_team().
-- Returns the removed solo lead's submission file_path (or null), so the
-- caller can clean up storage — same reasoning as admin_delete_team below.
create or replace function public.admin_remove_from_team(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_count   int;
  v_path    text;
begin
  if not public.is_admin() then
    raise exception 'Only organisers can remove a participant from their team.';
  end if;

  select team_id into v_team_id from public.profiles where id = p_id;
  if v_team_id is null then raise exception 'They are not on a team.'; end if;

  if exists (select 1 from public.teams where id = v_team_id and leader_id = p_id) then
    select count(*) into v_count from public.profiles where team_id = v_team_id;
    if v_count > 1 then
      raise exception 'They lead this team — transfer the lead to someone else first.';
    end if;
    select file_path into v_path from public.submissions where team_id = v_team_id;
    -- Set before the delete: the FK's on-delete-set-null cascade fires
    -- protect_profile_columns_trg on this row too, which blocks team_id
    -- changes unless this flag is set for the transaction.
    perform set_config('app.team_change', 'on', true);
    delete from public.teams where id = v_team_id;
  else
    perform set_config('app.team_change', 'on', true);
    update public.profiles set team_id = null where id = p_id;
  end if;

  return v_path;
end $$;

create or replace function public.admin_add_to_team(p_id uuid, p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_target public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only organisers can add a participant to a team.';
  end if;

  select * into v_target from public.profiles where id = p_id;
  if not found then raise exception 'Participant not found.'; end if;
  if v_target.full_name is null or v_target.reg_no is null then
    raise exception 'They have not filled in their details yet.';
  end if;
  if v_target.team_id is not null then
    raise exception 'They are already on a team.';
  end if;
  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Team not found.';
  end if;

  perform set_config('app.team_change', 'on', true);
  update public.profiles set team_id = p_team_id where id = p_id;
end $$;

create or replace function public.admin_transfer_lead(p_team_id uuid, p_new_leader_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only organisers can transfer a team lead.';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_new_leader_id and team_id = p_team_id
  ) then
    raise exception 'They are not on that team.';
  end if;

  update public.teams set leader_id = p_new_leader_id where id = p_team_id;
end $$;

create or replace function public.admin_update_team(p_team_id uuid, p_name text, p_track text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only organisers can edit team details.';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Team name cannot be empty.';
  end if;

  update public.teams set name = trim(p_name), track = p_track where id = p_team_id;
end $$;

-- Returns the deleted team's submission file_path (or null), so the caller
-- can clean up the orphaned storage object — the submissions row itself is
-- gone via the on-delete-cascade FK before this function returns.
create or replace function public.admin_delete_team(p_team_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'Only organisers can delete a team.';
  end if;

  select file_path into v_path from public.submissions where team_id = p_team_id;
  -- Set before the delete: the FK's on-delete-set-null cascade updates every
  -- remaining member's team_id, which protect_profile_columns_trg blocks
  -- unless this flag is set for the transaction.
  perform set_config('app.team_change', 'on', true);
  delete from public.teams where id = p_team_id;
  return v_path;
end $$;

create or replace function public.admin_update_registration(
  p_id uuid,
  p_full_name text,
  p_reg_no text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only organisers can edit a registration.';
  end if;

  update public.registrations
  set full_name = nullif(trim(coalesce(p_full_name, '')), ''),
      reg_no    = nullif(upper(trim(coalesce(p_reg_no, ''))), '')
  where id = p_id;
end $$;

create or replace function public.admin_delete_registration(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only organisers can remove a registration.';
  end if;

  delete from public.registrations where id = p_id;
end $$;

-- Returns the deleted submission's file_path so the caller can remove the
-- matching object from storage.
create or replace function public.admin_delete_submission(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'Only organisers can delete a submission.';
  end if;

  delete from public.submissions where id = p_id returning file_path into v_path;
  return v_path;
end $$;

-- --------------------------------------------------------- row security ---

alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.submissions   enable row level security;
alter table public.registrations enable row level security;

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

-- Only the team lead may submit or replace the deck — everyone on the team
-- can still see it via submissions_select above.
drop policy if exists submissions_write on public.submissions;
create policy submissions_write on public.submissions for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_my_team_lead(team_id));

drop policy if exists submissions_update on public.submissions;
create policy submissions_update on public.submissions for update to authenticated
  using (team_id = public.my_team_id() and public.is_my_team_lead(team_id))
  with check (team_id = public.my_team_id() and public.is_my_team_lead(team_id));

-- registrations are only ever written through add_walkin_registration (or the
-- pre-event CSV import, which runs as the table owner) — no insert/update/delete
-- policy here, same reasoning as teams above.
drop policy if exists registrations_select on public.registrations;
create policy registrations_select on public.registrations for select to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------- grants ----

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select          on public.teams       to authenticated;
grant select, insert, update on public.submissions to authenticated;
grant select on public.registrations to authenticated;

revoke all on function
  public.create_team(text, text),
  public.join_team_by_code(text),
  public.add_member_by_email(text),
  public.remove_member(uuid),
  public.transfer_lead(uuid),
  public.update_team(text, text),
  public.leave_team(),
  public.add_walkin_registration(text, text, text),
  public.admin_update_profile(uuid, text, text, text, smallint),
  public.admin_remove_from_team(uuid),
  public.admin_add_to_team(uuid, uuid),
  public.admin_transfer_lead(uuid, uuid),
  public.admin_update_team(uuid, text, text),
  public.admin_delete_team(uuid),
  public.admin_update_registration(uuid, text, text),
  public.admin_delete_registration(uuid),
  public.admin_delete_submission(uuid)
from public, anon;

grant execute on function
  public.create_team(text, text),
  public.join_team_by_code(text),
  public.add_member_by_email(text),
  public.remove_member(uuid),
  public.transfer_lead(uuid),
  public.update_team(text, text),
  public.leave_team(),
  public.add_walkin_registration(text, text, text),
  public.admin_update_profile(uuid, text, text, text, smallint),
  public.admin_remove_from_team(uuid),
  public.admin_add_to_team(uuid, uuid),
  public.admin_transfer_lead(uuid, uuid),
  public.admin_update_team(uuid, text, text),
  public.admin_delete_team(uuid),
  public.admin_update_registration(uuid, text, text),
  public.admin_delete_registration(uuid),
  public.admin_delete_submission(uuid)
to authenticated;

-- ------------------------------------------------------------- storage ----
-- Built now, used when you open submissions. Files live under <team_id>/…

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions', 'submissions', false, 8388608,
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

-- Only the team lead may upload, replace, or clean up the old file on
-- replace — submission_files_read above still lets any member download it.
drop policy if exists submission_files_write on storage.objects;
create policy submission_files_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.my_team_id()::text
    and public.is_my_team_lead(public.my_team_id())
  );

drop policy if exists submission_files_update on storage.objects;
create policy submission_files_update on storage.objects for update to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = public.my_team_id()::text
    and public.is_my_team_lead(public.my_team_id())
  );

-- The third clause exists for leave_team()'s solo-lead-departure path: by
-- the time the app calls storage.remove() to clean up the old file, the RPC
-- has already deleted the team row (so my_team_id() is now null for the
-- caller) — this lets anyone clean up a file whose owning team no longer
-- exists at all, without opening up deletion of any *active* team's files.
drop policy if exists submission_files_delete on storage.objects;
create policy submission_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (
      ((storage.foldername(name))[1] = public.my_team_id()::text and public.is_my_team_lead(public.my_team_id()))
      or public.is_admin()
      or not exists (select 1 from public.teams where id = (storage.foldername(name))[1]::uuid)
    )
  );
