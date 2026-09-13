-- Migration 0036: CivicFix Phase 3D-2 Institution Team Formation & Project Workspace
-- Implements collaboration workspace container, institutional project teams, team roles, and activity tracking.

-- 1. Create public.challenge_projects table (Project Workspace)
create table if not exists public.challenge_projects (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete restrict,
  institution_id uuid not null references public.institutions(id) on update cascade on delete restrict,
  invitation_id uuid not null references public.institution_invitations(id) on update cascade on delete restrict,
  project_title text not null,
  project_summary text,
  status text not null default 'FORMING_TEAM' check (status in ('FORMING_TEAM', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED')),
  project_lead_profile_id uuid references public.profiles(id) on update cascade on delete restrict,
  created_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One workspace per challenge and institution pair
  constraint challenge_projects_challenge_inst_unique unique (challenge_id, institution_id),

  -- One workspace per accepted invitation
  constraint challenge_projects_invitation_unique unique (invitation_id),

  -- Title cannot be blank
  constraint challenge_projects_title_not_blank check (length(btrim(project_title)) > 0)
);

-- Indexes for challenge_projects
create index if not exists challenge_projects_challenge_id_idx on public.challenge_projects (challenge_id);
create index if not exists challenge_projects_institution_id_idx on public.challenge_projects (institution_id);
create index if not exists challenge_projects_invitation_id_idx on public.challenge_projects (invitation_id);
create index if not exists challenge_projects_status_idx on public.challenge_projects (status);
create index if not exists challenge_projects_lead_idx on public.challenge_projects (project_lead_profile_id);
create index if not exists challenge_projects_created_by_idx on public.challenge_projects (created_by);

-- 2. Create public.challenge_project_members table (Team Members)
create table if not exists public.challenge_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  role text not null default 'MEMBER' check (role in ('PROJECT_LEAD', 'FACULTY', 'RESEARCHER', 'STUDENT', 'MEMBER')),
  joined_at timestamptz not null default now(),
  added_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One membership record per user per project
  constraint challenge_project_members_project_profile_unique unique (project_id, profile_id)
);

-- Enforce at most one active PROJECT_LEAD per project workspace
create unique index if not exists uq_active_project_lead 
on public.challenge_project_members (project_id) 
where (role = 'PROJECT_LEAD' and is_active = true);

-- Indexes for challenge_project_members
create index if not exists challenge_project_members_project_id_idx on public.challenge_project_members (project_id);
create index if not exists challenge_project_members_profile_id_idx on public.challenge_project_members (profile_id);
create index if not exists challenge_project_members_role_idx on public.challenge_project_members (role);
create index if not exists challenge_project_members_is_active_idx on public.challenge_project_members (is_active);

-- 3. Create public.challenge_project_activity table (Project Audit & Timeline)
create table if not exists public.challenge_project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  activity_type text not null check (activity_type in (
    'PROJECT_CREATED',
    'MEMBER_ADDED',
    'MEMBER_ROLE_CHANGED',
    'MEMBER_DEACTIVATED',
    'MEMBER_REACTIVATED',
    'PROJECT_LEAD_CHANGED',
    'PROJECT_STATUS_CHANGED',
    'PROJECT_DETAILS_UPDATED'
  )),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists challenge_project_activity_proj_created_idx 
on public.challenge_project_activity (project_id, created_at desc);

-- 4. Invariant: Project Creation Eligibility Trigger
create or replace function public.validate_project_workspace_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_status text;
  v_inv_challenge uuid;
  v_inv_inst uuid;
  v_inst_verified text;
  v_inst_active boolean;
  v_caller_inst uuid;
  v_is_manager boolean;
  v_caller_profile uuid;
begin
  -- A. Fetch and validate invitation
  select status, challenge_id, institution_id 
  into v_invitation_status, v_inv_challenge, v_inv_inst
  from public.institution_invitations
  where id = new.invitation_id;

  if v_invitation_status is null then
    raise exception 'Invitation % does not exist', new.invitation_id
      using errcode = '23503';
  end if;

  if v_invitation_status <> 'ACCEPTED' then
    raise exception 'Cannot create project workspace for invitation in status % (must be ACCEPTED)', v_invitation_status
      using errcode = '23514';
  end if;

  if v_inv_challenge <> new.challenge_id then
    raise exception 'Project challenge_id (%) does not match invitation challenge_id (%)', new.challenge_id, v_inv_challenge
      using errcode = '23514';
  end if;

  if v_inv_inst <> new.institution_id then
    raise exception 'Project institution_id (%) does not match invitation institution_id (%)', new.institution_id, v_inv_inst
      using errcode = '23514';
  end if;

  -- B. Verify institution is verified and active
  select verification_status, is_active 
  into v_inst_verified, v_inst_active
  from public.institutions
  where id = new.institution_id;

  if v_inst_verified <> 'VERIFIED' or v_inst_active is not true then
    raise exception 'Institution % must be VERIFIED and active to initialize project workspace', new.institution_id
      using errcode = '23514';
  end if;

  -- C. Authorization check
  v_caller_profile := public.current_profile_id();
  v_is_manager := public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]);
  v_caller_inst := public.current_user_institution_id();

  if not v_is_manager and v_caller_profile is not null then
    if v_caller_inst is null or v_caller_inst <> new.institution_id then
      raise exception 'You do not have authority to create a project workspace for institution %', new.institution_id
        using errcode = '23514';
    end if;
  end if;

  -- Force authoritative created_by if caller is authenticated
  if v_caller_profile is not null then
    new.created_by := v_caller_profile;
  end if;

  -- Default project_lead_profile_id to creator if not specified
  if new.project_lead_profile_id is null then
    new.project_lead_profile_id := new.created_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_project_workspace_creation on public.challenge_projects;
create trigger trg_validate_project_workspace_creation
before insert on public.challenge_projects
for each row
execute function public.validate_project_workspace_creation();

-- 5. Post-Creation Trigger: Auto-add creator as Project Lead and log activity
create or replace function public.handle_post_project_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Automatically add project lead to project members
  insert into public.challenge_project_members (
    project_id,
    profile_id,
    role,
    added_by,
    is_active
  ) values (
    new.id,
    new.project_lead_profile_id,
    'PROJECT_LEAD',
    new.created_by,
    true
  ) on conflict (project_id, profile_id) do update
  set role = 'PROJECT_LEAD', is_active = true;

  -- Log project creation activity
  insert into public.challenge_project_activity (
    project_id,
    actor_profile_id,
    activity_type,
    description,
    metadata
  ) values (
    new.id,
    new.created_by,
    'PROJECT_CREATED',
    'Project workspace initialized in FORMING_TEAM state.',
    jsonb_build_object(
      'project_title', new.project_title,
      'project_lead', new.project_lead_profile_id,
      'invitation_id', new.invitation_id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_handle_post_project_creation on public.challenge_projects;
create trigger trg_handle_post_project_creation
after insert on public.challenge_projects
for each row
execute function public.handle_post_project_creation();

-- 6. Project Workspace Update Governance Trigger
create or replace function public.enforce_project_workspace_update_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_exists boolean;
  v_active_members_count integer;
  v_caller_profile uuid;
  v_is_manager boolean;
  v_caller_inst uuid;
begin
  -- A. Immutable Metadata Columns
  if new.challenge_id is distinct from old.challenge_id then
    raise exception 'challenge_id is immutable' using errcode = '23514';
  end if;

  if new.institution_id is distinct from old.institution_id then
    raise exception 'institution_id is immutable' using errcode = '23514';
  end if;

  if new.invitation_id is distinct from old.invitation_id then
    raise exception 'invitation_id is immutable' using errcode = '23514';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable' using errcode = '23514';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'created_at is immutable' using errcode = '23514';
  end if;

  -- B. Authorization
  v_caller_profile := public.current_profile_id();
  v_is_manager := public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]);
  v_caller_inst := public.current_user_institution_id();

  if not v_is_manager and v_caller_profile is not null then
    if v_caller_inst is null or v_caller_inst <> old.institution_id then
      raise exception 'You do not have authority to modify projects for institution %', old.institution_id
        using errcode = '23514';
    end if;
  end if;

  -- C. Status Transition Rules
  if old.status in ('COMPLETED', 'ARCHIVED') and new.status is distinct from old.status then
    if not v_is_manager then
      raise exception 'Cannot modify status of a completed or archived project workspace'
        using errcode = '23514';
    end if;
  end if;

  if old.status = 'FORMING_TEAM' and new.status = 'ACTIVE' then
    -- Must have an active project lead
    if new.project_lead_profile_id is null then
      raise exception 'Cannot activate project workspace without an assigned Project Lead'
        using errcode = '23514';
    end if;

    select count(*) into v_active_members_count
    from public.challenge_project_members
    where project_id = old.id and is_active = true;

    if v_active_members_count < 1 then
      raise exception 'Cannot activate project workspace without at least one active team member'
        using errcode = '23514';
    end if;
  end if;

  -- D. Synchronize Project Lead if changed
  if pg_trigger_depth() <= 1 and new.project_lead_profile_id is distinct from old.project_lead_profile_id then
    if new.project_lead_profile_id is not null then
      -- Verify new lead is an active member of this project
      select exists(
        select 1 from public.challenge_project_members
        where project_id = old.id
          and profile_id = new.project_lead_profile_id
          and is_active = true
      ) into v_lead_exists;

      if not v_lead_exists then
        -- Insert or activate as project lead
        insert into public.challenge_project_members (
          project_id, profile_id, role, added_by, is_active
        ) values (
          old.id, new.project_lead_profile_id, 'PROJECT_LEAD', coalesce(v_caller_profile, old.created_by), true
        ) on conflict (project_id, profile_id) do update
        set role = 'PROJECT_LEAD', is_active = true;
      else
        -- Demote existing active lead to MEMBER
        update public.challenge_project_members
        set role = 'MEMBER'
        where project_id = old.id
          and role = 'PROJECT_LEAD'
          and profile_id <> new.project_lead_profile_id;

        -- Promote new lead
        update public.challenge_project_members
        set role = 'PROJECT_LEAD'
        where project_id = old.id
          and profile_id = new.project_lead_profile_id;
      end if;

      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.id, coalesce(v_caller_profile, old.created_by), 'PROJECT_LEAD_CHANGED', 'Project Lead reassigned.',
        jsonb_build_object('new_lead', new.project_lead_profile_id, 'old_lead', old.project_lead_profile_id)
      );
    end if;
  end if;

  -- Log status change
  if new.status is distinct from old.status then
    insert into public.challenge_project_activity (
      project_id, actor_profile_id, activity_type, description, metadata
    ) values (
      old.id, coalesce(v_caller_profile, old.created_by), 'PROJECT_STATUS_CHANGED', 
      format('Project status transitioned from %s to %s.', old.status, new.status),
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_project_workspace_update_governance on public.challenge_projects;
create trigger trg_enforce_project_workspace_update_governance
before update on public.challenge_projects
for each row
execute function public.enforce_project_workspace_update_governance();

-- 7. Team Member Governance Trigger (Institution Isolation & Lead Invariant)
create or replace function public.enforce_project_member_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proj_inst uuid;
  v_member_inst uuid;
  v_caller_profile uuid;
  v_caller_inst uuid;
  v_is_manager boolean;
  v_is_lead boolean;
begin
  -- Resolve project institution
  select institution_id into v_proj_inst
  from public.challenge_projects
  where id = coalesce(new.project_id, old.project_id);

  if v_proj_inst is null then
    raise exception 'Project does not exist' using errcode = '23503';
  end if;

  v_caller_profile := public.current_profile_id();
  v_is_manager := public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]);
  v_caller_inst := public.current_user_institution_id();

  -- Authorize caller
  if not v_is_manager and v_caller_profile is not null then
    if v_caller_inst is null or v_caller_inst <> v_proj_inst then
      raise exception 'You do not have authority to manage team members for this institution project'
        using errcode = '23514';
    end if;
  end if;

  -- Resolve candidate member's authoritative institution
  select coalesce(
    p.institution_id,
    (
      select im.institution_id 
      from public.institution_members im 
      where im.profile_id = p.id 
      limit 1
    )
  ) into v_member_inst
  from public.profiles p
  where p.id = coalesce(new.profile_id, old.profile_id);

  if v_member_inst is null or v_member_inst <> v_proj_inst then
    raise exception 'Candidate member % does not belong to project institution % (belongs to %)',
      coalesce(new.profile_id, old.profile_id), v_proj_inst, coalesce(v_member_inst::text, 'none')
      using errcode = '23514';
  end if;

  -- On INSERT
  if tg_op = 'INSERT' then
    if v_caller_profile is not null then
      new.added_by := v_caller_profile;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- On UPDATE
  if tg_op = 'UPDATE' then
    -- Cannot tamper with project_id or profile_id
    if new.project_id is distinct from old.project_id then
      raise exception 'project_id is immutable' using errcode = '23514';
    end if;

    if new.profile_id is distinct from old.profile_id then
      raise exception 'profile_id is immutable' using errcode = '23514';
    end if;

    -- If deactivating an active project lead, require replacement first
    if old.role = 'PROJECT_LEAD' and old.is_active = true and new.is_active = false then
      raise exception 'Cannot deactivate the active Project Lead. Please assign a new Project Lead first.'
        using errcode = '23514';
    end if;

    -- If promoting to PROJECT_LEAD, ensure active
    if new.role = 'PROJECT_LEAD' then
      new.is_active := true;
      if pg_trigger_depth() <= 1 then
        -- Demote any other lead in same project to MEMBER
        update public.challenge_project_members
        set role = 'MEMBER'
        where project_id = new.project_id
          and role = 'PROJECT_LEAD'
          and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

        -- Sync with challenge_projects
        update public.challenge_projects
        set project_lead_profile_id = new.profile_id
        where id = new.project_id
          and project_lead_profile_id is distinct from new.profile_id;
      end if;
    end if;

    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_project_member_governance on public.challenge_project_members;
create trigger trg_enforce_project_member_governance
before insert or update on public.challenge_project_members
for each row
execute function public.enforce_project_member_governance();

-- 8. Activity logging trigger for team members
create or replace function public.log_project_member_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_profile uuid;
  v_member_name text;
begin
  v_caller_profile := public.current_profile_id();
  if v_caller_profile is null then
    v_caller_profile := coalesce(new.added_by, new.profile_id);
  end if;

  select full_name into v_member_name
  from public.profiles
  where id = new.profile_id;

  if tg_op = 'INSERT' then
    insert into public.challenge_project_activity (
      project_id, actor_profile_id, activity_type, description, metadata
    ) values (
      new.project_id,
      v_caller_profile,
      'MEMBER_ADDED',
      format('Added %s to the project team with role %s.', coalesce(v_member_name, 'Member'), new.role),
      jsonb_build_object('profile_id', new.profile_id, 'role', new.role)
    );
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        new.project_id,
        v_caller_profile,
        'MEMBER_ROLE_CHANGED',
        format('Changed role for %s from %s to %s.', coalesce(v_member_name, 'Member'), old.role, new.role),
        jsonb_build_object('profile_id', new.profile_id, 'old_role', old.role, 'new_role', new.role)
      );
    end if;

    if new.is_active is distinct from old.is_active then
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        new.project_id,
        v_caller_profile,
        case when new.is_active then 'MEMBER_REACTIVATED' else 'MEMBER_DEACTIVATED' end,
        case when new.is_active 
          then format('Reactivated %s in the project team.', coalesce(v_member_name, 'Member'))
          else format('Deactivated %s from the project team.', coalesce(v_member_name, 'Member'))
        end,
        jsonb_build_object('profile_id', new.profile_id, 'is_active', new.is_active)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_project_member_activity on public.challenge_project_members;
create trigger trg_log_project_member_activity
after insert or update on public.challenge_project_members
for each row
execute function public.log_project_member_activity();

-- 8B. Append-Only Protection for Project Activity Audit Log
create or replace function public.prevent_challenge_project_activity_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'challenge_project_activity entries are immutable'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    if coalesce(current_setting('civicfix.allow_activity_delete', true), 'off') <> 'on' then
      raise exception 'challenge_project_activity is an append-only audit log and cannot be deleted directly'
        using errcode = '23514';
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_challenge_project_activity_mutation on public.challenge_project_activity;
create trigger trg_prevent_challenge_project_activity_mutation
before update or delete on public.challenge_project_activity
for each row
execute function public.prevent_challenge_project_activity_mutation();

-- Prepare project workspace deletion to permit cascading deletes of audit activities
create or replace function public.prepare_project_workspace_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('civicfix.allow_activity_delete', 'on', true);
  return old;
end;
$$;

drop trigger if exists trg_prepare_project_workspace_deletion on public.challenge_projects;
create trigger trg_prepare_project_workspace_deletion
before delete on public.challenge_projects
for each row
execute function public.prepare_project_workspace_deletion();

-- 9. Row Level Security (RLS)

-- A. challenge_projects
alter table public.challenge_projects enable row level security;

drop policy if exists challenge_projects_select_authorized on public.challenge_projects;
create policy challenge_projects_select_authorized
on public.challenge_projects
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

drop policy if exists challenge_projects_insert_authorized on public.challenge_projects;
create policy challenge_projects_insert_authorized
on public.challenge_projects
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

drop policy if exists challenge_projects_update_authorized on public.challenge_projects;
create policy challenge_projects_update_authorized
on public.challenge_projects
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

-- B. challenge_project_members
alter table public.challenge_project_members enable row level security;

drop policy if exists challenge_project_members_select_authorized on public.challenge_project_members;
create policy challenge_project_members_select_authorized
on public.challenge_project_members
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_members.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
);

drop policy if exists challenge_project_members_insert_authorized on public.challenge_project_members;
create policy challenge_project_members_insert_authorized
on public.challenge_project_members
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_members.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
);

drop policy if exists challenge_project_members_update_authorized on public.challenge_project_members;
create policy challenge_project_members_update_authorized
on public.challenge_project_members
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_members.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_members.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
);

-- C. challenge_project_activity
alter table public.challenge_project_activity enable row level security;

drop policy if exists challenge_project_activity_select_authorized on public.challenge_project_activity;
create policy challenge_project_activity_select_authorized
on public.challenge_project_activity
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_activity.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
);

drop policy if exists challenge_project_activity_insert_authorized on public.challenge_project_activity;
create policy challenge_project_activity_insert_authorized
on public.challenge_project_activity
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_activity.project_id
      and cp.institution_id = public.current_user_institution_id()
  )
);
