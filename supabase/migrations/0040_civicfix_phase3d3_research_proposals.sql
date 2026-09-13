-- Migration 0040: CivicFix Phase 3D-3 Research Proposal Submission & Innovation Manager Review
-- Implements formal structured research proposals, versioning, status state machine,
-- completeness validation, audit logging, and notification dispatch.

-- 1. Create public.research_proposals table
create table if not exists public.research_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete restrict,
  institution_id uuid not null references public.institutions(id) on update cascade on delete restrict,
  version_number integer not null default 1,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_REVISION', 'RESUBMITTED', 'APPROVED'
  )),
  is_current boolean not null default true,

  -- 11 Structured Sections
  project_objective text not null default '',
  research_questions jsonb not null default '[]'::jsonb,
  proposed_methodology text not null default '',
  technical_approach text not null default '',
  team_capability_summary text,
  required_resources jsonb not null default '[]'::jsonb,
  expected_prototype text not null default '',
  milestones jsonb not null default '[]'::jsonb,
  deliverables jsonb not null default '[]'::jsonb,
  risks_and_mitigation jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,

  -- Governance & Review Metadata
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  revision_requested_at timestamptz,
  approved_by uuid references public.profiles(id) on update cascade on delete set null,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One version record per version number per project
  constraint uq_project_proposal_version unique (project_id, version_number)
);

-- Exactly one current proposal version per project
create unique index if not exists uq_current_project_proposal
  on public.research_proposals (project_id)
  where (is_current = true);

-- Performance & Lookup Indexes
create index if not exists research_proposals_project_id_idx on public.research_proposals (project_id);
create index if not exists research_proposals_challenge_id_idx on public.research_proposals (challenge_id);
create index if not exists research_proposals_institution_id_idx on public.research_proposals (institution_id);
create index if not exists research_proposals_status_idx on public.research_proposals (status);
create index if not exists research_proposals_is_current_idx on public.research_proposals (is_current);
create index if not exists research_proposals_submitted_at_idx on public.research_proposals (submitted_at desc);

-- 2. Extend challenge_project_activity check constraint for proposal audit codes
alter table public.challenge_project_activity drop constraint if exists challenge_project_activity_activity_type_check;
alter table public.challenge_project_activity add constraint challenge_project_activity_activity_type_check 
  check (activity_type in (
    'PROJECT_CREATED',
    'MEMBER_ADDED',
    'MEMBER_ROLE_CHANGED',
    'MEMBER_DEACTIVATED',
    'MEMBER_REACTIVATED',
    'PROJECT_LEAD_CHANGED',
    'PROJECT_STATUS_CHANGED',
    'PROJECT_DETAILS_UPDATED',
    'MEMBER_DETAILS_UPDATED',
    'PROPOSAL_CREATED',
    'PROPOSAL_UPDATED',
    'PROPOSAL_SUBMITTED',
    'PROPOSAL_REVIEW_STARTED',
    'PROPOSAL_REVISION_REQUESTED',
    'PROPOSAL_RESUBMITTED',
    'PROPOSAL_APPROVED'
  ));

-- 3. Notification Dispatch Helper
create or replace function public.dispatch_proposal_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is not null then
    insert into public.notifications (
      recipient_profile_id,
      notification_type,
      title,
      message,
      is_read,
      created_at
    ) values (
      p_recipient_id,
      'STATUS_CHANGE',
      p_title,
      p_message,
      false,
      now()
    );
  end if;
exception when others then
  -- Fail-safe: do not abort proposal transaction if notification insert fails
  raise warning 'dispatch_proposal_notification failed: %', sqlerrm;
end;
$$;

-- 4. Proposal Creation Validation Trigger
create or replace function public.validate_research_proposal_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proj_challenge uuid;
  v_proj_inst uuid;
  v_caller_profile uuid;
  v_prev_status text;
  v_max_version integer;
begin
  -- A. Verify project existence and foreign key consistency
  select challenge_id, institution_id 
  into v_proj_challenge, v_proj_inst
  from public.challenge_projects
  where id = new.project_id;

  if v_proj_challenge is null then
    raise exception 'Project % does not exist', new.project_id
      using errcode = '23503';
  end if;

  if new.challenge_id <> v_proj_challenge then
    raise exception 'Proposal challenge_id (%) does not match project challenge_id (%)', 
      new.challenge_id, v_proj_challenge
      using errcode = '23514';
  end if;

  if new.institution_id <> v_proj_inst then
    raise exception 'Proposal institution_id (%) does not match project institution_id (%)', 
      new.institution_id, v_proj_inst
      using errcode = '23514';
  end if;

  v_caller_profile := public.current_profile_id();

  -- B. Caller Authorization: must be authorized project lead or institution coordinator
  if pg_trigger_depth() <= 1 and v_caller_profile is not null then
    if not public.can_manage_challenge_project(new.project_id, v_caller_profile) then
      raise exception 'You do not have authority to create research proposals for this project'
        using errcode = '23514';
    end if;
  end if;

  -- C. Versioning Rules
  select coalesce(max(version_number), 0)
  into v_max_version
  from public.research_proposals
  where project_id = new.project_id;

  if new.version_number is null or new.version_number <= 0 then
    new.version_number := v_max_version + 1;
  end if;

  if new.version_number = 1 then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'Initial proposal version must be in DRAFT or SUBMITTED status'
        using errcode = '23514';
    end if;
  else
    -- Creating a subsequent revision (v2+):
    -- Prior version must be in REQUESTED_REVISION or UNDER_REVIEW
    select status into v_prev_status
    from public.research_proposals
    where project_id = new.project_id and version_number = new.version_number - 1;

    if v_prev_status is null then
      raise exception 'Cannot create proposal version % without preceding version %',
        new.version_number, new.version_number - 1
        using errcode = '23514';
    end if;

    if v_prev_status not in ('REQUESTED_REVISION', 'UNDER_REVIEW') then
      raise exception 'Cannot create proposal revision while preceding version is in status %', v_prev_status
        using errcode = '23514';
    end if;

    -- Demote all previous versions from is_current
    update public.research_proposals
    set is_current = false, updated_at = now()
    where project_id = new.project_id and is_current = true;
  end if;

  new.is_current := true;
  new.created_at := now();
  new.updated_at := now();

  -- D. Audit Log
  insert into public.challenge_project_activity (
    project_id,
    actor_profile_id,
    activity_type,
    description,
    metadata
  ) values (
    new.project_id,
    coalesce(v_caller_profile, new.submitted_by),
    'PROPOSAL_CREATED',
    format('Research proposal version %s created.', new.version_number),
    jsonb_build_object(
      'proposal_id', new.id,
      'version_number', new.version_number,
      'status', new.status
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_validate_research_proposal_creation on public.research_proposals;
create trigger trg_validate_research_proposal_creation
before insert on public.research_proposals
for each row
execute function public.validate_research_proposal_creation();

-- 5. Proposal Governance & Lifecycle State Machine Trigger
create or replace function public.enforce_research_proposal_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_profile uuid;
  v_is_manager boolean;
  v_is_admin boolean;
  v_caller_inst uuid;
  v_manager_rec record;
  v_project_rec record;
begin
  -- A. Immutable Foreign Keys & Version Metadata
  if new.project_id is distinct from old.project_id then
    raise exception 'project_id is immutable' using errcode = '23514';
  end if;

  if new.challenge_id is distinct from old.challenge_id then
    raise exception 'challenge_id is immutable' using errcode = '23514';
  end if;

  if new.institution_id is distinct from old.institution_id then
    raise exception 'institution_id is immutable' using errcode = '23514';
  end if;

  if new.version_number is distinct from old.version_number then
    raise exception 'version_number is immutable' using errcode = '23514';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'created_at is immutable' using errcode = '23514';
  end if;

  v_caller_profile := public.current_profile_id();

  -- Identify caller role context
  select 
    exists (
      select 1 from public.profiles p
      join public.roles r on p.role_id = r.id
      where p.id = v_caller_profile and r.code = 'INNOVATION_MANAGER'
    ) into v_is_manager;

  select 
    exists (
      select 1 from public.profiles p
      join public.roles r on p.role_id = r.id
      where p.id = v_caller_profile and r.code = 'ADMIN'
    ) into v_is_admin;

  -- B. Content Immutability: Once submitted, proposal content is immutable on that version
  if old.status in ('SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_REVISION', 'APPROVED') then
    if (
      new.project_objective is distinct from old.project_objective or
      new.research_questions is distinct from old.research_questions or
      new.proposed_methodology is distinct from old.proposed_methodology or
      new.technical_approach is distinct from old.technical_approach or
      new.team_capability_summary is distinct from old.team_capability_summary or
      new.required_resources is distinct from old.required_resources or
      new.expected_prototype is distinct from old.expected_prototype or
      new.milestones is distinct from old.milestones or
      new.deliverables is distinct from old.deliverables or
      new.risks_and_mitigation is distinct from old.risks_and_mitigation or
      new.success_metrics is distinct from old.success_metrics
    ) then
      raise exception 'Submitted proposal content is immutable for version %. Create a new revision version to make changes.', old.version_number
        using errcode = '23514';
    end if;
  end if;

  -- C. Status State Machine Transition Rules
  if new.status is distinct from old.status then
    -- 1. APPROVED is strictly terminal
    if old.status = 'APPROVED' then
      raise exception 'Approved research proposals are permanently locked and cannot be transitioned to any other state'
        using errcode = '23514';
    end if;

    -- 2. DRAFT -> SUBMITTED
    if old.status = 'DRAFT' and new.status = 'SUBMITTED' then
      -- Verify caller has project management authority
      if pg_trigger_depth() <= 1 and v_caller_profile is not null then
        if not public.can_manage_challenge_project(old.project_id, v_caller_profile) then
          raise exception 'You do not have authority to submit this proposal'
            using errcode = '23514';
        end if;
      end if;

      -- Validate Completeness Checklist
      if length(btrim(coalesce(new.project_objective, ''))) < 20 then
        raise exception 'Submission rejected: Project objective must be at least 20 characters'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.research_questions, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one research question is required'
          using errcode = '23514';
      end if;

      if length(btrim(coalesce(new.proposed_methodology, ''))) < 20 then
        raise exception 'Submission rejected: Proposed methodology must be at least 20 characters'
          using errcode = '23514';
      end if;

      if length(btrim(coalesce(new.technical_approach, ''))) < 20 then
        raise exception 'Submission rejected: Technical approach must be at least 20 characters'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.required_resources, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one required resource must be specified'
          using errcode = '23514';
      end if;

      if length(btrim(coalesce(new.expected_prototype, ''))) < 10 then
        raise exception 'Submission rejected: Expected prototype description must be at least 10 characters'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.milestones, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one milestone is required'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.deliverables, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one deliverable is required'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.risks_and_mitigation, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one risk and mitigation strategy is required'
          using errcode = '23514';
      end if;

      if jsonb_array_length(coalesce(new.success_metrics, '[]'::jsonb)) < 1 then
        raise exception 'Submission rejected: At least one success metric is required'
          using errcode = '23514';
      end if;

      new.submitted_by := coalesce(v_caller_profile, old.submitted_by);
      new.submitted_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.submitted_by), 'PROPOSAL_SUBMITTED',
        format('Research proposal version %s submitted for Innovation Manager review.', old.version_number),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number)
      );

      -- Notify Innovation Managers & Admins
      select project_title into v_project_rec from public.challenge_projects where id = old.project_id;
      for v_manager_rec in (
        select p.id from public.profiles p
        join public.roles r on p.role_id = r.id
        where r.code in ('INNOVATION_MANAGER', 'ADMIN')
      ) loop
        perform public.dispatch_proposal_notification(
          v_manager_rec.id,
          'Research Proposal Submitted',
          format('A research proposal has been submitted for project "%s" (v%s).', v_project_rec.project_title, old.version_number)
        );
      end loop;

    -- 3. SUBMITTED / RESUBMITTED -> UNDER_REVIEW
    elsif (old.status in ('SUBMITTED', 'RESUBMITTED')) and new.status = 'UNDER_REVIEW' then
      if pg_trigger_depth() <= 1 and v_caller_profile is not null and not (v_is_manager or v_is_admin) then
        raise exception 'Only Innovation Managers and Admins can review research proposals'
          using errcode = '23514';
      end if;

      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
      new.reviewed_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.reviewed_by), 'PROPOSAL_REVIEW_STARTED',
        format('Innovation Manager began review of proposal version %s.', old.version_number),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number)
      );

    -- 4. UNDER_REVIEW -> REQUESTED_REVISION
    elsif old.status = 'UNDER_REVIEW' and new.status = 'REQUESTED_REVISION' then
      if pg_trigger_depth() <= 1 and v_caller_profile is not null and not (v_is_manager or v_is_admin) then
        raise exception 'Only Innovation Managers and Admins can request proposal revisions'
          using errcode = '23514';
      end if;

      if length(btrim(coalesce(new.review_feedback, ''))) < 10 then
        raise exception 'Revision request requires meaningful feedback of at least 10 characters'
          using errcode = '23514';
      end if;

      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
      new.reviewed_at := now();
      new.revision_requested_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.reviewed_by), 'PROPOSAL_REVISION_REQUESTED',
        format('Revision requested for proposal version %s: "%s"', old.version_number, left(new.review_feedback, 120)),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number, 'feedback', new.review_feedback)
      );

      -- Notify Project Lead & Project Creator
      select project_title, project_lead_profile_id, created_by 
      into v_project_rec 
      from public.challenge_projects 
      where id = old.project_id;

      perform public.dispatch_proposal_notification(
        coalesce(v_project_rec.project_lead_profile_id, v_project_rec.created_by),
        'Proposal Revision Requested',
        format('Innovation Manager requested revisions for project "%s": %s', v_project_rec.project_title, new.review_feedback)
      );

    -- 5. UNDER_REVIEW -> APPROVED
    elsif old.status = 'UNDER_REVIEW' and new.status = 'APPROVED' then
      if pg_trigger_depth() <= 1 and v_caller_profile is not null and not (v_is_manager or v_is_admin) then
        raise exception 'Only Innovation Managers and Admins can approve research proposals'
          using errcode = '23514';
      end if;

      -- Anti-Self-Approval Rule: Reviewer cannot belong to the proposal's institution
      select coalesce(
        p.institution_id,
        (select im.institution_id from public.institution_members im where im.profile_id = p.id limit 1)
      ) into v_caller_inst
      from public.profiles p
      where p.id = v_caller_profile;

      if v_caller_inst is not null and v_caller_inst = old.institution_id and not v_is_admin then
        raise exception 'Self-approval blocked: Reviewer belongs to the submitting institution'
          using errcode = '23514';
      end if;

      new.approved_by := coalesce(v_caller_profile, old.approved_by);
      new.approved_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.approved_by), 'PROPOSAL_APPROVED',
        format('Research proposal version %s has been APPROVED by Innovation Manager.', old.version_number),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number)
      );

      -- Notify Project Lead & Project Creator
      select project_title, project_lead_profile_id, created_by 
      into v_project_rec 
      from public.challenge_projects 
      where id = old.project_id;

      perform public.dispatch_proposal_notification(
        coalesce(v_project_rec.project_lead_profile_id, v_project_rec.created_by),
        'Research Proposal Approved',
        format('Congratulations! The research proposal for "%s" has been approved.', v_project_rec.project_title)
      );

    -- 6. REQUESTED_REVISION -> RESUBMITTED
    elsif old.status = 'REQUESTED_REVISION' and new.status = 'RESUBMITTED' then
      if pg_trigger_depth() <= 1 and v_caller_profile is not null then
        if not public.can_manage_challenge_project(old.project_id, v_caller_profile) then
          raise exception 'You do not have authority to resubmit this proposal'
            using errcode = '23514';
        end if;
      end if;

      new.submitted_by := coalesce(v_caller_profile, old.submitted_by);
      new.submitted_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.submitted_by), 'PROPOSAL_RESUBMITTED',
        format('Revised proposal version %s resubmitted for review.', old.version_number),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number)
      );

      -- Notify Innovation Managers
      select project_title into v_project_rec from public.challenge_projects where id = old.project_id;
      for v_manager_rec in (
        select p.id from public.profiles p
        join public.roles r on p.role_id = r.id
        where r.code in ('INNOVATION_MANAGER', 'ADMIN')
      ) loop
        perform public.dispatch_proposal_notification(
          v_manager_rec.id,
          'Research Proposal Resubmitted',
          format('A revised proposal has been submitted for project "%s" (v%s).', v_project_rec.project_title, old.version_number)
        );
      end loop;

    else
      -- Arbitrary jump blocked!
      raise exception 'Illegal status transition from % to % for research proposal', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_research_proposal_governance on public.research_proposals;
create trigger trg_enforce_research_proposal_governance
before update on public.research_proposals
for each row
execute function public.enforce_research_proposal_governance();

-- 6. Row Level Security (RLS)
alter table public.research_proposals enable row level security;

-- A. SELECT: Authorized managers, Admins, or members of the owning institution
drop policy if exists research_proposals_select_authorized on public.research_proposals;
create policy research_proposals_select_authorized
on public.research_proposals
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

-- B. INSERT: Authorized Project Lead or Institution Coordinator
drop policy if exists research_proposals_insert_authorized on public.research_proposals;
create policy research_proposals_insert_authorized
on public.research_proposals
for insert
to authenticated
with check (
  public.can_manage_challenge_project(project_id)
);

-- C. UPDATE: Authorized project managers (for drafts/submissions) or Innovation Managers/Admins (for review/approval)
drop policy if exists research_proposals_update_authorized on public.research_proposals;
create policy research_proposals_update_authorized
on public.research_proposals
for update
to authenticated
using (
  public.can_manage_challenge_project(project_id)
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.can_manage_challenge_project(project_id)
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- D. DELETE: Prohibited for all users to protect proposal audit trail
drop policy if exists research_proposals_delete_prohibited on public.research_proposals;
create policy research_proposals_delete_prohibited
on public.research_proposals
for delete
to authenticated
using (false);
