-- ============================================================================
-- CivicFix Phase 4.5: Atomic Infrastructure Assessment Version Creation
-- ============================================================================
-- Description:
-- Replaces client-side version calculation (read latest -> version + 1 -> insert)
-- with an atomic, concurrency-safe PostgreSQL function:
-- public.create_atomic_infrastructure_assessment(...)
--
-- Guarantees:
-- 1. Row-level lock on the parent issue row (SELECT ... FOR UPDATE) to serialize
--    version allocation per issue across concurrent transactions.
-- 2. Calculates next sequential assessment_version (COALESCE(MAX, 0) + 1) atomically.
-- 3. Atomically demotes prior latest assessments (is_latest = false).
-- 4. Inserts new assessment with is_latest = true and returns created row.
-- 5. Role-based authorization guard: Only ADMIN role or service_role can execute.
-- 6. SECURITY DEFINER with set search_path = public, pg_temp.
-- ============================================================================

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

comment on function public.create_atomic_infrastructure_assessment is 'Atomically serializes and allocates next assessment_version for an issue, demotes prior latest versions, inserts the new record, and returns the created assessment.';

-- 8. Execution grants
revoke execute on function public.create_atomic_infrastructure_assessment(
  uuid, text, text, numeric, integer, integer, integer, numeric, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text[], text, uuid
) from public;

grant execute on function public.create_atomic_infrastructure_assessment(
  uuid, text, text, numeric, integer, integer, integer, numeric, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text[], text, uuid
) to authenticated, service_role;
