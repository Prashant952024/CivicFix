// CivicFix Safe Demo Data Module
// Isolated mock datasets for Public Demo Sandbox (8 Predefined Personas)
// STRICTLY LOCAL: NEVER connected to production Supabase or Clerk

export type DemoRole =
  | "CITIZEN"
  | "MUNICIPAL_OFFICER"
  | "DEPARTMENT_MANAGER"
  | "FIELD_WORKER"
  | "ADMIN"
  | "INNOVATION_MANAGER"
  | "INSTITUTION"
  | "INDUSTRY_PARTNER";

export type DemoPersonaInfo = {
  id: string;
  role: DemoRole;
  displayName: string;
  fullName: string;
  full_name?: string;
  email: string;
  phone?: string;
  organization?: string;
  departmentId?: string;
  department_id?: string;
  departmentName?: string;
  badge: string;
  avatarColor: string;
  tagline: string;
  description: string;
  route: string;
  capabilities: string[];
};

export type DemoDepartment = {
  id: string;
  code: string;
  name: string;
  headName: string;
  workerCount: number;
  activeIssuesCount: number;
  is_active: boolean;
};

export type DemoProfile = {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
  phone?: string;
  role: DemoRole;
  organization?: string;
  department_id?: string;
};

export type DemoIssueImage = {
  id: string;
  issue_id: string;
  image_type: "INITIAL_REPORT" | "WORK_PROGRESS" | "RESOLUTION_EVIDENCE";
  url: string;
  created_at: string;
};

export type DemoStatusHistory = {
  id: string;
  issue_id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by_name: string;
  created_at: string;
};

export type DemoAssignment = {
  id: string;
  issue_id: string;
  department_id: string;
  worker_id: string | null;
  assigned_by_name: string;
  assigned_at: string;
  status: "ASSIGNED" | "ACCEPTED" | "COMPLETED";
};

export type DemoAIAnalysis = {
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  department_code: string;
  complexity: "SIMPLE" | "COMPLEX" | "INFRASTRUCTURE";
  confidence_score: number;
  explanation: string;
};

export type DemoIssue = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status:
    | "SUBMITTED"
    | "AI_ANALYZED"
    | "VERIFIED"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "UNDER_REVIEW"
    | "RESOLVED"
    | "CITIZEN_VERIFIED"
    | "REOPENED"
    | "CLOSED"
    | "REJECTED";
  location_text: string;
  address_text: string;
  district_name: string;
  latitude: number;
  longitude: number;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  ai_analysis?: DemoAIAnalysis;
  images: DemoIssueImage[];
  status_history: DemoStatusHistory[];
  assignments: DemoAssignment[];
};

export type DemoChallenge = {
  id: string;
  title: string;
  sector: string;
  problem_statement: string;
  target_kpis: string[];
  budget_cap_crore: number;
  status: "PUBLISHED" | "PROPOSALS_UNDER_REVIEW" | "PILOT_ACTIVE" | "COMPLETED";
  published_by: string;
  created_at: string;
  proposals_count: number;
};

export type DemoProposalSection = {
  number: number;
  title: string;
  content: string;
};

export type DemoProposal = {
  id: string;
  challenge_id: string;
  challenge_title: string;
  institution_id: string;
  institution_name: string;
  lead_researcher: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";
  proposed_budget_crore: number;
  timeline_months: number;
  sections: DemoProposalSection[];
  submitted_at: string;
  review_notes?: string;
};

export type DemoPilot = {
  id: string;
  proposal_id: string;
  challenge_title: string;
  institution_name: string;
  partner_name?: string;
  partner_contribution_crore?: number;
  partner_hardware_notes?: string;
  status: "ACTIVE" | "MILESTONE_2_PENDING" | "COMPLETED";
  progress_percent: number;
  current_milestone: string;
  milestones: {
    id: string;
    title: string;
    target_date: string;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    kpi_metric: string;
    kpi_target: string;
    kpi_achieved?: string;
    evidence_notes?: string;
  }[];
};

export type DemoNotification = {
  id: string;
  recipient_role: DemoRole;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
};

// ============================================================================
// 8 PREDEFINED PERSONAS
// ============================================================================

export const DEMO_PERSONAS: DemoPersonaInfo[] = [
  {
    id: "demo-user-citizen",
    role: "CITIZEN",
    displayName: "Demo Citizen",
    fullName: "Priya Sharma",
    full_name: "Priya Sharma",
    email: "priya.citizen@demo.civicfix.internal",
    phone: "+91 98765 43210",
    badge: "Resident & Grievant",
    avatarColor: "from-emerald-500 to-teal-700",
    tagline: "Multimodal Grievance Reporting & Verification",
    description: "Submit municipal complaints with photos & voice notes, track live repair progress, and give final sign-off or reopen tickets.",
    route: "/demo/citizen",
    capabilities: [
      "Submit issues with photo & voice recording",
      "Instant AI pre-triage simulation",
      "Track live status timeline",
      "Inspect tamper-evident resolution photos",
      "Confirm resolution or reopen tickets",
    ],
  },
  {
    id: "demo-user-officer",
    role: "MUNICIPAL_OFFICER",
    displayName: "Demo Municipal Officer",
    fullName: "Rajesh Kumar",
    full_name: "Rajesh Kumar",
    email: "rajesh.officer@demo.civicfix.internal",
    phone: "+91 98765 43211",
    badge: "Municipal Supervisor",
    avatarColor: "from-sky-500 to-blue-700",
    tagline: "AI Triage Verification & Administrative Authority",
    description: "Review incoming AI-triaged civic reports, override categories/priorities, route to municipal departments, and grant final administrative sign-off.",
    route: "/demo/officer",
    capabilities: [
      "Review automated AI classification metadata",
      "Override category, severity, and priority",
      "Dispatch issues to specialized municipal departments",
      "Evaluate candidate duplicate clusters",
      "Grant final municipal resolution sign-off",
    ],
  },
  {
    id: "demo-user-manager",
    role: "DEPARTMENT_MANAGER",
    displayName: "Demo Department Manager",
    fullName: "Amit Verma",
    full_name: "Amit Verma",
    email: "amit.manager@demo.civicfix.internal",
    phone: "+91 98765 43212",
    departmentId: "dept-1",
    department_id: "dept-1",
    departmentName: "Roads & Infrastructure",
    badge: "Department Head",
    avatarColor: "from-indigo-500 to-purple-700",
    tagline: "Work Order Dispatch & Evidence Approval",
    description: "Manage departmental task queues, assign work orders to field workers, and review field photos to approve completion or request rework.",
    route: "/demo/manager",
    capabilities: [
      "Filter departmental queue and worker workload",
      "Assign and re-assign tasks to field workers",
      "Review before-and-after photo evidence",
      "Approve resolution or send back for rework",
      "Monitor departmental resolution SLAs",
    ],
  },
  {
    id: "demo-user-worker",
    role: "FIELD_WORKER",
    displayName: "Demo Field Worker",
    fullName: "Marcus Vance",
    full_name: "Marcus Vance",
    email: "marcus.worker@demo.civicfix.internal",
    phone: "+91 98765 43213",
    departmentId: "dept-1",
    department_id: "dept-1",
    departmentName: "Roads & Infrastructure",
    badge: "Senior Field Engineer",
    avatarColor: "from-amber-500 to-orange-700",
    tagline: "Geocoded Task Execution & Resolution Proof",
    description: "Access assigned field tasks on geocoded maps, update job status, upload tamper-evident photo proof, and submit completed work.",
    route: "/demo/worker",
    capabilities: [
      "View assigned work orders on interactive map",
      "Accept tasks and update status to IN_PROGRESS",
      "Upload resolution proof images with field notes",
      "Submit work orders for manager review",
      "Review rework feedback when needed",
    ],
  },
  {
    id: "demo-user-admin",
    role: "ADMIN",
    displayName: "Demo Administrator",
    fullName: "Dr. Sunita Rao",
    full_name: "Dr. Sunita Rao",
    email: "sunita.admin@demo.civicfix.internal",
    phone: "+91 98765 43214",
    badge: "System Administrator",
    avatarColor: "from-rose-500 to-red-700",
    tagline: "Platform Governance & System-Wide Telemetry",
    description: "Monitor platform-wide resolution metrics, inspect departmental performance, manage user roles, and review audit logs.",
    route: "/demo/admin",
    capabilities: [
      "Inspect high-level civic telemetry and resolution rate",
      "View user roster across all 8 roles",
      "Review departmental budget allocations",
      "Monitor audit logs and system health KPIs",
      "Simulated administrative user governance",
    ],
  },
  {
    id: "demo-user-innovation",
    role: "INNOVATION_MANAGER",
    displayName: "Demo Innovation Manager",
    fullName: "Dr. Vikram Malhotra",
    full_name: "Dr. Vikram Malhotra",
    email: "vikram.innovation@demo.civicfix.internal",
    phone: "+91 98765 43215",
    badge: "R&D & Innovation Lead",
    avatarColor: "from-violet-500 to-fuchsia-700",
    tagline: "Complex R&D Challenges & Academic Pilots",
    description: "Publish chronic municipal challenges, evaluate academic AI matchmaking, review 11-section research proposals, and oversee field pilots.",
    route: "/demo/innovation",
    capabilities: [
      "Publish structured municipal R&D challenges",
      "Review AI-ranked institution matchmaking",
      "Review comprehensive 11-section proposals",
      "Enforce anti-self-approval and grant pilots",
      "Validate field pilot KPIs and deployment plans",
    ],
  },
  {
    id: "demo-user-institution",
    role: "INSTITUTION",
    displayName: "Demo Institution",
    fullName: "Prof. Aris Thorne",
    full_name: "Prof. Aris Thorne",
    email: "aris.iit@demo.civicfix.internal",
    phone: "+91 98765 43216",
    organization: "IIT Ranchi Advanced Engineering Lab",
    badge: "Academic Research Partner",
    avatarColor: "from-cyan-500 to-blue-800",
    tagline: "11-Section Proposal Authoring & Pilot Telemetry",
    description: "Browse municipal challenges, submit structured 11-section research proposals, and report field trial milestone telemetry.",
    route: "/demo/institution",
    capabilities: [
      "Discover published municipal innovation challenges",
      "Author & submit complete 11-section proposals",
      "Register faculty and student research teams",
      "Execute field pilot workspace trials",
      "Submit milestone telemetry and lab evidence",
    ],
  },
  {
    id: "demo-user-industry",
    role: "INDUSTRY_PARTNER",
    displayName: "Demo Industry Partner",
    fullName: "Ananya Desai",
    full_name: "Ananya Desai",
    email: "ananya.tata@demo.civicfix.internal",
    phone: "+91 98765 43217",
    organization: "Tata Cleantech Infrastructure Ltd",
    badge: "Commercial Technology Partner",
    avatarColor: "from-teal-600 to-emerald-800",
    tagline: "Co-Funding Marketplace & Commercial Scaling",
    description: "Discover high-impact research pilots, pledge co-funding or specialized equipment, and collaborate on municipal deployment roadmaps.",
    route: "/demo/industry",
    capabilities: [
      "Browse active academic research pilots",
      "Pledge co-funding grants and specialized hardware",
      "Collaborate on lifecycle scaling plans",
      "Track sponsored pilot milestone progress",
      "Review municipal ROI and sustainability impact",
    ],
  },
];

// ============================================================================
// SAMPLE ASSETS & INITIAL SEED DATA
// ============================================================================

export const DEMO_SAMPLE_IMAGES = {
  pothole_reported: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
  pothole_fixed: "https://images.unsplash.com/photo-1584463699039-4bb46e5b4b7a?w=800&auto=format&fit=crop&q=80",
  drainage_blocked: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&auto=format&fit=crop&q=80",
  drainage_cleaned: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
  streetlight_broken: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80",
  streetlight_repaired: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80",
  garbage_overflow: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=800&auto=format&fit=crop&q=80",
  garbage_cleared: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
  water_leak: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
  water_repaired: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80",
};

export type DemoSampleImageKey = keyof typeof DEMO_SAMPLE_IMAGES;

export const DEMO_DEPARTMENTS: DemoDepartment[] = [
  { id: "dept-1", code: "ROAD_INFRASTRUCTURE", name: "Roads & Infrastructure", headName: "Amit Verma", workerCount: 14, activeIssuesCount: 4, is_active: true },
  { id: "dept-2", code: "PUBLIC_HEALTH", name: "Public Sanitation & Waste", headName: "Dr. Kavita Sen", workerCount: 22, activeIssuesCount: 6, is_active: true },
  { id: "dept-3", code: "WATER_SUPPLY", name: "Water Supply & Sewerage", headName: "Sanjay Nambiar", workerCount: 18, activeIssuesCount: 3, is_active: true },
  { id: "dept-4", code: "ELECTRICAL", name: "Electrical & Street Lighting", headName: "Rohan Kulkarni", workerCount: 9, activeIssuesCount: 2, is_active: true },
  { id: "dept-5", code: "PARKS_RECREATION", name: "Parks & Urban Forestry", headName: "Meera Nair", workerCount: 8, activeIssuesCount: 1, is_active: true },
];

export const DEMO_WORKERS: DemoProfile[] = [
  { id: "worker-1", full_name: "Marcus Vance", display_name: "Marcus (Roads)", email: "marcus.worker@demo.civicfix.internal", phone: "+91 98765 43213", role: "FIELD_WORKER", department_id: "dept-1" },
  { id: "worker-2", full_name: "Tariq Ali", display_name: "Tariq (Roads)", email: "tariq.ali@demo.civicfix.internal", phone: "+91 98765 43218", role: "FIELD_WORKER", department_id: "dept-1" },
  { id: "worker-3", full_name: "Sunil Murmu", display_name: "Sunil (Sanitation)", email: "sunil.m@demo.civicfix.internal", phone: "+91 98765 43219", role: "FIELD_WORKER", department_id: "dept-2" },
  { id: "worker-4", full_name: "Deepak Sahu", display_name: "Deepak (Water)", email: "deepak.s@demo.civicfix.internal", phone: "+91 98765 43220", role: "FIELD_WORKER", department_id: "dept-3" },
];

export const INITIAL_DEMO_ISSUES: DemoIssue[] = [
  {
    id: "DEMO-CF-1001",
    title: "Severe Pothole Cluster near Albert Ekka Chowk",
    description: "Deep pothole cluster causing two-wheeler skidding and severe traffic congestion during evening peak hours.",
    category: "Roads & Infrastructure",
    priority: "HIGH",
    severity: "HIGH",
    status: "UNDER_REVIEW",
    location_text: "Albert Ekka Chowk, Main Road",
    address_text: "Opposite Firayalal Complex, Ranchi, Jharkhand 834001",
    district_name: "Ranchi",
    latitude: 23.3697,
    longitude: 85.3256,
    reporter_name: "Priya Sharma",
    reporter_email: "priya.citizen@demo.civicfix.internal",
    reporter_phone: "+91 98765 43210",
    department_id: "dept-1",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    resolved_at: null,
    ai_analysis: {
      category: "Road Infrastructure",
      severity: "HIGH",
      priority: "HIGH",
      department_code: "ROAD_INFRASTRUCTURE",
      complexity: "SIMPLE",
      confidence_score: 0.94,
      explanation: "Surface structural erosion detected with vehicle hazard risk. Recommended cold-mix asphalt patch.",
    },
    images: [
      { id: "img-1", issue_id: "DEMO-CF-1001", image_type: "INITIAL_REPORT", url: DEMO_SAMPLE_IMAGES.pothole_reported, created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
      { id: "img-2", issue_id: "DEMO-CF-1001", image_type: "RESOLUTION_EVIDENCE", url: DEMO_SAMPLE_IMAGES.pothole_fixed, created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    ],
    status_history: [
      { id: "hist-1", issue_id: "DEMO-CF-1001", old_status: null, new_status: "SUBMITTED", notes: "Reported by Priya Sharma with geo-tagged photo.", changed_by_name: "Priya Sharma", created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
      { id: "hist-2", issue_id: "DEMO-CF-1001", old_status: "SUBMITTED", new_status: "VERIFIED", notes: "Verified by Officer Rajesh Kumar. Assigned to Roads & Infrastructure.", changed_by_name: "Rajesh Kumar", created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
      { id: "hist-3", issue_id: "DEMO-CF-1001", old_status: "VERIFIED", new_status: "ASSIGNED", notes: "Assigned to Marcus Vance by Manager Amit Verma.", changed_by_name: "Amit Verma", created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString() },
      { id: "hist-4", issue_id: "DEMO-CF-1001", old_status: "ASSIGNED", new_status: "IN_PROGRESS", notes: "Worker accepted task and began asphalt hot-mix patching.", changed_by_name: "Marcus Vance", created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
      { id: "hist-5", issue_id: "DEMO-CF-1001", old_status: "IN_PROGRESS", new_status: "UNDER_REVIEW", notes: "Work completed. Bitumen overlay applied and tamper-evident photo uploaded.", changed_by_name: "Marcus Vance", created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    ],
    assignments: [
      { id: "assign-1", issue_id: "DEMO-CF-1001", department_id: "dept-1", worker_id: "worker-1", assigned_by_name: "Amit Verma", assigned_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), status: "COMPLETED" },
    ],
  },
  {
    id: "DEMO-CF-1002",
    title: "Overflowing Waste Dumpster near Kutchery Market",
    description: "Solid waste container overflowing onto the pedestrian footpath for 48 hours. Stray animals scattering trash.",
    category: "Sanitation & Waste",
    priority: "HIGH",
    severity: "MEDIUM",
    status: "ASSIGNED",
    location_text: "Kutchery Road, Near State Library",
    address_text: "Court Complex Area, Ranchi, Jharkhand 834001",
    district_name: "Ranchi",
    latitude: 23.3752,
    longitude: 85.3288,
    reporter_name: "Alok Gupta",
    reporter_email: "alok.gupta@example.com",
    reporter_phone: "+91 98765 00001",
    department_id: "dept-2",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    resolved_at: null,
    ai_analysis: {
      category: "Solid Waste Management",
      severity: "MEDIUM",
      priority: "HIGH",
      department_code: "PUBLIC_HEALTH",
      complexity: "SIMPLE",
      confidence_score: 0.96,
      explanation: "Bio-waste accumulation near public market zone. Requires hydraulic compactor truck dispatch.",
    },
    images: [
      { id: "img-3", issue_id: "DEMO-CF-1002", image_type: "INITIAL_REPORT", url: DEMO_SAMPLE_IMAGES.garbage_overflow, created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
    ],
    status_history: [
      { id: "hist-21", issue_id: "DEMO-CF-1002", old_status: null, new_status: "SUBMITTED", notes: "Submitted via mobile voice note.", changed_by_name: "Alok Gupta", created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
      { id: "hist-22", issue_id: "DEMO-CF-1002", old_status: "SUBMITTED", new_status: "VERIFIED", notes: "Verified by Officer Rajesh Kumar.", changed_by_name: "Rajesh Kumar", created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
      { id: "hist-23", issue_id: "DEMO-CF-1002", old_status: "VERIFIED", new_status: "ASSIGNED", notes: "Assigned to Sunil Murmu (Sanitation Unit 3).", changed_by_name: "Dr. Kavita Sen", created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    ],
    assignments: [
      { id: "assign-2", issue_id: "DEMO-CF-1002", department_id: "dept-2", worker_id: "worker-3", assigned_by_name: "Dr. Kavita Sen", assigned_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), status: "ASSIGNED" },
    ],
  },
  {
    id: "DEMO-CF-1003",
    title: "Broken Streetlight Circuit causing Dark Stretch on Ring Road",
    description: "Entire 400-meter stretch of LED streetlights inactive for 3 nights. Poses severe safety hazard for pedestrians.",
    category: "Electrical & Lighting",
    priority: "CRITICAL",
    severity: "CRITICAL",
    status: "SUBMITTED",
    location_text: "Argora-Kathal More Ring Road",
    address_text: "Near DPS School Junction, Ranchi, Jharkhand 834002",
    district_name: "Ranchi",
    latitude: 23.3481,
    longitude: 85.2912,
    reporter_name: "Priya Sharma",
    reporter_email: "priya.citizen@demo.civicfix.internal",
    reporter_phone: "+91 98765 43210",
    department_id: "dept-4",
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    resolved_at: null,
    ai_analysis: {
      category: "Electrical & Street Lighting",
      severity: "CRITICAL",
      priority: "CRITICAL",
      department_code: "ELECTRICAL",
      complexity: "SIMPLE",
      confidence_score: 0.98,
      explanation: "Substation MCB trip or transformer feeder fault affecting school zone. Immediate line inspection required.",
    },
    images: [
      { id: "img-4", issue_id: "DEMO-CF-1003", image_type: "INITIAL_REPORT", url: DEMO_SAMPLE_IMAGES.streetlight_broken, created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
    ],
    status_history: [
      { id: "hist-31", issue_id: "DEMO-CF-1003", old_status: null, new_status: "SUBMITTED", notes: "Citizen submitted issue with live GPS location.", changed_by_name: "Priya Sharma", created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
    ],
    assignments: [],
  },
  {
    id: "DEMO-CF-1004",
    title: "Potable Water Pipeline Rupture Flooding Morabadi Lane",
    description: "6-inch drinking water feeder pipe burst, flooding residential lane and causing water loss in 200 households.",
    category: "Water Supply & Sewerage",
    priority: "CRITICAL",
    severity: "HIGH",
    status: "RESOLVED",
    location_text: "Lane 4, Morabadi Ground",
    address_text: "Behind Ranchi University Campus, Ranchi, Jharkhand 834008",
    district_name: "Ranchi",
    latitude: 23.3912,
    longitude: 85.3341,
    reporter_name: "Ramesh Mahto",
    reporter_email: "ramesh.m@example.com",
    reporter_phone: "+91 98765 00002",
    department_id: "dept-3",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    ai_analysis: {
      category: "Water Supply",
      severity: "HIGH",
      priority: "CRITICAL",
      department_code: "WATER_SUPPLY",
      complexity: "SIMPLE",
      confidence_score: 0.95,
      explanation: "Pressurized potable water leak. Emergency valve shutoff and ductile iron collar fitting required.",
    },
    images: [
      { id: "img-5", issue_id: "DEMO-CF-1004", image_type: "INITIAL_REPORT", url: DEMO_SAMPLE_IMAGES.water_leak, created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
      { id: "img-6", issue_id: "DEMO-CF-1004", image_type: "RESOLUTION_EVIDENCE", url: DEMO_SAMPLE_IMAGES.water_repaired, created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
    ],
    status_history: [
      { id: "hist-41", issue_id: "DEMO-CF-1004", old_status: null, new_status: "SUBMITTED", notes: "Reported with photos.", changed_by_name: "Ramesh Mahto", created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
      { id: "hist-42", issue_id: "DEMO-CF-1004", old_status: "SUBMITTED", new_status: "IN_PROGRESS", notes: "Emergency crew dispatched.", changed_by_name: "Sanjay Nambiar", created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
      { id: "hist-43", issue_id: "DEMO-CF-1004", old_status: "IN_PROGRESS", new_status: "RESOLVED", notes: "Collar clamp installed, valve pressurized. Photo evidence verified by Officer.", changed_by_name: "Rajesh Kumar", created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
    ],
    assignments: [
      { id: "assign-4", issue_id: "DEMO-CF-1004", department_id: "dept-3", worker_id: "worker-4", assigned_by_name: "Sanjay Nambiar", assigned_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), status: "COMPLETED" },
    ],
  },
];

export const INITIAL_DEMO_CHALLENGES: DemoChallenge[] = [
  {
    id: "DEMO-CH-201",
    title: "Low-Cost Arsenic & Heavy Metal Groundwater Bio-Filtration Unit",
    sector: "Water & Public Health",
    problem_statement: "High arsenic contamination (0.08 mg/L vs. WHO limit of 0.01 mg/L) across 14 rural blocks in the Damodar river basin requiring zero-electricity household and community bio-filtration.",
    target_kpis: ["Arsenic reduction > 98%", "Filter media life >= 12 months", "Per-litre cost < ₹0.05"],
    budget_cap_crore: 0.45,
    status: "PROPOSALS_UNDER_REVIEW",
    published_by: "Dr. Vikram Malhotra (Innovation Lead)",
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    proposals_count: 2,
  },
  {
    id: "DEMO-CH-202",
    title: "Recycled Plastic-Bitumen Polymer Blend for High-Rainfall Road Sub-Bases",
    sector: "Road Infrastructure",
    problem_statement: "Severe potholing in monsoon-prone mining corridors. Seeking upcycled multi-layer plastic aggregate formulation to increase Marshall stability and reduce bitumen consumption.",
    target_kpis: ["Marshall Stability > 16 kN", "Plastic Waste Ingestion >= 8% wt", "Pothole recurrence down 60%"],
    budget_cap_crore: 0.85,
    status: "PILOT_ACTIVE",
    published_by: "Dr. Vikram Malhotra (Innovation Lead)",
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    proposals_count: 3,
  },
];

export const INITIAL_DEMO_PROPOSALS: DemoProposal[] = [
  {
    id: "DEMO-PROP-301",
    challenge_id: "DEMO-CH-201",
    challenge_title: "Low-Cost Arsenic & Heavy Metal Groundwater Bio-Filtration Unit",
    institution_id: "demo-user-institution",
    institution_name: "IIT Ranchi Advanced Engineering Lab",
    lead_researcher: "Prof. Aris Thorne",
    status: "SUBMITTED",
    proposed_budget_crore: 0.38,
    timeline_months: 6,
    submitted_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    sections: [
      { number: 1, title: "Executive Summary", content: "Nanocomposite iron-oxide activated biochar filtration cartridge tailored for Damodar basin aquifers." },
      { number: 2, title: "Literature Review & Prior Art", content: "Addresses shortcomings of conventional iron coprecipitation with zero sludge byproduct." },
      { number: 3, title: "Methodology & Lab Validation", content: "Batch adsorption isotherms, column breakthrough testing, and ICP-MS effluent spectrometry." },
      { number: 4, title: "Equipment & Lab Specifications", content: "IIT Ranchi Surface Characterization Lab + 500L/day continuous flow test rig." },
      { number: 5, title: "Unauthenticated Research Team", content: "Prof. Aris Thorne (PI), Dr. Sneha Roy (Co-PI), Rahul Verma (MTech Research Fellow)." },
      { number: 6, title: "Milestone Schedule & Deliverables", content: "M1: Lab Column validation (Mo 2). M2: 50-Household Field Trial (Mo 4). M3: Scalability Model (Mo 6)." },
      { number: 7, title: "Itemized Budget Breakdown", content: "Consumables ₹14L, Lab testing ₹8L, Field installation ₹10L, Research stipend ₹6L." },
      { number: 8, title: "Environmental & Safety Compliance", content: "Non-hazardous spent media stabilization protocol using cement encapsulation." },
      { number: 9, title: "Expected KPIs & Evaluation Targets", content: "Effluent arsenic < 0.005 ppm, flow rate 15 L/hr, maintenance-free period 180 days." },
      { number: 10, title: "Risk Mitigation & Failure Modes", content: "Pre-filter turbidity cartridge to prevent biochar fouling from suspended clays." },
      { number: 11, title: "Municipal Scaling & Commercialization", content: "Local Self-Help Group (SHG) cartridge regeneration and assembly framework." },
    ],
  },
];

export const INITIAL_DEMO_PILOTS: DemoPilot[] = [
  {
    id: "DEMO-PILOT-401",
    proposal_id: "DEMO-PROP-302",
    challenge_title: "Recycled Plastic-Bitumen Polymer Blend for High-Rainfall Road Sub-Bases",
    institution_name: "IIT Ranchi Advanced Engineering Lab",
    partner_name: "Tata Cleantech Infrastructure Ltd",
    partner_contribution_crore: 0.35,
    partner_hardware_notes: "Supplied 12 tonnes of shredded HDPE/PP pellets and laboratory high-shear mixer.",
    status: "ACTIVE",
    progress_percent: 65,
    current_milestone: "Milestone 2: 1.5 km Field Trial on Mining Corridor",
    milestones: [
      {
        id: "m-1",
        title: "Milestone 1: Marshall Stability & Mix Formulation",
        target_date: "Month 2",
        status: "COMPLETED",
        kpi_metric: "Marshall Stability",
        kpi_target: "> 16 kN",
        kpi_achieved: "18.4 kN (Exceeded)",
        evidence_notes: "Core compression tests certified by Central Road Research Lab.",
      },
      {
        id: "m-2",
        title: "Milestone 2: 1.5 km Field Trial on Mining Corridor",
        target_date: "Month 4",
        status: "IN_PROGRESS",
        kpi_metric: "Rutting Resistance",
        kpi_target: "< 3.0 mm after 100k axles",
        evidence_notes: "Pavement laid on Namkum mining access route. Accelerometer sensors installed.",
      },
      {
        id: "m-3",
        title: "Milestone 3: Monsoon Durability Audit & Scale-Up Plan",
        target_date: "Month 6",
        status: "PENDING",
        kpi_metric: "Pothole Defect Rate",
        kpi_target: "0 defects after 1200 mm rainfall",
      },
    ],
  },
];

export const INITIAL_DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "notif-1",
    recipient_role: "CITIZEN",
    title: "Resolution Submitted for Review",
    message: "Field worker Marcus Vance has submitted photo proof for your reported pothole DEMO-CF-1001.",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false,
    link: "/demo/citizen",
  },
  {
    id: "notif-2",
    recipient_role: "MUNICIPAL_OFFICER",
    title: "Critical Streetlight Outage Reported",
    message: "New critical grievance DEMO-CF-1003 on Ring Road pending administrative classification.",
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    read: false,
    link: "/demo/officer/issues",
  },
  {
    id: "notif-3",
    recipient_role: "DEPARTMENT_MANAGER",
    title: "Resolution Evidence Ready for Approval",
    message: "Work order DEMO-CF-1001 marked completed by Marcus Vance. Photo proof requires your sign-off.",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false,
    link: "/demo/manager",
  },
  {
    id: "notif-4",
    recipient_role: "FIELD_WORKER",
    title: "New Work Order Dispatched",
    message: "Manager Amit Verma assigned you DEMO-CF-1001 near Albert Ekka Chowk.",
    timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    read: true,
    link: "/demo/worker/assigned-issues",
  },
];
