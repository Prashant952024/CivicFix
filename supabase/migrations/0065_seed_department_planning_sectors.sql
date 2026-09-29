-- Migration 0065: Seed Department Planning Sector Bridge Mappings
-- ===============================================================
-- Bridges all municipal departments (public.departments) to the 10 macro
-- capital planning sectors (DEPT-01 to DEPT-10) for infrastructure assessment
-- and context aggregation.

-- 1. Ensure RLS on public.department_planning_sectors allows read access for all clients / RPCs
alter table public.department_planning_sectors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'department_planning_sectors' and policyname = 'dept_planning_sectors_read_all'
  ) then
    create policy dept_planning_sectors_read_all on public.department_planning_sectors
      for select using (true);
  end if;
end $$;

-- 2. Seed / Upsert bridge mappings for all existing departments in public.departments
insert into public.department_planning_sectors (department_id, planning_sector_code, planning_sector_name, is_primary)
select
  d.id as department_id,
  case
    -- DEPT-01: Roads & Transport
    when upper(coalesce(d.code, '')) in ('ROAD_INFRASTRUCTURE', 'TRAFFIC_TRANSPORTATION', 'MUNICIPAL_ENGINEERING', 'ROAD_SAFETY')
         or lower(d.name) like '%road%'
         or lower(d.name) like '%transport%'
         or lower(d.name) like '%traffic%'
         or lower(d.name) like '%bridge%'
         or lower(d.name) like '%engineering%'
         or lower(d.name) like '%infrastructure%'
      then 'DEPT-01'
      
    -- DEPT-02: Health & Medical Services
    when upper(coalesce(d.code, '')) in ('PUBLIC_HEALTH', 'ANIMAL_CONTROL')
         or lower(d.name) like '%health%'
         or lower(d.name) like '%medical%'
         or lower(d.name) like '%animal%'
         or lower(d.name) like '%hospital%'
         or lower(d.name) like '%dispensary%'
      then 'DEPT-02'
      
    -- DEPT-03: School & Higher Education
    when upper(coalesce(d.code, '')) in ('EDUCATION', 'SCHOOL_EDUCATION')
         or lower(d.name) like '%school%'
         or lower(d.name) like '%education%'
         or lower(d.name) like '%college%'
         or lower(d.name) like '%library%'
      then 'DEPT-03'
      
    -- DEPT-04: Water Supply & Sanitation
    when upper(coalesce(d.code, '')) in ('WATER_SUPPLY', 'SEWERAGE_DRAINAGE', 'SOLID_WASTE', 'SANITATION', 'PUBLIC_TOILETS')
         or lower(d.name) like '%water%'
         or lower(d.name) like '%sewer%'
         or lower(d.name) like '%drain%'
         or lower(d.name) like '%waste%'
         or lower(d.name) like '%sanitat%'
         or lower(d.name) like '%toilet%'
         or lower(d.name) like '%sewage%'
         or lower(d.name) like '%garbage%'
      then 'DEPT-04'
      
    -- DEPT-07: Energy & Electricity
    when upper(coalesce(d.code, '')) in ('STREET_LIGHTING', 'ELECTRICAL')
         or lower(d.name) like '%light%'
         or lower(d.name) like '%electric%'
         or lower(d.name) like '%energy%'
         or lower(d.name) like '%power%'
      then 'DEPT-07'
      
    -- DEPT-08: Irrigation & Water Resources
    when upper(coalesce(d.code, '')) in ('STORMWATER', 'FLOOD_DISASTER')
         or lower(d.name) like '%storm%'
         or lower(d.name) like '%flood%'
         or lower(d.name) like '%irrigation%'
         or lower(d.name) like '%disaster%'
         or lower(d.name) like '%river%'
      then 'DEPT-08'
      
    -- DEPT-09: Housing & Public Buildings
    when upper(coalesce(d.code, '')) in ('BUILDING_CONSTRUCTION', 'GOVERNMENT_FACILITIES')
         or lower(d.name) like '%building%'
         or lower(d.name) like '%construction%'
         or lower(d.name) like '%housing%'
         or lower(d.name) like '%facilit%'
      then 'DEPT-09'
      
    -- DEPT-10: Agriculture & Rural Infrastructure
    when upper(coalesce(d.code, '')) in ('AGRICULTURE')
         or lower(d.name) like '%agri%'
         or lower(d.name) like '%farm%'
         or lower(d.name) like '%rural infrastructure%'
      then 'DEPT-10'
      
    -- DEPT-06: Rural Development
    when upper(coalesce(d.code, '')) in ('RURAL_DEVELOPMENT')
         or lower(d.name) like '%rural dev%'
      then 'DEPT-06'
      
    -- DEPT-05: Urban Development (Default for Parks, Environment, Urban Planning, Safety, Enforcement, IT, etc.)
    else 'DEPT-05'
  end as planning_sector_code,
  case
    when upper(coalesce(d.code, '')) in ('ROAD_INFRASTRUCTURE', 'TRAFFIC_TRANSPORTATION', 'MUNICIPAL_ENGINEERING', 'ROAD_SAFETY')
         or lower(d.name) like '%road%' or lower(d.name) like '%transport%' or lower(d.name) like '%traffic%' or lower(d.name) like '%bridge%' or lower(d.name) like '%engineering%' or lower(d.name) like '%infrastructure%'
      then 'Roads & Transport'
    when upper(coalesce(d.code, '')) in ('PUBLIC_HEALTH', 'ANIMAL_CONTROL')
         or lower(d.name) like '%health%' or lower(d.name) like '%medical%' or lower(d.name) like '%animal%' or lower(d.name) like '%hospital%' or lower(d.name) like '%dispensary%'
      then 'Health & Medical Services'
    when upper(coalesce(d.code, '')) in ('EDUCATION', 'SCHOOL_EDUCATION')
         or lower(d.name) like '%school%' or lower(d.name) like '%education%' or lower(d.name) like '%college%' or lower(d.name) like '%library%'
      then 'School & Higher Education'
    when upper(coalesce(d.code, '')) in ('WATER_SUPPLY', 'SEWERAGE_DRAINAGE', 'SOLID_WASTE', 'SANITATION', 'PUBLIC_TOILETS')
         or lower(d.name) like '%water%' or lower(d.name) like '%sewer%' or lower(d.name) like '%drain%' or lower(d.name) like '%waste%' or lower(d.name) like '%sanitat%' or lower(d.name) like '%toilet%' or lower(d.name) like '%sewage%' or lower(d.name) like '%garbage%'
      then 'Water Supply & Sanitation'
    when upper(coalesce(d.code, '')) in ('STREET_LIGHTING', 'ELECTRICAL')
         or lower(d.name) like '%light%' or lower(d.name) like '%electric%' or lower(d.name) like '%energy%' or lower(d.name) like '%power%'
      then 'Energy & Electricity'
    when upper(coalesce(d.code, '')) in ('STORMWATER', 'FLOOD_DISASTER')
         or lower(d.name) like '%storm%' or lower(d.name) like '%flood%' or lower(d.name) like '%irrigation%' or lower(d.name) like '%disaster%' or lower(d.name) like '%river%'
      then 'Irrigation & Water Resources'
    when upper(coalesce(d.code, '')) in ('BUILDING_CONSTRUCTION', 'GOVERNMENT_FACILITIES')
         or lower(d.name) like '%building%' or lower(d.name) like '%construction%' or lower(d.name) like '%housing%' or lower(d.name) like '%facilit%'
      then 'Housing & Public Buildings'
    when upper(coalesce(d.code, '')) in ('AGRICULTURE')
         or lower(d.name) like '%agri%' or lower(d.name) like '%farm%' or lower(d.name) like '%rural infrastructure%'
      then 'Agriculture & Rural Infrastructure'
    when upper(coalesce(d.code, '')) in ('RURAL_DEVELOPMENT')
         or lower(d.name) like '%rural dev%'
      then 'Rural Development'
    else 'Urban Development'
  end as planning_sector_name,
  true as is_primary
from public.departments d
on conflict (department_id, planning_sector_code) do update
set
  planning_sector_name = excluded.planning_sector_name,
  is_primary = excluded.is_primary,
  updated_at = now();

-- 3. Automatic bridge trigger for newly created departments in future
create or replace function public.auto_bridge_department_planning_sector()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sector_code text;
  v_sector_name text;
begin
  case
    when upper(coalesce(new.code, '')) in ('ROAD_INFRASTRUCTURE', 'TRAFFIC_TRANSPORTATION', 'MUNICIPAL_ENGINEERING', 'ROAD_SAFETY')
         or lower(new.name) like '%road%' or lower(new.name) like '%transport%' or lower(new.name) like '%traffic%' or lower(new.name) like '%bridge%' or lower(new.name) like '%engineering%' or lower(new.name) like '%infrastructure%'
      then
        v_sector_code := 'DEPT-01';
        v_sector_name := 'Roads & Transport';
    when upper(coalesce(new.code, '')) in ('PUBLIC_HEALTH', 'ANIMAL_CONTROL')
         or lower(new.name) like '%health%' or lower(new.name) like '%medical%' or lower(new.name) like '%animal%'
      then
        v_sector_code := 'DEPT-02';
        v_sector_name := 'Health & Medical Services';
    when upper(coalesce(new.code, '')) in ('EDUCATION', 'SCHOOL_EDUCATION')
         or lower(new.name) like '%school%' or lower(new.name) like '%education%'
      then
        v_sector_code := 'DEPT-03';
        v_sector_name := 'School & Higher Education';
    when upper(coalesce(new.code, '')) in ('WATER_SUPPLY', 'SEWERAGE_DRAINAGE', 'SOLID_WASTE', 'SANITATION', 'PUBLIC_TOILETS')
         or lower(new.name) like '%water%' or lower(new.name) like '%sewer%' or lower(new.name) like '%drain%' or lower(new.name) like '%waste%' or lower(new.name) like '%sanitat%' or lower(new.name) like '%toilet%'
      then
        v_sector_code := 'DEPT-04';
        v_sector_name := 'Water Supply & Sanitation';
    when upper(coalesce(new.code, '')) in ('STREET_LIGHTING', 'ELECTRICAL')
         or lower(new.name) like '%light%' or lower(new.name) like '%electric%' or lower(new.name) like '%energy%'
      then
        v_sector_code := 'DEPT-07';
        v_sector_name := 'Energy & Electricity';
    when upper(coalesce(new.code, '')) in ('STORMWATER', 'FLOOD_DISASTER')
         or lower(new.name) like '%storm%' or lower(new.name) like '%flood%' or lower(new.name) like '%irrigation%'
      then
        v_sector_code := 'DEPT-08';
        v_sector_name := 'Irrigation & Water Resources';
    when upper(coalesce(new.code, '')) in ('BUILDING_CONSTRUCTION', 'GOVERNMENT_FACILITIES')
         or lower(new.name) like '%building%' or lower(new.name) like '%construction%' or lower(new.name) like '%housing%'
      then
        v_sector_code := 'DEPT-09';
        v_sector_name := 'Housing & Public Buildings';
    else
        v_sector_code := 'DEPT-05';
        v_sector_name := 'Urban Development';
  end case;

  insert into public.department_planning_sectors (department_id, planning_sector_code, planning_sector_name, is_primary)
  values (new.id, v_sector_code, v_sector_name, true)
  on conflict (department_id, planning_sector_code) do update
  set planning_sector_name = excluded.planning_sector_name, is_primary = excluded.is_primary, updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auto_bridge_department_planning_sector on public.departments;
create trigger trg_auto_bridge_department_planning_sector
  after insert on public.departments
  for each row
  execute function public.auto_bridge_department_planning_sector();
