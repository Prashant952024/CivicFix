import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEMO_DEPARTMENTS,
  DEMO_PERSONAS,
  DEMO_SAMPLE_IMAGES,
  DEMO_WORKERS,
  INITIAL_DEMO_CHALLENGES,
  INITIAL_DEMO_ISSUES,
  INITIAL_DEMO_NOTIFICATIONS,
  INITIAL_DEMO_PILOTS,
  INITIAL_DEMO_PROPOSALS,
  type DemoChallenge,
  type DemoDepartment,
  type DemoIssue,
  type DemoNotification,
  type DemoPersonaInfo,
  type DemoPilot,
  type DemoProposal,
  type DemoRole,
} from "./demo-data";

const DEMO_STORAGE_KEY_ISSUES = "civicfix_demo_sandbox_issues_v2";
const DEMO_STORAGE_KEY_CHALLENGES = "civicfix_demo_sandbox_challenges_v2";
const DEMO_STORAGE_KEY_PROPOSALS = "civicfix_demo_sandbox_proposals_v2";
const DEMO_STORAGE_KEY_PILOTS = "civicfix_demo_sandbox_pilots_v2";
const DEMO_STORAGE_KEY_NOTIFS = "civicfix_demo_sandbox_notifs_v2";
const DEMO_STORAGE_KEY_ROLE = "civicfix_demo_sandbox_role_v2";

type CreateIssueInput = {
  title: string;
  description: string;
  category: string;
  location_text: string;
  address_text?: string;
  district_name?: string;
  latitude?: number;
  longitude?: number;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  custom_image_url?: string;
};

type CreateChallengeInput = {
  title: string;
  sector: string;
  problem_statement: string;
  target_kpis: string[];
  budget_cap_crore: number;
};

type SubmitProposalInput = {
  challenge_id: string;
  proposed_budget_crore: number;
  timeline_months: number;
  sections: { number: number; title: string; content: string }[];
};

type DemoContextType = {
  isDemoMode: boolean;
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  currentPersona: DemoPersonaInfo;
  currentUser: DemoPersonaInfo;
  personas: DemoPersonaInfo[];
  
  // Issues (SIMPLE track)
  issues: DemoIssue[];
  createIssue: (input: CreateIssueInput) => string;
  getIssue: (id: string) => DemoIssue | undefined;
  verifyIssue: (
    issueId: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    departmentId?: string
  ) => void;
  assignIssue: (issueId: string, departmentId: string, workerId?: string, notes?: string) => void;
  startWork: (issueId: string) => void;
  submitResolution: (
    issueId: string,
    notes: string,
    sampleImageKey?: keyof typeof DEMO_SAMPLE_IMAGES,
    customImageUrl?: string
  ) => void;
  reviewResolution: (issueId: string, approved: boolean, notes: string) => void;
  officerSignOff: (issueId: string, notes: string) => void;
  citizenConfirmResolution: (issueId: string, confirmed: boolean, feedback?: string) => void;
  
  // Challenges & Proposals (COMPLEX track)
  challenges: DemoChallenge[];
  createChallenge: (input: CreateChallengeInput) => string;
  getChallenge: (id: string) => DemoChallenge | undefined;
  proposals: DemoProposal[];
  submitProposal: (input: SubmitProposalInput) => string;
  getProposal: (id: string) => DemoProposal | undefined;
  reviewProposal: (proposalId: string, approved: boolean, notes: string) => void;
  
  // Pilots & Industry Co-Funding
  pilots: DemoPilot[];
  getPilot: (id: string) => DemoPilot | undefined;
  updatePilotMilestone: (
    pilotId: string,
    milestoneId: string,
    status: "IN_PROGRESS" | "COMPLETED",
    achievedText?: string,
    evidenceNotes?: string
  ) => void;
  pledgeCoFunding: (
    pilotId: string,
    partnerName: string,
    amountCrore: number,
    hardwareNotes: string
  ) => void;

  // Metadata & Notifications
  departments: DemoDepartment[];
  workers: typeof DEMO_WORKERS;
  notifications: DemoNotification[];
  dismissNotification: (id: string) => void;
  
  // Sandbox Reset
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed) return parsed as T;
    }
  } catch (err) {
    console.warn(`Error loading demo state for ${key}:`, err);
  }
  return fallback;
}

export function DemoProvider({
  initialRole = "CITIZEN",
  children,
}: {
  initialRole?: DemoRole;
  children: React.ReactNode;
}) {
  const [role, setRoleState] = useState<DemoRole>(() =>
    loadFromStorage<DemoRole>(DEMO_STORAGE_KEY_ROLE, initialRole)
  );
  const [issues, setIssues] = useState<DemoIssue[]>(() =>
    loadFromStorage<DemoIssue[]>(DEMO_STORAGE_KEY_ISSUES, INITIAL_DEMO_ISSUES)
  );
  const [challenges, setChallenges] = useState<DemoChallenge[]>(() =>
    loadFromStorage<DemoChallenge[]>(DEMO_STORAGE_KEY_CHALLENGES, INITIAL_DEMO_CHALLENGES)
  );
  const [proposals, setProposals] = useState<DemoProposal[]>(() =>
    loadFromStorage<DemoProposal[]>(DEMO_STORAGE_KEY_PROPOSALS, INITIAL_DEMO_PROPOSALS)
  );
  const [pilots, setPilots] = useState<DemoPilot[]>(() =>
    loadFromStorage<DemoPilot[]>(DEMO_STORAGE_KEY_PILOTS, INITIAL_DEMO_PILOTS)
  );
  const [notifications, setNotifications] = useState<DemoNotification[]>(() =>
    loadFromStorage<DemoNotification[]>(DEMO_STORAGE_KEY_NOTIFS, INITIAL_DEMO_NOTIFICATIONS)
  );

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY_ROLE, JSON.stringify(role));
      localStorage.setItem(DEMO_STORAGE_KEY_ISSUES, JSON.stringify(issues));
      localStorage.setItem(DEMO_STORAGE_KEY_CHALLENGES, JSON.stringify(challenges));
      localStorage.setItem(DEMO_STORAGE_KEY_PROPOSALS, JSON.stringify(proposals));
      localStorage.setItem(DEMO_STORAGE_KEY_PILOTS, JSON.stringify(pilots));
      localStorage.setItem(DEMO_STORAGE_KEY_NOTIFS, JSON.stringify(notifications));
    } catch (err) {
      console.warn("Error saving demo sandbox state to localStorage:", err);
    }
  }, [role, issues, challenges, proposals, pilots, notifications]);

  const setRole = (newRole: DemoRole) => {
    setRoleState(newRole);
  };

  const currentPersona =
    DEMO_PERSONAS.find((p) => p.role === role) ?? DEMO_PERSONAS[0];

  // ==========================================================================
  // ISSUE WORKFLOW ACTIONS (SIMPLE TRACK)
  // ==========================================================================

  const getIssue = (id: string) => issues.find((issue) => issue.id === id);

  const createIssue = (input: CreateIssueInput): string => {
    const nextNum = 1000 + issues.length + 1;
    const issueId = `DEMO-CF-${nextNum}`;
    const now = new Date().toISOString();

    const initialImage = input.custom_image_url || DEMO_SAMPLE_IMAGES.pothole_reported;

    // Deterministic simulated AI triage
    const categoryLower = (input.category || input.title).toLowerCase();
    let detectedDept = "dept-1";
    let detectedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH";
    let detectedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "HIGH";
    let explanation = "AI visual model detected surface deterioration requiring departmental work order dispatch.";

    if (categoryLower.includes("water") || categoryLower.includes("pipe") || categoryLower.includes("drain")) {
      detectedDept = "dept-3";
      detectedSeverity = "CRITICAL";
      detectedPriority = "CRITICAL";
      explanation = "Hydraulic pressure drop or pipe rupture risk. Dispatched to Water Supply emergency triage.";
    } else if (categoryLower.includes("waste") || categoryLower.includes("garbage") || categoryLower.includes("trash")) {
      detectedDept = "dept-2";
      detectedSeverity = "MEDIUM";
      detectedPriority = "HIGH";
      explanation = "Solid bio-waste overflow. Requires scheduled compactor vehicle routing.";
    } else if (categoryLower.includes("light") || categoryLower.includes("electric") || categoryLower.includes("dark")) {
      detectedDept = "dept-4";
      detectedSeverity = "CRITICAL";
      detectedPriority = "CRITICAL";
      explanation = "Public lighting circuit outage in pedestrian transit corridor.";
    }

    const newIssue: DemoIssue = {
      id: issueId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category || "Roads & Infrastructure",
      priority: detectedPriority,
      severity: detectedSeverity,
      status: "SUBMITTED",
      location_text: input.location_text || "Main Road Junction",
      address_text: input.address_text || `${input.location_text}, Ranchi, Jharkhand 834001`,
      district_name: input.district_name || "Ranchi",
      latitude: input.latitude || 23.365 + (Math.random() - 0.5) * 0.05,
      longitude: input.longitude || 85.325 + (Math.random() - 0.5) * 0.05,
      reporter_name: input.reporter_name || currentPersona.fullName,
      reporter_email: input.reporter_email || currentPersona.email,
      reporter_phone: input.reporter_phone || currentPersona.phone || "+91 98765 43210",
      department_id: detectedDept,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      ai_analysis: {
        category: input.category || "Road Infrastructure",
        severity: detectedSeverity,
        priority: detectedPriority,
        department_code: detectedDept === "dept-1" ? "ROAD_INFRASTRUCTURE" : "MUNICIPAL_GEN",
        complexity: "SIMPLE",
        confidence_score: 0.95,
        explanation,
      },
      images: [
        {
          id: `img-${Date.now()}`,
          issue_id: issueId,
          image_type: "INITIAL_REPORT",
          url: initialImage,
          created_at: now,
        },
      ],
      status_history: [
        {
          id: `hist-${Date.now()}-1`,
          issue_id: issueId,
          old_status: null,
          new_status: "SUBMITTED",
          notes: `Grievance submitted by ${currentPersona.fullName} with geo-tagged proof.`,
          changed_by_name: currentPersona.fullName,
          created_at: now,
        },
      ],
      assignments: [],
    };

    setIssues((prev) => [newIssue, ...prev]);

    // Send simulated notification to Municipal Officer
    const notif: DemoNotification = {
      id: `notif-${Date.now()}`,
      recipient_role: "MUNICIPAL_OFFICER",
      title: "New Citizen Grievance Submitted",
      message: `${newIssue.title} (${issueId}) submitted in ${newIssue.district_name}.`,
      timestamp: now,
      read: false,
      link: "/demo/officer/issues",
    };
    setNotifications((prev) => [notif, ...prev]);

    return issueId;
  };

  const verifyIssue = (
    issueId: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    departmentId?: string
  ) => {
    const now = new Date().toISOString();
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const targetDept = departmentId ?? issue.department_id;
        const deptObj = DEMO_DEPARTMENTS.find((d) => d.id === targetDept);

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "VERIFIED",
            notes: `Verified by Municipal Officer ${currentPersona.fullName}. Priority set to ${priority}, routed to ${deptObj?.name ?? "Department"}.`,
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: "VERIFIED",
          priority,
          severity,
          department_id: targetDept,
          updated_at: now,
          status_history: newHistory,
        };
      })
    );

    // Notify Department Manager
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        recipient_role: "DEPARTMENT_MANAGER",
        title: "Work Order Routed to Department",
        message: `Issue ${issueId} verified and routed to your queue by ${currentPersona.fullName}.`,
        timestamp: now,
        read: false,
        link: "/demo/manager",
      },
      ...prev,
    ]);
  };

  const assignIssue = (
    issueId: string,
    departmentId: string,
    workerId?: string,
    notes?: string
  ) => {
    const worker = workerId ? DEMO_WORKERS.find((w) => w.id === workerId) : null;
    const department = DEMO_DEPARTMENTS.find((d) => d.id === departmentId);
    const now = new Date().toISOString();

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newAssignment = {
          id: `assign-${Date.now()}`,
          issue_id: issueId,
          department_id: departmentId,
          worker_id: workerId ?? null,
          assigned_by_name: currentPersona.fullName,
          assigned_at: now,
          status: "ASSIGNED" as const,
        };

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "ASSIGNED",
            notes:
              notes ||
              (worker
                ? `Assigned to ${worker.full_name} (${department?.name ?? "Department"}) by ${currentPersona.fullName}.`
                : `Routed to ${department?.name ?? "Department"} by ${currentPersona.fullName}.`),
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: "ASSIGNED",
          department_id: departmentId,
          updated_at: now,
          status_history: newHistory,
          assignments: [newAssignment, ...issue.assignments],
        };
      })
    );

    // Notify Field Worker
    if (workerId) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          recipient_role: "FIELD_WORKER",
          title: "New Task Assigned to You",
          message: `You were assigned ${issueId} by Manager ${currentPersona.fullName}.`,
          timestamp: now,
          read: false,
          link: "/demo/worker/assigned-issues",
        },
        ...prev,
      ]);
    }
  };

  const startWork = (issueId: string) => {
    const now = new Date().toISOString();
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "IN_PROGRESS",
            notes: `Field work started by ${currentPersona.fullName}. Machinery mobilized to site.`,
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: "IN_PROGRESS",
          updated_at: now,
          status_history: newHistory,
        };
      })
    );
  };

  const submitResolution = (
    issueId: string,
    notes: string,
    sampleImageKey: keyof typeof DEMO_SAMPLE_IMAGES = "pothole_fixed",
    customImageUrl?: string
  ) => {
    const now = new Date().toISOString();
    const resolutionImageUrl =
      customImageUrl || DEMO_SAMPLE_IMAGES[sampleImageKey] || DEMO_SAMPLE_IMAGES.pothole_fixed;

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newImage = {
          id: `img-${Date.now()}`,
          issue_id: issueId,
          image_type: "RESOLUTION_EVIDENCE" as const,
          url: resolutionImageUrl,
          created_at: now,
        };

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "UNDER_REVIEW",
            notes: notes || `Work completed and tamper-evident photo proof uploaded by ${currentPersona.fullName}.`,
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: "UNDER_REVIEW",
          updated_at: now,
          images: [...issue.images, newImage],
          status_history: newHistory,
        };
      })
    );

    // Notify Department Manager
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        recipient_role: "DEPARTMENT_MANAGER",
        title: "Resolution Evidence Submitted",
        message: `Field Worker ${currentPersona.fullName} submitted photo proof for ${issueId}.`,
        timestamp: now,
        read: false,
        link: "/demo/manager",
      },
      ...prev,
    ]);
  };

  const reviewResolution = (issueId: string, approved: boolean, notes: string) => {
    const now = new Date().toISOString();
    const newStatus = approved ? "RESOLVED" : "IN_PROGRESS";

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: newStatus,
            notes:
              notes ||
              (approved
                ? `Resolution approved by Department Manager ${currentPersona.fullName}. Ready for municipal sign-off.`
                : `Resolution rejected by Department Manager ${currentPersona.fullName}. Returned for rework: ${notes}`),
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: newStatus,
          resolved_at: approved ? now : null,
          updated_at: now,
          status_history: newHistory,
        };
      })
    );

    if (approved) {
      // Notify Officer and Citizen
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-1`,
          recipient_role: "MUNICIPAL_OFFICER",
          title: "Manager Approved Work Order",
          message: `${issueId} resolution approved by Department Manager. Final sign-off available.`,
          timestamp: now,
          read: false,
          link: "/demo/officer/issues",
        },
        {
          id: `notif-${Date.now()}-2`,
          recipient_role: "CITIZEN",
          title: "Your Reported Issue Has Been Resolved!",
          message: `Repairs for ${issueId} are complete. Please verify the photo evidence.`,
          timestamp: now,
          read: false,
          link: "/demo/citizen",
        },
        ...prev,
      ]);
    } else {
      // Notify Field Worker
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          recipient_role: "FIELD_WORKER",
          title: "Rework Requested by Manager",
          message: `Manager ${currentPersona.fullName} requested rework on ${issueId}. Notes: ${notes}`,
          timestamp: now,
          read: false,
          link: "/demo/worker/assigned-issues",
        },
        ...prev,
      ]);
    }
  };

  const officerSignOff = (issueId: string, notes: string) => {
    const now = new Date().toISOString();
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "RESOLVED",
            notes: notes || `Final administrative sign-off granted by Municipal Officer ${currentPersona.fullName}.`,
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: "RESOLVED",
          resolved_at: now,
          updated_at: now,
          status_history: newHistory,
        };
      })
    );
  };

  const citizenConfirmResolution = (issueId: string, confirmed: boolean, feedback?: string) => {
    const now = new Date().toISOString();
    const newStatus = confirmed ? "CITIZEN_VERIFIED" : "REOPENED";

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: newStatus,
            notes: confirmed
              ? `Citizen ${currentPersona.fullName} confirmed resolution: ${feedback || "Satisfied with repair quality."}`
              : `Citizen ${currentPersona.fullName} reopened issue: ${feedback || "Issue persists or incomplete repair."}`,
            changed_by_name: currentPersona.fullName,
            created_at: now,
          },
        ];

        return {
          ...issue,
          status: newStatus,
          updated_at: now,
          status_history: newHistory,
        };
      })
    );

    if (!confirmed) {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          recipient_role: "MUNICIPAL_OFFICER",
          title: "Issue Reopened by Citizen",
          message: `Citizen ${currentPersona.fullName} reopened ${issueId}. Reason: ${feedback || "Unsatisfied with resolution."}`,
          timestamp: now,
          read: false,
          link: "/demo/officer/issues",
        },
        ...prev,
      ]);
    }
  };

  // ==========================================================================
  // COMPLEX INNOVATION & PILOT ACTIONS
  // ==========================================================================

  const getChallenge = (id: string) => challenges.find((c) => c.id === id);

  const createChallenge = (input: CreateChallengeInput): string => {
    const nextNum = 200 + challenges.length + 1;
    const challengeId = `DEMO-CH-${nextNum}`;
    const now = new Date().toISOString();

    const newChallenge: DemoChallenge = {
      id: challengeId,
      title: input.title,
      sector: input.sector,
      problem_statement: input.problem_statement,
      target_kpis: input.target_kpis,
      budget_cap_crore: input.budget_cap_crore,
      status: "PUBLISHED",
      published_by: currentPersona.fullName,
      created_at: now,
      proposals_count: 0,
    };

    setChallenges((prev) => [newChallenge, ...prev]);

    // Notify Institution
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        recipient_role: "INSTITUTION",
        title: "New Municipal Innovation Challenge Published",
        message: `${newChallenge.title} published with grant cap of ₹${newChallenge.budget_cap_crore} Cr.`,
        timestamp: now,
        read: false,
        link: "/demo/institution",
      },
      ...prev,
    ]);

    return challengeId;
  };

  const getProposal = (id: string) => proposals.find((p) => p.id === id);

  const submitProposal = (input: SubmitProposalInput): string => {
    const nextNum = 300 + proposals.length + 1;
    const proposalId = `DEMO-PROP-${nextNum}`;
    const now = new Date().toISOString();
    const challenge = challenges.find((c) => c.id === input.challenge_id);

    const newProposal: DemoProposal = {
      id: proposalId,
      challenge_id: input.challenge_id,
      challenge_title: challenge?.title ?? "Municipal R&D Challenge",
      institution_id: currentPersona.id,
      institution_name: currentPersona.organization || currentPersona.fullName,
      lead_researcher: currentPersona.fullName,
      status: "SUBMITTED",
      proposed_budget_crore: input.proposed_budget_crore,
      timeline_months: input.timeline_months,
      sections: input.sections,
      submitted_at: now,
    };

    setProposals((prev) => [newProposal, ...prev]);

    // Update challenge proposals count
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === input.challenge_id
          ? { ...c, proposals_count: c.proposals_count + 1, status: "PROPOSALS_UNDER_REVIEW" }
          : c
      )
    );

    // Notify Innovation Manager
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        recipient_role: "INNOVATION_MANAGER",
        title: "New 11-Section Proposal Submitted",
        message: `${currentPersona.organization || currentPersona.fullName} submitted proposal ${proposalId} for ${challenge?.title}.`,
        timestamp: now,
        read: false,
        link: "/demo/innovation",
      },
      ...prev,
    ]);

    return proposalId;
  };

  const reviewProposal = (proposalId: string, approved: boolean, notes: string) => {
    const now = new Date().toISOString();
    const newStatus = approved ? "APPROVED" : "REJECTED";

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;
        return {
          ...p,
          status: newStatus,
          review_notes: notes,
        };
      })
    );

    if (approved) {
      const prop = proposals.find((p) => p.id === proposalId);
      if (prop) {
        // Automatically seed an active Pilot
        const nextPilotNum = 400 + pilots.length + 1;
        const newPilot: DemoPilot = {
          id: `DEMO-PILOT-${nextPilotNum}`,
          proposal_id: proposalId,
          challenge_title: prop.challenge_title,
          institution_name: prop.institution_name,
          status: "ACTIVE",
          progress_percent: 25,
          current_milestone: "Milestone 1: Lab Rig Setup & Initial Benchmark",
          milestones: [
            {
              id: "m-1",
              title: "Milestone 1: Lab Rig Setup & Initial Benchmark",
              target_date: "Month 2",
              status: "IN_PROGRESS",
              kpi_metric: "Bench Performance",
              kpi_target: "Baseline > 90% efficiency",
            },
            {
              id: "m-2",
              title: "Milestone 2: Field Trial Deployment",
              target_date: "Month 4",
              status: "PENDING",
              kpi_metric: "Field Operational Uptime",
              kpi_target: "> 99.5%",
            },
            {
              id: "m-3",
              title: "Milestone 3: Final Municipal Scaling Plan",
              target_date: "Month 6",
              status: "PENDING",
              kpi_metric: "Unit Cost Target",
              kpi_target: "< ₹0.05 / Litre or km",
            },
          ],
        };
        setPilots((prev) => [newPilot, ...prev]);
      }

      // Notify Institution & Industry Partner
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-1`,
          recipient_role: "INSTITUTION",
          title: "Proposal Approved! Pilot Initialized",
          message: `Your research proposal ${proposalId} has been approved by Innovation Director. Pilot workspace is live.`,
          timestamp: now,
          read: false,
          link: "/demo/institution/pilots",
        },
        {
          id: `notif-${Date.now()}-2`,
          recipient_role: "INDUSTRY_PARTNER",
          title: "New Co-Funding Opportunity Available",
          message: `Approved pilot for ${prop?.challenge_title} open for corporate co-funding and hardware pledges.`,
          timestamp: now,
          read: false,
          link: "/demo/industry",
        },
        ...prev,
      ]);
    }
  };

  const getPilot = (id: string) => pilots.find((p) => p.id === id);

  const updatePilotMilestone = (
    pilotId: string,
    milestoneId: string,
    status: "IN_PROGRESS" | "COMPLETED",
    achievedText?: string,
    evidenceNotes?: string
  ) => {
    setPilots((prev) =>
      prev.map((pilot) => {
        if (pilot.id !== pilotId) return pilot;

        const updatedMilestones = pilot.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          return {
            ...m,
            status,
            kpi_achieved: achievedText || m.kpi_achieved,
            evidence_notes: evidenceNotes || m.evidence_notes,
          };
        });

        const completedCount = updatedMilestones.filter((m) => m.status === "COMPLETED").length;
        const progress = Math.round((completedCount / updatedMilestones.length) * 100);

        return {
          ...pilot,
          progress_percent: progress,
          milestones: updatedMilestones,
          status: progress === 100 ? "COMPLETED" : "ACTIVE",
        };
      })
    );
  };

  const pledgeCoFunding = (
    pilotId: string,
    partnerName: string,
    amountCrore: number,
    hardwareNotes: string
  ) => {
    const now = new Date().toISOString();
    setPilots((prev) =>
      prev.map((pilot) => {
        if (pilot.id !== pilotId) return pilot;
        return {
          ...pilot,
          partner_name: partnerName || currentPersona.organization || currentPersona.fullName,
          partner_contribution_crore: amountCrore,
          partner_hardware_notes: hardwareNotes,
        };
      })
    );

    // Notify Innovation Manager & Institution
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-1`,
        recipient_role: "INNOVATION_MANAGER",
        title: "Industry Partner Pledged Co-Funding",
        message: `${partnerName || currentPersona.fullName} pledged ₹${amountCrore} Cr for pilot ${pilotId}.`,
        timestamp: now,
        read: false,
        link: "/demo/innovation",
      },
      {
        id: `notif-${Date.now()}-2`,
        recipient_role: "INSTITUTION",
        title: "Hardware / Co-Funding Partner Joined Pilot",
        message: `${partnerName || currentPersona.fullName} joined ${pilotId} with ₹${amountCrore} Cr co-funding.`,
        timestamp: now,
        read: false,
        link: "/demo/institution/pilots",
      },
      ...prev,
    ]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const resetDemo = () => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY_ROLE);
      localStorage.removeItem(DEMO_STORAGE_KEY_ISSUES);
      localStorage.removeItem(DEMO_STORAGE_KEY_CHALLENGES);
      localStorage.removeItem(DEMO_STORAGE_KEY_PROPOSALS);
      localStorage.removeItem(DEMO_STORAGE_KEY_PILOTS);
      localStorage.removeItem(DEMO_STORAGE_KEY_NOTIFS);
    } catch {
      // ignore
    }
    setIssues(INITIAL_DEMO_ISSUES);
    setChallenges(INITIAL_DEMO_CHALLENGES);
    setProposals(INITIAL_DEMO_PROPOSALS);
    setPilots(INITIAL_DEMO_PILOTS);
    setNotifications(INITIAL_DEMO_NOTIFICATIONS);
    setRoleState("CITIZEN");
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode: true,
        role,
        setRole,
        currentPersona,
        currentUser: currentPersona,
        personas: DEMO_PERSONAS,
        issues,
        createIssue,
        getIssue,
        verifyIssue,
        assignIssue,
        startWork,
        submitResolution,
        reviewResolution,
        officerSignOff,
        citizenConfirmResolution,
        challenges,
        createChallenge,
        getChallenge,
        proposals,
        submitProposal,
        getProposal,
        reviewProposal,
        pilots,
        getPilot,
        updatePilotMilestone,
        pledgeCoFunding,
        departments: DEMO_DEPARTMENTS,
        workers: DEMO_WORKERS,
        notifications,
        dismissNotification,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
