import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SkillHealth } from '../predictions/decay-forecaster';

// --- Types ---

export interface CourseRecommendation {
  courseId: string;
  courseTitle: string;
  provider: string | null;
  link: string | null;
  relevanceScore: number; // 0-100
  reason: string;
  reasonType: 'gap' | 'decay' | 'growth' | 'complement' | 'explore';
  // 'explore' = Tier 2 fallback: no domain overlap found, surfacing high-demand
  // courses from outside the student's current field as expansion suggestions.
}

export interface RecommendationContext {
  studentSkills: string[];
  skillHealthMap: SkillHealth[];
  studentDomainTags: string[]; // Flattened skill_tags from all student credentials
  topN?: number;
}

/**
 * Lazy Supabase client factory.
 *
 * Root cause of the original error: creating a module-level supabase client
 * causes it to initialize when the module is first imported — which happens
 * inside the Next.js web portal where SUPABASE_SERVICE_KEY does not exist.
 *
 * Fix: create the client inside the function call so it only initializes
 * when actually invoked, and support both the ai-engine env var naming
 * (SUPABASE_SERVICE_KEY) and the web portal naming (NEXT_PUBLIC_SUPABASE_URL
 * + service key via SUPABASE_SERVICE_ROLE_KEY) gracefully.
 */
function getSupabaseClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '❌ Supabase credentials missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env'
    );
  }

  return createClient(url, key);
}

// --- Helpers ---

/**
 * Normalizes a tag string for comparison:
 * lowercase + collapse whitespace + trim.
 * Does NOT strip hyphens — "UI/UX Design" and "ui/ux design" should match,
 * but "Node.js" should not collapse to "nodejs".
 */
function normalize(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Returns true if two tag arrays share at least one normalized tag.
 */
function hasOverlap(tagsA: string[], tagsB: string[]): boolean {
  const setA = new Set(tagsA.map(normalize));
  return tagsB.some(t => setA.has(normalize(t)));
}

// --- Gap Analysis ---

/**
 * Returns the top market gaps (high-demand skills the student doesn't have),
 * scoped to skills that appear in at least one course from the provided
 * domainCourseSkills pool.
 *
 * Without the domain scope, a nursing student would see "Docker" and
 * "Kubernetes" as gaps because they have high job counts — even though
 * no healthcare course teaches those skills.
 */
async function getSkillGaps(
  supabase: SupabaseClient,
  studentSkills: string[],
  domainCourseSkills: Set<string>  // union of all skill_tags from Tier 1 courses
): Promise<{ skill_name: string; job_count: number }[]> {
  const { data, error } = await supabase
    .from('market_snapshots')
    .select('skill_name, job_count, recorded_at')
    .order('recorded_at', { ascending: false });

  if (error || !data) return [];

  // Keep only the most recent snapshot per skill
  const latestMap = new Map<string, number>();
  for (const row of data) {
    if (!latestMap.has(row.skill_name)) {
      latestMap.set(row.skill_name, row.job_count);
    }
  }

  const studentSkillsLower = studentSkills.map(s => normalize(s));

  return Array.from(latestMap.entries())
    .filter(([skill]) => {
      const normalizedSkill = normalize(skill);
      // Must be a gap (student doesn't have it)
      const isGap = !studentSkillsLower.includes(normalizedSkill);
      // Must be covered by at least one course in the domain pool
      // If domainCourseSkills is empty (Tier 2 fallback), allow all gaps through
      const isInDomain =
        domainCourseSkills.size === 0 ||
        domainCourseSkills.has(normalizedSkill);
      return isGap && isInDomain;
    })
    .map(([skill_name, job_count]) => ({ skill_name, job_count }))
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 20);
}

// --- Scoring Engine ---

/**
 * Scores a single course against the student's context.
 * Returns { score, reason, reasonType } or null if no signal matches.
 *
 * Extracted as a pure function so it can be reused for both Tier 1
 * and Tier 2 scoring without duplication.
 */
function scoreCourse(
  courseTags: string[],
  studentSkillsLower: string[],
  skillGaps: { skill_name: string; job_count: number }[],
  healthMap: Map<string, SkillHealth>,
  reasonTypeOverride?: 'explore'
): { score: number; reason: string; reasonType: CourseRecommendation['reasonType'] } | null {
  const gapSkillNames = skillGaps.map(g => normalize(g.skill_name));

  let bestScore = 0;
  let bestReason = '';
  let bestReasonType: CourseRecommendation['reasonType'] = 'complement';

  // DECAY: student has the skill but it's declining — urge upgrade
  const decayingMatches = courseTags.filter(tag => {
    const health = healthMap.get(normalize(tag));
    return health?.trend === 'declining' && studentSkillsLower.includes(normalize(tag));
  });
  if (decayingMatches.length > 0) {
    const score = 90 + (decayingMatches.length * 5);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `Your ${decayingMatches.join(', ')} skill${decayingMatches.length > 1 ? 's are' : ' is'} declining in demand — this course helps you upgrade your trajectory`;
      bestReasonType = 'decay';
    }
  }

  // GAP: course teaches a high-demand skill the student doesn't have
  const gapMatches = courseTags.filter(tag => gapSkillNames.includes(normalize(tag)));
  if (gapMatches.length > 0) {
    const gapDemand = gapMatches.reduce((sum, tag) => {
      const gap = skillGaps.find(g => normalize(g.skill_name) === normalize(tag));
      return sum + (gap?.job_count ?? 0);
    }, 0);
    const demandBonus = Math.min(15, Math.floor(gapDemand / 50000));
    const score = 80 + demandBonus;
    if (score > bestScore) {
      bestScore = score;
      const topGap = gapMatches[0];
      const gapData = skillGaps.find(g => normalize(g.skill_name) === normalize(topGap));
      bestReason = `${gapData?.job_count.toLocaleString() ?? 'High'} open jobs for ${topGap} — a skill gap in your portfolio`;
      bestReasonType = 'gap';
    }
  }

  // GROWTH: course complements a rising skill the student already has
  const growingMatches = courseTags.filter(tag => {
    const health = healthMap.get(normalize(tag));
    return health?.trend === 'growing';
  });
  if (growingMatches.length > 0) {
    const score = 65 + (growingMatches.length * 5);
    if (score > bestScore) {
      bestScore = score;
      bestReason = `${growingMatches.join(', ')} ${growingMatches.length > 1 ? 'are' : 'is'} growing in demand — good time to deepen this area`;
      bestReasonType = 'growth';
    }
  }

  // COMPLEMENT: course overlaps with existing skills (no market signal needed)
  const complementMatches = courseTags.filter(tag => studentSkillsLower.includes(normalize(tag)));
  if (complementMatches.length > 0 && bestScore === 0) {
    bestScore = 40 + (complementMatches.length * 5);
    bestReason = `Builds on your existing ${complementMatches.join(', ')} skills`;
    bestReasonType = 'complement';
  }

  // EXPLORE: Tier 2 fallback — no domain overlap, surface as expansion suggestion
  if (reasonTypeOverride === 'explore' && bestScore === 0) {
    // Give a base score so explore courses always make it into the sorted list
    bestScore = 30;
    bestReason = 'Expand your skill set with a high-demand area outside your current field';
    bestReasonType = 'explore';
  }

  if (bestScore === 0) return null;

  // If caller forces 'explore' type (Tier 2), override BOTH the type AND
  // the reason text — gap/decay/growth reason text implies field relevance
  // which is misleading for out-of-domain courses.
  if (reasonTypeOverride === 'explore') {
    return {
      score: Math.min(100, bestScore),
      reason: 'Expand your skill set with a high-demand area outside your current field',
      reasonType: 'explore',
    };
  }

  return {
    score: Math.min(100, bestScore),
    reason: bestReason,
    reasonType: bestReasonType,
  };
}

// --- Main Recommender ---

export async function recommendCourses(
  context: RecommendationContext
): Promise<CourseRecommendation[]> {
  if (!context.studentSkills || context.studentSkills.length === 0) return [];

  const topN = context.topN ?? 5;
  const supabase = getSupabaseClient();

  // Fetch all courses from Supabase
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, provider, skill_tags, link');

  if (error || !courses || courses.length === 0) {
    console.warn('⚠️ No courses found in database. Seed the courses table.');
    return [];
  }

  const studentSkillsLower = context.studentSkills.map(s => normalize(s));
  const domainTagsLower = context.studentDomainTags.map(t => normalize(t));

  const healthMap = new Map<string, SkillHealth>();
  for (const h of context.skillHealthMap) {
    healthMap.set(normalize(h.skillName), h);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 1: Domain-matched courses
  //
  // A course qualifies for Tier 1 if its skill_tags share at least one
  // normalized tag with the student's domain tags (flattened from their
  // verified_credentials.skill_tags).
  //
  // If studentDomainTags is empty (brand-new student with no credentials),
  // skip Tier 1 entirely and go straight to Tier 2 — no domain to match on.
  // ─────────────────────────────────────────────────────────────────────────
  let tier1Recommendations: CourseRecommendation[] = [];

  if (domainTagsLower.length > 0) {
    const tier1Courses = courses.filter(course => {
      const tags = (course.skill_tags ?? []) as string[];
      return hasOverlap(tags, context.studentDomainTags);
    });

    if (tier1Courses.length > 0) {
      // Build domain-scoped gap analysis: only surface gaps covered by Tier 1 courses
      const domainCourseSkills = new Set(
        tier1Courses.flatMap(c => (c.skill_tags ?? [] as string[]).map(normalize))
      );

      const skillGaps = await getSkillGaps(supabase, context.studentSkills, domainCourseSkills);

      for (const course of tier1Courses) {
        const tags = (course.skill_tags ?? []) as string[];
        const scored = scoreCourse(tags, studentSkillsLower, skillGaps, healthMap);
        if (!scored) continue;

        tier1Recommendations.push({
          courseId: course.id,
          courseTitle: course.title,
          provider: course.provider ?? null,
          link: course.link ?? null,
          relevanceScore: scored.score,
          reason: scored.reason,
          reasonType: scored.reasonType,
        });
      }

      // Sort Tier 1: decay > gap > growth > complement, then by score
      const typePriority = { decay: 4, gap: 3, growth: 2, complement: 1, explore: 0 };
      tier1Recommendations.sort((a, b) => {
        const typeDiff = typePriority[b.reasonType] - typePriority[a.reasonType];
        return typeDiff !== 0 ? typeDiff : b.relevanceScore - a.relevanceScore;
      });
    }
  }

  // If Tier 1 already fills topN, return early — no Tier 2 needed
  if (tier1Recommendations.length >= topN) {
    return tier1Recommendations.slice(0, topN);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 2: Explore fallback
  //
  // Fills remaining slots (topN - tier1Count) from courses that did NOT
  // match the student's domain. These are surfaced as 'explore' cards so
  // the UI can style them distinctly — they are never presented as
  // field-relevant recommendations.
  //
  // Triggered when:
  //   a) studentDomainTags is empty (new student)
  //   b) Tier 1 returned fewer than topN results (domain coverage gap)
  // ─────────────────────────────────────────────────────────────────────────
  const tier1Ids = new Set(tier1Recommendations.map(r => r.courseId));
  const tier2Courses = courses.filter(course => !tier1Ids.has(course.id));
  const slotsRemaining = topN - tier1Recommendations.length;

  // For Tier 2 gap analysis, open the scope to all skills (no domain filter)
  const skillGapsTier2 = await getSkillGaps(supabase, context.studentSkills, new Set());

  const tier2Recommendations: CourseRecommendation[] = [];

  for (const course of tier2Courses) {
    const tags = (course.skill_tags ?? []) as string[];
    const scored = scoreCourse(tags, studentSkillsLower, skillGapsTier2, healthMap, 'explore');
    if (!scored) continue;

    tier2Recommendations.push({
      courseId: course.id,
      courseTitle: course.title,
      provider: course.provider ?? null,
      link: course.link ?? null,
      relevanceScore: scored.score,
      reason: scored.reason,
      reasonType: 'explore',
    });
  }

  // Sort Tier 2 by relevance score descending
  tier2Recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return [
    ...tier1Recommendations,
    ...tier2Recommendations.slice(0, slotsRemaining),
  ];
}