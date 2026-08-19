import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Navigation2,
  Paperclip,
  UploadCloud,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { citizenIssueCategories, formatCitizenIssueDate, type CitizenIssueCategory } from "@/lib/citizen-issues";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type IssueStatus = Database["public"]["Enums"]["issue_status"];

type FormErrors = Partial<{
  title: string;
  description: string;
  category: string;
  location: string;
  image: string;
}>;

type ReportStage = "idle" | "saving" | "uploading" | "finalizing";
type LocationStatus = "idle" | "requesting" | "detected" | "error";

type SubmissionOutcome =
  | {
      kind: "success";
      issueId: string;
      status: IssueStatus;
      submittedAt: string;
      title: string;
      category: string;
    }
  | {
      kind: "partial-error";
      issueId: string;
      submittedAt: string;
      message: string;
    };

type UploadedIssue = {
  id: string;
  created_at: string;
  status: IssueStatus;
};

type DebugSupabaseError = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

type CitizenReportDraft = {
  title: string;
  description: string;
  category: CitizenIssueCategory | "";
  locationText: string;
  latitude: string | null;
  longitude: string | null;
  locationAccuracyMeters: number | null;
  locationStatus: LocationStatus;
  rawImage: File | null;
  compressedImage: File | null;
};

const citizenReportDraftCache = new Map<string, CitizenReportDraft>();

function createEmptyCitizenReportDraft(): CitizenReportDraft {
  return {
    title: "",
    description: "",
    category: "",
    locationText: "",
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationStatus: "idle",
    rawImage: null,
    compressedImage: null,
  };
}

function safeFileBaseName(name: string) {
  const stripped = name.replace(/\.[^.]+$/, "");
  const normalized = stripped.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
  return normalized || "issue-photo";
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

async function compressIssueImage(file: File) {
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

    return new File([blob], `${safeFileBaseName(file.name)}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    cleanup();
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractSupabaseError(error: unknown): DebugSupabaseError {
  if (error && typeof error === "object") {
    const typed = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    return {
      message: typeof typed.message === "string" && typed.message.trim() ? typed.message : "Unknown Supabase error",
      code: typeof typed.code === "string" ? typed.code : null,
      details: typeof typed.details === "string" ? typed.details : null,
      hint: typeof typed.hint === "string" ? typed.hint : null,
    };
  }

  return {
    message: "Unknown Supabase error",
    code: null,
    details: null,
    hint: null,
  };
}

function formatErrorMessage(error: DebugSupabaseError) {
  return `${error.message}${error.code ? ` (${error.code})` : ""}`;
}

function devLogSubmissionFailure(
  operation: string,
  error: unknown,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  const supabaseError = extractSupabaseError(error);
  console.error(`[CitizenReport] ${operation} failed`, {
    ...context,
    message: supabaseError.message,
    code: supabaseError.code,
    details: supabaseError.details,
    hint: supabaseError.hint,
  });
}

function buildUserFacingError(operation: string, error: unknown) {
  const supabaseError = extractSupabaseError(error);
  return import.meta.env.DEV
    ? `${operation} failed: ${formatErrorMessage(supabaseError)}`
    : `We could not complete the report while ${operation.toLowerCase()}. Please try again.`;
}

function getStageLabel(stage: ReportStage) {
  switch (stage) {
    case "saving":
      return "Saving report";
    case "uploading":
      return "Uploading photo";
    case "finalizing":
      return "Finalizing submission";
    default:
      return "Ready to submit";
  }
}

export function CitizenReportPage() {
  const { profile, status: sessionStatus, error: sessionError } = useAppSession();
  const profileId = profile?.id;
  const sessionProblem = sessionStatus === "error" ? sessionError ?? "CivicFix profile is unavailable." : null;

  if (sessionProblem) {
    return (
      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
        <div className="max-w-2xl space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Report form unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">{sessionProblem}</p>
          </div>
          <Button asChild>
            <Link to="/app/citizen">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!profileId || sessionStatus !== "ready") {
    return (
      <div className="grid min-h-[40vh] place-items-center px-4 text-sm text-muted-foreground">
        <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
          Loading Citizen report form...
        </div>
      </div>
    );
  }

  return <CitizenReportComposer key={profileId} profileId={profileId} />;
}

function CitizenReportComposer({ profileId }: { profileId: string }) {
  const navigate = useNavigate();
  const initialDraft = citizenReportDraftCache.get(profileId) ?? createEmptyCitizenReportDraft();
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [category, setCategory] = useState<CitizenIssueCategory | "">(initialDraft.category);
  const [locationText, setLocationText] = useState(initialDraft.locationText);
  const [latitude, setLatitude] = useState<string | null>(initialDraft.latitude);
  const [longitude, setLongitude] = useState<string | null>(initialDraft.longitude);
  const [locationAccuracyMeters, setLocationAccuracyMeters] = useState<number | null>(initialDraft.locationAccuracyMeters);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(initialDraft.locationStatus);
  const [rawImage, setRawImage] = useState<File | null>(initialDraft.rawImage);
  const [compressedImage, setCompressedImage] = useState<File | null>(initialDraft.compressedImage);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<ReportStage>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmissionOutcome | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!compressedImage) {
      return null;
    }

    return URL.createObjectURL(compressedImage);
  }, [compressedImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    citizenReportDraftCache.set(
      profileId,
      {
        title,
        description,
        category,
        locationText,
        latitude,
        longitude,
        locationAccuracyMeters,
        locationStatus,
        rawImage,
        compressedImage,
      },
    );
  }, [
    category,
    compressedImage,
    description,
    latitude,
    locationAccuracyMeters,
    locationStatus,
    locationText,
    longitude,
    profileId,
    rawImage,
    title,
  ]);

  function resetImageSelection({ clearError = false }: { clearError?: boolean } = {}) {
    setRawImage(null);
    setCompressedImage(null);
    if (clearError) {
      setErrors((current) => ({ ...current, image: undefined }));
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function clearCitizenReportDraft() {
    citizenReportDraftCache.delete(profileId);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setSubmitError(null);
    setOutcome(null);
    setErrors((current) => ({ ...current, image: undefined }));

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, image: "Please choose a JPG, PNG, HEIC, or WebP image." }));
      resetImageSelection();
      return;
    }

    setImageProcessing(true);

    try {
      const nextImage = await compressIssueImage(file);
      setRawImage(file);
      setCompressedImage(nextImage);
    } catch (imageError) {
      console.error("Citizen image preparation failed", imageError);
      setErrors((current) => ({ ...current, image: "We could not prepare that image. Please choose another file." }));
      resetImageSelection();
    } finally {
      setImageProcessing(false);
    }
  }

  function handleCurrentLocation() {
    setGeoError(null);
    setLocationStatus("requesting");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setGeoError("This browser does not support location capture.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationAccuracyMeters(position.coords.accuracy);
        setLocationStatus("detected");
        setGeoLoading(false);
      },
      (positionError) => {
        setGeoLoading(false);
        setLocationAccuracyMeters(null);
        setLocationStatus("error");
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setGeoError("Location access was denied. You can keep going and submit the report without GPS.");
          return;
        }

        if (positionError.code === positionError.TIMEOUT) {
          setGeoError("Location request timed out. You can retry or continue without GPS.");
          return;
        }

        if (positionError.code === positionError.POSITION_UNAVAILABLE) {
          setGeoError("Location is currently unavailable. Try again in a moment or continue without GPS.");
          return;
        }

        setGeoError("We could not capture your location right now. You can continue manually.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  async function handleSubmit() {
    if (submissionStage !== "idle" || outcome) {
      return;
    }

    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationText.trim();
    const imageToUpload = compressedImage;

    if (!trimmedTitle) nextErrors.title = "Issue title is required.";
    if (!trimmedDescription) nextErrors.description = "Issue description is required.";
    if (!category) nextErrors.category = "Please choose a category.";
    if (!trimmedLocation) nextErrors.location = "Please add a location.";
    if (!imageToUpload) {
      setErrors((current) => ({ ...current, image: undefined }));
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmissionStage("saving");

    let uploadedIssue: UploadedIssue | null = null;

    try {
      const issueId = crypto.randomUUID();
      const issueInsertPayload = {
        id: issueId,
        reporter_profile_id: profileId,
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        location_text: trimmedLocation,
        latitude,
        longitude,
      };

      const { error: issueError } = await supabase
        .from("issues")
        .insert(issueInsertPayload);

      if (issueError) {
        devLogSubmissionFailure("issue insert", issueError, {
          issueId,
          profileId,
          hasImage: Boolean(imageToUpload),
        });
        throw issueError;
      }

      uploadedIssue = {
        id: issueId,
        created_at: new Date().toISOString(),
        status: "SUBMITTED",
      };

      const { data: createdIssue, error: createdIssueError } = await supabase
        .from("issues")
        .select("id, status, created_at")
        .eq("id", issueId)
        .eq("reporter_profile_id", profileId)
        .maybeSingle();

      if (createdIssueError) {
        devLogSubmissionFailure("issue refresh", createdIssueError, { issueId, profileId });
      }

      if (createdIssue) {
        uploadedIssue = createdIssue;
      }
      setSubmissionStage("uploading");

      if (imageToUpload) {
        const storagePath = `${profileId}/${uploadedIssue.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("issue-images").upload(storagePath, imageToUpload, {
          contentType: imageToUpload.type,
          upsert: false,
        });

        if (uploadError) {
          devLogSubmissionFailure("storage upload", uploadError, {
            issueId: uploadedIssue.id,
            bucket: "issue-images",
            storagePath,
          });
          throw uploadError;
        }

        setSubmissionStage("finalizing");
        const { error: imageRecordError } = await supabase.from("issue_images").insert({
          issue_id: uploadedIssue.id,
          storage_bucket: "issue-images",
          storage_path: storagePath,
          image_type: "INITIAL_REPORT",
          uploaded_by_profile_id: profileId,
        });

        if (imageRecordError) {
          devLogSubmissionFailure("issue_images insert", imageRecordError, {
            issueId: uploadedIssue.id,
            bucket: "issue-images",
            storagePath,
          });

          const cleanupResult = await supabase.storage.from("issue-images").remove([storagePath]);
          if (cleanupResult.error) {
            devLogSubmissionFailure("storage cleanup", cleanupResult.error, {
              issueId: uploadedIssue.id,
              bucket: "issue-images",
              storagePath,
            });
          }

          throw imageRecordError;
        }
      }

      setOutcome({
        kind: "success",
        issueId: uploadedIssue.id,
        status: uploadedIssue.status,
        submittedAt: uploadedIssue.created_at,
        title: trimmedTitle,
        category,
      });
      clearCitizenReportDraft();
      setSubmissionStage("idle");
      return;
    } catch (submissionError) {
      const message = uploadedIssue
        ? buildUserFacingError("Attach image", submissionError)
        : buildUserFacingError("Create issue", submissionError);

      if (uploadedIssue) {
        setOutcome({
          kind: "partial-error",
          issueId: uploadedIssue.id,
          submittedAt: uploadedIssue.created_at,
          message,
        });
        clearCitizenReportDraft();
      } else {
        setSubmitError(message);
      }

      if (import.meta.env.DEV) {
        console.error("[CitizenReport] submission failed", submissionError);
      }
    } finally {
      setSubmissionStage("idle");
    }
  }

  useEffect(() => {
    if (outcome?.kind !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      void navigate(`/app/citizen/issues/${outcome.issueId}`, {
        state: { submitted: true },
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate, outcome]);

  if (outcome?.kind === "success") {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-emerald-500/10 px-6 py-5">
          <div className="flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Report Submitted Successfully</p>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Your civic report is live</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            CivicFix has recorded your report and attached the photo to the issue record.
          </p>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Submission</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Issue reference
                </dt>
                <dd className="mt-1 break-all text-sm font-medium text-foreground">{outcome.issueId}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{outcome.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{formatCitizenIssueDate(outcome.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Category
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{outcome.category}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">{outcome.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The report is now in your citizen dashboard and will appear in My Issues.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Next steps</p>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild>
                <Link to="/app/citizen/issues">View My Issues</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/citizen">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (outcome?.kind === "partial-error") {
    return (
      <section className="overflow-hidden rounded-[1.75rem] border border-amber-500/20 bg-surface/90 shadow-lg shadow-black/20">
        <div className="border-b border-border/70 bg-amber-500/10 px-6 py-5">
          <div className="flex items-center gap-3 text-amber-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Photo upload problem</p>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Your report was saved</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The issue exists in Supabase, but the image attachment step did not finish cleanly.
          </p>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Saved issue</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Issue reference
                </dt>
                <dd className="mt-1 break-all text-sm font-medium text-foreground">{outcome.issueId}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{formatCitizenIssueDate(outcome.submittedAt)}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-foreground">
              {outcome.message}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Next steps</p>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild>
                <Link to="/app/citizen/issues">View My Issues</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/citizen">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-surface/90 shadow-lg shadow-black/20">
      <div className="border-b border-border/70 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Citizen report intake</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Report an Issue</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Share what you saw, add a location, and attach a photo so the city can act quickly.
        </p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-foreground">Issue title</span>
              <input
                className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Large pothole on the main road"
                value={title}
              />
              {errors.title ? <p className="text-sm text-red-300">{errors.title}</p> : null}
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-foreground">Description</span>
              <textarea
                className="min-h-36 w-full resize-y rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                maxLength={1200}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us what happened, how long it has been there, and any safety concerns."
                value={description}
              />
              <div className="flex items-center justify-between gap-4">
                {errors.description ? <p className="text-sm text-red-300">{errors.description}</p> : <span />}
                <p className="text-xs text-muted-foreground">{description.length}/1200</p>
              </div>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Category</span>
              <select
                className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                onChange={(event) => setCategory(event.target.value as CitizenIssueCategory | "")}
                value={category}
              >
                <option value="">Select a category</option>
                {citizenIssueCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.category ? <p className="text-sm text-red-300">{errors.category}</p> : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Location</span>
              <input
                className="w-full rounded-2xl border border-border/80 bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                maxLength={160}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Jubilee Hills, Road No. 36"
                value={locationText}
              />
              {errors.location ? <p className="text-sm text-red-300">{errors.location}</p> : null}
            </label>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">GPS coordinates</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Capture your current position, or continue manually if location access is blocked.
                </p>
              </div>
              <Button disabled={geoLoading} onClick={handleCurrentLocation} type="button" variant="outline">
                {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Navigation2 className="h-4 w-4" aria-hidden="true" />}
                Use My Current Location
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latitude</p>
                <p className="mt-2 text-sm font-medium text-foreground">{latitude ?? "Not captured yet"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Longitude</p>
                <p className="mt-2 text-sm font-medium text-foreground">{longitude ?? "Not captured yet"}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {geoError ? <p className="text-sm text-amber-300">{geoError}</p> : null}
              {locationStatus === "detected" && latitude && longitude ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-foreground">
                  <p className="font-medium text-emerald-200">Location detected</p>
                  <p className="mt-1 text-muted-foreground">Latitude: {latitude}</p>
                  <p className="text-muted-foreground">Longitude: {longitude}</p>
                  <p className="text-muted-foreground">
                    Accuracy: approximately {locationAccuracyMeters !== null ? Math.round(locationAccuracyMeters) : "unknown"} meters
                  </p>
                  {locationAccuracyMeters !== null && locationAccuracyMeters > 100 ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-200">
                      Browser reported a coarse location fix.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-elevated p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Photo upload
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Attach a clear image</h3>
              </div>
              <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Optional
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/30 p-4">
              <input
                accept="image/*"
                className="hidden"
                disabled={imageProcessing || submissionStage !== "idle"}
                onChange={(event) => void handleImageChange(event)}
                ref={imageInputRef}
                type="file"
              />
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-border/70 bg-surface-elevated p-3 text-primary">
                    <UploadCloud className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {compressedImage ? compressedImage.name : "Choose an image from your device"}
                    </p>
                <p className="text-sm leading-6 text-muted-foreground">JPG or PNG images are compressed in the browser before upload.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={imageProcessing || submissionStage !== "idle"}
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                    variant="outline"
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                    {imageProcessing ? "Preparing image..." : "Choose Photo"}
                  </Button>
                  {compressedImage ? (
                    <Button
                      disabled={submissionStage !== "idle"}
                      onClick={() => resetImageSelection({ clearError: true })}
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {errors.image ? <p className="mt-3 text-sm text-red-300">{errors.image}</p> : null}

            {previewUrl && compressedImage ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-background/40">
                <img alt="Selected issue preview" className="h-52 w-full object-cover" src={previewUrl} />
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
                  <span>{formatFileSize(compressedImage.size)}</span>
                  <span>{rawImage?.type || compressedImage.type}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-surface-elevated p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Submission status</p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
              {submissionStage === "idle" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{getStageLabel(submissionStage)}</p>
                <p className="text-xs text-muted-foreground">
                  {submissionStage === "idle"
                    ? "Review the report and submit when ready."
                    : "Please keep this tab open while CivicFix finishes the report."}
                </p>
              </div>
            </div>

            {submitError ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                {submitError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button disabled={submissionStage !== "idle" || imageProcessing} onClick={() => void handleSubmit()} type="button">
                {submissionStage === "idle" ? "Submit Report" : "Submitting..."}
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/citizen">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
