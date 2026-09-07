-- Migration 0027: CivicFix Classification Enums & Innovation Role
-- Extends PostgreSQL enum types in an isolated migration so they can be safely referenced in subsequent migrations.

alter type public.role_code add value if not exists 'INNOVATION_MANAGER';
alter type public.issue_status add value if not exists 'AWAITING_ADMIN_CLASSIFICATION';
alter type public.issue_status add value if not exists 'CLASSIFIED_SIMPLE';
alter type public.issue_status add value if not exists 'CLASSIFIED_COMPLEX';
