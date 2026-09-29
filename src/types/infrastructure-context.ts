/**
 * CivicFix Infrastructure Workflow Types
 * =======================================
 * Factual context schemas for Datasets D1 to D7 aggregated via
 * public.get_district_infrastructure_context PostgreSQL RPC.
 */

export interface DistrictIdentityContext {
  district_id: string;
  district_name: string;
  state_code: string | null;
  state_name: string;
  country_code: string;
  canonical_source: string;
  alternate_source_codes: string[];
  primary_source_dataset: "INDIA" | "JHARKHAND";
}

export interface DistrictQueryContext {
  planning_sector_code: string;
  financial_year: string | null;
  infrastructure_id: string | null;
}

export interface DemographicContext {
  total_population: number;
  male_population: number | null;
  female_population: number | null;
  rural_population: number | null;
  urban_population: number | null;
  children_0_14: number | null;
  working_age_population_15_59: number | null;
  elderly_population_60_plus: number | null;
  total_households: number;
  average_household_size: number | null;
  sc_population: number | null;
  st_population: number | null;
  literacy_rate_percentage: number | null;
  worker_participation_rate_percentage: number | null;
  households_with_electricity_percentage: number | null;
  households_with_piped_water_percentage: number | null;
  households_with_toilet_percentage: number | null;
  healthcare_access_score: number | null;
  education_access_score: number | null;
  water_access_score: number | null;
  electricity_access_score: number | null;
  overall_service_gap_score: number | null;
  development_need_score: number | null;
  population_impact_score: number | null;
  source_dataset: string;
}

export interface DepartmentBudgetContext {
  planning_sector_code: string;
  planning_sector_name: string;
  financial_year: string;
  funding_source: string;
  unit: "INR_CRORE";
  allocated_budget_crore: number;
  released_budget_crore: number;
  committed_budget_crore: number;
  spent_budget_crore: number;
  unspent_budget_crore: number;
  available_for_new_development_crore: number;
  budget_utilization_percentage: number | null;
  budget_commitment_percentage: number | null;
  budget_pressure_score: number | null;
  source_dataset: string;
}

export interface GeographyContext {
  area_sq_km: number | null;
  centroid_latitude: number;
  centroid_longitude: number;
  north_extent: number | null;
  south_extent: number | null;
  east_extent: number | null;
  west_extent: number | null;
  north_south_extent_km: number | null;
  east_west_extent_km: number | null;
  geographic_region: string | null;
  rural_urban_character: string | null;
  terrain_type: string | null;
  density_category: string | null;
  district_headquarters: string | null;
  neighboring_districts: string[];
  neighbor_count: number;
  source_dataset: string;
}

export interface InfrastructureAssetContext {
  infrastructure_id: string;
  infrastructure_category: string;
  infrastructure_type: string | null;
  existing_asset_count: number;
  functional_asset_count: number;
  total_capacity: number | null;
  current_utilization: number | null;
  utilization_percentage: number | null;
  population_coverage_percentage: number | null;
  average_condition_score: number | null;
  infrastructure_gap_score: number;
  additional_capacity_needed: string | null;
  source_dataset: string;
}

export interface AccessibilityContext {
  road_connectivity_score: number | null;
  paved_road_coverage_percentage: number | null;
  all_weather_access_percentage: number | null;
  public_transport_connectivity_score: number | null;
  average_travel_time_minutes: number | null;
  average_distance_to_service_center_km: number | null;
  remote_population_percentage: number | null;
  service_accessibility_score: number | null;
  transport_access_gap_score: number | null;
  remote_area_access_gap_score: number | null;
  overall_accessibility_gap_score: number;
  source_dataset: string;
}

export interface SocioeconomicGapContext {
  economic_vulnerability_score: number | null;
  estimated_low_income_population_percentage: number | null;
  employment_opportunity_score: number | null;
  economic_activity_score: number | null;
  vulnerable_population_percentage: number | null;
  healthcare_service_gap_score: number | null;
  education_service_gap_score: number | null;
  water_sanitation_service_gap_score: number | null;
  electricity_service_gap_score: number | null;
  digital_connectivity_gap_score: number | null;
  essential_service_gap_score: number | null;
  development_need_context_score: number | null;
  service_deprivation_score: number | null;
  socioeconomic_pressure_score: number | null;
  overall_development_context_score: number;
  source_dataset: string;
}

export interface HistoricalProjectContext {
  project_id: string;
  planning_sector_code: string;
  planning_sector_name: string;
  project_sector: string;
  project_type: string;
  project_name: string | null;
  financial_year: string | null;
  project_status: string;
  unit: "INR_CRORE";
  estimated_cost_crore: number;
  approved_cost_crore: number;
  actual_cost_crore: number;
  project_duration_months: number | null;
  actual_duration_months: number | null;
  estimated_beneficiary_population: number | null;
  completion_percentage: number | null;
  cost_variance_percentage: number | null;
  time_variance_percentage: number | null;
  budget_source_type: string | null;
  implementation_mode: string | null;
  contractor_or_implementer_type: string | null;
  maintenance_requirement_level: string | null;
  historical_cost_per_beneficiary: number | null;
  project_execution_efficiency_score: number | null;
  source_dataset: string;
}

export interface HistoricalProjectsAggregateContext {
  project_count: number;
  average_actual_cost_crore: number | null;
  average_cost_per_beneficiary: number | null;
  average_execution_efficiency: number | null;
  average_cost_variance_percentage: number | null;
  average_time_variance_percentage: number | null;
  projects: HistoricalProjectContext[];
}

export interface ContextProvenance {
  datasets: ("D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7")[];
  source_prefix: "INDIA" | "JHARKHAND";
  synthetic_benchmark_used: false;
}

/**
 * Structured Factual Output of get_district_infrastructure_context RPC
 */
export interface DistrictInfrastructureContext {
  district: DistrictIdentityContext;
  query: DistrictQueryContext;
  population: DemographicContext;
  budget: DepartmentBudgetContext;
  geography: GeographyContext;
  infrastructure_assets: InfrastructureAssetContext[];
  accessibility: AccessibilityContext;
  socioeconomic: SocioeconomicGapContext;
  historical_projects: HistoricalProjectsAggregateContext;
  provenance: ContextProvenance;
}

/**
 * Input Arguments for District Infrastructure Context Query
 */
export interface GetDistrictInfrastructureContextParams {
  districtId: string;
  planningSectorCode: string;
  financialYear?: string | null;
  infrastructureId?: string | null;
}

/**
 * Options for querying issue-level infrastructure decision context
 */
export interface IssueInfrastructureContextOptions {
  financialYear?: string | null;
  infrastructureId?: string | null;
}

/**
 * Composite issue infrastructure context result
 */
export interface IssueInfrastructureContextResult {
  issue_id: string;
  issue_title: string;
  issue_status: string;
  final_issue_type: string | null;
  district_id: string;
  department_id: string;
  planning_sector_code: string;
  context: DistrictInfrastructureContext;
  fetched_at: string;
}

/**
 * Department to Planning Sector Mapping
 */
export interface DepartmentPlanningSectorMapping {
  department_id: string;
  planning_sector_code: string;
  planning_sector_name: string;
  is_primary: boolean;
}

/**
 * Supported canonical district resolution methods
 */
export type DistrictResolutionMethod =
  | "CITIZEN_SELECTED"
  | "AI_ADDRESS_PARSED"
  | "ADMIN_MANUAL";

/**
 * Canonical district item representation for dropdown selection and context
 */
export interface CanonicalDistrictOption {
  id: string;
  district_name: string;
  state_name: string;
  state_code?: string | null;
  official_district_code?: string | null;
}

/**
 * Canonical district item representation
 */
export interface CanonicalDistrict {
  id: string;
  district_name: string;
  state_name: string;
  state_code: string | null;
  country_code: string;
  canonical_source: string;
}

/**
 * Issue infrastructure context readiness status
 */
export interface IssueInfrastructureReadinessResult {
  ready: boolean;
  issue_id: string;
  district_id: string | null;
  district_name?: string | null;
  department_id: string | null;
  department_name?: string | null;
  planning_sector_code: string | null;
  missing_fields: Array<"district_id" | "department_id" | "planning_sector_code">;
  resolution_method: DistrictResolutionMethod | null;
}

