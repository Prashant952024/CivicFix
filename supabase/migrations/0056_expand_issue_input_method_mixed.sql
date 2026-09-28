-- Migration 0056: Expand issues.input_method to support MIXED input modality
-- Purpose: Support issues created with combined modalities (e.g. Voice Title + Typed Description + Voice Notes)

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'issues_input_method_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues drop constraint issues_input_method_check;
  end if;
end $$;

alter table public.issues
  add constraint issues_input_method_check
  check (input_method in ('TEXT', 'VOICE', 'MIXED'));

comment on column public.issues.input_method is 'Input modality used by citizen: TEXT (all typed), VOICE (all voice), or MIXED (combination of voice and typed fields)';
