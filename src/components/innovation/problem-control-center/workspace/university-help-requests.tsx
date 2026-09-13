import {
  Cpu,
  DollarSign,
  HelpCircle,
  Radio,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { InstitutionLifecycleTrack } from "@/lib/innovation";

interface UniversityHelpRequestsProps {
  institution: InstitutionLifecycleTrack;
}

export function UniversityHelpRequests({
  institution,
}: UniversityHelpRequestsProps) {
  return (
    <div className="space-y-6 text-xs">
      {/* 1. SECTION HEADER */}
      <div className="flex items-center justify-between pb-1 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span>Help &amp; Resource Requests</span>
          </h4>
          <p className="text-muted-foreground">
            Hardware, municipal testbed access, laboratory equipment, or funding requests submitted by {institution.institutionName}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          0 Active Requests
        </Badge>
      </div>

      {/* 2. REAL EMPTY STATE (NO FAKE DATA) */}
      <EmptyState
        title="No Active Help Requests"
        description={`When ${institution.institutionName}'s research team requests technology, hardware sensors, municipal testbed access, funding, or infrastructure, requests will appear here for Innovation Manager triage.`}
      />

      {/* 3. FUTURE RESEARCH & INNOVATION MARKETPLACE INFORMATIONAL CARD */}
      <Card className="border-dashed border-border/80 bg-muted/10 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <CardTitle className="text-sm font-bold text-foreground">
                Research &amp; Innovation Marketplace Connection
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Future Lifecycle Phase · Informational
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3 text-muted-foreground">
          <p className="leading-relaxed">
            In upcoming platform phases, university help requests will seamlessly bridge into the CivicFix Research &amp; Innovation Marketplace, enabling corporate CSR co-sponsors, deep-tech startups, and municipal agencies to co-fund and supply specialized research assets.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl border border-border/60 bg-background/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Cpu className="w-3.5 h-3.5 text-sky-600" />
                <span>Hardware &amp; IoT Sensors</span>
              </div>
              <p className="text-[11px]">
                Specialized environmental probe kits, water quality meters, and edge computing nodes.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Radio className="w-3.5 h-3.5 text-teal-600" />
                <span>Municipal Testbeds</span>
              </div>
              <p className="text-[11px]">
                Direct telemetry integration with municipal water treatment stations and arterial corridors.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Corporate CSR Co-Funding</span>
              </div>
              <p className="text-[11px]">
                Matched private sector innovation grants dedicated to empirical validation pilots.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
