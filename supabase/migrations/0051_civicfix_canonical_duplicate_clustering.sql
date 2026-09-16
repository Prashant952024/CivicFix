-- Migration 0051: Canonical Issue Clustering & Multi-Signal Duplicate Detection
-- Consolidates multiple citizen reports into one canonical operational issue while preserving all citizen reports, individual verification, and notifying linked reporters.

-- 1. Extend public.issues table for canonical clustering
alter table public.issues
  add column if not exists canonical_issue_id uuid references public.issues(id) on update cascade on delete set null,
  add column if not exists duplicate_status text not null default 'NONE' check (duplicate_status in ('NONE', 'POTENTIAL', 'CONFIRMED_DUPLICATE', 'KEPT_SEPARATE')),
  add column if not exists duplicate_confidence text check (duplicate_confidence is null or duplicate_confidence in ('HIGH', 'MEDIUM', 'LOW')),
  add column if not exists merged_at timestamptz,
  add column if not exists merged_by uuid references public.profiles(id) on update cascade on delete set null;

-- Indexes for canonical issue lookups
create index if not exists issues_canonical_issue_idx on public.issues (canonical_issue_id) where canonical_issue_id is not null;
create index if not exists issues_duplicate_status_idx on public.issues (duplicate_status);

-- 2. Extend public.issue_duplicates table for image similarity
alter table public.issue_duplicates
  add column if not exists image_similarity_score numeric(5, 4) check (image_similarity_score is null or (image_similarity_score >= 0 and image_similarity_score <= 1)),
  add column if not exists image_signals jsonb not null default '{}'::jsonb;

-- 3. Extend public.simple_solution_knowledge_base for report aggregation
alter table public.simple_solution_knowledge_base
  add column if not exists citizen_report_count integer not null default 1 check (citizen_report_count >= 1),
  add column if not exists linked_issue_ids uuid[] not null default '{}'::uuid[];

-- 4. Invariant: Anti-loop & Anti-chaining trigger for canonical issues
create or replace function public.validate_canonical_issue_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_canonical_id uuid;
begin
  -- Invariant A: An issue cannot be its own canonical issue
  if new.canonical_issue_id is not null and new.canonical_issue_id = new.id then
    raise exception 'Circular Reference: An issue cannot reference itself as canonical issue (id: %)', new.id;
  end if;

  -- Invariant B: Flatten nested chains (A -> B -> C becomes A -> C, B -> C)
  if new.canonical_issue_id is not null then
    select canonical_issue_id into v_parent_canonical_id
    from public.issues
    where id = new.canonical_issue_id;

    if v_parent_canonical_id is not null then
      -- Re-point new issue directly to root canonical issue
      new.canonical_issue_id := v_parent_canonical_id;
    end if;
  end if;

  -- Invariant C: If this issue is being made a child of another, flatten any children pointing to this issue
  if new.canonical_issue_id is not null and (old.canonical_issue_id is null or old.canonical_issue_id <> new.canonical_issue_id) then
    update public.issues
    set canonical_issue_id = new.canonical_issue_id,
        updated_at = now()
    where canonical_issue_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_canonical_issue_invariants on public.issues;
create trigger trg_validate_canonical_issue_invariants
before insert or update of canonical_issue_id on public.issues
for each row
execute function public.validate_canonical_issue_invariants();

-- 5. Propagate Canonical Issue Status Notifications to All Linked Citizen Reporters
create or replace function public.propagate_canonical_status_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_record record;
  v_status_title text;
  v_status_msg text;
begin
  -- Only trigger on meaningful status changes for canonical issues (canonical_issue_id is null)
  if new.canonical_issue_id is null and (old.status is distinct from new.status) then
    
    case new.status
      when 'IN_PROGRESS' then
        v_status_title := 'Work Started on Your Reported Issue';
        v_status_msg := format('Municipal field workers have started active resolution on issue "%s".', new.title);
      when 'RESOLVED' then
        v_status_title := 'Issue Resolved — Please Verify';
        v_status_msg := format('The civic issue "%s" affecting your location has been marked resolved. Please inspect and verify the fix.', new.title);
      when 'CITIZEN_VERIFIED' then
        v_status_title := 'Resolution Verified by Citizen';
        v_status_msg := format('The resolution for "%s" has been verified and confirmed resolved.', new.title);
      when 'REOPENED' then
        v_status_title := 'Issue Reopened for Additional Work';
        v_status_msg := format('Civic issue "%s" was reopened for follow-up work.', new.title);
      else
        v_status_title := format('Status Update: %s', replace(new.status::text, '_', ' '));
        v_status_msg := format('Issue "%s" is now %s.', new.title, replace(new.status::text, '_', ' '));
    end case;

    -- Notify all reporters of linked child issues
    for v_child_record in
      select i.id as child_issue_id, i.reporter_profile_id
      from public.issues i
      where i.canonical_issue_id = new.id
        and i.reporter_profile_id is distinct from new.reporter_profile_id
    loop
      insert into public.notifications (
        recipient_profile_id,
        notification_type,
        title,
        message,
        related_issue_id
      ) values (
        v_child_record.reporter_profile_id,
        'STATUS_CHANGE',
        v_status_title,
        v_status_msg,
        v_child_record.child_issue_id
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_propagate_canonical_status_notifications on public.issues;
create trigger trg_propagate_canonical_status_notifications
after update of status on public.issues
for each row
execute function public.propagate_canonical_status_notifications();

-- 6. Update process_simple_issue_solution_knowledge to aggregate linked citizen reports
create or replace function public.process_simple_issue_solution_knowledge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue record;
  v_verification record;
  v_dept_name text;
  v_area text;
  v_before_imgs jsonb := '[]'::jsonb;
  v_after_imgs jsonb := '[]'::jsonb;
  v_materials text[] := '{}'::text[];
  v_factors text[] := '{}'::text[];
  v_season text;
  v_month integer;
  v_duration_hours integer;
  v_root_cause text;
  v_resolution_summary text;
  v_count integer;
  v_first_obs timestamptz;
  v_last_obs timestamptz;
  v_hist_ids uuid[] := '{}'::uuid[];
  v_causes text[] := '{}'::text[];
  v_pattern_id uuid;
  v_linked_ids uuid[] := '{}'::uuid[];
  v_total_reports integer := 1;
begin
  -- Only execute for canonical issues (canonical_issue_id IS NULL)
  if new.canonical_issue_id is not null then
    return new;
  end if;

  -- Only process when issue enters CITIZEN_VERIFIED or RESOLVED
  if new.status in ('CITIZEN_VERIFIED'::public.issue_status, 'RESOLVED'::public.issue_status) then
    
    -- Load full issue details
    select 
      i.*,
      d.name as department_name
    into v_issue
    from public.issues i
    left join public.departments d on d.id = i.department_id
    where i.id = new.id;

    if v_issue.id is null then
      return new;
    end if;

    -- Aggregate all linked citizen reports for this canonical issue
    select 
      coalesce(array_agg(id), '{}'::uuid[]),
      count(*) + 1
    into
      v_linked_ids,
      v_total_reports
    from public.issues
    where canonical_issue_id = new.id;

    -- Load citizen verification feedback if exists
    select *
    into v_verification
    from public.resolution_verifications
    where issue_id = new.id
    order by created_at desc
    limit 1;

    -- Extract images
    select 
      coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path)) filter (where image_type = 'INITIAL_REPORT'), '[]'::jsonb),
      coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path)) filter (where image_type = 'RESOLUTION_EVIDENCE'), '[]'::jsonb)
    into v_before_imgs, v_after_imgs
    from public.issue_images
    where issue_id = new.id or issue_id = any(v_linked_ids);

    -- Area name
    v_area := coalesce(
      nullif(btrim(v_issue.address_text), ''),
      nullif(btrim(v_issue.location_text), ''),
      'General Municipal Area'
    );

    -- Occurrence timing
    v_month := extract(month from coalesce(v_issue.created_at, now()))::integer;
    v_season := public.get_season_for_date((coalesce(v_issue.created_at, now()))::date);

    -- Calculate duration
    if v_issue.resolved_at is not null and v_issue.created_at is not null then
      v_duration_hours := round(extract(epoch from (v_issue.resolved_at - v_issue.created_at)) / 3600)::integer;
    end if;

    v_root_cause := 'Operational wear and localized environmental degradation.';

    v_resolution_summary := format('Standard municipal repair executed for %s.', v_issue.title);

    -- Upsert Simple Solution Knowledge Record
    insert into public.simple_solution_knowledge_base (
      source_issue_id,
      category,
      title,
      description,
      location_text,
      address_text,
      area_name,
      department_id,
      department_name,
      identified_root_cause,
      contributing_factors,
      resolution_summary,
      materials_used,
      resolution_duration_hours,
      occurrence_date,
      occurrence_season,
      occurrence_month,
      before_evidence_images,
      after_evidence_images,
      citizen_verification_id,
      citizen_feedback,
      verified_at,
      closed_at,
      citizen_report_count,
      linked_issue_ids
    ) values (
      new.id,
      v_issue.category,
      v_issue.title,
      v_issue.description,
      v_issue.location_text,
      v_issue.address_text,
      v_area,
      v_issue.department_id,
      v_issue.department_name,
      v_root_cause,
      v_factors,
      v_resolution_summary,
      v_materials,
      v_duration_hours,
      (coalesce(v_issue.created_at, now()))::date,
      v_season,
      v_month,
      v_before_imgs,
      v_after_imgs,
      v_verification.id,
      v_verification.feedback,
      coalesce(v_verification.created_at, now()),
      now(),
      v_total_reports,
      v_linked_ids
    )
    on conflict (source_issue_id) do update set
      category = excluded.category,
      title = excluded.title,
      description = excluded.description,
      location_text = excluded.location_text,
      address_text = excluded.address_text,
      area_name = excluded.area_name,
      department_id = excluded.department_id,
      department_name = excluded.department_name,
      identified_root_cause = excluded.identified_root_cause,
      resolution_summary = excluded.resolution_summary,
      before_evidence_images = excluded.before_evidence_images,
      after_evidence_images = excluded.after_evidence_images,
      citizen_verification_id = excluded.citizen_verification_id,
      citizen_feedback = excluded.citizen_feedback,
      verified_at = excluded.verified_at,
      closed_at = excluded.closed_at,
      citizen_report_count = excluded.citizen_report_count,
      linked_issue_ids = excluded.linked_issue_ids;

    -- Recurrence pattern detection (only counts distinct canonical occurrences)
    select 
      count(*),
      min(closed_at),
      max(closed_at),
      array_agg(source_issue_id),
      array_remove(array_agg(distinct identified_root_cause), null)
    into
      v_count,
      v_first_obs,
      v_last_obs,
      v_hist_ids,
      v_causes
    from public.simple_solution_knowledge_base
    where area_name = v_area and category = v_issue.category;

    if v_count >= 2 then
      insert into public.simple_issue_recurrence_patterns (
        area_name,
        category,
        pattern_description,
        occurrence_count,
        first_observed_at,
        last_observed_at,
        seasonal_window,
        common_root_causes,
        common_resolution_methods,
        historical_issue_ids,
        confidence,
        status,
        updated_at
      ) values (
        v_area,
        v_issue.category,
        format('Repeated %s issues observed in %s (%s occurrences recorded across %s total citizen reports)', v_issue.category, v_area, v_count, v_total_reports),
        v_count,
        v_first_obs,
        v_last_obs,
        v_season,
        coalesce(v_causes, '{}'::text[]),
        array['Standard departmental maintenance'],
        v_hist_ids,
        case when v_count >= 4 then 'HIGH' else 'MEDIUM' end,
        'ACTIVE',
        now()
      )
      on conflict (area_name, category) do update set
        occurrence_count = excluded.occurrence_count,
        first_observed_at = excluded.first_observed_at,
        last_observed_at = excluded.last_observed_at,
        seasonal_window = excluded.seasonal_window,
        common_root_causes = excluded.common_root_causes,
        historical_issue_ids = excluded.historical_issue_ids,
        confidence = excluded.confidence,
        pattern_description = format('Repeated %s issues observed in %s (%s occurrences recorded)', excluded.category, excluded.area_name, excluded.occurrence_count),
        updated_at = now()
      returning id into v_pattern_id;

      -- Upsert corresponding preventive recommendation
      insert into public.preventive_recommendations (
        pattern_id,
        area_name,
        category,
        department_id,
        department_name,
        occurrence_count,
        seasonal_timing,
        title,
        recommended_action,
        justification,
        historical_issue_ids,
        status
      ) values (
        v_pattern_id,
        v_area,
        v_issue.category,
        v_issue.department_id,
        v_issue.department_name,
        v_count,
        v_season,
        format('Proactive Maintenance for %s in %s', v_issue.category, v_area),
        format('Schedule pre-emptive inspection and protective maintenance on %s before seasonal transition (%s).', v_issue.category, v_season),
        format('Pattern analysis detected %s recurring resolved occurrences in %s with root cause: %s.', v_count, v_area, v_root_cause),
        v_hist_ids,
        'NEW'
      )
      on conflict do nothing;
    end if;

  end if;

  return new;
end;
$$;
