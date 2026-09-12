import { useEffect, useState } from "react";
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  createInstitutionProject,
  deleteInstitutionProject,
  fetchInstitutionById,
  fetchInstitutionMembers,
  fetchInstitutionProjects,
  getVerificationStatusBadge,
  provisionInstitutionCoordinator,
  updateInstitution,
  type InstitutionMemberWithProfile,
  type ProvisionCoordinatorResult,
} from "@/lib/institutions";
import type {
  InstitutionProjectRow,
  InstitutionRow,
  InstitutionVerificationStatus,
} from "@/types/database";

export function AdminInstitutionDetailPage() {
  const { institutionId } = useParams();
  const [searchParams] = useSearchParams();

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [projects, setProjects] = useState<InstitutionProjectRow[]>([]);
  const [members, setMembers] = useState<InstitutionMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"capabilities" | "infrastructure" | "projects" | "members">("capabilities");

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [projectTechs, setProjectTechs] = useState<string[]>([]);
  const [projectTechInput, setProjectTechInput] = useState("");
  const [projectOutcomes, setProjectOutcomes] = useState<string[]>([]);
  const [projectOutcomeInput, setProjectOutcomeInput] = useState("");
  const [projectStartYear, setProjectStartYear] = useState<number | "">("");
  const [projectEndYear, setProjectEndYear] = useState<number | "">("");
  const [savingProject, setSavingProject] = useState(false);

  // Provisioning Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [coordName, setCoordName] = useState("");
  const [coordEmail, setCoordEmail] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [coordRoleTitle, setCoordRoleTitle] = useState("CivicFix Nodal Coordinator");
  const [coordPrimary, setCoordPrimary] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<ProvisionCoordinatorResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Status Change State
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [inst, projs, mems] = await Promise.all([
          fetchInstitutionById(institutionId!),
          fetchInstitutionProjects(institutionId!),
          fetchInstitutionMembers(institutionId!),
        ]);
        if (cancelled) return;
        setInstitution(inst);
        setProjects(projs);
        setMembers(mems);

        if (searchParams.get("action") === "provision") {
          setShowProvisionModal(true);
        }
      } catch (err) {
        console.error("Failed to load institution details:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [institutionId, searchParams]);

  async function handleStatusChange(newStatus: InstitutionVerificationStatus) {
    if (!institution) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateInstitution(institution.id, {
        verification_status: newStatus,
        verified_at: newStatus === "VERIFIED" ? new Date().toISOString() : institution.verified_at,
      });
      setInstitution(updated);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleToggleActive() {
    if (!institution) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateInstitution(institution.id, {
        is_active: !institution.is_active,
      });
      setInstitution(updated);
    } catch (err) {
      console.error("Failed to toggle active status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!institution || !projectTitle.trim()) return;

    setSavingProject(true);
    try {
      const newProj = await createInstitutionProject({
        institution_id: institution.id,
        title: projectTitle.trim(),
        description: projectDesc.trim() || null,
        domain: projectDomain.trim() || null,
        technologies: projectTechs,
        outcomes: projectOutcomes,
        start_year: projectStartYear ? Number(projectStartYear) : null,
        end_year: projectEndYear ? Number(projectEndYear) : null,
        is_completed: true,
      });
      setProjects([newProj, ...projects]);
      setShowProjectModal(false);
      setProjectTitle("");
      setProjectDesc("");
      setProjectDomain("");
      setProjectTechs([]);
      setProjectTechInput("");
      setProjectOutcomes([]);
      setProjectOutcomeInput("");
      setProjectStartYear("");
      setProjectEndYear("");
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject(projId: string) {
    if (!confirm("Are you sure you want to remove this project?")) return;
    try {
      await deleteInstitutionProject(projId);
      setProjects(projects.filter((p) => p.id !== projId));
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  }

  async function handleProvisionCoordinator(e: React.FormEvent) {
    e.preventDefault();
    if (!institution || !coordName.trim() || !coordEmail.trim()) return;

    setProvisioning(true);
    setProvisionError(null);
    try {
      const result = await provisionInstitutionCoordinator({
        institutionId: institution.id,
        fullName: coordName.trim(),
        email: coordEmail.trim(),
        phone: coordPhone.trim() || undefined,
        roleTitle: coordRoleTitle.trim() || "CivicFix Nodal Coordinator",
        isPrimaryContact: coordPrimary,
      });

      setProvisionSuccess(result);
      // Reload members
      const updatedMembers = await fetchInstitutionMembers(institution.id);
      setMembers(updatedMembers);
    } catch (err: unknown) {
      console.error("Provisioning failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to provision account.";
      setProvisionError(msg);
    } finally {
      setProvisioning(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  }

  if (loading || !institution) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <Card className="h-96 animate-pulse border border-border/60 bg-muted/20" />
      </div>
    );
  }

  const statusBadge = getVerificationStatusBadge(institution.verification_status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        tag={institution.institution_type}
        title={institution.name}
        description={
          institution.official_name && institution.official_name !== institution.name
            ? institution.official_name
            : `${institution.institution_type} · ${institution.city}, ${institution.state}`
        }
        backHref="/app/admin/institutions"
        backLabel="Registry"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setShowProvisionModal(true);
                setProvisionSuccess(null);
                setProvisionError(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Provision Coordinator
            </Button>
          </div>
        }
      />

      {/* Top Banner Overview Card */}
      <Card className="border border-border/80 bg-surface/90 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left info */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">
                  {institution.institution_type}
                </Badge>

                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>

                {institution.is_active ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Active Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                    Inactive
                  </span>
                )}

                {institution.nirf_rank && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <Award className="h-3 w-3" />
                    NIRF Rank #{institution.nirf_rank}
                  </span>
                )}

                {institution.naac_grade && (
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                    NAAC: {institution.naac_grade}
                  </span>
                )}
              </div>

              {institution.description && (
                <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                  {institution.description}
                </p>
              )}

              {/* Quick Contacts */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {institution.city}, {institution.state} {institution.pincode ? `· ${institution.pincode}` : ""}
                  </span>
                </div>

                {institution.website && (
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                    <a
                      href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:underline"
                    >
                      {institution.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}

                {institution.official_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{institution.official_email}</span>
                  </div>
                )}

                {institution.established_year && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Established {institution.established_year}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Status Controls */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3 min-w-[220px]">
              <div className="text-xs font-semibold text-foreground">Governance Controls</div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Verification Status:</label>
                <select
                  value={institution.verification_status}
                  disabled={updatingStatus}
                  onChange={(e) => void handleStatusChange(e.target.value as InstitutionVerificationStatus)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updatingStatus}
                onClick={() => void handleToggleActive()}
                className="w-full text-xs"
              >
                {institution.is_active ? "Suspend Participation" : "Activate Institution"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("capabilities")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "capabilities"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Capability Matrix ({institution.research_domains?.length || 0} Domains)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("infrastructure")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "infrastructure"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Labs & Equipment ({institution.laboratories?.length || 0} Labs)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "projects"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Projects & Pilots ({projects.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UsersRound className="h-4 w-4" />
          Institution Accounts ({members.length})
        </button>
      </div>

      {/* TAB 1: CAPABILITIES */}
      {activeTab === "capabilities" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Research Domains */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Research Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {institution.research_domains && institution.research_domains.length > 0 ? (
                    institution.research_domains.map((domain, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 border border-sky-200/80"
                      >
                        {domain}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No domains cataloged.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Areas of Expertise */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialized Areas of Expertise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {institution.areas_of_expertise && institution.areas_of_expertise.length > 0 ? (
                    institution.areas_of_expertise.map((exp, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200/80"
                      >
                        {exp}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No expertise cataloged.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Technologies */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Technologies & Methodologies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {institution.technologies && institution.technologies.length > 0 ? (
                    institution.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200/80"
                      >
                        {tech}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No technologies cataloged.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Academic Departments */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Participating Departments & Centers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {institution.departments && institution.departments.length > 0 ? (
                    institution.departments.map((dept, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground border border-border"
                      >
                        {dept}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No departments cataloged.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collaboration Capabilities */}
          {institution.collaboration_capabilities && institution.collaboration_capabilities.length > 0 && (
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Collaboration & Municipal Engagement Modes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {institution.collaboration_capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200/80"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: INFRASTRUCTURE */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Laboratories */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Laboratories & Research Centers ({institution.laboratories?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs">
                  {institution.laboratories && institution.laboratories.length > 0 ? (
                    institution.laboratories.map((lab, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{lab}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No laboratory records recorded.</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Specialized Equipment */}
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialized Equipment & Instruments ({institution.equipment?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs">
                  {institution.equipment && institution.equipment.length > 0 ? (
                    institution.equipment.map((eq, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <Wrench className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>{eq}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No equipment records recorded.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Field Deployment Capabilities */}
          {institution.field_capabilities && institution.field_capabilities.length > 0 && (
            <Card className="border border-border/80 bg-surface/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Field Testing & Deployment Readiness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {institution.field_capabilities.map((field, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/80 bg-background p-3 text-xs text-foreground flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Past Research & Municipal Pilot Projects
            </h3>
            <Button
              size="sm"
              onClick={() => setShowProjectModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card className="border border-border/80 bg-surface/90 p-8 text-center">
              <p className="text-xs text-muted-foreground">
                No past research or pilot projects added yet. Click &quot;Add Project&quot; to catalog past civic technology initiatives.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((proj) => (
                <Card key={proj.id} className="border border-border/80 bg-surface/90 shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground">{proj.title}</h4>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProject(proj.id)}
                        className="text-muted-foreground hover:text-red-600 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {proj.domain && (
                      <Badge variant="outline" className="w-fit text-[10px]">
                        {proj.domain}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground pb-4">
                    {proj.description && <p>{proj.description}</p>}

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.technologies.map((t, i) => (
                          <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {(proj.start_year || proj.end_year) && (
                      <div className="text-[11px] text-muted-foreground pt-1">
                        Period: {proj.start_year || ""} {proj.end_year ? `– ${proj.end_year}` : ""}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEMBERS & COORDINATOR ACCOUNTS */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Institutional Coordinators</h3>
              <p className="text-xs text-muted-foreground">
                Provisioned user accounts authorized to access the University Portal on behalf of {institution.name}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowProvisionModal(true);
                setProvisionSuccess(null);
                setProvisionError(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Provision Coordinator Account
            </Button>
          </div>

          {members.length === 0 ? (
            <Card className="border border-border/80 bg-surface/90 p-8 text-center">
              <p className="text-xs text-muted-foreground">
                No user accounts have been provisioned for this institution yet. Click &quot;Provision Coordinator Account&quot; to create official credentials.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((mem) => (
                <Card key={mem.id} className="border border-border/80 bg-surface/90 shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {mem.profile?.full_name || "Institution User"}
                      </h4>
                      <p className="text-xs text-muted-foreground">{mem.role_title}</p>
                    </div>
                    {mem.is_primary_contact && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Primary Contact
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                    {mem.profile?.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span>{mem.profile.email}</span>
                      </div>
                    )}
                    {mem.profile?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <span>{mem.profile.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                    <span>
                      Status:{" "}
                      <span className={mem.profile?.is_active ? "text-emerald-600 font-medium" : "text-red-500"}>
                        {mem.profile?.is_active ? "Active" : "Suspended"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Linked {new Date(mem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD PROJECT */}
      <Dialog
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Add Research / Pilot Project"
        description={`Add a past municipal pilot, patent, or published civic solution for ${institution.name}.`}
      >
        <form onSubmit={(e) => { void handleCreateProject(e); }} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI-Assisted Pothole Detection on Municipal Buses"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Domain</label>
            <input
              type="text"
              placeholder="e.g. Smart Transportation"
              value={projectDomain}
              onChange={(e) => setProjectDomain(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Technologies Used (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Computer Vision, Edge AI, Python, ROS"
              value={projectTechInput}
              onChange={(e) => {
                setProjectTechInput(e.target.value);
                setProjectTechs(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Key Outcomes / Impact (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. 40% reduction in response time, Deployed on 50 civic vehicles"
              value={projectOutcomeInput}
              onChange={(e) => {
                setProjectOutcomeInput(e.target.value);
                setProjectOutcomes(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Description & Impact</label>
            <textarea
              rows={3}
              placeholder="Brief summary of results, pilot location, and municipal partner..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Start Year</label>
              <input
                type="number"
                placeholder="2022"
                value={projectStartYear}
                onChange={(e) => setProjectStartYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">End Year</label>
              <input
                type="number"
                placeholder="2024"
                value={projectEndYear}
                onChange={(e) => setProjectEndYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProjectModal(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={savingProject} className="bg-primary text-primary-foreground">
              {savingProject ? "Saving..." : "Save Project"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: PROVISION COORDINATOR ACCOUNT */}
      <Dialog
        open={showProvisionModal}
        onClose={() => {
          setShowProvisionModal(false);
          setProvisionSuccess(null);
          setProvisionError(null);
        }}
        title={`Provision Account for ${institution.name}`}
        description="Creates an authenticated Clerk login and links the coordinator profile to this institution."
      >
        {provisionSuccess ? (
          /* SUCCESS SCREEN */
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Institution Coordinator Account Created!</span>
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Please share these credentials securely with the coordinator. Passwords are not saved in plain text.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-xs">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <div className="font-semibold text-foreground">{provisionSuccess.user.fullName}</div>
              </div>

              <div>
                <span className="text-muted-foreground">Official Email (Login Identifier):</span>
                <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                  <span>{provisionSuccess.user.email}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(provisionSuccess.user.email, "email")}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedField === "email" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedField === "email" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Assigned Username:</span>
                <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                  <span>{provisionSuccess.user.username}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(provisionSuccess.user.username, "username")}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedField === "username" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedField === "username" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {provisionSuccess.user.temporaryPassword && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                    Temporary Password
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-sm font-bold text-foreground">
                    <span>{provisionSuccess.user.temporaryPassword}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(provisionSuccess.user.temporaryPassword!, "password")}
                      className="text-primary hover:underline flex items-center gap-1 text-xs"
                    >
                      {copiedField === "password" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === "password" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowProvisionModal(false);
                  setProvisionSuccess(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* INPUT FORM */
          <form onSubmit={(e) => { void handleProvisionCoordinator(e); }} className="space-y-4 pt-2">
            {provisionError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{provisionError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground">
                Coordinator Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Prof. Arvind Raman"
                value={coordName}
                onChange={(e) => setCoordName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Official Institutional Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. araman@iitb.ac.in"
                value={coordEmail}
                onChange={(e) => setCoordEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must be an active email address. A temporary password will be generated for login.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Official Phone</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={coordPhone}
                onChange={(e) => setCoordPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Role Title / Designation</label>
              <input
                type="text"
                placeholder="e.g. Dean R&D / Principal Investigator"
                value={coordRoleTitle}
                onChange={(e) => setCoordRoleTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="coordPrimary"
                checked={coordPrimary}
                onChange={(e) => setCoordPrimary(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="coordPrimary" className="text-xs text-foreground">
                Set as Primary Nodal Contact for challenge invitations
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowProvisionModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={provisioning} className="bg-primary text-primary-foreground">
                {provisioning ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Provisioning Account...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    Provision Official Account
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
