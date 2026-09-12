-- Migration 0031: CivicFix Add INSTITUTION Role Enum
-- Extends PostgreSQL enum types in an isolated migration so they can be safely referenced in subsequent migrations.

alter type public.role_code add value if not exists 'INSTITUTION';
