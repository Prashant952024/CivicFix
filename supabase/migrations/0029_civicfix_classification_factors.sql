-- CivicFix: Migration 0029 - Multi-Factor AI Complexity & Governance Refinements
-- Stores structured complexity factors and advisory classification notes for Phase 3A refinement.

ALTER TABLE public.issue_ai_analysis
  ADD COLUMN IF NOT EXISTS complexity_factors jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS classification_note text DEFAULT NULL;

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS ai_complexity_factors jsonb DEFAULT NULL;

COMMENT ON COLUMN public.issue_ai_analysis.complexity_factors IS 'Structured 8-factor boolean evaluation assessing systemic, recurring, multi-domain, research, technology, scale, stakeholder, and municipal solution availability.';
COMMENT ON COLUMN public.issue_ai_analysis.classification_note IS 'Advisory classification note, particularly for borderline complexity cases (score 51-65).';
COMMENT ON COLUMN public.issues.ai_complexity_factors IS 'Denormalized complexity factor signals for instant filtering and badge rendering in admin queues.';
