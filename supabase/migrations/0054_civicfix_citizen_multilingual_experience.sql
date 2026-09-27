-- Migration 0054: CivicFix Citizen Multilingual & Voice Input Infrastructure
-- Purpose:
-- 1. Add preferred_language to public.profiles (default 'en')
-- 2. Add original_language, input_method, original_title, original_description, english_title, english_description to public.issues
-- 3. Ensure backward compatibility with backfilled defaults and idempotent triggers

-- 1. Update profiles table with preferred_language
alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('en', 'hi', 'mr'));
  end if;
end $$;

-- 2. Update issues table with multilingual and input metadata
alter table public.issues
  add column if not exists original_language text not null default 'en',
  add column if not exists input_method text not null default 'TEXT',
  add column if not exists original_title text,
  add column if not exists original_description text,
  add column if not exists english_title text,
  add column if not exists english_description text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'issues_input_method_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues
      add constraint issues_input_method_check
      check (input_method in ('TEXT', 'VOICE'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'issues_original_language_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues
      add constraint issues_original_language_check
      check (length(original_language) > 0 and length(original_language) <= 20);
  end if;
end $$;

-- 3. Backfill existing issues to guarantee backward compatibility
update public.issues
set
  original_title = coalesce(original_title, title),
  original_description = coalesce(original_description, description),
  english_title = coalesce(english_title, title),
  english_description = coalesce(english_description, description),
  original_language = coalesce(original_language, 'en'),
  input_method = coalesce(input_method, 'TEXT')
where
  original_title is null
  or original_description is null
  or english_title is null
  or english_description is null;

-- 4. Trigger function to ensure canonical fields are always populated on insert
create or replace function public.sync_issue_multilingual_defaults()
returns trigger
language plpgsql
as $$
begin
  -- If original_title is not provided, default to title
  if new.original_title is null or length(btrim(new.original_title)) = 0 then
    new.original_title := new.title;
  end if;

  -- If original_description is not provided, default to description
  if new.original_description is null or length(btrim(new.original_description)) = 0 then
    new.original_description := new.description;
  end if;

  -- If english_title is not provided, default to title
  if new.english_title is null or length(btrim(new.english_title)) = 0 then
    new.english_title := new.title;
  end if;

  -- If english_description is not provided, default to description
  if new.english_description is null or length(btrim(new.english_description)) = 0 then
    new.english_description := new.description;
  end if;

  -- Default original_language if blank
  if new.original_language is null or length(btrim(new.original_language)) = 0 then
    new.original_language := 'en';
  end if;

  -- Default input_method if blank
  if new.input_method is null or length(btrim(new.input_method)) = 0 then
    new.input_method := 'TEXT';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_issue_multilingual_defaults on public.issues;
create trigger trg_sync_issue_multilingual_defaults
before insert or update of title, description, original_title, original_description, english_title, english_description
on public.issues
for each row
execute function public.sync_issue_multilingual_defaults();

comment on column public.profiles.preferred_language is 'User interface preferred language code: en, hi, mr';
comment on column public.issues.original_language is 'The original language the issue was submitted in (e.g. en, hi, mr)';
comment on column public.issues.input_method is 'Input modality used by citizen: TEXT or VOICE';
comment on column public.issues.original_title is 'Issue title in original submitted language';
comment on column public.issues.original_description is 'Issue description in original submitted language or voice transcript';
comment on column public.issues.english_title is 'Canonical English title for downstream AI classification and search';
comment on column public.issues.english_description is 'Canonical English description for downstream AI classification and search';
