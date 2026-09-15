import { supabase } from "@/lib/supabase";
import type {
  ApplicationStatus,
  IndustryOrganizationRow,
  ListingStatus,
  ProjectActivityType,
  ProjectSupportPartnerRow,
  ResearchSupportApplicationRow,
  ResearchSupportListingRow,
  ResearchSupportRequestRow,
  ResearchSupportRequestUpdate,
  SupportConfidentiality,
  SupportRequestCategory,
  SupportRequestPriority,
  SupportRequestStatus,
} from "@/types/database";

export const SUPPORT_CATEGORY_META: Record<
  SupportRequestCategory,
  { label: string; description: string; color: string; badgeTone: "default" | "info" | "warning" | "success" | "danger" }
> = {
  FUNDING: {
    label: "Funding & Grants",
    description: "Financial grants, milestone co-funding, research sponsorships, and stipend support.",
    color: "emerald",
    badgeTone: "success",
  },
  HARDWARE: {
    label: "Hardware & Devices",
    description: "Sensors, microcontrollers, edge computers, telemetry units, test instrumentation, and field equipment.",
    color: "blue",
    badgeTone: "info",
  },
  TECHNOLOGY: {
    label: "Software, APIs & Cloud",
    description: "Cloud compute credits, specialized simulation software licenses, ML models, and API integrations.",
    color: "indigo",
    badgeTone: "info",
  },
  EXPERTISE: {
    label: "Expertise & Technical Advisory",
    description: "Industrial mentors, domain scientists, systems architects, and regulatory specialists.",
    color: "purple",
    badgeTone: "info",
  },
  INFRASTRUCTURE: {
    label: "Infrastructure & Testing Facilities",
    description: "Wind tunnels, chemical analysis labs, pilot test tracks, environmental test chambers, and fabrication plants.",
    color: "amber",
    badgeTone: "warning",
  },
  DATA: {
    label: "Data Access & Datasets",
    description: "Historical municipal datasets, proprietary sensor streams, traffic telemetry, and GIS mapping layers.",
    color: "cyan",
    badgeTone: "info",
  },
  MANUFACTURING: {
    label: "Manufacturing & Prototyping",
    description: "CNC milling, rapid 3D printing, PCB fabrication, sheet metal prototyping, and small-batch production.",
    color: "orange",
    badgeTone: "warning",
  },
};

export const PRIORITY_META: Record<
  SupportRequestPriority,
  { label: string; badgeTone: "default" | "info" | "warning" | "danger" }
> = {
  LOW: { label: "Low Priority", badgeTone: "default" },
  MEDIUM: { label: "Medium Priority", badgeTone: "info" },
  HIGH: { label: "High Priority", badgeTone: "warning" },
  CRITICAL: { label: "Critical Priority", badgeTone: "danger" },
};

export const REQUEST_STATUS_META: Record<
  SupportRequestStatus,
  { label: string; badgeTone: "default" | "info" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", badgeTone: "default" },
  SUBMITTED: { label: "Submitted", badgeTone: "info" },
  UNDER_REVIEW: { label: "Under Review", badgeTone: "info" },
  APPROVED: { label: "Approved for Listing", badgeTone: "success" },
  PUBLISHED: { label: "Published on Marketplace", badgeTone: "success" },
  IN_PROGRESS: { label: "Partner Engaged", badgeTone: "info" },
  FULFILLED: { label: "Fulfilled", badgeTone: "success" },
  REJECTED: { label: "Rejected", badgeTone: "danger" },
  CANCELLED: { label: "Cancelled", badgeTone: "default" },
  CLOSED: { label: "Closed", badgeTone: "default" },
};

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; badgeTone: "default" | "info" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Draft", badgeTone: "default" },
  SUBMITTED: { label: "Submitted", badgeTone: "info" },
  UNDER_REVIEW: { label: "Under Review", badgeTone: "warning" },
  SHORTLISTED: { label: "Shortlisted", badgeTone: "info" },
  ACCEPTED: { label: "Accepted Partner", badgeTone: "success" },
  REJECTED: { label: "Not Selected", badgeTone: "danger" },
  WITHDRAWN: { label: "Withdrawn", badgeTone: "default" },
};

export interface EnrichedSupportRequest extends ResearchSupportRequestRow {
  linked_milestone?: { id: string; title: string } | null;
  listing?: ResearchSupportListingRow | null;
  partners?: (ProjectSupportPartnerRow & {
    organization?: Pick<IndustryOrganizationRow, "id" | "name" | "organization_type" | "verification_status"> | null;
  })[];
  applications_count?: number;
}

export interface PublicMarketplaceListing {
  id: string;
  support_request_id: string;
  challenge_id: string;
  challenge_title: string;
  challenge_domain: string | null;
  institution_id: string;
  institution_name: string;
  institution_city: string | null;
  project_id: string;
  public_title: string;
  public_summary: string;
  category: SupportRequestCategory;
  public_specification: string | null;
  public_timeline: string | null;
  desired_outcome: string | null;
  status: ListingStatus;
  applications_count: number;
  published_at: string | null;
  expires_at: string | null;
}

/**
 * Verifies whether the specified project has an APPROVED proposal.
 * Invariant: Support requests and marketplace publication are strictly gated by this.
 */
export async function verifyProjectProposalApproved(projectId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("research_proposals")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "APPROVED")
    .limit(1);

  if (error) {
    console.error("Error verifying proposal approval gating:", error);
    return false;
  }

  return Boolean(data && data.length > 0);
}

/**
 * Fetches all research support requests for a specific university project.
 */
export async function fetchProjectSupportRequests(projectId: string): Promise<EnrichedSupportRequest[]> {
  const { data, error } = await supabase
    .from("research_support_requests")
    .select(`
      *,
      linked_milestone:research_project_milestones!research_support_requests_linked_milestone_id_fkey(id, title),
      listing:research_support_listings!research_support_listings_support_request_id_fkey(*),
      partners:project_support_partners!project_support_partners_support_request_id_fkey(
        *,
        organization:industry_organizations!project_support_partners_organization_id_fkey(id, name, organization_type, verification_status)
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project support requests:", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Creates a new research support request for an approved project.
 */
export async function createSupportRequest(input: {
  challengeId: string;
  institutionId: string;
  projectId: string;
  createdBy: string;
  category: SupportRequestCategory;
  title: string;
  description: string;
  priority?: SupportRequestPriority;
  specification?: string | null;
  quantityOrScope?: string | null;
  estimatedCost?: number | null;
  currency?: string;
  requiredByDate?: string | null;
  linkedMilestoneId?: string | null;
  confidentialityLevel?: SupportConfidentiality;
  autoPublish?: boolean;
}): Promise<ResearchSupportRequestRow> {
  // Invariant check: project MUST have an approved proposal
  const isApproved = await verifyProjectProposalApproved(input.projectId);
  if (!isApproved) {
    throw new Error("Cannot create support requests: Project proposal must be APPROVED by the Innovation Manager first.");
  }

  const initialStatus: SupportRequestStatus = input.autoPublish ? "PUBLISHED" : "DRAFT";

  const { data, error } = await supabase
    .from("research_support_requests")
    .insert({
      challenge_id: input.challengeId,
      institution_id: input.institutionId,
      project_id: input.projectId,
      created_by: input.createdBy,
      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority ?? "MEDIUM",
      specification: input.specification?.trim() || null,
      quantity_or_scope: input.quantityOrScope?.trim() || null,
      estimated_cost: input.estimatedCost ?? null,
      currency: input.currency ?? "INR",
      required_by_date: input.requiredByDate || null,
      linked_milestone_id: input.linkedMilestoneId || null,
      confidentiality_level: input.confidentialityLevel ?? "RESTRICTED",
      status: initialStatus,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error creating support request:", error);
    throw new Error(error?.message ?? "Failed to create support request");
  }

  // If autoPublish requested, create the public listing
  if (input.autoPublish) {
    await supabase.from("research_support_listings").insert({
      support_request_id: data.id,
      challenge_id: input.challengeId,
      institution_id: input.institutionId,
      project_id: input.projectId,
      public_title: input.title.trim(),
      public_summary: input.description.trim(),
      category: input.category,
      public_specification: input.specification?.trim() || null,
      public_timeline: input.requiredByDate ? `Required by ${new Date(input.requiredByDate).toLocaleDateString()}` : null,
      desired_outcome: input.quantityOrScope?.trim() || "Collaborative support for prototype testing and deployment.",
      status: "OPEN",
      published_by: input.createdBy,
      published_at: new Date().toISOString(),
    });
  }

  // Log project activity
  await logProjectActivity({
    projectId: input.projectId,
    actorProfileId: input.createdBy,
    activityType: input.autoPublish ? "SUPPORT_REQUEST_PUBLISHED" : "SUPPORT_REQUEST_CREATED",
    title: `Support Requirement ${input.autoPublish ? "Published" : "Created"}: ${input.title.trim()}`,
    description: `Category: ${SUPPORT_CATEGORY_META[input.category]?.label}. Priority: ${input.priority ?? "MEDIUM"}`,
    metadata: { requestId: data.id, category: input.category },
  });

  return data;
}

/**
 * Publishes an existing support request to the marketplace.
 */
export async function publishSupportRequest(input: {
  requestId: string;
  projectId: string;
  challengeId: string;
  institutionId: string;
  actorProfileId: string;
  publicTitle: string;
  publicSummary: string;
  category: SupportRequestCategory;
  publicSpecification?: string | null;
  publicTimeline?: string | null;
  desiredOutcome?: string | null;
}): Promise<ResearchSupportListingRow> {
  const isApproved = await verifyProjectProposalApproved(input.projectId);
  if (!isApproved) {
    throw new Error("Cannot publish support listing: Project proposal must be approved first.");
  }

  // Update request status to PUBLISHED
  const { error: updateReqErr } = await supabase
    .from("research_support_requests")
    .update({ status: "PUBLISHED" })
    .eq("id", input.requestId);

  if (updateReqErr) {
    console.error("Error updating support request status:", updateReqErr);
    throw new Error(updateReqErr.message);
  }

  // Upsert listing
  const { data: listing, error: listingErr } = await supabase
    .from("research_support_listings")
    .upsert(
      {
        support_request_id: input.requestId,
        challenge_id: input.challengeId,
        institution_id: input.institutionId,
        project_id: input.projectId,
        public_title: input.publicTitle.trim(),
        public_summary: input.publicSummary.trim(),
        category: input.category,
        public_specification: input.publicSpecification?.trim() || null,
        public_timeline: input.publicTimeline?.trim() || null,
        desired_outcome: input.desiredOutcome?.trim() || null,
        status: "OPEN",
        published_by: input.actorProfileId,
        published_at: new Date().toISOString(),
      },
      { onConflict: "support_request_id" }
    )
    .select()
    .single();

  if (listingErr || !listing) {
    console.error("Error upserting support listing:", listingErr);
    throw new Error(listingErr?.message ?? "Failed to publish listing");
  }

  // Log activity
  await logProjectActivity({
    projectId: input.projectId,
    actorProfileId: input.actorProfileId,
    activityType: "SUPPORT_REQUEST_PUBLISHED",
    title: `Published to Marketplace: ${input.publicTitle.trim()}`,
    description: `Listing is now open for verified industry organizations to offer support.`,
    metadata: { listingId: listing.id, requestId: input.requestId },
  });

  return listing;
}

/**
 * Updates an existing support request.
 */
export async function updateSupportRequest(
  requestId: string,
  updates: Partial<ResearchSupportRequestUpdate>
): Promise<void> {
  const { error } = await supabase
    .from("research_support_requests")
    .update(updates)
    .eq("id", requestId);

  if (error) {
    console.error("Error updating support request:", error);
    throw new Error(error.message);
  }
}

/**
 * Fetches all open marketplace listings with controlled disclosure.
 * Only non-confidential public summaries, challenge titles, and institution names are exposed.
 */
export async function fetchMarketplaceListings(filters?: {
  category?: SupportRequestCategory | "ALL";
  searchQuery?: string;
}): Promise<PublicMarketplaceListing[]> {
  let query = supabase
    .from("research_support_listings")
    .select(`
      id,
      support_request_id,
      challenge_id,
      institution_id,
      project_id,
      public_title,
      public_summary,
      category,
      public_specification,
      public_timeline,
      desired_outcome,
      status,
      applications_count,
      published_at,
      expires_at,
      challenge:challenges!research_support_listings_challenge_id_fkey(title, domain),
      institution:institutions!research_support_listings_institution_id_fkey(name, city)
    `)
    .eq("status", "OPEN")
    .order("published_at", { ascending: false });

  if (filters?.category && filters.category !== "ALL") {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching marketplace listings:", error);
    throw new Error(error.message);
  }

  // Flatten joined fields into sanitized public representation
  type RawListingItem = ResearchSupportListingRow & {
    challenge?: { title?: string; domain?: string | null } | null;
    institution?: { name?: string; city?: string | null } | null;
  };

  const rawListings = (data as unknown as RawListingItem[]) ?? [];

  const results: PublicMarketplaceListing[] = rawListings.map((item) => ({
    id: item.id,
    support_request_id: item.support_request_id,
    challenge_id: item.challenge_id,
    challenge_title: item.challenge?.title ?? "Civic Innovation Challenge",
    challenge_domain: item.challenge?.domain ?? null,
    institution_id: item.institution_id,
    institution_name: item.institution?.name ?? "Partner University",
    institution_city: item.institution?.city ?? null,
    project_id: item.project_id,
    public_title: item.public_title,
    public_summary: item.public_summary,
    category: item.category,
    public_specification: item.public_specification,
    public_timeline: item.public_timeline,
    desired_outcome: item.desired_outcome,
    status: item.status,
    applications_count: item.applications_count,
    published_at: item.published_at,
    expires_at: item.expires_at,
  }));

  if (filters?.searchQuery?.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    return results.filter(
      (l) =>
        l.public_title.toLowerCase().includes(q) ||
        l.public_summary.toLowerCase().includes(q) ||
        l.challenge_title.toLowerCase().includes(q) ||
        l.institution_name.toLowerCase().includes(q)
    );
  }

  return results;
}

/**
 * Fetches single listing details for the public / industry view.
 */
export async function fetchMarketplaceListingDetail(
  listingId: string,
  organizationId?: string | null
): Promise<{
  listing: PublicMarketplaceListing;
  hasApplied: boolean;
  existingApplication?: ResearchSupportApplicationRow | null;
}> {
  const { data, error } = await supabase
    .from("research_support_listings")
    .select(`
      id,
      support_request_id,
      challenge_id,
      institution_id,
      project_id,
      public_title,
      public_summary,
      category,
      public_specification,
      public_timeline,
      desired_outcome,
      status,
      applications_count,
      published_at,
      expires_at,
      challenge:challenges!research_support_listings_challenge_id_fkey(title, domain, description),
      institution:institutions!research_support_listings_institution_id_fkey(name, city, state, website)
    `)
    .eq("id", listingId)
    .single();

  if (error || !data) {
    console.error("Error fetching marketplace listing detail:", error);
    throw new Error(error?.message ?? "Listing not found");
  }

  type RawDetail = ResearchSupportListingRow & {
    challenge?: { title?: string; domain?: string | null; description?: string } | null;
    institution?: { name?: string; city?: string | null; state?: string | null; website?: string | null } | null;
  };

  const item = data as unknown as RawDetail;

  const listing: PublicMarketplaceListing = {
    id: item.id,
    support_request_id: item.support_request_id,
    challenge_id: item.challenge_id,
    challenge_title: item.challenge?.title ?? "Civic Innovation Challenge",
    challenge_domain: item.challenge?.domain ?? null,
    institution_id: item.institution_id,
    institution_name: item.institution?.name ?? "Partner University",
    institution_city: item.institution?.city ?? null,
    project_id: item.project_id,
    public_title: item.public_title,
    public_summary: item.public_summary,
    category: item.category,
    public_specification: item.public_specification,
    public_timeline: item.public_timeline,
    desired_outcome: item.desired_outcome,
    status: item.status,
    applications_count: item.applications_count,
    published_at: item.published_at,
    expires_at: item.expires_at,
  };

  let hasApplied = false;
  let existingApplication: ResearchSupportApplicationRow | null = null;

  if (organizationId) {
    const { data: appData } = await supabase
      .from("research_support_applications")
      .select("*")
      .eq("listing_id", listingId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (appData) {
      hasApplied = true;
      existingApplication = appData;
    }
  }

  return { listing, hasApplied, existingApplication };
}

/**
 * Submits an application by a verified industry organization to fulfill a listing.
 */
export async function submitSupportApplication(input: {
  listingId: string;
  organizationId: string;
  applicantProfileId: string;
  proposedContribution: string;
  capabilitiesSummary: string;
  estimatedValue?: number | null;
  timeline?: string | null;
  termsOrConditions?: string | null;
}): Promise<ResearchSupportApplicationRow> {
  // Check that the organization is verified
  const { data: org, error: orgErr } = await supabase
    .from("industry_organizations")
    .select("id, name, verification_status")
    .eq("id", input.organizationId)
    .single();

  if (orgErr || !org) {
    throw new Error("Organization not found.");
  }

  if (org.verification_status !== "VERIFIED") {
    throw new Error(`Your organization cannot submit applications yet. Current status: ${org.verification_status}. Contact the civic administrator for verification.`);
  }

  // Fetch listing to know the project_id for activity logging
  const { data: listing, error: listErr } = await supabase
    .from("research_support_listings")
    .select("id, project_id, public_title")
    .eq("id", input.listingId)
    .single();

  if (listErr || !listing) {
    throw new Error("Target listing not found.");
  }

  const { data, error } = await supabase
    .from("research_support_applications")
    .insert({
      listing_id: input.listingId,
      organization_id: input.organizationId,
      applicant_profile_id: input.applicantProfileId,
      proposed_contribution: input.proposedContribution.trim(),
      capabilities_summary: input.capabilitiesSummary.trim(),
      estimated_value: input.estimatedValue ?? null,
      timeline: input.timeline?.trim() || null,
      terms_or_conditions: input.termsOrConditions?.trim() || null,
      status: "SUBMITTED",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error submitting support application:", error);
    throw new Error(error?.message ?? "Failed to submit application");
  }

  // Log activity
  await logProjectActivity({
    projectId: listing.project_id,
    actorProfileId: input.applicantProfileId,
    activityType: "SUPPORT_APPLICATION_SUBMITTED",
    title: `Support Application Received from ${org.name}`,
    description: `Offered support for listing "${listing.public_title}".`,
    metadata: { applicationId: data.id, listingId: listing.id, organizationId: org.id },
  });

  return data;
}

export interface EnrichedApplication extends ResearchSupportApplicationRow {
  organization: IndustryOrganizationRow;
  applicant?: { id: string; full_name: string; email: string | null } | null;
}

/**
 * Fetches applications submitted for a specific listing (for university & manager review).
 */
export async function fetchListingApplications(listingId: string): Promise<EnrichedApplication[]> {
  const { data, error } = await supabase
    .from("research_support_applications")
    .select(`
      *,
      organization:industry_organizations!research_support_applications_organization_id_fkey(*),
      applicant:profiles!research_support_applications_applicant_profile_id_fkey(id, full_name, email)
    `)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching listing applications:", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Updates application status to UNDER_REVIEW with clarification notes.
 */
export async function requestApplicationClarification(
  applicationId: string,
  notes: string,
  reviewerProfileId: string
): Promise<void> {
  const { data: app, error: fetchErr } = await supabase
    .from("research_support_applications")
    .select("*, listing:research_support_listings(project_id)")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !app) {
    throw new Error("Application not found.");
  }

  const { error } = await supabase
    .from("research_support_applications")
    .update({
      status: "UNDER_REVIEW",
      review_notes: notes.trim(),
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    console.error("Error updating application notes:", error);
    throw new Error(error.message);
  }

  const listingProjId = (app.listing as { project_id?: string } | null)?.project_id;
  if (listingProjId) {
    await logProjectActivity({
      projectId: listingProjId,
      actorProfileId: reviewerProfileId,
      activityType: "SUPPORT_APPLICATION_REVIEWED",
      title: `Clarification Requested for Support Candidate`,
      description: `Notes: ${notes.slice(0, 120)}...`,
      metadata: { applicationId },
    });
  }
}

/**
 * Accepts an application, creating a project_support_partners record with SUPPORT_SPECIFIC access.
 */
export async function acceptSupportApplication(input: {
  applicationId: string;
  reviewerProfileId: string;
  agreementNotes: string;
}): Promise<ProjectSupportPartnerRow> {
  // Fetch application, listing, and support request
  const { data: app, error: appErr } = await supabase
    .from("research_support_applications")
    .select(`
      *,
      listing:research_support_listings!research_support_applications_listing_id_fkey(
        id,
        project_id,
        support_request_id,
        category,
        public_title
      ),
      organization:industry_organizations!research_support_applications_organization_id_fkey(id, name)
    `)
    .eq("id", input.applicationId)
    .single();

  if (appErr || !app || !app.listing) {
    throw new Error("Application or associated listing not found.");
  }

  type JoinedApp = typeof app & {
    listing: { id: string; project_id: string; support_request_id: string; category: SupportRequestCategory; public_title: string };
    organization: { id: string; name: string };
  };

  const typedApp = app as unknown as JoinedApp;

  // 1. Mark application as ACCEPTED
  const { error: updateAppErr } = await supabase
    .from("research_support_applications")
    .update({
      status: "ACCEPTED",
      reviewed_by: input.reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      acceptance_agreement_notes: input.agreementNotes.trim(),
    })
    .eq("id", input.applicationId);

  if (updateAppErr) {
    throw new Error(updateAppErr.message);
  }

  // 2. Create project_support_partners record
  const { data: partner, error: partnerErr } = await supabase
    .from("project_support_partners")
    .insert({
      project_id: typedApp.listing.project_id,
      support_request_id: typedApp.listing.support_request_id,
      listing_id: typedApp.listing.id,
      application_id: input.applicationId,
      organization_id: typedApp.organization_id,
      category: typedApp.listing.category,
      access_scope: "SUPPORT_SPECIFIC",
      contribution_summary: typedApp.proposed_contribution,
      status: "ACTIVE",
      notes: input.agreementNotes.trim(),
    })
    .select()
    .single();

  if (partnerErr || !partner) {
    console.error("Error creating project support partner:", partnerErr);
    throw new Error(partnerErr?.message ?? "Failed to create partner link");
  }

  // 3. Mark the parent support request as IN_PROGRESS
  await supabase
    .from("research_support_requests")
    .update({ status: "IN_PROGRESS" })
    .eq("id", typedApp.listing.support_request_id);

  // 4. Log project activity
  await logProjectActivity({
    projectId: typedApp.listing.project_id,
    actorProfileId: input.reviewerProfileId,
    activityType: "SUPPORT_APPLICATION_ACCEPTED",
    title: `Industry Partner Accepted: ${typedApp.organization.name}`,
    description: `Partner will provide ${SUPPORT_CATEGORY_META[typedApp.listing.category]?.label} for "${typedApp.listing.public_title}".`,
    metadata: {
      partnerId: partner.id,
      organizationId: typedApp.organization_id,
      applicationId: input.applicationId,
    },
  });

  await logProjectActivity({
    projectId: typedApp.listing.project_id,
    actorProfileId: input.reviewerProfileId,
    activityType: "SUPPORT_PARTNER_SELECTED",
    title: `Active Support Partner Onboarded`,
    description: `Access scope: SUPPORT_SPECIFIC. Research team will coordinate on contribution deliverables.`,
    metadata: { partnerId: partner.id },
  });

  return partner;
}

/**
 * Rejects an application with reason.
 */
export async function rejectSupportApplication(input: {
  applicationId: string;
  reviewerProfileId: string;
  rejectionReason: string;
}): Promise<void> {
  const { data: app, error: fetchErr } = await supabase
    .from("research_support_applications")
    .select("id, listing:research_support_listings(project_id)")
    .eq("id", input.applicationId)
    .single();

  if (fetchErr || !app) {
    throw new Error("Application not found.");
  }

  const { error } = await supabase
    .from("research_support_applications")
    .update({
      status: "REJECTED",
      rejection_reason: input.rejectionReason.trim(),
      reviewed_by: input.reviewerProfileId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.applicationId);

  if (error) {
    throw new Error(error.message);
  }

  const projId = (app.listing as { project_id?: string } | null)?.project_id;
  if (projId) {
    await logProjectActivity({
      projectId: projId,
      actorProfileId: input.reviewerProfileId,
      activityType: "SUPPORT_APPLICATION_REJECTED",
      title: `Support Application Declined`,
      description: `Application was not selected for this requirement.`,
      metadata: { applicationId: input.applicationId },
    });
  }
}

/**
 * Fetches applications submitted by a specific organization (Industry Partner view).
 */
export async function fetchOrganizationApplications(organizationId: string) {
  const { data, error } = await supabase
    .from("research_support_applications")
    .select(`
      *,
      listing:research_support_listings!research_support_applications_listing_id_fkey(
        id,
        public_title,
        category,
        public_timeline,
        desired_outcome,
        status,
        challenge:challenges!research_support_listings_challenge_id_fkey(title),
        institution:institutions!research_support_listings_institution_id_fkey(name, city)
      )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching organization applications:", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Fetches active partnerships for an organization.
 */
export async function fetchOrganizationPartnerships(organizationId: string) {
  const { data, error } = await supabase
    .from("project_support_partners")
    .select(`
      *,
      project:challenge_projects!project_support_partners_project_id_fkey(
        id,
        title,
        status,
        challenge:challenges!challenge_projects_challenge_id_fkey(title),
        institution:institutions!challenge_projects_institution_id_fkey(name)
      ),
      listing:research_support_listings!project_support_partners_listing_id_fkey(public_title, category)
    `)
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Error fetching organization partnerships:", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Fetches Innovation Marketplace Overview (KPIs and directory for Innovation Manager).
 */
export async function fetchInnovationMarketplaceOverview() {
  const [requestsRes, listingsRes, appsRes, partnersRes, orgsRes] = await Promise.all([
    supabase
      .from("research_support_requests")
      .select(`
        *,
        institution:institutions!research_support_requests_institution_id_fkey(name, city),
        challenge:challenges!research_support_requests_challenge_id_fkey(title),
        project:challenge_projects!research_support_requests_project_id_fkey(title)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("research_support_listings").select("id, status, category, applications_count"),
    supabase.from("research_support_applications").select("id, status"),
    supabase.from("project_support_partners").select("id, status, category"),
    supabase.from("industry_organizations").select("id, name, organization_type, verification_status"),
  ]);

  const requests = requestsRes.data ?? [];
  const listings = listingsRes.data ?? [];
  const apps = appsRes.data ?? [];
  const partners = partnersRes.data ?? [];
  const orgs = orgsRes.data ?? [];

  const metrics = {
    totalRequests: requests.length,
    publishedListings: listings.filter((l) => l.status === "OPEN").length,
    totalApplications: apps.length,
    activePartnerships: partners.filter((p) => p.status === "ACTIVE").length,
    verifiedOrganizations: orgs.filter((o) => o.verification_status === "VERIFIED").length,
    pendingOrganizations: orgs.filter((o) => o.verification_status === "PENDING").length,
  };

  return {
    metrics,
    requests,
    listings,
    partners,
    organizations: orgs,
  };
}

/**
 * Fetches organization details for a given organization ID.
 */
export async function fetchIndustryOrganizationProfile(organizationId: string): Promise<IndustryOrganizationRow | null> {
  const { data, error } = await supabase
    .from("industry_organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching organization profile:", error);
    return null;
  }

  return data;
}

/**
 * Internal helper to log project activity.
 */
async function logProjectActivity(input: {
  projectId: string;
  actorProfileId: string;
  activityType: ProjectActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from("challenge_project_activity").insert({
      project_id: input.projectId,
      actor_profile_id: input.actorProfileId,
      activity_type: input.activityType,
      description: `${input.title} — ${input.description}`,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : {},
    });
  } catch (err) {
    console.warn("Could not log project activity:", err);
  }
}
