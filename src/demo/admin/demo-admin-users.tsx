import { Building2, CheckCircle2, Mail, Phone, Shield, ShieldAlert, User, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useDemo } from "../demo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export function DemoAdminUsersPage() {
  const { personas, workers } = useDemo();

  return (
    <div className="space-y-6">
      <PageHeader
        tag="Platform User Management"
        title="Simulated User & Role Directory"
        description="Inspect all 8 predefined stakeholder personas and simulated municipal field technicians."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/demo/admin">Back to Telemetry</Link>
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 8 Primary Personas */}
        <Card className="border-border/70 shadow-sm md:col-span-2">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-700" />
              The 8 Stakeholder Personas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Persona</th>
                    <th className="px-4 py-3">Role Enum</th>
                    <th className="px-4 py-3">Assigned Identity</th>
                    <th className="px-4 py-3">Email & Contact</th>
                    <th className="px-4 py-3 text-right">Access Route</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {personas.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-bold text-foreground">
                        {p.displayName}
                        <span className="block text-[10px] font-normal text-muted-foreground">{p.badge}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          {p.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span>{p.email}</span>
                        <span className="block text-[10px]">{p.phone}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-mono text-teal-800">
                          <Link to={p.route}>{p.route}</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
