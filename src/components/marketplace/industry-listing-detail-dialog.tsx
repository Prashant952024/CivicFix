import React from "react";
import {
  ArrowUpRight,
  Building2,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Handshake,
  Layers,
  Send,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  APPLICATION_STATUS_META,
  LISTING_STATUS_META,
  SUPPORT_CATEGORY_META,
  type IndustrySupportListingItem,
} from "@/lib/marketplace";
import type { SupportRequestCategory } from "@/types/database";

interface IndustryListingDetailDialogProps {
  listing: IndustrySupportListingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCategoryIcon(category: SupportRequestCategory) {
  switch (category) {
    case "FUNDING":
      return <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "HARDWARE":
      return <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    case "TECHNOLOGY":
      return <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case "EXPERTISE":
      return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "INFRASTRUCTURE":
      return <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "DATA":
      return <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    case "MANUFACTURING":
      return <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    default:
      return <Layers className="w-4 h-4 text-muted-foreground" />;
  }
}

export function IndustryListingDetailDialog({
  listing,
  open,
  onOpenChange,
}: IndustryListingDetailDialogProps) {
  if (!listing) return null;

  const statusMeta = LISTING_STATUS_META[listing.status];
  const cat = listing.category;
  const catMeta = SUPPORT_CATEGORY_META[cat];
  const applications = listing.applications || [];
  const partnerships = listing.partnerships || [];

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="2xl"
      title={listing.public_title}
      description={`${listing.institution_name} • ${listing.challenge_title}`}
    >
      <div className="space-y-6 pt-2">
        {/* Status & Category Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-xl border border-border/80">
          <div className="flex items-center gap-2 flex-wrap">
            {catMeta && (
              <Badge variant={catMeta.badgeTone} className="text-xs font-semibold gap-1.5 py-0.5">
                {getCategoryIcon(cat)}
                <span>{catMeta.label}</span>
              </Badge>
            )}
            <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs font-bold px-2.5 py-0.5">
              {statusMeta?.label ?? listing.status}
            </Badge>
            {listing.myPartnership && (
              <Badge variant="success" className="text-xs font-bold">
                <Handshake className="w-3 h-3 mr-1" />
                Active Partnership
              </Badge>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            Listing ID: {listing.id.slice(0, 8)}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: SUPPORT OFFER DETAILS                                         */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Support Offer &amp; Deliverable Scope</span>
          </h4>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Public Summary:
              </span>
              <p className="text-sm text-foreground leading-relaxed">
                {listing.public_summary}
              </p>
            </div>

            {listing.public_specification && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Detailed Deliverable Specifications:
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {listing.public_specification}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Desired Outcome:
                </span>
                <p className="text-xs font-bold text-foreground">
                  {listing.desired_outcome || "Collaborative Prototype Validation"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Target Timeline:
                </span>
                <p className="text-xs font-bold text-foreground">
                  {listing.public_timeline || "Coordinated with Research Team"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: OPPORTUNITY & PROBLEM CONTEXT                                  */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Host Institution &amp; Challenge Context</span>
            </h4>

            <Link to={`/app/industry/marketplace/${listing.id}`}>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                <span>View Public Listing</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>{listing.institution_name}</span>
                    {listing.institution_city && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({listing.institution_city}{listing.institution_state ? `, ${listing.institution_state}` : ""})
                      </span>
                    )}
                  </h5>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Challenge: <strong>{listing.challenge_title}</strong> {listing.challenge_domain ? `(${listing.challenge_domain})` : ""}
                  </p>
                </div>

                <Badge variant="outline" className="text-[11px] font-mono">
                  {listing.project_status || "ACTIVE PROJECT"}
                </Badge>
              </div>

              {listing.problem_statement && (
                <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-xs space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold block">
                    Civic Challenge Problem Statement:
                  </span>
                  <p className="text-foreground/90 leading-relaxed">{listing.problem_statement}</p>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between pt-1 border-t border-border/60">
                <span>
                  Published: {listing.published_at ? new Date(listing.published_at).toLocaleDateString() : "Active"}
                </span>
                <span>
                  Total Applications: <strong>{listing.applications_count}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: CONNECTED APPLICATIONS                                         */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-primary" />
              <span>Connected Applications ({applications.length})</span>
            </h4>
          </div>

          {applications.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No applications recorded yet</p>
              <p>Applications submitted by partner organizations will appear here for evaluation.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {applications.map((app) => {
                const appStatusMeta = APPLICATION_STATUS_META[app.status];

                return (
                  <div
                    key={`app-${app.id}`}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {app.organization?.name ?? "Industry Contributor"}
                        </span>
                        {app.organization?.verification_status === "VERIFIED" && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5">
                            <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                            Verified
                          </Badge>
                        )}
                      </div>

                      <Badge variant={appStatusMeta?.badgeTone ?? "default"} className="text-[11px] font-bold">
                        {appStatusMeta?.label ?? app.status}
                      </Badge>
                    </div>

                    <p className="text-foreground/90 line-clamp-2 leading-relaxed">
                      {app.proposed_contribution || app.proposal}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span>
                        {app.estimated_value != null ? `Value: ₹${app.estimated_value.toLocaleString()}` : "Value: Flexible"}
                        {app.timeline ? ` • Timeline: ${app.timeline}` : ""}
                      </span>
                      <span className="font-mono">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: RESULTING PARTNERSHIPS                                         */}
        {/* ========================================================================= */}
        {partnerships.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5" />
              <span>Active Collaborative Partnerships ({partnerships.length})</span>
            </h4>

            <div className="space-y-2.5">
              {partnerships.map((p) => (
                <Card
                  key={`part-${p.id}`}
                  className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                >
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {p.project?.title ?? "Research Project"}
                      </span>
                      <Badge variant="success" className="text-[11px] font-bold">
                        {p.access_scope}
                      </Badge>
                    </div>

                    <p className="text-foreground/90 leading-relaxed font-medium">
                      {p.contribution_summary}
                    </p>

                    <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
                      <span>Onboarded: {new Date(p.started_at).toLocaleDateString()}</span>
                      <span>Status: <strong className="text-emerald-700 dark:text-emerald-400">{p.status}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Link to={`/app/industry/marketplace/${listing.id}`}>
            <Button size="sm" className="gap-1.5 text-xs font-semibold">
              <span>View Full Opportunity</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
