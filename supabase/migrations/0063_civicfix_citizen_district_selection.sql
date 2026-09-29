-- ============================================================================
-- CivicFix Infrastructure Track: Migration 0063
-- Canonical District Master Seed & Citizen District Selection Architecture
-- ============================================================================
-- Description:
-- 1. Seeds the 24 canonical Jharkhand district master records (IN-D0229 to IN-D0252)
--    into public.districts.
-- 2. Configures read-only RLS policy allowing citizens (authenticated & anon) to
--    load canonical districts for UI selection dropdowns.
-- 3. Updates public.issues.district_resolution_method constraint to establish
--    CITIZEN_SELECTED as the primary district source, deprecating GPS_POSTGIS.
-- 4. Cleans up deprecated PostGIS resolve_district_from_gps RPC and boundary GiST index.
--
-- Security & Invariant Rules:
-- - Preserves canonical district IDs (IN-D0229 to IN-D0252) exactly.
-- - Read-only public access to districts master for form population.
-- - Preserves issues.district_id foreign-key relationship and D1–D7 context layer.
-- - SIMPLE and COMPLEX issue workflows remain unaffected.
-- ============================================================================

-- 1. Seed the 24 Canonical Jharkhand District Master Rows
INSERT INTO public.districts (
  id,
  country_code,
  state_code,
  state_name,
  district_name,
  official_district_code,
  canonical_source,
  alternate_source_codes,
  is_active
) VALUES
  ('IN-D0229', 'IN', 'IN-ST-10', 'Jharkhand', 'Bokaro', '315', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D01']::text[], true),
  ('IN-D0230', 'IN', 'IN-ST-10', 'Jharkhand', 'Chatra', '316', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D02']::text[], true),
  ('IN-D0231', 'IN', 'IN-ST-10', 'Jharkhand', 'Deoghar', '317', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D03']::text[], true),
  ('IN-D0232', 'IN', 'IN-ST-10', 'Jharkhand', 'Dhanbad', '318', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D04']::text[], true),
  ('IN-D0233', 'IN', 'IN-ST-10', 'Jharkhand', 'Dumka', '319', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D05']::text[], true),
  ('IN-D0234', 'IN', 'IN-ST-10', 'Jharkhand', 'East Singhbhum', '320', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D06']::text[], true),
  ('IN-D0235', 'IN', 'IN-ST-10', 'Jharkhand', 'Garhwa', '321', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D07']::text[], true),
  ('IN-D0236', 'IN', 'IN-ST-10', 'Jharkhand', 'Giridih', '322', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D08']::text[], true),
  ('IN-D0237', 'IN', 'IN-ST-10', 'Jharkhand', 'Godda', '323', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D09']::text[], true),
  ('IN-D0238', 'IN', 'IN-ST-10', 'Jharkhand', 'Gumla', '324', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D10']::text[], true),
  ('IN-D0239', 'IN', 'IN-ST-10', 'Jharkhand', 'Hazaribagh', '325', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D11']::text[], true),
  ('IN-D0240', 'IN', 'IN-ST-10', 'Jharkhand', 'Jamtara', '607', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D12']::text[], true),
  ('IN-D0241', 'IN', 'IN-ST-10', 'Jharkhand', 'Khunti', '629', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D13']::text[], true),
  ('IN-D0242', 'IN', 'IN-ST-10', 'Jharkhand', 'Koderma', '326', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D14']::text[], true),
  ('IN-D0243', 'IN', 'IN-ST-10', 'Jharkhand', 'Latehar', '608', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D15']::text[], true),
  ('IN-D0244', 'IN', 'IN-ST-10', 'Jharkhand', 'Lohardaga', '327', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D16']::text[], true),
  ('IN-D0245', 'IN', 'IN-ST-10', 'Jharkhand', 'Pakur', '328', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D17']::text[], true),
  ('IN-D0246', 'IN', 'IN-ST-10', 'Jharkhand', 'Palamu', '329', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D18']::text[], true),
  ('IN-D0247', 'IN', 'IN-ST-10', 'Jharkhand', 'Ramgarh', '630', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D19']::text[], true),
  ('IN-D0248', 'IN', 'IN-ST-10', 'Jharkhand', 'Ranchi', '330', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D20']::text[], true),
  ('IN-D0249', 'IN', 'IN-ST-10', 'Jharkhand', 'Sahibganj', '331', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D21']::text[], true),
  ('IN-D0250', 'IN', 'IN-ST-10', 'Jharkhand', 'Saraikela Kharsawan', '609', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D22']::text[], true),
  ('IN-D0251', 'IN', 'IN-ST-10', 'Jharkhand', 'Simdega', '610', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D23']::text[], true),
  ('IN-D0252', 'IN', 'IN-ST-10', 'Jharkhand', 'West Singhbhum', '332', 'CANONICAL_DISTRICT_REGISTRY', ARRAY['JH-D24']::text[], true)
ON CONFLICT (id) DO UPDATE SET
  state_name = EXCLUDED.state_name,
  district_name = EXCLUDED.district_name,
  official_district_code = EXCLUDED.official_district_code,
  canonical_source = EXCLUDED.canonical_source,
  alternate_source_codes = EXCLUDED.alternate_source_codes,
  is_active = true,
  updated_at = now();

-- 2. Configure RLS Policy for Districts Master Read
GRANT SELECT ON public.districts TO authenticated, anon, service_role;

DROP POLICY IF EXISTS districts_read_authenticated ON public.districts;
DROP POLICY IF EXISTS districts_read_all ON public.districts;

CREATE POLICY districts_read_all ON public.districts
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- 3. Update public.issues.district_resolution_method constraint
ALTER TABLE public.issues
  DROP CONSTRAINT IF EXISTS issues_district_resolution_method_check;

ALTER TABLE public.issues
  ADD CONSTRAINT issues_district_resolution_method_check
  CHECK (
    district_resolution_method IS NULL OR
    district_resolution_method IN ('CITIZEN_SELECTED', 'AI_ADDRESS_PARSED', 'ADMIN_MANUAL')
  );

COMMENT ON COLUMN public.issues.district_resolution_method IS 'Method used to determine the canonical district: CITIZEN_SELECTED, AI_ADDRESS_PARSED, or ADMIN_MANUAL.';

-- 4. Deprecate / Drop PostGIS Resolution RPC and Boundary GiST Index
DROP FUNCTION IF EXISTS public.resolve_district_from_gps(numeric, numeric);
DROP INDEX IF EXISTS public.idx_districts_boundary_gist;

ANALYZE public.districts;
