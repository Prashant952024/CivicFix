-- Migration 0042: CivicFix Challenge Project Direct Communication
-- Implements secure, isolated direct communication channels between Innovation Managers and University Research Teams.
-- Scoped strictly to challenge_projects (challenge_id + institution_id).

create table if not exists public.challenge_project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.challenge_projects(id) on update cascade on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on update cascade on delete restrict,
  sender_name text not null,
  sender_role text not null default 'INNOVATION_MANAGER' check (sender_role in (
    'INNOVATION_MANAGER', 'ADMIN', 'PROJECT_LEAD', 'FACULTY', 'RESEARCHER', 'STUDENT', 'MEMBER'
  )),
  topic text not null default 'GENERAL' check (topic in (
    'GENERAL', 'PROPOSAL_CLARIFICATION', 'MILESTONE_COORDINATION', 'TESTBED_LOGISTICS', 'BUDGET_RESOURCES'
  )),
  message_body text not null check (length(btrim(message_body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Performance & Isolation Indexes
create index if not exists challenge_project_messages_proj_created_idx 
on public.challenge_project_messages (project_id, created_at asc);

create index if not exists challenge_project_messages_sender_idx 
on public.challenge_project_messages (sender_profile_id);

-- Enable RLS
alter table public.challenge_project_messages enable row level security;

-- A. SELECT: Innovation Managers, Admins, or members belonging to the owning institution
drop policy if exists challenge_project_messages_select_authorized on public.challenge_project_messages;
create policy challenge_project_messages_select_authorized
on public.challenge_project_messages
for select
to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or exists (
    select 1 from public.challenge_projects cp
    where cp.id = challenge_project_messages.project_id
      and (
        cp.institution_id = public.current_user_institution_id()
        or cp.project_lead_profile_id = (select id from public.profiles where clerk_id = auth.jwt() ->> 'sub' limit 1)
        or cp.created_by = (select id from public.profiles where clerk_id = auth.jwt() ->> 'sub' limit 1)
      )
  )
);

-- B. INSERT: Innovation Managers, Admins, or Authorized Project Leads
drop policy if exists challenge_project_messages_insert_authorized on public.challenge_project_messages;
create policy challenge_project_messages_insert_authorized
on public.challenge_project_messages
for insert
to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

-- C. Audit Trigger: Log to challenge_project_activity
create or replace function public.handle_challenge_project_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.challenge_project_activity (
    project_id,
    actor_profile_id,
    activity_type,
    description,
    metadata
  ) values (
    new.project_id,
    new.sender_profile_id,
    'PROJECT_DETAILS_UPDATED',
    format('Communication message posted by %s (%s): "%s"', new.sender_name, new.sender_role, left(new.message_body, 80)),
    jsonb_build_object(
      'message_id', new.id,
      'topic', new.topic,
      'sender_role', new.sender_role
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_challenge_project_message_activity on public.challenge_project_messages;
create trigger trg_challenge_project_message_activity
after insert on public.challenge_project_messages
for each row
execute function public.handle_challenge_project_message_activity();
