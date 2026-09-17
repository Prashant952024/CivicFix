import React from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Handshake,
  HelpCircle,
  Info,
  Layers,
  Users,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  APPLICATION_STATUS_META,
  SUPPORT_CATEGORY_META,
  type IndustryApplicationItem,
  type IndustryPartnershipItem,
} from "@/lib/marketplace";
import type { ApplicationStatus, SupportRequestCategory } from "@/types/database";

interface IndustryApplicationDetailDialogProps {
  application: IndustryApplicationItem | null;
  partnership?: IndustryPartnershipItem | null;
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

function getStatusDescription(status: ApplicationStatus): {
  headline: string;
  explanation: string;
  nextStep: string;
} {
  switch (status) {
    case "SUBMITTED":
      return {
        headline: "Application Submitted & Queued",
        explanation: "Your support offer has been delivered to the university research leads and Innovation Manager.",
        nextStep: "The project team will review your capabilities, estimated timeline, and resource scope.",
      };
    case "UNDER_REVIEW":
      return {
        headline: "Under Active Evaluation",
        explanation: "The university research team is reviewing your proposal and assessing prototype alignment.",
        nextStep: "Check for any clarification notes requested by the university team below.",
      };
    case "SHORTLISTED":
      return {
        headline: "Proposal Shortlisted",
        explanation: "Your organization is among the top candidates selected for this research requirement.",
        nextStep: "The innovation team is finalizing contribution agreements and resource allocations.",
      };
    case "ACCEPTED":
      return {
        headline: "Support Offer Accepted!",
        explanation: "Your organization has been selected as an active research support partner for this prototype.",
        nextStep: "Collaborate directly with the university team under your designated project support scope.",
      };
    case "REJECTED":
      return {
        headline: "Application Not Selected",
        explanation: "Another proposal was selected or the support requirement has been fulfilled.",
        nextStep: "You can explore other open civic research opportunities in the marketplace.",
      };
    case "WITHDRAWN":
      return {
        headline: "Application Withdrawn",
        explanation: "This application was withdrawn and is no longer being considered.",
        nextStep: "You may submit a new application if the listing is still open.",
      };
    default:
      return {
        headline: "Application in Draft",
        explanation: "This application is saved as a draft.",
        nextStep: "Complete your proposal and submit it for review.",
      };
  }
}

export function IndustryApplicationDetailDialog({
  application,
  partnership,
  open,
  onOpenChange,
}: IndustryApplicationDetailDialogProps) {
  if (!application) return null;

  const statusMeta = APPLICATION_STATUS_META[application.status];
  const listing = application.listing;
  const cat = listing?.category ?? "HARDWARE";
  const catMeta = SUPPORT_CATEGORY_META[cat];
  const statusGuide = getStatusDescription(application.status);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="2xl"
      title={listing?.public_title ?? "Research Support Application"}
      description={`Submitted: ${new Date(application.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} • ${listing?.institution?.name ?? "Partner Institution"}`}
    >
      <div className="space-y-6 pt-2">
        {/* Status and Category Badges Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-xl border border-border/80">
          <div className="flex items-center gap-2 flex-wrap">
            {catMeta && (
              <Badge variant={catMeta.badgeTone} className="text-xs font-semibold gap-1.5 py-0.5">
                {getCategoryIcon(cat)}
                <span>{catMeta.label}</span>
              </Badge>
            )}
            <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs font-bold px-2.5 py-0.5">
              {statusMeta?.label ?? application.status}
            </Badge>
            {partnership && (
              <Badge variant="success" className="text-xs font-bold">
                <Handshake className="w-3 h-3 mr-1" />
                Active Partnership
              </Badge>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            App ID: {application.id.slice(0, 8)}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: WHAT IS HAPPENING NOW & REVIEWER FEEDBACK                      */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Current Status &amp; Workflow Stage</span>
          </h4>

          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    {application.status === "ACCEPTED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : application.status === "REJECTED" ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                    <span>{statusGuide.headline}</span>
                  </h5>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {statusGuide.explanation}
                  </p>
                </div>
                <Badge variant={statusMeta?.badgeTone ?? "default"} className="text-xs font-bold shrink-0">
                  {application.status}
                </Badge>
              </div>

              <div className="p-3 bg-card border border-border rounded-lg text-xs space-y-1">
                <span className="font-bold text-foreground block">Next Expected Step:</span>
                <p className="text-muted-foreground leading-relaxed">{statusGuide.nextStep}</p>
              </div>
            </CardContent>
          </Card>

          {/* University Clarification Notes Callout */}
          {application.review_notes && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 shadow-xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>University Reviewer Clarification Request</span>
              </div>
              <p className="pl-5 leading-relaxed text-foreground/90 font-medium">
                {application.review_notes}
              </p>
              {application.reviewed_at && (
                <span className="pl-5 text-[11px] text-muted-foreground block">
                  Reviewed on {new Date(application.reviewed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Acceptance Agreement Callout */}
          {application.acceptance_agreement_notes && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 shadow-xs">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Partnership Agreement &amp; Delivery Scope</span>
              </div>
              <p className="pl-5 leading-relaxed text-foreground/90 font-medium">
                {application.acceptance_agreement_notes}
              </p>
            </div>
          )}

          {/* Rejection Reason Callout */}
          {application.rejection_reason && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-950 dark:text-rose-200 space-y-1.5 shadow-xs">
              <div className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Review Decision Notes</span>
              </div>
              <p className="pl-5 leading-relaxed text-foreground/90">
                {application.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: WHAT DID WE OFFER? (PARTNER'S PROPOSAL)                        */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Your Submitted Proposal &amp; Offer</span>
          </h4>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Proposed Contribution &amp; Resources:
              </span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {application.proposed_contribution}
              </p>
            </div>

            {application.capabilities_summary && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Relevant Capabilities &amp; Track Record:
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {application.capabilities_summary}
                </p>
              </div>
            )}

            {/* Offer Metadata Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Estimated Value:
                </span>
                <p className="text-base font-black text-foreground">
                  {application.estimated_value != null ? `₹${application.estimated_value.toLocaleString()}` : "Not Specified"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Proposed Timeline / Availability:
                </span>
                <p className="text-sm font-bold text-foreground">
                  {application.timeline || "Immediate / Coordinated"}
                </p>
              </div>
            </div>

            {application.terms_or_conditions && (
              <div className="p-3 rounded-lg border border-border/80 bg-muted/10 text-xs space-y-1">
                <span className="text-muted-foreground font-semibold block text-[11px]">
                  Submitted Terms or Conditions:
                </span>
                <p className="text-foreground/80 leading-relaxed">{application.terms_or_conditions}</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: WHAT DID WE APPLY TO? (OPPORTUNITY CONTEXT)                    */}
        {/* ========================================================================= */}
        {listing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Target Opportunity &amp; Prototype</span>
              </h4>

              <Link to={`/app/industry/marketplace/${listing.id}`}>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                  <span>Open in Marketplace</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <Card className="border-border bg-card shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div>
                  <h5 className="font-bold text-sm text-foreground">
                    {listing.public_title}
                  </h5>
                  {listing.public_summary && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {listing.public_summary}
                    </p>
                  )}
                </div>

                {listing.public_specification && (
                  <div className="p-3 bg-muted/30 border border-border/80 rounded-lg text-xs space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold block">
                      Deliverable Specifications:
                    </span>
                    <p className="text-foreground leading-relaxed">{listing.public_specification}</p>
                  </div>
                )}

                {listing.challenge?.problem_statement && (
                  <div className="p-3 bg-muted/20 border border-border/60 rounded-lg text-xs space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold block">
                      Civic Problem Statement:
                    </span>
                    <p className="text-foreground/90 leading-relaxed">{listing.challenge.problem_statement}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60 text-muted-foreground">
                  <div>
                    <strong>Target Timeline:</strong> {listing.public_timeline || "Flexible"}
                  </div>
                  <div>
                    <strong>Desired Outcome:</strong> {listing.desired_outcome || "Research Prototype Validation"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: RESULTING PARTNERSHIP (IF ACCEPTED)                             */}
        {/* ========================================================================= */}
        {partnership && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5" />
              <span>Resulting Active Partnership</span>
            </h4>

            <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-foreground">
                      {partnership.project?.title ?? "Research Project"}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {partnership.project?.institution?.name} • Challenge: {partnership.project?.challenge?.title}
                    </p>
                  </div>
                  <Badge variant="success" className="text-xs font-bold">
                    {partnership.access_scope}
                  </Badge>
                </div>

                <div className="p-3 bg-card border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold block">
                    Active Collaboration Deliverables:
                  </span>
                  <p className="text-foreground leading-relaxed">{partnership.contribution_summary}</p>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
                  <span>Onboarded: {new Date(partnership.started_at).toLocaleDateString()}</span>
                  <span>Status: <strong className="text-emerald-700 dark:text-emerald-400">{partnership.status}</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {listing?.id && (
            <Link to={`/app/industry/marketplace/${listing.id}`}>
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                <span>View Opportunity</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Dialog>
  );
}
