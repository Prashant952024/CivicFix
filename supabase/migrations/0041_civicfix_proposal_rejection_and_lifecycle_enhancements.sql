-- Migration 0041: CivicFix Proposal Rejection Status & Enhanced Governance
-- 1. Add REJECTED status to public.research_proposals
-- 2. Add PROPOSAL_REJECTED activity type to public.challenge_project_activity
-- 3. Enhance enforce_research_proposal_governance trigger to support rejection, direct review actions, and immutability

-- 1. Update research_proposals status check constraint
alter table public.research_proposals drop constraint if exists research_proposals_status_check;
alter table public.research_proposals add constraint research_proposals_status_check check (
  status in (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'REQUESTED_REVISION',
    'RESUBMITTED',
    'APPROVED',
    'REJECTED'
  )
);

-- 2. Update challenge_project_activity activity_type check constraint
alter table public.challenge_project_activity drop constraint if exists challenge_project_activity_activity_type_check;
alter table public.challenge_project_activity add constraint challenge_project_activity_activity_type_check check (
  activity_type in (
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
    'PROPOSAL_APPROVED',
    'PROPOSAL_REJECTED'
  )
);

-- 3. Update Proposal Governance State Machine Trigger
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

  -- B. Content Immutability: Once submitted, proposal content is strictly immutable on that version
  if old.status in ('SUBMITTED', 'UNDER_REVIEW', 'REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
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
    -- 1. APPROVED and REJECTED are strictly terminal
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Approved and rejected research proposals are permanently locked and cannot be transitioned to any other state'
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

    -- 4. UNDER_REVIEW / SUBMITTED / RESUBMITTED -> REQUESTED_REVISION
    elsif (old.status in ('UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED')) and new.status = 'REQUESTED_REVISION' then
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

    -- 5. UNDER_REVIEW / SUBMITTED / RESUBMITTED -> APPROVED
    elsif (old.status in ('UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED')) and new.status = 'APPROVED' then
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

    -- 6. UNDER_REVIEW / SUBMITTED / RESUBMITTED -> REJECTED
    elsif (old.status in ('UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED')) and new.status = 'REJECTED' then
      if pg_trigger_depth() <= 1 and v_caller_profile is not null and not (v_is_manager or v_is_admin) then
        raise exception 'Only Innovation Managers and Admins can reject research proposals'
          using errcode = '23514';
      end if;

      if length(btrim(coalesce(new.review_feedback, ''))) < 10 then
        raise exception 'Rejection requires a meaningful reason of at least 10 characters'
          using errcode = '23514';
      end if;

      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
      new.reviewed_at := now();

      -- Log Activity
      insert into public.challenge_project_activity (
        project_id, actor_profile_id, activity_type, description, metadata
      ) values (
        old.project_id, coalesce(v_caller_profile, new.reviewed_by), 'PROPOSAL_REJECTED',
        format('Proposal version %s was REJECTED by Innovation Manager: "%s"', old.version_number, left(new.review_feedback, 120)),
        jsonb_build_object('proposal_id', old.id, 'version_number', old.version_number, 'reason', new.review_feedback)
      );

      -- Notify Project Lead & Project Creator
      select project_title, project_lead_profile_id, created_by 
      into v_project_rec 
      from public.challenge_projects 
      where id = old.project_id;

      perform public.dispatch_proposal_notification(
        coalesce(v_project_rec.project_lead_profile_id, v_project_rec.created_by),
        'Research Proposal Rejected',
        format('The research proposal for "%s" (v%s) was rejected by Innovation Manager: %s', v_project_rec.project_title, old.version_number, new.review_feedback)
      );

    -- 7. REQUESTED_REVISION -> RESUBMITTED
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

-- Ensure proposal trigger is active
drop trigger if exists trg_enforce_research_proposal_governance on public.research_proposals;
create trigger trg_enforce_research_proposal_governance
before update on public.research_proposals
for each row
execute function public.enforce_research_proposal_governance();

-- 4. Align handle_post_project_creation trigger function
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

-- 5. Align enforce_project_workspace_update_governance trigger function
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
