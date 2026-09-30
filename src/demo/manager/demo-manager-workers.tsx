import { HardHat, Mail, MapPin, Phone, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoManagerWorkersPage() {
  const { workers, issues, currentPersona } = useDemo();

  return (
    <div className="space-y-6">
      <PageHeader
        tag={`${currentPersona.departmentName || "Roads & Infrastructure"} · Field Engineering Team`}
        title="Department Field Worker Roster"
        description="Monitor field technician availability, current work order load, and contact details."
        actions={
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/demo/manager">Back to Department Queue</Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => {
          const assignedTasks = issues.filter(
            (i) => i.assignments.some((a) => a.worker_id === worker.id && a.status !== "COMPLETED")
          );

          return (
            <Card key={worker.id} className="border-border/70 shadow-xs hover:border-teal-400 transition">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 shadow-2xs font-bold">
                      <HardHat className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{worker.full_name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground">{worker.display_name}</p>
                    </div>
                  </div>
                  <Badge variant={assignedTasks.length > 0 ? "info" : "outline"} className="text-[10px] font-bold">
                    {assignedTasks.length} Active {assignedTasks.length === 1 ? "Task" : "Tasks"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1 text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-teal-700" />
                    {worker.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-teal-700" />
                    {worker.phone}
                  </p>
                </div>

                <div className="border-t pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active Dispatches:
                  </p>
                  {assignedTasks.length === 0 ? (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Available for new assignment
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {assignedTasks.map((t) => (
                        <li key={t.id} className="text-[11px] flex items-center justify-between">
                          <Link to={`/demo/manager/issues/${t.id}`} className="font-mono text-teal-800 hover:underline">
                            {t.id}
                          </Link>
                          <span className="text-muted-foreground truncate max-w-[140px]">{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
