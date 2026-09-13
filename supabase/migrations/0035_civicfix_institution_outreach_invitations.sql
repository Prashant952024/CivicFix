-- Migration 0035: CivicFix Phase 3D-1 Institution Outreach & Invitation Management
-- Implements formal invitation lifecycle, selection-guarded outreach, and audited institution response.

-- 1. Update innovation_challenges status check constraint to include INVITATIONS_SENT
alter table public.innovation_challenges drop constraint if exists innovation_challenges_status_check;
alter table public.innovation_challenges add constraint innovation_challenges_status_check 
  check (status in (
    'DRAFT',
    'APPROVED',
    'READY_FOR_MATCHING',
    'MATCHING_IN_PROGRESS',
    'MATCHING_COMPLETED',
    'INSTITUTIONS_SELECTED',
    'READY_FOR_INVITATION',
    'INVITATIONS_SENT',
    'OPEN_FOR_PROPOSALS',
    'PILOT_ACTIVE',
    'SOLVED',
    'ARCHIVED'
  ));

-- 2. Create public.institution_invitations table
create table if not exists public.institution_invitations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  selection_id uuid references public.challenge_institution_selections(id) on update cascade on delete set null,
  status text not null default 'SENT' check (status in ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  invited_by uuid not null references public.profiles(id) on update cascade on delete restrict,
  invited_at timestamptz not null default now(),
  invitation_message text not null,
  responded_by uuid references public.profiles(id) on update cascade on delete set null,
  responded_at timestamptz,
  response_note text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One invitation lifecycle per challenge/institution pair
  constraint institution_invitations_challenge_institution_unique unique (challenge_id, institution_id),

  -- Rejection requires meaningful explanation (>=10 non-whitespace chars)
  constraint rejection_requires_reason check (
    (status <> 'REJECTED') or 
    (status = 'REJECTED' and length(btrim(coalesce(rejection_reason, ''))) >= 10)
  ),

  -- Invitation message must not be blank
  constraint invitation_message_not_blank check (length(btrim(invitation_message)) > 0)
);

-- Indexes for efficient lookup
create index if not exists institution_invitations_challenge_id_idx on public.institution_invitations (challenge_id);
create index if not exists institution_invitations_institution_id_idx on public.institution_invitations (institution_id);
create index if not exists institution_invitations_status_idx on public.institution_invitations (status);
create index if not exists institution_invitations_invited_by_idx on public.institution_invitations (invited_by);
create index if not exists institution_invitations_invited_at_idx on public.institution_invitations (invited_at desc);

-- 3. Invariant Guard Trigger: Invitations may ONLY be created for active, verified, selected institutions
create or replace function public.validate_invitation_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge_status text;
  v_inst_verified text;
  v_inst_active boolean;
  v_has_active_selection boolean;
begin
  -- A. Verify Challenge Exists & Is Eligible for Outreach
  select status into v_challenge_status
  from public.innovation_challenges
  where id = new.challenge_id;

  if v_challenge_status is null then
    raise exception 'Innovation challenge % does not exist', new.challenge_id
      using errcode = '23503';
  end if;

  if v_challenge_status not in ('APPROVED', 'INSTITUTIONS_SELECTED', 'READY_FOR_INVITATION', 'INVITATIONS_SENT') then
    raise exception 'Challenge % is in status %, not eligible for institution outreach',
      new.challenge_id, v_challenge_status
      using errcode = '23514';
  end if;

  -- B. Verify Institution Exists, Is Verified, and Is Active
  select verification_status, is_active into v_inst_verified, v_inst_active
  from public.institutions
  where id = new.institution_id;

  if v_inst_verified is null then
    raise exception 'Institution % does not exist', new.institution_id
      using errcode = '23503';
  end if;

  if v_inst_verified <> 'VERIFIED' or v_inst_active is not true then
    raise exception 'Institution % is not verified or is inactive (status: %, active: %)',
      new.institution_id, v_inst_verified, v_inst_active
      using errcode = '23514';
  end if;

  -- C. Verify Selection Invariant: Institution MUST be selected in challenge_institution_selections
  select exists(
    select 1
    from public.challenge_institution_selections
    where challenge_id = new.challenge_id
      and institution_id = new.institution_id
      and status = 'SELECTED_FOR_OUTREACH'
  ) into v_has_active_selection;

  if not v_has_active_selection then
    raise exception 'Institution % is not selected for outreach on challenge %',
      new.institution_id, new.challenge_id
      using errcode = '23514';
  end if;

  -- Automatically attach selection_id if missing
  if new.selection_id is null then
    select id into new.selection_id
    from public.challenge_institution_selections
    where challenge_id = new.challenge_id
      and institution_id = new.institution_id
      and status = 'SELECTED_FOR_OUTREACH'
    limit 1;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_invitation_eligibility on public.institution_invitations;
create trigger trg_validate_invitation_eligibility
before insert on public.institution_invitations
for each row
execute function public.validate_invitation_eligibility();

-- 4. Invariant & Column Security Trigger: Protects immutable fields, prevents responder impersonation, and validates status transitions
create or replace function public.enforce_institution_invitation_update_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_manager boolean;
  v_user_inst_id uuid;
  v_current_profile uuid;
begin
  -- A. Immutable Metadata Columns Protection
  if new.challenge_id is distinct from old.challenge_id then
    raise exception 'challenge_id is immutable' using errcode = '23514';
  end if;

  if new.institution_id is distinct from old.institution_id then
    raise exception 'institution_id is immutable' using errcode = '23514';
  end if;

  if new.selection_id is distinct from old.selection_id then
    raise exception 'selection_id is immutable' using errcode = '23514';
  end if;

  if new.invited_by is distinct from old.invited_by then
    raise exception 'invited_by is immutable' using errcode = '23514';
  end if;

  if new.invited_at is distinct from old.invited_at then
    raise exception 'invited_at is immutable' using errcode = '23514';
  end if;

  if new.invitation_message is distinct from old.invitation_message then
    raise exception 'invitation_message is immutable' using errcode = '23514';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'created_at is immutable' using errcode = '23514';
  end if;

  -- B. Finalized State Protection (Terminal statuses cannot transition)
  if old.status in ('ACCEPTED', 'REJECTED', 'CANCELLED') and new.status is distinct from old.status then
    raise exception 'Cannot change status of finalized invitation (current status: %)', old.status
      using errcode = '23514';
  end if;

  -- Resolve caller context
  v_current_profile := public.current_profile_id();
  v_is_manager := public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code]);
  v_user_inst_id := public.current_user_institution_id();

  -- C. Transition: CANCELLED (Manager / Admin only)
  if new.status = 'CANCELLED' then
    if not v_is_manager and v_current_profile is not null then
      raise exception 'Only Innovation Managers and Admins can cancel invitations'
        using errcode = '23514';
    end if;

    if old.status not in ('PENDING', 'SENT') then
      raise exception 'Cannot cancel invitation in status %', old.status
        using errcode = '23514';
    end if;
  end if;

  -- D. Transition: ACCEPTED or REJECTED (Institution response)
  if new.status in ('ACCEPTED', 'REJECTED') then
    if old.status not in ('PENDING', 'SENT') then
      raise exception 'Cannot respond to invitation in status %', old.status
        using errcode = '23514';
    end if;

    -- Enforce that caller belongs to the target institution if authenticated
    if not v_is_manager and v_current_profile is not null and (v_user_inst_id is null or v_user_inst_id <> old.institution_id) then
      raise exception 'You do not have authority to respond to invitations for institution %', old.institution_id
        using errcode = '23514';
    end if;

    -- Authoritative Identity Binding: Prevent impersonation of responded_by & force authoritative timestamp
    if v_current_profile is not null then
      new.responded_by := v_current_profile;
    end if;
    new.responded_at := now();

    -- Clean payload fields based on decision
    if new.status = 'ACCEPTED' then
      new.rejection_reason := null;
    elsif new.status = 'REJECTED' then
      new.response_note := null;
      if length(btrim(coalesce(new.rejection_reason, ''))) < 10 then
        raise exception 'A meaningful rejection reason of at least 10 characters is required'
          using errcode = '23514';
      end if;
    end if;
  end if;

  -- Always bump updated_at
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_institution_invitations_touch_updated_at on public.institution_invitations;
drop trigger if exists trg_institution_invitations_enforce_update_governance on public.institution_invitations;
create trigger trg_institution_invitations_enforce_update_governance
before update on public.institution_invitations
for each row
execute function public.enforce_institution_invitation_update_governance();

-- 5. Enhanced current_user_institution_id helper (Supports profiles.institution_id + institution_members)
create or replace function public.current_user_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    p.institution_id,
    (
      select im.institution_id
      from public.institution_members im
      where im.profile_id = p.id
      limit 1
    )
  )
  from public.profiles p
  where p.id = public.current_profile_id()
  limit 1;
$$;

-- 6. Row Level Security (RLS)
alter table public.institution_invitations enable row level security;

-- A. SELECT: Managers/Admins can view all invitations; Institutions can only view their own
drop policy if exists institution_invitations_select_authorized on public.institution_invitations;
create policy institution_invitations_select_authorized
on public.institution_invitations
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

-- B. INSERT: Managers and Admins can create invitations
drop policy if exists institution_invitations_insert_authorized on public.institution_invitations;
create policy institution_invitations_insert_authorized
on public.institution_invitations
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- C. UPDATE: 
-- 1. Managers/Admins can cancel invitations
-- 2. Institution users can accept or reject invitations for their own institution
drop policy if exists institution_invitations_update_authorized on public.institution_invitations;
create policy institution_invitations_update_authorized
on public.institution_invitations
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or (
    institution_id = public.current_user_institution_id()
    and status in ('PENDING', 'SENT')
  )
)
with check (
  -- Admins & Managers can cancel
  (
    public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
    and status in ('CANCELLED', 'SENT')
  )
  or
  -- Institution users can accept or reject
  (
    institution_id = public.current_user_institution_id()
    and status in ('ACCEPTED', 'REJECTED')
  )
);

-- D. DELETE: Blocked by default (no policy, preserving audit trail)
