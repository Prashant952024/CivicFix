// CivicFix Safe Demo Data Module
// Isolated mock datasets for Public Demo Mode (Officer & Worker sandboxes)
// NEVER connected to production Supabase or Clerk

export type DemoRole = "MUNICIPAL_OFFICER" | "FIELD_WORKER";

export type DemoDepartment = {
  id: string;
  name: string;
  is_active: boolean;
};

export type DemoProfile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: "MUNICIPAL_OFFICER" | "FIELD_WORKER" | "CITIZEN";
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
    | "REJECTED";
  location_text: string;
  address_text: string;
  latitude: number;
  longitude: number;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  images: DemoIssueImage[];
  status_history: DemoStatusHistory[];
  assignments: DemoAssignment[];
};

export const DEMO_DEPARTMENTS: DemoDepartment[] = [
  { id: "dept-1", name: "Roads & Infrastructure", is_active: true },
  { id: "dept-2", name: "Public Sanitation & Waste", is_active: true },
  { id: "dept-3", name: "Water & Sewerage", is_active: true },
  { id: "dept-4", name: "Electrical & Street Lighting", is_active: true },
  { id: "dept-5", name: "Parks & Recreation", is_active: true },
];

export const DEMO_WORKERS: DemoProfile[] = [
  {
    id: "worker-1",
    full_name: "Marcus Vance",
    email: "marcus.vance@demo.civicfix.internal",
    phone: "+1 (555) 234-8901",
    role: "FIELD_WORKER",
    department_id: "dept-1",
  },
  {
    id: "worker-2",
    full_name: "Elena Rodriguez",
    email: "elena.rodriguez@demo.civicfix.internal",
    phone: "+1 (555) 456-7890",
    role: "FIELD_WORKER",
    department_id: "dept-2",
  },
  {
    id: "worker-3",
    full_name: "Devon Chang",
    email: "devon.chang@demo.civicfix.internal",
    phone: "+1 (555) 678-1234",
    role: "FIELD_WORKER",
    department_id: "dept-4",
  },
  {
    id: "worker-4",
    full_name: "Samira Patel",
    email: "samira.patel@demo.civicfix.internal",
    phone: "+1 (555) 890-5678",
    role: "FIELD_WORKER",
    department_id: "dept-3",
  },
];

export const DEMO_OFFICER_PROFILE: DemoProfile = {
  id: "officer-demo-user",
  full_name: "Officer Alex Morgan",
  email: "alex.morgan@demo.civicfix.internal",
  phone: "+1 (555) 100-2000",
  role: "MUNICIPAL_OFFICER",
};

export const DEMO_WORKER_PROFILE: DemoProfile = {
  id: "worker-1",
  full_name: "Marcus Vance",
  email: "marcus.vance@demo.civicfix.internal",
  phone: "+1 (555) 234-8901",
  role: "FIELD_WORKER",
  department_id: "dept-1",
};

// Realistic mock images with SVG data URIs so no external network/storage calls are needed
export const DEMO_SAMPLE_IMAGES = {
  pothole:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23334155'/><path d='M150,320 Q280,240 450,290 T680,360 Q520,480 340,460 Z' fill='%231e293b' stroke='%230f172a' stroke-width='8'/><circle cx='400' cy='360' r='60' fill='%230f172a'/><text x='400' y='550' fill='%23e2e8f0' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Pine Street Pothole (Demo Evidence)</text></svg>",
  pothole_fixed:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23334155'/><path d='M150,320 Q280,240 450,290 T680,360 Q520,480 340,460 Z' fill='%23475569' stroke='%23334155' stroke-width='4'/><rect x='120' y='230' width='580' height='260' rx='20' fill='%230f766e' fill-opacity='0.25' stroke='%2314b8a6' stroke-width='4' stroke-dasharray='10 5'/><text x='400' y='550' fill='%2314b8a6' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Repaved & Level Asphalt (Resolution Proof)</text></svg>",
  streetlight:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%231e293b'/><line x1='400' y1='600' x2='400' y2='180' stroke='%2364748b' stroke-width='16'/><path d='M400,180 Q400,100 480,100 L520,120' fill='none' stroke='%2364748b' stroke-width='16'/><circle cx='520' cy='140' r='30' fill='%23475569'/><text x='400' y='550' fill='%23e2e8f0' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Broken Luminaire Fixture (Demo Report)</text></svg>",
  streetlight_fixed:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%230f172a'/><line x1='400' y1='600' x2='400' y2='180' stroke='%2364748b' stroke-width='16'/><path d='M400,180 Q400,100 480,100 L520,120' fill='none' stroke='%2364748b' stroke-width='16'/><circle cx='520' cy='140' r='30' fill='%23fef08a'/><circle cx='520' cy='140' r='80' fill='%23fef08a' fill-opacity='0.25'/><text x='400' y='550' fill='%23fef08a' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>LED Lamp Replaced & Fully Functional</text></svg>",
  waste_bin:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23f1f5f9'/><rect x='280' y='240' width='240' height='300' rx='20' fill='%230284c7'/><ellipse cx='400' cy='240' rx='120' ry='30' fill='%230369a1'/><circle cx='400' cy='190' r='50' fill='%23f97316'/><circle cx='350' cy='200' r='40' fill='%23eab308'/><text x='400' y='570' fill='%230f172a' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Overflowing Trash Container (City Plaza)</text></svg>",
  water_leak:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23334155'/><ellipse cx='400' cy='380' rx='220' ry='100' fill='%230284c7' fill-opacity='0.6'/><circle cx='400' cy='340' r='40' fill='%2338bdf8'/><text x='400' y='550' fill='%23e2e8f0' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Water Pipeline Leakage (Main St)</text></svg>",
  tree_branch:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23e2e8f0'/><line x1='100' y1='500' x2='700' y2='500' stroke='%2364748b' stroke-width='12'/><path d='M200,480 Q400,280 600,450' stroke='%2378350f' stroke-width='24' fill='none'/><circle cx='420' cy='330' r='60' fill='%2315803d'/><text x='400' y='560' fill='%230f172a' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle'>Fallen Branch Obstructing Bike Lane</text></svg>",
};

export type DemoSampleImageKey = keyof typeof DEMO_SAMPLE_IMAGES;

export const INITIAL_DEMO_ISSUES: DemoIssue[] = [
  {
    id: "demo-issue-101",
    title: "Hazardous Deep Pothole on Pine & 5th Ave",
    description:
      "Deep 6-inch pothole near the pedestrian crossing causing vehicle tire damage and severe bicycle hazard. Requires rapid asphalt leveling.",
    category: "Road Damage",
    priority: "HIGH",
    severity: "CRITICAL",
    status: "VERIFIED",
    location_text: "Corner of Pine Street & 5th Avenue",
    address_text: "482 Pine St, Downtown Metro",
    latitude: 37.7749,
    longitude: -122.4194,
    reporter_name: "Sarah Jenkins",
    reporter_email: "sarah.j@example.com",
    reporter_phone: "+1 (555) 912-3456",
    department_id: "dept-1",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    resolved_at: null,
    images: [
      {
        id: "img-101-1",
        issue_id: "demo-issue-101",
        image_type: "INITIAL_REPORT",
        url: DEMO_SAMPLE_IMAGES.pothole,
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
    ],
    status_history: [
      {
        id: "hist-101-1",
        issue_id: "demo-issue-101",
        old_status: null,
        new_status: "SUBMITTED",
        notes: "Citizen submitted report with photo evidence.",
        changed_by_name: "Sarah Jenkins",
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
      {
        id: "hist-101-2",
        issue_id: "demo-issue-101",
        old_status: "SUBMITTED",
        new_status: "VERIFIED",
        notes: "Verified by Officer Alex Morgan. Marked as Critical severity due to bike lane proximity.",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
    ],
    assignments: [],
  },
  {
    id: "demo-issue-102",
    title: "Fallen Tree Branch Obstructing Greenway Path",
    description:
      "A heavy oak branch broke during high winds and is completely blocking the North Greenway bicycle path.",
    category: "Parks & Trees",
    priority: "HIGH",
    severity: "MEDIUM",
    status: "ASSIGNED",
    location_text: "North Greenway Park near Mile 3 marker",
    address_text: "1200 North Parkway Trail",
    latitude: 37.7833,
    longitude: -122.4167,
    reporter_name: "David Kim",
    reporter_email: "david.kim@example.com",
    reporter_phone: "+1 (555) 781-9012",
    department_id: "dept-1",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    resolved_at: null,
    images: [
      {
        id: "img-102-1",
        issue_id: "demo-issue-102",
        image_type: "INITIAL_REPORT",
        url: DEMO_SAMPLE_IMAGES.tree_branch,
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    ],
    status_history: [
      {
        id: "hist-102-1",
        issue_id: "demo-issue-102",
        old_status: null,
        new_status: "SUBMITTED",
        notes: "Citizen report logged.",
        changed_by_name: "David Kim",
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
      {
        id: "hist-102-2",
        issue_id: "demo-issue-102",
        old_status: "SUBMITTED",
        new_status: "VERIFIED",
        notes: "Report validated.",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      },
      {
        id: "hist-102-3",
        issue_id: "demo-issue-102",
        old_status: "VERIFIED",
        new_status: "ASSIGNED",
        notes: "Assigned to Marcus Vance (Roads & Infrastructure).",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
    ],
    assignments: [
      {
        id: "assign-102-1",
        issue_id: "demo-issue-102",
        department_id: "dept-1",
        worker_id: "worker-1",
        assigned_by_name: "Officer Alex Morgan",
        assigned_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        status: "ASSIGNED",
      },
    ],
  },
  {
    id: "demo-issue-103",
    title: "Broken Streetlight Luminaire on Oakwood Lane",
    description:
      "Light pole #42 fixture is broken and dangling. Road is completely dark at night.",
    category: "Electrical & Lighting",
    priority: "HIGH",
    severity: "HIGH",
    status: "UNDER_REVIEW",
    location_text: "Opposite 74 Oakwood Lane",
    address_text: "74 Oakwood Lane, West Suburbs",
    latitude: 37.7699,
    longitude: -122.4467,
    reporter_name: "Priya Sharma",
    reporter_email: "priya.s@example.com",
    reporter_phone: "+1 (555) 345-6789",
    department_id: "dept-4",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
    resolved_at: null,
    images: [
      {
        id: "img-103-1",
        issue_id: "demo-issue-103",
        image_type: "INITIAL_REPORT",
        url: DEMO_SAMPLE_IMAGES.streetlight,
        created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      },
      {
        id: "img-103-2",
        issue_id: "demo-issue-103",
        image_type: "RESOLUTION_EVIDENCE",
        url: DEMO_SAMPLE_IMAGES.streetlight_fixed,
        created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ],
    status_history: [
      {
        id: "hist-103-1",
        issue_id: "demo-issue-103",
        old_status: null,
        new_status: "SUBMITTED",
        notes: "Report created.",
        changed_by_name: "Priya Sharma",
        created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      },
      {
        id: "hist-103-2",
        issue_id: "demo-issue-103",
        old_status: "SUBMITTED",
        new_status: "ASSIGNED",
        notes: "Assigned to Devon Chang.",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
      },
      {
        id: "hist-103-3",
        issue_id: "demo-issue-103",
        old_status: "ASSIGNED",
        new_status: "IN_PROGRESS",
        notes: "Field worker began replacement.",
        changed_by_name: "Devon Chang",
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: "hist-103-4",
        issue_id: "demo-issue-103",
        old_status: "IN_PROGRESS",
        new_status: "UNDER_REVIEW",
        notes: "Field repair completed. New LED unit installed and tested. Evidence photo uploaded.",
        changed_by_name: "Devon Chang",
        created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ],
    assignments: [
      {
        id: "assign-103-1",
        issue_id: "demo-issue-103",
        department_id: "dept-4",
        worker_id: "worker-3",
        assigned_by_name: "Officer Alex Morgan",
        assigned_at: new Date(Date.now() - 18 * 3600000).toISOString(),
        status: "COMPLETED",
      },
    ],
  },
  {
    id: "demo-issue-104",
    title: "Overflowing Waste Bin at Central Plaza",
    description:
      "Commercial trash can overflowing with litter blowing onto surrounding pedestrian walkway.",
    category: "Waste Management",
    priority: "MEDIUM",
    severity: "MEDIUM",
    status: "IN_PROGRESS",
    location_text: "Central Plaza outside Metro Station Exit B",
    address_text: "100 Central Plaza, Downtown",
    latitude: 37.7785,
    longitude: -122.415,
    reporter_name: "Michael Scott",
    reporter_email: "michael.s@example.com",
    reporter_phone: "+1 (555) 432-1098",
    department_id: "dept-2",
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    resolved_at: null,
    images: [
      {
        id: "img-104-1",
        issue_id: "demo-issue-104",
        image_type: "INITIAL_REPORT",
        url: DEMO_SAMPLE_IMAGES.waste_bin,
        created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      },
    ],
    status_history: [
      {
        id: "hist-104-1",
        issue_id: "demo-issue-104",
        old_status: null,
        new_status: "SUBMITTED",
        notes: "Report logged.",
        changed_by_name: "Michael Scott",
        created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      },
      {
        id: "hist-104-2",
        issue_id: "demo-issue-104",
        old_status: "SUBMITTED",
        new_status: "ASSIGNED",
        notes: "Assigned to Elena Rodriguez.",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: "hist-104-3",
        issue_id: "demo-issue-104",
        old_status: "ASSIGNED",
        new_status: "IN_PROGRESS",
        notes: "Sanitation crew dispatched to empty and sanitize area.",
        changed_by_name: "Elena Rodriguez",
        created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      },
    ],
    assignments: [
      {
        id: "assign-104-1",
        issue_id: "demo-issue-104",
        department_id: "dept-2",
        worker_id: "worker-2",
        assigned_by_name: "Officer Alex Morgan",
        assigned_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        status: "ACCEPTED",
      },
    ],
  },
  {
    id: "demo-issue-105",
    title: "Burst Water Pipe Leaking on Elm Street",
    description:
      "Clean water gushing from broken pipe valve under the road curb.",
    category: "Water Supply",
    priority: "CRITICAL",
    severity: "CRITICAL",
    status: "RESOLVED",
    location_text: "214 Elm Street",
    address_text: "214 Elm St, East District",
    latitude: 37.7812,
    longitude: -122.4089,
    reporter_name: "Rachel Green",
    reporter_email: "rachel.g@example.com",
    reporter_phone: "+1 (555) 654-3210",
    department_id: "dept-3",
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    resolved_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    images: [
      {
        id: "img-105-1",
        issue_id: "demo-issue-105",
        image_type: "INITIAL_REPORT",
        url: DEMO_SAMPLE_IMAGES.water_leak,
        created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      },
    ],
    status_history: [
      {
        id: "hist-105-1",
        issue_id: "demo-issue-105",
        old_status: null,
        new_status: "SUBMITTED",
        notes: "Report logged.",
        changed_by_name: "Rachel Green",
        created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      },
      {
        id: "hist-105-2",
        issue_id: "demo-issue-105",
        old_status: "SUBMITTED",
        new_status: "RESOLVED",
        notes: "Valve replaced by Samira Patel. Verified by Officer Morgan.",
        changed_by_name: "Officer Alex Morgan",
        created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    ],
    assignments: [
      {
        id: "assign-105-1",
        issue_id: "demo-issue-105",
        department_id: "dept-3",
        worker_id: "worker-4",
        assigned_by_name: "Officer Alex Morgan",
        assigned_at: new Date(Date.now() - 40 * 3600000).toISOString(),
        status: "COMPLETED",
      },
    ],
  },
];
