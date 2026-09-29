-- Migration 0057: CivicFix Infrastructure Workflow Enums
-- Extends public.issue_status PostgreSQL enum with infrastructure lifecycle states.
-- Follows isolated enum pattern established in Migration 0027.

alter type public.issue_status add value if not exists 'CLASSIFIED_INFRASTRUCTURE';
alter type public.issue_status add value if not exists 'INFRASTRUCTURE_REVIEW';
alter type public.issue_status add value if not exists 'INFRASTRUCTURE_ACCEPTED';
alter type public.issue_status add value if not exists 'INFRASTRUCTURE_DEFERRED';
alter type public.issue_status add value if not exists 'INFRASTRUCTURE_REJECTED';
