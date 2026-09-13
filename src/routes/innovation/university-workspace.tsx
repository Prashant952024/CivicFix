import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  UniversityWorkspace,
  type UniversityWorkspaceTab,
} from "@/components/innovation/problem-control-center/workspace/university-workspace";
import {
  fetchUniversityWorkspaceData,
  type UniversityWorkspaceData,
} from "@/lib/innovation";

export function InnovationUniversityWorkspacePage() {
  const { problemId, institutionId } = useParams<{
    problemId: string;
    institutionId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as UniversityWorkspaceTab) || "overview";

  const [data, setData] = useState<UniversityWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!problemId || !institutionId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchUniversityWorkspaceData(problemId!, institutionId!);
        if (cancelled) return;
        if (!result) {
          setError("University collaboration workspace not found for this complex problem.");
        } else {
          setData(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error("Error loading university workspace:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load university collaboration workspace."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [problemId, institutionId, refreshNonce]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-6 w-52 bg-muted/40 rounded-lg" />
        <div className="h-36 bg-muted/30 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="h-24 bg-muted/20 rounded-2xl" />
          <div className="h-24 bg-muted/20 rounded-2xl" />
          <div className="h-24 bg-muted/20 rounded-2xl" />
          <div className="h-24 bg-muted/20 rounded-2xl" />
          <div className="h-24 bg-muted/20 rounded-2xl" />
        </div>
        <div className="h-72 bg-muted/20 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="University Collaboration Workspace"
          description="Dedicated research collaboration workspace for this institution."
          backHref={`/app/innovation/problems/${problemId}`}
          backLabel="Back to Complex Problem"
          tag="Collaboration Workspace"
        />
        <div className="p-6 bg-rose-50 border border-rose-300 rounded-2xl text-sm text-rose-900 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Workspace Not Found or Inaccessible</span>
          </div>
          <p>{error || "Could not locate this institution's participation on this complex civic problem."}</p>
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
                void navigate(`/app/innovation/problems/${problemId}`);
              }}
            >
              Back to Complex Problem
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UniversityWorkspace
      problem={data.problem}
      challenge={data.challenge}
      institution={data.institution}
      initialTab={initialTab}
      onBackToProblem={() => void navigate(`/app/innovation/problems/${problemId}`)}
    />
  );
}
