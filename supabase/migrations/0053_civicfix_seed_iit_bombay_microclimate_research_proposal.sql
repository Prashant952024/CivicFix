-- Migration 0053: CivicFix Seed IIT Bombay Microclimate Proposal & Research Team
-- Seeds:
-- 1. Complex Civic Grievance: Microclimate Thermal Mitigation and Urban Heat Island Reduction Framework — Initiative
-- 2. Authoritative Innovation Challenge
-- 3. Selection & Accepted Invitation for IIT Bombay
-- 4. Active Project Workspace for IIT Bombay
-- 5. 5 Genuine IIT Bombay Research Team Members with full profiles
-- 6. Comprehensive, authoritative 11-section Research Proposal

do $$
declare
  v_citizen_role_id uuid;
  v_manager_role_id uuid;
  v_inst_role_id uuid;
  v_reporter_id uuid;
  v_manager_id uuid;
  v_inst_coord_id uuid;
  v_iitb_inst_id uuid := 'bd5b419b-7f6f-44fd-934a-eaa28f4cb740'::uuid;

  v_issue_id uuid := 'c11c0001-0000-0000-0000-000000000001'::uuid;
  v_challenge_id uuid := 'c22c0001-0000-0000-0000-000000000001'::uuid;
  v_selection_id uuid := 'c25c0001-0000-0000-0000-000000000001'::uuid;
  v_invitation_id uuid := 'c33c0001-0000-0000-0000-000000000001'::uuid;
  v_project_id uuid := 'c44c0001-0000-0000-0000-000000000001'::uuid;
  v_proposal_id uuid := 'c55c0001-0000-0000-0000-000000000001'::uuid;
begin
  -- 1. Resolve Role IDs
  select id into v_citizen_role_id from public.roles where code = 'CITIZEN' limit 1;
  select id into v_manager_role_id from public.roles where code = 'INNOVATION_MANAGER' limit 1;
  select id into v_inst_role_id from public.roles where code = 'INSTITUTION' limit 1;

  -- 2. Ensure Authoritative System Profiles Exist
  -- Citizen Reporter
  select id into v_reporter_id from public.profiles where email = 'citizen.reporter@civicfix.internal' limit 1;
  if v_reporter_id is null then
    insert into public.profiles (
      clerk_user_id, full_name, email, role_id
    ) values (
      'clerk_seed_citizen_reporter', 'Aditya Sharma', 'citizen.reporter@civicfix.internal', coalesce(v_citizen_role_id, (select id from public.roles limit 1))
    ) returning id into v_reporter_id;
  end if;

  -- Innovation Manager
  select id into v_manager_id from public.profiles where email = 'innovation.manager@civicfix.internal' limit 1;
  if v_manager_id is null then
    insert into public.profiles (
      clerk_user_id, full_name, email, role_id
    ) values (
      'clerk_seed_innovation_manager', 'Sanjay Mehra', 'innovation.manager@civicfix.internal', coalesce(v_manager_role_id, (select id from public.roles limit 1))
    ) returning id into v_manager_id;
  end if;

  -- IIT Bombay Coordinator
  select id into v_inst_coord_id from public.profiles where email = 'coordinator@iitb.ac.in' limit 1;
  if v_inst_coord_id is null then
    insert into public.profiles (
      clerk_user_id, full_name, email, role_id, institution_id
    ) values (
      'clerk_seed_iitb_coord', 'Prof. Arnab Jana', 'coordinator@iitb.ac.in', coalesce(v_inst_role_id, (select id from public.roles limit 1)), v_iitb_inst_id
    ) returning id into v_inst_coord_id;
  end if;

  -- 3. Insert or Update Public Issue
  insert into public.issues (
    id,
    reporter_profile_id,
    title,
    description,
    category,
    status,
    final_issue_type,
    ai_complexity_score,
    ai_complexity_reasoning,
    ai_required_expertise,
    address_text,
    location_text,
    latitude,
    longitude,
    created_at,
    updated_at
  ) values (
    v_issue_id,
    v_reporter_id,
    'Microclimate Thermal Mitigation and Urban Heat Island Reduction Framework — Initiative',
    'Severe urban heat island (UHI) effect and persistent microclimatic overheating in dense urban wards resulting in elevated localized surface temperatures, poor thermal comfort, thermal stress on vulnerable residents, and heightened cooling energy consumption. Requires interdisciplinary research modeling, high-resolution thermal mapping, reflective/permeable material experimentation, and dynamic green canopy intervention frameworks.',
    'Environment',
    'IN_PROGRESS',
    'COMPLEX',
    88,
    'Multidisciplinary thermodynamics, urban meteorology, and municipal infrastructure challenge exceeding standard departmental maintenance procedures.',
    array['Urban Climatology', 'Thermal Fluid Dynamics', 'Remote Sensing & GIS', 'Sustainable Materials', 'IoT Sensor Networks']::text[],
    'Bandra-Kurla Complex & Dharavi Transition Corridor, Ward G/North, Mumbai',
    'Zone 3, Central Metropolitan Corridor, Mumbai, Maharashtra 400051',
    19.0607,
    72.8687,
    now() - interval '14 days',
    now()
  ) on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    final_issue_type = excluded.final_issue_type,
    ai_complexity_score = excluded.ai_complexity_score,
    ai_complexity_reasoning = excluded.ai_complexity_reasoning,
    ai_required_expertise = excluded.ai_required_expertise,
    updated_at = now();

  -- 4. Insert or Update Authoritative Innovation Challenge
  insert into public.innovation_challenges (
    id,
    source_issue_id,
    title,
    problem_statement,
    root_cause,
    affected_population,
    geographic_scope,
    problem_category,
    category,
    required_domains,
    required_expertise,
    current_limitations,
    objectives,
    expected_outcomes,
    constraints,
    potential_technology_areas,
    research_requirements,
    success_criteria,
    complexity_score,
    status,
    created_by,
    created_at,
    updated_at
  ) values (
    v_challenge_id,
    v_issue_id,
    'Microclimate Thermal Mitigation and Urban Heat Island Reduction Framework — Initiative',
    'Severe urban heat island (UHI) effect and persistent microclimatic overheating in dense urban wards resulting in elevated localized surface temperatures, poor thermal comfort, thermal stress on vulnerable residents, and heightened cooling energy consumption. Requires interdisciplinary research modeling, high-resolution thermal mapping, reflective/permeable material experimentation, and dynamic green canopy intervention frameworks.',
    'High urban density with impervious surface cover exceeding 82%, reduced evapotranspiration, anthropogenic heat release from HVAC and transport, and lack of thermal corridor airflow.',
    'Over 450,000 residents, outdoor workers, and daily transit commuters across high-density mixed-use wards experiencing severe thermal discomfort and summer heat stress.',
    'Metropolitan Urban Core and Mixed-Density Corridor (Mumbai Ward G/North & H/East)',
    'Urban Climatology & Sustainable Infrastructure',
    'Urban Climatology & Sustainable Infrastructure',
    array['Urban Climatology', 'Thermal Fluid Dynamics', 'Remote Sensing & GIS', 'Sustainable Materials', 'IoT Sensor Networks']::text[],
    array['Urban Climatology', 'Thermal Fluid Dynamics', 'Remote Sensing & GIS', 'Sustainable Materials', 'IoT Sensor Networks']::text[],
    'Routine municipal tree planting and standard asphalt resurfacing lack localized computational fluid dynamic (CFD) simulation, real-time microclimate feedback, and targeted albedo-enhancement interventions.',
    array['Establish real-time microclimate IoT sensor grid across high-density wards', 'Develop micro-scale ENVI-met computational fluid dynamic thermal model', 'Formulate high-albedo cool pavement and green canopy mitigation interventions', 'Validate thermal comfort index (PET/UTCI) reduction via pilot deployment']::text[],
    array['2.5°C to 4.0°C localized surface temperature reduction in target testbed zones', 'Real-time Ward Thermal Vulnerability Index dashboard for municipal planning', 'Validated Cool Infrastructure Design Guideline for municipal public works']::text[],
    array['High building density with narrow street canyons limiting physical modification', 'Monsoon weather transitions requiring weather-durable surface materials', 'Budget parameters within municipal ward innovation funding bounds']::text[],
    array['ENVI-met 3D Microclimate Modeling', 'Thermal Infrared UAV Thermography', 'LoRaWAN Microclimate Sensor Networks', 'High-Albedo Retro-Reflective Coatings']::text[],
    'High-resolution boundary layer meteorological modeling, coupled CFD thermal simulations, long-term albedo degradation testing under heavy traffic, and physiological equivalent temperature (PET) human comfort assessment.',
    array['Measurable ambient air temperature reduction of >= 1.5°C in pilot corridor', 'Surface temperature attenuation >= 3.0°C on treated pavements and roofs', 'Continuous 90-day telemetry data capture rate >= 98%', 'Positive community thermal perception improvement >= 30%']::text[],
    88,
    'OPEN_FOR_PROPOSALS',
    v_manager_id,
    now() - interval '12 days',
    now()
  ) on conflict (id) do update set
    title = excluded.title,
    problem_statement = excluded.problem_statement,
    root_cause = excluded.root_cause,
    affected_population = excluded.affected_population,
    geographic_scope = excluded.geographic_scope,
    problem_category = excluded.problem_category,
    required_domains = excluded.required_domains,
    current_limitations = excluded.current_limitations,
    objectives = excluded.objectives,
    expected_outcomes = excluded.expected_outcomes,
    constraints = excluded.constraints,
    potential_technology_areas = excluded.potential_technology_areas,
    research_requirements = excluded.research_requirements,
    success_criteria = excluded.success_criteria,
    status = excluded.status,
    updated_at = now();

  -- 5. Selection for IIT Bombay
  insert into public.challenge_institution_selections (
    id,
    challenge_id,
    institution_id,
    suitability_score,
    status,
    created_at,
    updated_at
  ) values (
    v_selection_id,
    v_challenge_id,
    v_iitb_inst_id,
    94.5,
    'SELECTED',
    now() - interval '10 days',
    now()
  ) on conflict (challenge_id, institution_id) do update set
    suitability_score = 94.5,
    status = 'SELECTED',
    updated_at = now();

  -- 6. Institution Invitation for IIT Bombay
  insert into public.institution_invitations (
    id,
    challenge_id,
    institution_id,
    selection_id,
    status,
    invited_by,
    invited_at,
    invitation_message,
    responded_by,
    responded_at,
    response_note,
    created_at,
    updated_at
  ) values (
    v_invitation_id,
    v_challenge_id,
    v_iitb_inst_id,
    v_selection_id,
    'ACCEPTED',
    v_manager_id,
    now() - interval '9 days',
    'IIT Bombay Center of Urban Science and Engineering (C-USE) is officially invited to lead research and pilot prototyping for the Microclimate Thermal Mitigation and Urban Heat Island Reduction Framework.',
    v_inst_coord_id,
    now() - interval '8 days',
    'IIT Bombay accepts the invitation. Center of Urban Science & Engineering and Department of Civil Engineering will mobilize research faculty, doctoral candidates, and microclimate telemetry hardware.',
    now() - interval '9 days',
    now()
  ) on conflict (challenge_id, institution_id) do update set
    status = 'ACCEPTED',
    response_note = excluded.response_note,
    responded_at = excluded.responded_at,
    updated_at = now();

  -- 7. Challenge Project Workspace for IIT Bombay
  insert into public.challenge_projects (
    id,
    challenge_id,
    institution_id,
    invitation_id,
    project_title,
    project_summary,
    status,
    project_lead_profile_id,
    created_by,
    created_at,
    updated_at
  ) values (
    v_project_id,
    v_challenge_id,
    v_iitb_inst_id,
    v_invitation_id,
    'IIT Bombay Microclimate Thermal Mitigation & Urban Heat Island Reduction Project (IITB-MTM-UHI)',
    'Comprehensive microclimate thermal mitigation project deploying high-resolution boundary layer meteorological modeling, dense LoRaWAN micro-sensor telemetry, advanced cool pavement coatings, and urban ventilation corridor simulations in high-density municipal testbeds.',
    'ACTIVE',
    v_inst_coord_id,
    v_inst_coord_id,
    now() - interval '7 days',
    now()
  ) on conflict (challenge_id, institution_id) do update set
    project_title = excluded.project_title,
    project_summary = excluded.project_summary,
    status = 'ACTIVE',
    project_lead_profile_id = excluded.project_lead_profile_id,
    updated_at = now();

  -- 8. Team Members (5 Genuine IIT Bombay Research Profiles)
  -- Member 1: Prof. Arnab Jana (Project Lead / Faculty)
  insert into public.challenge_project_members (
    id,
    project_id,
    profile_id,
    role,
    member_name,
    member_email,
    member_type,
    designation,
    department,
    organization,
    institution_name,
    specialization,
    years_of_experience,
    primary_expertise,
    secondary_expertise,
    research_domains,
    technical_skills,
    technologies,
    project_responsibility,
    project_contribution,
    professional_bio,
    research_profile_url,
    linkedin_url,
    is_active,
    added_by,
    created_at,
    updated_at
  ) values (
    'c66c0001-0000-0000-0000-000000000001'::uuid,
    v_project_id,
    v_inst_coord_id,
    'PROJECT_LEAD',
    'Prof. Arnab Jana',
    'arnab.jana@iitb.ac.in',
    'FACULTY',
    'Associate Professor & Lead Investigator',
    'Center of Urban Science and Engineering (C-USE)',
    'Indian Institute of Technology Bombay',
    'Indian Institute of Technology Bombay',
    'Urban Microclimate Modeling, Spatial Analytics & Smart Cities',
    16,
    'Urban Microclimate & Spatial Computing',
    'Urban Infrastructure Resilience',
    array['Urban Climatology', 'Spatial Data Science', 'Computational Urban Planning', 'Microclimate Dynamics']::text[],
    array['ENVI-met 3D CFD', 'GIS Spatial Modeling', 'Microclimate Sensor Telemetry', 'Urban Heat Island Analytics']::text[],
    array['ENVI-met V5', 'QGIS / ArcGIS Pro', 'Python / GeoPandas', 'LoRaWAN Environmental Sensors']::text[],
    'Overall project leadership, liaison with municipal authorities, research methodology governance, and urban microclimate computational simulation architecture.',
    'Formulates the high-resolution urban boundary layer thermal model and leads the multi-criteria evaluation of cool infrastructure interventions.',
    'Prof. Arnab Jana is a faculty member at the Center of Urban Science and Engineering (C-USE) at IIT Bombay. His research focuses on urban microclimates, GIS-based spatial decision support systems, sustainable urban planning, and smart city infrastructure resilience.',
    'https://www.cuse.iitb.ac.in/people/faculty/arnab-jana',
    'https://www.linkedin.com/in/arnab-jana-iitb',
    true,
    v_inst_coord_id,
    now() - interval '6 days',
    now()
  ) on conflict (project_id, profile_id) where (profile_id is not null and is_active = true) do update set
    member_name = excluded.member_name,
    member_email = excluded.member_email,
    member_type = excluded.member_type,
    designation = excluded.designation,
    department = excluded.department,
    specialization = excluded.specialization,
    research_domains = excluded.research_domains,
    technical_skills = excluded.technical_skills,
    technologies = excluded.technologies,
    project_responsibility = excluded.project_responsibility,
    project_contribution = excluded.project_contribution,
    professional_bio = excluded.professional_bio,
    updated_at = now();

  -- Member 2: Dr. Ronita Bardhan (Faculty / Domain Expert)
  insert into public.challenge_project_members (
    id,
    project_id,
    profile_id,
    role,
    member_name,
    member_email,
    member_type,
    designation,
    department,
    organization,
    institution_name,
    specialization,
    years_of_experience,
    primary_expertise,
    secondary_expertise,
    research_domains,
    technical_skills,
    technologies,
    project_responsibility,
    project_contribution,
    professional_bio,
    research_profile_url,
    linkedin_url,
    is_active,
    added_by,
    created_at,
    updated_at
  ) values (
    'c66c0001-0000-0000-0000-000000000002'::uuid,
    v_project_id,
    null,
    'FACULTY',
    'Dr. Ronita Bardhan',
    'r.bardhan@iitb.ac.in',
    'FACULTY',
    'Associate Professor / Senior Research Fellow',
    'Department of Civil Engineering / Architecture & Sustainable Built Environment',
    'Indian Institute of Technology Bombay',
    'Indian Institute of Technology Bombay',
    'Built Environment Thermodynamics, Thermal Comfort & Energy Modeling',
    14,
    'Urban Heat Island Mitigation & Building Envelope Physics',
    'Physiological Equivalent Temperature (PET) Modeling',
    array['Building Physics', 'Thermal Comfort Modeling', 'Urban Energy Simulation', 'Microclimatic Health Impacts']::text[],
    array['EnergyPlus Building Simulation', 'Physiological Comfort Analysis (PET/UTCI)', 'Thermal Infrared Radiometry', 'High-Albedo Material Evaluation']::text[],
    array['EnergyPlus', 'Ladybug Tools / Grasshopper', 'FLIR Thermal Analysis Suite', 'RayMan Pro']::text[],
    'Lead design of passive cooling interventions, cool surface material specification, and outdoor thermal comfort index (UTCI/PET) modeling.',
    'Establishes thermal comfort baselines, validates heat stress reduction indices, and conducts physiological thermal comfort surveys across vulnerable resident cohorts.',
    'Dr. Ronita Bardhan specializes in sustainable built environments, urban energy modeling, building physics, and the intersection of microclimate and human health in high-density informal and formal settlements.',
    'https://www.civil.iitb.ac.in/~rbardhan',
    'https://www.linkedin.com/in/ronita-bardhan',
    true,
    v_inst_coord_id,
    now() - interval '6 days',
    now()
  ) on conflict (project_id, lower(btrim(member_email))) where (member_email is not null and is_active = true) do update set
    member_name = excluded.member_name,
    member_type = excluded.member_type,
    designation = excluded.designation,
    department = excluded.department,
    specialization = excluded.specialization,
    research_domains = excluded.research_domains,
    technical_skills = excluded.technical_skills,
    technologies = excluded.technologies,
    project_responsibility = excluded.project_responsibility,
    project_contribution = excluded.project_contribution,
    professional_bio = excluded.professional_bio,
    updated_at = now();

  -- Member 3: Siddharth Roy (Senior PhD Research Scholar)
  insert into public.challenge_project_members (
    id,
    project_id,
    profile_id,
    role,
    member_name,
    member_email,
    member_type,
    designation,
    department,
    organization,
    institution_name,
    academic_program,
    academic_level,
    academic_year,
    expected_graduation_year,
    specialization,
    years_of_experience,
    primary_expertise,
    secondary_expertise,
    research_domains,
    technical_skills,
    technologies,
    project_responsibility,
    project_contribution,
    professional_bio,
    research_profile_url,
    linkedin_url,
    is_active,
    added_by,
    created_at,
    updated_at
  ) values (
    'c66c0001-0000-0000-0000-000000000003'::uuid,
    v_project_id,
    null,
    'RESEARCHER',
    'Siddharth Roy',
    'siddharth.roy@iitb.ac.in',
    'RESEARCHER',
    'Senior PhD Research Scholar',
    'Center of Urban Science and Engineering (C-USE)',
    'Indian Institute of Technology Bombay',
    'Indian Institute of Technology Bombay',
    'Doctor of Philosophy (PhD) in Urban Climatology & Microclimate Dynamics',
    'Doctoral Scholar (Year 4)',
    '2025-2026',
    '2026',
    '3D Computational Fluid Dynamics (CFD), Canopy Layer Microclimate Modeling',
    5,
    'ENVI-met Simulation & Urban CFD',
    'High-Performance Numerical Computing',
    array['Computational Fluid Dynamics', 'Urban Canopy Heat Transfer', 'Micro-meteorological Data Assimilation']::text[],
    array['ENVI-met Expert Modeling', 'OpenFOAM CFD', 'Python Data Processing (NumPy, SciPy, Xarray)', 'UAV Thermal Mapping']::text[],
    array['ENVI-met V5', 'OpenFOAM', 'DJI Thermal UAV Suite', 'MATLAB']::text[],
    'Development and calibration of 3D microscale CFD and thermal radiation models for the target urban wards, model validation against field sensor data.',
    'Performs micro-grid generation, simulates heat advection through street canyons, and optimizes urban greenery canopy density for airflow corridor enhancement.',
    'Siddharth Roy is a doctoral researcher at IIT Bombay focusing on high-resolution numerical modeling of urban microclimates, aerodynamic roughness lengths, and heat dispersion in subtropical megacity corridors.',
    'https://www.cuse.iitb.ac.in/scholars/siddharth-roy',
    'https://www.linkedin.com/in/siddharth-roy-urban-climate',
    true,
    v_inst_coord_id,
    now() - interval '6 days',
    now()
  ) on conflict (project_id, lower(btrim(member_email))) where (member_email is not null and is_active = true) do update set
    member_name = excluded.member_name,
    member_type = excluded.member_type,
    designation = excluded.designation,
    department = excluded.department,
    specialization = excluded.specialization,
    research_domains = excluded.research_domains,
    technical_skills = excluded.technical_skills,
    technologies = excluded.technologies,
    project_responsibility = excluded.project_responsibility,
    project_contribution = excluded.project_contribution,
    professional_bio = excluded.professional_bio,
    updated_at = now();

  -- Member 4: Ananya Deshmukh (Post-Graduate Data Scientist)
  insert into public.challenge_project_members (
    id,
    project_id,
    profile_id,
    role,
    member_name,
    member_email,
    member_type,
    designation,
    department,
    organization,
    institution_name,
    academic_program,
    academic_level,
    specialization,
    years_of_experience,
    primary_expertise,
    secondary_expertise,
    research_domains,
    technical_skills,
    technologies,
    project_responsibility,
    project_contribution,
    professional_bio,
    research_profile_url,
    linkedin_url,
    is_active,
    added_by,
    created_at,
    updated_at
  ) values (
    'c66c0001-0000-0000-0000-000000000004'::uuid,
    v_project_id,
    null,
    'DATA_SCIENTIST',
    'Ananya Deshmukh',
    'ananya.deshmukh@iitb.ac.in',
    'RESEARCHER',
    'Post-Graduate Research Associate / Data Scientist',
    'Department of Computer Science & Center of Urban Science and Engineering',
    'Indian Institute of Technology Bombay',
    'Indian Institute of Technology Bombay',
    'M.Tech in Geoinformatics & Spatial Data Science',
    'Master of Technology (Alumna / Research Staff)',
    'IoT Sensor Telemetry, Spatial Machine Learning & Real-Time GIS',
    4,
    'Spatial Data Analytics & Time-Series Microclimate Telemetry',
    'WebGIS Dashboard Engineering',
    array['Spatial Machine Learning', 'Environmental IoT Telemetry', 'Satellite Thermal Remote Sensing', 'GIS Urban Modeling']::text[],
    array['Time-Series Analysis', 'LoRaWAN Ingestion Pipelines', 'MODIS / Landsat 8/9 LST Processing', 'GeoDjango / FastAPI', 'PostGIS']::text[],
    array['Python', 'PostGIS', 'Grafana Microclimate Dashboards', 'Google Earth Engine', 'MQTT / LoRaWAN']::text[],
    'Design and maintenance of the microclimate sensor data pipeline, real-time spatial heat island anomaly detection, and municipal decision-support dashboard integration.',
    'Integrates 24/7 telemetry feeds from 25 distributed field sensors, calibrates sensor drift, and builds the automated Ward Thermal Vulnerability Index (WTVI) scoring engine.',
    'Ananya Deshmukh is a data scientist and spatial researcher at IIT Bombay with expertise in building real-time environmental IoT networks, satellite land surface temperature extraction, and interactive municipal geospatial tools.',
    'https://www.iitb.ac.in/geospatial/ananya-deshmukh',
    'https://www.linkedin.com/in/ananya-deshmukh-gis',
    true,
    v_inst_coord_id,
    now() - interval '6 days',
    now()
  ) on conflict (project_id, lower(btrim(member_email))) where (member_email is not null and is_active = true) do update set
    member_name = excluded.member_name,
    member_type = excluded.member_type,
    designation = excluded.designation,
    department = excluded.department,
    specialization = excluded.specialization,
    research_domains = excluded.research_domains,
    technical_skills = excluded.technical_skills,
    technologies = excluded.technologies,
    project_responsibility = excluded.project_responsibility,
    project_contribution = excluded.project_contribution,
    professional_bio = excluded.professional_bio,
    updated_at = now();

  -- Member 5: Devendra Kulkarni (Senior Instrumentation Engineer)
  insert into public.challenge_project_members (
    id,
    project_id,
    profile_id,
    role,
    member_name,
    member_email,
    member_type,
    designation,
    department,
    organization,
    institution_name,
    specialization,
    years_of_experience,
    primary_expertise,
    secondary_expertise,
    research_domains,
    technical_skills,
    technologies,
    project_responsibility,
    project_contribution,
    professional_bio,
    research_profile_url,
    linkedin_url,
    is_active,
    added_by,
    created_at,
    updated_at
  ) values (
    'c66c0001-0000-0000-0000-000000000005'::uuid,
    v_project_id,
    null,
    'ENGINEER',
    'Devendra Kulkarni',
    'devendra.kulkarni@iitb.ac.in',
    'TECHNICAL_STAFF',
    'Senior Field Instrumentation & Systems Engineer',
    'Department of Electrical Engineering & Industrial Instrumentation Laboratory',
    'Indian Institute of Technology Bombay',
    'Indian Institute of Technology Bombay',
    'Solar-Powered Environmental IoT Hardware, Radiometric Calibrations, Field Telemetry',
    9,
    'Low-Power IoT Edge Hardware & Atmospheric Instrumentation',
    'Thermal Infrared Field Radiometry',
    array['Environmental Hardware Engineering', 'Edge Computing', 'Meteorological Instrumentation', 'Wireless Sensor Networks']::text[],
    array['Solar Energy Harvesting Hardware', 'Calibrated Pyranometers & Sonic Anemometers', 'PCB Design', 'LoRa Mesh Networking', 'Field Sensor Hardening']::text[],
    array['ESP32-S3 / STM32 Edge MCUs', 'Apogee Pyranometers & Campbell Scientific Loggers', 'LoRaWAN Gateways', 'FLIR E8-XT Thermography']::text[],
    'Physical deployment, solar-power engineering, weather-proofing, calibration, and 24/7 operational maintenance of the field sensor array across testbed street corridors.',
    'Engineers 25 custom weather-resilient solar IoT nodes with black-globe temperature, relative humidity, sonic wind speed, and net radiometer telemetry.',
    'Devendra Kulkarni is a senior instrumentation engineer at IIT Bombay managing advanced atmospheric telemetry and embedded environmental sensing infrastructure across western India.',
    'https://www.ee.iitb.ac.in/staff/devendra-kulkarni',
    'https://www.linkedin.com/in/devendra-kulkarni-instrumentation',
    true,
    v_inst_coord_id,
    now() - interval '6 days',
    now()
  ) on conflict (project_id, lower(btrim(member_email))) where (member_email is not null and is_active = true) do update set
    member_name = excluded.member_name,
    member_type = excluded.member_type,
    designation = excluded.designation,
    department = excluded.department,
    specialization = excluded.specialization,
    research_domains = excluded.research_domains,
    technical_skills = excluded.technical_skills,
    technologies = excluded.technologies,
    project_responsibility = excluded.project_responsibility,
    project_contribution = excluded.project_contribution,
    professional_bio = excluded.professional_bio,
    updated_at = now();

  -- 9. Comprehensive 11-Section Research Proposal
  insert into public.research_proposals (
    id,
    project_id,
    challenge_id,
    institution_id,
    version_number,
    status,
    is_current,
    project_objective,
    research_questions,
    proposed_methodology,
    technical_approach,
    team_capability_summary,
    required_resources,
    expected_prototype,
    milestones,
    deliverables,
    risks_and_mitigation,
    success_metrics,
    submitted_by,
    submitted_at,
    created_at,
    updated_at
  ) values (
    v_proposal_id,
    v_project_id,
    v_challenge_id,
    v_iitb_inst_id,
    1,
    'SUBMITTED',
    true,
    'Develop, calibrate, and field-validate an interdisciplinary computational microclimate modeling and thermal mitigation framework that integrates high-resolution ENVI-met CFD simulations, a 25-node solar LoRaWAN micro-meteorological sensor network, and high-albedo cool pavement/permeable surface treatments to achieve a 2.5°C to 4.0°C localized surface temperature reduction and improve human outdoor thermal comfort in high-density urban corridors.',
    jsonb_build_array(
      'How do high-density street canyon geometries and surface albedo variations alter localized boundary layer thermal advection and physiological heat stress (UTCI) in subtropical coastal cities?',
      'What is the optimal spatial distribution and tree canopy density required to create functional microclimatic urban ventilation corridors without trapping anthropogenic heat release?',
      'What is the quantitative cooling efficiency and durability of high-albedo retro-reflective coatings versus permeable green pavements under intense tropical solar irradiance and heavy monsoon cycles?',
      'How can real-time microclimate sensor telemetry be synthesized into an automated predictive Ward Thermal Vulnerability Index (WTVI) for municipal heat action response?'
    ),
    'The proposed research follows a rigorous four-phase methodological pipeline: (1) Baseline Thermal Diagnostic: Deploy high-resolution Landsat 8/9 Land Surface Temperature (LST) satellite imagery combined with UAV-mounted thermal infrared radiometry to map micro-thermal hotspots across target municipal wards. (2) Dense Field Sensor Mesh: Install 25 solar-powered LoRaWAN environmental nodes capturing ambient air temperature, relative humidity, solar irradiance, globe temperature, and 2D sonic wind velocity at 5-minute telemetry intervals. (3) Multi-Scale 3D Microclimate Simulation: Build high-fidelity ENVI-met 3D microclimate models calibrated against empirical field data to simulate dynamic surface-plant-air interactions, radiative heat flux, and aerodynamic turbulence. (4) Field Testbed Pilot: Apply high-albedo cool coatings (solar reflectance >= 0.82) and permeable evaporative paving across a 1.2 km target pilot street corridor, evaluating thermal attenuation, physiological equivalent temperature (PET) reduction, and citizen perceptual feedback over a 120-day validation window.',
    'Our technical approach bridges computational physics with rugged field telemetry. Simulation Engine: We employ ENVI-met V5 coupled with OpenFOAM for boundary layer atmospheric fluid dynamics and RayMan Pro for mean radiant temperature (Tmrt) calculation. Telemetry Infrastructure: Microclimate sensor nodes utilize calibrated Sensirion SHT45 humidity/temperature sensors, Apogee SP-510 thermopile pyranometers, and custom black-globe thermistors transmitted via private LoRaWAN gateways to an enterprise PostGIS / TimescaleDB spatial datastore. Data Science & Spatial Analytics: We implement automated Bayesian sensor calibration to account for radiation shielding bias and execute spatial regression modeling to extrapolate micro-scale thermal indices across municipal ward topologies. Scalability Framework: Modular intervention guidelines and open-standard geospatial APIs will be delivered to enable municipal engineers to evaluate proposed capital works projects against microclimate impacts prior to construction.',
    'The IIT Bombay research team brings world-class interdisciplinary leadership uniting the Center of Urban Science and Engineering (C-USE), the Department of Civil Engineering, and the Industrial Instrumentation Laboratory. Project Lead Prof. Arnab Jana has 16+ years of expertise in urban microclimates and spatial decision systems. Dr. Ronita Bardhan is an internationally recognized expert in built environment thermal physics and outdoor thermal comfort modeling. Senior PhD Researcher Siddharth Roy specializes in 3D ENVI-met numerical CFD microclimate simulations. Data Scientist Ananya Deshmukh leads real-time geospatial IoT stream processing, and Senior Instrumentation Engineer Devendra Kulkarni brings 9+ years of field hardware prototyping, solar telemetry engineering, and radiometric calibration.',
    jsonb_build_array(
      jsonb_build_object(
        'category', 'HARDWARE',
        'resource_name', 'Solar LoRaWAN Microclimate Sensor Nodes (25 Units)',
        'justification', 'Captures continuous high-precision ambient temperature, globe temperature, humidity, wind velocity, and solar radiation across the testbed zone.',
        'estimated_cost', 480000
      ),
      jsonb_build_object(
        'category', 'HARDWARE',
        'resource_name', 'FLIR Thermal Radiometric Drone & Handheld Calibrated Imagers',
        'justification', 'Performs daytime and nocturnal thermal infrared surface heat mapping across pavement, roofs, and vertical building facades.',
        'estimated_cost', 350000
      ),
      jsonb_build_object(
        'category', 'SOFTWARE',
        'resource_name', 'ENVI-met Science V5 High-Performance Computing License',
        'justification', 'Executes 3D computational fluid dynamics, vegetation canopy radiative transfer, and microclimate simulations on IITB GPU clusters.',
        'estimated_cost', 180000
      ),
      jsonb_build_object(
        'category', 'MATERIALS',
        'resource_name', 'High-Albedo Retro-Reflective & Cool Pavement Coating Formulations',
        'justification', 'Procures and applies 1,200 sq. meters of high-durability cool coating with solar reflectance index (SRI) >= 102 on testbed street surfaces.',
        'estimated_cost', 420000
      ),
      jsonb_build_object(
        'category', 'OPERATIONS',
        'resource_name', 'Field Deployment Logistics, Mounting Fixtures & Community Surveys',
        'justification', 'Covers physical installation on municipal street poles, permits, community thermal comfort surveys, and 120-day maintenance.',
        'estimated_cost', 220000
      )
    ),
    'An end-to-end Integrated Microclimate Mitigation System (IMMS) consisting of: (1) A physically deployed 1.2 km Cool Street testbed with high-albedo cool pavement and engineered micro-canopy interventions; (2) A 25-node real-time LoRaWAN microclimatic telemetry network; (3) An automated web-based Municipal Ward Thermal Vulnerability Index (WTVI) Dashboard visualizing real-time heat maps, thermal comfort indices (PET/UTCI), and predictive intervention impact simulations; and (4) The CivicFix Cool Infrastructure Decision Support Manual for municipal public works replication.',
    jsonb_build_array(
      jsonb_build_object(
        'milestone_number', 1,
        'title', 'Ward Thermal Diagnostic & Baseline LST Remote Sensing',
        'description', 'Acquire satellite land surface temperature datasets, execute UAV infrared thermography surveys, and finalize 25 microclimate sensor deployment coordinates.',
        'month_target', 1,
        'deliverable_refs', jsonb_build_array('DEL-1', 'DEL-2')
      ),
      jsonb_build_object(
        'milestone_number', 2,
        'title', 'IoT Telemetry Grid Deployment & ENVI-met 3D Baseline Model',
        'description', 'Deploy 25 solar LoRaWAN microclimate sensing nodes, activate real-time telemetry pipeline, and calibrate baseline 3D CFD thermal simulation.',
        'month_target', 2,
        'deliverable_refs', jsonb_build_array('DEL-3', 'DEL-4')
      ),
      jsonb_build_object(
        'milestone_number', 3,
        'title', 'Cool Pavement Testbed Installation & Intervention Simulation',
        'description', 'Apply 1,200 m² of high-albedo retro-reflective coatings and targeted permeable surfaces in the testbed corridor; simulate predicted microclimate cooling.',
        'month_target', 3,
        'deliverable_refs', jsonb_build_array('DEL-5')
      ),
      jsonb_build_object(
        'milestone_number', 4,
        'title', 'Empirical Cooling Validation & Perceptual Comfort Assessment',
        'description', 'Conduct continuous 60-day post-intervention telemetry monitoring, evaluate surface and air temperature reduction, and execute 400+ citizen thermal comfort surveys.',
        'month_target', 4,
        'deliverable_refs', jsonb_build_array('DEL-6', 'DEL-7')
      ),
      jsonb_build_object(
        'milestone_number', 5,
        'title', 'Municipal Dashboard Delivery & Scale-up Framework',
        'description', 'Deploy production Ward Thermal Vulnerability Index (WTVI) dashboard and deliver the definitive Cool Infrastructure Municipal Design Guideline.',
        'month_target', 5,
        'deliverable_refs', jsonb_build_array('DEL-8', 'DEL-9')
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'id', 'DEL-1',
        'title', 'Urban Thermal Hotspot Diagnostic Report & High-Resolution LST Map',
        'type', 'REPORT',
        'description', 'Comprehensive remote sensing and UAV thermography report identifying localized micro-heat islands across the ward.'
      ),
      jsonb_build_object(
        'id', 'DEL-2',
        'title', 'Sensor Grid Architecture & Pole Deployment Master Plan',
        'type', 'SPECIFICATION',
        'description', 'Detailed engineering schematics, power budgets, and mounting specifications for 25 solar LoRaWAN nodes.'
      ),
      jsonb_build_object(
        'id', 'DEL-3',
        'title', 'Operational Real-Time Microclimate Telemetry Feed (PostGIS API)',
        'type', 'DATASET_API',
        'description', 'Live REST/WebSocket endpoint streaming 5-minute interval ambient temp, humidity, wind, and globe temperature.'
      ),
      jsonb_build_object(
        'id', 'DEL-4',
        'title', 'Calibrated ENVI-met 3D Urban Microclimate CFD Model',
        'type', 'SOFTWARE_MODEL',
        'description', 'High-fidelity validated 3D microclimate simulation package for urban canyon thermal and aerodynamic flux.'
      ),
      jsonb_build_object(
        'id', 'DEL-5',
        'title', '1.2 km Cool Surface Field Testbed Implementation',
        'type', 'PHYSICAL_PROTOTYPE',
        'description', 'Fully treated pavement testbed corridor exhibiting solar reflectance >= 0.82 and enhanced permeability.'
      ),
      jsonb_build_object(
        'id', 'DEL-6',
        'title', 'Empirical Microclimate Cooling Performance Audit',
        'type', 'REPORT',
        'description', 'Statistical validation verifying surface temperature attenuation, ambient cooling delta, and solar radiation flux.'
      ),
      jsonb_build_object(
        'id', 'DEL-7',
        'title', 'Outdoor Thermal Comfort & Human Heat Stress Study (PET/UTCI)',
        'type', 'REPORT',
        'description', 'Physiological comfort index analysis backed by 400+ citizen field surveys in treated versus control corridors.'
      ),
      jsonb_build_object(
        'id', 'DEL-8',
        'title', 'Municipal Ward Thermal Vulnerability Index (WTVI) Web Platform',
        'type', 'SOFTWARE_DASHBOARD',
        'description', 'Interactive municipal GIS tool visualizing live thermal vulnerability scores, heat alerts, and mitigation ROI.'
      ),
      jsonb_build_object(
        'id', 'DEL-9',
        'title', 'CivicFix Cool Infrastructure Policy & Technical Design Manual',
        'type', 'SPECIFICATION',
        'description', 'Authoritative engineering guideline for municipal standard operating procedures and citywide cool material adoption.'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'risk_title', 'Sensor Occlusion & Traffic Soot / Particulate Accumulation',
        'severity', 'MEDIUM',
        'probability', 'HIGH',
        'mitigation_strategy', 'Install sensor enclosures with hydrophobic PTFE sintered filters, anti-dust solar glass coatings, and schedule bi-weekly ultrasonic sensor calibrations.'
      ),
      jsonb_build_object(
        'risk_title', 'Surface Albedo Degradation Under Heavy Vehicular Abrasion',
        'severity', 'HIGH',
        'probability', 'MEDIUM',
        'mitigation_strategy', 'Utilize polymer-modified polyurethane retro-reflective binder with silane surface coupling agent, proven to retain >85% initial solar reflectance after 100,000 tire passes.'
      ),
      jsonb_build_object(
        'risk_title', 'Monsoon Interruption & High Humidity Signal Distortion',
        'severity', 'MEDIUM',
        'probability', 'MEDIUM',
        'mitigation_strategy', 'Implement IP67 weather-sealed instrumentation housings, dynamic RH-dependent wet-bulb temperature corrections in the analytics pipeline, and seasonal baseline calibration.'
      ),
      jsonb_build_object(
        'risk_title', 'LoRaWAN Packet Loss in Dense Concrete Urban Canyons',
        'severity', 'LOW',
        'probability', 'MEDIUM',
        'mitigation_strategy', 'Deploy redundant multi-gateway mesh topology with localized SD-card circular buffer storage on each sensor node ensuring 0% data loss during network outages.'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'metric_name', 'Pavement Surface Temperature Reduction',
        'target_value', '>= 3.5°C attenuation',
        'measurement_method', 'Calibrated contact thermocouples and FLIR radiometric thermography comparing treated corridor vs adjacent control asphalt during peak solar noon (12:00 - 15:00).'
      ),
      jsonb_build_object(
        'metric_name', 'Pedestrian Ambient Air Temperature Cooling Delta',
        'target_value', '>= 1.8°C at 1.5m height',
        'measurement_method', 'Aspirated meteorological shield temperature sensors placed at pedestrian breathing zone across treated and untreated corridors.'
      ),
      jsonb_build_object(
        'metric_name', 'Physiological Equivalent Temperature (PET) Comfort Improvement',
        'target_value', '>= 4.0°C PET reduction',
        'measurement_method', 'RayMan Pro bio-meteorological simulation coupled with black-globe temperature and 2D sonic anemometer measurements.'
      ),
      jsonb_build_object(
        'metric_name', 'IoT Telemetry Data Reliability & Completeness',
        'target_value', '>= 98.5% uptime',
        'measurement_method', 'Automated packet receipt monitoring across 25 nodes over continuous 120-day deployment window.'
      ),
      jsonb_build_object(
        'metric_name', 'Citizen Outdoor Thermal Satisfaction Index',
        'target_value', '>= 35% improvement',
        'measurement_method', 'Standardized 5-point thermal sensation vote (TSV) survey administered to 400+ residents and commuters in the testbed ward.'
      )
    ),
    v_inst_coord_id,
    now() - interval '5 days',
    now() - interval '5 days',
    now()
  ) on conflict (project_id, version_number) do update set
    project_objective = excluded.project_objective,
    research_questions = excluded.research_questions,
    proposed_methodology = excluded.proposed_methodology,
    technical_approach = excluded.technical_approach,
    team_capability_summary = excluded.team_capability_summary,
    required_resources = excluded.required_resources,
    expected_prototype = excluded.expected_prototype,
    milestones = excluded.milestones,
    deliverables = excluded.deliverables,
    risks_and_mitigation = excluded.risks_and_mitigation,
    success_metrics = excluded.success_metrics,
    status = 'SUBMITTED',
    is_current = true,
    updated_at = now();

end;
$$;
