import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEMO_DEPARTMENTS,
  DEMO_OFFICER_PROFILE,
  DEMO_SAMPLE_IMAGES,
  DEMO_WORKER_PROFILE,
  DEMO_WORKERS,
  INITIAL_DEMO_ISSUES,
  type DemoDepartment,
  type DemoIssue,
  type DemoProfile,
  type DemoRole,
} from "./demo-data";

const DEMO_STORAGE_KEY = "civicfix-demo-state-v1";

type DemoContextType = {
  isDemoMode: boolean;
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  currentUser: DemoProfile;
  issues: DemoIssue[];
  departments: DemoDepartment[];
  workers: DemoProfile[];
  getIssue: (id: string) => DemoIssue | undefined;
  verifyIssue: (
    issueId: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    departmentId?: string
  ) => void;
  assignIssue: (issueId: string, departmentId: string, workerId: string, notes?: string) => void;
  startWork: (issueId: string) => void;
  submitResolution: (issueId: string, notes: string, sampleImageKey?: keyof typeof DEMO_SAMPLE_IMAGES) => void;
  reviewResolution: (issueId: string, approved: boolean, notes: string) => void;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextType | null>(null);

function loadStoredDemoIssues(): DemoIssue[] {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as DemoIssue[];
      }
    }
  } catch (err) {
    console.warn("Demo storage load error, resetting to initial demo data", err);
  }
  return INITIAL_DEMO_ISSUES;
}

export function DemoProvider({
  initialRole = "MUNICIPAL_OFFICER",
  children,
}: {
  initialRole?: DemoRole;
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<DemoRole>(initialRole);
  const [issues, setIssues] = useState<DemoIssue[]>(loadStoredDemoIssues);

  // Sync issues to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(issues));
    } catch (err) {
      console.warn("Demo storage save error", err);
    }
  }, [issues]);

  const currentUser = role === "MUNICIPAL_OFFICER" ? DEMO_OFFICER_PROFILE : DEMO_WORKER_PROFILE;

  const getIssue = (id: string) => issues.find((issue) => issue.id === id);

  const verifyIssue = (
    issueId: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    departmentId?: string
  ) => {
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "VERIFIED",
            notes: `Verified by ${currentUser.full_name}. Priority: ${priority}, Severity: ${severity}.`,
            changed_by_name: currentUser.full_name,
            created_at: new Date().toISOString(),
          },
        ];

        return {
          ...issue,
          status: "VERIFIED",
          priority,
          severity,
          department_id: departmentId ?? issue.department_id,
          updated_at: new Date().toISOString(),
          status_history: newHistory,
        };
      })
    );
  };

  const assignIssue = (issueId: string, departmentId: string, workerId: string, notes?: string) => {
    const worker = DEMO_WORKERS.find((w) => w.id === workerId);
    const department = DEMO_DEPARTMENTS.find((d) => d.id === departmentId);

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newAssignment = {
          id: `assign-${Date.now()}`,
          issue_id: issueId,
          department_id: departmentId,
          worker_id: workerId,
          assigned_by_name: currentUser.full_name,
          assigned_at: new Date().toISOString(),
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
              `Assigned to ${worker?.full_name ?? "Worker"} (${department?.name ?? "Department"}) by ${currentUser.full_name}.`,
            changed_by_name: currentUser.full_name,
            created_at: new Date().toISOString(),
          },
        ];

        return {
          ...issue,
          status: "ASSIGNED",
          department_id: departmentId,
          updated_at: new Date().toISOString(),
          status_history: newHistory,
          assignments: [newAssignment, ...issue.assignments],
        };
      })
    );
  };

  const startWork = (issueId: string) => {
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
            notes: `Field work started by ${currentUser.full_name}.`,
            changed_by_name: currentUser.full_name,
            created_at: new Date().toISOString(),
          },
        ];

        return {
          ...issue,
          status: "IN_PROGRESS",
          updated_at: new Date().toISOString(),
          status_history: newHistory,
        };
      })
    );
  };

  const submitResolution = (
    issueId: string,
    notes: string,
    sampleImageKey: keyof typeof DEMO_SAMPLE_IMAGES = "pothole_fixed"
  ) => {
    const resolutionImageUrl = DEMO_SAMPLE_IMAGES[sampleImageKey] || DEMO_SAMPLE_IMAGES.pothole_fixed;

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const newImage = {
          id: `img-${Date.now()}`,
          issue_id: issueId,
          image_type: "RESOLUTION_EVIDENCE" as const,
          url: resolutionImageUrl,
          created_at: new Date().toISOString(),
        };

        const newHistory = [
          ...issue.status_history,
          {
            id: `hist-${Date.now()}`,
            issue_id: issueId,
            old_status: issue.status,
            new_status: "UNDER_REVIEW",
            notes: notes || `Work completed and evidence submitted by ${currentUser.full_name}.`,
            changed_by_name: currentUser.full_name,
            created_at: new Date().toISOString(),
          },
        ];

        return {
          ...issue,
          status: "UNDER_REVIEW",
          updated_at: new Date().toISOString(),
          images: [...issue.images, newImage],
          status_history: newHistory,
        };
      })
    );
  };

  const reviewResolution = (issueId: string, approved: boolean, notes: string) => {
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
                ? `Resolution approved by ${currentUser.full_name}. Issue resolved.`
                : `Resolution rejected by ${currentUser.full_name}. Returned to worker for rework.`),
            changed_by_name: currentUser.full_name,
            created_at: new Date().toISOString(),
          },
        ];

        return {
          ...issue,
          status: newStatus,
          resolved_at: approved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          status_history: newHistory,
        };
      })
    );
  };

  const resetDemo = () => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    setIssues(INITIAL_DEMO_ISSUES);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode: true,
        role,
        setRole,
        currentUser,
        issues,
        departments: DEMO_DEPARTMENTS,
        workers: DEMO_WORKERS,
        getIssue,
        verifyIssue,
        assignIssue,
        startWork,
        submitResolution,
        reviewResolution,
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
