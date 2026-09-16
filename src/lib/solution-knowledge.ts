import { supabase } from "@/lib/supabase";
import type {
  Database,
  SimpleSolutionKnowledgeBaseRow,
  SimpleSolutionKnowledgeBaseInsert,
  ComplexSolutionKnowledgeBaseRow,
  ComplexSolutionKnowledgeBaseInsert,
  ComplexSolutionKnowledgeBaseUpdate,
  SimpleIssueRecurrencePatternRow,
  PreventiveRecommendationRow,
  PreventiveRecommendationStatus,
  ComplexSolutionReuseReviewRow,
  ComplexSolutionReuseDecision,
  SolutionMatchScorecard,
  SolutionMatchResult,
} from "@/types/database";

export type {
  SimpleSolutionKnowledgeBaseRow,
  ComplexSolutionKnowledgeBaseRow,
  SimpleIssueRecurrencePatternRow,
  PreventiveRecommendationRow,
  PreventiveRecommendationStatus,
  ComplexSolutionReuseReviewRow,
  ComplexSolutionReuseDecision,
  SolutionMatchScorecard,
  SolutionMatchResult,
};

// =======================================================================
// SIMPLE SOLUTION KNOWLEDGE BASE SERVICES
// =======================================================================

export async function fetchSimpleSolutions(filters?: {
  category?: string;
  area?: string;
  search?: string;
  limit?: number;
}): Promise<SimpleSolutionKnowledgeBaseRow[]> {
  try {
    let query = supabase
      .from("simple_solution_knowledge_base")
      .select("*")
      .order("closed_at", { ascending: false });

    if (filters?.category && filters.category !== "ALL") {
      query = query.eq("category", filters.category);
    }

    if (filters?.area && filters.area !== "ALL") {
      query = query.ilike("area_name", `%${filters.area}%`);
    }

    if (filters?.search) {
      const term = filters.search.trim();
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,identified_root_cause.ilike.%${term}%,resolution_summary.ilike.%${term}%,area_name.ilike.%${term}%`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching simple solutions:", err);
    throw err;
  }
}

export async function fetchSimpleSolutionById(
  id: string
): Promise<SimpleSolutionKnowledgeBaseRow | null> {
  try {
    const { data, error } = await supabase
      .from("simple_solution_knowledge_base")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching simple solution by ID:", err);
    throw err;
  }
}

export async function fetchSimpleSolutionByIssueId(
  issueId: string
): Promise<SimpleSolutionKnowledgeBaseRow | null> {
  try {
    const { data, error } = await supabase
      .from("simple_solution_knowledge_base")
      .select("*")
      .eq("source_issue_id", issueId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching simple solution by issue ID:", err);
    throw err;
  }
}

// =======================================================================
// RECURRENCE PATTERNS & PREVENTIVE RECOMMENDATIONS
// =======================================================================

export async function fetchRecurrencePatterns(filters?: {
  area?: string;
  category?: string;
  status?: string;
}): Promise<SimpleIssueRecurrencePatternRow[]> {
  try {
    let query = supabase
      .from("simple_issue_recurrence_patterns")
      .select("*")
      .order("occurrence_count", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status as any);
    }
    if (filters?.category && filters.category !== "ALL") {
      query = query.eq("category", filters.category);
    }
    if (filters?.area && filters.area !== "ALL") {
      query = query.ilike("area_name", `%${filters.area}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching recurrence patterns:", err);
    throw err;
  }
}

export async function fetchPreventiveRecommendations(filters?: {
  departmentId?: string;
  status?: string;
  search?: string;
}): Promise<PreventiveRecommendationRow[]> {
  try {
    let query = supabase
      .from("preventive_recommendations")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.departmentId && filters.departmentId !== "ALL") {
      query = query.eq("department_id", filters.departmentId);
    }
    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status as any);
    }
    if (filters?.search) {
      const term = filters.search.trim();
      query = query.or(
        `title.ilike.%${term}%,area_name.ilike.%${term}%,recommended_action.ilike.%${term}%,justification.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching preventive recommendations:", err);
    throw err;
  }
}

export async function reviewPreventiveRecommendation(params: {
  recommendationId: string;
  status: PreventiveRecommendationStatus;
  reviewerProfileId: string;
  reviewNotes?: string;
}): Promise<PreventiveRecommendationRow> {
  try {
    const { data, error } = await supabase
      .from("preventive_recommendations")
      .update({
        status: params.status,
        reviewed_by: params.reviewerProfileId,
        reviewed_at: new Date().toISOString(),
        review_notes: params.reviewNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.recommendationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error reviewing preventive recommendation:", err);
    throw err;
  }
}

export async function fetchHistoricalIssuesForRecommendation(
  issueIds: string[]
): Promise<Array<{
  id: string;
  title: string;
  category: string;
  status: string;
  location_text: string | null;
  address_text: string | null;
  created_at: string;
  resolved_at: string | null;
  before_image: string | null;
  after_image: string | null;
}>> {
  if (!issueIds || issueIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("issues")
      .select(`
        id,
        title,
        category,
        status,
        location_text,
        address_text,
        created_at,
        resolved_at,
        issue_images (
          storage_path,
          image_type
        )
      `)
      .in("id", issueIds);

    if (error) throw error;

    return (data || []).map((issue: any) => {
      const images = issue.issue_images || [];
      const beforeImg = images.find((img: any) => img.image_type === "INITIAL_REPORT");
      const afterImg = images.find((img: any) => img.image_type === "RESOLUTION_EVIDENCE");

      return {
        id: issue.id,
        title: issue.title,
        category: issue.category,
        status: issue.status,
        location_text: issue.location_text,
        address_text: issue.address_text,
        created_at: issue.created_at,
        resolved_at: issue.resolved_at,
        before_image: beforeImg?.storage_path || null,
        after_image: afterImg?.storage_path || null,
      };
    });
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching historical issues for recommendation:", err);
    throw err;
  }
}

// =======================================================================
// COMPLEX SOLUTION KNOWLEDGE BASE SERVICES
// =======================================================================

export async function fetchComplexSolutions(filters?: {
  category?: string;
  reusability?: string;
  search?: string;
  limit?: number;
}): Promise<ComplexSolutionKnowledgeBaseRow[]> {
  try {
    let query = supabase
      .from("complex_solution_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.category && filters.category !== "ALL") {
      query = query.eq("problem_category", filters.category);
    }

    if (filters?.reusability && filters.reusability !== "ALL") {
      query = query.eq("reusability_status", filters.reusability as any);
    }

    if (filters?.search) {
      const term = filters.search.trim();
      query = query.or(
        `problem_title.ilike.%${term}%,problem_statement.ilike.%${term}%,solution_title.ilike.%${term}%,solution_summary.ilike.%${term}%,university_name.ilike.%${term}%`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching complex solutions:", err);
    throw err;
  }
}

export async function fetchComplexSolutionById(
  id: string
): Promise<ComplexSolutionKnowledgeBaseRow | null> {
  try {
    const { data, error } = await supabase
      .from("complex_solution_knowledge_base")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching complex solution by ID:", err);
    throw err;
  }
}

export async function fetchComplexSolutionByProjectId(
  projectId: string
): Promise<ComplexSolutionKnowledgeBaseRow | null> {
  try {
    const { data, error } = await supabase
      .from("complex_solution_knowledge_base")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching complex solution by project ID:", err);
    throw err;
  }
}

// =======================================================================
// SEMANTIC & STRUCTURED EXISTING SOLUTION MATCHING ENGINE
// =======================================================================

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const words1 = new Set(
    text1.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3)
  );
  const words2 = new Set(
    text2.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let common = 0;
  words1.forEach((w) => {
    if (words2.has(w)) common++;
  });

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : common / union;
}

export async function findExistingSolutionMatches(
  challengeId: string
): Promise<SolutionMatchResult[]> {
  try {
    // 1. Fetch the target challenge details
    const { data: challenge, error: chErr } = await supabase
      .from("innovation_challenges")
      .select(`
        id,
        title,
        problem_statement,
        category,
        problem_category,
        root_cause,
        required_domains,
        potential_technology_areas,
        affected_population,
        geographic_scope
      `)
      .eq("id", challengeId)
      .single();

    if (chErr) throw chErr;
    if (!challenge) return [];

    // 2. Fetch all active/eligible reusable complex solutions
    const { data: solutions, error: solErr } = await supabase
      .from("complex_solution_knowledge_base")
      .select("*")
      .in("reusability_status", ["ACTIVE_REUSABLE", "ELIGIBLE", "NEEDS_ADAPTATION"]);

    if (solErr) throw solErr;
    if (!solutions || solutions.length === 0) return [];

    const results: SolutionMatchResult[] = [];

    const chProblem = challenge.problem_statement || "";
    const chCategory = (challenge.problem_category || challenge.category || "").toLowerCase();
    const chRootCause = challenge.root_cause || "";
    const chDomains = (challenge.required_domains || []).map((d: string) => d.toLowerCase());
    const chTechs = (challenge.potential_technology_areas || []).map((t: string) => t.toLowerCase());

    for (const sol of solutions) {
      // Dimension 1: Semantic Relevance
      const textSim = calculateTextSimilarity(
        `${challenge.title} ${chProblem}`,
        `${sol.problem_title} ${sol.problem_statement} ${sol.solution_summary}`
      );
      const catMatch =
        sol.problem_category.toLowerCase() === chCategory ||
        (sol.applicable_categories || []).some((c: string) => c.toLowerCase() === chCategory);

      let semanticScore: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (textSim > 0.25 || (catMatch && textSim > 0.15)) {
        semanticScore = "HIGH";
      } else if (textSim > 0.1 || catMatch) {
        semanticScore = "MEDIUM";
      }

      // Dimension 2: Root Cause Compatibility
      const rootSim = calculateTextSimilarity(chRootCause, sol.root_cause || "");
      let rootCauseScore: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (rootSim > 0.2) {
        rootCauseScore = "HIGH";
      } else if (rootSim > 0.08 || (chRootCause && sol.root_cause && catMatch)) {
        rootCauseScore = "MEDIUM";
      }

      // Dimension 3: Technology Compatibility
      const solTechs = (sol.technologies_used || []).map((t: string) => t.toLowerCase());
      const commonTechs = solTechs.filter((t: string) =>
        chTechs.some((ct: string) => ct.includes(t) || t.includes(ct))
      );
      let techScore: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (commonTechs.length >= 2) {
        techScore = "HIGH";
      } else if (commonTechs.length === 1 || solTechs.length > 0) {
        techScore = "MEDIUM";
      }

      // Dimension 4: Deployment & Operational Compatibility
      let deployScore: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      if (sol.final_validation_outcome === "MEETS_SUCCESS_CRITERIA" && sol.reusability_status === "ACTIVE_REUSABLE") {
        deployScore = "HIGH";
      } else if (sol.reusability_status === "NEEDS_ADAPTATION") {
        deployScore = "MEDIUM";
      } else {
        deployScore = "LOW";
      }

      // Overall Applicability Computation
      const highCount = [semanticScore, rootCauseScore, techScore, deployScore].filter((s) => s === "HIGH").length;
      const medCount = [semanticScore, rootCauseScore, techScore, deployScore].filter((s) => s === "MEDIUM").length;

      let overallApplicability: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (highCount >= 2 && semanticScore !== "LOW") {
        overallApplicability = "HIGH";
      } else if (highCount >= 1 || medCount >= 2) {
        overallApplicability = "MEDIUM";
      }

      // Strengths & Adaptations
      const strengths: string[] = [];
      if (catMatch) strengths.push(`Exact problem category alignment (${sol.problem_category})`);
      if (commonTechs.length > 0) strengths.push(`Overlapping technological stack (${commonTechs.join(", ")})`);
      if (sol.final_validation_outcome === "MEETS_SUCCESS_CRITERIA") {
        strengths.push("Previously validated with confirmed positive KPI outcomes");
      }
      if (sol.reuse_count > 0) strengths.push(`Successfully adapted and reused across ${sol.reuse_count} other civic deployments`);

      const limitations: string[] = [];
      if (sol.known_limitations) limitations.push(sol.known_limitations);
      if (sol.environmental_constraints) limitations.push(`Environmental constraints: ${sol.environmental_constraints}`);

      const adaptationReqs: string[] = [];
      if (sol.adaptation_requirements) adaptationReqs.push(sol.adaptation_requirements);
      if (challenge.geographic_scope && sol.geographic_context && challenge.geographic_scope !== sol.geographic_context) {
        adaptationReqs.push(`Geographic calibration required for target region: ${challenge.geographic_scope}`);
      }

      const reasoning = `Solution developed by ${sol.university_name} addresses ${sol.problem_title}. Semantic match: ${semanticScore}, Root cause alignment: ${rootCauseScore}, Tech stack compatibility: ${techScore}.`;

      // Filter out pure noise (only include candidates with at least medium applicability or relevant semantic score)
      if (overallApplicability !== "LOW" || semanticScore !== "LOW") {
        results.push({
          solution: sol,
          scorecard: {
            semantic_relevance: semanticScore,
            root_cause_compatibility: rootCauseScore,
            technology_compatibility: techScore,
            deployment_compatibility: deployScore,
            overall_applicability: overallApplicability,
            key_strengths: strengths.length > 0 ? strengths : ["Historical civic innovation baseline available"],
            known_limitations: limitations.length > 0 ? limitations : ["Standard localized deployment testing required"],
            adaptation_requirements: adaptationReqs.length > 0 ? adaptationReqs : ["Localized configuration and parameter tuning"],
            reasoning,
          },
        });
      }
    }

    // Sort by overall applicability (HIGH > MEDIUM > LOW)
    results.sort((a, b) => {
      const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return rank[b.scorecard.overall_applicability] - rank[a.scorecard.overall_applicability];
    });

    return results;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error finding existing solution matches:", err);
    throw err;
  }
}

// =======================================================================
// SOLUTION REUSE REVIEWS
// =======================================================================

export async function recordSolutionReuseReview(params: {
  challengeId: string;
  solutionKbId: string;
  decision: ComplexSolutionReuseDecision;
  matchScores: SolutionMatchScorecard;
  reviewNotes: string;
  decisionByProfileId: string;
}): Promise<ComplexSolutionReuseReviewRow> {
  try {
    const { data, error } = await supabase
      .from("complex_solution_reuse_reviews")
      .insert({
        challenge_id: params.challengeId,
        solution_kb_id: params.solutionKbId,
        decision: params.decision,
        match_scores: params.matchScores as any,
        review_notes: params.reviewNotes.trim(),
        decision_by: params.decisionByProfileId,
      })
      .select()
      .single();

    if (error) throw error;

    // Log to challenge activity
    const { data: proj } = await supabase
      .from("challenge_projects")
      .select("id")
      .eq("challenge_id", params.challengeId)
      .maybeSingle();

    if (proj?.id) {
      await supabase.from("challenge_project_activity").insert({
        project_id: proj.id,
        actor_profile_id: params.decisionByProfileId,
        activity_type:
          params.decision === "REUSE"
            ? "SOLUTION_REUSE_APPROVED"
            : params.decision === "ADAPT"
              ? "SOLUTION_ADAPTATION_REQUESTED"
              : "SOLUTION_REUSE_REVIEWED",
        description: `Innovation Manager reviewed existing solution: Decision recorded as ${params.decision}.`,
        metadata: {
          solution_kb_id: params.solutionKbId,
          decision: params.decision,
          review_notes: params.reviewNotes,
        },
      });
    }

    return data;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error recording solution reuse review:", err);
    throw err;
  }
}

export async function fetchSolutionReuseReviewsForChallenge(
  challengeId: string
): Promise<ComplexSolutionReuseReviewRow[]> {
  try {
    const { data, error } = await supabase
      .from("complex_solution_reuse_reviews")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("decided_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error fetching reuse reviews:", err);
    throw err;
  }
}

// =======================================================================
// AUTHORITATIVE COMPLEX SOLUTION PUBLISHING
// =======================================================================

export async function publishComplexSolutionFromProject(
  projectId: string,
  overrides?: Partial<ComplexSolutionKnowledgeBaseInsert>
): Promise<ComplexSolutionKnowledgeBaseRow> {
  try {
    // 1. Fetch project and related challenge, institution, proposals
    const { data: project, error: pErr } = await supabase
      .from("challenge_projects")
      .select(`
        id,
        challenge_id,
        institution_id,
        project_title,
        project_summary,
        status,
        research_stage,
        challenge:innovation_challenges (
          id,
          source_issue_id,
          title,
          problem_statement,
          category,
          problem_category,
          root_cause,
          affected_population,
          geographic_scope,
          required_domains,
          potential_technology_areas
        ),
        institution:institutions (
          id,
          name,
          institution_type,
          city,
          state
        )
      `)
      .eq("id", projectId)
      .single();

    if (pErr) throw pErr;
    if (!project) throw new Error("Challenge project not found");

    // 2. Fetch validated results
    const { data: validation, error: vErr } = await supabase
      .from("pilot_validation_results")
      .select(`
        id,
        pilot_plan_id,
        status,
        final_outcome,
        overall_summary,
        pilot_validation_kpi_results (*)
      `)
      .eq("project_id", projectId)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vErr) throw vErr;
    if (!validation) {
      throw new Error("Cannot publish solution knowledge: Project must have an APPROVED pilot validation result.");
    }

    // 3. Fetch deployment plan if any
    const { data: deployment } = await supabase
      .from("deployment_plans")
      .select("id, summary, target_geography, technical_readiness, operational_readiness")
      .eq("project_id", projectId)
      .maybeSingle();

    // 4. Fetch approved proposal for methodology & tech details
    const { data: proposal } = await supabase
      .from("research_proposals")
      .select("project_objective, proposed_methodology, technical_approach")
      .eq("project_id", projectId)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const challenge = project.challenge as any;
    const institution = project.institution as any;

    const payload: ComplexSolutionKnowledgeBaseInsert = {
      challenge_id: project.challenge_id,
      project_id: project.id,
      institution_id: project.institution_id,
      source_issue_id: challenge?.source_issue_id || null,
      problem_title: challenge?.title || project.project_title,
      problem_statement: challenge?.problem_statement || project.project_summary || "Complex Civic Innovation Challenge",
      problem_category: challenge?.problem_category || challenge?.category || "General Civic Innovation",
      root_cause: challenge?.root_cause || null,
      affected_population: challenge?.affected_population || null,
      geographic_context: challenge?.geographic_scope || null,
      university_name: institution?.name || "Partner University",
      research_objective: proposal?.project_objective || null,
      methodology: proposal?.proposed_methodology || null,
      technical_approach: proposal?.technical_approach || null,
      solution_title: project.project_title,
      solution_summary: project.project_summary || "Validated Civic Innovation Solution",
      technologies_used: challenge?.potential_technology_areas || [],
      required_infrastructure: [],
      required_expertise: [],
      pilot_plan_id: validation.pilot_plan_id,
      validation_result_id: validation.id,
      validation_kpis_summary: (validation.pilot_validation_kpi_results as any) || [],
      final_validation_outcome: validation.final_outcome,
      deployment_plan_id: deployment?.id || null,
      deployment_impact_summary: deployment?.summary || null,
      applicable_categories: challenge?.problem_category ? [challenge.problem_category] : challenge?.category ? [challenge.category] : [],
      environmental_constraints: null,
      known_limitations: null,
      adaptation_requirements: "Requires local sensor calibration and municipal protocol configuration.",
      reusability_status: "ACTIVE_REUSABLE",
      evidence_links: [],
      reuse_count: 0,
      ...overrides,
    };

    const { data: createdKb, error: insErr } = await supabase
      .from("complex_solution_knowledge_base")
      .upsert(payload, { onConflict: "project_id" })
      .select()
      .single();

    if (insErr) throw insErr;
    return createdKb;
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error publishing complex solution:", err);
    throw err;
  }
}
