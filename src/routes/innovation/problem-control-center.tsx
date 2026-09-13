import { useEffect, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { InstitutionProfileDialog } from "@/components/institutions/institution-profile-dialog";
import { ChallengeSummarySection } from "@/components/innovation/problem-control-center/challenge/challenge-summary-section";
import { ProblemOverviewSection } from "@/components/innovation/problem-control-center/overview/problem-overview-section";
import { ProblemHeader } from "@/components/innovation/problem-control-center/problem-header";
import { RecommendationEngine } from "@/components/innovation/problem-control-center/recommendation/recommendation-engine";
import { UniversityCollaborations } from "@/components/innovation/problem-control-center/universities/university-collaborations";
import {
  fetchProblemControlCenterData,
  type InstitutionLifecycleTrack,
  type ProblemControlCenterData,
} from "@/lib/innovation";

export function InnovationProblemControlCenterPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Data fetching state
  const [data, setData] = useState<ProblemControlCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const dataLoadedRef = useRef(false);

  // UI view state
  const recommendationSectionRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [selectedProfileInstitution, setSelectedProfileInstitution] =
    useState<InstitutionLifecycleTrack | null>(null);
  const [inspectInstitutionId, setInspectInstitutionId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!problemId) return;

    let cancelled = false;

    async function load() {
      if (dataLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchProblemControlCenterData(problemId!);
        if (cancelled) return;
        dataLoadedRef.current = true;
        setData(result);
      } catch (err: unknown) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Error loading problem control center:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load complex civic problem data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [problemId, refreshNonce]);

  const handleOpenRecommendationEngine = () => {
    setSearchParams({ view: "recommendation" }, { replace: true });
    setTimeout(() => {
      recommendationSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleInspectInstitutionById = (instId: string) => {
    const existingTrack = data?.institutions.find((i) => i.institutionId === instId);
    if (existingTrack) {
      setSelectedProfileInstitution(existingTrack);
    } else {
      setInspectInstitutionId(instId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-6 w-52 bg-muted/40 rounded-lg" />
        <div className="h-44 bg-muted/30 rounded-2xl" />
        <div className="h-60 bg-muted/20 rounded-2xl" />
        <div className="h-40 bg-muted/20 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-muted/20 rounded-2xl" />
          <div className="h-48 bg-muted/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Complex Problem"
          description="Operational workspace for this complex civic problem."
          backHref="/app/innovation/problems"
          backLabel="All Complex Problems"
          tag="Problem Management"
        />
        <div className="p-6 bg-rose-50 border border-rose-300 rounded-2xl text-sm text-rose-900 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Problem Inaccessible or Not Found</span>
          </div>
          <p>{error || "Could not locate this complex civic problem."}</p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
            >
              Retry
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/innovation/problems");
              }}
            >
              Back to Complex Problems
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const {
    problem,
    challenge,
    actionRequired,
    stats,
    institutions,
    matching,
  } = data;

  return (
    <div className="space-y-8 pb-20">
      {/* 1. COMPLEX PROBLEM HEADER */}
      <ProblemHeader
        problem={problem}
        challenge={challenge}
        stats={stats}
        actionRequired={actionRequired}
        matchingRunAt={matching.lastRunAt}
        refreshing={refreshing}
        onRefresh={() => setRefreshNonce((v) => v + 1)}
        onOpenRecommendationEngine={handleOpenRecommendationEngine}
      />

      {/* 2. PROBLEM OVERVIEW SECTION */}
      <section>
        <ProblemOverviewSection
          problem={problem}
          stats={stats}
          onPreviewImage={(url) => setPreviewImage(url)}
        />
      </section>

      {/* 3. CHALLENGE SECTION */}
      <section>
        <ChallengeSummarySection
          challenge={challenge}
          problemId={problem.id}
        />
      </section>

      {/* 4. RECOMMENDATION ENGINE SECTION */}
      <section ref={recommendationSectionRef}>
        <RecommendationEngine
          problem={problem}
          challenge={challenge}
          matching={matching}
          onInspectInstitutionById={handleInspectInstitutionById}
          onRefresh={() => setRefreshNonce((v) => v + 1)}
        />
      </section>

      {/* 5. UNIVERSITY COLLABORATIONS AREA */}
      <section>
        <UniversityCollaborations
          institutions={institutions}
          problemId={problem.id}
          onOpenWorkspace={(institutionId) => {
            void navigate(`/app/innovation/problems/${problem.id}/universities/${institutionId}`);
          }}
          onInspectProfile={(track) => setSelectedProfileInstitution(track)}
          onOpenRecommendationEngine={handleOpenRecommendationEngine}
        />
      </section>

      {/* 6. REUSABLE INSTITUTION PROFILE DIALOG */}
      <InstitutionProfileDialog
        institutionId={
          selectedProfileInstitution?.institutionId || inspectInstitutionId || null
        }
        isOpen={Boolean(selectedProfileInstitution || inspectInstitutionId)}
        onClose={() => {
          setSelectedProfileInstitution(null);
          setInspectInstitutionId(null);
        }}
        contextualProblem={
          selectedProfileInstitution
            ? {
                problemId: data.issue.id,
                problemTitle: data.issue.title,
                invitationStatus: selectedProfileInstitution.invitationStatus,
                projectId: selectedProfileInstitution.projectId,
                projectTitle: selectedProfileInstitution.projectTitle,
                projectStatus: selectedProfileInstitution.projectStatus,
                projectLeadName: selectedProfileInstitution.projectLeadName,
                projectLeadEmail: selectedProfileInstitution.projectLeadEmail,
                teamMembersCount: selectedProfileInstitution.teamMembersCount,
                teamMembers: selectedProfileInstitution.teamMembers,
                proposalId: selectedProfileInstitution.proposalId,
                proposalVersion: selectedProfileInstitution.proposalVersion,
                proposalStatus: selectedProfileInstitution.proposalStatus,
                proposalSubmittedAt: selectedProfileInstitution.proposalSubmittedAt,
              }
            : undefined
        }
      />

      {/* 7. EVIDENCE LIGHTBOX DIALOG */}
      {previewImage && (
        <Dialog
          open={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          maxWidth="xl"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black">
            <img
              src={previewImage}
              alt="Enlarged citizen evidence"
              className="w-full h-full object-contain"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 h-8 w-8 text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
