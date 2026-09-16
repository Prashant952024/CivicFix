import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  Loader2,
  MapPin,
  Play,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  PILOT_ENVIRONMENT_META,
  type PilotPlanWithDetails,
} from "@/lib/pilot-planning";

interface StartPilotDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  plan: PilotPlanWithDetails;
  loading?: boolean;
}

export function StartPilotDialog({
  open,
  onClose,
  onConfirm,
  plan,
  loading = false,
}: StartPilotDialogProps) {
  const envMeta = PILOT_ENVIRONMENT_META[plan.test_environment_type] || {
    label: plan.test_environment_type,
    description: "",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start Real-World Pilot Execution"
      description="Transition this project to PILOT_ACTIVE and begin field testing operations."
      maxWidth="lg"
    >
      <div className="space-y-4 pt-2">
        {/* Environment & Location Card */}
        <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-primary" />
              Approved Pilot Testbed
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Version {plan.version} • APPROVED
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">{plan.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-primary/10">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{plan.location_description}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{envMeta.label}</span>
            </div>
          </div>
        </div>

        {/* Execution Expectations Notice */}
        <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Governance & Execution Principles:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>
              <strong>External Execution:</strong> The university research team conducts the physical/digital pilot operations in the specified research environment.
            </li>
            <li>
              <strong>Progress Tracking:</strong> CivicFix will record and coordinate your regular progress updates, milestone completions, test evidence, and risk/blocker mitigations.
            </li>
            <li>
              <strong>Cadence:</strong> Regular execution updates will be scheduled according to your project's update cadence.
            </li>
            <li>
              <strong>Stage Transition:</strong> Confirming will immediately mark the project research stage as <strong className="text-primary font-mono">PILOT_ACTIVE</strong>.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-sm"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            Confirm & Start Pilot Execution
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
