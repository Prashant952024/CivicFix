-- Migration 0038: CivicFix Unlimited Institution Selection & Governance Hardening
-- Removes the arbitrary 5-institution selection cap per challenge while preserving strict
-- eligibility validation, authorization checks, manual override justification, and idempotency.

-- 1. Create comprehensive selection validation function (Unlimited Eligible Selections)
create or replace function public.validate_challenge_institution_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst_verified text;
  v_inst_active boolean;
  v_challenge_status text;
  v_caller_profile uuid;
  v_is_manager boolean;
begin
  -- A. Verify challenge existence and eligible lifecycle state
  select status into v_challenge_status
  from public.innovation_challenges
  where id = new.challenge_id;

  if v_challenge_status is null then
    raise exception 'Challenge % does not exist', new.challenge_id
      using errcode = '23503';
  end if;

  if v_challenge_status not in (
    'APPROVED',
    'READY_FOR_MATCHING',
    'MATCHING_COMPLETED',
    'INSTITUTIONS_SELECTED',
    'INVITATIONS_SENT'
  ) then
    raise exception 'Challenge % is not in an eligible state for institution selection (current status: %)',
      new.challenge_id, v_challenge_status
      using errcode = '23514';
  end if;

  -- B. Verify institution existence, verification status, and active flag
  select verification_status, is_active
  into v_inst_verified, v_inst_active
  from public.institutions
  where id = new.institution_id;

  if v_inst_verified is null then
    raise exception 'Institution % does not exist', new.institution_id
      using errcode = '23503';
  end if;

  if v_inst_verified <> 'VERIFIED' or not v_inst_active then
    raise exception 'Institution % must be VERIFIED and active for outreach selection', new.institution_id
      using errcode = '23514';
  end if;

  -- C. Authorize caller: Admins and Innovation Managers only
  v_caller_profile := public.current_profile_id();
  if v_caller_profile is not null then
    v_is_manager := public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]);
    if not v_is_manager then
      raise exception 'Only Admins and Innovation Managers can select institutions for outreach'
        using errcode = '23514';
    end if;
    new.selected_by := coalesce(new.selected_by, v_caller_profile);
  elsif new.selected_by is not null then
    if not exists (
      select 1 from public.profiles p
      join public.roles r on r.id = p.role_id
      where p.id = new.selected_by
        and r.code in ('ADMIN', 'INNOVATION_MANAGER')
    ) then
      raise exception 'Only Admins and Innovation Managers can select institutions for outreach'
        using errcode = '23514';
    end if;
  end if;

  if new.selected_by is null then
    raise exception 'selected_by is required' using errcode = '23514';
  end if;

  -- D. Manual override justification enforcement
  if new.is_manual_override and length(btrim(coalesce(new.override_reason, ''))) < 10 then
    raise exception 'Manual override selections require a justification reason of at least 10 characters'
      using errcode = '23514';
  end if;

  -- NOTE: There is NO upper limit on the number of institutions that can be selected.
  -- The Innovation Manager or Admin may select any number of verified, active institutions.

  new.updated_at := now();
  return new;
end;
$$;

-- 2. Drop the old 5-institution limit trigger and replace with unlimited selection governance
drop trigger if exists challenge_institution_selections_limit_check on public.challenge_institution_selections;
drop trigger if exists trg_validate_challenge_institution_selection on public.challenge_institution_selections;

create trigger trg_validate_challenge_institution_selection
before insert or update on public.challenge_institution_selections
for each row
execute function public.validate_challenge_institution_selection();

-- 3. Replace enforce_challenge_selection_limit function with a no-op / compatibility definition
create or replace function public.enforce_challenge_selection_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Deprecated: replaced by validate_challenge_institution_selection (no arbitrary cap)
  new.updated_at := now();
  return new;
end;
$$;
