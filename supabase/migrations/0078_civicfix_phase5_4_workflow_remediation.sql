-- CivicFix Migration 0078: Phase 5.4 Workflow & State-Machine Security Remediation
-- Corrective migration addressing Findings WF-01 through WF-06.

-- ============================================================================
-- 1. WF-01 & WF-04: DEPLOYMENT PLANS AUTHORIZATION & SELF-APPROVAL GOVERNANCE
-- ============================================================================

-- Drop insecure open-update policy
drop policy if exists "Users can update deployment plans" on public.deployment_plans;
drop policy if exists "deployment_plans_update_authorized" on public.deployment_plans;

create policy "deployment_plans_update_authorized"
  on public.deployment_plans
  for update
  to authenticated
  using (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
    or created_by = public.current_profile_id()
    or submitted_by = public.current_profile_id()
    or institution_id = public.current_user_institution_id()
  )
  with check (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
    or created_by = public.current_profile_id()
    or submitted_by = public.current_profile_id()
    or institution_id = public.current_user_institution_id()
  );

-- Update status transition & self-approval guard function for deployment_plans
create or replace function public.fn_deployment_plan_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead_id uuid;
  v_caller_profile uuid;
  v_caller_inst uuid;
  v_is_manager_or_admin boolean;
begin
  v_caller_profile := public.current_profile_id();
  v_is_manager_or_admin := public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code, 'ADMIN'::public.role_code]);

  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New deployment plan must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, timezone('utc'::text, now()));
      new.deployment_decision := 'PENDING_REVIEW';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- Protect terminal approved/rejected states from status reverts
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify deployment plan in terminal % status', old.status;
    end if;

    -- State machine transitions
    if old.status = 'DRAFT' and new.status not in ('SUBMITTED', 'UNDER_REVIEW') then
      raise exception 'Invalid transition from DRAFT to %', new.status;
    elsif old.status = 'SUBMITTED' and new.status not in ('UNDER_REVIEW', 'REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from SUBMITTED to %', new.status;
    elsif old.status = 'UNDER_REVIEW' and new.status not in ('REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from UNDER_REVIEW to %', new.status;
    elsif old.status = 'REQUESTED_REVISION' and new.status not in ('RESUBMITTED', 'UNDER_REVIEW') then
      raise exception 'Invalid transition from REQUESTED_REVISION to %', new.status;
    elsif old.status = 'RESUBMITTED' and new.status not in ('UNDER_REVIEW', 'REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from RESUBMITTED to %', new.status;
    end if;

    -- Resolve project lead for anti-self-approval rule
    select project_lead_profile_id into v_lead_id
    from public.challenge_projects
    where id = new.project_id;

    -- Self-approval & review role verification
    if new.status in ('APPROVED', 'REJECTED', 'UNDER_REVIEW', 'REQUESTED_REVISION') then
      if not v_is_manager_or_admin then
        raise exception 'Only Innovation Managers and Admins can review, approve, or reject deployment plans.';
      end if;

      if v_caller_profile is not null and (v_caller_profile = v_lead_id or v_caller_profile = old.created_by or v_caller_profile = old.submitted_by) and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
        raise exception 'Self-approval blocked: Applicant or project lead cannot approve or review their own deployment plan.';
      end if;

      if new.approved_by is not null and (new.approved_by = v_lead_id or new.approved_by = old.created_by) and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
        raise exception 'University project lead cannot approve or reject their own deployment plan.';
      end if;
    end if;

    -- Timestamp and payload updates
    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
      new.deployment_decision := 'REQUESTED_REVISION';
    elsif new.status = 'RESUBMITTED' then
      new.version := old.version + 1;
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'APPROVED' then
      new.approved_at := timezone('utc'::text, now());
      new.approved_by := coalesce(v_caller_profile, old.approved_by);
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := coalesce(new.deployment_decision, 'APPROVED_FOR_SCALE_UP');
      update public.challenge_projects
      set research_stage = 'DEPLOYMENT_READY', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('VALIDATION', 'PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.rejected_by := coalesce(v_caller_profile, old.rejected_by);
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'REJECTED';
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  if tg_op = 'UPDATE' and old.deployment_started_at is null and new.deployment_started_at is not null then
    if new.status != 'APPROVED' then
      raise exception 'Cannot start large-scale deployment before deployment plan is APPROVED';
    end if;
    update public.challenge_projects
    set research_stage = 'DEPLOYMENT_ACTIVE', updated_at = timezone('utc'::text, now())
    where id = new.project_id;
  end if;

  return new;
end;
$$;


-- ============================================================================
-- 2. WF-02 & WF-04: PILOT VALIDATION RESULTS & KPI AUTHORIZATION REMEDIATION
-- ============================================================================

drop policy if exists "Users can insert validation results for own institution projects" on public.pilot_validation_results;
drop policy if exists "Users can update validation results for accessible projects" on public.pilot_validation_results;
drop policy if exists "pilot_validation_results_insert_authorized" on public.pilot_validation_results;
drop policy if exists "pilot_validation_results_update_authorized" on public.pilot_validation_results;

create policy "pilot_validation_results_insert_authorized"
  on public.pilot_validation_results
  for insert
  to authenticated
  with check (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
    or institution_id = public.current_user_institution_id()
  );

create policy "pilot_validation_results_update_authorized"
  on public.pilot_validation_results
  for update
  to authenticated
  using (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
    or created_by = public.current_profile_id()
    or institution_id = public.current_user_institution_id()
  )
  with check (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or public.can_manage_challenge_project(project_id)
    or created_by = public.current_profile_id()
    or institution_id = public.current_user_institution_id()
  );

-- Update status transition & self-approval guard for pilot_validation_results
create or replace function public.fn_pilot_validation_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead_id uuid;
  v_caller_profile uuid;
  v_is_manager_or_admin boolean;
begin
  v_caller_profile := public.current_profile_id();
  v_is_manager_or_admin := public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code, 'ADMIN'::public.role_code]);

  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New validation must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, timezone('utc'::text, now()));
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify validation result in terminal % status', old.status;
    end if;

    select project_lead_profile_id into v_lead_id
    from public.challenge_projects
    where id = new.project_id;

    if new.status in ('APPROVED', 'REJECTED', 'UNDER_REVIEW', 'REQUESTED_REVISION') then
      if not v_is_manager_or_admin then
        raise exception 'Only Innovation Managers and Admins can review, approve, or reject pilot validation results.';
      end if;

      if v_caller_profile is not null and (v_caller_profile = v_lead_id or v_caller_profile = old.created_by) and not public.current_user_has_role(array['ADMIN'::public.role_code]) then
        raise exception 'Self-approval blocked: Applicant or project lead cannot approve or review their own pilot validation.';
      end if;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.reviewed_by := coalesce(v_caller_profile, old.reviewed_by);
    elsif new.status = 'APPROVED' then
      new.approved_at := timezone('utc'::text, now());
      new.approved_by := coalesce(v_caller_profile, old.approved_by);
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.rejected_by := coalesce(v_caller_profile, old.rejected_by);
      new.reviewed_at := timezone('utc'::text, now());
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  return new;
end;
$$;

-- Remediate KPI results policies
drop policy if exists "Users can manage KPI results" on public.pilot_validation_kpi_results;
drop policy if exists "pilot_validation_kpi_results_insert_authorized" on public.pilot_validation_kpi_results;
drop policy if exists "pilot_validation_kpi_results_update_authorized" on public.pilot_validation_kpi_results;

create policy "pilot_validation_kpi_results_insert_authorized"
  on public.pilot_validation_kpi_results
  for insert
  to authenticated
  with check (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or exists (
      select 1 from public.pilot_validation_results v
      where v.id = pilot_validation_kpi_results.validation_id
        and (
          v.created_by = public.current_profile_id()
          or public.can_manage_challenge_project(v.project_id)
          or v.institution_id = public.current_user_institution_id()
        )
    )
  );

create policy "pilot_validation_kpi_results_update_authorized"
  on public.pilot_validation_kpi_results
  for all
  to authenticated
  using (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    or exists (
      select 1 from public.pilot_validation_results v
      where v.id = pilot_validation_kpi_results.validation_id
        and (
          v.created_by = public.current_profile_id()
          or public.can_manage_challenge_project(v.project_id)
          or v.institution_id = public.current_user_institution_id()
        )
    )
  );


-- ============================================================================
-- 3. WF-03: ISSUES.STATUS DIRECT UPDATE VALIDATION & HISTORY INTEGRITY
-- ============================================================================

create or replace function public.fn_enforce_issue_status_direct_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- If update was NOT initiated by issue_status_history sync trigger (depth <= 1)
    if pg_trigger_depth() <= 1 then
      insert into public.issue_status_history (
        issue_id,
        old_status,
        new_status,
        changed_by_profile_id,
        notes
      ) values (
        new.id,
        old.status,
        new.status,
        public.current_profile_id(),
        'Direct status update'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_issue_status_direct_update on public.issues;
create trigger trg_enforce_issue_status_direct_update
  before update of status on public.issues
  for each row
  execute function public.fn_enforce_issue_status_direct_update();


-- ============================================================================
-- 4. WF-05: INFRASTRUCTURE DECISIONS ASSESSMENT LINKING & GOVERNANCE
-- ============================================================================

create or replace function public.fn_enforce_infrastructure_decision_assessment_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assessment_issue_id uuid;
begin
  if new.assessment_id is null then
    raise exception 'Infrastructure decision requires a valid infrastructure assessment reference (assessment_id cannot be null).';
  end if;

  select issue_id into v_assessment_issue_id
  from public.infrastructure_assessments
  where id = new.assessment_id;

  if v_assessment_issue_id is null then
    raise exception 'Referenced infrastructure assessment % does not exist.', new.assessment_id;
  end if;

  if v_assessment_issue_id <> new.issue_id then
    raise exception 'Mismatched infrastructure assessment: assessment % belongs to issue %, not decision issue %.',
      new.assessment_id, v_assessment_issue_id, new.issue_id;
  end if;

  if not public.current_user_has_role(array['ADMIN'::public.role_code]) then
    raise exception 'Only ADMIN can create or modify infrastructure decisions.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_infrastructure_decision_assessment_link on public.infrastructure_decisions;
create trigger trg_enforce_infrastructure_decision_assessment_link
  before insert or update on public.infrastructure_decisions
  for each row
  execute function public.fn_enforce_infrastructure_decision_assessment_link();


-- ============================================================================
-- 5. WF-06: INFRASTRUCTURE ASSESSMENTS ATOMIC RPC ENFORCEMENT
-- ============================================================================

-- Update atomic assessment creation RPC to set execution context flag
create or replace function public.create_atomic_infrastructure_assessment(
  p_issue_id uuid,
  p_district_id text,
  p_planning_sector_code text,
  p_estimated_project_cost_crore numeric default null,
  p_estimated_project_duration_months integer default null,
  p_estimated_beneficiaries integer default null,
  p_affected_households integer default null,
  p_data_completeness_score numeric default null,
  p_demographic_context jsonb default '{}'::jsonb,
  p_budget_context jsonb default '{}'::jsonb,
  p_geography_context jsonb default '{}'::jsonb,
  p_infrastructure_context jsonb default '{}'::jsonb,
  p_accessibility_context jsonb default '{}'::jsonb,
  p_socioeconomic_context jsonb default '{}'::jsonb,
  p_historical_cost_context jsonb default '{}'::jsonb,
  p_similar_requests_context jsonb default '{}'::jsonb,
  p_feasibility_indicators jsonb default '{}'::jsonb,
  p_sustainability_indicators jsonb default '{}'::jsonb,
  p_risks_and_missing_info text[] default '{}'::text[],
  p_assessment_summary text default null,
  p_generated_by uuid default null
)
returns public.infrastructure_assessments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_profile_id uuid;
  v_next_version integer;
  v_created_row public.infrastructure_assessments;
begin
  -- 1. Authorization Guard (Admin or Service Role required)
  if auth.role() <> 'service_role' then
    if not public.current_user_has_role(array['ADMIN'::public.role_code]) then
      raise exception 'Access denied: Only administrators can generate infrastructure assessments.'
        using errcode = '42501';
    end if;
  end if;

  -- Set execution context flag to authorize insert
  perform set_config('civicfix.in_atomic_assessment_rpc', 'true', true);

  -- 2. Parameter validation
  if p_issue_id is null then
    raise exception 'Invalid issue_id: cannot be null' using errcode = '22023';
  end if;
  if p_district_id is null or trim(p_district_id) = '' then
    raise exception 'Invalid district_id: cannot be null or empty' using errcode = '22023';
  end if;
  if p_planning_sector_code is null or trim(p_planning_sector_code) = '' then
    raise exception 'Invalid planning_sector_code: cannot be null or empty' using errcode = '22023';
  end if;

  -- 3. Resolve generated_by profile identity
  v_caller_profile_id := coalesce(p_generated_by, public.current_profile_id());

  -- 4. Lock parent issue row to serialize version allocation per issue
  perform 1
  from public.issues
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'Issue % not found', p_issue_id using errcode = '22023';
  end if;

  -- 5. Atomically compute the next assessment version for this issue
  select coalesce(max(assessment_version), 0) + 1
  into v_next_version
  from public.infrastructure_assessments
  where issue_id = p_issue_id;

  -- 6. Atomically demote previous versions to maintain is_latest single-latest invariant
  update public.infrastructure_assessments
  set is_latest = false,
      updated_at = now()
  where issue_id = p_issue_id
    and is_latest = true;

  -- 7. Insert new assessment version atomically
  insert into public.infrastructure_assessments (
    issue_id,
    district_id,
    planning_sector_code,
    assessment_version,
    is_latest,
    estimated_project_cost_crore,
    estimated_project_duration_months,
    estimated_beneficiaries,
    affected_households,
    data_completeness_score,
    demographic_context,
    budget_context,
    geography_context,
    infrastructure_context,
    accessibility_context,
    socioeconomic_context,
    historical_cost_context,
    similar_requests_context,
    feasibility_indicators,
    sustainability_indicators,
    risks_and_missing_info,
    assessment_summary,
    generated_by
  ) values (
    p_issue_id,
    p_district_id,
    p_planning_sector_code,
    v_next_version,
    true,
    p_estimated_project_cost_crore,
    p_estimated_project_duration_months,
    p_estimated_beneficiaries,
    p_affected_households,
    p_data_completeness_score,
    coalesce(p_demographic_context, '{}'::jsonb),
    coalesce(p_budget_context, '{}'::jsonb),
    coalesce(p_geography_context, '{}'::jsonb),
    coalesce(p_infrastructure_context, '{}'::jsonb),
    coalesce(p_accessibility_context, '{}'::jsonb),
    coalesce(p_socioeconomic_context, '{}'::jsonb),
    coalesce(p_historical_cost_context, '{}'::jsonb),
    coalesce(p_similar_requests_context, '{}'::jsonb),
    coalesce(p_feasibility_indicators, '{}'::jsonb),
    coalesce(p_sustainability_indicators, '{}'::jsonb),
    coalesce(p_risks_and_missing_info, '{}'::text[]),
    p_assessment_summary,
    v_caller_profile_id
  )
  returning * into v_created_row;

  return v_created_row;
end;
$$;

-- Trigger to enforce creation path via atomic RPC
create or replace function public.fn_enforce_infrastructure_assessment_creation_path()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if current_setting('civicfix.in_atomic_assessment_rpc', true) is distinct from 'true' then
      raise exception 'Direct INSERT on infrastructure_assessments is restricted. Use public.create_atomic_infrastructure_assessment(...) RPC.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_infrastructure_assessment_creation_path on public.infrastructure_assessments;
create trigger trg_enforce_infrastructure_assessment_creation_path
  before insert on public.infrastructure_assessments
  for each row
  execute function public.fn_enforce_infrastructure_assessment_creation_path();
