import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Navigation2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { IssueImage } from "@/components/issues/issue-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
      return "Creating issue record...";
    case "uploading":
      return "Uploading compressed photo...";
    case "finalizing":
      return "Finalizing municipal report...";
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
      <Card className="page-container-form p-6 sm:p-8">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Report form unavailable</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{sessionProblem}</p>
          </div>
          <Button asChild>
            <Link to="/app/citizen">Back to Dashboard</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (!profileId || sessionStatus !== "ready") {
    return (
      <div className="page-container-form flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/90 px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-muted-foreground">Loading report form...</span>
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
  const submissionInFlightRef = useRef(false);
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
    if (submissionStage !== "idle" || outcome || submissionInFlightRef.current) {
      return;
    }

    const nextErrors: FormErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationText.trim();
    const imageToUpload = compressedImage;

    if (!trimmedTitle) nextErrors.title = "Please provide an issue title.";
    if (!trimmedDescription) nextErrors.description = "Please provide a description of the problem.";
    if (!category) nextErrors.category = "Please select an issue category.";
    if (!trimmedLocation) nextErrors.location = "Please enter the location or landmark.";
    if (!imageToUpload) {
      setErrors((current) => ({ ...current, image: undefined }));
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    submissionInFlightRef.current = true;
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

      // Asynchronously trigger Gemini AI issue analysis (non-blocking)
      const targetIssueId = uploadedIssue.id;
      void (async () => {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (supabaseUrl && anonKey) {
            await fetch(`${supabaseUrl}/functions/v1/analyze-issue`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
              body: JSON.stringify({ issue_id: targetIssueId }),
            });
          }
        } catch (aiTriggerError) {
          if (import.meta.env.DEV) {
            console.warn("[CitizenReport] Async AI trigger encountered error:", aiTriggerError);
          }
        }
      })();

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
      submissionInFlightRef.current = false;
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
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate, outcome]);

  // Success Confirmation View
  if (outcome?.kind === "success") {
    return (
      <div className="page-container-form space-y-6">
        <Card className="overflow-hidden border-emerald-300 shadow-xl">
          <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 sm:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/15">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">
              Report Filed Successfully
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-foreground">
              Your civic report is live!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              CivicFix has recorded your report and assigned it reference number{" "}
              <span className="font-mono font-bold text-foreground">#{outcome.issueId.slice(0, 8).toUpperCase()}</span>.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Report Summary
              </p>
              <dl className="mt-3.5 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Title</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{outcome.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Category</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{outcome.category}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Status</dt>
                  <dd className="mt-0.5">
                    <Badge variant="teal" size="sm">
                      {outcome.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Submitted At</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {formatCitizenIssueDate(outcome.submittedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="flex-1">
                <Link to={`/app/citizen/issues/${outcome.issueId}`}>View My Issue Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/app/citizen">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Partial Error (Issue saved, image failed)
  if (outcome?.kind === "partial-error") {
    return (
      <div className="page-container-form space-y-6">
        <Card className="overflow-hidden border-amber-300 shadow-xl">
          <div className="border-b border-amber-200 bg-amber-50 p-6 sm:p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg">
              <AlertCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-amber-800">
              Report Saved with Notice
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-foreground">
              Your report was created
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              The issue was recorded in the database, but the image attachment could not be completed.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              {outcome.message}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="flex-1">
                <Link to="/app/citizen/issues">View My Issues</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/app/citizen">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Active Report Form
  return (
    <div className="page-container-form space-y-6 sm:space-y-8">
      <PageHeader
        tag="Citizen Intake"
        title="Report a Civic Issue"
        description="Submit a complaint about civic infrastructure, sanitation, or safety. Your report will be routed directly to municipal officers for review and assignment."
        backHref="/app/citizen"
        backLabel="Back to Dashboard"
      />

      {/* Guided Form Layout */}
      <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-6">
        {/* Step 1: Describe Problem */}
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Describe the Problem</h2>
              <p className="text-xs text-muted-foreground">What civic issue are you reporting?</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="issue-title" className="block text-sm font-semibold text-foreground">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                id="issue-title"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Broken streetlight, overflowing garbage bin, deep pothole"
                value={title}
              />
              {errors.title ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.title}</p> : null}
            </div>

            <div>
              <label htmlFor="issue-category" className="block text-sm font-semibold text-foreground">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="issue-category"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
              {errors.category ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.category}</p> : null}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="issue-description" className="block text-sm font-semibold text-foreground">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted-foreground">{description.length}/1200</span>
              </div>
              <textarea
                id="issue-description"
                className="mt-1.5 min-h-32 w-full resize-y rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={1200}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Provide details about the issue: exact spot, safety hazards, how long it has been present..."
                value={description}
              />
              {errors.description ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.description}</p> : null}
            </div>
          </div>
        </Card>

        {/* Step 2: Location */}
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Specify Location</h2>
              <p className="text-xs text-muted-foreground">Where is the issue located?</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="issue-location" className="block text-sm font-semibold text-foreground">
                Location & Landmark <span className="text-red-500">*</span>
              </label>
              <input
                id="issue-location"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={160}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="e.g. Near Metro Pillar 142, Jubilee Hills Road No. 36"
                value={locationText}
              />
              {errors.location ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.location}</p> : null}
            </div>

            {/* GPS Capture Button & Information */}
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/70 via-surface to-sky-50/60 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>GPS Geolocation</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Attaching coordinates helps workers find the exact spot quickly.
                  </p>
                </div>

                <Button
                  disabled={geoLoading}
                  onClick={handleCurrentLocation}
                  type="button"
                  variant="outline"
                  className="shrink-0 bg-white shadow-sm hover:bg-teal-50 min-h-[44px]"
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary mr-1" aria-hidden="true" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation2 className="h-4 w-4 text-primary mr-1" aria-hidden="true" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </Button>
              </div>

              {locationStatus === "detected" && latitude && longitude ? (
                <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span className="font-medium">
                    Coordinates captured: {latitude}, {longitude}
                    {locationAccuracyMeters !== null ? ` (±${Math.round(locationAccuracyMeters)}m)` : ""}
                  </span>
                </div>
              ) : null}

              {geoError ? (
                <p className="mt-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  {geoError}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Step 3: Photo Attachment */}
        <Card className="p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Attach Photo</h2>
                <p className="text-xs text-muted-foreground">Provide photographic evidence of the issue</p>
              </div>
            </div>
            <Badge variant="default" size="sm">Optional</Badge>
          </div>

          <div className="mt-5 space-y-4">
            <input
              accept="image/*"
              className="hidden"
              disabled={imageProcessing || submissionStage !== "idle"}
              onChange={(event) => void handleImageChange(event)}
              ref={imageInputRef}
              type="file"
            />

            {!compressedImage ? (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200/80 bg-teal-50/30 p-6 sm:p-8 text-center transition hover:border-primary/60 hover:bg-teal-50/60 cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-teal-200/60">
                  <Camera className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-bold text-foreground">
                  Click to choose or take a photo
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Supports JPG, PNG, HEIC, WebP. Images are automatically compressed in your browser before upload.
                </p>
                <Button
                  disabled={imageProcessing}
                  onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 bg-white"
                >
                  <Paperclip className="h-4 w-4 mr-1" aria-hidden="true" />
                  {imageProcessing ? "Processing..." : "Select File"}
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 overflow-hidden bg-surface-elevated">
                {previewUrl ? (
                  <div className="relative">
                    <IssueImage
                      alt="Selected issue preview"
                      className="h-56 sm:h-64 w-full object-contain bg-black/5"
                      emptyLabel="No preview"
                      imageClassName="object-contain"
                      src={previewUrl}
                      variant="preview"
                    />
                    <button
                      type="button"
                      onClick={() => resetImageSelection({ clearError: true })}
                      aria-label="Remove image"
                      className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 p-3.5 bg-surface text-xs text-muted-foreground border-t border-border/60">
                  <div className="flex items-center gap-2 truncate">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="font-medium text-foreground truncate">{compressedImage.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span>{formatFileSize(compressedImage.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => resetImageSelection({ clearError: true })}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {errors.image ? <p className="text-xs font-medium text-red-600">{errors.image}</p> : null}
          </div>
        </Card>

        {/* Step 4: Submission */}
        <Card className="p-5 sm:p-7 border-teal-200 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Ready to Submit?</h2>
              <p className="text-xs text-muted-foreground">
                {submissionStage === "idle"
                  ? "Please verify your details above before submitting."
                  : getStageLabel(submissionStage)}
              </p>
            </div>
            {submissionStage !== "idle" ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" aria-hidden="true" />
            ) : null}
          </div>

          {submitError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
              {submitError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              disabled={submissionStage !== "idle" || imageProcessing}
              type="submit"
              size="lg"
              className="flex-1 shadow-md shadow-teal-950/15"
            >
              {submissionStage === "idle" ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" aria-hidden="true" />
                  Submit Civic Report
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" aria-hidden="true" />
                  {getStageLabel(submissionStage)}
                </>
              )}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/app/citizen">Cancel</Link>
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

