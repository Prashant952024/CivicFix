import { useEffect, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useAppSession } from "@/auth/app-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import {
  createInstitutionProject,
  deleteInstitutionProject,
  fetchInstitutionById,
  fetchInstitutionProjects,
  getVerificationStatusBadge,
  updateInstitution,
} from "@/lib/institutions";
import { supabase } from "@/lib/supabase";
import type { InstitutionProjectRow, InstitutionRow, InstitutionUpdate } from "@/types/database";

export function UniversityProfilePage() {
  const { profile } = useAppSession();

  const [institution, setInstitution] = useState<InstitutionRow | null>(null);
  const [projects, setProjects] = useState<InstitutionProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Capabilities Tags
  const [departments, setDepartments] = useState<string[]>([]);
  const [researchDomains, setResearchDomains] = useState<string[]>([]);
  const [areasOfExpertise, setAreasOfExpertise] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [laboratories, setLaboratories] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [fieldCapabilities, setFieldCapabilities] = useState<string[]>([]);
  const [collaborationCapabilities, setCollaborationCapabilities] = useState<string[]>([]);

  // Tag inputs
  const [domainInput, setDomainInput] = useState("");
  const [expertiseInput, setExpertiseInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [labInput, setLabInput] = useState("");
  const [equipInput, setEquipInput] = useState("");
  const [fieldCapInput, setFieldCapInput] = useState("");
  const [collabInput, setCollabInput] = useState("");

  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [projectTechs, setProjectTechs] = useState<string[]>([]);
  const [projectOutcomes, setProjectOutcomes] = useState<string[]>([]);
  const [projectStartYear, setProjectStartYear] = useState<number | "">("");
  const [projectEndYear, setProjectEndYear] = useState<number | "">("");
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        let instId = profile?.institution_id;

        if (!instId && profile?.id) {
          const { data: memberRecord } = await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          if (memberRecord?.institution_id) {
            instId = memberRecord.institution_id;
          }
        }

        if (!instId) {
          const { data: fallbackInst } = await supabase
            .from("institutions")
            .select("id")
            .eq("name", "IIT Bombay")
            .maybeSingle();

          if (fallbackInst) {
            instId = fallbackInst.id;
          }
        }

        if (instId) {
          const [inst, projs] = await Promise.all([
            fetchInstitutionById(instId),
            fetchInstitutionProjects(instId),
          ]);

          if (!cancelled && inst) {
            setInstitution(inst);
            setDescription(inst.description || "");
            setWebsite(inst.website || "");
            setOfficialEmail(inst.official_email || "");
            setPhone(inst.phone || "");
            setAddress(inst.address || "");
            setDepartments(inst.departments || []);
            setResearchDomains(inst.research_domains || []);
            setAreasOfExpertise(inst.areas_of_expertise || []);
            setTechnologies(inst.technologies || []);
            setLaboratories(inst.laboratories || []);
            setEquipment(inst.equipment || []);
            setFieldCapabilities(inst.field_capabilities || []);
            setCollaborationCapabilities(inst.collaboration_capabilities || []);
          }
          if (!cancelled) {
            setProjects(projs);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [profile?.institution_id, profile?.id]);

  function addTag(
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  }

  function removeTag(
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setList(list.filter((_, i) => i !== index));
  }

  function handleTagKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(value, list, setList, setInput);
    }
  }

  async function handleSaveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!institution) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload: InstitutionUpdate = {
        description: description.trim() || null,
        website: website.trim() || null,
        official_email: officialEmail.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        departments,
        research_domains: researchDomains,
        areas_of_expertise: areasOfExpertise,
        technologies,
        laboratories,
        equipment,
        field_capabilities: fieldCapabilities,
        collaboration_capabilities: collaborationCapabilities,
      };

      const updated = await updateInstitution(institution.id, payload);
      setInstitution(updated);
      setSuccessMessage("Institution profile and capabilities successfully updated!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to update institution:", err);
      const msg = err instanceof Error ? err.message : "Failed to save updates.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!institution || !projectTitle.trim()) return;

    setSavingProject(true);
    try {
      const created = await createInstitutionProject({
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
      setProjects([created, ...projects]);
      setShowProjectModal(false);
      setProjectTitle("");
      setProjectDesc("");
      setProjectDomain("");
      setProjectTechs([]);
      setProjectOutcomes([]);
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        tag="Capability Intelligence"
        title="Institution Capability Intelligence"
        description="Keep your research areas, laboratories, and specialized instruments up to date for civic challenge matching."
        backHref="/app/university"
        backLabel="Dashboard"
        actions={
          <Button
            size="sm"
            onClick={() => {
              void handleSaveProfile();
            }}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save Capability Profile
              </>
            )}
          </Button>
        }
      />

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Read-only Governance Banner */}
      <Card className="border border-border/80 bg-surface/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{institution.name}</h2>
                <Badge variant="outline" className="text-[10px]">
                  {institution.institution_type}
                </Badge>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Official Name: {institution.official_name || institution.name} · {institution.city}, {institution.state}
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              Institutional governance & name changes are verified by CivicFix Platform Admins.
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={(e) => { void handleSaveProfile(e); }} className="space-y-6">
        {/* Research Domains & Expertise */}
        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Research Domains & Expertise Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Academic Departments */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Academic Departments & Centers
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Civil Engineering, Computer Science, Environmental Studies..."
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, deptInput, departments, setDepartments, setDeptInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(deptInput, departments, setDepartments, setDeptInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {departments.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-800 border border-slate-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, departments, setDepartments)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Research Domains */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Research Domains
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Smart Urban Water, Air Pollution Control, Structural Health Monitoring..."
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, domainInput, researchDomains, setResearchDomains, setDomainInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(domainInput, researchDomains, setResearchDomains, setDomainInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {researchDomains.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-sky-50 px-2.5 py-1 text-xs text-sky-700 border border-sky-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, researchDomains, setResearchDomains)}
                      className="text-sky-500 hover:text-sky-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Areas of Expertise */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Areas of Specialized Expertise
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Pothole Classification, Flood Runoff Simulation, Solid Waste Segregation..."
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, expertiseInput, areasOfExpertise, setAreasOfExpertise, setExpertiseInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(expertiseInput, areasOfExpertise, setAreasOfExpertise, setExpertiseInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {areasOfExpertise.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 border border-emerald-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, areasOfExpertise, setAreasOfExpertise)}
                      className="text-emerald-500 hover:text-emerald-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Technologies */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Key Technologies & Tools
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. IoT Edge Computing, Computer Vision, Geospatial GIS, Satellite Telemetry..."
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, techInput, technologies, setTechnologies, setTechInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(techInput, technologies, setTechnologies, setTechInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {technologies.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-purple-50 px-2.5 py-1 text-xs text-purple-700 border border-purple-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, technologies, setTechnologies)}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Labs & Equipment */}
        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Laboratories, Facilities & Specialized Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Laboratories */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Research Laboratories & Centers of Excellence
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Environmental Engineering Lab, Urban Data Science Center..."
                  value={labInput}
                  onChange={(e) => setLabInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, labInput, laboratories, setLaboratories, setLabInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(labInput, laboratories, setLaboratories, setLabInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {laboratories.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-teal-50 px-2.5 py-1 text-xs text-teal-700 border border-teal-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, laboratories, setLaboratories)}
                      className="text-teal-500 hover:text-teal-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Specialized Equipment & Instruments
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Mass Spectrometer, Ground Penetrating Radar, Drone LIDAR..."
                  value={equipInput}
                  onChange={(e) => setEquipInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, equipInput, equipment, setEquipment, setEquipInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(equipInput, equipment, setEquipment, setEquipInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {equipment.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-xs text-amber-700 border border-amber-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, equipment, setEquipment)}
                      className="text-amber-500 hover:text-amber-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Field Capabilities */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Field Deployment & Pilot Readiness
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Mobile Water Testing Van, Road Surface Roughness Surveying..."
                  value={fieldCapInput}
                  onChange={(e) => setFieldCapInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, fieldCapInput, fieldCapabilities, setFieldCapabilities, setFieldCapInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(fieldCapInput, fieldCapabilities, setFieldCapabilities, setFieldCapInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {fieldCapabilities.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 border border-emerald-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, fieldCapabilities, setFieldCapabilities)}
                      className="text-emerald-500 hover:text-emerald-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Collaboration Capabilities */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Collaboration & Joint Engagement Modes
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Joint Pilot Implementation, Advisory Services, Student Internships..."
                  value={collabInput}
                  onChange={(e) => setCollabInput(e.target.value)}
                  onKeyDown={(e) => handleTagKeyDown(e, collabInput, collaborationCapabilities, setCollaborationCapabilities, setCollabInput)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(collabInput, collaborationCapabilities, setCollaborationCapabilities, setCollabInput)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {collaborationCapabilities.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-purple-50 px-2.5 py-1 text-xs text-purple-700 border border-purple-200"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag(idx, collaborationCapabilities, setCollaborationCapabilities)}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Overview */}
        <Card className="border border-border/80 bg-surface/90 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Official Contact & Institutional Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Description & Overview</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Official Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Contact Email</label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Campus Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Saving Updates...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Save Capability Profile
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Projects & Past Solutions Section */}
      <Card className="border border-border/80 bg-surface/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Past Research & Municipal Pilots ({projects.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Highlight proven solutions and technology deployments.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowProjectModal(true)} className="bg-primary text-primary-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Project
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No projects cataloged yet. Click &quot;Add Project&quot; to showcase your institution&apos;s previous pilot projects.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {projects.map((p) => (
                <div key={p.id} className="rounded-lg border border-border/80 bg-background p-3 text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-foreground">{p.title}</div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProject(p.id)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {p.description && <p className="text-muted-foreground">{p.description}</p>}
                  {p.domain && (
                    <Badge variant="outline" className="text-[10px]">
                      {p.domain}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Project Modal */}
      <Dialog
        open={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Add Civic Solution / Pilot"
        description="Share a past technology pilot, research deployment, or municipal patent."
      >
        <form onSubmit={(e) => { void handleAddProject(e); }} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Low-Cost IoT Flood Warning Sensor Grid"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Domain</label>
            <input
              type="text"
              placeholder="e.g. Flood Resilience & Stormwater"
              value={projectDomain}
              onChange={(e) => setProjectDomain(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Summary & Outcomes</label>
            <textarea
              rows={3}
              placeholder="Describe what was developed, testing results, and municipal impact..."
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
                value={projectStartYear}
                onChange={(e) => setProjectStartYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">End Year</label>
              <input
                type="number"
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
    </div>
  );
}
