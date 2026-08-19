import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Clock3,
  ImageIcon,
  Loader2,
  MapPin,
  Save,
  ShieldAlert,
  SquarePen,
  ThumbsUp,
  UploadCloud,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Button } from "@/components/ui/button";
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
  pickWorkerIssueThumbnail,
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

type TimelineItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

function badgeToneClasses(tone: "default" | "success" | "warning" | "danger" | "info") {
  return tone === "success"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "danger"
        ? "bg-red-50 text-red-700 ring-red-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
}

function buildTimeline(issue: IssueRow): TimelineItem[] {
  const historyItems = [...(issue.issue_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (historyItems.length === 0) {
    return [
      {
        id: "submitted",
        title: "Submitted",
        description: `Current status: ${getWorkerIssueStatusLabel(issue.status)}`,
        timestamp: issue.created_at,
        tone: "default",
      },
    ];
  }

  return [
    {
      id: "submitted",
      title: "Submitted",
      description: "Citizen report created in CivicFix.",
      timestamp: issue.created_at,
      tone: "default",
    },
    ...historyItems.map((history) => ({
      id: history.id,
      title: getWorkerTimelineStatusLabel(history.new_status),
      description: history.notes || formatHistoryTransition(history),
      timestamp: history.created_at,
      tone: getWorkerIssueStatusTone(history.new_status),
    })),
  ];
}

type IssueHistoryRow = WorkerIssueHistoryRow;

function formatHistoryTransition(history: IssueHistoryRow) {
  const oldStatus = history.old_status ? getWorkerIssueStatusLabel(history.old_status) : "Created";
  const newStatus = getWorkerIssueStatusLabel(history.new_status);
  return `${oldStatus} -> ${newStatus}`;
}

function getWorkerTimelineStatusLabel(status: Database["public"]["Enums"]["issue_status"]) {
  if (status === "UNDER_REVIEW") {
    return "Submitted for Review";
  }

  return getWorkerIssueStatusLabel(status);
}

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
  if (value == null) {
    return "Not provided";
  }

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

      const [assignmentResult, aiResult] = await Promise.all([
        supabase
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
          .maybeSingle(),
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
  }, [issueId, profileId, refreshNonce, sessionStatus]);

  const heroImage = issue ? pickWorkerIssueThumbnail(issue) : null;
  const initialImage = issue ? pickCitizenIssueImageByType(issue, "INITIAL_REPORT") : null;
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
          return "AI analysis is available for this issue, but no explanation text was provided.";
        }

        return `The model recommends ${parts.join(" and ")} for field execution and routing.`;
      })();

  const canStartWork = issue ? isWorkerNextActionStart(issue.status) : false;
  const canSubmitResolution = issue ? isWorkerReadyToSubmitResolution(issue.status) : false;
  const issueIsFinal = issue ? issue.status === "RESOLVED" || issue.status === "CITIZEN_VERIFIED" : false;
  const startWorkButtonLabel = issue?.status === "REJECTED" ? "Resume Work" : "Start Work";

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
      notes: "Field worker started work on this assignment.",
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

    refreshIssue("Work has been marked as in progress.");
  }

  function removeResolutionImage() {
    clearResolutionImageSelection();
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
      setActionError("Please select a resolution evidence image before submitting.");
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

    refreshIssue("Resolution evidence submitted successfully.");
  }

  if (sessionProblem || error) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Issue unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem ?? error}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/app/worker/assigned-issues">Back to Assigned Issues</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/worker">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (loading || !issue) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-muted/60" />
            <div className="h-9 w-full max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted/40" />
          </div>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
          <div className="h-[34rem] animate-pulse rounded-[1.75rem] border border-border/80 bg-surface/90" />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                <Link to="/app/worker/assigned-issues">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Assigned Issues
                </Link>
              </Button>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Issue #{issue.id.slice(0, 8).toUpperCase()}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{issue.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(statusTone)}`}>
                {statusLabel}
              </span>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(priorityTone)}`}>
                Priority {formatWorkerIssuePriority(issue.priority)}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {issue.category}
              </span>
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-medium text-emerald-800">
            {actionMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-800">
            {actionError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <IssueImage alt={issue.title} className="border-b border-border/70" emptyLabel="No image attached" src={heroImage} variant="hero" />

            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatWorkerIssueDate(issue.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Updated</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatWorkerIssueDateTime(issue.updated_at)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assignment</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/70 bg-background/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Department</p>
                          <p className="break-words mt-2 text-sm font-medium text-foreground">{formatWorkerDepartmentLabel(currentDepartment)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assigned date</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{assignment ? formatWorkerIssueDateTime(assignment.assigned_at) : "Unavailable"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assigned by</p>
                          <p className="break-words mt-2 text-sm font-medium text-foreground">{formatWorkerProfileLabel(assignedBy)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current worker</p>
                          <p className="break-words mt-2 text-sm font-medium text-foreground">
                            {currentWorker ? formatWorkerProfileLabel(currentWorker) : "Current worker assignment unavailable."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {locationText ? (
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{locationText}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {coordinates ? (
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GPS</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{coordinates}</p>
                        <a
                          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
                          href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Issue evidence</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Citizen image and resolution context</h3>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              {initialImage ? (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Citizen image</p>
                  </div>
                  <IssueImage
                    alt={`${issue.title} report image`}
                    className="rounded-none"
                    emptyLabel="Original image unavailable"
                    imageClassName="object-contain"
                    src={formatWorkerIssueImageUrl(initialImage)}
                    variant="preview"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-border/70 bg-surface-elevated">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">No image attached</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status timeline</p>
                <div className="mt-4 grid gap-3">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/70 bg-background/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeToneClasses(item.tone)}`}>
                            {item.title}
                          </span>
                          <p className="mt-2 text-xs text-muted-foreground">{formatWorkerIssueDateTime(item.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {resolutionImage ? (
              <div className="border-t border-border/70 p-6">
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                  <div className="border-b border-border/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolution evidence</p>
                  </div>
                  <IssueImage
                    alt={`${issue.title} resolution evidence`}
                    className="rounded-none"
                    emptyLabel="Resolution evidence unavailable"
                    imageClassName="object-contain"
                    src={formatWorkerIssueImageUrl(resolutionImage)}
                    variant="preview"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AI information</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">AI analysis and routing signal</h3>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm shadow-violet-950/5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">AI analysis</p>
                {aiAnalysis ? (
                  <div className="mt-4 grid gap-3 text-sm">
                    <p className="text-foreground">Detected category: <span className="text-muted-foreground">{aiAnalysis.category_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">AI priority: <span className="text-muted-foreground">{aiAnalysis.priority_recommendation || "Not provided"}</span></p>
                    <p className="text-foreground">Confidence: <span className="text-muted-foreground">{confidencePercent(aiAnalysis.confidence_score)}</span></p>
                    <p className="text-foreground">Source: <span className="text-muted-foreground">{aiAnalysis.provider} · {aiAnalysis.model}</span></p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-white/80 p-4">
                    <p className="text-sm font-medium text-foreground">AI analysis pending.</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      When analysis data is available, it will appear here for comparison with the field worker decision.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Explanation</p>
                <div className="mt-4 rounded-2xl border border-border/70 bg-background/30 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">{aiExplanation ?? "AI analysis pending."}</p>
                </div>
              </div>
            </div>
          </section>
        </article>

        <aside className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <SquarePen className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Work progress</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Start or complete the task</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-sm font-medium text-foreground">Current status: {statusLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use the next action below to move this issue through the field workflow without leaving the assigned scope.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {canStartWork ? (
                  <Button disabled={actionState !== "idle"} onClick={() => void handleStartWork()} type="button">
                    {actionState === "starting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsUp className="h-4 w-4" aria-hidden="true" />}
                    {startWorkButtonLabel}
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                    <p className="text-sm font-medium text-foreground">
                      {issue.status === "IN_PROGRESS"
                        ? "Work in progress"
                        : issue.status === "UNDER_REVIEW"
                          ? "Awaiting Officer Review"
                          : issue.status === "ASSIGNED"
                            ? "Ready to start work"
                            : issue.status === "REJECTED"
                              ? "Work was rejected and can now be resumed"
                              : issueIsFinal
                                ? "Resolved"
                                : "This issue is not ready for a worker action yet."}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">What happens next</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Starting work moves the issue into progress. When the task is finished, mark it resolved and attach optional evidence.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
                  <Save className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Resolution evidence</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">Upload Resolution Evidence</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-sm font-medium text-foreground">Current priority: {formatWorkerIssuePriority(issue.priority)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Upload a photo of the fixed issue, add a short note if needed, and submit it for officer review.
                </p>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Resolution note</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder="Summarize what was fixed or completed."
                  value={resolutionNote}
                />
              </label>

              {issue.status === "IN_PROGRESS" ? (
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-border/80 bg-background/30 p-4 transition hover:border-primary/50 hover:bg-background/40">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <UploadCloud className="h-4 w-4 text-primary" aria-hidden="true" />
                      Upload Resolution Evidence
                    </span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      Choose a photo showing the completed field work.
                    </span>
                    <input
                      accept="image/*"
                      className="hidden"
                      disabled={imageProcessing}
                      onChange={(event) => void handleResolutionImageChange(event)}
                      ref={imageInputRef}
                      type="file"
                    />
                  </label>

                  {resolutionPreviewUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface-elevated">
                      <div className="border-b border-border/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected preview</p>
                      </div>
                      <IssueImage
                        alt="Selected resolution evidence preview"
                        className="rounded-none"
                        emptyLabel="No preview selected"
                        imageClassName="object-contain"
                        src={resolutionPreviewUrl}
                        variant="preview"
                      />
                    </div>
                  ) : null}

                  {compressedResolutionImage ? (
                    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{compressedResolutionImage.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {compressedResolutionImage.type} · {Math.round(compressedResolutionImage.size / 1024)} KB
                          </p>
                        </div>
                        <Button onClick={removeResolutionImage} size="sm" variant="outline" type="button">
                          <X className="h-4 w-4" aria-hidden="true" />
                          Remove Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-4 text-sm leading-6 text-muted-foreground">
                      Before you submit, choose the finished-work image you want to send to the officer.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {resolutionImage
                      ? issue.status === "UNDER_REVIEW"
                        ? "Resolution evidence has already been submitted and is waiting for officer review."
                        : issue.status === "REJECTED"
                          ? "The officer rejected the previous submission. Resume work to submit updated evidence."
                          : issueIsFinal
                            ? "This issue is already complete."
                            : "Resolution evidence is not available to upload from this state."
                      : "Resolution evidence upload is only available after the task is in progress."}
                  </p>
                </div>
              )}

              {compressedResolutionImage && issue.status === "IN_PROGRESS" ? (
                <Button
                  disabled={actionState !== "idle" || !canSubmitResolution || imageProcessing}
                  onClick={() => void handleSubmitResolution()}
                  type="button"
                >
                  {actionState === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  {actionState === "submitting" ? "Submitting..." : "Submit Resolution"}
                </Button>
              ) : null}

              <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current resolution state</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {issue.status === "ASSIGNED"
                    ? "This task is ready to begin."
                    : issue.status === "IN_PROGRESS"
                      ? "Work is in progress. Upload the completed evidence when finished."
                      : issue.status === "UNDER_REVIEW"
                        ? "Resolution evidence has been submitted and is waiting for officer approval."
                        : issue.status === "REJECTED"
                          ? "The officer rejected the previous submission. Resume work and submit updated evidence."
                          : issueIsFinal
                            ? "This issue is already complete."
                            : "This issue is not ready for a worker action."}
                </p>
                {resolutionImage ? (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Latest resolution evidence submitted {formatWorkerIssueDateTime(resolutionImage.created_at)}.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
