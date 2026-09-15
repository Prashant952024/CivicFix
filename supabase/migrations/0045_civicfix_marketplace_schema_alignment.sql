-- Migration 0045: CivicFix Marketplace Schema Alignment
-- Aligns columns on research_support_requests, research_support_listings, 
-- research_support_applications, and project_support_partners with application types.

-- 1. research_support_requests: Add missing columns
alter table public.research_support_requests
  add column if not exists confidentiality_level text not null default 'RESTRICTED' check (confidentiality_level in (
    'PUBLIC',
    'COMMUNITY',
    'RESTRICTED',
    'CONFIDENTIAL'
  )),
  add column if not exists specification text,
  add column if not exists quantity_or_scope text,
  add column if not exists estimated_cost numeric,
  add column if not exists required_by_date date,
  add column if not exists review_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. research_support_listings: Add missing columns and loosen legacy column constraints
alter table public.research_support_listings
  add column if not exists public_title text,
  add column if not exists public_specification text,
  add column if not exists public_timeline text,
  add column if not exists desired_outcome text,
  add column if not exists published_by uuid references public.profiles(id) on update cascade on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Backfill public_title from listing_title if needed and vice versa
update public.research_support_listings
set public_title = listing_title
where public_title is null and listing_title is not null;

update public.research_support_listings
set listing_title = public_title
where listing_title is null and public_title is not null;

-- Make listing_title nullable to allow public_title
alter table public.research_support_listings
  alter column listing_title drop not null;

-- 3. research_support_applications: Add missing columns and loosen legacy column constraints
alter table public.research_support_applications
  add column if not exists applicant_profile_id uuid references public.profiles(id) on update cascade on delete set null,
  add column if not exists proposed_contribution text,
  add column if not exists capabilities_summary text,
  add column if not exists estimated_value numeric,
  add column if not exists timeline text,
  add column if not exists terms_or_conditions text,
  add column if not exists acceptance_agreement_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Make legacy application columns nullable
alter table public.research_support_applications
  alter column proposal drop not null,
  alter column offered_support drop not null;

-- 4. project_support_partners: Add missing columns
alter table public.project_support_partners
  add column if not exists listing_id uuid references public.research_support_listings(id) on update cascade on delete cascade,
  add column if not exists category text,
  add column if not exists contribution_summary text,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 5. Auto-sync trigger for legacy and modern listing fields
create or replace function public.sync_research_support_listing_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.public_title is not null and new.listing_title is null then
    new.listing_title := new.public_title;
  elsif new.listing_title is not null and new.public_title is null then
    new.public_title := new.listing_title;
  end if;

  if new.public_specification is not null and new.deliverable_specs is null then
    new.deliverable_specs := new.public_specification;
  elsif new.deliverable_specs is not null and new.public_specification is null then
    new.public_specification := new.deliverable_specs;
  end if;

  if new.desired_outcome is not null and new.expected_outcome is null then
    new.expected_outcome := new.desired_outcome;
  elsif new.expected_outcome is not null and new.desired_outcome is null then
    new.desired_outcome := new.expected_outcome;
  end if;

  if new.public_timeline is not null and new.target_timeline is null then
    new.target_timeline := new.public_timeline;
  elsif new.target_timeline is not null and new.public_timeline is null then
    new.public_timeline := new.target_timeline;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_research_support_listing_fields on public.research_support_listings;
create trigger trg_sync_research_support_listing_fields
before insert or update on public.research_support_listings
for each row execute function public.sync_research_support_listing_fields();

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
