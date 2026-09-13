-- Migration 0039: CivicFix Research Team Member Profile & Management
-- Extends challenge_project_members to support non-authenticated research team members
-- (Faculty, Researchers, Students, Engineers, Technical Staff) without requiring Clerk/Supabase user accounts.

-- 1. Alter public.challenge_project_members columns
-- A. Make profile_id nullable for non-authenticated research team members
alter table public.challenge_project_members alter column profile_id drop not null;

-- B. Drop legacy unique constraint on (project_id, profile_id)
alter table public.challenge_project_members drop constraint if exists challenge_project_members_project_profile_unique;

-- C. Add partial unique index for active authenticated profiles
create unique index if not exists uq_active_project_member_profile 
on public.challenge_project_members (project_id, profile_id) 
where (profile_id is not null and is_active = true);

-- D. Add comprehensive research team member profile columns
alter table public.challenge_project_members
  add column if not exists member_name text,
  add column if not exists member_email text,
  add column if not exists member_type text,
  add column if not exists designation text,
  add column if not exists department text,
  add column if not exists organization text,
  add column if not exists institution_name text,
  add column if not exists academic_program text,
  add column if not exists academic_year text,
  add column if not exists academic_level text,
  add column if not exists specialization text,
  add column if not exists expected_graduation_year text,
  add column if not exists years_of_experience numeric,
  add column if not exists primary_expertise text,
  add column if not exists secondary_expertise text,
  add column if not exists expertise text,
  add column if not exists research_areas text[] not null default '{}'::text[],
  add column if not exists research_domains text[] not null default '{}'::text[],
  add column if not exists technical_skills text[] not null default '{}'::text[],
  add column if not exists technologies text[] not null default '{}'::text[],
  add column if not exists project_responsibility text,
  add column if not exists project_contribution text,
  add column if not exists professional_bio text,
  add column if not exists research_profile_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text;

-- E. Constraint: Member Type Validation
alter table public.challenge_project_members drop constraint if exists challenge_project_members_member_type_check;
alter table public.challenge_project_members add constraint challenge_project_members_member_type_check 
  check (member_type is null or member_type in ('STUDENT', 'FACULTY', 'RESEARCHER', 'PROFESSIONAL', 'TECHNICAL_STAFF', 'OTHER'));

-- F. Constraint: Expanded Project Roles
alter table public.challenge_project_members drop constraint if exists challenge_project_members_role_check;
alter table public.challenge_project_members add constraint challenge_project_members_role_check 
  check (role in ('PROJECT_LEAD', 'FACULTY', 'RESEARCHER', 'STUDENT', 'MEMBER', 'TECHNICAL_MEMBER', 'DOMAIN_EXPERT', 'DATA_SCIENTIST', 'ENGINEER', 'OTHER'));

-- G. Constraint: Identity requirement (either authenticated profile_id or both name and email provided)
alter table public.challenge_project_members drop constraint if exists chk_member_identity;
alter table public.challenge_project_members add constraint chk_member_identity 
  check (profile_id is not null or (length(btrim(coalesce(member_name, ''))) > 0 and length(btrim(coalesce(member_email, ''))) > 0));

-- H. Constraint: Email format validation
alter table public.challenge_project_members drop constraint if exists chk_member_email_format;
alter table public.challenge_project_members add constraint chk_member_email_format 
  check (member_email is null or member_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- I. Partial unique index for active member normalized email in the same project
create unique index if not exists uq_active_project_member_email 
on public.challenge_project_members (project_id, lower(btrim(member_email))) 
where (member_email is not null and is_active = true);

-- J. Supporting indexes
create index if not exists challenge_project_members_type_idx on public.challenge_project_members (member_type);
create index if not exists challenge_project_members_email_idx on public.challenge_project_members (lower(member_email));

-- 2. Backfill existing members with basic profile details
update public.challenge_project_members cpm
set
  member_name = coalesce(cpm.member_name, p.full_name),
  member_email = coalesce(cpm.member_email, lower(btrim(p.email))),
  member_type = coalesce(cpm.member_type,
    case
      when cpm.role = 'FACULTY' then 'FACULTY'
      when cpm.role = 'STUDENT' then 'STUDENT'
      when cpm.role = 'RESEARCHER' then 'RESEARCHER'
      else 'OTHER'
    end
  ),
  designation = coalesce(cpm.designation, p.designation)
from public.profiles p
where cpm.profile_id = p.id
  and (cpm.member_name is null or cpm.member_email is null);

-- 3. Update Activity Table Constraint to include MEMBER_DETAILS_UPDATED
alter table public.challenge_project_activity drop constraint if exists challenge_project_activity_activity_type_check;
alter table public.challenge_project_activity add constraint challenge_project_activity_activity_type_check check (
  activity_type in (
    'PROJECT_CREATED',
    'MEMBER_ADDED',
    'MEMBER_ROLE_CHANGED',
    'MEMBER_DETAILS_UPDATED',
    'MEMBER_DEACTIVATED',
    'MEMBER_REACTIVATED',
    'PROJECT_LEAD_CHANGED',
    'PROJECT_STATUS_CHANGED',
    'PROJECT_DETAILS_UPDATED'
  )
);

-- 4. Update Governance Trigger Function: enforce_project_member_governance
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
  v_candidate_profile uuid;
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

  -- B. Candidate member validation
  v_candidate_profile := coalesce(new.profile_id, old.profile_id);

  if v_candidate_profile is not null then
    -- Authenticated profile: resolve authoritative institution
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
    where p.id = v_candidate_profile;

    if v_member_inst is null or v_member_inst <> v_proj_inst then
      raise exception 'Candidate profile % does not belong to project institution % (belongs to %)',
        v_candidate_profile, v_proj_inst, coalesce(v_member_inst::text, 'none')
        using errcode = '23514';
    end if;
  else
    -- Non-authenticated research member validations
    if new.member_name is null or length(btrim(new.member_name)) = 0 then
      raise exception 'Full name is required for research team members' using errcode = '23514';
    end if;

    if new.member_email is null or length(btrim(new.member_email)) = 0 then
      raise exception 'Email is required for research team members' using errcode = '23514';
    end if;

    if new.member_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
      raise exception 'Invalid email address format' using errcode = '23514';
    end if;

    -- Normalize email
    new.member_email := lower(btrim(new.member_email));

    -- Default institution name if not provided
    if new.institution_name is null or length(btrim(new.institution_name)) = 0 then
      select name into new.institution_name from public.institutions where id = v_proj_inst;
    end if;
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

        if new.profile_id is not null then
          update public.challenge_projects
          set project_lead_profile_id = new.profile_id
          where id = new.project_id
            and project_lead_profile_id is distinct from new.profile_id;
        end if;
      end if;
    end if;

    new.updated_at := now();
    return new;
  end if;

  return new;
end;
$$;

-- 5. Update Activity Trigger Function: log_project_member_activity
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
    v_caller_profile := coalesce(new.added_by, (select created_by from public.challenge_projects where id = new.project_id));
  end if;

  v_member_name := coalesce(
    new.member_name,
    (select full_name from public.profiles where id = new.profile_id),
    'Team Member'
  );

  if tg_op = 'INSERT' then
    insert into public.challenge_project_activity (
      project_id, actor_profile_id, activity_type, description, metadata
    ) values (
      new.project_id,
      v_caller_profile,
      'MEMBER_ADDED',
      format('Added %s (%s) to the project team with role %s.', v_member_name, coalesce(new.member_type, 'Member'), new.role),
      jsonb_build_object(
        'member_id', new.id,
        'profile_id', new.profile_id,
        'member_name', v_member_name,
        'member_email', new.member_email,
        'member_type', new.member_type,
        'role', new.role,
        'department', new.department
      )
    );
  elsif tg_op = 'UPDATE' then
    -- Role change
    if new.role is distinct from old.role then
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        new.project_id,
        v_caller_profile,
        'MEMBER_ROLE_CHANGED',
        format('Changed role for %s from %s to %s.', v_member_name, old.role, new.role),
        jsonb_build_object(
          'member_id', new.id,
          'member_name', v_member_name,
          'old_role', old.role,
          'new_role', new.role
        )
      );
    end if;

    -- Activation / Deactivation
    if new.is_active is distinct from old.is_active then
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        new.project_id,
        v_caller_profile,
        case when new.is_active then 'MEMBER_REACTIVATED' else 'MEMBER_DEACTIVATED' end,
        case when new.is_active 
          then format('Reactivated %s in the project team.', v_member_name)
          else format('Deactivated %s from the project team.', v_member_name)
        end,
        jsonb_build_object(
          'member_id', new.id,
          'member_name', v_member_name,
          'is_active', new.is_active
        )
      );
    end if;

    -- Member details update (if not just role or status change)
    if (new.role is not distinct from old.role and new.is_active is not distinct from old.is_active) and (
      new.member_name is distinct from old.member_name
      or new.member_email is distinct from old.member_email
      or new.member_type is distinct from old.member_type
      or new.department is distinct from old.department
      or new.designation is distinct from old.designation
      or new.specialization is distinct from old.specialization
      or new.project_responsibility is distinct from old.project_responsibility
      or new.project_contribution is distinct from old.project_contribution
      or new.technical_skills is distinct from old.technical_skills
      or new.research_domains is distinct from old.research_domains
      or new.technologies is distinct from old.technologies
      or new.academic_program is distinct from old.academic_program
      or new.academic_year is distinct from old.academic_year
      or new.academic_level is distinct from old.academic_level
      or new.years_of_experience is distinct from old.years_of_experience
      or new.professional_bio is distinct from old.professional_bio
    ) then
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        new.project_id,
        v_caller_profile,
        'MEMBER_DETAILS_UPDATED',
        format('Updated research profile details for %s.', v_member_name),
        jsonb_build_object(
          'member_id', new.id,
          'member_name', v_member_name,
          'member_role', new.role,
          'member_type', new.member_type
        )
      );
    end if;
  end if;

  return new;
end;
$$;
