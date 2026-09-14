import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Route Alias Redirection:
 * Seamlessly unifies /app/innovation/problems/:problemId/universities/:institutionId
 * into the primary Complex Problem Control Center workflow:
 * /app/innovation/problems/:problemId?university=:institutionId&tab=:tab
 */
export function InnovationUniversityWorkspacePage() {
  const { problemId, institutionId } = useParams<{
    problemId: string;
    institutionId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    if (problemId && institutionId) {
      const target = `/app/innovation/problems/${problemId}?university=${institutionId}${
        tab ? `&tab=${tab}` : ""
      }`;
      void navigate(target, { replace: true });
    }
  }, [problemId, institutionId, tab, navigate]);

  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-8 w-60 bg-muted/40 rounded-lg" />
      <div className="h-44 bg-muted/30 rounded-2xl" />
      <div className="h-60 bg-muted/20 rounded-2xl" />
    </div>
  );
}
