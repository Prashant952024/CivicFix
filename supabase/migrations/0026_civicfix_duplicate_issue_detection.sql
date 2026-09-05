-- Migration 0026: Phase 2 AI Duplicate Issue Detection
-- Enhances public.issue_duplicates with similarity score, confidence level, matching signals, review metadata, and optimized indexes.

-- 1. Extend duplicate_status enum with 'REJECTED' if not already present
do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'duplicate_status' and pg_enum.enumlabel = 'REJECTED'
  ) then
    alter type public.duplicate_status add value 'REJECTED';
  end if;
end $$;

-- 2. Extend duplicate_detection_method enum with 'AI_MULTI_SIGNAL' if not already present
do $$
begin
  if not exists (
    select 1 from pg_enum
    join pg_type on pg_enum.enumtypid = pg_type.oid
    where pg_type.typname = 'duplicate_detection_method' and pg_enum.enumlabel = 'AI_MULTI_SIGNAL'
  ) then
    alter type public.duplicate_detection_method add value 'AI_MULTI_SIGNAL';
  end if;
end $$;

-- 3. Add new columns to public.issue_duplicates table
alter table public.issue_duplicates
  add column if not exists similarity_score numeric(5, 4),
  add column if not exists confidence text check (confidence is null or confidence in ('HIGH', 'MEDIUM', 'LOW')),
  add column if not exists matching_signals jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  add column if not exists review_notes text;

-- Add check constraint for similarity_score range [0, 1] if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'issue_duplicates_similarity_check'
  ) then
    alter table public.issue_duplicates
      add constraint issue_duplicates_similarity_check
      check (similarity_score is null or (similarity_score >= 0 and similarity_score <= 1));
  end if;
end $$;

-- 4. Bidirectional unique pair index to prevent both (A, B) and (B, A) from being inserted simultaneously
create unique index if not exists issue_duplicates_bidirectional_pair_idx
  on public.issue_duplicates (
    least(source_issue_id, duplicate_issue_id),
    greatest(source_issue_id, duplicate_issue_id)
  );

-- 5. Additional performance indexes on public.issues for spatial, category, and temporal lookups
create index if not exists issues_coordinates_idx
  on public.issues (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists issues_category_created_idx
  on public.issues (category, created_at desc);

create index if not exists issue_duplicates_status_idx
  on public.issue_duplicates (status, created_at desc);

create index if not exists issue_duplicates_reviewed_by_idx
  on public.issue_duplicates (reviewed_by)
  where reviewed_by is not null;
