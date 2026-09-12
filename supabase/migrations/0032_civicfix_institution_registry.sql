-- Migration 0032: CivicFix Phase 3C-Foundation - Institution Registry & Capability Intelligence
-- Implements:
-- 1. INSTITUTION system role in public.roles
-- 2. public.institution_verification_status enum
-- 3. public.institutions table with capability arrays & GIN indexes
-- 4. public.institution_projects table
-- 5. public.institution_members table
-- 6. public.profiles.institution_id foreign key
-- 7. Row Level Security policies
-- 8. Seeding of 105 premier institutions with deep capability intelligence

-- 1. Insert INSTITUTION System Role
insert into public.roles (code, name, description, is_system_role)
values
  ('INSTITUTION', 'Institution / University Coordinator', 'Represents verified universities, research institutions, and academic centers participating in civic innovation challenges.', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = now();

-- 2. Institution Verification Status Enum
do 6828
begin
  if not exists (select 1 from pg_type where typname = 'institution_verification_status') then
    create type public.institution_verification_status as enum (
      'DRAFT',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'SUSPENDED',
      'ARCHIVED'
    );
  end if;
end;
6828;

-- 3. public.institutions table
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  official_name text,
  institution_type text not null default 'University',
  acronym text,
  description text,
  official_email text,
  phone text,
  website text,
  address text,
  city text not null,
  district text,
  state text not null,
  pincode text,
  latitude double precision,
  longitude double precision,
  established_year integer,
  departments text[] not null default '{}',
  research_domains text[] not null default '{}',
  areas_of_expertise text[] not null default '{}',
  technologies text[] not null default '{}',
  laboratories text[] not null default '{}',
  facilities text[] not null default '{}',
  equipment text[] not null default '{}',
  research_areas text[] not null default '{}',
  field_capabilities text[] not null default '{}',
  collaboration_capabilities text[] not null default '{}',
  nirf_rank integer,
  naac_grade text,
  verification_status public.institution_verification_status not null default 'VERIFIED',
  is_active boolean not null default true,
  verified_at timestamptz default now(),
  verified_by uuid references public.profiles(id) on update cascade on delete set null,
  created_by uuid references public.profiles(id) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_name_not_blank check (length(btrim(name)) > 0),
  constraint institutions_city_not_blank check (length(btrim(city)) > 0),
  constraint institutions_state_not_blank check (length(btrim(state)) > 0),
  constraint institutions_name_unique unique (name)
);

-- 4. public.institution_projects table
create table if not exists public.institution_projects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  title text not null,
  description text,
  domain text,
  technologies text[] not null default '{}',
  outcomes text[] not null default '{}',
  start_year integer,
  end_year integer,
  is_completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institution_projects_title_not_blank check (length(btrim(title)) > 0)
);

-- 5. public.institution_members table
create table if not exists public.institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on update cascade on delete cascade,
  profile_id uuid not null references public.profiles(id) on update cascade on delete cascade,
  role_title text not null default 'Institution Coordinator',
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institution_members_inst_profile_unique unique (institution_id, profile_id)
);

-- 6. Link profiles to institution
alter table public.profiles
  add column if not exists institution_id uuid references public.institutions(id) on update cascade on delete set null;

-- Indexes
create index if not exists profiles_institution_id_idx on public.profiles(institution_id);
create index if not exists institutions_type_idx on public.institutions (institution_type);
create index if not exists institutions_state_idx on public.institutions (state);
create index if not exists institutions_city_idx on public.institutions (city);
create index if not exists institutions_verification_status_idx on public.institutions (verification_status);
create index if not exists institutions_is_active_idx on public.institutions (is_active);

create index if not exists institutions_research_domains_gin on public.institutions using gin (research_domains);
create index if not exists institutions_areas_of_expertise_gin on public.institutions using gin (areas_of_expertise);
create index if not exists institutions_technologies_gin on public.institutions using gin (technologies);
create index if not exists institutions_field_capabilities_gin on public.institutions using gin (field_capabilities);
create index if not exists institutions_laboratories_gin on public.institutions using gin (laboratories);
create index if not exists institutions_facilities_gin on public.institutions using gin (facilities);
create index if not exists institutions_equipment_gin on public.institutions using gin (equipment);
create index if not exists institutions_collaboration_capabilities_gin on public.institutions using gin (collaboration_capabilities);

create index if not exists institution_projects_inst_id_idx on public.institution_projects (institution_id);
create index if not exists institution_members_inst_id_idx on public.institution_members (institution_id);
create index if not exists institution_members_profile_id_idx on public.institution_members (profile_id);

-- Current user institution helper function
create or replace function public.current_user_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as 6828
  select p.institution_id
  from public.profiles p
  where p.id = public.current_profile_id()
  limit 1;
6828;

-- 7. RLS Policies
alter table public.institutions enable row level security;
alter table public.institution_projects enable row level security;
alter table public.institution_members enable row level security;

drop policy if exists institutions_select_authenticated on public.institutions;
create policy institutions_select_authenticated on public.institutions
for select to authenticated
using (
  is_active = true
  or public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = public.current_user_institution_id()
);

drop policy if exists institutions_insert_admin on public.institutions;
create policy institutions_insert_admin on public.institutions
for insert to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
);

drop policy if exists institutions_update_privileged on public.institutions;
create policy institutions_update_privileged on public.institutions
for update to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = public.current_user_institution_id()
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or id = public.current_user_institution_id()
);

drop policy if exists institutions_delete_admin on public.institutions;
create policy institutions_delete_admin on public.institutions
for delete to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code])
);

drop policy if exists institution_projects_select_authenticated on public.institution_projects;
create policy institution_projects_select_authenticated on public.institution_projects
for select to authenticated
using (true);

drop policy if exists institution_projects_insert_authorized on public.institution_projects;
create policy institution_projects_insert_authorized on public.institution_projects
for insert to authenticated
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

drop policy if exists institution_projects_update_authorized on public.institution_projects;
create policy institution_projects_update_authorized on public.institution_projects
for update to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or institution_id = public.current_user_institution_id()
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

drop policy if exists institution_projects_delete_authorized on public.institution_projects;
create policy institution_projects_delete_authorized on public.institution_projects
for delete to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code])
  or institution_id = public.current_user_institution_id()
);

drop policy if exists institution_members_select_authorized on public.institution_members;
create policy institution_members_select_authorized on public.institution_members
for select to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code, 'INNOVATION_MANAGER'::public.role_code])
  or institution_id = public.current_user_institution_id()
  or profile_id = public.current_profile_id()
);

drop policy if exists institution_members_admin_manage on public.institution_members;
create policy institution_members_admin_manage on public.institution_members
for all to authenticated
using (
  public.current_user_has_role(array['ADMIN'::public.role_code])
)
with check (
  public.current_user_has_role(array['ADMIN'::public.role_code])
);

-- 8. Seed 105 Premier Institutions
insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Bombay', 'Indian Institute of Technology Bombay', 'IIT', 'Premier national institute for technical education, advanced scientific research, environmental engineering, and municipal technology innovation.',
  'https://www.iitb.ac.in', 'Maharashtra', 'Mumbai', 'Mumbai Suburban', 1958,
  array['Civil Engineering', 'Computer Science and Engineering', 'Environmental Science and Engineering', 'Centre for Technology Alternatives for Rural Areas (CTARA)', 'Electrical Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Machine Learning', 'Remote Sensing', 'Waste Management', 'Urban Planning']::text[], array['Urban hydrology', 'Wastewater treatment', 'Flood forecasting', 'Sensor networks', 'Smart grid optimization']::text[], array['IoT', 'GIS', 'Machine Learning', 'Edge Computing', 'Satellite Remote Sensing', 'Digital Twins']::text[],
  array['Environmental Geotechnology Lab', 'Remote Sensing & GIS Lab', 'Urban Water Systems Lab', 'Robotics and AI Lab']::text[], array['Centre for Technology Alternatives for Rural Areas', 'Sophisticated Analytical Instrument Facility', 'High Performance Computing Cluster']::text[], array['High-resolution multi-spectral cameras', 'Water quality spectroscopy', 'GPU supercomputing nodes', 'Hydrological flow meters']::text[], array['Urban flood modeling', 'Rural water system pilots', 'Municipal wastewater testing', 'Community technology deployment']::text[],
  array['Municipal corporation partnerships', 'Industry sponsored R&D', 'Technology commercialization', 'Government policy advisory']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Delhi', 'Indian Institute of Technology Delhi', 'IIT', 'Leading technological institute recognized globally for research in sustainable infrastructure, air quality monitoring, artificial intelligence, and urban mobility.',
  'https://home.iitd.ac.in', 'Delhi', 'New Delhi', 'South West Delhi', 1961,
  array['Civil Engineering', 'Computer Science and Engineering', 'Centre for Atmospheric Sciences', 'Energy Science and Engineering', 'Yardi School of Artificial Intelligence']::text[], array['Air Quality Management', 'Transportation Engineering', 'Artificial Intelligence', 'Renewable Energy', 'Urban Planning']::text[], array['Air pollution dispersion modeling', 'Traffic flow optimization', 'Solar microgrid design', 'Structural health monitoring']::text[], array['Deep Learning', 'IoT', 'Computer Vision', 'GIS', 'Edge AI', 'Data Analytics']::text[],
  array['Atmospheric Aerosol Lab', 'Intelligent Transportation Systems Lab', 'Smart Grid Research Lab', 'Structural Dynamics Lab']::text[], array['Central Research Facility', 'Aerosol Research Testbed', 'HPC Padum Supercomputer']::text[], array['Aerosol chemical speciation monitors', 'Real-time traffic sensors', 'LIDAR mapping scanners', 'Seismic testing actuators']::text[], array['City-wide air sensor deployment', 'Urban traffic corridor pilots', 'Renewable energy microgrids']::text[],
  array['Delhi Government policy support', 'Smart Cities Mission partner', 'Industrial technology transfer']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Madras', 'Indian Institute of Technology Madras', 'IIT', 'Ranked #1 engineering institute in India with cutting-edge capabilities in ocean engineering, urban water management, deep tech entrepreneurship, and IoT.',
  'https://www.iitm.ac.in', 'Tamil Nadu', 'Chennai', 'Chennai', 1959,
  array['Civil Engineering', 'Computer Science and Engineering', 'Ocean Engineering', 'Department of Biotechnology', 'Data Science and AI']::text[], array['Water Resources', 'Environmental Engineering', 'Coastal Engineering', 'Artificial Intelligence', 'Transportation Engineering']::text[], array['Desalination technologies', 'Groundwater recharge modeling', 'Urban drainage modeling', 'Autonomous mobility', 'Deep learning']::text[], array['IoT', 'Edge Computing', 'Satellite Remote Sensing', 'Machine Learning', 'Autonomous Systems']::text[],
  array['National Centre for Sustainable Coastal Management', 'Environmental Engineering Lab', 'Wadhwani School of Data Science & AI']::text[], array['IIT Madras Research Park', 'Ocean Wave Basin Facility', 'High Performance Computing Facility']::text[], array['High-capacity membrane desalination testbed', 'Water level ultrasonic sensors', 'Acoustic Doppler current profilers', 'Autonomous drone fleet']::text[], array['Coastal monitoring deployments', 'Lake restoration pilot studies', 'Urban storm runoff telemetry']::text[],
  array['State water board collaboration', 'IITM Incubation Cell', 'Global university partnerships']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Kanpur', 'Indian Institute of Technology Kanpur', 'IIT', 'Pioneering research institute with renowned expertise in environmental science, river basin dynamics, unmanned aerial vehicles, and cyber-physical systems.',
  'https://www.iitk.ac.in', 'Uttar Pradesh', 'Kanpur', 'Kanpur Nagar', 1959,
  array['Civil Engineering', 'Computer Science and Engineering', 'Aerospace Engineering', 'Earth Sciences', 'Sustainable Energy Engineering']::text[], array['Hydrology', 'Environmental Engineering', 'Remote Sensing', 'Robotics', 'Air Quality Management']::text[], array['Ganga river basin hydrology', 'Unmanned aerial surveying', 'Atmospheric aerosol profiling', 'Sediment transport modeling']::text[], array['Drones', 'GIS', 'Satellite Remote Sensing', 'IoT', 'Machine Learning', 'Optimization']::text[],
  array['National Wind Tunnel Facility', 'Flight Laboratory', 'Geoinformatics Lab', 'Environmental Engineering Lab']::text[], array['Flight Airstrip Facility', 'River Basin Modeling Centre', 'Param Sanganak Supercomputing Facility']::text[], array['Surveillance and mapping UAVs', 'LIDAR remote sensors', 'Gas chromatography-mass spectrometers', 'Hydraulic flume channels']::text[], array['Ganga basin field surveying', 'Aerial crop and drainage monitoring', 'Rural environmental sampling']::text[],
  array['National Mission for Clean Ganga (NMCG)', 'State pollution control boards', 'Defence and aerospace partnerships']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Kharagpur', 'Indian Institute of Technology Kharagpur', 'IIT', 'First established IIT, holding the largest campus and distinct leadership in agricultural engineering, food engineering, rural development, and disaster management.',
  'https://www.iitkgp.ac.in', 'West Bengal', 'Kharagpur', 'Paschim Medinipur', 1951,
  array['Agricultural and Food Engineering', 'Civil Engineering', 'Computer Science and Engineering', 'Centre for Oceans, Rivers, Atmosphere and Land Sciences', 'Mining Engineering']::text[], array['Agricultural Engineering', 'Precision Agriculture', 'Water Resources', 'Climate Science', 'Disaster Management']::text[], array['Irrigation and drainage engineering', 'Soil-water conservation', 'Precision farming tools', 'Cyclone surge prediction', 'Post-harvest processing']::text[], array['IoT', 'Remote Sensing', 'GIS', 'Machine Learning', 'Drones', 'Sensor Networks']::text[],
  array['Precision Agriculture Technology Lab', 'Hydraulic and Water Resources Lab', 'Soil Dynamics Lab', 'Remote Sensing & GIS Lab']::text[], array['Experimental Farm Facility (100+ Acres)', 'Centre of Excellence in Agricultural Food Innovation', 'Param Shakti Supercomputer']::text[], array['Multi-spectral drone imaging platforms', 'Soil moisture sensor arrays', 'Automated weather stations', 'Grain processing pilot plant']::text[], array['Rural farm trials', 'Watershed management field implementation', 'Coastal flood mapping']::text[],
  array['Ministry of Agriculture partnerships', 'State rural development agencies', 'Agri-tech industry incubations']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Roorkee', 'Indian Institute of Technology Roorkee', 'IIT', 'Asia''s oldest technical institution with historical and unmatched leadership in civil engineering, water resources management, earthquake engineering, and hydrology.',
  'https://www.iitr.ac.in', 'Uttarakhand', 'Roorkee', 'Haridwar', 1847,
  array['Civil Engineering', 'Department of Hydrology', 'Water Resources Development and Management', 'Earthquake Engineering', 'Computer Science and Engineering']::text[], array['Hydrology', 'Water Resources', 'Disaster Management', 'Environmental Engineering', 'Civil Engineering']::text[], array['River engineering', 'Flood inundation modeling', 'Dam break analysis', 'Groundwater assessment', 'Seismic hazard assessment']::text[], array['GIS', 'Remote Sensing', 'Hydrological Modeling', 'Simulation', 'IoT', 'Data Analytics']::text[],
  array['Hydrology Measurement Lab', 'Geotechnical Engineering Lab', 'Soil and Water Quality Lab', 'Shake Table Earthquake Lab']::text[], array['National Institute of Hydrology Joint Research Cell', 'Hydraulic Engineering Flume Facility', 'Param Ganga Supercomputing Facility']::text[], array['Large-scale shake table simulator', 'Acoustic Doppler velocimeters', 'High-precision GPS surveying stations', 'Water permeameters']::text[], array['Himalayan watershed field research', 'Canal automation pilots', 'Dam safety instrumentation']::text[],
  array['Central Water Commission (CWC)', 'State irrigation departments', 'Disaster management authorities']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Guwahati', 'Indian Institute of Technology Guwahati', 'IIT', 'Leading Northeast technological hub specializing in Brahmaputra river basin hydrology, erosion prevention, bio-engineering, and disaster mitigation.',
  'https://www.iitg.ac.in', 'Assam', 'Guwahati', 'Kamrup Metropolitan', 1994,
  array['Civil Engineering', 'Computer Science and Engineering', 'Biosciences and Bioengineering', 'Chemical Engineering', 'Centre for the Environment']::text[], array['Water Resources', 'Environmental Engineering', 'Disaster Management', 'Waste Management', 'Artificial Intelligence']::text[], array['Riverbank erosion control', 'Brahmaputra flood forecasting', 'Bio-remediation of waste', 'Arsenic water filtration']::text[], array['GIS', 'Satellite Remote Sensing', 'Machine Learning', 'IoT', 'Biotechnology']::text[],
  array['River Engineering & Fluvial Hydraulics Lab', 'Environmental Pollution Monitoring Lab', 'Bio-process Technology Lab']::text[], array['Centre for Nanotechnology', 'Brahmaputra Basin Studies Centre', 'Param Kamrupa Supercomputer']::text[], array['Echo sounders for river bathymetry', 'Water filtration membrane synthesis units', 'Atomic absorption spectrophotometers']::text[], array['Riverbank erosion field deployments', 'Rural water arsenic remediation pilots', 'Flood forecasting telemetry']::text[],
  array['Brahmaputra Board partnership', 'North Eastern Council advisory', 'State water resources departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Hyderabad', 'Indian Institute of Technology Hyderabad', 'IIT', 'Fastest growing technological institute renowned for wireless communication, smart mobility, additive manufacturing, and digital agriculture.',
  'https://www.iith.ac.in', 'Telangana', 'Sangareddy', 'Sangareddy', 2008,
  array['Civil Engineering', 'Computer Science and Engineering', 'Artificial Intelligence', 'Electrical Engineering', 'Climate Change']::text[], array['Artificial Intelligence', 'IoT', 'Transportation Engineering', 'Water Resources', 'Climate Science']::text[], array['Connected vehicles', 'Edge AI for civic surveillance', 'Urban rainfall estimation', 'Smart agriculture sensors']::text[], array['IoT', 'Edge Computing', '5G / 6G', 'Machine Learning', 'Computer Vision', 'Digital Twins']::text[],
  array['TiHAN Autonomous Navigation Testbed', 'Smart Mobility Lab', 'AI and Deep Learning Lab', 'Hydrology Research Lab']::text[], array['TiHAN Autonomous Driving Track', 'Centre for Healthcare Entrepreneurship', 'High Performance Computing Centre']::text[], array['Autonomous electric test vehicles', 'mmWave radar units', 'Low-power edge computing clusters', 'Wireless sensor network testbed']::text[], array['Smart campus pilot deployments', 'Intelligent intersection traffic trials', 'Agricultural IoT field testing']::text[],
  array['Ministry of Electronics and IT (MeitY)', 'Telangana State Innovation Cell', 'Automotive industry consortia']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT (BHU) Varanasi', 'Indian Institute of Technology (BHU) Varanasi', 'IIT', 'Historic technical institution with deep domain expertise in river rejuvenation, metallurgical engineering, ceramic technology, and mining safety.',
  'https://www.iitbhu.ac.in', 'Uttar Pradesh', 'Varanasi', 'Varanasi', 1919,
  array['Civil Engineering', 'Computer Science and Engineering', 'Mining Engineering', 'Ceramic Engineering', 'Biochemical Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Waste Management', 'Materials Science', 'Artificial Intelligence']::text[], array['River Ganga water purification', 'Industrial wastewater recycling', 'Solid waste bio-conversion', 'Heritage structure preservation']::text[], array['GIS', 'IoT', 'Machine Learning', 'Biotechnology', 'Sensor Networks']::text[],
  array['Ganga Rejuvenation Research Lab', 'Environmental Engineering Testing Lab', 'Geotechnical Instrumentation Lab']::text[], array['Central Instrument Facility', 'Advanced Materials Processing Facility', 'Supercomputing Centre']::text[], array['Total organic carbon analyzers', 'Multi-parameter water quality probes', 'X-ray diffractometers']::text[], array['Varanasi ghat water quality monitoring', 'Municipal sewage treatment evaluation', 'Rural sanitation pilot trials']::text[],
  array['Varanasi Smart City Limited', 'National Clean Ganga Mission', 'State municipal corporations']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT (ISM) Dhanbad', 'Indian Institute of Technology (Indian School of Mines) Dhanbad', 'IIT', 'Premier institution located in Jharkhand holding century-old national leadership in mining, geo-technical engineering, mineral resources, and regional groundwater studies.',
  'https://www.iitism.ac.in', 'Jharkhand', 'Dhanbad', 'Dhanbad', 1926,
  array['Civil Engineering', 'Mining Engineering', 'Environmental Science and Engineering', 'Computer Science and Engineering', 'Applied Geology']::text[], array['Water Resources', 'Environmental Engineering', 'Geotechnical Engineering', 'Remote Sensing', 'Waste Management']::text[], array['Mine water drainage management', 'Acid mine drainage remediation', 'Groundwater table depletion modeling', 'Jharkhand aquifer mapping']::text[], array['GIS', 'Remote Sensing', 'IoT', 'Machine Learning', 'Simulation']::text[],
  array['Hydro-geology and Water Testing Lab', 'Environmental Geochemistry Lab', 'Rock Mechanics & Ground Control Lab']::text[], array['Centenary Central Instrument Facility', 'Mine Safety Observation Centre', 'HPC Cluster']::text[], array['Inductively coupled plasma mass spectrometers', 'Deep bore groundwater level acoustic sensors', 'Resistivity imaging meters']::text[], array['Jharkhand mining belt groundwater monitoring', 'Regional soil degradation assessment', 'Rural community water testing']::text[],
  array['Coal India Limited', 'Jharkhand State Pollution Control Board', 'Central Ground Water Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Indore', 'Indian Institute of Technology Indore', 'IIT', 'High-impact research IIT in central India with strong capabilities in space sciences, precision sensors, rural hydrology, and biomedical instrumentation.',
  'https://www.iiti.ac.in', 'Madhya Pradesh', 'Indore', 'Indore', 2009,
  array['Civil Engineering', 'Computer Science and Engineering', 'Astronomy, Astrophysics and Space Engineering', 'Electrical Engineering']::text[], array['Remote Sensing', 'Water Resources', 'Machine Learning', 'IoT', 'Space Science']::text[], array['Radar remote sensing of soil moisture', 'Watershed runoff modeling', 'Sensor integration for agriculture', 'Smart street lighting']::text[], array['Satellite Remote Sensing', 'IoT', 'Machine Learning', 'Edge Computing', 'GIS']::text[],
  array['Space Instrumentation Lab', 'Surface Hydrology and Climate Lab', 'Smart City Testbed']::text[], array['Sophisticated Instrument Centre', 'High Performance Computing Facility']::text[], array['Synthetic aperture radar processing systems', 'Soil moisture dielectric probes', 'Flux towers for microclimate tracking']::text[], array['Malwa plateau agricultural trials', 'Catchment water balance verification', 'Urban municipal telemetry']::text[],
  array['Indore Smart City Development Ltd', 'ISRO Earth Observation Applications', 'State agriculture universities']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Ropar', 'Indian Institute of Technology Ropar', 'IIT', 'National leader in agricultural cyber-physical systems (AWaDH hub), specializing in IoT for water, precision agriculture, and environmental sensing.',
  'https://www.iitrpr.ac.in', 'Punjab', 'Rupnagar', 'Rupnagar', 2008,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering', 'Centre for AWaDH (Agriculture & Water)']::text[], array['Precision Agriculture', 'Water Resources', 'IoT', 'Artificial Intelligence', 'Environmental Engineering']::text[], array['Stubble burning detection and alternatives', 'Smart irrigation controllers', 'Canal water distribution optimization', 'Agri-sensors']::text[], array['IoT', 'Sensor Networks', 'Edge Computing', 'Machine Learning', 'Remote Sensing']::text[],
  array['AWaDH Agri-Tech Innovation Lab', 'Water Quality and Hydrology Lab', 'Embedded Systems and Sensor Lab']::text[], array['DST Technology Innovation Hub in Agriculture and Water (AWaDH)', 'Experimental Research Farm']::text[], array['Autonomous IoT irrigation control valves', 'Spectroscopic soil nutrient analyzers', 'Drone-mounted thermal sensors']::text[], array['Punjab agricultural field deployment', 'Canal water discharge monitoring', 'Farmer field schools']::text[],
  array['Department of Science and Technology (DST)', 'Punjab Agricultural University', 'Irrigation and Power Research Institute']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Mandi', 'Indian Institute of Technology Mandi', 'IIT', 'Specialized Himalayan research hub focusing on landslide early warning systems, mountain hydrology, climate vulnerability, and disaster management.',
  'https://www.iitmandi.ac.in', 'Himachal Pradesh', 'Mandi', 'Mandi', 2009,
  array['School of Civil and Environmental Engineering', 'School of Computing and Electrical Engineering', 'School of Mechanical and Materials Engineering']::text[], array['Disaster Management', 'Hydrology', 'Environmental Engineering', 'IoT', 'Remote Sensing']::text[], array['Landslide early warning systems', 'Flash flood forecasting', 'Mountain road slope stability', 'Snow and glacier hydrology']::text[], array['IoT', 'Sensor Networks', 'GIS', 'Machine Learning', 'Edge Computing']::text[],
  array['Disaster Warning Systems Lab', 'Environmental Monitoring Lab', 'High Altitude Weather & Geo-Tech Lab']::text[], array['Centre for Artificial Intelligence and Robotics', 'Advanced Materials Research Centre']::text[], array['Micro-electro-mechanical landslide tilt sensors', 'Rainfall threshold telemetry stations', 'Slope inclinometers']::text[], array['Himalayan road corridor deployments', 'Village-level disaster sensor networks', 'Mountain watershed monitoring']::text[],
  array['Himachal Pradesh State Disaster Management Authority', 'National Highways Authority of India', 'Indian Army']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Gandhinagar', 'Indian Institute of Technology Gandhinagar', 'IIT', 'Institution recognized for innovative interdisciplinary research in water-climate modeling, seismic resilience, archaeological science, and safety engineering.',
  'https://www.iitgn.ac.in', 'Gujarat', 'Gandhinagar', 'Gandhinagar', 2008,
  array['Civil Engineering', 'Computer Science and Engineering', 'Earth Sciences', 'Chemical Engineering']::text[], array['Climate Science', 'Water Resources', 'Disaster Management', 'Artificial Intelligence', 'Materials Science']::text[], array['Drought forecasting', 'Heatwave vulnerability modeling', 'Urban drainage optimization', 'Earthquake resistant structures']::text[], array['GIS', 'Machine Learning', 'Hydrological Modeling', 'Simulation', 'Data Analytics']::text[],
  array['Water and Climate Research Lab', 'Structural Dynamics and Earthquake Lab', 'Cognitive Science Lab']::text[], array['Centre for Safety Engineering', 'Supercomputing Facility', 'Geotechnical Testing Centre']::text[], array['High-capacity soil dynamics triaxial apparatus', 'Climate data assimilation servers', 'Automated rain gauge network']::text[], array['Drought assessment field surveys', 'Urban temperature monitoring networks', 'Gujarat canal network simulations']::text[],
  array['Gujarat State Disaster Management Authority', 'Central Water Commission', 'Ministry of Earth Sciences']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Jodhpur', 'Indian Institute of Technology Jodhpur', 'IIT', 'Premier hub for arid zone technologies, desert hydrology, solar energy, AI of Things (AIoT), and digital heritage preservation.',
  'https://www.iitj.ac.in', 'Rajasthan', 'Jodhpur', 'Jodhpur', 2008,
  array['Civil and Infrastructure Engineering', 'Computer Science and Engineering', 'Electrical Engineering', 'Biosciences and Bioengineering']::text[], array['Water Resources', 'Renewable Energy', 'IoT', 'Artificial Intelligence', 'Environmental Engineering']::text[], array['Water harvesting in arid regions', 'Solar PV dust mitigation', 'Brackish water desalination', 'Smart water grid management']::text[], array['IoT', 'Edge AI', 'Computer Vision', 'GIS', 'Solar Energy Systems']::text[],
  array['Desalination and Water Treatment Lab', 'Smart Energy Systems Lab', 'Computer Vision & Intelligence Lab']::text[], array['Centre of Excellence in Ayurtech', 'Solar Park Testbed', 'HPC Cluster']::text[], array['Membrane distillation testing rigs', 'Solar irradiance meters', 'Smart water flow meters and ultrasonic loggers']::text[], array['Thar desert field deployments', 'Rural solar water pumping pilots', 'Urban smart water metering trials']::text[],
  array['Rajasthan Public Health Engineering Department (PHED)', 'Ministry of Jal Shakti', 'Renewable energy firms']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Patna', 'Indian Institute of Technology Patna', 'IIT', 'Key research center in eastern India focusing on natural language processing, arsenic mitigation, biomedical sensors, and rural infrastructure.',
  'https://www.iitp.ac.in', 'Bihar', 'Patna', 'Patna', 2008,
  array['Civil and Environmental Engineering', 'Computer Science and Engineering', 'Electrical Engineering', 'Chemical and Biochemical Engineering']::text[], array['Environmental Engineering', 'Artificial Intelligence', 'Water Resources', 'Healthcare', 'Materials Science']::text[], array['Arsenic and fluoride water filter materials', 'Ganga river basin sediment analysis', 'AI for healthcare diagnosis']::text[], array['Machine Learning', 'IoT', 'GIS', 'Biotechnology', 'Data Analytics']::text[],
  array['Environmental Engineering Analytical Lab', 'AI and NLP Research Lab', 'Materials Characterization Lab']::text[], array['Incubation Centre in Healthcare & Electronics', 'Supercomputer Facility']::text[], array['Field emission scanning electron microscope', 'Atomic absorption spectrometer', 'Water purification pilot units']::text[], array['Bihar rural water testing campaigns', 'Arsenic filter village installations', 'Flood inundation survey']::text[],
  array['Bihar State Pollution Control Board', 'Public Health Engineering Department Bihar', 'WHO research projects']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Bhubaneswar', 'Indian Institute of Technology Bhubaneswar', 'IIT', 'Coastal and eastern research institution with advanced capabilities in cyclone impact modeling, mineral waste utilization, and renewable energy integration.',
  'https://www.iitbbs.ac.in', 'Odisha', 'Bhubaneswar', 'Khurda', 2008,
  array['School of Infrastructure (Civil Engineering)', 'School of Electrical Sciences', 'School of Earth, Ocean and Climate Sciences']::text[], array['Climate Science', 'Water Resources', 'Environmental Engineering', 'Renewable Energy', 'Disaster Management']::text[], array['Cyclone track and storm surge modeling', 'Industrial fly-ash utilization in concrete', 'Coastal groundwater salinity tracking']::text[], array['GIS', 'Satellite Remote Sensing', 'Machine Learning', 'IoT', 'Numerical Weather Prediction']::text[],
  array['Ocean and Climate Modeling Lab', 'Environmental Geotechnics Lab', 'Smart Grid Research Lab']::text[], array['Centre for Climate Innovation', 'Central Instrumentation Facility']::text[], array['Oceanographic wave recorders', 'Automated soil testing stations', 'Atmospheric profiling radiometers']::text[], array['Odisha coastal warning deployments', 'Coastal aquifer water sampling', 'Industrial waste reuse pilot sites']::text[],
  array['Odisha State Disaster Management Authority (OSDMA)', 'Odisha Mining Corporation', 'IMD']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Tirupati', 'Indian Institute of Technology Tirupati', 'IIT', 'Emerging technical institute with cutting-edge expertise in environmental hydrology, smart transportation, water reuse, and structural engineering.',
  'https://www.iittp.ac.in', 'Andhra Pradesh', 'Tirupati', 'Tirupati', 2015,
  array['Civil and Environmental Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Transportation Engineering', 'Artificial Intelligence', 'IoT']::text[], array['Urban water reuse and wastewater treatment', 'Traffic crash prediction modeling', 'Catchment hydrologic modeling']::text[], array['IoT', 'GIS', 'Machine Learning', 'Remote Sensing']::text[],
  array['Environmental Engineering Lab', 'Intelligent Transportation Systems Lab', 'Water Resources Lab']::text[], array['Central Instrumentation Facility', 'High Performance Computing Cluster']::text[], array['High performance liquid chromatograph', 'Multi-frequency traffic radars', 'Water filtration pilots']::text[], array['Rayalaseema drought and irrigation surveys', 'Municipal wastewater reuse monitoring']::text[],
  array['Tirupati Municipal Corporation', 'Andhra Pradesh Irrigation Department']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Palakkad', 'Indian Institute of Technology Palakkad', 'IIT', 'Technological institute specializing in smart farming, clean energy systems, geotechnical stability, and water treatment.',
  'https://www.iitpkd.ac.in', 'Kerala', 'Palakkad', 'Palakkad', 2015,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Precision Agriculture', 'Water Resources', 'Renewable Energy', 'Machine Learning', 'IoT']::text[], array['Precision agro-hydrology', 'Rainfall-induced landslide prediction', 'Bio-char for soil water retention']::text[], array['IoT', 'Machine Learning', 'GIS', 'Sensors']::text[],
  array['Smart Agriculture Lab', 'Soil and Water Engineering Lab']::text[], array['Technology Innovation Hub in Cyber-Physical Systems']::text[], array['Soil lysimeters', 'Hydrological data loggers', 'Weather sensing stations']::text[], array['Western Ghats slope monitoring', 'Kerala paddy field irrigation pilots']::text[],
  array['Kerala State Disaster Management Authority', 'Local self-government institutions']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Dharwad', 'Indian Institute of Technology Dharwad', 'IIT', 'Research institution focused on regional civic problems, dryland agriculture, sustainable infrastructure, and edge artificial intelligence.',
  'https://www.iitdh.ac.in', 'Karnataka', 'Dharwad', 'Dharwad', 2016,
  array['Civil and Infrastructure Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Agricultural Engineering', 'Water Resources', 'Artificial Intelligence', 'IoT']::text[], array['Dryland agricultural water management', 'Sensor networks for crop monitoring', 'Micro-irrigation automation']::text[], array['IoT', 'Edge AI', 'GIS', 'Machine Learning']::text[],
  array['Agri-Tech Sensing Lab', 'Water Quality Lab']::text[], array['Central Instrumentation Facility']::text[], array['Soil moisture sensor arrays', 'Low-power radio telemetry nodes']::text[], array['North Karnataka dryland farm pilots', 'Watershed runoff measurements']::text[],
  array['University of Agricultural Sciences Dharwad', 'Karnataka State Rural Development']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Bhilai', 'Indian Institute of Technology Bhilai', 'IIT', 'Institute with specialized research in tribal region development, industrial waste recycling, forest hydrology, and smart robotics.',
  'https://www.iitbhilai.ac.in', 'Chhattisgarh', 'Durg', 'Durg', 2016,
  array['Civil and Infrastructure Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Waste Management', 'Water Resources', 'Robotics', 'Environmental Engineering']::text[], array['Slag and industrial tailings recycling', 'Watershed planning for tribal habitats', 'Autonomous civic robotics']::text[], array['IoT', 'Robotics', 'GIS', 'Machine Learning']::text[],
  array['Smart Infrastructure Lab', 'Robotics and Automation Lab']::text[], array['Central Research Facility']::text[], array['Heavy metals water analyzers', 'Autonomous mobile inspection robots']::text[], array['Chhattisgarh rural watershed surveys', 'Industrial effluent testing']::text[],
  array['Bhilai Steel Plant', 'Chhattisgarh Environment Conservation Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Jammu', 'Indian Institute of Technology Jammu', 'IIT', 'Strategically located institution addressing cold climate infrastructure, avalanche warning, water security in hilly terrains, and cyber security.',
  'https://www.iitjammu.ac.in', 'Jammu and Kashmir', 'Jammu', 'Jammu', 2016,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Disaster Management', 'Water Resources', 'Climate Science', 'IoT']::text[], array['Cold arid hydrology', 'Avalanche detection algorithms', 'Hill slope stabilization', 'Rural spring shed management']::text[], array['IoT', 'Remote Sensing', 'GIS', 'Machine Learning']::text[],
  array['Himalayan Cryosphere and Geo-Tech Lab', 'Water Quality Lab']::text[], array['Central Instrumentation Facility']::text[], array['Snow water equivalent sensors', 'Thermal surveillance cameras', 'Seismic ground sensors']::text[], array['J&K mountain watershed pilots', 'Spring-water revival documentation']::text[],
  array['J&K Disaster Management Authority', 'Snow and Avalanche Study Establishment (SASE)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIT Goa', 'Indian Institute of Technology Goa', 'IIT', 'Institute specializing in marine and environmental engineering, ocean robotics, estuarine water quality, and data science.',
  'https://www.iitgoa.ac.in', 'Goa', 'Ponda', 'North Goa', 2016,
  array['School of Physical Sciences', 'School of Electrical Sciences', 'School of Mechanical Sciences']::text[], array['Environmental Engineering', 'Robotics', 'Water Resources', 'Data Analytics']::text[], array['Estuarine salinity intrusion modeling', 'Underwater robotics for pipeline inspection', 'Coastal pollution monitoring']::text[], array['Robotics', 'IoT', 'Machine Learning', 'GIS']::text[],
  array['Ocean Robotics Lab', 'Environmental Monitoring Lab']::text[], array['High Performance Computing Cluster']::text[], array['Underwater remotely operated vehicles (ROVs)', 'Salinity-temperature depth profilers']::text[], array['Goa river basin water monitoring', 'Coastal marine environment sampling']::text[],
  array['National Institute of Oceanography (NIO)', 'Goa State Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISc Bangalore', 'Indian Institute of Science Bangalore', 'Research Institute', 'India''s highest-ranked scientific research institution with pioneering centres in sustainable technologies, water research, ecological sciences, and climate change.',
  'https://www.iisc.ac.in', 'Karnataka', 'Bengaluru', 'Bengaluru Urban', 1909,
  array['Centre for Sustainable Technologies', 'Interdisciplinary Centre for Water Research (ICWaR)', 'Civil Engineering', 'Computer Science and Automation', 'Centre for Ecological Sciences']::text[], array['Water Resources', 'Climate Science', 'Environmental Engineering', 'Artificial Intelligence', 'Renewable Energy']::text[], array['Catchment hydrology', 'Urban heat island dynamics', 'Bio-energy technologies', 'Groundwater recharge forecasting', 'Decentralized water treatment']::text[], array['Machine Learning', 'Satellite Remote Sensing', 'GIS', 'IoT', 'Digital Twins', 'Optimization']::text[],
  array['Interdisciplinary Centre for Water Research Lab', 'Environmental Engineering Testing Lab', 'Ecological Climate Monitoring Facility']::text[], array['Supercomputer Education and Research Centre (SERC)', 'Centre for Nano Science and Engineering (CeNSE)', 'Centre for Brain Research']::text[], array['Param Pravega Petascale Supercomputer', 'Air quality laser spectrometers', 'Automated groundwater pressure transducers', 'Gas chromatography systems']::text[], array['Karnataka rural water supply trials', 'Cauvery basin hydrologic modeling', 'Bangalore urban lake bio-remediation']::text[],
  array['Karnataka State Natural Disaster Monitoring Centre (KSNDMC)', 'Government of India scientific advisory', 'Global research consortia']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'TIFR Mumbai', 'Tata Institute of Fundamental Research', 'Research Institute', 'National centre for advanced fundamental scientific research, nuclear sciences, materials research, and high-performance computing.',
  'https://www.tifr.res.in', 'Maharashtra', 'Mumbai', 'Mumbai', 1945,
  array['School of Technology and Computer Science', 'Department of Chemical Sciences', 'Department of Biological Sciences']::text[], array['Artificial Intelligence', 'Materials Science', 'Computer Science', 'Environmental Science']::text[], array['Quantum computing algorithms', 'Advanced sensor materials', 'Cellular bio-remediation', 'Data science for public systems']::text[], array['Machine Learning', 'Optimization', 'High Performance Computing', 'Nanotechnology']::text[],
  array['Advanced Sensor Technology Lab', 'High Performance Computing Facility']::text[], array['Central Instrumentation Facility', 'National Balloon Facility']::text[], array['Cryogenic testing apparatus', 'High performance GPU servers', 'Clean room nanofabrication']::text[], array['Scientific field trials', 'Sensor material validation']::text[],
  array['Department of Atomic Energy', 'International scientific institutes']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Pune', 'Indian Institute of Science Education and Research Pune', 'Research Institute', 'Autonomous premier research institute renowned for basic science discoveries, environmental chemistry, bio-mechanisms, and computational modeling.',
  'https://www.iiserpune.ac.in', 'Maharashtra', 'Pune', 'Pune', 2006,
  array['Department of Earth and Climate Science', 'Department of Chemistry', 'Department of Biology', 'Department of Data Science']::text[], array['Climate Science', 'Environmental Engineering', 'Materials Science', 'Artificial Intelligence']::text[], array['Carbon capture materials', 'Paleoclimate and monsoon variability', 'Water contaminant degradation enzymes']::text[], array['Simulation', 'Machine Learning', 'GIS', 'Biotechnology']::text[],
  array['Earth and Climate Dynamics Lab', 'Biomolecular Engineering Lab']::text[], array['Supercomputing Cluster', 'National Facility for Gene Function']::text[], array['Mass spectrometers', 'High resolution weather modeling stations']::text[], array['Monsoon field observation', 'Western Ghats microclimate tracking']::text[],
  array['Ministry of Earth Sciences', 'Indian Institute of Tropical Meteorology (IITM)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Kolkata', 'Indian Institute of Science Education and Research Kolkata', 'Research Institute', 'Leading science institute in eastern India holding high impact research in space weather, river delta geomorphology, and environmental biosciences.',
  'https://www.iiserkol.ac.in', 'West Bengal', 'Kalyani', 'Nadia', 2006,
  array['Department of Earth Sciences', 'Department of Biological Sciences', 'Department of Chemical Sciences']::text[], array['Water Resources', 'Environmental Engineering', 'Climate Science', 'Disaster Management']::text[], array['Sundarbans delta hydrology', 'Arsenic mobilization mechanisms in Bengal basin', 'Estuarine sedimentation']::text[], array['GIS', 'Remote Sensing', 'Geochemical Modeling', 'Biotechnology']::text[],
  array['Delta Geomorphology Lab', 'Environmental Biogeochemistry Lab']::text[], array['Centre of Excellence in Space Sciences India (CESSI)']::text[], array['Isotope ratio mass spectrometers', 'Sediment core drilling equipment']::text[], array['Sundarbans mangrove field surveys', 'Bengal aquifer water sampling']::text[],
  array['West Bengal pollution control board', 'Geological Survey of India']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Mohali', 'Indian Institute of Science Education and Research Mohali', 'Research Institute', 'Premier research institution specialized in atmospheric chemistry, agricultural emission tracking, and sustainable materials.',
  'https://www.iisermohali.ac.in', 'Punjab', 'Mohali', 'SAS Nagar', 2007,
  array['Department of Earth and Environmental Sciences', 'Department of Chemical Sciences']::text[], array['Air Quality Management', 'Climate Science', 'Environmental Engineering']::text[], array['Stubble burning atmospheric emissions', 'Volatile organic compound monitoring', 'Pesticide degradation']::text[], array['Gas Chromatography', 'Remote Sensing', 'Data Analytics']::text[],
  array['Atmospheric Chemistry & Air Quality Lab', 'Environmental Nanotechnology Lab']::text[], array['High Performance Computing Cluster', 'Central Analytical Facility']::text[], array['Proton-transfer-reaction mass spectrometer', 'Air quality trace gas analyzers']::text[], array['Indo-Gangetic plain air quality field sampling', 'Agricultural smoke monitoring']::text[],
  array['Central Pollution Control Board', 'State environmental departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Bhopal', 'Indian Institute of Science Education and Research Bhopal', 'Research Institute', 'Institute with notable advancements in environmental microbiology, water remediation, and planetary surface processes.',
  'https://www.iiserb.ac.in', 'Madhya Pradesh', 'Bhopal', 'Bhopal', 2008,
  array['Department of Earth and Environmental Sciences', 'Department of Biological Sciences']::text[], array['Environmental Engineering', 'Water Resources', 'Climate Science']::text[], array['Microbial wastewater treatment', 'Central Indian river basin hydrology', 'Soil organic carbon dynamics']::text[], array['Biotechnology', 'GIS', 'Machine Learning']::text[],
  array['Environmental Genomics Lab', 'Hydrology and Geomorphology Lab']::text[], array['Central Instrumentation Facility']::text[], array['Next generation DNA sequencers', 'Surface runoff flumes']::text[], array['Narmada basin field studies', 'Rural pond bio-restoration pilots']::text[],
  array['Madhya Pradesh Pollution Control Board', 'State forest department']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Thiruvananthapuram', 'Indian Institute of Science Education and Research Thiruvananthapuram', 'Research Institute', 'Science research institute in Kerala specializing in renewable energy materials, ecological modeling, and tropical bio-resources.',
  'https://www.iisertvm.ac.in', 'Kerala', 'Thiruvananthapuram', 'Thiruvananthapuram', 2008,
  array['School of Biology', 'School of Chemistry', 'School of Physics']::text[], array['Renewable Energy', 'Environmental Engineering', 'Materials Science']::text[], array['Solar fuel generation', 'Tropical biodiversity conservation', 'Polymer membranes for water purification']::text[], array['Nanotechnology', 'Renewable Energy Systems']::text[],
  array['Renewable Energy Research Lab', 'Environmental Chemistry Lab']::text[], array['Central Instrumentation Facility']::text[], array['Spectroscopic imaging units', 'Solar simulators']::text[], array['Tropical watershed monitoring', 'Field botanical sampling']::text[],
  array['Kerala State Council for Science, Technology and Environment']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Tirupati', 'Indian Institute of Science Education and Research Tirupati', 'Research Institute', 'Research institute focused on ecology, sustainable chemistry, and dry-scrub forest hydrology.',
  'https://www.iisertirupati.ac.in', 'Andhra Pradesh', 'Tirupati', 'Tirupati', 2015,
  array['Department of Biology', 'Department of Earth and Climate Science']::text[], array['Climate Science', 'Water Resources', 'Environmental Engineering']::text[], array['Semi-arid ecosystem adaptation', 'Drought resilience in native plants']::text[], array['GIS', 'Machine Learning', 'Remote Sensing']::text[],
  array['Ecology & Conservation Biology Lab']::text[], array['Central Instrumentation Facility']::text[], array['Greenhouse climate controlled growth chambers', 'Environmental monitors']::text[], array['Rayalaseema environmental sampling', 'Forest hydrology field tracking']::text[],
  array['Andhra Pradesh Biodiversity Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IISER Berhampur', 'Indian Institute of Science Education and Research Berhampur', 'Research Institute', 'Coastal research institution in Odisha exploring marine environmental health, extreme weather resilience, and functional materials.',
  'https://www.iiserbpr.ac.in', 'Odisha', 'Berhampur', 'Ganjam', 2016,
  array['Department of Biological Sciences', 'Department of Earth and Environmental Sciences']::text[], array['Environmental Engineering', 'Climate Science', 'Disaster Management']::text[], array['Chilika lake estuarine ecosystem studies', 'Cyclone vulnerability modeling']::text[], array['GIS', 'Remote Sensing']::text[],
  array['Coastal and Marine Ecology Lab']::text[], array['Central Research Facility']::text[], array['Water quality multi-parameter analyzers', 'Spectrophotometers']::text[], array['Coastal lagoon field sampling', 'Cyclone aftermath damage assessment']::text[],
  array['Chilika Development Authority', 'Odisha State Disaster Management Authority']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'JNCASR Bangalore', 'Jawaharlal Nehru Centre for Advanced Scientific Research', 'Research Institute', 'Multidisciplinary research institution with global fame in advanced materials, hydrogen storage, clean water filters, and fluid dynamics.',
  'https://www.jncasr.ac.in', 'Karnataka', 'Bengaluru', 'Bengaluru Urban', 1989,
  array['Engineering Mechanics Unit', 'Chemistry and Physics of Materials Unit', 'Evolutionary and Organismal Biology Unit']::text[], array['Materials Science', 'Water Resources', 'Renewable Energy', 'Environmental Engineering']::text[], array['Nano-materials for water defluoridation', 'Carbon dioxide capture and conversion', 'Urban atmospheric boundary layer flows']::text[], array['Nanotechnology', 'Simulation', 'Materials Science']::text[],
  array['Advanced Materials Research Lab', 'Fluid Dynamics and Aerodynamics Lab']::text[], array['International Centre for Materials Science']::text[], array['High resolution transmission electron microscopes', 'Thermal desorption spectrometers']::text[], array['Rural defluoridation field pilots', 'Urban wind pattern monitoring']::text[],
  array['Department of Science and Technology', 'Global industrial research labs']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Tiruchirappalli', 'National Institute of Technology Tiruchirappalli', 'NIT', 'Ranked #1 among NITs in India, holding distinguished research in energy systems, municipal transportation engineering, and industrial wastewater treatment.',
  'https://www.nitt.edu', 'Tamil Nadu', 'Tiruchirappalli', 'Tiruchirappalli', 1964,
  array['Civil Engineering', 'Computer Science and Engineering', 'Chemical Engineering', 'Electrical and Electronics Engineering']::text[], array['Transportation Engineering', 'Water Resources', 'Renewable Energy', 'Environmental Engineering']::text[], array['Pavement material recycling', 'Urban traffic simulation', 'Biomass gasification', 'Wastewater membrane filtration']::text[], array['GIS', 'IoT', 'Machine Learning', 'Simulation']::text[],
  array['Transportation Engineering Lab', 'Environmental Engineering Lab']::text[], array['Siemens Centre of Excellence in Manufacturing', 'Central Instrumentation Facility']::text[], array['Dynamic shear rheometers', 'Gas chromatographs', 'Traffic counting radar sensors']::text[], array['Urban road corridor condition surveys', 'Industrial effluent characterization']::text[],
  array['National Highways Authority of India', 'Tamil Nadu Water Supply and Drainage Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Karnataka', 'National Institute of Technology Karnataka, Surathkal', 'NIT', 'Coastal technological institution with deep specialization in port and ocean engineering, coastal groundwater dynamics, and smart grid automation.',
  'https://www.nitk.ac.in', 'Karnataka', 'Mangaluru', 'Dakshina Kannada', 1960,
  array['Civil Engineering', 'Applied Mechanics and Hydraulics', 'Computer Science and Engineering', 'Chemical Engineering']::text[], array['Coastal Engineering', 'Water Resources', 'Renewable Energy', 'Disaster Management']::text[], array['Coastal erosion protection structures', 'Estuarine water exchange modeling', 'Seawater intrusion vulnerability']::text[], array['GIS', 'Remote Sensing', 'Hydrological Modeling', 'IoT']::text[],
  array['Hydraulics and Ocean Engineering Lab', 'Environmental Engineering Lab']::text[], array['Wave Flume Research Facility', 'Centre for System Design']::text[], array['Wave flume with random wave generator', 'Current meters', 'Water quality multiparameter sondes']::text[], array['Karnataka coast wave and current monitoring', 'Port sediment dredging surveys']::text[],
  array['New Mangalore Port Authority', 'Karnataka Urban Infrastructure Development']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Rourkela', 'National Institute of Technology Rourkela', 'NIT', 'Major technical institution in eastern India with extensive expertise in mining hydrology, industrial steel plant waste recycling, and ceramic filters.',
  'https://www.nitrkl.ac.in', 'Odisha', 'Rourkela', 'Sundargarh', 1961,
  array['Civil Engineering', 'Mining Engineering', 'Computer Science and Engineering', 'Ceramic Engineering']::text[], array['Waste Management', 'Water Resources', 'Geotechnical Engineering', 'Materials Science']::text[], array['Industrial blast furnace slag utilization', 'Mine haul road dust suppression', 'Ceramic membrane water filters']::text[], array['Machine Learning', 'IoT', 'Materials Processing']::text[],
  array['Waste Management Research Lab', 'Environmental Engineering Lab']::text[], array['Industrial Technology Centre', 'Central Research Facility']::text[], array['Atomic force microscope', 'High temperature sintering furnaces', 'Water filtration pilot skid']::text[], array['Mining belt groundwater contamination surveys', 'Industrial waste reuse pilot deployments']::text[],
  array['Steel Authority of India (Rourkela Steel Plant)', 'Odisha State Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Warangal', 'National Institute of Technology Warangal', 'NIT', 'Historical regional engineering college known for smart city infrastructure, urban runoff mitigation, and power electronics.',
  'https://www.nitw.ac.in', 'Telangana', 'Warangal', 'Hanamkonda', 1959,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Urban Planning', 'Water Resources', 'Transportation Engineering', 'Artificial Intelligence']::text[], array['Urban storm water drainage design', 'Asphalt pavement longevity', 'Smart microgrid control']::text[], array['GIS', 'IoT', 'Machine Learning', 'Optimization']::text[],
  array['Transportation Engineering Lab', 'Water & Environment Lab']::text[], array['Centre for Advanced Materials', 'High Performance Computing Facility']::text[], array['Falling weight deflectometers', 'Continuous traffic counters', 'Urban drainage simulator']::text[], array['Warangal municipal drainage mapping', 'State highway road condition audits']::text[],
  array['Greater Warangal Municipal Corporation', 'Telangana State Southern Power Distribution']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'VNIT Nagpur', 'Visvesvaraya National Institute of Technology Nagpur', 'NIT', 'Prominent central Indian institute with deep strengths in structural engineering, road safety, and municipal wastewater reclamation.',
  'https://vnit.ac.in', 'Maharashtra', 'Nagpur', 'Nagpur', 1960,
  array['Civil Engineering', 'Computer Science and Engineering', 'Architecture and Planning', 'Mining Engineering']::text[], array['Civil Engineering', 'Urban Planning', 'Water Resources', 'Transportation Engineering']::text[], array['Black cotton soil road stabilization', 'Sewage treatment plant optimization', 'Urban heat mitigation planning']::text[], array['GIS', 'IoT', 'Simulation']::text[],
  array['Soil Mechanics Lab', 'Environmental Engineering Lab']::text[], array['Centre for Urban Science', 'Material Testing Centre']::text[], array['Triaxial automated test apparatus', 'Water spectrophotometer probes']::text[], array['Vidarbha rural soil stabilization trials', 'Nagpur city drainage mapping']::text[],
  array['Nagpur Municipal Corporation', 'Maha Metro Rail Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'MNIT Jaipur', 'Malaviya National Institute of Technology Jaipur', 'NIT', 'Premier institute in Rajasthan specializing in dryland water conservation, solar energy systems, and earthquake risk assessment.',
  'https://www.mnit.ac.in', 'Rajasthan', 'Jaipur', 'Jaipur', 1963,
  array['Civil Engineering', 'Computer Science and Engineering', 'Centre for Energy and Environment', 'Architecture and Planning']::text[], array['Water Resources', 'Renewable Energy', 'Urban Planning', 'Disaster Management']::text[], array['Rainwater harvesting design in arid areas', 'Solar rooftop optimization', 'Seismic microzonation']::text[], array['GIS', 'IoT', 'Machine Learning', 'Solar Energy Systems']::text[],
  array['Centre for Energy and Environment Lab', 'Water Resources Research Lab']::text[], array['National Centre for Disaster Mitigation and Management']::text[], array['Solar irradiance simulators', 'Soil moisture meters', 'Seismic sensors']::text[], array['Rajasthan rural water harvesting evaluations', 'Urban solar potential mapping']::text[],
  array['Jaipur Development Authority', 'Rajasthan Renewable Energy Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'MNNIT Allahabad', 'Motilal Nehru National Institute of Technology Allahabad', 'NIT', 'Historic engineering institute with focus on GIS applications in civic governance, river flow dynamics, and software systems.',
  'https://www.mnnit.ac.in', 'Uttar Pradesh', 'Prayagraj', 'Prayagraj', 1961,
  array['Civil Engineering', 'Computer Science and Engineering', 'Applied Mechanics', 'Electrical Engineering']::text[], array['GIS', 'Water Resources', 'Artificial Intelligence', 'Transportation Engineering']::text[], array['GIS-based municipal asset mapping', 'Ganga-Yamuna confluence hydraulic modeling', 'Crowd management algorithms']::text[], array['GIS', 'Remote Sensing', 'Machine Learning', 'IoT']::text[],
  array['Geoinformatics Lab', 'Fluid Mechanics Lab']::text[], array['Design and Innovation Centre']::text[], array['DGPS surveying systems', 'Flow visualization flumes']::text[], array['Kumbh Mela civic tracking deployments', 'Prayagraj municipal mapping']::text[],
  array['Prayagraj Municipal Corporation', 'UP State Disaster Management Authority']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Calicut', 'National Institute of Technology Calicut', 'NIT', 'Leading Kerala technical institute with strong expertise in watershed management, landslide vulnerability, and renewable energy microgrids.',
  'https://www.nitc.ac.in', 'Kerala', 'Kozhikode', 'Kozhikode', 1961,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Disaster Management', 'Water Resources', 'Renewable Energy', 'Environmental Engineering']::text[], array['Hill slope rainfall thresholds', 'River basin water quality assessment', 'Biogas from municipal waste']::text[], array['GIS', 'Machine Learning', 'IoT']::text[],
  array['Environmental Engineering Lab', 'Geotechnical Engineering Lab']::text[], array['Centre for Transportation Research']::text[], array['Automatic weather stations', 'Soil shear box testing rigs']::text[], array['Western Ghats landslide field instrumentation', 'Kozhikode water reservoir surveys']::text[],
  array['Kerala State Disaster Management Authority', 'Calicut Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Kurukshetra', 'National Institute of Technology Kurukshetra', 'NIT', 'Technical institute in Haryana with research in canal network automation, agricultural drainage, and power systems engineering.',
  'https://www.nitkkr.ac.in', 'Haryana', 'Kurukshetra', 'Kurukshetra', 1963,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Water Resources', 'Agricultural Engineering', 'IoT', 'Renewable Energy']::text[], array['Canal water distribution modeling', 'Agricultural water table management', 'Smart solar pumping']::text[], array['IoT', 'GIS', 'Machine Learning']::text[],
  array['Water Resources Lab', 'Power Systems Lab']::text[], array['Renewable Energy Centre']::text[], array['Canal discharge measurement loggers', 'Soil salinity meters']::text[], array['Haryana agricultural canal field monitoring', 'Village solar irrigation pilots']::text[],
  array['Haryana Irrigation & Water Resources Department', 'NTPC']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Durgapur', 'National Institute of Technology Durgapur', 'NIT', 'Eastern industrial belt NIT with strong focus on industrial water recycling, environmental remediation, and cyber security.',
  'https://www.nitdgp.ac.in', 'West Bengal', 'Durgapur', 'Paschim Bardhaman', 1960,
  array['Civil Engineering', 'Chemical Engineering', 'Computer Science and Engineering']::text[], array['Environmental Engineering', 'Waste Management', 'Water Resources']::text[], array['Damodar river basin pollution control', 'Industrial effluent chemical reduction', 'Fly ash utilization']::text[], array['Biotechnology', 'GIS', 'Machine Learning']::text[],
  array['Environmental Engineering Lab', 'Chemical Process Lab']::text[], array['Centre of Excellence in Advanced Materials']::text[], array['Spectroscopic water analyzers', 'Filtration columns']::text[], array['Damodar river water quality sampling', 'Industrial belt air and soil checks']::text[],
  array['Damodar Valley Corporation (DVC)', 'West Bengal Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Silchar', 'National Institute of Technology Silchar', 'NIT', 'Northeast regional institute exploring flood mitigation in Barak valley, slope stability, and renewable rural microgrids.',
  'https://www.nits.ac.in', 'Assam', 'Silchar', 'Cachar', 1967,
  array['Civil Engineering', 'Computer Science and Engineering', 'Electrical Engineering']::text[], array['Water Resources', 'Disaster Management', 'Renewable Energy']::text[], array['Barak valley flood inundation modeling', 'Hill road slope stabilization', 'Micro-hydro power generation']::text[], array['GIS', 'Remote Sensing', 'Machine Learning']::text[],
  array['Water Resources Lab', 'Renewable Energy Lab']::text[], array['Centre for Environment']::text[], array['Stream flow velocimeters', 'Weather sensors']::text[], array['Barak river flood monitoring', 'Rural microgrid installations']::text[],
  array['Assam Water Resources Department', 'Northeast Frontier Railway']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Jamshedpur', 'National Institute of Technology Jamshedpur', 'NIT', 'Premier engineering institution in Jharkhand with renowned capabilities in industrial manufacturing, structural engineering, and Subarnarekha river basin hydrology.',
  'https://www.nitjsr.ac.in', 'Jharkhand', 'Jamshedpur', 'East Singhbhum', 1960,
  array['Civil Engineering', 'Computer Science and Engineering', 'Metallurgical and Materials Engineering', 'Electrical Engineering']::text[], array['Water Resources', 'Materials Science', 'Waste Management', 'Geotechnical Engineering']::text[], array['Subarnarekha basin hydrological modeling', 'Slag reuse in concrete pavements', 'Industrial air pollution filtering']::text[], array['GIS', 'IoT', 'Materials Science', 'Machine Learning']::text[],
  array['Environmental Engineering Lab', 'Concrete and Materials Testing Lab', 'Fluid Mechanics Lab']::text[], array['Central Research Facility', 'Industry-Academia Collaboration Cell']::text[], array['Compression testing machines', 'Atomic absorption spectrometer', 'Water quality testing probes']::text[], array['Jharkhand industrial corridor water surveys', 'Road pavement durability testing in mineral belts']::text[],
  array['Tata Steel Limited', 'Jusco (Tata Steel Utilities)', 'Jharkhand State Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'SVNIT Surat', 'Sardar Vallabhbhai National Institute of Technology Surat', 'NIT', 'Western technical institution with national prominence in urban flood modeling (Tapi river), chemical waste management, and coastal geotechnics.',
  'https://www.svnit.ac.in', 'Gujarat', 'Surat', 'Surat', 1961,
  array['Civil Engineering', 'Chemical Engineering', 'Computer Science and Engineering', 'Urban Planning']::text[], array['Water Resources', 'Urban Planning', 'Environmental Engineering', 'Transportation Engineering']::text[], array['Tapi river flood forecasting', 'Coastal aquifer salinization modeling', 'Textile and chemical industrial wastewater treatment']::text[], array['GIS', 'Remote Sensing', 'Machine Learning', 'Simulation']::text[],
  array['Water Resources Engineering Lab', 'Environmental Engineering Lab', 'Urban Planning GIS Lab']::text[], array['Centre of Excellence in Water Resources and Flood Management']::text[], array['Acoustic Doppler flow trackers', 'Total organic carbon analyzers', 'High precision GPS sets']::text[], array['Surat municipal flood early warning deployments', 'Coastal groundwater monitoring']::text[],
  array['Surat Municipal Corporation', 'Gujarat Water Supply and Sewerage Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'MANIT Bhopal', 'Maulana Azad National Institute of Technology Bhopal', 'NIT', 'Institute with specialized research in urban lake conservation, watershed hydrology, building energy efficiency, and power electronics.',
  'https://www.manit.ac.in', 'Madhya Pradesh', 'Bhopal', 'Bhopal', 1960,
  array['Civil Engineering', 'Computer Science and Engineering', 'Architecture and Planning', 'Energy Engineering']::text[], array['Water Resources', 'Urban Planning', 'Renewable Energy', 'Environmental Engineering']::text[], array['Bhopal Upper Lake watershed conservation', 'Eutrophication control in urban reservoirs', 'Green building architecture']::text[], array['GIS', 'Remote Sensing', 'Simulation']::text[],
  array['Environmental Engineering Lab', 'Remote Sensing & GIS Lab']::text[], array['Energy Centre', 'Central Computing Facility']::text[], array['Water sampling sonar boats', 'Gas chromatographs']::text[], array['Urban lake water quality monitoring', 'Catchment area land use audits']::text[],
  array['Bhopal Municipal Corporation', 'Environmental Planning & Coordination Organisation (EPCO)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'NIT Patna', 'National Institute of Technology Patna', 'NIT', 'Historic engineering college on the banks of Ganga with deep expertise in alluvial river hydraulics, flood control, and low-cost sanitation.',
  'https://www.nitp.ac.in', 'Bihar', 'Patna', 'Patna', 1886,
  array['Civil Engineering', 'Computer Science and Engineering', 'Architecture and Planning']::text[], array['Water Resources', 'Disaster Management', 'Civil Engineering', 'Urban Planning']::text[], array['Ganga riverbank scour and morphology', 'Bihar flood vulnerability zoning', 'Low-cost disaster resilient housing']::text[], array['GIS', 'Hydrological Modeling', 'Remote Sensing']::text[],
  array['River Hydraulics Lab', 'Soil Mechanics Lab']::text[], array['Centre for Water Resources']::text[], array['Hydraulic flume channel', 'DGPS positioning instruments']::text[], array['Bihar flood plain field mapping', 'River bank protection testing']::text[],
  array['Bihar Water Resources Department', 'Disaster Management Department Bihar']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Birsa Agricultural University', 'Birsa Agricultural University Ranchi', 'Agricultural University', 'Premier agricultural and forestry university located in Kanke, Ranchi, dedicated to plateau agriculture, rainfed farming systems, tribal livelihood improvement, and soil-water management in Jharkhand.',
  'https://www.bauranchi.org', 'Jharkhand', 'Ranchi', 'Ranchi', 1981,
  array['Faculty of Agriculture', 'Faculty of Forestry', 'Faculty of Veterinary Science and Animal Husbandry', 'Department of Soil Science and Agricultural Chemistry', 'Department of Agronomy', 'Department of Agricultural Engineering']::text[], array['Agricultural Engineering', 'Precision Agriculture', 'Water Resources', 'Forestry and Agroforestry', 'Climate Science']::text[], array['Rainfed plateau irrigation strategies', 'Micro-watershed rainwater harvesting in red-laterite soils', 'Drought tolerant upland rice cultivation', 'Agroforestry models for tribal land rehabilitation', 'Soil acidity and nutrient remediation']::text[], array['IoT for Soil Moisture', 'GIS', 'Drip Irrigation Automation', 'Remote Sensing', 'Organic Bio-fertilizers']::text[],
  array['Soil Testing and Nutrient Analysis Lab', 'Dryland Agriculture Research Lab', 'Agro-meteorological Observatory', 'Plant Pathology and Tissue Culture Lab']::text[], array['Central Research Farm (Kanke, 500+ Acres)', 'Krishi Vigyan Kendra Network across Jharkhand', 'Tribal Agri-technology Demonstration Center']::text[], array['Soil water potential tensiometers', 'Automatic weather station', 'Spectrophotometers for soil chemical profiling', 'Seed processing and testing units']::text[], array['Plateau farm micro-irrigation field pilots', 'Rainwater pond check-dam monitoring across Jharkhand', 'Farmer participatory varietal trials', 'Tribal community agriculture outreach']::text[],
  array['Jharkhand State Department of Agriculture', 'ICAR Research Complex for Eastern Region', 'Birsa Kisan Club Network', 'NABARD funded rural watershed programs']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - IARI New Delhi', 'ICAR - Indian Agricultural Research Institute', 'Agricultural University', 'India''s premier national institute for agricultural research, education and extension (Pusa Institute), leading advancements in high-yield varieties, water technology, and precision farming.',
  'https://www.iari.res.in', 'Delhi', 'New Delhi', 'New Delhi', 1905,
  array['Water Technology Centre', 'Division of Agricultural Engineering', 'Division of Agronomy', 'Division of Soil Science and Agricultural Chemistry', 'Division of Genetics']::text[], array['Precision Agriculture', 'Water Resources', 'Agricultural Engineering', 'Climate Science', 'Remote Sensing']::text[], array['Precision water-nutrient scheduling', 'Laser land leveling and conservation tillage', 'Smart fertigation systems', 'Crop drought response phenotyping', 'Saline and alkaline water irrigation']::text[], array['IoT', 'Sensor Networks', 'Drones', 'GIS', 'Satellite Remote Sensing', 'Machine Learning']::text[],
  array['Water Technology Centre Specialized Labs', 'National Phytotron Facility', 'Soil Quality Assessment Lab', 'Remote Sensing & GIS Cell']::text[], array['Experimental Research Farm (500+ Acres)', 'National Genebank Joint Facility', 'Pusa Krishi Incubator']::text[], array['Automated lysimeter systems', 'Multi-spectral agricultural drones', 'Eddy covariance greenhouse gas towers', 'Atomic absorption spectrometers']::text[], array['Indo-Gangetic plain field trials', 'Automated drip and sprinkler testbeds', 'National farmer demonstration plots']::text[],
  array['Ministry of Agriculture and Farmers Welfare', 'State agricultural universities network', 'CGIAR international research centers']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Punjab Agricultural University', 'Punjab Agricultural University Ludhiana', 'Agricultural University', 'Cradle of India''s Green Revolution with international renown in agricultural mechanization, groundwater preservation, drip irrigation, and crop residue management.',
  'https://www.pau.edu', 'Punjab', 'Ludhiana', 'Ludhiana', 1962,
  array['Department of Soil and Water Engineering', 'Department of Farm Machinery and Power Engineering', 'Department of Agronomy', 'Department of Processing and Food Engineering']::text[], array['Water Resources', 'Agricultural Engineering', 'Precision Agriculture', 'Waste Management']::text[], array['Paddy water saving techniques (DSR, tensiometers)', 'Groundwater depletion mitigation', 'In-situ crop residue management (Happy Seeder)', 'Micro-irrigation engineering']::text[], array['IoT', 'Agricultural Machinery Automation', 'GIS', 'Remote Sensing']::text[],
  array['Soil and Water Testing Lab', 'Farm Machinery Testing and Evaluation Lab', 'Agro-processing Lab']::text[], array['Research Farm Facilities (1500+ Acres)', 'Technology Transfer Centre']::text[], array['PAU Soil Tensiometers', 'Laser guided land levelers', 'Underground pipeline water meters', 'Grain quality analyzers']::text[], array['Farm-scale irrigation scheduling trials', 'Groundwater table recharge monitoring', 'Stubble management field machinery demonstrations']::text[],
  array['Punjab State Farmers Commission', 'Punjab Department of Agriculture', 'International Rice Research Institute (IRRI)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Tamil Nadu Agricultural University', 'Tamil Nadu Agricultural University Coimbatore', 'Agricultural University', 'Leading southern agricultural institution with high expertise in precision drip fertigation, dryland water harvesting, remote sensing for crop insurance, and robotic harvesting.',
  'https://tnau.ac.in', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 1971,
  array['Agricultural Engineering College and Research Institute', 'Water Technology Centre', 'Centre for Agricultural and Rural Development Studies', 'Department of Remote Sensing and GIS']::text[], array['Precision Agriculture', 'Water Resources', 'Agricultural Engineering', 'Remote Sensing', 'IoT']::text[], array['Sub-surface drip irrigation', 'Automated crop water requirement estimation', 'Satellite based crop acreage forecasting', 'Tank irrigation system rehabilitation']::text[], array['GIS', 'Satellite Remote Sensing', 'IoT', 'Drones', 'Automated Fertigation']::text[],
  array['Water Technology Centre Lab', 'Geoinformatics Centre', 'Bio-fuel Testing Lab']::text[], array['Experimental Research Farm', 'Botanical Garden Facility', 'Directorate of Agri-Business Development']::text[], array['Automated weather stations', 'Sap flow meters', 'Hyperspectral field spectroradiometers', 'Soil moisture sensor loggers']::text[], array['Tamil Nadu river basin farm trials', 'Dryland watershed pilot interventions', 'Farmer field school network']::text[],
  array['Tamil Nadu Water Resources Department', 'ISRO agricultural applications', 'World Bank funded irrigation projects']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'GBPUAT Pantnagar', 'Govind Ballabh Pant University of Agriculture and Technology', 'Agricultural University', 'First agricultural university established in independent India, famous for Tarai seed production, hill agriculture irrigation, and farm machinery.',
  'https://www.gbpuat.ac.in', 'Uttarakhand', 'Pantnagar', 'Udham Singh Nagar', 1960,
  array['College of Technology (Irrigation and Drainage Engineering)', 'College of Agriculture', 'Department of Soil Science']::text[], array['Agricultural Engineering', 'Water Resources', 'Precision Agriculture', 'Disaster Management']::text[], array['Tarai region drainage and flood alleviation', 'Himalayan terrace irrigation', 'Gravity fed drip irrigation systems', 'High-efficiency farm equipment']::text[], array['Hydrological Modeling', 'GIS', 'Farm Machinery Systems']::text[],
  array['Irrigation and Drainage Lab', 'Soil Physics Lab', 'Tractor and Farm Machinery Testing Lab']::text[], array['Instructional Farm (10,000+ Acres)', 'Seed Processing Plants', 'Central Computing Facility']::text[], array['Field drainage pipe testing apparatus', 'Canal seepage meters', 'Heavy agricultural tractors and implements']::text[], array['Large scale seed production farm trials', 'Himalayan watershed runoff assessment']::text[],
  array['Uttarakhand Agriculture Department', 'Central Water Commission', 'National Seed Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CCSHAU Hisar', 'Chaudhary Charan Singh Haryana Agricultural University', 'Agricultural University', 'Premier agricultural institution in semi-arid northwest India specialized in saline water management, crop water optimization, and desert fringe agriculture.',
  'https://www.hau.ac.in', 'Haryana', 'Hisar', 'Hisar', 1970,
  array['College of Agricultural Engineering and Technology', 'Department of Soil Science', 'Department of Agronomy']::text[], array['Water Resources', 'Precision Agriculture', 'Agricultural Engineering', 'Environmental Engineering']::text[], array['Management of poor quality groundwater in agriculture', 'Solar drip irrigation in sandy soils', 'Salinity induced crop stress mitigation']::text[], array['IoT', 'GIS', 'Solar Pumping', 'Sensor Networks']::text[],
  array['Soil and Water Testing Lab', 'Agricultural Meteorology Lab']::text[], array['Research Farm (2000+ Acres)', 'Centre of Excellence for Energy Management in Agriculture']::text[], array['Solar powered precision irrigation valves', 'Electrical conductivity soil scanners']::text[], array['Haryana dryland farm trials', 'Saline aquifer irrigation monitoring']::text[],
  array['Haryana Department of Agriculture', 'ICAR Central Soil Salinity Research Institute']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'National Institute of Hydrology', 'National Institute of Hydrology Roorkee', 'Research Institute', 'Premier autonomous research institute under Ministry of Jal Shakti dedicated to all aspects of theoretical and applied hydrology and water resources management in India.',
  'https://nihroorkee.gov.in', 'Uttarakhand', 'Roorkee', 'Haridwar', 1978,
  array['Surface Water Hydrology Division', 'Ground Water Hydrology Division', 'Environmental Hydrology Division', 'Water Resources Systems Division']::text[], array['Hydrology', 'Water Resources', 'Climate Science', 'Environmental Engineering', 'Disaster Management']::text[], array['Integrated river basin hydrological modeling', 'Groundwater recharge estimation', 'Glacier runoff and lake outburst flood (GLOF) modeling', 'Drought and flood frequency analysis']::text[], array['Hydrological Modeling', 'GIS', 'Satellite Remote Sensing', 'Digital Elevation Models', 'Simulation']::text[],
  array['Nuclear Hydrology Lab', 'Water Quality Analytical Lab', 'Remote Sensing & GIS Lab', 'Soil Water Lab']::text[], array['National Hydrology Project Technical Support Unit', 'Regional Research Centres across India']::text[], array['Isotope ratio mass spectrometer (IRMS)', 'Liquid scintillation counter', 'Automatic water stage recorders', 'Groundwater level acoustic sounders']::text[], array['Nationwide catchment instrumentation', 'Isotope hydrological tracing', 'Reservoir siltation surveys']::text[],
  array['Ministry of Jal Shakti', 'Central Water Commission', 'World Bank (National Hydrology Project)', 'State water resources departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - CSSRI Karnal', 'ICAR - Central Soil Salinity Research Institute', 'Research Institute', 'National institute specialized in reclamation and management of salt-affected soils, sub-surface drainage technology, and use of poor quality irrigation water.',
  'https://cssri.res.in', 'Haryana', 'Karnal', 'Karnal', 1969,
  array['Division of Irrigation and Drainage Engineering', 'Division of Soil and Crop Management', 'Division of Crop Improvement']::text[], array['Agricultural Engineering', 'Water Resources', 'Environmental Engineering', 'Precision Agriculture']::text[], array['Sub-surface pipe drainage for waterlogged saline soils', 'Conjunctival use of saline and canal water', 'Bio-drainage using fast growing trees', 'Salt tolerant crop varieties']::text[], array['Sub-surface Drainage', 'GIS', 'Hydrological Modeling', 'Soil Physics']::text[],
  array['Soil Physical and Chemical Analysis Lab', 'Drainage Engineering Lab', 'Plant Physiology Lab']::text[], array['Experimental Research Farm Karnal', 'Regional Research Stations in Gujarat and West Bengal']::text[], array['Laser guided sub-surface drain laying machinery', 'Electromagnetic soil salinity sensors', 'Piezometer networks']::text[], array['Large scale farmer field sub-surface drainage pilots', 'Canal command waterlogging monitoring']::text[],
  array['State agriculture and irrigation departments of Haryana, Punjab, Gujarat', 'World Bank salinity mitigation projects']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - CAZRI Jodhpur', 'ICAR - Central Arid Zone Research Institute', 'Research Institute', 'National research organization dedicated to desertification control, dryland water harvesting (tanka, khadin), arid agroforestry, and renewable energy in Thar desert.',
  'https://cazri.res.in', 'Rajasthan', 'Jodhpur', 'Jodhpur', 1959,
  array['Division of Natural Resources and Environment', 'Division of Agricultural Engineering and Renewable Energy', 'Division of Plant Improvement and Propagation']::text[], array['Water Resources', 'Agricultural Engineering', 'Renewable Energy', 'Climate Science', 'Forestry and Agroforestry']::text[], array['Traditional rainwater harvesting optimization (tanka, khadin)', 'Sand dune stabilization', 'Solar agro-photovoltaic systems', 'Drip irrigation with brackish water']::text[], array['GIS', 'Remote Sensing', 'Solar Agri-voltaics', 'Water Harvesting Engineering']::text[],
  array['Soil and Water Analysis Lab', 'Solar Energy Application Lab', 'Agro-meteorology Lab']::text[], array['Arid Zone Research Farm', 'Agri-voltaic System Demonstration Centre']::text[], array['Solar radiation trackers', 'Soil water sensor networks', 'Tensiometer banks']::text[], array['Arid community water harvesting construction audits', 'Sand dune fixation pilots', 'Village agro-photovoltaic deployments']::text[],
  array['Rajasthan Forest Department', 'Desert Development Programme', 'International dryland agriculture centers']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - NDRI Karnal', 'ICAR - National Dairy Research Institute', 'Research Institute', 'Premier national institute in dairy science, cattle genetics, milk processing technology, and livestock water footprint management.',
  'https://ndri.res.in', 'Haryana', 'Karnal', 'Karnal', 1923,
  array['Dairy Engineering Division', 'Dairy Cattle Physiology Division', 'Dairy Microbiology Division']::text[], array['Waste Management', 'Water Resources', 'Biotechnology', 'Agricultural Engineering']::text[], array['Dairy wastewater treatment and anaerobic digestion', 'Biogas from livestock slurry', 'Water conservation in dairy processing']::text[], array['Anaerobic Digestion', 'Biotechnology', 'Waste-to-Energy', 'Membrane Separation']::text[],
  array['Dairy Waste and Effluent Testing Lab', 'Microbiology Lab']::text[], array['Experimental Dairy Processing Plant', 'National Referral Lab on Dairy Quality']::text[], array['Bioreactors', 'High efficiency effluent filtration skids', 'Gas chromatographs']::text[], array['Commercial dairy effluent treatment auditing', 'Village dairy biogas pilot installations']::text[],
  array['National Dairy Development Board (NDDB)', 'State dairy cooperatives (Amul, Vita, Verka)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - IIWM Bhubaneswar', 'ICAR - Indian Institute of Water Management', 'Research Institute', 'National institute exclusively focused on agricultural water management, canal command irrigation scheduling, water footprint, and drainage in humid & sub-humid regions.',
  'https://iiwm.res.in', 'Odisha', 'Bhubaneswar', 'Khurda', 1988,
  array['Division of Water Resource Management', 'Division of Land and Water Engineering', 'Division of Socio-Economic and Policy']::text[], array['Water Resources', 'Agricultural Engineering', 'Precision Agriculture', 'Climate Science']::text[], array['Canal command area water delivery equity', 'Crop water productivity assessment', 'Drainage recycled irrigation', 'Water logging alleviation']::text[], array['GIS', 'Remote Sensing', 'Hydrological Simulation', 'IoT']::text[],
  array['Hydraulics and Soil Moisture Lab', 'Water Quality Analysis Lab', 'Remote Sensing GIS Facility']::text[], array['Experimental Irrigation Research Farm', 'Water Productivity Testbed']::text[], array['Field water flow flumes', 'TDR soil moisture probes', 'Continuous water level recorders']::text[], array['Canal command outlet discharge monitoring', 'Farmers participatory irrigation management pilots', 'Sub-surface drainage evaluations']::text[],
  array['Ministry of Water Resources', 'Odisha Department of Water Resources', 'International Water Management Institute (IWMI)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ICAR - CIAE Bhopal', 'ICAR - Central Institute of Agricultural Engineering', 'Research Institute', 'Apex research organization for farm mechanization, precision planting, renewable energy in agriculture, and post-harvest technology.',
  'https://ciae.res.in', 'Madhya Pradesh', 'Bhopal', 'Bhopal', 1976,
  array['Irrigation and Drainage Engineering Division', 'Agricultural Mechanization Division', 'Agro-Processing Division']::text[], array['Agricultural Engineering', 'Precision Agriculture', 'Renewable Energy', 'Robotics']::text[], array['Laser land leveling equipment', 'Solar powered precision drip systems', 'Tractor mounted variable rate fertilizer applicators', 'Paddy transplanter engineering']::text[], array['IoT', 'Robotics', 'Solar Energy Systems', 'Automation']::text[],
  array['Precision Irrigation Equipment Testing Lab', 'Tractor and Implement Dynamics Lab']::text[], array['National Testing Centre for Agricultural Machinery', 'Industrial Prototype Development Cell']::text[], array['Dynamometers for tractor testing', 'Computer controlled irrigation testing flumes', 'Rapid soil compaction meters']::text[], array['State-wide farm machinery demonstrations', 'On-farm micro-irrigation uniformity audits']::text[],
  array['Ministry of Agriculture', 'Farm machinery manufacturers', 'State agriculture departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'UAS Bangalore', 'University of Agricultural Sciences, Bangalore', 'Agricultural University', 'Renowned southern agricultural university with achievements in dryland agriculture, watershed management in hard rock aquifers, and precision horticulture.',
  'https://uasbangalore.edu.in', 'Karnataka', 'Bengaluru', 'Bengaluru Urban', 1964,
  array['Department of Soil Science and Agricultural Chemistry', 'Department of Agronomy', 'Department of Agricultural Engineering']::text[], array['Precision Agriculture', 'Water Resources', 'Agricultural Engineering', 'Climate Science']::text[], array['Hard rock aquifer groundwater budgeting', 'Borewell recharge structures', 'Drip irrigation in red soils', 'Drought resilient millets']::text[], array['IoT', 'GIS', 'Micro-irrigation Systems']::text[],
  array['Dryland Agriculture Lab', 'Soil Physics and Chemistry Lab', 'Bio-fertilizer Lab']::text[], array['Gandhi Krishi Vigyana Kendra (GKVK) Research Campus (1400+ Acres)']::text[], array['Automated weather sensors', 'Soil water potential loggers', 'Infrared thermal crop canopy thermometers']::text[], array['Karnataka dry zone farm demonstrations', 'Farm pond recharge monitoring']::text[],
  array['Karnataka State Watershed Development Department', 'Karnataka State Natural Disaster Monitoring Centre']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Dr. RPCAU Pusa', 'Dr. Rajendra Prasad Central Agricultural University', 'Agricultural University', 'Central agricultural university in Bihar specializing in flood-prone agriculture, wetland (Chaurs) management, river basin hydrology, and mushroom biotechnology.',
  'https://www.rpcau.ac.in', 'Bihar', 'Samastipur', 'Samastipur', 1970,
  array['College of Agricultural Engineering and Technology', 'Department of Soil Science', 'Department of Agronomy']::text[], array['Water Resources', 'Agricultural Engineering', 'Disaster Management', 'Precision Agriculture']::text[], array['Management of flood-prone waterlogged lands (Chaurs)', 'Low cost bamboo tubewell technology', 'Integrated fish-crop-livestock farming in wetlands']::text[], array['GIS', 'Hydrological Modeling', 'Solar Pumping']::text[],
  array['Wetland Ecology and Drainage Lab', 'Soil Quality Lab']::text[], array['Instructional Research Farm', 'Centre of Excellence in Water Management']::text[], array['Sub-surface drainage installers', 'Water quality spectroscopy', 'Groundwater depth meters']::text[], array['North Bihar flood plain agricultural trials', 'Waterlogged land restoration pilots']::text[],
  array['Bihar State Department of Agriculture', 'Indian Council of Agricultural Research']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ANGRAU Guntur', 'Acharya N.G. Ranga Agricultural University', 'Agricultural University', 'Key agricultural university in Andhra Pradesh with high strengths in canal water efficiency, coastal saline agriculture, and precision rice management.',
  'https://angrau.ac.in', 'Andhra Pradesh', 'Guntur', 'Guntur', 1964,
  array['Agricultural Engineering College', 'Department of Soil and Water Conservation', 'Department of Agronomy']::text[], array['Agricultural Engineering', 'Water Resources', 'Precision Agriculture']::text[], array['Krishna-Godavari delta water management', 'Coastal soil salinity reclamation', 'Alternate wetting and drying in rice']::text[], array['IoT', 'GIS', 'Remote Sensing']::text[],
  array['Soil and Water Analysis Lab', 'Water Technology Lab']::text[], array['Agricultural Research Stations network across Andhra Pradesh']::text[], array['Field water tubes for AWD', 'Automatic weather stations']::text[], array['Delta farm water savings trials', 'Rayalaseema dryland monitoring']::text[],
  array['Andhra Pradesh Agriculture Department', 'Water Resources Department Andhra Pradesh']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Anand Agricultural University', 'Anand Agricultural University', 'Agricultural University', 'Historic agricultural centre in Gujarat leading agricultural IT applications, weather forecasting dissemination, and precision irrigation.',
  'https://www.aau.in', 'Gujarat', 'Anand', 'Anand', 2004,
  array['College of Agricultural Engineering and Technology', 'Department of Agricultural Meteorology', 'Department of Agronomy']::text[], array['Precision Agriculture', 'Agricultural Engineering', 'IoT', 'Climate Science']::text[], array['Agro-advisory systems via mobile technology', 'Soil moisture sensor based drip scheduling', 'Microclimate monitoring in greenhouses']::text[], array['IoT', 'Mobile Applications', 'GIS', 'Sensor Networks']::text[],
  array['Agrometeorology Research Lab', 'Soil and Water Engineering Lab']::text[], array['Agro-climatic Observation Centre', 'Information Technology Center']::text[], array['Automated agromet stations', 'Soil moisture dielectric probes']::text[], array['Gujarat farmer field weather advisory verification', 'Drip irrigation uniformity testing']::text[],
  array['India Meteorological Department (IMD)', 'Gujarat State Agriculture Department']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'University of Delhi', 'University of Delhi', 'Central University', 'Premier central university in the national capital with top-tier departments in environmental studies, computer science, chemistry, and operational research.',
  'https://www.du.ac.in', 'Delhi', 'New Delhi', 'North Delhi', 1922,
  array['Department of Environmental Studies', 'Department of Computer Science', 'Department of Chemistry', 'Department of Operational Research', 'Department of Geology']::text[], array['Environmental Engineering', 'Air Quality Management', 'Artificial Intelligence', 'Waste Management', 'Urban Planning']::text[], array['Yamuna river water quality bio-monitoring', 'Urban air particulate matter chemical fingerprinting', 'Optimization algorithms for public logistics']::text[], array['Machine Learning', 'Optimization', 'GIS', 'Data Analytics']::text[],
  array['Environmental Biology Lab', 'Applied Chemistry Testing Lab', 'Geoinformatics Lab']::text[], array['Central Instrumentation Facility', 'Delhi University Computer Centre']::text[], array['Gas chromatography-mass spectrometers', 'Aerosol monitors', 'High throughput server clusters']::text[], array['Yamuna river sampling campaigns', 'Delhi NCR air pollution observational network']::text[],
  array['Delhi Pollution Control Committee', 'Ministry of Environment, Forest and Climate Change']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Jawaharlal Nehru University', 'Jawaharlal Nehru University New Delhi', 'Central University', 'Foremost research university with specialized schools in environmental sciences, physical sciences, and computational and integrative biology.',
  'https://www.jnu.ac.in', 'Delhi', 'New Delhi', 'South West Delhi', 1969,
  array['School of Environmental Sciences', 'School of Computational and Integrative Sciences', 'School of Physical Sciences']::text[], array['Environmental Engineering', 'Climate Science', 'Water Resources', 'Data Analytics']::text[], array['Groundwater contamination by heavy metals', 'Biogeochemical cycles in polluted water bodies', 'Urban climate resilience policies']::text[], array['GIS', 'Biotechnology', 'Data Analytics']::text[],
  array['Water Chemistry Lab', 'Environmental Geology Lab', 'Air Pollution Monitoring Lab']::text[], array['Advanced Instrumentation Research Facility (AIRF)']::text[], array['Inductively coupled plasma atomic emission spectrometer', 'Total organic carbon analyzers']::text[], array['Urban groundwater contamination field mapping', 'Wetland environmental sampling']::text[],
  array['Central Pollution Control Board', 'United Nations Environment Programme projects']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Banaras Hindu University', 'Banaras Hindu University', 'Central University', 'One of Asia''s largest residential central universities, holding extensive multidisciplinary faculties in agriculture, environment, science, and medicine.',
  'https://www.bhu.ac.in', 'Uttar Pradesh', 'Varanasi', 'Varanasi', 1916,
  array['Institute of Environment and Sustainable Development', 'Institute of Agricultural Sciences', 'Department of Geophysics']::text[], array['Environmental Engineering', 'Agricultural Engineering', 'Water Resources', 'Waste Management']::text[], array['Ganga basin eco-hydrology', 'Rural water treatment bio-sand filters', 'Agricultural waste vermicomposting']::text[], array['GIS', 'Remote Sensing', 'Biotechnology']::text[],
  array['Eco-toxicology Lab', 'Agricultural Physics Lab', 'Hydro-geology Lab']::text[], array['Barkachha South Campus Agricultural Farm (2700+ Acres)', 'Central Discovery Centre']::text[], array['Atomic absorption spectrophotometers', 'Soil nutrient auto-analyzers']::text[], array['Mirzapur plateau dryland farming trials', 'Varanasi peri-urban water testing']::text[],
  array['National Mission for Clean Ganga', 'Varanasi Nagar Nigam']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Aligarh Muslim University', 'Aligarh Muslim University', 'Central University', 'Historic central university with high research output in civil engineering, water treatment, environmental science, and agricultural microbiology.',
  'https://www.amu.ac.in', 'Uttar Pradesh', 'Aligarh', 'Aligarh', 1920,
  array['Department of Civil Engineering (Zakir Husain College of Engg)', 'Department of Agricultural Microbiology', 'Department of Geology']::text[], array['Water Resources', 'Environmental Engineering', 'Waste Management', 'Civil Engineering']::text[], array['Low cost biological wastewater treatment', 'Groundwater aquifer recharge structures', 'Pesticide degrading microbial consortia']::text[], array['Biotechnology', 'GIS', 'Water Filtration']::text[],
  array['Environmental Engineering Research Lab', 'Hydro-geology Research Lab']::text[], array['University Central Analytical Facility']::text[], array['High performance liquid chromatographs', 'Sediment settling test columns']::text[], array['Western UP industrial belt water testing', 'Municipal sewer outfall monitoring']::text[],
  array['UP Jal Nigam', 'Central Ground Water Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'University of Hyderabad', 'University of Hyderabad', 'Central University', 'Institute of Eminence central university with distinguished achievements in computational sciences, materials research, and plant biology.',
  'https://uohyd.ac.in', 'Telangana', 'Hyderabad', 'Hyderabad', 1974,
  array['School of Computer and Information Sciences', 'Department of Plant Sciences', 'School of Chemistry']::text[], array['Artificial Intelligence', 'Materials Science', 'Climate Science', 'Data Analytics']::text[], array['AI algorithms for resource allocation', 'Drought stress response in semi-arid crops', 'Water disinfectant polymers']::text[], array['Machine Learning', 'Optimization', 'Nanotechnology']::text[],
  array['Computational Intelligence Lab', 'Plant Stress Physiology Lab']::text[], array['Centre for Nanotechnology', 'High Performance Computing Facility']::text[], array['Fluorescence microscopes', 'GPU supercomputing servers']::text[], array['Deccan plateau plant ecology surveys', 'Campus urban biodiversity tracking']::text[],
  array['Telangana State Council of Science and Technology', 'ICRISAT']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Jadavpur University', 'Jadavpur University Kolkata', 'State University', 'Premier state university in West Bengal with top rank in engineering, chemical processes, water resources engineering, and civic sanitation.',
  'https://jaduniv.edu.in', 'West Bengal', 'Kolkata', 'Kolkata', 1955,
  array['School of Water Resources Engineering', 'Civil Engineering Department', 'Chemical Engineering Department', 'Computer Science and Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Waste Management', 'Disaster Management']::text[], array['Arsenic removal filter technology', 'Kolkata urban canal water rejuvenation', 'Cyclone storm surge risk mapping']::text[], array['Water Filtration', 'GIS', 'Machine Learning', 'Remote Sensing']::text[],
  array['Water Resources Engineering Research Lab', 'Environmental Technology Lab']::text[], array['School of Environmental Studies Reference Lab']::text[], array['Atomic fluorescence spectrophotometer for arsenic', 'Hydraulic flumes']::text[], array['Bengal delta community water filter installations', 'Sundarbans salinity survey']::text[],
  array['Kolkata Municipal Corporation', 'Public Health Engineering Department West Bengal']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Anna University', 'Anna University Chennai', 'State University', 'Foremost technical university in Tamil Nadu leading state-wide research in remote sensing, urban flood modeling (Adyar and Cooum rivers), and water resources.',
  'https://www.annauniv.edu', 'Tamil Nadu', 'Chennai', 'Chennai', 1978,
  array['Institute of Remote Sensing (IRS)', 'Centre for Water Resources (CWR)', 'Department of Civil Engineering']::text[], array['Remote Sensing', 'GIS', 'Water Resources', 'Urban Planning', 'Disaster Management']::text[], array['Chennai urban flood early warning modeling', 'Coastal zone management and CRZ mapping', 'Groundwater recharge in fractured rock terrains']::text[], array['GIS', 'Satellite Remote Sensing', 'Hydrological Modeling', 'Drones']::text[],
  array['Digital Mapping and GIS Lab', 'Hydraulics and Coastal Engineering Lab']::text[], array['Institute of Remote Sensing Ground Station', 'High Performance Computing Facility']::text[], array['Satellite data reception and processing systems', 'High precision GPS stations', 'Ultrasonic stream gauges']::text[], array['Chennai stormwater drain capacity audits', 'Tamil Nadu coastal mapping deployments']::text[],
  array['Greater Chennai Corporation', 'Tamil Nadu Disaster Management Authority', 'ISRO']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Savitribai Phule Pune University', 'Savitribai Phule Pune University', 'State University', 'Prestigious state university in Maharashtra (Oxford of the East) with strong research in environmental science, geoinformatics, and atmospheric modeling.',
  'http://www.unipune.ac.in', 'Maharashtra', 'Pune', 'Pune', 1949,
  array['Department of Environmental Science', 'Department of Geography (Geoinformatics)', 'Department of Technology']::text[], array['Environmental Engineering', 'GIS', 'Urban Planning', 'Waste Management']::text[], array['Mula-Mutha river pollution abatement', 'Urban sprawl and watershed land use dynamics', 'Solid waste composting standards']::text[], array['GIS', 'Remote Sensing', 'Data Analytics']::text[],
  array['Geoinformatics Lab', 'Environmental Pollution Testing Lab']::text[], array['Central Instrumentation Facility']::text[], array['Gas chromatographs', 'Multi-spectral imaging software licenses']::text[], array['Pune urban river sampling', 'Western Maharashtra watershed audits']::text[],
  array['Pune Municipal Corporation', 'Maharashtra Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'University of Mumbai', 'University of Mumbai', 'State University', 'Historic metropolitan university with dedicated centers in coastal studies, urban development, civic governance, and chemical engineering.',
  'https://mu.ac.in', 'Maharashtra', 'Mumbai', 'Mumbai', 1857,
  array['Alkesh Dinesh Mody Institute', 'Department of Geography', 'Department of Chemistry', 'Department of Civics and Politics']::text[], array['Urban Planning', 'Environmental Engineering', 'Waste Management', 'Public Health']::text[], array['Mithi river urban flood vulnerability', 'Coastal mangrove preservation and monitoring', 'Municipal solid waste recycling policies']::text[], array['GIS', 'Remote Sensing', 'Data Analytics']::text[],
  array['Coastal and Marine Environment Lab', 'Urban Geoinformatics Lab']::text[], array['Kalina Campus Central Research Facility']::text[], array['Water quality monitoring kits', 'GIS server nodes']::text[], array['Mumbai coastal water pollution assessments', 'Urban slum sanitation surveys']::text[],
  array['Brihanmumbai Municipal Corporation (BMC)', 'Mumbai Metropolitan Region Development Authority (MMRDA)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'University of Calcutta', 'University of Calcutta', 'State University', 'Historic university in eastern India with distinguished research in chemical technology, applied geology, delta geomorphology, and urban environmental health.',
  'https://www.caluniv.ac.in', 'West Bengal', 'Kolkata', 'Kolkata', 1857,
  array['Department of Applied Geology', 'Department of Chemical Technology', 'Department of Environmental Science']::text[], array['Water Resources', 'Environmental Engineering', 'Geotechnical Engineering', 'Waste Management']::text[], array['Hooghly estuary tidal dynamics', 'Groundwater heavy metal bio-remediation', 'Industrial tanning waste chemical degradation']::text[], array['Biotechnology', 'Chemical Processing', 'GIS']::text[],
  array['Hydro-geology and Mineralogy Lab', 'Environmental Chemistry Lab']::text[], array['Central Analytical Instrumentation Lab']::text[], array['X-ray fluorescence spectrometers', 'Atomic absorption spectrophotometers']::text[], array['Hooghly river water monitoring', 'Kolkata peri-urban wetland sampling']::text[],
  array['Kolkata Metropolitan Development Authority', 'West Bengal State Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Osmania University', 'Osmania University Hyderabad', 'State University', 'Prominent century-old university in Telangana with research expertise in urban hydrology (Musi river), geophysics, civil engineering, and environmental biology.',
  'https://www.osmania.ac.in', 'Telangana', 'Hyderabad', 'Hyderabad', 1918,
  array['University College of Engineering (Civil)', 'Department of Geophysics', 'Department of Environmental Science']::text[], array['Water Resources', 'Geotechnical Engineering', 'Environmental Engineering', 'Urban Planning']::text[], array['Musi river pollution mapping and bio-remediation', 'Hard-rock aquifer electrical resistivity profiling', 'Urban stormwater drainage']::text[], array['GIS', 'Geophysics', 'Remote Sensing']::text[],
  array['Geophysical Prospecting Lab', 'Environmental Testing Lab']::text[], array['Central Instrumentation Centre']::text[], array['Ground penetrating radar', 'Resistivity meters', 'Water quality testing equipment']::text[], array['Hyderabad municipal lake monitoring', 'Telangana groundwater geophysical exploration']::text[],
  array['Greater Hyderabad Municipal Corporation', 'Telangana Ground Water Department']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Panjab University', 'Panjab University Chandigarh', 'State University', 'Historic university in Chandigarh with active research in environmental chemistry, public health engineering, groundwater studies, and remote sensing.',
  'https://puchd.ac.in', 'Chandigarh', 'Chandigarh', 'Chandigarh', 1882,
  array['Department of Environment Studies', 'Department of Geology', 'University Institute of Applied Management Sciences']::text[], array['Environmental Engineering', 'Water Resources', 'Public Health', 'Waste Management']::text[], array['Sukhna lake wetland conservation', 'Groundwater nitrate and pesticide contamination', 'Plastic waste pyrolysis']::text[], array['GIS', 'Chemical Analytics', 'Waste Processing']::text[],
  array['Environmental Toxicology Lab', 'Geochemical Lab']::text[], array['Central Instrumentation Laboratory']::text[], array['Mass spectrometers', 'Surface water velocity meters']::text[], array['Chandigarh watershed conservation tracking', 'Rural Punjab drinking water quality surveys']::text[],
  array['Chandigarh Administration', 'Punjab Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Ranchi University', 'Ranchi University', 'State University', 'Major state university in the capital of Jharkhand with dedicated research departments in geology, environmental science, tribal studies, and regional groundwater resources.',
  'https://www.ranchiuniversity.ac.in', 'Jharkhand', 'Ranchi', 'Ranchi', 1960,
  array['Department of Geology', 'Department of Chemistry', 'Department of Botany', 'Department of Geography']::text[], array['Water Resources', 'Environmental Engineering', 'Waste Management', 'Geotechnical Engineering']::text[], array['Chota Nagpur plateau hydro-geology', 'Subarnarekha and Damodar river basin water quality', 'Fluoride contamination in Jharkhand drinking water']::text[], array['GIS', 'Remote Sensing', 'Chemical Water Testing']::text[],
  array['Hydrogeology Lab', 'Environmental Testing Lab']::text[], array['Central Computing Centre', 'University Science Instrumentation Centre']::text[], array['Flame photometers', 'Water testing spectrophotometers', 'Geological rock cutting and analysis tools']::text[], array['Jharkhand rural drinking water sampling', 'Subarnarekha river contamination mapping', 'Tribal area water harvesting site assessments']::text[],
  array['Jharkhand State Drinking Water and Sanitation Department', 'Jharkhand State Pollution Control Board', 'Ranchi Municipal Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIIT Hyderabad', 'International Institute of Information Technology, Hyderabad', 'IIIT', 'Leading computer science and information technology research institute with international standing in Smart Cities Living Lab, Computer Vision, AI, and IoT for civic systems.',
  'https://www.iiit.ac.in', 'Telangana', 'Hyderabad', 'Hyderabad', 1998,
  array['Kohli Centre on Intelligent Systems', 'Smart City Living Lab', 'Centre for Visual Information Technology', 'Earthquake Engineering Research Centre']::text[], array['Artificial Intelligence', 'IoT', 'Computer Vision', 'Urban Planning', 'Water Resources']::text[], array['Smart city IoT sensor deployments', 'Urban water network leak detection via sensors', 'Crowd and traffic computer vision monitoring', 'Earthquake building vulnerability']::text[], array['IoT', 'Computer Vision', 'Machine Learning', 'Edge Computing', 'Digital Twins', 'Sensor Networks']::text[],
  array['Smart City Living Lab', 'Computer Vision Lab', 'Robotics Research Centre', 'Building Science Lab']::text[], array['Smart City Testbed on Campus', 'CIE Incubator', 'High Performance AI Cluster']::text[], array['Dense urban environmental and water IoT nodes', 'High-frame rate visual cameras', 'Edge AI GPU processors']::text[], array['Hyderabad municipal smart water monitoring pilots', 'Air pollution hyper-local sensor network deployments']::text[],
  array['Ministry of Housing and Urban Affairs', 'Government of Telangana', 'Smart City Mission India']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIIT Bangalore', 'International Institute of Information Technology, Bangalore', 'IIIT', 'Premier IT institute specializing in data science for public good, digital public goods (MOSIP), spatial computing, and civic tech innovation.',
  'https://www.iiitb.ac.in', 'Karnataka', 'Bengaluru', 'Bengaluru Urban', 1999,
  array['Centre for Data Sciences', 'E-Governance Centre of Excellence', 'Networking and Communication']::text[], array['Artificial Intelligence', 'Data Analytics', 'GIS', 'IoT', 'Cybersecurity']::text[], array['Open source digital public infrastructure', 'Spatial analytics for municipal service delivery', 'Urban mobility data analytics']::text[], array['Cloud Computing', 'Machine Learning', 'GIS', 'Data Analytics', 'IoT']::text[],
  array['Data Science Lab', 'Spatial Computing Lab', 'Mobile Computing Lab']::text[], array['Innovation Centre', 'MOSIP Open Source Lab']::text[], array['High capacity cloud servers', 'Data analytics visualization wall']::text[], array['Bengaluru municipal data analytics pilots', 'E-governance portal stress testing']::text[],
  array['Government of Karnataka', 'National Health Authority', 'World Bank']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIIT Delhi', 'Indraprastha Institute of Information Technology Delhi', 'IIIT', 'State-autonomous research institute with strong focus on civic computing, urban mobility modeling, AI for healthcare, and smart governance.',
  'https://www.iiitd.ac.in', 'Delhi', 'New Delhi', 'South East Delhi', 2008,
  array['Department of Computer Science and Engineering', 'Department of Computational Biology', 'Department of Human-Centered Design']::text[], array['Artificial Intelligence', 'Transportation Engineering', 'IoT', 'Urban Planning']::text[], array['Public transit optimization (Delhi bus networks)', 'Urban air quality citizen sensing', 'Privacy-preserving data sharing in civic platforms']::text[], array['Machine Learning', 'IoT', 'Edge AI', 'Data Analytics']::text[],
  array['Urban Computing Lab', 'Design and Innovation Lab', 'Cybersecurity Lab']::text[], array['Centre for Artificial Intelligence', 'Technology Innovation Hub on Cognitive Computing']::text[], array['Edge AI computing servers', 'Mobile sensing test rigs']::text[], array['Delhi public transport tracking deployments', 'Crowdsourced air pollution sensing']::text[],
  array['Delhi Transport Corporation', 'Delhi Dialogue and Development Commission']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'IIIT Allahabad', 'Indian Institute of Information Technology Allahabad', 'IIIT', 'National institute of importance in information technology, bioinformatics, sensor networks, and software engineering for public systems.',
  'https://www.iiita.ac.in', 'Uttar Pradesh', 'Prayagraj', 'Prayagraj', 1999,
  array['Department of Information Technology', 'Department of Applied Sciences', 'Department of Electronics and Communication']::text[], array['Artificial Intelligence', 'IoT', 'Data Analytics', 'Cybersecurity']::text[], array['Wireless sensor networks for river monitoring', 'Biomedical data mining', 'Intelligent surveillance systems']::text[], array['IoT', 'Machine Learning', 'Sensor Networks', 'Cloud Computing']::text[],
  array['Wireless Sensor Network Lab', 'Robotics and Artificial Intelligence Lab']::text[], array['Centre of Excellence in Information Security', 'High Performance Computing Facility']::text[], array['Wireless sensor motes', 'Surveillance camera network with edge analytics']::text[], array['Riverbank wireless sensor network deployment', 'Crowd flow analysis during major events']::text[],
  array['Ministry of Electronics and Information Technology (MeitY)', 'UP Police Department']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'ABV-IIITM Gwalior', 'Atal Bihari Vajpayee Indian Institute of Information Technology and Management Gwalior', 'IIIT', 'Apex institute integrating IT and management, with research in supply chain optimization, smart energy management, and e-governance.',
  'https://www.iiitm.ac.in', 'Madhya Pradesh', 'Gwalior', 'Gwalior', 1997,
  array['Department of Information Technology', 'Department of Management Studies']::text[], array['Artificial Intelligence', 'Urban Planning', 'IoT', 'Data Analytics']::text[], array['Municipal resource supply chain optimization', 'Energy consumption forecasting in public buildings']::text[], array['Machine Learning', 'Optimization', 'Data Analytics']::text[],
  array['Data Analytics Lab', 'Embedded Systems Lab']::text[], array['Technology Innovation Centre']::text[], array['High performance servers', 'Smart energy power quality analyzers']::text[], array['Public building energy auditing', 'Municipal logistics routing simulation']::text[],
  array['Madhya Pradesh State Electronics Development Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'BITS Pilani', 'Birla Institute of Technology and Science, Pilani', 'University', 'Premier deemed university with an illustrious track record of innovation, desert water technology, semiconductor devices, and software entrepreneurship.',
  'https://www.bits-pilani.ac.in', 'Rajasthan', 'Pilani', 'Jhunjhunu', 1964,
  array['Department of Civil Engineering', 'Department of Computer Science and Information Systems', 'Department of Chemical Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Artificial Intelligence', 'Renewable Energy']::text[], array['Greywater recycling and reuse in arid regions', 'Smart micro-irrigation controller design', 'Decentralized water kiosks']::text[], array['IoT', 'Machine Learning', 'Water Filtration', 'GIS']::text[],
  array['Water and Waste Management Lab', 'Embedded Systems Lab', 'Environmental Engineering Lab']::text[], array['Technology Business Incubator (Pilani Innovation and Technology)', 'Central Analytical Lab']::text[], array['Membrane filtration pilot rigs', 'Soil moisture logging systems']::text[], array['Rajasthan rural greywater recycling pilots', 'Campus water self-sufficiency initiatives']::text[],
  array['Public Health Engineering Department Rajasthan', 'Industrial technology partners']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'BITS Pilani - Goa', 'BITS Pilani, K.K. Birla Goa Campus', 'University', 'Leading campus in coastal Goa conducting advanced research in environmental biotechnology, marine sensors, and decentralized sanitation.',
  'https://www.bits-pilani.ac.in/goa', 'Goa', 'Zuarinagar', 'South Goa', 2004,
  array['Department of Biological Sciences', 'Department of Chemical Engineering', 'Department of Computer Science']::text[], array['Environmental Engineering', 'Water Resources', 'Biotechnology', 'IoT']::text[], array['Microbial fuel cells for wastewater treatment', 'Automated water potability testing kits', 'Microplastic coastal pollution detection']::text[], array['Biotechnology', 'IoT', 'Sensors']::text[],
  array['Environmental Biotechnology Lab', 'Sensor Technology Lab']::text[], array['BITS BIRAC Bio-NEST Incubator']::text[], array['Bioreactors', 'Spectrophotometric water quality meters']::text[], array['Coastal marine water sampling', 'Community wastewater bio-treatment testing']::text[],
  array['Goa State Council for Science and Technology', 'National Institute of Oceanography']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'BITS Pilani - Hyderabad', 'BITS Pilani, Hyderabad Campus', 'University', 'Dynamic campus in Hyderabad focusing on clean water technologies, smart sensors, microfluidics, and pharmaceutical waste degradation.',
  'https://www.bits-pilani.ac.in/hyderabad', 'Telangana', 'Hyderabad', 'Medchal-Malkajgiri', 2008,
  array['Department of Civil Engineering', 'Department of Chemical Engineering', 'Department of Computer Science']::text[], array['Water Resources', 'Environmental Engineering', 'Materials Science', 'Artificial Intelligence']::text[], array['Degradation of pharmaceutical residues in urban water', 'Hydrodynamic cavitation for water disinfection', 'Smart water metering']::text[], array['Water Filtration', 'Cavitation Systems', 'IoT', 'Machine Learning']::text[],
  array['Environmental Engineering Lab', 'Microfluidics Lab']::text[], array['Central Analytical Lab', 'Technology Business Incubator']::text[], array['Hydrodynamic cavitation reactor', 'High performance liquid chromatograph with mass spectrometry']::text[], array['Industrial pharma effluent treatment pilots', 'Hyderabad urban lake water testing']::text[],
  array['Telangana State Pollution Control Board', 'Pharma industrial manufacturers']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'BIT Mesra', 'Birla Institute of Technology, Mesra', 'Engineering Institute', 'Historic premier engineering institute based in Ranchi, Jharkhand with distinguished capabilities in remote sensing, space engineering, environmental engineering, and water resources management.',
  'https://www.bitmesra.ac.in', 'Jharkhand', 'Ranchi', 'Ranchi', 1955,
  array['Department of Remote Sensing', 'Department of Civil and Environmental Engineering', 'Department of Computer Science and Engineering', 'Department of Space Engineering and Rocketry']::text[], array['Remote Sensing', 'GIS', 'Water Resources', 'Environmental Engineering', 'Disaster Management']::text[], array['Satellite image processing for land use and forest cover', 'Jharkhand groundwater potential zone mapping', 'Subarnarekha river water quality monitoring', 'Terrain analysis using DTM and LiDAR']::text[], array['GIS', 'Satellite Remote Sensing', 'Drones', 'IoT', 'Machine Learning']::text[],
  array['Digital Image Processing Lab', 'Photogrammetry and GIS Lab', 'Environmental Engineering Testing Lab', 'Surveying and Geomatics Lab']::text[], array['Department of Remote Sensing Satellite Data Processing Center', 'Central Instrumentation Facility', 'High Performance Computing Lab']::text[], array['LiDAR point cloud processing workstations', 'Differential GPS surveying systems', 'Spectroradiometer for spectral signature collection', 'Multi-parameter water quality probes']::text[], array['Jharkhand forest and watershed mapping', 'Damodar and Subarnarekha water quality sampling', 'Groundwater recharge site identification in Chota Nagpur']::text[],
  array['Jharkhand Space Applications Center (JSAC)', 'Jharkhand State Water Resources Department', 'ISRO Disaster Management Support Programme']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Delhi Technological University', 'Delhi Technological University', 'Engineering Institute', 'Formerly Delhi College of Engineering (DCE), a premier state university celebrated for automotive engineering, renewable energy, urban drainage, and environmental planning.',
  'https://www.dtu.ac.in', 'Delhi', 'New Delhi', 'North West Delhi', 1941,
  array['Department of Civil Engineering', 'Department of Environmental Engineering', 'Department of Computer Science and Engineering']::text[], array['Environmental Engineering', 'Transportation Engineering', 'Water Resources', 'Renewable Energy']::text[], array['Urban stormwater drainage modeling', 'Solid waste bio-stabilization', 'Vehicular emission reduction technology', 'Solar PV system efficiency']::text[], array['GIS', 'IoT', 'Machine Learning', 'Solar Energy Systems']::text[],
  array['Environmental Engineering Lab', 'Transportation Engineering Lab', 'Solar Energy Research Lab']::text[], array['Centre for Advanced Transportation Studies', 'Incubation and Innovation Foundation']::text[], array['Automated urban runoff water samplers', 'Exhaust gas emission analyzers', 'Pavement testing load frames']::text[], array['Delhi urban drainage network capacity analysis', 'Vehicular air pollution monitoring']::text[],
  array['Public Works Department Delhi', 'Municipal Corporation of Delhi', 'Delhi Metro Rail Corporation']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Netaji Subhas University of Technology', 'Netaji Subhas University of Technology', 'Engineering Institute', 'Leading technological university in Delhi focusing on embedded systems, IoT for civic utilities, signal processing, and sustainable computing.',
  'https://www.nsut.ac.in', 'Delhi', 'New Delhi', 'South West Delhi', 1983,
  array['Department of Computer Science and Engineering', 'Department of Electronics and Communication Engineering', 'Department of Civil Engineering']::text[], array['Artificial Intelligence', 'IoT', 'Smart Infrastructure', 'Water Resources']::text[], array['Smart water metering networks', 'Intelligent traffic video surveillance', 'Low power wireless sensor node design']::text[], array['IoT', 'Edge Computing', 'Machine Learning', 'Computer Vision']::text[],
  array['Embedded Systems Lab', 'Computer Vision & Image Processing Lab']::text[], array['Incubation and Innovation Centre']::text[], array['IoT development testbeds', 'High resolution video monitoring feeds']::text[], array['Urban pipeline leak telemetry testing', 'Campus smart energy monitoring']::text[],
  array['Delhi Jal Board', 'Traffic Police Delhi']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'COEP Technological University', 'COEP Technological University Pune', 'Engineering Institute', 'One of India''s oldest engineering colleges with legendary alumni, leading regional innovations in water supply engineering, urban drainage, and robotics.',
  'https://www.coep.org.in', 'Maharashtra', 'Pune', 'Pune', 1854,
  array['Department of Civil Engineering', 'Department of Computer Engineering', 'Department of Electrical Engineering']::text[], array['Civil Engineering', 'Water Resources', 'Robotics', 'Transportation Engineering']::text[], array['Municipal water distribution network optimization', 'Slope stabilization in Deccan basalt', 'Autonomous pipeline inspection robots']::text[], array['GIS', 'Robotics', 'Hydraulic Simulation', 'IoT']::text[],
  array['Fluid Mechanics and Hydraulics Lab', 'Geotechnical Engineering Lab', 'Robotics Lab']::text[], array['Bhau Institute of Innovation and Entrepreneurship']::text[], array['Pipe network hydraulic simulators', 'Pipe crawling robotic rovers', 'Soil triaxial testing machines']::text[], array['Pune water distribution network pressure audits', 'Ghat road slope stability inspections']::text[],
  array['Pune Municipal Corporation', 'Maharashtra Jeevan Pradhikaran (MJP)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'VJTI Mumbai', 'Veermata Jijabai Technological Institute', 'Engineering Institute', 'Historic engineering institute in Mumbai celebrated for structural safety, urban coastal hydrology, textile engineering, and municipal power distribution.',
  'https://vjti.ac.in', 'Maharashtra', 'Mumbai', 'Mumbai', 1887,
  array['Civil and Environmental Engineering Department', 'Computer Engineering Department', 'Electrical Engineering Department']::text[], array['Civil Engineering', 'Environmental Engineering', 'Water Resources', 'Urban Planning']::text[], array['Urban storm water pump station optimization', 'Seismic and structural retrofitting of old municipal buildings', 'Industrial textile effluent recycling']::text[], array['GIS', 'Structural Health Monitoring', 'Simulation']::text[],
  array['Structural Engineering Lab', 'Environmental Engineering Lab', 'Hydraulics Lab']::text[], array['Centre of Excellence in Complex and Nonlinear Dynamical Systems']::text[], array['Vibration shakers and accelerometers', 'Water quality testing analyzers']::text[], array['Mumbai urban flood pumping station audits', 'Structural safety inspections of civic bridges']::text[],
  array['Brihanmumbai Municipal Corporation', 'Mumbai Metropolitan Region Development Authority']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'PSG College of Technology', 'PSG College of Technology Coimbatore', 'Engineering Institute', 'Leading autonomous private engineering college in Tamil Nadu with strong industry collaboration in textile effluent treatment, foundry waste reuse, and automation.',
  'https://www.psgtech.edu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 1951,
  array['Civil Engineering', 'Textile Technology', 'Computer Science and Engineering', 'Mechanical Engineering']::text[], array['Waste Management', 'Environmental Engineering', 'Industrial Automation', 'Materials Science']::text[], array['Zero liquid discharge (ZLD) textile wastewater treatment', 'Foundry slag in geopolymer concrete', 'Energy efficient industrial motors']::text[], array['Membrane Separation', 'Materials Science', 'Automation', 'IoT']::text[],
  array['Environmental Engineering Lab', 'Centre for Nanotechnology']::text[], array['PSG-STEP Technology Business Incubator', 'Central Instrumentation Facility']::text[], array['Reverse osmosis pilot plants', 'Materials durability test chambers']::text[], array['Tirupur textile cluster effluent treatment audits', 'Concrete durability field trials']::text[],
  array['Tirupur Exporters Association', 'Tamil Nadu Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Thapar Institute', 'Thapar Institute of Engineering and Technology', 'University', 'Deemed-to-be-university in Patiala with advanced research in environmental biotechnology, groundwater contaminant transport, and industrial automation.',
  'https://www.thapar.edu', 'Punjab', 'Patiala', 'Patiala', 1956,
  array['Civil Engineering Department', 'Chemical Engineering Department', 'Computer Science and Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'Biotechnology', 'Renewable Energy']::text[], array['Groundwater contaminant plume tracking', 'Adsorption of heavy metals using agricultural wastes', 'Bio-remediation of contaminated soils']::text[], array['Biotechnology', 'Hydrological Modeling', 'GIS']::text[],
  array['Environmental Engineering Research Lab', 'Hydro-informatics Lab']::text[], array['Science and Technology Entrepreneurs Park (STEP)']::text[], array['Liquid chromatography mass spectrometers', 'Soil permeability measurement equipment']::text[], array['Punjab industrial belt groundwater testing', 'Bio-filter installation and validation']::text[],
  array['Punjab State Pollution Control Board', 'Department of Science and Technology']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Manipal Institute of Technology', 'Manipal Institute of Technology', 'Engineering Institute', 'Constituent institute of Manipal Academy of Higher Education with prominent research in water treatment, coastal zone mapping, and disaster mitigation.',
  'https://manipal.edu/mit.html', 'Karnataka', 'Manipal', 'Udupi', 1957,
  array['Department of Civil Engineering', 'Department of Computer Science and Engineering', 'Department of Chemical Engineering']::text[], array['Water Resources', 'Environmental Engineering', 'GIS', 'Urban Planning']::text[], array['Rainwater harvesting in coastal laterite terrains', 'Coastal water quality mapping', 'Municipal waste management']::text[], array['GIS', 'IoT', 'Water Filtration']::text[],
  array['Environmental Engineering Lab', 'Geoinformatics Lab']::text[], array['Manipal Universal Technology Business Incubator']::text[], array['Multiparameter water probes', 'GIS workstations']::text[], array['Udupi coastal watershed monitoring', 'Laterite soil filtration pilots']::text[],
  array['Udupi City Municipality', 'Karnataka State Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Vellore Institute of Technology', 'Vellore Institute of Technology, Vellore', 'University', 'Large research-oriented private university in Tamil Nadu leading studies in industrial leather wastewater treatment, sustainable materials, and smart energy.',
  'https://vit.ac.in', 'Tamil Nadu', 'Vellore', 'Vellore', 1984,
  array['School of Civil Engineering', 'School of Computer Science and Engineering', 'Centre for Disaster Mitigation and Management']::text[], array['Environmental Engineering', 'Water Resources', 'Waste Management', 'Disaster Management']::text[], array['Palar river basin groundwater contamination by tanneries', 'Chromium remediation from soil and water', 'Flood hazard mapping']::text[], array['Biotechnology', 'GIS', 'Machine Learning', 'Chemical Processing']::text[],
  array['Environmental Engineering Lab', 'Disaster Mitigation and Management Lab']::text[], array['Technology Business Incubator (VITTBI)', 'Central Instrumentation Facility']::text[], array['Atomic absorption spectrophotometers', 'UV-visible spectrophotometers', 'Water filtration skids']::text[], array['Palar river basin groundwater quality sampling', 'Tannery effluent treatment evaluation']::text[],
  array['Central Leather Research Institute', 'Tamil Nadu Pollution Control Board']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - NEERI', 'CSIR - National Environmental Engineering Research Institute', 'Government Research Organization', 'India''s apex environmental engineering institute, providing authoritative research, audit, and innovation in water purification, sewage treatment, air pollution, and environmental impact assessment.',
  'https://www.neeri.res.in', 'Maharashtra', 'Nagpur', 'Nagpur', 1958,
  array['Water Technology and Management Division', 'Wastewater Technology Division', 'Air Pollution Control Division', 'Solid and Hazardous Waste Management Division', 'Environmental Impact and Sustainability Division']::text[], array['Environmental Engineering', 'Water Resources', 'Waste Management', 'Air Quality Management', 'Public Health']::text[], array['NEERI-ZAR water purification technologies', 'Phytorid wetland wastewater treatment systems', 'Carrying capacity and environmental impact assessment', 'Urban air emission inventories', 'Hazardous industrial waste remediation']::text[], array['Water Filtration', 'Biotechnology', 'GIS', 'Chemical Analytics', 'Atmospheric Modeling']::text[],
  array['National Environmental Monitoring Lab', 'Wastewater Pilot Plant Facility', 'Air Quality Analytical Lab', 'Ecotoxicology Lab']::text[], array['CSIR-NEERI Zonal Centres (Delhi, Mumbai, Kolkata, Chennai, Hyderabad)', 'Central Instrumentation Centre']::text[], array['Gas chromatograph mass spectrometers', 'Inductively coupled plasma spectrometers', 'High volume particulate samplers', 'Pilot-scale Phytorid wetland beds']::text[], array['National environmental audit field teams', 'Phytorid municipal sewage wetland installations across India', 'Disaster post-contamination rapid water testing']::text[],
  array['Ministry of Environment, Forest and Climate Change (MoEFCC)', 'Central Pollution Control Board', 'State municipal corporations nationwide', 'Supreme Court appointed environmental committees']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - CRRI', 'CSIR - Central Road Research Institute', 'Government Research Organization', 'National institute for highway engineering, pavement technology, bridge maintenance, road safety, and traffic management in urban centers.',
  'https://crridom.gov.in', 'Delhi', 'New Delhi', 'South East Delhi', 1952,
  array['Pavement Engineering Area', 'Traffic and Transportation Planning Area', 'Bridge Engineering and Structures Area', 'Geotechnical Engineering Area']::text[], array['Transportation Engineering', 'Civil Engineering', 'Materials Science', 'Disaster Management']::text[], array['Waste plastic and rubber modified bitumen in road construction', 'Pothole repair quick-setting materials', 'Road safety audits and accident blackspot rectification', 'Bridge health monitoring and lifespan assessment']::text[], array['Materials Science', 'GIS', 'Simulation', 'Structural Health Monitoring']::text[],
  array['Bituminous Materials Testing Lab', 'Pavement Performance Lab', 'Soil and Slope Engineering Lab']::text[], array['Accelerated Pavement Testing Facility', 'Mobile Bridge Inspection Unit']::text[], array['Falling weight deflectometer', 'Laser road surface profilers', 'Automated traffic counting and classification systems']::text[], array['City road network pavement condition surveys', 'Highway slope stabilization field implementations', 'Bridge structural integrity inspections']::text[],
  array['Ministry of Road Transport and Highways (MoRTH)', 'National Highways Authority of India (NHAI)', 'Municipal road departments nationwide']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - CBRI', 'CSIR - Central Building Research Institute', 'Government Research Organization', 'National laboratory dedicated to housing technologies, disaster resilient construction, building materials from industrial waste, and heritage conservation.',
  'https://cbri.res.in', 'Uttarakhand', 'Roorkee', 'Haridwar', 1947,
  array['Structural Engineering Division', 'Clay Products and Building Materials Division', 'Geotechnical Engineering Division', 'Architecture and Planning Division']::text[], array['Civil Engineering', 'Disaster Management', 'Materials Science', 'Waste Management']::text[], array['Earthquake and cyclone resilient building designs', 'Fly-ash and slag based green cementitious blocks', 'Thermal comfort in affordable housing', 'Structural retrofitting']::text[], array['Materials Science', 'Structural Health Monitoring', 'Simulation']::text[],
  array['Fire Research Lab', 'Structural Dynamics Lab', 'Building Materials Testing Lab']::text[], array['Boundary Layer Wind Tunnel', 'Large scale test facility for structural components']::text[], array['Hydraulic loading jacks', 'Thermal conductivity apparatus', 'Ultrasonic non-destructive concrete testers']::text[], array['Post-disaster structural integrity assessments', 'Prefabricated rapid shelter pilot installations']::text[],
  array['Ministry of Housing and Urban Affairs', 'National Disaster Management Authority (NDMA)', 'State public works departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - NIO', 'CSIR - National Institute of Oceanography', 'Government Research Organization', 'National research institute dedicated to oceanographic studies, coastal environment protection, marine biology, and marine geophysics.',
  'https://www.nio.org', 'Goa', 'Dona Paula', 'North Goa', 1966,
  array['Physical Oceanography Division', 'Chemical Oceanography Division', 'Marine Ecology Division', 'Ocean Engineering Division']::text[], array['Coastal Engineering', 'Environmental Engineering', 'Water Resources', 'Climate Science']::text[], array['Coastal marine pollution and effluent dispersion modeling', 'Harbour and port sedimentation dynamics', 'Seawater quality monitoring in coastal states']::text[], array['Satellite Remote Sensing', 'GIS', 'Oceanographic Instrumentation', 'Numerical Modeling']::text[],
  array['Marine Chemistry Lab', 'Ocean Engineering and Acoustics Lab']::text[], array['Oceanographic Research Vessels (RV Sindhu Sadhana)', 'Regional Centres in Mumbai, Kochi, Visakhapatnam']::text[], array['Acoustic Doppler current profilers', 'CTD ocean probes', 'Multi-beam echo sounders']::text[], array['Offshore sewage outfall trajectory mapping', 'Coastal water environmental impact surveys']::text[],
  array['Ministry of Earth Sciences', 'Port authorities across Indian coastline', 'Coastal state pollution control boards']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - CMERI', 'CSIR - Central Mechanical Engineering Research Institute', 'Government Research Organization', 'Apex research laboratory for mechanical engineering, solar tree innovations, municipal solid waste processing machinery, and agricultural robotics.',
  'https://www.cmeri.res.in', 'West Bengal', 'Durgapur', 'Paschim Bardhaman', 1958,
  array['Clean Energy and Environmental Engineering', 'Robotics and Mechatronics Division', 'Manufacturing Technology Division']::text[], array['Waste Management', 'Renewable Energy', 'Robotics', 'Agricultural Engineering']::text[], array['Municipal solid waste automated mechanical segregation', 'Decentralized bio-methanation and waste-to-energy plants', 'Solar tree technology for urban spaces', 'Autonomous sub-surface drainage machinery']::text[], array['Robotics', 'Waste Processing Machinery', 'Solar Energy Systems', 'Automation']::text[],
  array['Solid Waste Processing Research Facility', 'Robotics and Automation Lab']::text[], array['Centre of Excellence for Farm Machinery (Ludhiana)', 'Central Prototyping Workshop']::text[], array['Municipal waste disintegrators and shredders', 'Automated optical waste sorters', 'Robotic mechanical arms']::text[], array['Municipal dry and wet waste plant pilot operations', 'Solar tree installations in urban parks']::text[],
  array['Municipal corporations nationwide', 'Department of Science and Technology', 'Ministry of New and Renewable Energy']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'CSIR - NGRI', 'CSIR - National Geophysical Research Institute', 'Government Research Organization', 'National research organization specializing in groundwater exploration in hard rock terrains, heliborne geophysics, seismology, and regional aquifer mapping.',
  'https://www.ngri.res.in', 'Telangana', 'Hyderabad', 'Hyderabad', 1961,
  array['Groundwater Division', 'Seismology Division', 'Geophysical Exploration Division']::text[], array['Geotechnical Engineering', 'Water Resources', 'Disaster Management', 'Remote Sensing']::text[], array['Heliborne electromagnetic aquifer mapping', 'Fractured hard-rock groundwater reserve modeling', 'Groundwater artificial recharge structure siting', 'Earthquake hazard assessment']::text[], array['Geophysics', 'GIS', 'Electromagnetic Imaging', 'Simulation']::text[],
  array['Heliborne Geophysical Data Processing Lab', 'Isotope Hydrology Lab', 'Geophysical Instrumentation Lab']::text[], array['National Seismological Network Station', 'High Performance Computing Facility']::text[], array['Transient electromagnetic sounding systems', 'Nuclear magnetic resonance groundwater probes', 'Broadband seismometers']::text[], array['Nationwide deep aquifer 3D mapping campaigns', 'Arid and hard-rock zone water exploration']::text[],
  array['Central Ground Water Board (CGWB)', 'Ministry of Jal Shakti', 'State groundwater departments']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'Indian Institute of Remote Sensing', 'Indian Institute of Remote Sensing (IIRS - ISRO)', 'Government Research Organization', 'Premier ISRO centre for training, education, and applied research in satellite remote sensing, photogrammetry, GIS, and geospatial applications for civic and disaster management.',
  'https://www.iirs.gov.in', 'Uttarakhand', 'Dehradun', 'Dehradun', 1966,
  array['Water Resources Department', 'Urban and Regional Studies Department', 'Agriculture and Soils Department', 'Disaster Management Studies Department', 'Geoinformatics Department']::text[], array['Remote Sensing', 'GIS', 'Water Resources', 'Urban Planning', 'Disaster Management', 'Precision Agriculture']::text[], array['Satellite based hydrological modeling and flood mapping', 'Urban land cover change and smart city 3D modeling', 'Crop health and drought assessment from space', 'Glacial lake outburst flood (GLOF) monitoring']::text[], array['Satellite Remote Sensing', 'GIS', 'Digital Elevation Models', 'Drones', 'Machine Learning']::text[],
  array['Digital Photogrammetry and LiDAR Lab', 'Water Resources Analysis Lab', 'Microwave Remote Sensing Lab']::text[], array['Geospatial Computing Facility', 'ISRO Satellite Data Reception Link']::text[], array['Hyperspectral field spectroradiometers', 'DGPS base and rover units', 'LiDAR processing servers']::text[], array['Real-time flood and cyclone satellite damage mapping', 'Himalayan glacier lake field ground-truthing', 'City 3D mapping deployments']::text[],
  array['Indian Space Research Organisation (ISRO)', 'National Disaster Management Authority', 'Town and Country Planning Organisations', 'Ministry of Jal Shakti']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'National Remote Sensing Centre', 'National Remote Sensing Centre (NRSC - ISRO)', 'Government Research Organization', 'Key ISRO operational centre responsible for satellite data acquisition, data dissemination, geospatial solutions, and operating the Bhuvan civic portal.',
  'https://www.nrsc.gov.in', 'Telangana', 'Hyderabad', 'Hyderabad', 1974,
  array['Water Resources Division', 'Land Resources Division', 'Disaster Management Support Division', 'Bhuvan Geoportal Division']::text[], array['Remote Sensing', 'GIS', 'Water Resources', 'Disaster Management', 'Urban Planning']::text[], array['Bhuvan platform for municipal civic asset mapping', 'National water body storage monitoring from space', 'Drought vulnerability classification across India', 'Disaster emergency operational support']::text[], array['Satellite Remote Sensing', 'GIS', 'Web Mapping Services', 'Cloud Computing', 'AI for Earth Observation']::text[],
  array['Earth Station Facility (Shadnagar)', 'Geospatial Innovation Lab']::text[], array['National Data Centre', 'Bhuvan Platform Cloud Infrastructure']::text[], array['Satellite downlink antennas', 'Petascale geospatial storage arrays', 'High-throughput satellite image processing pipelines']::text[], array['Nationwide disaster mapping field verification', 'Municipal spatial infrastructure integration']::text[],
  array['Central ministries nationwide', 'State remote sensing applications centers', 'Disaster management authorities']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'C-DAC Pune', 'Centre for Development of Advanced Computing Pune', 'Government Research Organization', 'Premier R&D organization of Ministry of Electronics and Information Technology (MeitY) executing supercomputing missions, multilingual computing, AI for governance, and smart city platforms.',
  'https://www.cdac.in', 'Maharashtra', 'Pune', 'Pune', 1988,
  array['High Performance Computing Division', 'Artificial Intelligence and Cognitive Computing Division', 'Smart Infrastructure Division', 'Health Informatics Division']::text[], array['Artificial Intelligence', 'High Performance Computing', 'IoT', 'Smart Infrastructure']::text[], array['PARAM supercomputing architecture deployment', 'AI models for multilingual citizen grievance translation', 'Smart city integrated command and control centre (ICCC) software', 'Disaster prediction numerical simulation']::text[], array['High Performance Computing', 'Machine Learning', 'Natural Language Processing', 'IoT', 'Digital Twins']::text[],
  array['National Supercomputing Lab', 'Smart Computing and IoT Lab', 'AI Innovation Centre']::text[], array['Param Yuva and National Supercomputer Param Siddhi AI (5+ Petaflops)']::text[], array['Petascale GPU supercomputers', 'Edge computing IoT gateways', 'High throughput network fabrics']::text[], array['Smart City ICCC platform deployments in Indian cities', 'Weather and climate numerical modeling runs']::text[],
  array['Ministry of Electronics and Information Technology (MeitY)', 'Department of Science and Technology (National Supercomputing Mission)', 'Municipal smart cities across India']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'National Institute of Urban Affairs', 'National Institute of Urban Affairs New Delhi', 'Government Research Organization', 'India''s leading national think tank on urban planning, smart city governance, climate change resilience in cities, and municipal finance.',
  'https://www.niua.in', 'Delhi', 'New Delhi', 'New Delhi', 1976,
  array['Climate Centre for Cities (C3)', 'Centre for Municipal Finance and Governance', 'Urban Planning and Infrastructure Division', 'National Urban Learning Platform']::text[], array['Urban Planning', 'Climate Science', 'Water Resources', 'Waste Management', 'Public Policy']::text[], array['Climate Smart Cities Assessment Framework', 'Urban river management plans (URMP)', 'Municipal solid waste management policy benchmarking', 'Water-sensitive urban design']::text[], array['GIS', 'Data Analytics', 'Policy Modeling']::text[],
  array['Urban Data Observatory', 'City Innovation Lab']::text[], array['Urban Knowledge Centre', 'National Urban Learning Platform Facility']::text[], array['Urban data analytics computing servers', 'GIS visualization boards']::text[], array['City-level climate action plan drafting and audits', 'Municipal administration capability training across 100+ smart cities']::text[],
  array['Ministry of Housing and Urban Affairs (MoHUA)', 'Smart Cities Mission', 'Town and Country Planning Organisation (TCPO)', '100+ Indian Municipal Corporations']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.institutions (
  name, official_name, institution_type, description, website, state, city, district, established_year,
  departments, research_domains, areas_of_expertise, technologies, laboratories, facilities,
  equipment, field_capabilities, collaboration_capabilities, verification_status, is_active
) values (
  'AIIMS New Delhi', 'All India Institute of Medical Sciences New Delhi', 'Medical/Health Research Institute', 'India''s apex medical science and public health research institution, leading national research in civic health risks, water-borne epidemics, air pollution health impacts, and hospital waste.',
  'https://www.aiims.edu', 'Delhi', 'New Delhi', 'New Delhi', 1956,
  array['Department of Community Medicine', 'Department of Environmental Medicine and Toxicology', 'Department of Microbiology', 'Department of Hospital Administration']::text[], array['Public Health', 'Environmental Engineering', 'Waste Management', 'Data Analytics']::text[], array['Water-borne pathogen surveillance and outbreak prediction', 'Airborne particulate matter human cardiopulmonary health impact', 'Biomedical waste sterilization and safe disposal', 'Community epidemiology']::text[], array['Biotechnology', 'Data Analytics', 'Epidemiological Modeling']::text[],
  array['National Public Health Surveillance Lab', 'Environmental Toxicology and Molecular Lab', 'Hospital Waste Management Treatment Plant']::text[], array['Centre for Community Medicine Research Network (Ballabgarh Comprehensive Rural Health Project)', 'Advanced Molecular Diagnostic Centre']::text[], array['Automated pathogen DNA sequencers', 'Air pollution personal exposure monitors', 'Biomedical autoclaves and shredders']::text[], array['Rural community health surveillance across villages', 'Municipal water-borne disease outbreak tracing', 'Hospital biomedical waste stream auditing']::text[],
  array['Ministry of Health and Family Welfare', 'Indian Council of Medical Research (ICMR)', 'World Health Organization (WHO)']::text[], 'VERIFIED', true
) on conflict (name) do update set
  official_name = excluded.official_name,
  institution_type = excluded.institution_type,
  description = excluded.description,
  website = excluded.website,
  state = excluded.state,
  city = excluded.city,
  district = excluded.district,
  established_year = excluded.established_year,
  departments = excluded.departments,
  research_domains = excluded.research_domains,
  areas_of_expertise = excluded.areas_of_expertise,
  technologies = excluded.technologies,
  laboratories = excluded.laboratories,
  facilities = excluded.facilities,
  equipment = excluded.equipment,
  field_capabilities = excluded.field_capabilities,
  collaboration_capabilities = excluded.collaboration_capabilities,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();
