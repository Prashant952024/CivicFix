-- Migration 0041: Fix Project Workspace Post-Creation Trigger Conflict Target
-- Migration 0039 replaced the legacy unique constraint challenge_project_members_project_profile_unique
-- with partial unique index uq_active_project_member_profile on (project_id, profile_id) where (profile_id is not null and is_active = true).
-- This migration aligns handle_post_project_creation() and enforce_project_workspace_update_governance()
-- to specify the matching WHERE predicate for ON CONFLICT (project_id, profile_id).

-- 1. Align handle_post_project_creation trigger function
create or replace function public.handle_post_project_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Automatically add project lead to project members using the partial unique index predicate
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
  ) on conflict (project_id, profile_id) where (profile_id is not null and is_active = true) do update
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

-- Ensure trigger is active
drop trigger if exists trg_handle_post_project_creation on public.challenge_projects;
create trigger trg_handle_post_project_creation
after insert on public.challenge_projects
for each row
execute function public.handle_post_project_creation();

-- 2. Align enforce_project_workspace_update_governance trigger function
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
        ) on conflict (project_id, profile_id) where (profile_id is not null and is_active = true) do update
        set role = 'PROJECT_LEAD', is_active = true;
      else
        update public.challenge_project_members
        set role = 'MEMBER'
        where project_id = old.id
          and role = 'PROJECT_LEAD'
          and profile_id <> new.project_lead_profile_id;

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

-- Ensure trigger is active
drop trigger if exists trg_enforce_project_workspace_update_governance on public.challenge_projects;
create trigger trg_enforce_project_workspace_update_governance
before update on public.challenge_projects
for each row
execute function public.enforce_project_workspace_update_governance();
