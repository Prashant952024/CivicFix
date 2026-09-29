-- ============================================================================
-- CivicFix Phase 4.2 Scalability: Admin Analytics Aggregation
-- ============================================================================
-- Description:
-- Replaces 16 unbounded full-table frontend reads on /admin/analytics with
-- a single high-performance server-side SQL telemetry aggregate RPC function:
-- public.get_admin_analytics_telemetry(p_time_range_days, p_department_id, p_category)
--
-- Security:
-- - SECURITY DEFINER with set search_path = public, pg_temp
-- - Guarded: Only authenticated users with ADMIN role can execute.
-- - Fails closed if caller is anonymous or unauthorized.
-- ============================================================================

create or replace function public.get_admin_analytics_telemetry(
  p_time_range_days integer default 30,
  p_department_id text default 'ALL',
  p_category text default 'ALL'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_clerk_id text;
  v_is_admin boolean;
  v_start_time timestamptz;
  v_now timestamptz := now();
  v_dept_uuid uuid := null;
  v_filter_dept boolean := false;
  v_filter_cat boolean := false;
  v_bucket_count integer := 10;
  v_step_interval interval;

  -- Filtered civic metrics
  v_total_filtered integer := 0;
  v_resolved_filtered integer := 0;
  v_open_filtered integer := 0;
  v_citizen_verified_filtered integer := 0;
  v_reopened_filtered integer := 0;
  v_resolution_rate integer := 0;
  v_citizen_verification_rate integer := 0;
  v_reopen_rate integer := 0;
  v_avg_resolution_hours numeric := null;
  v_median_resolution_hours numeric := null;

  -- Global counts
  v_total_issues_count integer := 0;
  v_classified_issues_count integer := 0;
  v_overridden_count integer := 0;
  v_human_override_rate integer := 0;
  v_avg_confidence numeric := 0.84;
  v_total_ai_analyses integer := 0;
  v_ai_simple_count integer := 0;
  v_ai_complex_count integer := 0;
  v_ai_unclassified_count integer := 0;

  -- Innovation counts
  v_total_invitations integer := 0;
  v_accepted_invitations integer := 0;
  v_invitation_acceptance_rate integer := 0;
  v_total_proposals integer := 0;
  v_approved_proposals integer := 0;
  v_proposal_approval_rate integer := 0;
  v_active_field_pilots integer := 0;
  v_total_pilot_plans integer := 0;
  v_scaling_deployments integer := 0;
  v_total_deployment_plans integer := 0;
  v_milestones_completed integer := 0;
  v_milestones_in_progress integer := 0;
  v_milestones_delayed_blocked integer := 0;
  v_milestones_not_started integer := 0;
  v_milestones_total integer := 0;
  v_projects_count integer := 0;

  -- Ecosystem counts
  v_institutions_count integer := 0;
  v_verified_institutions integer := 0;
  v_pending_institutions integer := 0;
  v_iit_nit_count integer := 0;
  v_industry_orgs_count integer := 0;
  v_verified_industry_orgs integer := 0;
  v_support_listings_count integer := 0;
  v_support_applications_count integer := 0;

  -- Geo metrics
  v_geolocated_count integer := 0;
  v_critical_hazard_count integer := 0;
  v_high_priority_count integer := 0;

  -- Health diagnostics
  v_orphan_projects_count integer := 0;
  v_invalid_proposals_count integer := 0;
  v_proposal_integrity_rate integer := 100;
  v_unassigned_active_tasks_count integer := 0;
  v_unverified_orgs_count integer := 0;
  v_recent_activities_count integer := 0;

  -- Dynamic arrays / json
  v_timeline_series jsonb := '[]'::jsonb;
  v_stage_distribution jsonb := '[]'::jsonb;
  v_department_workload jsonb := '[]'::jsonb;
  v_top_localities jsonb := '[]'::jsonb;
  v_departments_list jsonb := '[]'::jsonb;
  v_categories_list jsonb := '[]'::jsonb;
begin
  -- 1. Authorization Guard: Fail closed if not authenticated or not ADMIN
  v_caller_clerk_id := public.requesting_clerk_user_id();
  if v_caller_clerk_id is null then
    raise exception 'Access denied. Authentication required.'
      using errcode = '42501';
  end if;

  select coalesce(r.code = 'ADMIN', false)
  into v_is_admin
  from public.profiles p
  join public.roles r on p.role_id = r.id
  where p.clerk_user_id = v_caller_clerk_id
  limit 1;

  if not coalesce(v_is_admin, false) then
    raise exception 'Access denied. Only administrators can access platform analytics telemetry.'
      using errcode = '42501';
  end if;

  -- 2. Determine Filter Boundaries
  if p_time_range_days is null or p_time_range_days >= 9999 then
    v_start_time := '1970-01-01 00:00:00+00'::timestamptz;
  else
    v_start_time := v_now - (p_time_range_days || ' days')::interval;
  end if;

  if p_department_id is not null and p_department_id <> 'ALL' and p_department_id ~ '^[0-9a-fA-F-]{36}$' then
    v_dept_uuid := p_department_id::uuid;
    v_filter_dept := true;
  end if;

  if p_category is not null and p_category <> 'ALL' and length(btrim(p_category)) > 0 then
    v_filter_cat := true;
  end if;

  -- 3. Filtered Civic Issue Aggregations
  select
    count(*),
    count(*) filter (where status in ('RESOLVED', 'CITIZEN_VERIFIED')),
    count(*) filter (where status = 'CITIZEN_VERIFIED'),
    count(*) filter (where status = 'REOPENED'),
    count(*) filter (where latitude is not null and longitude is not null),
    count(*) filter (where severity = 'CRITICAL'),
    count(*) filter (where priority in ('URGENT', 'HIGH'))
  into
    v_total_filtered,
    v_resolved_filtered,
    v_citizen_verified_filtered,
    v_reopened_filtered,
    v_geolocated_count,
    v_critical_hazard_count,
    v_high_priority_count
  from public.issues
  where created_at >= v_start_time
    and (not v_filter_dept or department_id = v_dept_uuid)
    and (not v_filter_cat or category = p_category);

  v_open_filtered := v_total_filtered - v_resolved_filtered;

  if v_total_filtered > 0 then
    v_resolution_rate := round((v_resolved_filtered::numeric / v_total_filtered) * 100);
  else
    v_resolution_rate := 0;
  end if;

  if v_resolved_filtered > 0 then
    v_citizen_verification_rate := round((v_citizen_verified_filtered::numeric / v_resolved_filtered) * 100);
  else
    v_citizen_verification_rate := 0;
  end if;

  if (v_resolved_filtered + v_reopened_filtered) > 0 then
    v_reopen_rate := round((v_reopened_filtered::numeric / (v_resolved_filtered + v_reopened_filtered)) * 100);
  else
    v_reopen_rate := 0;
  end if;

  -- Resolution duration metrics (avg and median in hours)
  select
    avg(greatest(0, extract(epoch from (resolved_at - created_at)) / 3600.0)),
    percentile_cont(0.5) within group (order by greatest(0, extract(epoch from (resolved_at - created_at)) / 3600.0))
  into
    v_avg_resolution_hours,
    v_median_resolution_hours
  from public.issues
  where created_at >= v_start_time
    and (not v_filter_dept or department_id = v_dept_uuid)
    and (not v_filter_cat or category = p_category)
    and status in ('RESOLVED', 'CITIZEN_VERIFIED')
    and resolved_at is not null;

  -- 4. 9-Stage Status Distribution
  select coalesce(jsonb_agg(stage_item order by stage_order), '[]'::jsonb)
  into v_stage_distribution
  from (
    select
      s.stage_order,
      s.stage_name as stage,
      s.stage_key as key,
      s.color,
      count(i.id) as count,
      case
        when v_total_filtered > 0 then round((count(i.id)::numeric / v_total_filtered) * 100)
        else 0
      end as pct
    from (
      values
        (1, '1. Submitted', 'SUBMITTED', 'bg-sky-500'),
        (2, '2. AI Analyzed', 'AI_ANALYZED', 'bg-indigo-500'),
        (3, '3. Under Review', 'UNDER_REVIEW', 'bg-violet-500'),
        (4, '4. Verified', 'VERIFIED', 'bg-cyan-500'),
        (5, '5. Assigned', 'ASSIGNED', 'bg-teal-500'),
        (6, '6. In Progress', 'IN_PROGRESS', 'bg-amber-500'),
        (7, '7. Partially Completed', 'PARTIALLY_COMPLETED', 'bg-blue-500'),
        (8, '8. Resolved', 'RESOLVED', 'bg-emerald-500'),
        (9, '9. Citizen Verified', 'CITIZEN_VERIFIED', 'bg-emerald-600')
    ) as s(stage_order, stage_name, stage_key, color)
    left join public.issues i
      on i.status::text = s.stage_key
      and i.created_at >= v_start_time
      and (not v_filter_dept or i.department_id = v_dept_uuid)
      and (not v_filter_cat or i.category = p_category)
    group by s.stage_order, s.stage_name, s.stage_key, s.color
  ) stage_item;

  -- 5. Timeline Series Buckets (Intake vs Resolution)
  if p_time_range_days is null or p_time_range_days <= 7 then
    v_bucket_count := 7;
  elsif p_time_range_days <= 30 then
    v_bucket_count := 10;
  else
    v_bucket_count := 12;
  end if;

  v_step_interval := (v_now - v_start_time) / v_bucket_count;

  select coalesce(jsonb_agg(bucket_item order by b_idx), '[]'::jsonb)
  into v_timeline_series
  from (
    select
      b.idx as b_idx,
      b.b_start,
      b.b_end,
      count(i_in.id) as intake,
      count(i_res.id) as resolved
    from (
      select
        s.idx,
        v_start_time + (s.idx * v_step_interval) as b_start,
        v_start_time + ((s.idx + 1) * v_step_interval) as b_end
      from generate_series(0, v_bucket_count - 1) as s(idx)
    ) b
    left join public.issues i_in
      on i_in.created_at >= b.b_start and i_in.created_at < b.b_end
      and (not v_filter_dept or i_in.department_id = v_dept_uuid)
      and (not v_filter_cat or i_in.category = p_category)
    left join public.issues i_res
      on i_res.resolved_at is not null
      and i_res.resolved_at >= b.b_start and i_res.resolved_at < b.b_end
      and (not v_filter_dept or i_res.department_id = v_dept_uuid)
      and (not v_filter_cat or i_res.category = p_category)
    group by b.idx, b.b_start, b.b_end
  ) bucket_item;

  -- 6. Department Workload & Throughput Matrix
  select coalesce(jsonb_agg(dept_item order by d_name), '[]'::jsonb)
  into v_department_workload
  from (
    select
      d.id,
      d.name as d_name,
      d.is_active,
      count(i.id) as total,
      count(i.id) filter (where i.status in ('ASSIGNED', 'IN_PROGRESS')) as active,
      count(i.id) filter (where i.status in ('RESOLVED', 'CITIZEN_VERIFIED')) as resolved,
      case
        when count(i.id) > 0 then round((count(i.id) filter (where i.status in ('RESOLVED', 'CITIZEN_VERIFIED'))::numeric / count(i.id)) * 100)
        else 0
      end as closure_rate
    from public.departments d
    left join public.issues i
      on i.department_id = d.id
      and i.created_at >= v_start_time
      and (not v_filter_dept or i.department_id = v_dept_uuid)
      and (not v_filter_cat or i.category = p_category)
    group by d.id, d.name, d.is_active
  ) dept_item;

  -- 7. Top 5 Incident Localities
  select coalesce(jsonb_agg(loc_item), '[]'::jsonb)
  into v_top_localities
  from (
    select
      coalesce(nullif(btrim(location_text), ''), nullif(btrim(address_text), ''), 'Central Municipal Zone') as location,
      count(*) as count
    from public.issues
    where created_at >= v_start_time
      and (not v_filter_dept or department_id = v_dept_uuid)
      and (not v_filter_cat or category = p_category)
    group by coalesce(nullif(btrim(location_text), ''), nullif(btrim(address_text), ''), 'Central Municipal Zone')
    order by count(*) desc
    limit 5
  ) loc_item;

  -- 8. Global AI Telemetry
  select
    count(*),
    count(*) filter (where ai_issue_type is not null),
    count(*) filter (where final_issue_type is not null and ai_issue_type is not null and final_issue_type <> ai_issue_type),
    count(*) filter (where ai_issue_type = 'SIMPLE'),
    count(*) filter (where ai_issue_type = 'COMPLEX'),
    count(*) filter (where ai_issue_type is null),
    count(*) filter (where (status in ('ASSIGNED', 'IN_PROGRESS')) and department_id is null)
  into
    v_total_issues_count,
    v_classified_issues_count,
    v_overridden_count,
    v_ai_simple_count,
    v_ai_complex_count,
    v_ai_unclassified_count,
    v_unassigned_active_tasks_count
  from public.issues;

  if v_classified_issues_count > 0 then
    v_human_override_rate := round((v_overridden_count::numeric / v_classified_issues_count) * 100);
  else
    v_human_override_rate := 0;
  end if;

  select
    count(*),
    coalesce(avg(coalesce(confidence_score, 0.8)), 0.84)
  into
    v_total_ai_analyses,
    v_avg_confidence
  from public.issue_ai_analysis;

  -- 9. Innovation Pipeline Telemetry
  select count(*) into v_projects_count from public.challenge_projects;

  select
    count(*),
    count(*) filter (where status = 'ACCEPTED')
  into
    v_total_invitations,
    v_accepted_invitations
  from public.institution_invitations;

  if v_total_invitations > 0 then
    v_invitation_acceptance_rate := round((v_accepted_invitations::numeric / v_total_invitations) * 100);
  else
    v_invitation_acceptance_rate := 0;
  end if;

  select
    count(*),
    count(*) filter (where status = 'APPROVED')
  into
    v_total_proposals,
    v_approved_proposals
  from public.research_proposals;

  if v_total_proposals > 0 then
    v_proposal_approval_rate := round((v_approved_proposals::numeric / v_total_proposals) * 100);
  else
    v_proposal_approval_rate := 0;
  end if;

  select
    count(*),
    count(*) filter (where status = 'APPROVED')
  into
    v_total_pilot_plans,
    v_active_field_pilots
  from public.pilot_plans;

  select
    count(*),
    count(*) filter (where status = 'APPROVED')
  into
    v_total_deployment_plans,
    v_scaling_deployments
  from public.deployment_plans;

  select
    count(*),
    count(*) filter (where status = 'COMPLETED'),
    count(*) filter (where status = 'IN_PROGRESS'),
    count(*) filter (where status in ('BLOCKED', 'DELAYED')),
    count(*) filter (where status = 'NOT_STARTED')
  into
    v_milestones_total,
    v_milestones_completed,
    v_milestones_in_progress,
    v_milestones_delayed_blocked,
    v_milestones_not_started
  from public.research_project_milestones;

  -- 10. Institutions & Ecosystem Telemetry
  select
    count(*),
    count(*) filter (where verification_status = 'VERIFIED'),
    count(*) filter (where verification_status in ('PENDING_VERIFICATION', 'DRAFT')),
    count(*) filter (where institution_type in ('IIT', 'NIT'))
  into
    v_institutions_count,
    v_verified_institutions,
    v_pending_institutions,
    v_iit_nit_count
  from public.institutions;

  select
    count(*),
    count(*) filter (where verification_status = 'VERIFIED')
  into
    v_industry_orgs_count,
    v_verified_industry_orgs
  from public.industry_organizations;

  select count(*) into v_support_listings_count from public.research_support_listings;
  select count(*) into v_support_applications_count from public.research_support_applications;

  -- 11. Platform Health Diagnostics
  select count(*)
  into v_orphan_projects_count
  from public.challenge_projects cp
  where cp.institution_id is not null
    and not exists (
      select 1 from public.institutions i where i.id = cp.institution_id
    );

  select count(*)
  into v_invalid_proposals_count
  from public.research_proposals rp
  where rp.project_id is not null
    and not exists (
      select 1 from public.challenge_projects cp where cp.id = rp.project_id
    );

  if v_total_proposals > 0 then
    v_proposal_integrity_rate := round(((v_total_proposals - v_invalid_proposals_count)::numeric / v_total_proposals) * 100);
  else
    v_proposal_integrity_rate := 100;
  end if;

  select
    (select count(*) from public.institutions where verification_status in ('PENDING_VERIFICATION', 'DRAFT')) +
    (select count(*) from public.industry_organizations where verification_status = 'PENDING')
  into v_unverified_orgs_count;

  select count(*)
  into v_recent_activities_count
  from (
    select id from public.issue_status_history limit 200
  ) act;

  -- 12. Dropdown Lists (Departments & Categories)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'is_active', is_active) order by name), '[]'::jsonb)
  into v_departments_list
  from public.departments;

  select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
  into v_categories_list
  from (
    select distinct category
    from public.issues
    where category is not null and length(btrim(category)) > 0
  ) cats;

  -- 13. Construct and Return Unified Analytics Telemetry Payload
  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'total', v_total_filtered,
      'resolved', v_resolved_filtered,
      'open', v_open_filtered,
      'citizenVerified', v_citizen_verified_filtered,
      'reopened', v_reopened_filtered,
      'resolutionRate', v_resolution_rate,
      'citizenVerificationRate', v_citizen_verification_rate,
      'reopenRate', v_reopen_rate,
      'avgResolutionHours', v_avg_resolution_hours,
      'medianResolutionHours', v_median_resolution_hours,
      'classifiedIssuesCount', v_classified_issues_count,
      'totalIssuesCount', v_total_issues_count,
      'overriddenCount', v_overridden_count,
      'humanOverrideRate', v_human_override_rate,
      'avgConfidence', v_avg_confidence,
      'totalInvitations', v_total_invitations,
      'acceptedInvitations', v_accepted_invitations,
      'invitationAcceptanceRate', v_invitation_acceptance_rate,
      'totalProposals', v_total_proposals,
      'approvedProposals', v_approved_proposals,
      'proposalApprovalRate', v_proposal_approval_rate,
      'activeWorkspacesCount', v_projects_count,
      'institutionsCount', v_institutions_count,
      'supportListingsCount', v_support_listings_count,
      'supportApplicationsCount', v_support_applications_count
    ),
    'timelineSeries', v_timeline_series,
    'stageDistribution', v_stage_distribution,
    'departmentWorkload', v_department_workload,
    'ai', jsonb_build_object(
      'totalAnalyses', v_total_ai_analyses,
      'avgConfidence', v_avg_confidence,
      'humanOverrideRate', v_human_override_rate,
      'overriddenCount', v_overridden_count,
      'simpleCount', v_ai_simple_count,
      'complexCount', v_ai_complex_count,
      'unclassifiedCount', v_ai_unclassified_count
    ),
    'innovation', jsonb_build_object(
      'invitationAcceptanceRate', v_invitation_acceptance_rate,
      'acceptedInvitations', v_accepted_invitations,
      'totalInvitations', v_total_invitations,
      'proposalApprovalRate', v_proposal_approval_rate,
      'approvedProposals', v_approved_proposals,
      'totalProposals', v_total_proposals,
      'activeFieldPilots', v_active_field_pilots,
      'totalPilotPlans', v_total_pilot_plans,
      'scalingDeployments', v_scaling_deployments,
      'totalDeploymentPlans', v_total_deployment_plans,
      'milestones', jsonb_build_object(
        'completed', v_milestones_completed,
        'inProgress', v_milestones_in_progress,
        'blockedDelayed', v_milestones_delayed_blocked,
        'notStarted', v_milestones_not_started,
        'total', v_milestones_total
      )
    ),
    'ecosystem', jsonb_build_object(
      'institutionsCount', v_institutions_count,
      'verifiedInstitutions', v_verified_institutions,
      'pendingInstitutions', v_pending_institutions,
      'iitNitCount', v_iit_nit_count,
      'industryOrgsCount', v_industry_orgs_count,
      'verifiedIndustryOrgs', v_verified_industry_orgs,
      'supportListingsCount', v_support_listings_count,
      'supportApplicationsCount', v_support_applications_count
    ),
    'geo', jsonb_build_object(
      'geolocatedReports', v_geolocated_count,
      'topLocalities', v_top_localities,
      'criticalHazards', v_critical_hazard_count,
      'highPriority', v_high_priority_count,
      'resolved', v_resolved_filtered
    ),
    'health', jsonb_build_object(
      'orphanProjectsCount', v_orphan_projects_count,
      'invalidProposalsCount', v_invalid_proposals_count,
      'proposalIntegrityRate', v_proposal_integrity_rate,
      'unassignedActiveTasksCount', v_unassigned_active_tasks_count,
      'unverifiedOrgsCount', v_unverified_orgs_count,
      'recentActivitiesCount', v_recent_activities_count
    ),
    'dropdowns', jsonb_build_object(
      'departments', v_departments_list,
      'categories', v_categories_list
    )
  );
end;
$$;

-- Grant execution permissions
revoke all on function public.get_admin_analytics_telemetry(integer, text, text) from public;
grant execute on function public.get_admin_analytics_telemetry(integer, text, text) to authenticated;
grant execute on function public.get_admin_analytics_telemetry(integer, text, text) to service_role;
