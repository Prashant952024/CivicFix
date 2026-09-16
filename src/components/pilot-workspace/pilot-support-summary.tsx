import React from "react";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Handshake,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PilotSupportSummaryProps {
  partners?: Array<{
    id: string;
    organization_name: string;
    organization_type: string;
    category: string | null;
    contribution_summary: string | null;
    participation_status: string;
  }>;
}

export function PilotSupportSummary({ partners = [] }: PilotSupportSummaryProps) {
  if (partners.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Handshake className="h-4 w-4 text-primary" />
            Supporting Partner Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-muted-foreground">
          No external industry or organization partnerships attached to this project. The pilot is self-supported by the university research laboratory.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Handshake className="h-4 w-4 text-primary" />
            Supporting Partner Contributions ({partners.length})
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            Marketplace Verified
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground truncate">
                    {partner.organization_name}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {partner.category || partner.organization_type}
                </Badge>
              </div>

              {partner.contribution_summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {partner.contribution_summary}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Active Collaboration Agreement</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
