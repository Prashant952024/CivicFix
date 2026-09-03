-- Migration 0015: CivicFix Add DEPARTMENT_MANAGER Role & PARTIALLY_COMPLETED Status Enums
-- Extends PostgreSQL enum types in an isolated transaction so they can be safely referenced in subsequent migrations.

alter type public.role_code add value if not exists 'DEPARTMENT_MANAGER';
alter type public.issue_status add value if not exists 'PARTIALLY_COMPLETED';
