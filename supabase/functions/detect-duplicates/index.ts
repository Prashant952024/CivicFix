/// <reference path="../deno.d.ts" />

import { createClient } from "npm:@supabase/supabase-js";

// ==========================================
// 1. CONFIGURABLE CONSTANTS
// ==========================================
export const DUPLICATE_CONFIG = {
  DISTANCE_METERS_THRESHOLD: 100, // Maximum distance in meters for full GPS proximity score
  TIME_WINDOW_DAYS: 30, // Historical lookback window in days
  HIGH_CONFIDENCE_THRESHOLD: 0.80, // Score >= 80%
  MEDIUM_CONFIDENCE_THRESHOLD: 0.60, // Score 60% - 79%
  LOW_CONFIDENCE_THRESHOLD: 0.40, // Score 40% - 59%
  MIN_PERSIST_SCORE: 0.40, // Discard matches below 40%
  WEIGHTS: {
    GPS_PROXIMITY: 0.35,
    CATEGORY_MATCH: 0.25,
    TEXT_SIMILARITY: 0.25,
    TIME_PROXIMITY: 0.15,
  },
} as const;

type DetectDuplicatesRequestBody = {
  issue_id?: string;
  issueId?: string;
};

type IssueRecord = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  location_text: string | null;
  address_text: string | null;
  status: string;
  created_at: string;
};

type CandidateMatch = {
  candidateIssueId: string;
  candidateTitle: string;
  candidateCategory: string | null;
  candidateStatus: string;
  distanceMeters: number | null;
  categoryMatchScore: number;
  timeDiffDays: number;
  textSimilarityScore: number;
  totalScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  signals: string[];
};

function json(status: number, body: Record<string, unknown>, origin: string | null = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
    },
  });
}

// ==========================================
// 2. SIGNAL ALGORITHMS
// ==========================================

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Signal A: GPS Proximity Score (0.0 to 1.0)
 */
export function computeGpsProximityScore(
  targetLat: number | null,
  targetLon: number | null,
  candidateLat: number | null,
  candidateLon: number | null,
): { score: number; distanceMeters: number | null } {
  if (
    targetLat == null ||
    targetLon == null ||
    candidateLat == null ||
    candidateLon == null ||
    isNaN(targetLat) ||
    isNaN(targetLon) ||
    isNaN(candidateLat) ||
    isNaN(candidateLon)
  ) {
    return { score: 0.2, distanceMeters: null };
  }

  const distanceMeters = calculateHaversineDistanceMeters(targetLat, targetLon, candidateLat, candidateLon);
  const threshold = DUPLICATE_CONFIG.DISTANCE_METERS_THRESHOLD;

  if (distanceMeters <= 0) {
    return { score: 1.0, distanceMeters: 0 };
  }

  if (distanceMeters <= 50) {
    // Smooth high score for close proximity (0m -> 1.0, 50m -> 0.72)
    const score = 1.0 - 0.28 * (distanceMeters / 50);
    return { score: Math.round(score * 1000) / 1000, distanceMeters };
  }

  if (distanceMeters <= threshold) {
    // Decay from 0.72 to 0.15 between 50m and 100m
    const score = 0.72 - 0.57 * ((distanceMeters - 50) / 50);
    return { score: Math.round(score * 1000) / 1000, distanceMeters };
  }

  // Rapid decay if slightly beyond threshold up to 250m
  if (distanceMeters <= 250) {
    const extra = (distanceMeters - threshold) / 150;
    const score = Math.max(0, 0.12 * (1 - extra));
    return { score: Math.round(score * 1000) / 1000, distanceMeters };
  }

  return { score: 0.0, distanceMeters };
}

/**
 * Signal B: Category Similarity Score (0.0 to 1.0)
 */
const RELATED_CATEGORY_GROUPS: string[][] = [
  ["Pothole", "Road Damage", "Traffic/Safety"],
  ["Drainage", "Water Supply", "Stormwater"],
  ["Streetlight", "Electrical", "Public Safety"],
  ["Garbage", "Sanitation", "Solid Waste"],
  ["Parks/Gardens", "Environment"],
];

export function computeCategorySimilarity(
  categoryA: string | null,
  categoryB: string | null,
): number {
  if (!categoryA || !categoryB) return 0.3;
  const cleanA = categoryA.trim().toLowerCase();
  const cleanB = categoryB.trim().toLowerCase();

  if (cleanA === cleanB) {
    return 1.0;
  }

  for (const group of RELATED_CATEGORY_GROUPS) {
    const lowerGroup = group.map((c) => c.toLowerCase());
    if (lowerGroup.includes(cleanA) && lowerGroup.includes(cleanB)) {
      return 0.65;
    }
  }

  return 0.0;
}

/**
 * Signal C: Time Proximity Score (0.0 to 1.0)
 */
export function computeTimeProximityScore(
  targetCreatedAt: string,
  candidateCreatedAt: string,
): { score: number; daysDiff: number } {
  const t1 = new Date(targetCreatedAt).getTime();
  const t2 = new Date(candidateCreatedAt).getTime();
  const diffMs = Math.abs(t1 - t2);
  const daysDiff = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10);

  if (daysDiff <= 1) return { score: 1.0, daysDiff };
  if (daysDiff <= 3) return { score: 0.9, daysDiff };
  if (daysDiff <= 7) return { score: 0.75, daysDiff };
  if (daysDiff <= 14) return { score: 0.5, daysDiff };
  if (daysDiff <= DUPLICATE_CONFIG.TIME_WINDOW_DAYS) return { score: 0.25, daysDiff };
  return { score: 0.0, daysDiff };
}

/**
 * Signal D: Description & Title Text Similarity (0.0 to 1.0)
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "of", "at", "by", "for", "with",
  "about", "against", "between", "into", "through", "during", "before", "after", "above",
  "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "this", "that", "there", "here", "issue", "problem", "please", "fix", "help", "near",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function getCharacterBigrams(str: string): Set<string> {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bigrams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.slice(i, i + 2));
  }
  return bigrams;
}

function diceBigramSimilarity(a: string, b: string): number {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return 1.0;

  const bgA = getCharacterBigrams(a);
  const bgB = getCharacterBigrams(b);
  if (bgA.size === 0 || bgB.size === 0) return 0.0;

  let intersection = 0;
  for (const bg of bgA) {
    if (bgB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bgA.size + bgB.size);
}

function jaccardTokenSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0.0;
}

function tokenContainmentSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const minSize = Math.min(setA.size, setB.size);
  return minSize > 0 ? intersection / minSize : 0.0;
}

export function computeTextSimilarity(
  titleA: string,
  descA: string,
  titleB: string,
  descB: string,
): number {
  const titleA_tokens = tokenize(titleA);
  const titleB_tokens = tokenize(titleB);
  const descA_tokens = tokenize(descA);
  const descB_tokens = tokenize(descB);

  // Title similarity
  const titleDice = diceBigramSimilarity(titleA, titleB);
  const titleJaccard = jaccardTokenSimilarity(titleA_tokens, titleB_tokens);
  const titleContain = tokenContainmentSimilarity(titleA_tokens, titleB_tokens);
  const titleScore = 0.4 * titleDice + 0.3 * titleJaccard + 0.3 * titleContain;

  // Description similarity
  const descDice = diceBigramSimilarity(descA, descB);
  const descJaccard = jaccardTokenSimilarity(descA_tokens, descB_tokens);
  const descContain = tokenContainmentSimilarity(descA_tokens, descB_tokens);
  const descScore = 0.3 * descDice + 0.35 * descJaccard + 0.35 * descContain;

  // Combined title & description
  const combinedScore = 0.45 * titleScore + 0.55 * descScore;
  return Math.min(1.0, Math.max(0.0, Math.round(combinedScore * 1000) / 1000));
}

/**
 * Calculates combined multi-signal duplicate confidence score
 */
export function evaluateDuplicateCandidate(
  target: IssueRecord,
  candidate: IssueRecord,
): CandidateMatch | null {
  // Signal A: GPS Proximity
  const { score: gpsScore, distanceMeters } = computeGpsProximityScore(
    target.latitude,
    target.longitude,
    candidate.latitude,
    candidate.longitude,
  );

  // Signal B: Category Match
  const categoryScore = computeCategorySimilarity(target.category, candidate.category);

  // Signal C: Time Proximity
  const { score: timeScore, daysDiff } = computeTimeProximityScore(target.created_at, candidate.created_at);

  // Signal D: Text Similarity
  const textScore = computeTextSimilarity(
    target.title,
    target.description,
    candidate.title,
    candidate.description,
  );

  // Dynamic weighting
  const weights = DUPLICATE_CONFIG.WEIGHTS;
  let totalScore =
    weights.GPS_PROXIMITY * gpsScore +
    weights.CATEGORY_MATCH * categoryScore +
    weights.TEXT_SIMILARITY * textScore +
    weights.TIME_PROXIMITY * timeScore;

  // Boost if both exact location (<50m) and exact category match
  if (distanceMeters !== null && distanceMeters <= 50 && categoryScore >= 0.9) {
    totalScore = Math.min(1.0, totalScore * 1.12);
  }

  // Penalty if distance is over 500m
  if (distanceMeters !== null && distanceMeters > 500) {
    totalScore *= 0.35;
  }

  // Penalty if categories completely disagree
  if (categoryScore === 0.0) {
    totalScore *= 0.4;
  }

  totalScore = Math.min(1.0, Math.max(0.0, Math.round(totalScore * 1000) / 1000));

  if (totalScore < DUPLICATE_CONFIG.MIN_PERSIST_SCORE) {
    return null;
  }

  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (totalScore >= DUPLICATE_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
    confidence = "HIGH";
  } else if (totalScore >= DUPLICATE_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
    confidence = "MEDIUM";
  }

  // Construct Explainable Signals
  const signals: string[] = [];

  if (distanceMeters !== null) {
    if (distanceMeters === 0) {
      signals.push("Exact same GPS coordinates (0m)");
    } else {
      signals.push(`${Math.round(distanceMeters)}m away`);
    }
  }

  if (categoryScore >= 0.9 && target.category) {
    signals.push(`Same category (${target.category})`);
  } else if (categoryScore > 0.5) {
    signals.push("Related civic category");
  }

  if (textScore >= 0.6) {
    signals.push(`Strong description similarity (${Math.round(textScore * 100)}%)`);
  } else if (textScore >= 0.35) {
    signals.push(`Similar problem description (${Math.round(textScore * 100)}%)`);
  }

  if (daysDiff <= 1) {
    signals.push("Reported within 24 hours");
  } else if (daysDiff <= 3) {
    signals.push(`Reported ${Math.round(daysDiff)} days ago`);
  } else if (daysDiff <= 30) {
    signals.push(`Reported ${Math.round(daysDiff)} days ago`);
  }

  return {
    candidateIssueId: candidate.id,
    candidateTitle: candidate.title,
    candidateCategory: candidate.category,
    candidateStatus: candidate.status,
    distanceMeters,
    categoryMatchScore: categoryScore,
    timeDiffDays: daysDiff,
    textSimilarityScore: textScore,
    totalScore,
    confidence,
    signals,
  };
}

// ==========================================
// 3. MAIN SERVER HANDLER
// ==========================================
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return json(200, { ok: true }, origin);
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[detect-duplicates] Missing Supabase service credentials");
    return json(500, { error: "Internal database service configuration error." }, origin);
  }

  let body: DetectDuplicatesRequestBody = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." }, origin);
  }

  const targetIssueId = (body.issue_id || body.issueId || "").trim();
  if (!targetIssueId) {
    return json(400, { error: "Missing required field: issue_id" }, origin);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // 1. Fetch Target Issue
    const { data: targetIssue, error: targetError } = await supabaseAdmin
      .from("issues")
      .select("id, title, description, category, latitude, longitude, location_text, address_text, status, created_at")
      .eq("id", targetIssueId)
      .maybeSingle();

    if (targetError || !targetIssue) {
      console.error(`[detect-duplicates] Issue ${targetIssueId} not found:`, targetError);
      return json(404, { error: `Issue not found: ${targetIssueId}` }, origin);
    }

    // 2. Query Recent Candidate Issues (within time window, excluding current issue and rejected issues)
    const cutoffDate = new Date(Date.now() - DUPLICATE_CONFIG.TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error: candidateError } = await supabaseAdmin
      .from("issues")
      .select("id, title, description, category, latitude, longitude, location_text, address_text, status, created_at")
      .neq("id", targetIssueId)
      .neq("status", "REJECTED")
      .gte("created_at", cutoffDate)
      .order("created_at", { ascending: false })
      .limit(100);

    if (candidateError) {
      console.error("[detect-duplicates] Error fetching candidate issues:", candidateError);
      return json(500, { error: "Failed to query potential duplicate candidates." }, origin);
    }

    const candidateRows = (candidates || []) as IssueRecord[];
    const matches: CandidateMatch[] = [];

    // 3. Evaluate each candidate
    for (const candidate of candidateRows) {
      const match = evaluateDuplicateCandidate(targetIssue as IssueRecord, candidate);
      if (match) {
        matches.push(match);
      }
    }

    // 4. Sort matches by totalScore descending
    matches.sort((a, b) => b.totalScore - a.totalScore);

    // 5. Persist matches into public.issue_duplicates table
    const persistedMatches: Array<Record<string, unknown>> = [];

    for (const match of matches) {
      // Check if duplicate relation already exists in either direction
      const { data: existingPair } = await supabaseAdmin
        .from("issue_duplicates")
        .select("id, source_issue_id, duplicate_issue_id, status, confidence_score, reviewed_at, reviewed_by")
        .or(
          `and(source_issue_id.eq.${targetIssueId},duplicate_issue_id.eq.${match.candidateIssueId}),and(source_issue_id.eq.${match.candidateIssueId},duplicate_issue_id.eq.${targetIssueId})`
        )
        .maybeSingle();

      const matchingSignalsPayload = {
        distance_meters: match.distanceMeters,
        category_match_score: match.categoryMatchScore,
        time_diff_days: match.timeDiffDays,
        text_similarity_score: match.textSimilarityScore,
        signals: match.signals,
      };

      if (existingPair) {
        // If already reviewed (CONFIRMED or REJECTED), preserve decision
        if (existingPair.status !== "PENDING") {
          persistedMatches.push({
            id: existingPair.id,
            duplicate_issue_id: match.candidateIssueId,
            status: existingPair.status,
            similarity_score: match.totalScore,
            confidence: match.confidence,
            preservedReview: true,
          });
          continue;
        }

        // Otherwise update the pending record with fresh signals
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("issue_duplicates")
          .update({
            similarity_score: match.totalScore,
            confidence_score: match.totalScore,
            confidence: match.confidence,
            detection_method: "AI_MULTI_SIGNAL",
            matching_signals: matchingSignalsPayload,
          })
          .eq("id", existingPair.id)
          .select("id, source_issue_id, duplicate_issue_id, similarity_score, confidence, status, created_at")
          .single();

        if (!updateError && updated) {
          persistedMatches.push(updated);
        }
      } else {
        // Insert new candidate pair
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("issue_duplicates")
          .insert({
            source_issue_id: targetIssueId,
            duplicate_issue_id: match.candidateIssueId,
            similarity_score: match.totalScore,
            confidence_score: match.totalScore,
            confidence: match.confidence,
            detection_method: "AI_MULTI_SIGNAL",
            matching_signals: matchingSignalsPayload,
            status: "PENDING",
          })
          .select("id, source_issue_id, duplicate_issue_id, similarity_score, confidence, status, created_at")
          .single();

        if (!insertError && inserted) {
          persistedMatches.push(inserted);
        } else if (insertError) {
          console.warn(`[detect-duplicates] Insert duplicate relation failed:`, insertError);
        }
      }
    }

    return json(200, {
      success: true,
      issue_id: targetIssueId,
      total_candidates_evaluated: candidateRows.length,
      potential_duplicates_found: matches.length,
      matches,
      persisted_records: persistedMatches,
    }, origin);
  } catch (unexpectedError) {
    console.error("[detect-duplicates] Unexpected execution error:", unexpectedError);
    return json(500, { error: "An unexpected error occurred during duplicate issue detection." }, origin);
  }
});
