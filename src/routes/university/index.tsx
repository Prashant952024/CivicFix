import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  ExternalLink,
  GraduationCap,
  MapPin,
  RefreshCw,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchInstitutionById,
  fetchInstitutionProjects,
  getVerificationStatusBadge,
} from "@/lib/institutions";
import { supabase } from "@/lib/supabase";
import type { Database, InstitutionProjectRow, InstitutionRow } from "@/types/database";

type ChallengeRow = Database["public"]["Tables"]["innovation_challenges"]["Row"];

export function UniversityDashboardPage() {
  const { profile } = useAppSession();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [projects, setProjects] = useState<InstitutionProjectRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        let instId = profile?.institution_id;

        // If user is institution role but institution_id is missing, find first linked membership or verified institution
        if (!instId && profile?.id) {
          const { data: memberRecord } = await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (memberRecord?.institution_id) {
            instId = memberRecord.institution_id;
          }
        }

        // Fallback for development/demo viewing if no institution linked: pick premier institution (e.g. IIT Bombay)
        if (!instId) {
          const { data: fallbackInst } = await supabase
            .from("institutions")
            .select("id")
            .eq("name", "IIT Bombay")
            .maybeSingle();

          if (fallbackInst) {
            instId = fallbackInst.id;
          }
        }

        if (instId) {
          const [instData, projData] = await Promise.all([
            fetchInstitutionById(instId),
            fetchInstitutionProjects(instId),
          ]);
          if (!cancelled) {
            setInstitution(instData);
            setProjects(projData);
          }
        }

        // Fetch active approved innovation challenges
        const { data: challengeData } = await supabase
          .from("innovation_challenges")
          .select("*")
          .in("status", ["APPROVED", "READY_FOR_MATCHING", "OPEN_FOR_PROPOSALS"])
          .order("created_at", { ascending: false })
          .limit(6);

        if (!cancelled) {
          setChallenges(challengeData ?? []);
        }
      } catch (err) {
        console.error("Failed to load university dashboard:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id, refreshNonce]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse border border-border/60 bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  const statusBadge = institution
    ? getVerificationStatusBadge(institution.verification_status)
    : { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        tag="University Portal"
        title={institution ? `${institution.name} Portal` : "University & Research Portal"}
        description={
          institution
            ? `Verified Institution Profile · ${institution.city}, ${institution.state} · ${profile?.designation || "Institution Coordinator"}`
            : "CivicFix Academic Collaboration & Research Ecosystem"
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshNonce((v) => v + 1)}
              className="border-border text-foreground hover:bg-surface-elevated"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void navigate("/app/university/profile");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <GraduationCap className="mr-1.5 h-4 w-4" />
              Update Capabilities
            </Button>
          </div>
        }
      />

      {/* Institution Banner Card */}
      {institution && (
        <Card className="border border-border/80 bg-surface/90 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">
                    {institution.institution_type}
                  </Badge>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                  {institution.is_active && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Active Partner
                    </span>
                  )}
                  {institution.nirf_rank && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <Award className="h-3 w-3" />
                      NIRF Rank #{institution.nirf_rank}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-foreground">
                  {institution.official_name || institution.name}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{institution.city}, {institution.state}</span>
                  </div>
                  {institution.website && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                      <a
                        href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline"
                      >
                        {institution.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <Link to="/app/university/profile">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                    Manage Capability Matrix →
                  </Button>
                </Link>
                <Link to="/app/university/challenges">
                  <Button size="sm" className="w-full sm:w-auto text-xs bg-primary text-primary-foreground">
                    Browse Challenges ({challenges.length})
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Research Domains
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {institution?.research_domains?.length || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {institution?.areas_of_expertise?.length || 0} expertise areas cataloged
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Labs & Facilities
            </CardTitle>
            <Wrench className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(institution?.laboratories?.length || 0) + (institution?.facilities?.length || 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {institution?.laboratories?.length || 0} labs · {institution?.equipment?.length || 0} instruments
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Civic Fix Challenges
            </CardTitle>
            <Rocket className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{challenges.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active innovation opportunities
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Projects & Pilots
            </CardTitle>
            <BookOpen className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{projects.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Past civic solution portfolio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Innovation Challenges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Active Civic Innovation Challenges
            </h3>
            <p className="text-xs text-muted-foreground">
              Complex municipal problems approved for research solutions and university collaboration.
            </p>
          </div>
          <Link
            to="/app/university/challenges"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Challenges</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {challenges.length === 0 ? (
          <Card className="border border-border/80 bg-surface/90 p-8 text-center">
            <EmptyState
              icon={Rocket}
              title="No active challenges available"
              description="When municipal officers and the Innovation Manager formulate complex civic challenges, they will appear here for university collaboration."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((ch) => (
              <Card
                key={ch.id}
                className="group flex flex-col justify-between border border-border/80 bg-surface/90 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">
                      {ch.category}
                    </Badge>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      {ch.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h4 className="mt-2 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {ch.title}
                  </h4>

                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {ch.problem_statement}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 pb-4">
                  {/* Required Domains */}
                  {ch.required_domains && ch.required_domains.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">Required Domains:</span>
                      <div className="flex flex-wrap gap-1">
                        {ch.required_domains.slice(0, 3).map((d, i) => (
                          <span
                            key={i}
                            className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 border border-sky-200/60"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px]">
                    <span className="text-muted-foreground">
                      Scope: {ch.geographic_scope || "City-wide"}
                    </span>
                    <Link
                      to="/app/university/challenges"
                      className="font-semibold text-primary hover:underline"
                    >
                      Inspect Challenge →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
