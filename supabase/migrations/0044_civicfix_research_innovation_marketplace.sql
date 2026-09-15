-- Migration 0044: CivicFix Phase 3D-5 Research & Innovation Marketplace
-- 1. Extend role_code enum and roles table with INDUSTRY_PARTNER
-- 2. Create industry_organizations table
-- 3. Add organization_id to profiles table
-- 4. Create research_support_requests table
-- 5. Create research_support_listings table
-- 6. Create research_support_applications table
-- 7. Create project_support_partners table
-- 8. Add triggers for application counts, proposal gating, and audit
-- 9. Extend challenge_project_activity activity types
-- 10. Configure strict Row Level Security (RLS) policies

-- 1. Extend role_code enum and roles table
alter type public.role_code add value if not exists 'INDUSTRY_PARTNER';

insert into public.roles (code, name, description)
values (
  'INDUSTRY_PARTNER',
  'Industry Partner',
  'Verified corporate, startup, or industry organization collaborating on civic research challenges.'
)
on conflict (code) do nothing;

-- 2. Create industry_organizations table
create table if not exists public.industry_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  organization_type text not null default 'COMPANY' check (organization_type in (
    'COMPANY',
    'STARTUP',
    'INDUSTRY',
    'RESEARCH_ORGANIZATION',
    'NONPROFIT',
    'OTHER'
  )),
  verification_status text not null default 'PENDING' check (verification_status in (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'SUSPENDED'
  )),
  website_url text,
  description text,
  domains text[] not null default '{}',
  capabilities text[] not null default '{}',
  technologies text[] not null default '{}',
  support_types text[] not null default '{}',
  geographic_coverage text[] not null default '{}',
  contact_email text,
  contact_phone text,
  primary_contact_name text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists industry_organizations_verification_idx
  on public.industry_organizations (verification_status, organization_type);

-- 3. Add organization_id to profiles table
alter table public.profiles
  add column if not exists organization_id uuid references public.industry_organizations(id) on update cascade on delete set null;

create index if not exists profiles_org_idx
  on public.profiles (organization_id);

-- 4. Create research_support_requests table
create table if not exists public.research_support_requests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  linked_milestone_id uuid references public.research_project_milestones(id) on update cascade on delete set null,
  linked_blocker_id uuid references public.research_blockers_risks(id) on update cascade on delete set null,
  title text not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  category text not null check (category in (
    'FUNDING',
    'HARDWARE',
    'TECHNOLOGY',
    'EXPERTISE',
    'INFRASTRUCTURE',
    'DATA',
    'MANUFACTURING'
  )),
  priority text not null default 'MEDIUM' check (priority in (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
  )),
  status text not null default 'DRAFT' check (status in (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'IN_PROGRESS',
    'FULFILLED',
    'REJECTED',
    'CANCELLED',
    'CLOSED'
  )),
  quantity numeric,
  unit text,
  amount numeric,
  currency text default 'INR',
  purpose text,
  justification text,
  specifications jsonb not null default '{}'::jsonb,
  required_by date,
  delivery_location text,
  created_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_feedback text,
  published_at timestamptz,
  closed_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_support_requests_project_idx
  on public.research_support_requests (project_id, status, category);

create index if not exists research_support_requests_challenge_idx
  on public.research_support_requests (challenge_id, institution_id);

-- 5. Create research_support_listings table (Public/Marketplace Controlled Representation)
create table if not exists public.research_support_listings (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null unique references public.research_support_requests(id) on update cascade on delete cascade,
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  challenge_id uuid not null references public.innovation_challenges(id) on update cascade on delete cascade,
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  listing_title text not null check (length(btrim(listing_title)) > 0),
  public_summary text not null check (length(btrim(public_summary)) > 0),
  category text not null check (category in (
    'FUNDING',
    'HARDWARE',
    'TECHNOLOGY',
    'EXPERTISE',
    'INFRASTRUCTURE',
    'DATA',
    'MANUFACTURING'
  )),
  status text not null default 'DRAFT' check (status in (
    'DRAFT',
    'PENDING_REVIEW',
    'APPROVED',
    'OPEN',
    'PAUSED',
    'FULFILLED',
    'CLOSED',
    'CANCELLED'
  )),
  problem_context text,
  expected_outcome text,
  deliverable_specs text,
  quantity_needed numeric,
  unit text,
  target_timeline text,
  geographic_scope text,
  applications_count integer not null default 0,
  published_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_support_listings_status_cat_idx
  on public.research_support_listings (status, category, published_at desc);

create index if not exists research_support_listings_challenge_idx
  on public.research_support_listings (challenge_id, institution_id);

-- 6. Create research_support_applications table
create table if not exists public.research_support_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.research_support_listings(id) on update cascade on delete cascade,
  support_request_id uuid not null references public.research_support_requests(id) on update cascade on delete cascade,
  organization_id uuid not null references public.industry_organizations(id) on update cascade on delete cascade,
  submitted_by uuid references public.profiles(id) on update cascade on delete set null,
  proposal text not null check (length(btrim(proposal)) >= 20),
  offered_support text not null check (length(btrim(offered_support)) >= 10),
  offered_quantity numeric,
  offered_amount numeric,
  estimated_timeline text,
  conditions text,
  status text not null default 'SUBMITTED' check (status in (
    'SUBMITTED',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CLARIFICATION_REQUESTED'
  )),
  clarification_notes text,
  clarification_requested_at timestamptz,
  clarification_response text,
  clarification_responded_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_support_applications_listing_org_uniq unique (listing_id, organization_id)
);

create index if not exists research_support_applications_listing_idx
  on public.research_support_applications (listing_id, status);

create index if not exists research_support_applications_org_idx
  on public.research_support_applications (organization_id, status);

-- 7. Create project_support_partners table
create table if not exists public.project_support_partners (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  organization_id uuid not null references public.industry_organizations(id) on update cascade on delete cascade,
  support_request_id uuid not null references public.research_support_requests(id) on update cascade on delete cascade,
  application_id uuid not null unique references public.research_support_applications(id) on update cascade on delete cascade,
  participation_status text not null default 'ACTIVE' check (participation_status in (
    'ACTIVE',
    'COMPLETED',
    'TERMINATED'
  )),
  access_scope text not null default 'SUPPORT_SPECIFIC' check (access_scope in (
    'SUPPORT_SPECIFIC'
  )),
  agreement_notes text,
  onboarded_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_support_partners_project_idx
  on public.project_support_partners (project_id, participation_status);

create index if not exists project_support_partners_org_idx
  on public.project_support_partners (organization_id, participation_status);

-- 8. Functions and Triggers
-- 8A. Auto sync applications_count on research_support_listings
create or replace function public.sync_listing_applications_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.research_support_listings
    set applications_count = (
      select count(*) from public.research_support_applications
      where listing_id = new.listing_id and status != 'WITHDRAWN'
    ),
    updated_at = now()
    where id = new.listing_id;
  elsif tg_op = 'UPDATE' then
    update public.research_support_listings
    set applications_count = (
      select count(*) from public.research_support_applications
      where listing_id = new.listing_id and status != 'WITHDRAWN'
    ),
    updated_at = now()
    where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update public.research_support_listings
    set applications_count = (
      select count(*) from public.research_support_applications
      where listing_id = old.listing_id and status != 'WITHDRAWN'
    ),
    updated_at = now()
    where id = old.listing_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_listing_applications_count on public.research_support_applications;
create trigger trg_sync_listing_applications_count
after insert or update of status or delete on public.research_support_applications
for each row execute function public.sync_listing_applications_count();

-- 8B. Enforce proposal approval gating on support requests
create or replace function public.enforce_support_request_proposal_gating()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.project_has_approved_proposal(new.project_id) then
    raise exception 'Cannot create or modify support requests for a project without an APPROVED research proposal.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_support_request_proposal_gating on public.research_support_requests;
create trigger trg_enforce_support_request_proposal_gating
before insert or update on public.research_support_requests
for each row execute function public.enforce_support_request_proposal_gating();

-- 9. Extend challenge_project_activity activity types
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
    'RESEARCH_STARTED',
    'MILESTONE_CREATED',
    'MILESTONE_UPDATED',
    'MILESTONE_COMPLETED',
    'PROGRESS_UPDATE_SUBMITTED',
    'PROGRESS_UPDATE_ACKNOWLEDGED',
    'EVIDENCE_ADDED',
    'BLOCKER_REPORTED',
    'BLOCKER_RESOLVED',
    'RISK_REPORTED',
    'RISK_UPDATED',
    'EXTERNAL_RESOURCE_ADDED',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_SUBMITTED',
    'SUPPORT_REQUEST_APPROVED',
    'SUPPORT_REQUEST_PUBLISHED',
    'SUPPORT_APPLICATION_SUBMITTED',
    'SUPPORT_APPLICATION_REVIEWED',
    'SUPPORT_APPLICATION_ACCEPTED',
    'SUPPORT_APPLICATION_REJECTED',
    'SUPPORT_PARTNER_SELECTED',
    'SUPPORT_REQUEST_FULFILLED'
  )
);

-- 10. Configure Row Level Security (RLS) policies

-- 10A. industry_organizations
alter table public.industry_organizations enable row level security;

drop policy if exists "industry_organizations_read_policy" on public.industry_organizations;
create policy "industry_organizations_read_policy"
on public.industry_organizations
for select
using (
  verification_status = 'VERIFIED'
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
);

drop policy if exists "industry_organizations_manage_policy" on public.industry_organizations;
create policy "industry_organizations_manage_policy"
on public.industry_organizations
for all
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
);

-- 10B. research_support_requests
alter table public.research_support_requests enable row level security;

drop policy if exists "research_support_requests_read_policy" on public.research_support_requests;
create policy "research_support_requests_read_policy"
on public.research_support_requests
for select
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

drop policy if exists "research_support_requests_write_policy" on public.research_support_requests;
create policy "research_support_requests_write_policy"
on public.research_support_requests
for all
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

-- 10C. research_support_listings
alter table public.research_support_listings enable row level security;

drop policy if exists "research_support_listings_read_policy" on public.research_support_listings;
create policy "research_support_listings_read_policy"
on public.research_support_listings
for select
using (
  status = 'OPEN'
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

drop policy if exists "research_support_listings_write_policy" on public.research_support_listings;
create policy "research_support_listings_write_policy"
on public.research_support_listings
for all
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

-- 10D. research_support_applications
alter table public.research_support_applications enable row level security;

drop policy if exists "research_support_applications_read_policy" on public.research_support_applications;
create policy "research_support_applications_read_policy"
on public.research_support_applications
for select
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project((select project_id from public.research_support_requests where id = support_request_id))
  or organization_id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
);

drop policy if exists "research_support_applications_write_policy" on public.research_support_applications;
create policy "research_support_applications_write_policy"
on public.research_support_applications
for all
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project((select project_id from public.research_support_requests where id = support_request_id))
  or (
    organization_id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
    and exists (
      select 1 from public.industry_organizations io
      where io.id = organization_id and io.verification_status = 'VERIFIED'
    )
  )
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project((select project_id from public.research_support_requests where id = support_request_id))
  or (
    organization_id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
    and exists (
      select 1 from public.industry_organizations io
      where io.id = organization_id and io.verification_status = 'VERIFIED'
    )
  )
);

-- 10E. project_support_partners
alter table public.project_support_partners enable row level security;

drop policy if exists "project_support_partners_read_policy" on public.project_support_partners;
create policy "project_support_partners_read_policy"
on public.project_support_partners
for select
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
  or organization_id = (select organization_id from public.profiles where clerk_user_id = auth.jwt() ->> 'sub' limit 1)
);

drop policy if exists "project_support_partners_write_policy" on public.project_support_partners;
create policy "project_support_partners_write_policy"
on public.project_support_partners
for all
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);
