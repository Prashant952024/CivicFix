-- ============================================================================
-- CivicFix Phase 1 Security Hardening: Migration 0072
-- ============================================================================
-- Description:
-- 1. Defensively drops and revokes residual debug SECURITY DEFINER functions.
-- 2. Hardens get_district_infrastructure_context RPC authorization guard
--    to fail closed on null/anonymous Clerk user IDs.
-- 3. Sets explicit `set search_path = public` on SECURITY DEFINER functions
--    from migrations 0047, 0048, and 0049 to prevent search_path hijacking.
-- ============================================================================

-- 1. Drop and clean up exposed debug functions
drop function if exists public.debug_inspect_worker_system();
drop function if exists public.debug_simulate_worker_query();
drop function if exists public.debug_get_fkey_info();

-- 2. Harden get_district_infrastructure_context authorization (fail closed on null caller)
create or replace function public.get_district_infrastructure_context(
  p_district_id text,
  p_planning_sector_code text,
  p_financial_year text default null,
  p_infrastructure_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_district record;
  v_source_prefix text;
  v_d1_source text;
  v_d2_source text;
  v_d3_source text;
  v_d4_source text;
  v_d5_source text;
  v_d6_source text;
  v_d7_source text;
  
  v_resolved_fy text;
  v_population jsonb;
  v_budget jsonb;
  v_geography jsonb;
  v_infrastructure_assets jsonb;
  v_accessibility jsonb;
  v_socioeconomic jsonb;
  v_historical_projects jsonb;
  
  v_hist_count integer;
  v_avg_actual_cost numeric(12, 2);
  v_avg_cost_per_ben numeric(10, 2);
  v_avg_exec_eff numeric(5, 2);
  v_avg_cost_var numeric(6, 2);
  v_avg_time_var numeric(6, 2);
  v_hist_list jsonb;
begin
  -- 1. Authorization Guard (Fail closed: Must be authenticated AND have authorized role)
  if public.requesting_clerk_user_id() is null or not public.current_user_has_role(array[
    'ADMIN'::public.role_code,
    'MUNICIPAL_OFFICER'::public.role_code,
    'DEPARTMENT_MANAGER'::public.role_code
  ]) then
    raise exception 'Access denied. Only authorized staff and administrators can access district infrastructure context.'
      using errcode = '42501';
  end if;

  -- 2. Input Validation: District Identity
  if p_district_id is null or btrim(p_district_id) = '' then
    raise exception 'Parameter p_district_id is required.'
      using errcode = '22023';
  end if;

  select id, country_code, state_code, state_name, district_name, canonical_source, alternate_source_codes
  into v_district
  from public.districts
  where id = p_district_id;

  if v_district.id is null then
    raise exception 'District "%" not found in canonical districts master.', p_district_id
      using errcode = 'P0002';
  end if;

  -- 3. Input Validation: Planning Sector
  if p_planning_sector_code is null or btrim(p_planning_sector_code) = '' then
    raise exception 'Parameter p_planning_sector_code is required.'
      using errcode = '22023';
  end if;

  -- 4. Source Provenance Determination (Regional vs Pan-India Baseline)
  if exists (
    select 1 from public.district_demographics
    where district_id = p_district_id and source_dataset = 'JHARKHAND_D1'
  ) then
    v_source_prefix := 'JHARKHAND';
  else
    v_source_prefix := 'INDIA';
  end if;

  v_d1_source := v_source_prefix || '_D1';
  v_d2_source := v_source_prefix || '_D2';
  v_d3_source := v_source_prefix || '_D3';
  v_d4_source := v_source_prefix || '_D4';
  v_d5_source := v_source_prefix || '_D5';
  v_d6_source := v_source_prefix || '_D6';
  v_d7_source := v_source_prefix || '_D7';

  -- 5. D1 Demographics Context
  select jsonb_build_object(
    'total_population', d1.total_population,
    'male_population', d1.male_population,
    'female_population', d1.female_population,
    'rural_population', d1.rural_population,
    'urban_population', d1.urban_population,
    'children_0_14', d1.children_0_14,
    'working_age_population_15_59', d1.working_age_population_15_59,
    'elderly_population_60_plus', d1.elderly_population_60_plus,
    'total_households', d1.total_households,
    'average_household_size', d1.average_household_size,
    'sc_population', d1.sc_population,
    'st_population', d1.st_population,
    'literacy_rate_percentage', d1.literacy_rate_percentage,
    'worker_participation_rate_percentage', d1.worker_participation_rate_percentage,
    'households_with_electricity_percentage', d1.households_with_electricity_percentage,
    'households_with_piped_water_percentage', d1.households_with_piped_water_percentage,
    'households_with_toilet_percentage', d1.households_with_toilet_percentage,
    'healthcare_access_score', d1.healthcare_access_score,
    'education_access_score', d1.education_access_score,
    'water_access_score', d1.water_access_score,
    'electricity_access_score', d1.electricity_access_score,
    'overall_service_gap_score', d1.overall_service_gap_score,
    'development_need_score', d1.development_need_score,
    'population_impact_score', d1.population_impact_score,
    'source_dataset', d1.source_dataset
  )
  into v_population
  from public.district_demographics d1
  where d1.district_id = p_district_id
    and d1.source_dataset in (v_d1_source, 'INDIA_D1')
  order by (case when d1.source_dataset = v_d1_source then 1 else 2 end)
  limit 1;

  -- 6. D2 Budget Context (Resolve Target Financial Year gracefully)
  if p_financial_year is not null and btrim(p_financial_year) <> '' then
    v_resolved_fy := p_financial_year;
  else
    select d2.financial_year
    into v_resolved_fy
    from public.district_department_budgets d2
    where d2.district_id = p_district_id
      and d2.planning_sector_code = p_planning_sector_code
      and d2.source_dataset in (v_d2_source, 'INDIA_D2')
    order by d2.financial_year desc
    limit 1;
  end if;

  if v_resolved_fy is not null then
    select jsonb_build_object(
      'planning_sector_code', d2.planning_sector_code,
      'planning_sector_name', d2.planning_sector_name,
      'financial_year', d2.financial_year,
      'funding_source', d2.funding_source,
      'unit', 'INR_CRORE',
      'allocated_budget_crore', d2.allocated_budget_crore,
      'released_budget_crore', d2.released_budget_crore,
      'committed_budget_crore', d2.committed_budget_crore,
      'spent_budget_crore', d2.spent_budget_crore,
      'unspent_budget_crore', d2.unspent_budget_crore,
      'available_for_new_development_crore', d2.available_for_new_development_crore,
      'budget_utilization_percentage', d2.budget_utilization_percentage,
      'budget_commitment_percentage', d2.budget_commitment_percentage,
      'budget_pressure_score', d2.budget_pressure_score,
      'source_dataset', d2.source_dataset
    )
    into v_budget
    from public.district_department_budgets d2
    where d2.district_id = p_district_id
      and d2.planning_sector_code = p_planning_sector_code
      and d2.financial_year = v_resolved_fy
      and d2.source_dataset in (v_d2_source, 'INDIA_D2')
    order by (case when d2.source_dataset = v_d2_source then 1 else 2 end)
    limit 1;
  end if;

  -- 7. D3 Geography Context
  select jsonb_build_object(
    'area_sq_km', d3.area_sq_km,
    'centroid_latitude', d3.centroid_latitude,
    'centroid_longitude', d3.centroid_longitude,
    'north_extent', d3.north_extent,
    'south_extent', d3.south_extent,
    'east_extent', d3.east_extent,
    'west_extent', d3.west_extent,
    'north_south_extent_km', d3.north_south_extent_km,
    'east_west_extent_km', d3.east_west_extent_km,
    'geographic_region', d3.geographic_region,
    'rural_urban_character', d3.rural_urban_character,
    'terrain_type', d3.terrain_type,
    'density_category', d3.density_category,
    'district_headquarters', d3.district_headquarters,
    'neighboring_districts', d3.neighboring_districts,
    'neighbor_count', d3.neighbor_count,
    'source_dataset', d3.source_dataset
  )
  into v_geography
  from public.district_geography d3
  where d3.district_id = p_district_id
    and d3.source_dataset in (v_d3_source, 'INDIA_D3')
  order by (case when d3.source_dataset = v_d3_source then 1 else 2 end)
  limit 1;

  -- 8. D4 Infrastructure Assets Context
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'infrastructure_id', d4.infrastructure_id,
      'infrastructure_category', d4.infrastructure_category,
      'infrastructure_type', d4.infrastructure_type,
      'existing_asset_count', d4.existing_asset_count,
      'functional_asset_count', d4.functional_asset_count,
      'total_capacity', d4.total_capacity,
      'current_utilization', d4.current_utilization,
      'utilization_percentage', d4.utilization_percentage,
      'population_coverage_percentage', d4.population_coverage_percentage,
      'average_condition_score', d4.average_condition_score,
      'infrastructure_gap_score', d4.infrastructure_gap_score,
      'additional_capacity_needed', d4.additional_capacity_needed,
      'source_dataset', d4.source_dataset
    ) order by d4.infrastructure_id
  ), '[]'::jsonb)
  into v_infrastructure_assets
  from public.district_infrastructure_assets d4
  where d4.district_id = p_district_id
    and d4.source_dataset in (v_d4_source, 'INDIA_D4')
    and (p_infrastructure_id is null or d4.infrastructure_id = p_infrastructure_id);

  -- 9. D5 Accessibility Context
  select jsonb_build_object(
    'road_connectivity_score', d5.road_connectivity_score,
    'paved_road_coverage_percentage', d5.paved_road_coverage_percentage,
    'all_weather_access_percentage', d5.all_weather_access_percentage,
    'public_transport_connectivity_score', d5.public_transport_connectivity_score,
    'average_travel_time_minutes', d5.average_travel_time_minutes,
    'average_distance_to_service_center_km', d5.average_distance_to_service_center_km,
    'remote_population_percentage', d5.remote_population_percentage,
    'service_accessibility_score', d5.service_accessibility_score,
    'transport_access_gap_score', d5.transport_access_gap_score,
    'remote_area_access_gap_score', d5.remote_area_access_gap_score,
    'overall_accessibility_gap_score', d5.overall_accessibility_gap_score,
    'source_dataset', d5.source_dataset
  )
  into v_accessibility
  from public.district_accessibility_metrics d5
  where d5.district_id = p_district_id
    and d5.source_dataset in (v_d5_source, 'INDIA_D5')
  order by (case when d5.source_dataset = v_d5_source then 1 else 2 end)
  limit 1;

  -- 10. D6 Socioeconomic Context
  select jsonb_build_object(
    'economic_vulnerability_score', d6.economic_vulnerability_score,
    'estimated_low_income_population_percentage', d6.estimated_low_income_population_percentage,
    'employment_opportunity_score', d6.employment_opportunity_score,
    'economic_activity_score', d6.economic_activity_score,
    'vulnerable_population_percentage', d6.vulnerable_population_percentage,
    'healthcare_service_gap_score', d6.healthcare_service_gap_score,
    'education_service_gap_score', d6.education_service_gap_score,
    'water_sanitation_service_gap_score', d6.water_sanitation_service_gap_score,
    'electricity_service_gap_score', d6.electricity_service_gap_score,
    'digital_connectivity_gap_score', d6.digital_connectivity_gap_score,
    'essential_service_gap_score', d6.essential_service_gap_score,
    'development_need_context_score', d6.development_need_context_score,
    'service_deprivation_score', d6.service_deprivation_score,
    'socioeconomic_pressure_score', d6.socioeconomic_pressure_score,
    'overall_development_context_score', d6.overall_development_context_score,
    'source_dataset', d6.source_dataset
  )
  into v_socioeconomic
  from public.district_socioeconomic_gaps d6
  where d6.district_id = p_district_id
    and d6.source_dataset in (v_d6_source, 'INDIA_D6')
  order by (case when d6.source_dataset = v_d6_source then 1 else 2 end)
  limit 1;

  -- 11. D7 Historical Projects Context
  select
    count(*)::integer,
    round(avg(d7.actual_cost_crore)::numeric, 2),
    round(avg(d7.historical_cost_per_beneficiary)::numeric, 2),
    round(avg(d7.project_execution_efficiency_score)::numeric, 2),
    round(avg(d7.cost_variance_percentage)::numeric, 2),
    round(avg(d7.time_variance_percentage)::numeric, 2),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'project_id', d7.project_id,
        'planning_sector_code', d7.planning_sector_code,
        'planning_sector_name', d7.planning_sector_name,
        'project_sector', d7.project_sector,
        'project_type', d7.project_type,
        'project_name', d7.project_name,
        'financial_year', d7.financial_year,
        'project_status', d7.project_status,
        'unit', 'INR_CRORE',
        'estimated_cost_crore', d7.estimated_cost_crore,
        'approved_cost_crore', d7.approved_cost_crore,
        'actual_cost_crore', d7.actual_cost_crore,
        'project_duration_months', d7.project_duration_months,
        'actual_duration_months', d7.actual_duration_months,
        'estimated_beneficiary_population', d7.estimated_beneficiary_population,
        'completion_percentage', d7.completion_percentage,
        'cost_variance_percentage', d7.cost_variance_percentage,
        'time_variance_percentage', d7.time_variance_percentage,
        'budget_source_type', d7.budget_source_type,
        'implementation_mode', d7.implementation_mode,
        'contractor_or_implementer_type', d7.contractor_or_implementer_type,
        'maintenance_requirement_level', d7.maintenance_requirement_level,
        'historical_cost_per_beneficiary', d7.historical_cost_per_beneficiary,
        'project_execution_efficiency_score', d7.project_execution_efficiency_score,
        'source_dataset', d7.source_dataset
      ) order by d7.financial_year desc, d7.project_id
    ), '[]'::jsonb)
  into
    v_hist_count,
    v_avg_actual_cost,
    v_avg_cost_per_ben,
    v_avg_exec_eff,
    v_avg_cost_var,
    v_avg_time_var,
    v_hist_list
  from public.district_historical_projects d7
  where d7.district_id = p_district_id
    and d7.planning_sector_code = p_planning_sector_code
    and d7.source_dataset in (v_d7_source, 'INDIA_D7');

  v_historical_projects := jsonb_build_object(
    'project_count', coalesce(v_hist_count, 0),
    'average_actual_cost_crore', v_avg_actual_cost,
    'average_cost_per_beneficiary', v_avg_cost_per_ben,
    'average_execution_efficiency', v_avg_exec_eff,
    'average_cost_variance_percentage', v_avg_cost_var,
    'average_time_variance_percentage', v_avg_time_var,
    'projects', coalesce(v_hist_list, '[]'::jsonb)
  );

  -- 12. Synthesize Canonical JSONB Response Contract
  return jsonb_build_object(
    'district', jsonb_build_object(
      'district_id', v_district.id,
      'district_name', v_district.district_name,
      'state_code', v_district.state_code,
      'state_name', v_district.state_name,
      'country_code', v_district.country_code,
      'canonical_source', v_district.canonical_source,
      'alternate_source_codes', v_district.alternate_source_codes,
      'primary_source_dataset', v_source_prefix
    ),
    'query', jsonb_build_object(
      'planning_sector_code', p_planning_sector_code,
      'financial_year', v_resolved_fy,
      'infrastructure_id', p_infrastructure_id
    ),
    'population', v_population,
    'budget', v_budget,
    'geography', v_geography,
    'infrastructure_assets', v_infrastructure_assets,
    'accessibility', v_accessibility,
    'socioeconomic', v_socioeconomic,
    'historical_projects', v_historical_projects,
    'provenance', jsonb_build_object(
      'datasets', jsonb_build_array('D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'),
      'source_prefix', v_source_prefix,
      'synthetic_benchmark_used', false
    )
  );
end;
$$;

-- 3. Harden Pilot & Deployment Security Definer Functions with set search_path = public

-- 3.1 Migration 0047: fn_enforce_pilot_execution_gating
create or replace function public.fn_enforce_pilot_execution_gating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_status text;
begin
  if new.research_stage = 'PILOT_ACTIVE' and (old.research_stage is distinct from 'PILOT_ACTIVE') then
    select status into v_plan_status
    from public.pilot_plans
    where project_id = new.id;

    if v_plan_status is null or v_plan_status != 'APPROVED' then
      raise exception 'Cannot start pilot execution: project % does not have an APPROVED pilot plan (current plan status: %)',
        new.id, coalesce(v_plan_status, 'NONE');
    end if;
  end if;

  return new;
end;
$$;

-- 3.2 Migration 0048: fn_enforce_pilot_validation_gating
create or replace function public.fn_enforce_pilot_validation_gating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_status text;
  v_started_at timestamptz;
  v_project_challenge_id uuid;
  v_project_institution_id uuid;
begin
  -- Validate project relationships
  select challenge_id, institution_id into v_project_challenge_id, v_project_institution_id
  from public.challenge_projects
  where id = new.project_id;

  if v_project_challenge_id is null or v_project_challenge_id != new.challenge_id then
    raise exception 'Validation challenge_id (%) does not match project challenge_id (%)',
      new.challenge_id, v_project_challenge_id;
  end if;

  if v_project_institution_id is null or v_project_institution_id != new.institution_id then
    raise exception 'Validation institution_id (%) does not match project institution_id (%)',
      new.institution_id, v_project_institution_id;
  end if;

  -- Validate pilot plan approval and started execution
  select status, pilot_started_at into v_plan_status, v_started_at
  from public.pilot_plans
  where id = new.pilot_plan_id;

  if v_plan_status is null or v_plan_status != 'APPROVED' then
    raise exception 'Cannot create or submit validation: pilot plan % must be APPROVED (got: %)',
      new.pilot_plan_id, coalesce(v_plan_status, 'NONE');
  end if;

  if v_started_at is null then
    raise exception 'Cannot create or submit validation: pilot execution has not been started yet.';
  end if;

  return new;
end;
$$;

-- 3.3 Migration 0048: fn_pilot_validation_status_transition
create or replace function public.fn_pilot_validation_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('DRAFT', 'SUBMITTED') then
      raise exception 'New validation must start in DRAFT or SUBMITTED status, got %', new.status;
    end if;

    if new.status = 'SUBMITTED' then
      new.submitted_at := coalesce(new.submitted_at, timezone('utc'::text, now()));
      -- Advance project research stage to VALIDATION
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- Protect terminal states
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify validation in terminal % status', old.status;
    end if;

    -- State machine transitions
    if old.status = 'DRAFT' and new.status != 'SUBMITTED' then
      raise exception 'Invalid transition from DRAFT to %', new.status;
    elsif old.status = 'SUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from SUBMITTED to %', new.status;
    elsif old.status = 'UNDER_REVIEW' and new.status not in ('REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from UNDER_REVIEW to %', new.status;
    elsif old.status = 'REQUESTED_REVISION' and new.status != 'RESUBMITTED' then
      raise exception 'Invalid transition from REQUESTED_REVISION to %', new.status;
    elsif old.status = 'RESUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from RESUBMITTED to %', new.status;
    end if;

    -- Timestamp and payload validation
    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'RESUBMITTED' then
      new.version := old.version + 1;
      new.submitted_at := timezone('utc'::text, now());
      update public.challenge_projects
      set research_stage = 'VALIDATION', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'APPROVED' then
      if new.final_outcome is null then
        raise exception 'Cannot approve validation without selecting a final_outcome';
      end if;
      new.approved_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  return new;
end;
$$;

-- 3.4 Migration 0048: fn_pilot_validation_kpi_immutability
create or replace function public.fn_pilot_validation_kpi_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_val_status text;
begin
  select status into v_val_status
  from public.pilot_validation_results
  where id = coalesce(new.validation_id, old.validation_id);

  if v_val_status in ('APPROVED', 'REJECTED') then
    raise exception 'Cannot modify KPI results for validation in terminal % status', v_val_status;
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    new.updated_at := timezone('utc'::text, now());
    return new;
  end if;

  return old;
end;
$$;

-- 3.5 Migration 0049: fn_enforce_deployment_gating
create or replace function public.fn_enforce_deployment_gating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_val_status text;
  v_final_outcome text;
  v_project_challenge_id uuid;
  v_project_institution_id uuid;
begin
  -- Validate project relationships
  select challenge_id, institution_id into v_project_challenge_id, v_project_institution_id
  from public.challenge_projects
  where id = new.project_id;

  if v_project_challenge_id is null or v_project_challenge_id != new.challenge_id then
    raise exception 'Deployment plan challenge_id (%) does not match project challenge_id (%)',
      new.challenge_id, v_project_challenge_id;
  end if;

  if v_project_institution_id is null or v_project_institution_id != new.institution_id then
    raise exception 'Deployment plan institution_id (%) does not match project institution_id (%)',
      new.institution_id, v_project_institution_id;
  end if;

  -- Validate pilot validation approval and final outcome
  select status, final_outcome into v_val_status, v_final_outcome
  from public.pilot_validation_results
  where id = new.validation_id;

  if v_val_status is null or v_val_status != 'APPROVED' then
    raise exception 'Cannot create deployment plan: Pilot validation % must be APPROVED (got: %)',
      new.validation_id, coalesce(v_val_status, 'NONE');
  end if;

  if v_final_outcome is null then
    raise exception 'Cannot create deployment plan: Pilot validation must have an authoritative final outcome recorded.';
  end if;

  return new;
end;
$$;

-- 3.6 Migration 0049: fn_deployment_plan_status_transition
create or replace function public.fn_deployment_plan_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
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
    -- Protect terminal approved/rejected states from silent status reverts
    if old.status in ('APPROVED', 'REJECTED') then
      raise exception 'Cannot modify deployment plan in terminal % status', old.status;
    end if;

    -- State machine transitions
    if old.status = 'DRAFT' and new.status != 'SUBMITTED' then
      raise exception 'Invalid transition from DRAFT to %', new.status;
    elsif old.status = 'SUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from SUBMITTED to %', new.status;
    elsif old.status = 'UNDER_REVIEW' and new.status not in ('REQUESTED_REVISION', 'APPROVED', 'REJECTED') then
      raise exception 'Invalid transition from UNDER_REVIEW to %', new.status;
    elsif old.status = 'REQUESTED_REVISION' and new.status != 'RESUBMITTED' then
      raise exception 'Invalid transition from REQUESTED_REVISION to %', new.status;
    elsif old.status = 'RESUBMITTED' and new.status != 'UNDER_REVIEW' then
      raise exception 'Invalid transition from RESUBMITTED to %', new.status;
    end if;

    -- Self-approval prevention
    select project_lead_profile_id into v_lead_id
    from public.challenge_projects
    where id = new.project_id;

    if new.status in ('APPROVED', 'REJECTED') and new.approved_by is not null and new.approved_by = v_lead_id then
      raise exception 'University project lead cannot approve or reject their own deployment plan.';
    end if;

    -- Timestamp and payload validation
    if new.status = 'SUBMITTED' then
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'UNDER_REVIEW' then
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'REQUESTED_REVISION' then
      if new.review_feedback is null or length(btrim(new.review_feedback)) < 10 then
        raise exception 'Revision feedback must be at least 10 characters';
      end if;
      new.revision_requested_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'REQUESTED_REVISION';
    elsif new.status = 'RESUBMITTED' then
      new.version := old.version + 1;
      new.submitted_at := timezone('utc'::text, now());
      new.deployment_decision := 'PENDING_REVIEW';
    elsif new.status = 'APPROVED' then
      new.approved_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := coalesce(new.deployment_decision, 'APPROVED_FOR_SCALE_UP');
      -- Advance project research stage to DEPLOYMENT_READY
      update public.challenge_projects
      set research_stage = 'DEPLOYMENT_READY', updated_at = timezone('utc'::text, now())
      where id = new.project_id and research_stage in ('VALIDATION', 'PILOT_ACTIVE', 'PILOT_READY');
    elsif new.status = 'REJECTED' then
      if new.rejection_reason is null or length(btrim(new.rejection_reason)) < 10 then
        raise exception 'Rejection reason must be at least 10 characters';
      end if;
      new.rejected_at := timezone('utc'::text, now());
      new.reviewed_at := timezone('utc'::text, now());
      new.deployment_decision := 'REJECTED';
    end if;

    new.updated_at := timezone('utc'::text, now());
  end if;

  -- Deployment Execution stage advance when started
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

-- 3.7 Migration 0049: fn_advance_stage_on_impact_report
create or replace function public.fn_advance_stage_on_impact_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.challenge_projects
  set research_stage = 'IMPACT_MONITORING', updated_at = timezone('utc'::text, now())
  where id = new.project_id and research_stage in ('DEPLOYMENT_READY', 'DEPLOYMENT_ACTIVE');
  return new;
end;
$$;

-- 3.8 Migration 0049: fn_deployment_plan_immutability
create or replace function public.fn_deployment_plan_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'APPROVED' and new.status = 'APPROVED' then
    -- Allow updating execution runtime fields (started_at, completed_at)
    if (old.title is distinct from new.title) or
       (old.summary is distinct from new.summary) or
       (old.deployment_scope is distinct from new.deployment_scope) or
       (old.target_geography is distinct from new.target_geography) or
       (old.target_population is distinct from new.target_population) or
       (old.technical_readiness is distinct from new.technical_readiness) or
       (old.operational_readiness is distinct from new.operational_readiness) or
       (old.risk_management_plan is distinct from new.risk_management_plan) then
      raise exception 'Approved deployment plans are immutable. Modifications require a formal revision cycle.';
    end if;
  end if;
  return new;
end;
$$;
