-- Migration 0030: CivicFix Phase 3B - AI-Assisted Innovation Challenge Creation & Approval Architecture
-- 1. Extend public.innovation_challenges with Phase 3B structured problem statement fields
-- 2. Update status constraint to support 'DRAFT' and 'APPROVED' (and future Phase 3C statuses)
-- 3. Add audit and metadata fields for AI draft preservation and authoritative approval
-- 4. Create trigger to enforce Manager/Admin approval authority and field validation

-- 1. Add Phase 3B Structured Problem Statement Fields
alter table public.innovation_challenges
  add column if not exists root_cause text,
  add column if not exists problem_category text,
  add column if not exists required_domains text[] not null default '{}',
  add column if not exists current_limitations text,
  add column if not exists objectives text[] not null default '{}',
  add column if not exists expected_outcomes text[] not null default '{}',
  add column if not exists constraints text[] not null default '{}',
  add column if not exists potential_technology_areas text[] not null default '{}',
  add column if not exists research_requirements text,
  add column if not exists success_criteria text[] not null default '{}',
  add column if not exists approved_by uuid references public.profiles(id) on update cascade on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists ai_generated_draft jsonb,
  add column if not exists ai_generated_at timestamptz,
  add column if not exists ai_model_version text;

-- 2. Update status constraint and default to 'DRAFT'
alter table public.innovation_challenges drop constraint if exists innovation_challenges_status_check;
alter table public.innovation_challenges add constraint innovation_challenges_status_check 
  check (status in ('DRAFT', 'APPROVED', 'READY_FOR_MATCHING', 'OPEN_FOR_PROPOSALS', 'PILOT_ACTIVE', 'SOLVED', 'ARCHIVED'));
alter table public.innovation_challenges alter column status set default 'DRAFT';

-- 3. Create Performance Indexes for Phase 3C querying and matching
create index if not exists innovation_challenges_approved_at_idx on public.innovation_challenges (approved_at);
create index if not exists innovation_challenges_approved_by_idx on public.innovation_challenges (approved_by);
create index if not exists innovation_challenges_required_domains_idx on public.innovation_challenges using gin (required_domains);
create index if not exists innovation_challenges_potential_tech_idx on public.innovation_challenges using gin (potential_technology_areas);

-- 4. Trigger Function: Enforce Challenge Approval Governance & Immutability
create or replace function public.enforce_innovation_challenge_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If status is transitioning to 'APPROVED'
  if new.status = 'APPROVED' and (old.status is null or old.status <> 'APPROVED') then
    -- Verify caller authority: only INNOVATION_MANAGER or ADMIN
    if not public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]) then
      raise exception 'Only Innovation Managers and Administrators have authority to approve innovation challenges.'
        using errcode = '42501';
    end if;

    -- Mandatory field completeness validation for authoritative approval
    if length(btrim(coalesce(new.title, ''))) = 0 then
      raise exception 'Cannot approve challenge: Title is required.';
    end if;

    if length(btrim(coalesce(new.problem_statement, ''))) = 0 then
      raise exception 'Cannot approve challenge: Problem Statement is required.';
    end if;

    if length(btrim(coalesce(new.root_cause, ''))) = 0 then
      raise exception 'Cannot approve challenge: Root Cause is required.';
    end if;

    if cardinality(coalesce(new.objectives, '{}'::text[])) = 0 then
      raise exception 'Cannot approve challenge: At least one objective is required.';
    end if;

    if cardinality(coalesce(new.required_domains, '{}'::text[])) = 0 and cardinality(coalesce(new.required_expertise, '{}'::text[])) = 0 then
      raise exception 'Cannot approve challenge: At least one required domain/expertise is required.';
    end if;

    if cardinality(coalesce(new.expected_outcomes, '{}'::text[])) = 0 then
      raise exception 'Cannot approve challenge: At least one expected outcome is required.';
    end if;

    if cardinality(coalesce(new.success_criteria, '{}'::text[])) = 0 then
      raise exception 'Cannot approve challenge: At least one success criterion is required.';
    end if;

    -- Automatically stamp approved_by and approved_at if not provided
    if new.approved_at is null then
      new.approved_at := now();
    end if;

    if new.approved_by is null then
      new.approved_by := public.current_profile_id();
    end if;
  end if;

  -- Maintain updated_at timestamp
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists innovation_challenges_enforce_governance on public.innovation_challenges;
create trigger innovation_challenges_enforce_governance
before insert or update on public.innovation_challenges
for each row
execute function public.enforce_innovation_challenge_governance();

-- 5. RLS Policy Refinement for Phase 3B
-- Authenticated users can view challenges
drop policy if exists innovation_challenges_select_authenticated on public.innovation_challenges;
create policy innovation_challenges_select_authenticated
on public.innovation_challenges
for select
to authenticated
using (true);

-- Only Innovation Manager and Admin can insert new challenge drafts
drop policy if exists innovation_challenges_insert_manager_admin on public.innovation_challenges;
create policy innovation_challenges_insert_manager_admin
on public.innovation_challenges
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  and created_by = public.current_profile_id()
);

-- Only Innovation Manager and Admin can update challenge drafts or approve them
drop policy if exists innovation_challenges_update_manager_admin on public.innovation_challenges;
create policy innovation_challenges_update_manager_admin
on public.innovation_challenges
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);
