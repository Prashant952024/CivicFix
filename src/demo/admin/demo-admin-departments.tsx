import { Building2, CheckCircle2, DollarSign, HardHat, Layers } from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoAdminDepartmentsPage() {
  const { departments, issues } = useDemo();

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Municipal Sector Governance"
        title="Department Allocation & Capacity"
        description="Inspect all 5 municipal departments, staffing levels, and active work orders."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/admin">Back to Dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const deptIssueList = issues.filter((i) => i.department_id === dept.id);
          const resolvedCount = deptIssueList.filter(
            (i) => i.status === "RESOLVED" || i.status === "CITIZEN_VERIFIED"
          ).length;

          return (
            <Card key={dept.id} className="border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold">{dept.name}</CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground">{dept.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50">
                    Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department Head:</span>
                    <span className="font-semibold text-foreground">{dept.headName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Field Technicians:</span>
                    <span className="font-semibold text-foreground">{dept.workerCount} Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Issues:</span>
                    <span className="font-bold text-teal-800">{deptIssueList.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved Work Orders:</span>
                    <span className="font-bold text-emerald-700">{resolvedCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
