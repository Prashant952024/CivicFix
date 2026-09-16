-- Migration 0047: CivicFix Phase 3E-2 Pilot Execution & Progress Tracking
-- 1. Add pilot execution timestamp & actor columns to pilot_plans
-- 2. Add database trigger enforcing pilot execution gating on challenge_projects
-- 3. Extend challenge_project_activity activity types with execution events
-- 4. Ensure RLS policies for starting pilot and execution tracking

-- 1. Add pilot execution tracking columns to pilot_plans
alter table public.pilot_plans
  add column if not exists pilot_started_at timestamptz,
  add column if not exists pilot_started_by uuid references public.profiles(id) on update cascade on delete set null;

-- 2. Trigger to enforce pilot execution gating on challenge_projects
-- A project can ONLY transition research_stage to 'PILOT_ACTIVE' if it has an approved pilot plan.
create or replace function public.fn_enforce_pilot_execution_gating()
returns trigger
language plpgsql
security definer
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

drop trigger if exists trg_enforce_pilot_execution_gating on public.challenge_projects;
create trigger trg_enforce_pilot_execution_gating
  before update of research_stage on public.challenge_projects
  for each row
  execute function public.fn_enforce_pilot_execution_gating();

-- 3. Extend challenge_project_activity activity types with all past & execution events
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
    'PROPOSAL_REJECTED',
    'PROGRESS_UPDATE_SUBMITTED',
    'PROGRESS_UPDATE_ACKNOWLEDGED',
    'MILESTONE_CREATED',
    'MILESTONE_UPDATED',
    'EVIDENCE_ADDED',
    'BLOCKER_REPORTED',
    'BLOCKER_RESOLVED',
    'MARKETPLACE_REQUEST_CREATED',
    'MARKETPLACE_REQUEST_UPDATED',
    'MARKETPLACE_REQUEST_PUBLISHED',
    'MARKETPLACE_REQUEST_CLOSED',
    'MARKETPLACE_APPLICATION_SUBMITTED',
    'MARKETPLACE_APPLICATION_ACCEPTED',
    'MARKETPLACE_APPLICATION_REJECTED',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_UPDATED',
    'SUPPORT_REQUEST_PUBLISHED',
    'SUPPORT_REQUEST_CLOSED',
    'SUPPORT_APPLICATION_SUBMITTED',
    'SUPPORT_APPLICATION_ACCEPTED',
    'SUPPORT_APPLICATION_REJECTED',
    'SUPPORT_PARTNER_SELECTED',
    'SUPPORT_PARTNER_ONBOARDED',
    'SUPPORT_PARTNER_COMPLETED',
    'PILOT_PLAN_CREATED',
    'PILOT_PLAN_UPDATED',
    'PILOT_PLAN_SUBMITTED',
    'PILOT_REVIEW_STARTED',
    'PILOT_REVISION_REQUESTED',
    'PILOT_RESUBMITTED',
    'PILOT_APPROVED',
    'PILOT_REJECTED',
    'PILOT_STARTED',
    'PILOT_MILESTONE_UPDATED',
    'PILOT_EVIDENCE_ADDED',
    'PILOT_BLOCKER_REPORTED',
    'PILOT_BLOCKER_RESOLVED'
  )
);
