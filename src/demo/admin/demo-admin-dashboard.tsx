import { useMemo } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  Layers,
  Lightbulb,
  Microscope,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoAdminDashboardPage() {
  const { issues, challenges, proposals, pilots, departments, personas, currentPersona } = useDemo();

  const metrics = useMemo(() => {
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter(
      (i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED"
    ).length;
    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
    const totalChallenges = challenges.length;
    const activePilots = pilots.filter((p) => p.status === "ACTIVE").length;

    return {
      totalIssues,
      resolvedIssues,
      resolutionRate,
      totalChallenges,
      activePilots,
    };
  }, [issues, challenges, pilots]);

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Platform Governance & Telemetry"
        title="Administrative System Overview"
        description={`Logged in as ${currentPersona.fullName} · System health, cross-track analytics, and persona governance`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/demo/admin/users">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                User Roster ({personas.length})
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <Link to="/demo/admin/departments">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Department Budgets
              </Link>
            </Button>
          </div>
        }
      />

      {/* High-Level Telemetry Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Civic Issues</p>
              <p className="text-2xl font-bold text-foreground mt-1">{metrics.totalIssues}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution Rate</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.resolutionRate}%</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">R&D Challenges</p>
              <p className="text-2xl font-bold text-violet-700 mt-1">{metrics.totalChallenges}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-700">
              <Lightbulb className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Pilots</p>
              <p className="text-2xl font-bold text-sky-700 mt-1">{metrics.activePilots}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Microscope className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Department Health */}
        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
            <div>
              <CardTitle className="text-base font-bold">Municipal Department Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Active work orders, staffing, and departmental resolution state.</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/demo/admin/departments">View All &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Department Head</th>
                    <th className="px-4 py-3">Field Staff</th>
                    <th className="px-4 py-3">Active Issues</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-teal-700" />
                        {d.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.headName}</td>
                      <td className="px-4 py-3 font-semibold">{d.workerCount} technicians</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {d.activeIssuesCount} issues
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="h-3 w-3" />
                          Operational
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 8-Persona Sandbox Roster */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Predefined Demo Personas (8)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
            {personas.map((p) => (
              <div key={p.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{p.displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{p.role}</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold">
                  {p.badge}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
