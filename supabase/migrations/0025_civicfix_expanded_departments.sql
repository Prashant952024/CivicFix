-- Migration 0025: Expanded 25 Civic Departments with Unique Department Codes

-- 1. Add code column to public.departments if not exists
alter table public.departments
  add column if not exists code text;

-- 2. Seed / Upsert the 25 standard civic departments
insert into public.departments (name, code, description, is_active)
values
  (
    'Road & Infrastructure',
    'ROAD_INFRASTRUCTURE',
    'Road construction, pothole repairs, bridges, footpaths, asphalt defects, and pavement upkeep.',
    true
  ),
  (
    'Water Supply',
    'WATER_SUPPLY',
    'Potable water pipelines, supply leakage, water pressure issues, and municipal tap maintenance.',
    true
  ),
  (
    'Sewerage & Drainage',
    'SEWERAGE_DRAINAGE',
    'Underground sewer lines, wastewater blockages, manhole maintenance, and sewage overflow.',
    true
  ),
  (
    'Solid Waste Management',
    'SOLID_WASTE',
    'Garbage collection, street sweeping, community dump clearance, waste bins, and bio-waste management.',
    true
  ),
  (
    'Street Lighting',
    'STREET_LIGHTING',
    'Street luminaires, pole fixtures, dark alleys, faulty timers, and street lighting maintenance.',
    true
  ),
  (
    'Electrical Services',
    'ELECTRICAL',
    'Exposed wiring, electrical pole leaning, transformer hazards, and high-voltage public safety.',
    true
  ),
  (
    'Traffic & Transportation',
    'TRAFFIC_TRANSPORTATION',
    'Traffic signals, road signage, pedestrian crossings, bus stops, road markings, and lane barricades.',
    true
  ),
  (
    'Public Health',
    'PUBLIC_HEALTH',
    'Disease prevention, anti-mosquito fogging, pest control, hygiene inspection, and public health risks.',
    true
  ),
  (
    'Parks & Gardens',
    'PARKS_GARDENS',
    'Public parks, botanical gardens, roadside tree maintenance, branch trimming, and green verges.',
    true
  ),
  (
    'Environment',
    'ENVIRONMENT',
    'Air pollution, noise pollution, industrial emissions, water body pollution, and environmental protection.',
    true
  ),
  (
    'Stormwater Management',
    'STORMWATER',
    'Monsoon drain clearing, culvert blockages, stormwater pumps, and urban flood mitigation.',
    true
  ),
  (
    'Building & Construction',
    'BUILDING_CONSTRUCTION',
    'Structural safety, building code enforcement, dangerous buildings, and construction debris.',
    true
  ),
  (
    'Fire & Emergency Services',
    'FIRE_EMERGENCY',
    'Fire safety hazards, emergency access blockages, hydrants, and disaster preparedness.',
    true
  ),
  (
    'Public Safety',
    'PUBLIC_SAFETY',
    'General civic hazards, uncovered trenches, open pits, missing guardrails, and public safety issues.',
    true
  ),
  (
    'Animal Control',
    'ANIMAL_CONTROL',
    'Stray animal management, cattle nuisance, rabies vaccination, and dead animal removal.',
    true
  ),
  (
    'Sanitation',
    'SANITATION',
    'Public sanitization, market cleaning, drain desilting, and municipal hygiene.',
    true
  ),
  (
    'Encroachment & Enforcement',
    'ENCROACHMENT_ENFORCEMENT',
    'Unauthorized structures on footpaths, illegal street vendors, public land encroachments.',
    true
  ),
  (
    'Urban Planning',
    'URBAN_PLANNING',
    'Zoning violations, civic layout compliance, public spaces, and urban development.',
    true
  ),
  (
    'Municipal Engineering',
    'MUNICIPAL_ENGINEERING',
    'Civil engineering works, flyovers, subways, public structural works, and retaining walls.',
    true
  ),
  (
    'Road Safety',
    'ROAD_SAFETY',
    'Speed breakers, road rumble strips, accident-prone blind spots, crash barriers, and safety bollards.',
    true
  ),
  (
    'Public Toilets',
    'PUBLIC_TOILETS',
    'Public toilet facilities maintenance, community toilet cleanliness, plumbing, and water availability.',
    true
  ),
  (
    'Flood & Disaster Management',
    'FLOOD_DISASTER',
    'Emergency waterlogging, rescue operations, relief coordination, and flood shelter readiness.',
    true
  ),
  (
    'Government Buildings & Facilities',
    'GOVERNMENT_FACILITIES',
    'Municipal office buildings, ward offices, public halls, and government facility maintenance.',
    true
  ),
  (
    'IT & Digital Services',
    'IT_DIGITAL',
    'Municipal kiosks, civic digital portals, online grievance kiosks, and smart city sensors.',
    true
  ),
  (
    'Other / General Services',
    'OTHER',
    'General municipal inquiries and miscellaneous civic issues not categorized above.',
    true
  )
on conflict (name) do update
set
  code = excluded.code,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

-- 3. Also add unique constraint on code if not already present
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_code_unique'
  ) then
    alter table public.departments
      add constraint departments_code_unique unique (code);
  end if;
end;
$$;
