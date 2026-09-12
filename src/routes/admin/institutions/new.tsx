import { useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Wrench,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createInstitution } from "@/lib/institutions";
import type { InstitutionInsert, InstitutionVerificationStatus } from "@/types/database";

const INSTITUTION_TYPES = [
  "IIT",
  "NIT",
  "IISER",
  "Central University",
  "State University",
  "Government Research Organization",
  "Agricultural University",
  "IIIT",
  "Engineering Institute",
  "Medical/Health Research Institute",
  "Research Institute",
  "University",
  "Other",
];

export function AdminNewInstitutionPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"identity" | "location" | "capabilities" | "infrastructure">("identity");

  // Form State
  const [name, setName] = useState("");
  const [officialName, setOfficialName] = useState("");
  const [institutionType, setInstitutionType] = useState("University");
  const [acronym, setAcronym] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [establishedYear, setEstablishedYear] = useState<number | "">("");
  const [nirfRank, setNirfRank] = useState<number | "">("");
  const [naacGrade, setNaacGrade] = useState("");

  const [officialEmail, setOfficialEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [verificationStatus, setVerificationStatus] = useState<InstitutionVerificationStatus>("VERIFIED");

  // Array Tags State
  const [departments, setDepartments] = useState<string[]>([]);
  const [researchDomains, setResearchDomains] = useState<string[]>([]);
  const [areasOfExpertise, setAreasOfExpertise] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [laboratories, setLaboratories] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [fieldCapabilities, setFieldCapabilities] = useState<string[]>([]);
  const [collaborationCapabilities, setCollaborationCapabilities] = useState<string[]>([]);

  // Input states for chip additions
  const [deptInput, setDeptInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [expertiseInput, setExpertiseInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [labInput, setLabInput] = useState("");
  const [facilityInput, setFacilityInput] = useState("");
  const [equipInput, setEquipInput] = useState("");
  const [fieldCapInput, setFieldCapInput] = useState("");
  const [collabInput, setCollabInput] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Institution Name is required.");
      setActiveTab("identity");
      return;
    }

    if (!city.trim() || !stateName.trim()) {
      setError("City and State are required.");
      setActiveTab("location");
      return;
    }

    setSubmitting(true);
    try {
      const payload: InstitutionInsert = {
        name: name.trim(),
        official_name: officialName.trim() || null,
        institution_type: institutionType,
        acronym: acronym.trim() || null,
        description: description.trim() || null,
        website: website.trim() || null,
        established_year: establishedYear ? Number(establishedYear) : null,
        nirf_rank: nirfRank ? Number(nirfRank) : null,
        naac_grade: naacGrade.trim() || null,
        official_email: officialEmail.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim(),
        district: district.trim() || null,
        state: stateName.trim(),
        pincode: pincode.trim() || null,
        departments,
        research_domains: researchDomains,
        areas_of_expertise: areasOfExpertise,
        technologies,
        laboratories,
        facilities,
        equipment,
        field_capabilities: fieldCapabilities,
        collaboration_capabilities: collaborationCapabilities,
        verification_status: verificationStatus,
        is_active: true,
      };

      const created = await createInstitution(payload);
      void navigate(`/app/admin/institutions/${created.id}`);
    } catch (err: unknown) {
      console.error("Create institution failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to create institution. Ensure the institution name is unique.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        tag="Institution Onboarding"
        title="Register New Institution"
        description="Catalog a university, research lab, or academic center with granular capability intelligence."
        backHref="/app/admin/institutions"
        backLabel="Back to Registry"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "identity"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          1. Identity & Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("location")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "location"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          2. Location & Contact
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("capabilities")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "capabilities"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          3. Research Capabilities
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
          4. Labs & Infrastructure
        </button>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
        {/* TAB 1: IDENTITY */}
        {activeTab === "identity" && (
          <Card className="border border-border/80 bg-surface/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Institution Identity & Accreditation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Common Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IIT Bombay"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Official Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Indian Institute of Technology Bombay"
                    value={officialName}
                    onChange={(e) => setOfficialName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">
                    Institution Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Acronym / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. IITB"
                    value={acronym}
                    onChange={(e) => setAcronym(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Official Website URL</label>
                  <input
                    type="url"
                    placeholder="https://www.iitb.ac.in"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Established Year</label>
                  <input
                    type="number"
                    placeholder="1958"
                    value={establishedYear}
                    onChange={(e) => setEstablishedYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">NIRF Rank (National)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3"
                    value={nirfRank}
                    onChange={(e) => setNirfRank(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">NAAC Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. A++"
                    value={naacGrade}
                    onChange={(e) => setNaacGrade(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Description & Overview</label>
                <textarea
                  rows={3}
                  placeholder="Summary of research mandate, civic engagement history, and academic strengths..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Initial Verification Status</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as InstitutionVerificationStatus)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:max-w-xs"
                >
                  <option value="VERIFIED">Verified & Active</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" size="sm" onClick={() => setActiveTab("location")}>
                  Next: Location & Contact →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: LOCATION & CONTACT */}
        {activeTab === "location" && (
          <Card className="border border-border/80 bg-surface/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Location & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai Suburban"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 400076"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Official Contact Email</label>
                  <input
                    type="email"
                    placeholder="dean.rnd@iitb.ac.in"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Official Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 22 2572 2545"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Campus Address</label>
                <textarea
                  rows={2}
                  placeholder="Main Gate Road, Powai, Mumbai, Maharashtra"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("identity")}>
                  ← Back to Identity
                </Button>
                <Button type="button" size="sm" onClick={() => setActiveTab("capabilities")}>
                  Next: Research Capabilities →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: CAPABILITIES */}
        {activeTab === "capabilities" && (
          <Card className="border border-border/80 bg-surface/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Academic & Research Capability Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Research Domains */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Research Domains (e.g. Urban Water Systems, Smart Transportation, Air Quality)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add domain and press Enter or comma..."
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
                      className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700 border border-sky-200"
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
                  Areas of Expertise (e.g. Pothole Detection, Flood Modeling, Circular Waste Systems)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add expertise and press Enter..."
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
                      className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200"
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
                  Technologies (e.g. IoT Sensor Networks, Computer Vision, GIS, SCADA)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add technology and press Enter..."
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
                      className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700 border border-purple-200"
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

              {/* Departments */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Academic Departments (e.g. Civil Engineering, Computer Science, Environmental Engineering)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add department and press Enter..."
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
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-border"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag(idx, departments, setDepartments)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("location")}>
                  ← Back to Location
                </Button>
                <Button type="button" size="sm" onClick={() => setActiveTab("infrastructure")}>
                  Next: Labs & Infrastructure →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: INFRASTRUCTURE */}
        {activeTab === "infrastructure" && (
          <Card className="border border-border/80 bg-surface/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Laboratories, Specialized Equipment & Deployment Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Laboratories */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Laboratories & Centers of Excellence
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Environmental Geotechnology Lab, Remote Sensing Center..."
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
                      className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700 border border-teal-200"
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

              {/* Facilities */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Specialized Research Facilities & Centers
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Clean Room Class 100, Hydraulics Flume, Wind Tunnel..."
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    onKeyDown={(e) => handleTagKeyDown(e, facilityInput, facilities, setFacilities, setFacilityInput)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(facilityInput, facilities, setFacilities, setFacilityInput)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {facilities.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 border border-indigo-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag(idx, facilities, setFacilities)}
                        className="text-indigo-500 hover:text-indigo-800"
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
                  Specialized Equipment
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. ICP-MS, Ground Penetrating Radar, High-Volume Air Samplers..."
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
                      className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700 border border-amber-200"
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
                  Field & Pilot Deployment Capabilities
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Field sensor deployment, Mobile water testing van, Urban pilot testbed..."
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
                      className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200"
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
                  Collaboration Modes (e.g. Sponsored Research, Pilot Prototyping, Policy Advisory)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Municipal MoU, Joint Pilot Deployment, Technology Transfer..."
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
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag(idx, collaborationCapabilities, setCollaborationCapabilities)}
                        className="text-blue-500 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("capabilities")}>
                  ← Back to Capabilities
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Saving Institution...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save & Complete Registration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
