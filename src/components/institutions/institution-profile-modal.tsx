import { useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { fetchInstitutionProjects } from "@/lib/institutions";
import type {
  InstitutionProjectRow,
  InstitutionRow,
  MatchDimensionScores,
} from "@/types/database";

export interface InstitutionProfileModalProps {
  institution: InstitutionRow | null;
  open: boolean;
  onClose: () => void;
  matchScores?: MatchDimensionScores | null;
  strengths?: string[];
  potentialGaps?: string[];
  rank?: number;
}

export function InstitutionProfileModal({
  institution,
  open,
  onClose,
  matchScores,
  strengths,
  potentialGaps,
  rank,
}: InstitutionProfileModalProps) {
  const [projects, setProjects] = useState<InstitutionProjectRow[]>([]);
  const [loadedInstitutionId, setLoadedInstitutionId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !institution?.id) {
      return;
    }

    let isMounted = true;

    void fetchInstitutionProjects(institution.id)
      .then((data) => {
        if (isMounted) {
          setProjects(data);
          setLoadedInstitutionId(institution.id);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects for institution modal:", err);
        if (isMounted) {
          setLoadedInstitutionId(institution.id);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, institution?.id]);

  const loadingProjects = Boolean(open && institution?.id && loadedInstitutionId !== institution.id);

  if (!institution) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="2xl" className="max-w-3xl">
      <div className="space-y-6">
        {/* Header Profile */}
        <div className="border-b border-border/70 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {rank !== undefined && (
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider select-none ${
                      rank === 1
                        ? "bg-amber-500 text-slate-950 ring-1 ring-amber-400 font-black shadow-xs"
                        : rank === 2
                        ? "bg-slate-200 text-slate-900 ring-1 ring-slate-300 font-black shadow-xs"
                        : rank === 3
                        ? "bg-amber-800 text-amber-50 ring-1 ring-amber-700 font-black shadow-xs"
                        : "bg-teal-700 text-white font-bold"
                    }`}
                  >
                    Rank #{rank}
                  </span>
                )}
                <Badge variant="outline" size="sm">
                  {institution.institution_type.replace(/_/g, " ")}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-teal-800 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Verified Registry
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {institution.name}
              </h2>
              {institution.official_name && institution.official_name !== institution.name && (
                <p className="text-sm text-muted-foreground">
                  {institution.official_name}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {institution.city}, {institution.state}
            </span>
            {institution.website && (
              <a
                href={institution.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {institution.official_email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {institution.official_email}
              </span>
            )}
            {institution.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {institution.phone}
              </span>
            )}
          </div>
        </div>

        {/* Challenge Match Insights */}
        {(strengths?.length || potentialGaps?.length || matchScores) && (
          <div className="rounded-2xl border border-teal-200/80 bg-teal-50/40 p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Challenge Match Highlights
              </h3>
            </div>

            {strengths && strengths.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Verified Strengths & Capabilities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map((st, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium"
                    >
                      ✓ {st}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {potentialGaps && potentialGaps.length > 0 && (
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  Potential Considerations / Gaps
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {potentialGaps.map((gap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-medium"
                    >
                      • {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {matchScores && (
              <div className="pt-2.5 border-t border-teal-200/60">
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Dimension Breakdown Scores (0–100 Scale)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="bg-card rounded-lg p-2 border border-border/70 text-center shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-medium">Domains</span>
                    <span className="font-bold text-foreground">{matchScores.research_domains}</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/70 text-center shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-medium">Expertise</span>
                    <span className="font-bold text-foreground">{matchScores.technical_expertise}</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/70 text-center shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-medium">Tech Stack</span>
                    <span className="font-bold text-foreground">{matchScores.technologies}</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/70 text-center shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-medium">Labs & Infra</span>
                    <span className="font-bold text-foreground">{matchScores.facilities_and_labs}</span>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/70 text-center shadow-2xs">
                    <span className="text-[10px] text-muted-foreground block font-medium">Projects</span>
                    <span className="font-bold text-foreground">{matchScores.previous_projects}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accreditations & Rankings */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Award className="h-3.5 w-3.5" />
            Accreditations & National Standing
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {institution.nirf_rank && (
              <Badge variant="outline" className="bg-muted/40 font-mono">
                NIRF Rank: #{institution.nirf_rank}
              </Badge>
            )}
            {institution.naac_grade && (
              <Badge variant="outline" className="bg-muted/40 font-mono">
                NAAC Grade: {institution.naac_grade}
              </Badge>
            )}
            {institution.established_year && (
              <Badge variant="outline" className="bg-muted/40">
                Est. {institution.established_year}
              </Badge>
            )}
          </div>
        </div>

        {/* Capabilities: Research Domains & Technologies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Research Domains
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(institution.research_domains ?? []).map((dom, i) => (
                <Badge key={i} variant="default" className="text-xs">
                  {dom}
                </Badge>
              ))}
              {(!institution.research_domains || institution.research_domains.length === 0) && (
                <span className="text-xs text-muted-foreground">None specified</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" />
              Core Technologies
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(institution.technologies ?? []).map((tech, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {(!institution.technologies || institution.technologies.length === 0) && (
                <span className="text-xs text-muted-foreground">None specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Labs and Equipment */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Laboratories & Advanced Facilities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(institution.laboratories ?? []).map((lab, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2.5 py-1 text-xs text-foreground font-medium"
              >
                {lab}
              </span>
            ))}
            {(!institution.laboratories || institution.laboratories.length === 0) && (
              <span className="text-xs text-muted-foreground">No laboratories registered</span>
            )}
          </div>

          {institution.equipment && institution.equipment.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-medium text-muted-foreground block mb-1">
                Specialized Equipment & Sensors
              </span>
              <div className="flex flex-wrap gap-1.5">
                {institution.equipment.map((eq, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Demonstrated Projects */}
        <div className="space-y-2 pt-2 border-t border-border/70">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Demonstrated Projects & Track Record
            </h4>
            <span className="text-xs text-muted-foreground">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          </div>

          {loadingProjects ? (
            <div className="text-xs text-muted-foreground py-3 text-center">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 italic">
              No registered research or pilot projects on file.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-foreground">{proj.title}</span>
                    {(proj.start_year || proj.end_year) && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {proj.start_year ?? ""}{proj.end_year ? ` - ${proj.end_year}` : ""}
                      </span>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-muted-foreground line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.technologies.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
