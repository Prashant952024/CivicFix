-- Migration 0033: CivicFix Phase 3C-Matching - AI-Assisted Institution Matching & Selection Architecture
-- 1. Update public.innovation_challenges status check constraint to include matching lifecycle states
-- 2. Create public.institution_match_runs table (auditable matching execution records)
-- 3. Create public.institution_matches table (ranked institution capability evaluations)
-- 4. Create public.challenge_institution_selections table (Innovation Manager confirmed selections)
-- 5. Trigger to enforce maximum of 5 selected institutions per challenge
-- 6. Indexes and Row Level Security policies

-- 1. Update status constraint on public.innovation_challenges
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
    'OPEN_FOR_PROPOSALS',
    'PILOT_ACTIVE',
    'SOLVED',
    'ARCHIVED'
  ));

-- 2. public.institution_match_runs table
create table if not exists public.institution_match_runs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  created_by uuid references public.profiles(id) on update cascade on delete set null,
  status text not null default 'COMPLETED' check (status in ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  algorithm_version text not null default 'v1.0-hybrid',
  ai_model_version text not null default 'gemini-2.5-flash',
  eligible_candidates_count integer not null default 0,
  top_10_institution_ids uuid[] not null default '{}',
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz default now()
);

-- Indexes for match runs
create index if not exists institution_match_runs_challenge_id_idx on public.institution_match_runs (challenge_id);
create index if not exists institution_match_runs_created_at_idx on public.institution_match_runs (created_at desc);

-- 3. public.institution_matches table
create table if not exists public.institution_matches (
  id uuid primary key default gen_random_uuid(),
  match_run_id uuid not null references public.institution_match_runs(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  rank integer not null check (rank >= 1),
  is_top_10 boolean not null default false,
  overall_score numeric(5,2) not null check (overall_score >= 0 and overall_score <= 100),
  structured_score numeric(5,2) not null check (structured_score >= 0 and structured_score <= 100),
  ai_score numeric(5,2) check (ai_score >= 0 and ai_score <= 100),
  confidence text not null default 'MEDIUM' check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  dimension_scores jsonb not null default '{}'::jsonb,
  matched_capabilities text[] not null default '{}',
  partial_matches text[] not null default '{}',
  missing_capabilities text[] not null default '{}',
  unknown_capabilities text[] not null default '{}',
  strengths text[] not null default '{}',
  concerns text[] not null default '{}',
  recommended_role text,
  match_explanation text,
  ai_reasoning text,
  created_at timestamptz not null default now(),
  constraint institution_matches_run_institution_unique unique (match_run_id, institution_id)
);

-- Indexes for matches
create index if not exists institution_matches_run_id_idx on public.institution_matches (match_run_id);
create index if not exists institution_matches_challenge_id_idx on public.institution_matches (challenge_id);
create index if not exists institution_matches_institution_id_idx on public.institution_matches (institution_id);
create index if not exists institution_matches_rank_idx on public.institution_matches (match_run_id, rank);
create index if not exists institution_matches_is_top_10_idx on public.institution_matches (match_run_id, is_top_10);
create index if not exists institution_matches_overall_score_idx on public.institution_matches (overall_score desc);

-- 4. public.challenge_institution_selections table
create table if not exists public.challenge_institution_selections (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  match_run_id uuid references public.institution_match_runs(id) on update cascade on delete set null,
  selected_by uuid not null references public.profiles(id) on update cascade on delete cascade,
  selection_rank integer,
  is_manual_override boolean not null default false,
  override_reason text,
  status text not null default 'SELECTED_FOR_OUTREACH' check (status in ('SELECTED_FOR_OUTREACH', 'CANCELLED')),
  selected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_inst_selections_unique unique (challenge_id, institution_id),
  constraint manual_override_requires_reason check (
    (is_manual_override = false) or (is_manual_override = true and length(btrim(coalesce(override_reason, ''))) >= 10)
  )
);

-- Indexes for selections
create index if not exists challenge_institution_selections_challenge_id_idx on public.challenge_institution_selections (challenge_id);
create index if not exists challenge_institution_selections_institution_id_idx on public.challenge_institution_selections (institution_id);
create index if not exists challenge_institution_selections_status_idx on public.challenge_institution_selections (status);

-- 5. Trigger: Enforce Maximum of 5 Active Selections Per Challenge
create or replace function public.enforce_challenge_selection_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.status = 'SELECTED_FOR_OUTREACH' then
    select count(*)
    into active_count
    from public.challenge_institution_selections
    where challenge_id = new.challenge_id
      and status = 'SELECTED_FOR_OUTREACH'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if active_count >= 5 then
      raise exception 'Cannot select more than 5 institutions for challenge % (current active count: %)',
        new.challenge_id, active_count
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists challenge_institution_selections_limit_check on public.challenge_institution_selections;
create trigger challenge_institution_selections_limit_check
before insert or update on public.challenge_institution_selections
for each row
execute function public.enforce_challenge_selection_limit();

-- 6. Row Level Security (RLS)

-- Enable RLS
alter table public.institution_match_runs enable row level security;
alter table public.institution_matches enable row level security;
alter table public.challenge_institution_selections enable row level security;

-- A. institution_match_runs RLS
-- Managers and Admins can view match runs
create policy institution_match_runs_select_authorized
on public.institution_match_runs
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- Managers and Admins can insert match runs
create policy institution_match_runs_insert_authorized
on public.institution_match_runs
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- Managers and Admins can update match runs
create policy institution_match_runs_update_authorized
on public.institution_match_runs
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- B. institution_matches RLS
-- Managers and Admins can view all matches
create policy institution_matches_select_authorized
on public.institution_matches
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- Managers and Admins can insert matches
create policy institution_matches_insert_authorized
on public.institution_matches
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- C. challenge_institution_selections RLS
-- Managers and Admins can view selections
create policy challenge_selections_select_authorized
on public.challenge_institution_selections
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- Managers and Admins can insert/update selections
create policy challenge_selections_insert_authorized
on public.challenge_institution_selections
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

create policy challenge_selections_update_authorized
on public.challenge_institution_selections
for update
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

create policy challenge_selections_delete_authorized
on public.challenge_institution_selections
for delete
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
);

-- Allow reading verified active institutions publicly
drop policy if exists institutions_select_anon on public.institutions;
create policy institutions_select_anon on public.institutions
for select to anon
using (
  verification_status = 'VERIFIED' and is_active = true
);
