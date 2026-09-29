-- ============================================================================
-- CivicFix Infrastructure Workflow: Migration 0061
-- PostGIS GPS District Point-in-Polygon Resolution Layer
-- ============================================================================
-- Description:
-- 1. Enables PostGIS extension for spatial containment calculations.
-- 2. Adds canonical boundary geometry column to public.districts with GiST index.
-- 3. Expands public.issues.district_resolution_method constraint to support 'GPS_POSTGIS'.
-- 4. Implements public.resolve_district_from_gps(p_latitude, p_longitude) RPC.
--
-- Security & Invariant Rules:
-- - STABLE, READ-ONLY spatial resolution function.
-- - Strictly adheres to EPSG:4326 coordinate conventions (POINT(longitude, latitude)).
-- - Never fabricates boundaries or approximates circular buffers.
-- - Leaves non-intersecting coordinates unresolved for Admin manual resolution fallback.
-- - Preserves existing SIMPLE and COMPLEX issue workflows without alteration.
-- ============================================================================

-- 1. Enable PostGIS Extension
create extension if not exists postgis;

-- 2. Add boundary geometry column to public.districts
alter table public.districts
  add column if not exists boundary geometry(MultiPolygon, 4326);

-- Create GiST spatial index for high-performance point-in-polygon lookups
create index if not exists idx_districts_boundary_gist
  on public.districts using gist (boundary)
  where boundary is not null;

comment on column public.districts.boundary is 'Authoritative administrative boundary geometry (EPSG:4326 MultiPolygon) for canonical district point-in-polygon containment resolution.';

-- 3. Update public.issues.district_resolution_method check constraint
alter table public.issues
  drop constraint if exists issues_district_resolution_method_check;

alter table public.issues
  add constraint issues_district_resolution_method_check
  check (
    district_resolution_method is null or
    district_resolution_method in ('CITIZEN_SELECTED', 'AI_ADDRESS_PARSED', 'ADMIN_MANUAL', 'GPS_POSTGIS')
  );

comment on column public.issues.district_resolution_method is 'Method used to determine the canonical district: CITIZEN_SELECTED, AI_ADDRESS_PARSED, ADMIN_MANUAL, or GPS_POSTGIS.';

-- 4. Create PostGIS GPS District Resolution RPC
create or replace function public.resolve_district_from_gps(
  p_latitude numeric,
  p_longitude numeric
)
returns table (
  district_id text,
  district_name text,
  state_name text,
  state_code text,
  resolution_method text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_point geometry;
begin
  -- 1. Input Validation: Check for nulls and valid geographic range
  if p_latitude is null or p_longitude is null then
    return;
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    return;
  end if;

  -- 2. Construct PostGIS Point geometry with SRID 4326
  -- Notice: PostGIS coordinates take (longitude, latitude)
  v_point := st_setsrid(st_point(p_longitude::double precision, p_latitude::double precision), 4326);

  -- 3. Perform point-in-polygon query against canonical districts
  return query
  select
    d.id as district_id,
    d.district_name,
    d.state_name,
    d.state_code,
    'GPS_POSTGIS'::text as resolution_method
  from public.districts d
  where d.is_active = true
    and d.boundary is not null
    and (
      st_contains(d.boundary, v_point)
      or st_intersects(d.boundary, v_point)
    )
  order by d.id
  limit 1;
end;
$$;

-- Grant execution permissions to all authenticated and anonymous clients
grant execute on function public.resolve_district_from_gps(numeric, numeric) to authenticated, anon, service_role;

comment on function public.resolve_district_from_gps(numeric, numeric) is 'Resolves canonical district identity from GPS coordinates using PostGIS ST_Contains / ST_Intersects against public.districts.boundary.';
