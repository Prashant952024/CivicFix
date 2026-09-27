-- Migration 0055: Expand Indic Languages Support and Voice Transcription Metadata
-- Purpose:
-- 1. Expand preferred_language check on public.profiles to all major Indic languages
-- 2. Add detected_language to public.issues to track AI speech recognition detected language independently of preferred/original language
-- 3. Update sync_issue_multilingual_defaults trigger to handle detected_language idempotently

-- 1. Drop existing preferred_language check constraint and re-add with full Indic language list
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_preferred_language_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (
    preferred_language in (
      'en', 'hi', 'mr', 'bn', 'gu', 'pa', 'ta', 'te', 'kn', 'ml',
      'or', 'as', 'ur', 'sa', 'ne', 'kok', 'ks', 'sd', 'mai', 'mni'
    )
  );

-- 2. Add detected_language column to public.issues if not exists
alter table public.issues
  add column if not exists detected_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'issues_detected_language_check'
      and conrelid = 'public.issues'::regclass
  ) then
    alter table public.issues
      add constraint issues_detected_language_check
      check (length(detected_language) > 0 and length(detected_language) <= 20);
  end if;
end $$;

-- 3. Backfill detected_language on existing issues
update public.issues
set detected_language = coalesce(original_language, 'en')
where detected_language is null or length(btrim(detected_language)) = 0;

-- 4. Update the trigger function to maintain defaults for detected_language
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

  -- Default detected_language if blank
  if new.detected_language is null or length(btrim(new.detected_language)) = 0 then
    new.detected_language := new.original_language;
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
before insert or update of title, description, original_title, original_description, english_title, english_description, detected_language
on public.issues
for each row
execute function public.sync_issue_multilingual_defaults();

comment on column public.issues.detected_language is 'Language detected by speech-to-text / AI pipeline during audio transcription';
