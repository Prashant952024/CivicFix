-- CivicFix Phase 3D-2 Security Hardening: Project Authorization & Least Privilege Governance
-- Enforces: Institution membership grants visibility, but project management is strictly restricted
-- to the active Project Lead, authorized Institution Coordinators, and supervisory Admins/Innovation Managers.

-- 1. Helper function: Determine if a user has project-management authority
create or replace function public.can_manage_challenge_project(
  p_project_id uuid,
  p_profile_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile uuid;
  v_project_inst uuid;
  v_lead_profile uuid;
  v_is_lead boolean;
  v_is_inst_coord boolean;
begin
  -- Resolve profile
  v_profile := coalesce(p_profile_id, public.current_profile_id());
  if v_profile is null then
    return false;
  end if;

  -- A. Admin or Innovation Manager (supervisory write access)
  if exists (
    select 1
    from public.profiles p
    join public.roles r on p.role_id = r.id
    where p.id = v_profile
      and r.code in ('ADMIN', 'INNOVATION_MANAGER')
  ) or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]) then
    return true;
  end if;

  -- B. Resolve project institution and designated lead
  select institution_id, project_lead_profile_id
  into v_project_inst, v_lead_profile
  from public.challenge_projects
  where id = p_project_id;

  if v_project_inst is null then
    return false;
  end if;

  -- C. Check if user is the designated Project Lead
  if v_lead_profile = v_profile then
    return true;
  end if;

  -- D. Check if user is active PROJECT_LEAD in project members
  select exists (
    select 1 from public.challenge_project_members
    where project_id = p_project_id
      and profile_id = v_profile
      and role = 'PROJECT_LEAD'
      and is_active = true
  ) into v_is_lead;

  if v_is_lead then
    return true;
  end if;

  -- E. Check if user is an authorized Institution Coordinator/Admin for the owning institution
  select exists (
    select 1 from public.institution_members im
    where im.institution_id = v_project_inst
      and im.profile_id = v_profile
      and (
        im.is_primary_contact = true
        or im.role_title ilike '%coordinator%'
        or im.role_title ilike '%admin%'
        or im.role_title ilike '%director%'
        or im.role_title ilike '%dean%'
        or im.role_title ilike '%nodal%'
      )
  ) into v_is_inst_coord;

  return v_is_inst_coord;
end;
$$;

-- 2. Upgrade enforce_project_workspace_update_governance with strict least privilege check
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

  v_caller_profile := public.current_profile_id();

  -- B. Authorize caller: Must have project management authority (depth 1 only)
  if pg_trigger_depth() <= 1 and v_caller_profile is not null then
    if not public.can_manage_challenge_project(old.id, v_caller_profile) then
      raise exception 'You do not have authority to update this institution project workspace'
        using errcode = '23514';
    end if;
  end if;

  -- C. Status Transition State Machine Rules
  if new.status is distinct from old.status then
    if old.status = 'COMPLETED' and new.status not in ('COMPLETED', 'DISCONTINUED') then
      raise exception 'Completed projects cannot be transitioned back to %', new.status
        using errcode = '23514';
    end if;

    if old.status = 'DISCONTINUED' then
      raise exception 'Discontinued projects cannot be transitioned to any other state'
        using errcode = '23514';
    end if;

    if old.status = 'FORMING_TEAM' and new.status = 'ACTIVE' then
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

-- 3. Upgrade enforce_project_member_governance with strict least privilege check
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
begin
  -- Resolve project institution
  select institution_id into v_proj_inst
  from public.challenge_projects
  where id = coalesce(new.project_id, old.project_id);

  if v_proj_inst is null then
    raise exception 'Project does not exist' using errcode = '23503';
  end if;

  v_caller_profile := public.current_profile_id();

  -- A. Authorize caller: Must have project management authority (depth 1 only)
  if pg_trigger_depth() <= 1 and v_caller_profile is not null then
    if not public.can_manage_challenge_project(coalesce(new.project_id, old.project_id), v_caller_profile) then
      raise exception 'You do not have authority to manage team members for this institution project'
        using errcode = '23514';
    end if;
  end if;

  -- B. Resolve candidate member's authoritative institution
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

  -- C. On INSERT
  if tg_op = 'INSERT' then
    if v_caller_profile is not null then
      new.added_by := v_caller_profile;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- D. On UPDATE
  if tg_op = 'UPDATE' then
    -- Cannot tamper with immutable keys
    if new.project_id is distinct from old.project_id then
      raise exception 'project_id is immutable' using errcode = '23514';
    end if;

    if new.profile_id is distinct from old.profile_id then
      raise exception 'profile_id is immutable' using errcode = '23514';
    end if;

    if new.joined_at is distinct from old.joined_at then
      raise exception 'joined_at is immutable' using errcode = '23514';
    end if;

    if new.added_by is distinct from old.added_by then
      raise exception 'added_by is immutable' using errcode = '23514';
    end if;

    -- If deactivating an active project lead, require replacement first
    if old.role = 'PROJECT_LEAD' and old.is_active = true and new.is_active = false then
      raise exception 'Cannot deactivate the active Project Lead. Please assign a new Project Lead first.'
        using errcode = '23514';
    end if;

    -- If promoting to PROJECT_LEAD, ensure active and demote prior lead
    if new.role = 'PROJECT_LEAD' then
      new.is_active := true;
      if pg_trigger_depth() <= 1 then
        update public.challenge_project_members
        set role = 'MEMBER'
        where project_id = new.project_id
          and role = 'PROJECT_LEAD'
          and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

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

-- 4. Harden Row Level Security (RLS) Policies

-- A. challenge_projects
-- UPDATE: Restricted strictly to authorized project managers (Admin, IM, Project Lead, Institution Coordinator)
drop policy if exists challenge_projects_update_authorized on public.challenge_projects;
create policy challenge_projects_update_authorized
on public.challenge_projects
for update
to authenticated
using (
  public.can_manage_challenge_project(id)
)
with check (
  public.can_manage_challenge_project(id)
);

-- B. challenge_project_members
-- INSERT: Restricted strictly to authorized project managers
drop policy if exists challenge_project_members_insert_authorized on public.challenge_project_members;
create policy challenge_project_members_insert_authorized
on public.challenge_project_members
for insert
to authenticated
with check (
  public.can_manage_challenge_project(project_id)
);

-- UPDATE: Restricted strictly to authorized project managers
drop policy if exists challenge_project_members_update_authorized on public.challenge_project_members;
create policy challenge_project_members_update_authorized
on public.challenge_project_members
for update
to authenticated
using (
  public.can_manage_challenge_project(project_id)
)
with check (
  public.can_manage_challenge_project(project_id)
);

-- C. challenge_project_activity
-- INSERT: Restricted to authorized project managers
drop policy if exists challenge_project_activity_insert_authorized on public.challenge_project_activity;
create policy challenge_project_activity_insert_authorized
on public.challenge_project_activity
for insert
to authenticated
with check (
  public.can_manage_challenge_project(project_id)
);
