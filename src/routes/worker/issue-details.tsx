import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  SquarePen,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  formatWorkerDepartmentLabel,
  formatWorkerIssueCoordinates,
  formatWorkerIssueDate,
  formatWorkerIssueDateTime,
  formatWorkerIssueImageUrl,
  formatWorkerIssuePriority,
  formatWorkerProfileLabel,
  getWorkerIssuePriorityTone,
  getWorkerIssueStatusLabel,
  getWorkerIssueStatusTone,
  type WorkerDepartmentRow,
  type WorkerIssueAiAnalysisRow,
  type WorkerIssueAssignmentRow,
  type WorkerIssueHistoryRow,
  type WorkerIssueImageRow,
  type WorkerProfileRow,
} from "@/lib/worker-issues";
import { pickCitizenIssueImageByType } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueRow = Pick<
  Database["public"]["Tables"]["issues"]["Row"],
  | "id"
  | "reporter_profile_id"
  | "title"
  | "description"
  | "category"
  | "priority"
  | "status"
  | "latitude"
  | "longitude"
  | "location_text"
  | "address_text"
  | "department_id"
  | "resolved_at"
  | "created_at"
  | "updated_at"
> & {
  issue_images?: WorkerIssueImageRow[] | null;
  issue_status_history?: WorkerIssueHistoryRow[] | null;
  department?: Pick<WorkerDepartmentRow, "id" | "name"> | null;
};

type AssignmentWithRelations = WorkerIssueAssignmentRow & {
  department?: Pick<WorkerDepartmentRow, "id" | "name"> | null;
  assigned_by?: Pick<WorkerProfileRow, "id" | "full_name" | "email"> | null;
  worker?: Pick<WorkerProfileRow, "id" | "full_name" | "email"> | null;
  issue?: IssueRow | null;
};

type DeptWorkerDetailsRow = {
  id: string;
  issue_department_assignment_id: string;
  worker_profile_id: string;
  assigned_by_profile_id: string | null;
  status: string;
  notes: string | null;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_by: Pick<WorkerProfileRow, "id" | "full_name" | "email"> | null;
  issue_department_assignment: {
    id: string;
    issue_id: string;
    department_id: string;
    status: string;
    department: Pick<WorkerDepartmentRow, "id" | "name"> | null;
    issue: IssueRow | null;
  } | null;
};

type TimelineItem = {
  id: string;
  statusLabel: string;
  description: string;
  timestamp: string;
  actorLabel: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  icon: LucideIcon;
};

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (historyItems.length === 0) {
    return [
      {
        id: "submitted",
        statusLabel: "Submitted",
        description: `Current status: ${getWorkerIssueStatusLabel(issue.status)}`,
        timestamp: issue.created_at,
        actorLabel: "Citizen report",
        tone: "default",
        icon: ClipboardList,
      },
    ];
  }

  return [
    {
      id: "submitted",
      statusLabel: "Submitted",
      description: "Citizen report created in CivicFix.",
      timestamp: issue.created_at,
      actorLabel: "Citizen report",
      tone: "default",
      icon: ClipboardList,
    },
    ...historyItems.map((history) => ({
      id: history.id,
      statusLabel: getWorkerTimelineStatusLabel(history.new_status),
      description: history.notes || formatHistoryTransition(history),
      timestamp: history.created_at,
      actorLabel: getTimelineActorLabel(history.new_status),
      tone: getWorkerIssueStatusTone(history.new_status),
      icon: getTimelineIcon(history.new_status),
    })),
  ];
}

function formatHistoryTransition(history: WorkerIssueHistoryRow) {
  const oldStatus = history.old_status ? getWorkerIssueStatusLabel(history.old_status) : "Created";
  const newStatus = getWorkerIssueStatusLabel(history.new_status);
  return `${oldStatus} → ${newStatus}`;
}

function getWorkerTimelineStatusLabel(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "UNDER_REVIEW") {
    return "Submitted for Review";
  }
  return getWorkerIssueStatusLabel(status);
}

function getTimelineActorLabel(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "SUBMITTED" || status === "AI_ANALYZED") {
    return "CivicFix System";
  }
  if (status === "VERIFIED" || status === "ASSIGNED" || status === "UNDER_REVIEW" || status === "REJECTED" || status === "REOPENED") {
    return "Municipal Officer";
  }
  if (status === "IN_PROGRESS" || status === "RESOLVED" || status === "CITIZEN_VERIFIED") {
    return "Field Worker";
  }
  return "Workflow Update";
}

function getTimelineIcon(status: Database["public"]["Enums"]["issue_status"]): LucideIcon {
  if (status === "AI_ANALYZED") return ShieldAlert;
  if (status === "VERIFIED" || status === "RESOLVED" || status === "CITIZEN_VERIFIED") return BadgeCheck;
  if (status === "ASSIGNED") return MapPin;
  if (status === "IN_PROGRESS") return SquarePen;
  if (status === "UNDER_REVIEW") return Clock3;
  if (status === "REJECTED" || status === "REOPENED") return AlertTriangle;
  return ClipboardList;
}

function getWorkflowStageIndex(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "IN_PROGRESS") return 1;
  if (status === "UNDER_REVIEW") return 2;
  if (status === "RESOLVED" || status === "CITIZEN_VERIFIED") return 3;
  if (status === "REJECTED") return 1;
  return 0;
}

const WORKFLOW_STAGES = [
  {
    key: "ASSIGNED",
    label: "Assigned",
    description: "Task routed to you and ready to start.",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    description: "Repairs actively underway in the field.",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
    description: "Resolution proof submitted for officer approval.",
  },
  {
    key: "RESOLVED",
    label: "Resolved",
    description: "Work verified and marked complete.",
  },
] as const;

type WorkerResolutionDraftCacheEntry = {
  compressedResolutionImage: File | null;
  resolutionNote: string;
  actionMessage: string | null;
  actionError: string | null;
  actionState: "idle" | "starting" | "submitting";
};

const workerResolutionDraftCache = new Map<string, WorkerResolutionDraftCacheEntry>();

function isWorkerNextActionStart(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "ASSIGNED" || status === "REOPENED" || status === "REJECTED";
}

function isWorkerReadyToSubmitResolution(status: Database["public"]["Enums"]["issue_status"]) {
  return status === "IN_PROGRESS";
}

function confidencePercent(value: number | null | undefined) {
  if (value == null) return "Not provided";
  return `${Math.round(value * 100)}%`;
}

async function readImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  const imageUrl = URL.createObjectURL(file);

  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(imageUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("We could not read that image."));
    };
    image.src = imageUrl;
  });
}

async function compressResolutionImage(file: File) {
  const MAX_IMAGE_DIMENSION = 1600;
  const IMAGE_QUALITY = 0.82;
  const { source, width, height, cleanup } = await readImageSource(file);

  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image compression is not available in this browser.");
    }

    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error("We could not prepare the image for upload."));
            return;
          }
          resolve(nextBlob);
        },
        "image/jpeg",
        IMAGE_QUALITY,
      );
    });

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "resolution-evidence"}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    cleanup();
  }
}

export function WorkerAssignedIssueDetailsPage() {
  const { issueId } = useParams();
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const [assignment, setAssignment] = useState<AssignmentWithRelations | null>(null);
  const [issue, setIssue] = useState<IssueRow | null>(null);
  const [deptWorkerAssignmentId, setDeptWorkerAssignmentId] = useState<string | null>(null);
  const [issueDeptAssignmentId, setIssueDeptAssignmentId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<WorkerIssueAiAnalysisRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [actionState, setActionState] = useState<"idle" | "starting" | "submitting">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [compressedResolutionImage, setCompressedResolutionImage] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const draftHydratedRef = useRef(false);
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  useEffect(() => {
    draftHydratedRef.current = false;

    if (!issueId) {
      return;
    }

    const cachedDraft = workerResolutionDraftCache.get(issueId);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setResolutionNote(cachedDraft?.resolutionNote ?? "");
      setCompressedResolutionImage(cachedDraft?.compressedResolutionImage ?? null);
      setActionMessage(cachedDraft?.actionMessage ?? null);
      setActionError(cachedDraft?.actionError ?? null);
      setActionState(cachedDraft?.actionState ?? "idle");
      draftHydratedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [issueId]);

  useEffect(() => {
    if (!issueId || !draftHydratedRef.current) {
      return;
    }

    workerResolutionDraftCache.set(issueId, {
      compressedResolutionImage,
      resolutionNote,
      actionMessage,
      actionError,
      actionState,
    });
  }, [actionError, actionMessage, actionState, compressedResolutionImage, issueId, resolutionNote]);

  const resolutionPreviewUrl = useMemo(() => {
    if (!compressedResolutionImage) {
      return null;
    }

    return URL.createObjectURL(compressedResolutionImage);
  }, [compressedResolutionImage]);

  useEffect(() => {
    return () => {
      if (resolutionPreviewUrl) {
        URL.revokeObjectURL(resolutionPreviewUrl);
      }
    };
  }, [resolutionPreviewUrl]);

  useEffect(() => {
    if (actionState !== "submitting") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [actionState]);

  useEffect(() => {
    if (sessionStatus !== "ready" || !profileId || !issueId) {
      return;
    }

    const currentProfileId = profileId;
    const currentIssueId = issueId;
    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      // Query from new department worker assignments
      const [deptWorkerResult, aiResult] = await Promise.all([
        supabase
          .from("department_worker_assignments")
          .select(
            `
            id,
            issue_department_assignment_id,
            worker_profile_id,
            assigned_by_profile_id,
            status,
            notes,
            assigned_at,
            started_at,
            completed_at,
            assigned_by:profiles!department_worker_assignments_assigned_by_profile_id_fkey(id, full_name, email),
            issue_department_assignment:issue_department_assignments(
              id,
              issue_id,
              department_id,
              status,
              department:departments(id, name),
              issue:issues(
                id,
                reporter_profile_id,
                title,
                description,
                category,
                priority,
                status,
                latitude,
                longitude,
                location_text,
                address_text,
                department_id,
                resolved_at,
                created_at,
                updated_at,
                department:departments(id, name),
                issue_images(id, storage_bucket, storage_path, image_type, created_at),
                issue_status_history(id, old_status, new_status, notes, created_at)
              )
            )
          `,
          )
          .eq("worker_profile_id", currentProfileId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("issue_ai_analysis")
          .select(
            "id, issue_id, provider, model, category_recommendation, severity_recommendation, priority_recommendation, department_recommendation, confidence_score, structured_response, created_at",
          )
          .eq("issue_id", currentIssueId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) {
        return;
      }

      if (deptWorkerResult.error && import.meta.env.DEV) {
        console.error("Worker dept assignment query failed", deptWorkerResult.error);
      }

      const deptWorkerRows = (deptWorkerResult.data ?? []) as unknown as DeptWorkerDetailsRow[];
      const matchingDeptAssignment = deptWorkerRows.find(
        (d) =>
          d.id === currentIssueId ||
          d.issue_department_assignment_id === currentIssueId ||
          d.issue_department_assignment?.issue_id === currentIssueId ||
          d.issue_department_assignment?.issue?.id === currentIssueId,
      );

      if (matchingDeptAssignment && matchingDeptAssignment.issue_department_assignment?.issue) {
        setDeptWorkerAssignmentId(matchingDeptAssignment.id);
        setIssueDeptAssignmentId(matchingDeptAssignment.issue_department_assignment_id);

        const d = matchingDeptAssignment;
        const deptAssign = d.issue_department_assignment;
        if (!deptAssign?.issue) {
          return;
        }
        const nextAssignment: AssignmentWithRelations = {
          id: d.id,
          issue_id: deptAssign.issue.id,
          department_id: deptAssign.department_id,
          worker_id: d.worker_profile_id,
          assigned_by_profile_id: d.assigned_by_profile_id ?? "",
          status: d.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
          assigned_at: d.assigned_at,
          unassigned_at: null,
          department: deptAssign.department ?? deptAssign.issue.department ?? null,
          assigned_by: d.assigned_by,
          worker: profile ? { id: profile.id, full_name: profile.full_name, email: profile.email } : null,
          issue: deptAssign.issue,
        };
        const nextIssue = nextAssignment.issue;
        if (nextIssue) {
          nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
          nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
        }
        setAssignment(nextAssignment);
        setIssue(nextIssue ?? null);
        setAiAnalysis(aiResult.data ?? null);
        setLoading(false);
        return;
      }

      // Fallback: load from legacy issue_assignments
      const assignmentResult = await supabase
        .from("issue_assignments")
        .select(
          `
          id,
          issue_id,
          department_id,
          worker_id,
          assigned_by_profile_id,
          status,
          assigned_at,
          unassigned_at,
          department:departments(id, name),
          assigned_by:profiles!issue_assignments_assigned_by_profile_id_fkey(id, full_name, email),
          worker:profiles!issue_assignments_worker_id_fkey(id, full_name, email),
          issue:issues(
            id,
            reporter_profile_id,
            title,
            description,
            category,
            priority,
            status,
            latitude,
            longitude,
            location_text,
            address_text,
            department_id,
            resolved_at,
            created_at,
            updated_at,
            department:departments(id, name),
            issue_images(id, storage_bucket, storage_path, image_type, created_at),
            issue_status_history(id, old_status, new_status, notes, created_at)
          )
        `,
        )
        .eq("issue_id", currentIssueId)
        .eq("worker_id", currentProfileId)
        .is("unassigned_at", null)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (assignmentResult.error) {
        if (import.meta.env.DEV) {
          console.error("Worker issue details load failed", assignmentResult.error);
        }
        setError("Unable to load this assigned issue right now.");
        setAssignment(null);
        setIssue(null);
        setAiAnalysis(null);
        setLoading(false);
        return;
      }

      if (!assignmentResult.data || !assignmentResult.data.issue) {
        setError("This issue is not assigned to your account or is no longer available.");
        setAssignment(null);
        setIssue(null);
        setAiAnalysis(null);
        setLoading(false);
        return;
      }

      const nextAssignment = assignmentResult.data as AssignmentWithRelations;
      const nextIssue = nextAssignment.issue;
      if (!nextIssue) {
        setError("This issue is not assigned to your account or is no longer available.");
        setAssignment(null);
        setIssue(null);
        setAiAnalysis(null);
        setLoading(false);
        return;
      }
      nextIssue.issue_images = [...(nextIssue.issue_images ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      nextIssue.issue_status_history = [...(nextIssue.issue_status_history ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      setAssignment(nextAssignment);
      setIssue(nextIssue);
      setAiAnalysis(aiResult.data ?? null);

      if (aiResult.error && import.meta.env.DEV) {
        console.error("Worker AI analysis load failed", aiResult.error);
      }

      setLoading(false);
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [issueId, profile, profileId, refreshNonce, sessionStatus]);

  const initialImage = issue ? pickCitizenIssueImageByType(issue, "INITIAL_REPORT") ?? issue.issue_images?.[0] ?? null : null;
  const resolutionImage = issue ? pickCitizenIssueImageByType(issue, "RESOLUTION_EVIDENCE") : null;
  const locationText = issue ? issue.address_text?.trim() || issue.location_text?.trim() || null : null;
  const coordinates = issue ? formatWorkerIssueCoordinates(issue.latitude, issue.longitude) : null;
  const timelineItems = issue ? buildTimeline(issue) : [];
  const statusTone = issue ? getWorkerIssueStatusTone(issue.status) : "default";
  const statusLabel = issue ? getWorkerIssueStatusLabel(issue.status) : "";
  const priorityTone = issue ? getWorkerIssuePriorityTone(issue.priority) : "default";
  const currentDepartment = assignment?.department ?? issue?.department ?? null;
  const currentWorker = assignment?.worker ?? null;
  const assignedBy = assignment?.assigned_by ?? null;

  // Find latest rejection note if present
  const latestRejection = useMemo(() => {
    if (!issue || !issue.issue_status_history) return null;
    const items = [...issue.issue_status_history]
      .filter((h) => h.new_status === "REJECTED" || h.new_status === "REOPENED")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items[0] ?? null;
  }, [issue]);

  const aiExplanation = !aiAnalysis
    ? null
    : (() => {
        const structured = aiAnalysis.structured_response;
        if (structured && typeof structured === "object" && !Array.isArray(structured)) {
          const record = structured as Record<string, unknown>;
          for (const key of ["summary", "explanation", "reasoning", "analysis", "notes"]) {
            const candidate = record[key];
            if (typeof candidate === "string" && candidate.trim()) {
              return candidate.trim();
            }
          }
        }

        const parts = [
          aiAnalysis.category_recommendation ? `category ${aiAnalysis.category_recommendation}` : null,
          aiAnalysis.priority_recommendation ? `priority ${aiAnalysis.priority_recommendation}` : null,
        ].filter(Boolean);

        if (parts.length === 0) {
          return "AI analysis completed.";
        }

        return `Recommended ${parts.join(" and ")} based on automated scan.`;
      })();

  const canStartWork = issue ? isWorkerNextActionStart(issue.status) : false;
  const canSubmitResolution = issue ? isWorkerReadyToSubmitResolution(issue.status) : false;
  const issueIsFinal = issue ? issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED" : false;
  const isRejected = issue?.status === "REJECTED" || issue?.status === "REOPENED";
  const isUnderReview = issue?.status === "UNDER_REVIEW";
  const isInProgress = issue?.status === "IN_PROGRESS";

  function clearResolutionDraft() {
    setCompressedResolutionImage(null);
    setResolutionNote("");
    setActionError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function clearResolutionImageSelection() {
    setCompressedResolutionImage(null);
    setActionError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function handleResolutionImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      clearResolutionImageSelection();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setActionError("Please choose an image file for resolution evidence.");
      clearResolutionImageSelection();
      return;
    }

    setActionError(null);
    setImageProcessing(true);

    try {
      const compressed = await compressResolutionImage(file);
      setCompressedResolutionImage(compressed);
    } catch (imageError) {
      if (import.meta.env.DEV) {
        console.error("Worker resolution image processing failed", imageError);
      }
      setActionError(
        import.meta.env.DEV
          ? `We could not prepare that image: ${imageError instanceof Error ? imageError.message : "Unknown image error"}`
          : "We could not prepare that image right now. Please try another file.",
      );
      clearResolutionDraft();
    } finally {
      setImageProcessing(false);
    }
  }

  function refreshIssue(message?: string) {
    if (message) {
      setActionMessage(message);
    }
    setActionState("idle");
    setRefreshNonce((value) => value + 1);
    clearResolutionDraft();
    setActionError(null);
    if (issueId) {
      workerResolutionDraftCache.delete(issueId);
    }
  }

  async function handleStartWork() {
    if (!issue || !profileId || actionState !== "idle") {
      return;
    }

    if (!canStartWork) {
      setActionError("This issue is not ready to start from its current status.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("starting");

    const { error: insertError } = await supabase.from("issue_status_history").insert({
      issue_id: issue.id,
      old_status: issue.status,
      new_status: "IN_PROGRESS",
      changed_by_profile_id: profileId,
      notes: isRejected
        ? "Field worker resumed work following officer revision request."
        : "Field worker started work on this assignment.",
    });

    if (insertError) {
      if (import.meta.env.DEV) {
        console.error("Worker start work insert failed", insertError);
      }
      setActionError(
        import.meta.env.DEV
          ? `Failed to start work: ${insertError.message}${insertError.code ? ` (${insertError.code})` : ""}`
          : "We could not start the work right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    if (deptWorkerAssignmentId) {
      await supabase
        .from("department_worker_assignments")
        .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
        .eq("id", deptWorkerAssignmentId);
    }
    if (issueDeptAssignmentId) {
      await supabase
        .from("issue_department_assignments")
        .update({ status: "IN_PROGRESS" })
        .eq("id", issueDeptAssignmentId);
    }

    refreshIssue("Work has been marked as in progress.");
  }

  async function handleSubmitResolution() {
    if (!issue || !profileId || actionState !== "idle") {
      return;
    }

    if (!canSubmitResolution) {
      setActionError("This issue is no longer waiting on a worker resolution submission.");
      return;
    }

    if (!compressedResolutionImage) {
      setActionError("Please select a resolution evidence photo before submitting.");
      return;
    }

    if (!resolutionNote.trim()) {
      setActionError("Please provide work notes describing what was repaired or completed.");
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setActionState("submitting");

    let uploadedPath: string | null = null;
    let uploadedImageId: string | null = null;

    try {
      uploadedPath = `${profileId}/${issue.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("resolution-images").upload(uploadedPath, compressedResolutionImage, {
        contentType: compressedResolutionImage.type,
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: imageData, error: imageInsertError } = await supabase
        .from("issue_images")
        .insert({
          issue_id: issue.id,
          storage_bucket: "resolution-images",
          storage_path: uploadedPath,
          image_type: "RESOLUTION_EVIDENCE",
          uploaded_by_profile_id: profileId,
        })
        .select("id")
        .single();

      if (imageInsertError) {
        throw imageInsertError;
      }

      uploadedImageId = imageData.id;

      const { error: historyError } = await supabase.from("issue_status_history").insert({
        issue_id: issue.id,
        old_status: issue.status,
        new_status: "UNDER_REVIEW",
        changed_by_profile_id: profileId,
        notes: resolutionNote.trim() || "Field worker submitted resolution evidence for officer review.",
      });

      if (historyError) {
        throw historyError;
      }

      if (deptWorkerAssignmentId) {
        await supabase
          .from("department_worker_assignments")
          .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
          .eq("id", deptWorkerAssignmentId);
      }

      if (issueDeptAssignmentId) {
        await supabase
          .from("issue_department_assignments")
          .update({ status: "UNDER_REVIEW", notes: resolutionNote.trim() })
          .eq("id", issueDeptAssignmentId);
      }
    } catch (resolveError) {
      if (import.meta.env.DEV) {
        console.error("Worker resolve issue failed", resolveError);
      }

      if (uploadedImageId) {
        await supabase.from("issue_images").delete().eq("id", uploadedImageId);
      }

      if (uploadedPath) {
        await supabase.storage.from("resolution-images").remove([uploadedPath]);
      }

      setActionError(
        import.meta.env.DEV
          ? `Failed to submit resolution evidence: ${resolveError instanceof Error ? resolveError.message : "Unknown error"}`
          : "We could not submit the resolution evidence right now. Please try again.",
      );
      setActionState("idle");
      return;
    }

    refreshIssue("Resolution evidence submitted successfully for officer review.");
  }

  if (sessionProblem || error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title="Issue Unavailable"
        description={sessionProblem ?? error ?? "We could not load this assigned task."}
        action={
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild>
              <Link to="/app/worker/assigned-issues">Back to Assigned Tasks</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/worker">Worker Dashboard</Link>
            </Button>
          </div>
        }
      />
    );
  }

  if (loading || !issue) {
    return (
      <div className="space-y-6">
        <div className="h-44 w-full animate-pulse rounded-[1.85rem] border border-teal-100/80 bg-teal-50/40" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
            <div className="h-48 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
          </div>
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
            <div className="h-72 animate-pulse rounded-[1.6rem] border border-border/70 bg-surface/80" />
          </div>
        </div>
      </div>
    );
  }

  const currentWorkflowIndex = getWorkflowStageIndex(issue.status);

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb, Badges and Actions */}
      <PageHeader
        backHref="/app/worker/assigned-issues"
        backLabel="Assigned Tasks"
        tag={`Task #${issue.id.slice(0, 8).toUpperCase()}`}
        title={issue.title}
        description={`Reported on ${formatWorkerIssueDate(issue.created_at)} · Last updated ${formatWorkerIssueDateTime(issue.updated_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone} size="lg">
              {statusLabel}
            </Badge>
            <Badge variant={priorityTone} size="lg">
              {formatWorkerIssuePriority(issue.priority)} Priority
            </Badge>
            <Badge variant="outline" size="lg">
              {issue.category}
            </Badge>
          </div>
        }
      />

      {/* 2. Alert Feedback Banners */}
      {actionMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-800 shadow-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 3. Rejection / Changes Requested Alert Banner */}
      {isRejected && (
        <div className="rounded-[1.6rem] border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-red-50/40 p-5 sm:p-6 shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300 bg-amber-100 text-amber-800">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-amber-900">Changes Requested by Officer</h2>
                <Badge variant="warning" size="sm">Rework Required</Badge>
              </div>

              {latestRejection?.notes ? (
                <div className="rounded-2xl border border-amber-200/80 bg-white/90 p-3.5 text-sm text-foreground leading-relaxed">
                  <p className="font-semibold text-xs text-amber-800 uppercase tracking-wider mb-1">Officer Notes:</p>
                  <p>{latestRejection.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-amber-800">
                  The reviewing officer requested revisions on this resolution. Please inspect the site, resume work, and upload new evidence.
                </p>
              )}

              <div className="pt-2">
                <Button
                  disabled={actionState !== "idle"}
                  onClick={() => void handleStartWork()}
                  className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-md min-h-[44px]"
                  size="default"
                  type="button"
                >
                  {actionState === "starting" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Resume Work Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
        {/* Left Column: Location, Problem Description, Citizen Photo, Progress History */}
        <div className="space-y-6">
          {/* Location Card (High Priority for Field Workers) */}
          <Card className="border border-border/80 bg-surface/95 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-emerald-50/50 via-surface to-teal-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Issue Location</CardTitle>
                    <p className="text-xs text-muted-foreground">Field navigation and coordinates</p>
                  </div>
                </div>
                {issue.latitude && issue.longitude && (
                  <Button asChild size="sm" variant="outline" className="text-xs font-semibold text-primary">
                    <a
                      href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Navigation className="h-3.5 w-3.5 mr-1.5" />
                      Open in Maps
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Address / Landmark</p>
                <p className="text-sm font-medium text-foreground leading-relaxed break-words">
                  {locationText || "No street address provided for this report."}
                </p>
              </div>

              {coordinates && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/60 p-3.5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GPS Coordinates</p>
                    <p className="text-xs sm:text-sm font-mono font-medium text-foreground mt-0.5">{coordinates}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="w-fit text-xs text-primary px-0 sm:px-3">
                    <a
                      href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Get Directions →
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Original Problem Description & Citizen Photo */}
          <Card className="border border-border/80 bg-surface/95 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-sky-50/50 via-surface to-teal-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Original Issue Report</CardTitle>
                  <p className="text-xs text-muted-foreground">Citizen complaint and photo evidence</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem Description</p>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground break-words whitespace-pre-wrap">
                    {issue.description}
                  </p>
                </div>
              </div>

              {/* Citizen Photo Evidence */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Citizen Photo Evidence</p>
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/60">
                  {initialImage ? (
                    <IssueImage
                      alt={`${issue.title} photo`}
                      className="min-h-[14rem] max-h-96 w-full"
                      imageClassName="object-contain"
                      src={formatWorkerIssueImageUrl(initialImage)}
                      variant="preview"
                    />
                  ) : (
                    <div className="flex min-h-[10rem] items-center justify-center p-6 text-center">
                      <div className="space-y-1">
                        <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground/60" />
                        <p className="text-xs font-medium text-muted-foreground">No citizen photo attached</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Department & Assignment Context */}
              <div className="grid gap-2.5 sm:grid-cols-3 pt-2 border-t border-border/60 text-xs">
                <div className="rounded-xl border border-border/60 bg-surface p-3">
                  <p className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Department</p>
                  <p className="font-medium text-foreground mt-0.5">{formatWorkerDepartmentLabel(currentDepartment)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface p-3">
                  <p className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Assigned By</p>
                  <p className="font-medium text-foreground mt-0.5">{formatWorkerProfileLabel(assignedBy)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface p-3">
                  <p className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Assigned Worker</p>
                  <p className="font-medium text-foreground mt-0.5">{formatWorkerProfileLabel(currentWorker)}</p>
                </div>
              </div>

              {/* AI Analysis badge / info (if available) */}
              {aiAnalysis && (
                <div className="rounded-2xl border border-violet-200/80 bg-violet-50/60 p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-violet-700 shrink-0" />
                    <p className="text-xs font-bold text-violet-900 uppercase tracking-wider">Automated AI Insights</p>
                    <span className="text-[10px] font-semibold text-violet-700 ml-auto">
                      {confidencePercent(aiAnalysis.confidence_score)} confidence
                    </span>
                  </div>
                  <p className="text-xs text-violet-800 leading-relaxed">{aiExplanation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress History Timeline */}
          <Card className="border border-border/80 bg-surface/95 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-slate-50 via-surface to-teal-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Progress History</CardTitle>
                    <p className="text-xs text-muted-foreground">Chronological audit log of transitions</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {timelineItems.length} {timelineItems.length === 1 ? "event" : "events"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="space-y-0">
                {timelineItems.map((item, index) => {
                  const Icon = item.icon;
                  const isLatest = index === timelineItems.length - 1;
                  const isLast = index === timelineItems.length - 1;

                  return (
                    <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Vertical line connecting events */}
                      {!isLast && (
                        <div
                          className="absolute left-4 top-8 -bottom-1 w-0.5 bg-gradient-to-b from-teal-500/40 via-border to-border"
                          aria-hidden="true"
                        />
                      )}

                      {/* Icon Node */}
                      <div
                        className={cn(
                          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
                          isLatest
                            ? "border-teal-300 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 text-white shadow-teal-950/20"
                            : "border-border/80 bg-surface text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>

                      {/* Content Card */}
                      <div
                        className={cn(
                          "flex-1 rounded-2xl border p-3.5 text-xs transition-all",
                          isLatest
                            ? "border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-sky-50/40 shadow-sm"
                            : "border-border/70 bg-background/50",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs sm:text-sm">{item.statusLabel}</span>
                            {isLatest && (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-800">
                                Latest
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-[11px]">{formatWorkerIssueDateTime(item.timestamp)}</span>
                        </div>

                        <p className="text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">{item.description}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          By: {item.actorLabel}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Already uploaded resolution evidence (if available) */}
              {resolutionImage && (
                <div className="mt-6 pt-5 border-t border-border/60 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Resolution Photo on File
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
                    <IssueImage
                      alt="Submitted resolution evidence"
                      className="min-h-[12rem] max-h-72 w-full"
                      imageClassName="object-contain"
                      src={formatWorkerIssueImageUrl(resolutionImage)}
                      variant="preview"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Primary Worker Action Panel & Resolution Upload */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* Action Card: What to do next */}
          <Card className="border border-border/80 bg-surface/95 overflow-hidden shadow-md">
            <CardHeader className="pb-3 border-b border-border/60 bg-gradient-to-r from-teal-50/60 via-surface to-cyan-50/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Field Worker Action</CardTitle>
                  <p className="text-xs text-muted-foreground">Execute and update your task</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* State 1: ASSIGNED (Ready to start) */}
              {canStartWork && !isRejected && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                    <p className="text-sm font-semibold text-sky-900">Ready to Begin Work</p>
                    <p className="mt-1 text-xs leading-relaxed text-sky-800">
                      When you arrive on site and start repairs, click below to mark this issue as <strong>In Progress</strong>.
                    </p>
                  </div>

                  <Button
                    disabled={actionState !== "idle"}
                    onClick={() => void handleStartWork()}
                    className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md min-h-[46px] text-sm font-semibold"
                    size="lg"
                    type="button"
                  >
                    {actionState === "starting" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Start Work
                  </Button>
                </div>
              )}

              {/* State 2: REJECTED (Resume work) */}
              {isRejected && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-sm font-semibold text-amber-900">Resume Field Work</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      Update the field repair and resume the task to submit new resolution photo evidence.
                    </p>
                  </div>

                  <Button
                    disabled={actionState !== "idle"}
                    onClick={() => void handleStartWork()}
                    className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 shadow-md min-h-[46px] text-sm font-semibold"
                    size="lg"
                    type="button"
                  >
                    {actionState === "starting" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    Resume Work
                  </Button>
                </div>
              )}

              {/* State 3: IN_PROGRESS (Resolution upload flow) */}
              {isInProgress && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-900">Work In Progress</p>
                    <p className="mt-1 text-xs leading-relaxed text-teal-800">
                      When repairs are complete, take or upload a clear resolution photo and submit for review.
                    </p>
                  </div>

                  {/* Photo selection input / Drag-and-drop */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Resolution Photo Evidence <span className="text-destructive">*</span>
                    </label>

                    {!compressedResolutionImage ? (
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50/40 via-surface to-sky-50/40 p-6 text-center transition hover:border-teal-500 hover:bg-teal-50/60"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            imageInputRef.current?.click();
                          }
                        }}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-200 bg-white text-teal-700 shadow-sm mb-2">
                          <Camera className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Add Resolution Photo</p>
                        <p className="mt-1 text-xs text-muted-foreground">Take a photo or choose from library (JPEG, PNG)</p>

                        <input
                          accept="image/*"
                          className="hidden"
                          disabled={imageProcessing}
                          onChange={(e) => void handleResolutionImageChange(e)}
                          ref={imageInputRef}
                          type="file"
                        />
                      </div>
                    ) : (
                      /* Live Preview of Selected Photo */
                      <div className="space-y-2.5 rounded-2xl border border-teal-200 bg-surface p-3">
                        <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
                          <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">Photo Ready</p>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => imageInputRef.current?.click()}
                              size="sm"
                              type="button"
                              variant="ghost"
                              className="text-xs h-7 px-2"
                            >
                              Change
                            </Button>
                            <Button
                              onClick={clearResolutionImageSelection}
                              size="sm"
                              type="button"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                          {resolutionPreviewUrl && (
                            <IssueImage
                              alt="Resolution evidence preview"
                              className="h-44 w-full"
                              imageClassName="object-contain"
                              src={resolutionPreviewUrl}
                              variant="preview"
                            />
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">
                          {compressedResolutionImage.name} ({(compressedResolutionImage.size / 1024).toFixed(0)} KB compressed)
                        </p>

                        <input
                          accept="image/*"
                          className="hidden"
                          disabled={imageProcessing}
                          onChange={(e) => void handleResolutionImageChange(e)}
                          ref={imageInputRef}
                          type="file"
                        />
                      </div>
                    )}

                    {imageProcessing && (
                      <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs font-medium text-sky-800">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                        Optimizing image for upload...
                      </div>
                    )}
                  </div>

                  {/* Resolution Notes Textarea */}
                  <div className="space-y-1.5">
                    <label htmlFor="resolution-note" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Work Notes / Description of Repairs <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="resolution-note"
                      className="w-full min-h-[5rem] rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Detail what was repaired/performed (e.g. 'Pothole filled with asphalt and compacted. Site cleared')."
                      value={resolutionNote}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    disabled={actionState !== "idle" || !compressedResolutionImage || !resolutionNote.trim() || imageProcessing}
                    onClick={() => void handleSubmitResolution()}
                    className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-md min-h-[46px] text-sm font-semibold"
                    size="lg"
                    type="button"
                  >
                    {actionState === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting Evidence...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Resolution for Review
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* State 4: UNDER_REVIEW */}
              {isUnderReview && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-center space-y-2">
                  <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-700 shadow-sm">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-violet-950">Awaiting Officer Review</p>
                  <p className="text-xs text-violet-800 leading-relaxed">
                    Resolution evidence has been submitted. The municipal officer will inspect the work and confirm resolution.
                  </p>
                </div>
              )}

              {/* State 5: RESOLVED */}
              {issueIsFinal && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center space-y-2">
                  <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-700 shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-emerald-950">Issue Resolved & Closed</p>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Great work! This task has been completely resolved and verified.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Stepper */}
          <Card className="border border-border/80 bg-surface/95 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Workflow Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2.5">
                {WORKFLOW_STAGES.map((stage, index) => {
                  const state = index < currentWorkflowIndex ? "complete" : index === currentWorkflowIndex ? "active" : "pending";

                  return (
                    <div
                      key={stage.key}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 text-xs transition-all",
                        state === "complete"
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-900"
                          : state === "active"
                            ? "border-teal-300 bg-gradient-to-r from-teal-50/80 to-cyan-50/60 text-foreground font-semibold shadow-sm"
                            : "border-border/60 bg-background/40 text-muted-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                          state === "complete"
                            ? "bg-emerald-600 text-white"
                            : state === "active"
                              ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {state === "complete" ? "✓" : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{stage.label}</p>
                          <span className="text-[10px] uppercase tracking-wider opacity-75">
                            {state === "complete" ? "Done" : state === "active" ? "Current" : "Upcoming"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

