-- Migration 0052: CivicFix Innovation Workflow Database Authorization Hardening
-- Enforces:
-- 1. ADMIN = Read-Only Ecosystem Oversight on Innovation Tables (SELECT permitted, mutations denied)
-- 2. INNOVATION_MANAGER = Sole authorized operator for Innovation lifecycle mutations
-- 3. Preserves ADMIN authoritative classification on public.issues

-- 1. innovation_challenges: Restrict insert & update to INNOVATION_MANAGER
drop policy if exists innovation_challenges_insert_manager_admin on public.innovation_challenges;
create policy innovation_challenges_insert_manager
on public.innovation_challenges
for insert
to authenticated
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
  and created_by = public.current_profile_id()
);

drop policy if exists innovation_challenges_update_manager_admin on public.innovation_challenges;
create policy innovation_challenges_update_manager
on public.innovation_challenges
for update
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

-- 2. institution_matching & selections: Restrict mutations to INNOVATION_MANAGER
drop policy if exists institution_match_runs_insert_authorized on public.institution_match_runs;
create policy institution_match_runs_insert_manager
on public.institution_match_runs
for insert
to authenticated
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

drop policy if exists institution_match_runs_update_authorized on public.institution_match_runs;
create policy institution_match_runs_update_manager
on public.institution_match_runs
for update
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

drop policy if exists challenge_selections_insert_authorized on public.challenge_institution_selections;
create policy challenge_selections_insert_manager
on public.challenge_institution_selections
for insert
to authenticated
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

drop policy if exists challenge_selections_update_authorized on public.challenge_institution_selections;
create policy challenge_selections_update_manager
on public.challenge_institution_selections
for update
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

drop policy if exists challenge_selections_delete_authorized on public.challenge_institution_selections;
create policy challenge_selections_delete_manager
on public.challenge_institution_selections
for delete
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

-- 3. institution_invitations: Restrict dispatch/cancel to INNOVATION_MANAGER
drop policy if exists institution_invitations_insert_authorized on public.institution_invitations;
create policy institution_invitations_insert_manager
on public.institution_invitations
for insert
to authenticated
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

drop policy if exists institution_invitations_update_authorized on public.institution_invitations;
create policy institution_invitations_update_authorized
on public.institution_invitations
for update
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
  or (
    institution_id = public.current_user_institution_id()
    and status in ('PENDING', 'SENT')
  )
)
with check (
  (
    public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
    and status in ('CANCELLED', 'SENT')
  )
  or
  (
    institution_id = public.current_user_institution_id()
    and status in ('ACCEPTED', 'REJECTED')
  )
);

-- 4. research_proposals: Restrict manager governance to INNOVATION_MANAGER
drop policy if exists research_proposals_update_authorized on public.research_proposals;
create policy research_proposals_update_authorized
on public.research_proposals
for update
to authenticated
using (
  public.can_manage_challenge_project(project_id)
  or public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.can_manage_challenge_project(project_id)
  or public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);

-- 5. pilot_plans: Restrict manager governance to INNOVATION_MANAGER
drop policy if exists "pilot_plans_update_policy" on public.pilot_plans;
create policy "pilot_plans_update_policy"
on public.pilot_plans
for update
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
)
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
  or public.can_manage_challenge_project(project_id)
);

-- 6. complex_solution_knowledge_base: Restrict management to INNOVATION_MANAGER
drop policy if exists "complex_solution_manage_authenticated" on public.complex_solution_knowledge_base;
create policy "complex_solution_manage_manager"
on public.complex_solution_knowledge_base
for all
to authenticated
using (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
)
with check (
  public.current_user_has_role(array['INNOVATION_MANAGER'::public.role_code])
);
