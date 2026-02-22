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
  reasonType: 'gap' | 'decay' | 'growth' | 'complement';
}

export interface RecommendationContext {
  studentSkills: string[];
  skillHealthMap: SkillHealth[];
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

// --- Gap Analysis ---

async function getSkillGaps(
  supabase: SupabaseClient,
  studentSkills: string[]
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

  const studentSkillsLower = studentSkills.map(s => s.toLowerCase());

  return Array.from(latestMap.entries())
    .filter(([skill]) => !studentSkillsLower.includes(skill.toLowerCase()))
    .map(([skill_name, job_count]) => ({ skill_name, job_count }))
    .sort((a, b) => b.job_count - a.job_count)
    .slice(0, 20);
}

// --- Main Recommender ---

export async function recommendCourses(
  context: RecommendationContext
): Promise<CourseRecommendation[]> {
  if (!context.studentSkills || context.studentSkills.length === 0) return [];

  const topN = context.topN ?? 5;

  // Initialize client lazily — only runs when this function is actually called
  const supabase = getSupabaseClient();

  // Fetch real courses from Supabase
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, provider, skill_tags, link');

  if (error || !courses || courses.length === 0) {
    console.warn('⚠️ No courses found in database. Seed the courses table.');
    return [];
  }

  const skillGaps = await getSkillGaps(supabase, context.studentSkills);
  const gapSkillNames = skillGaps.map(g => g.skill_name.toLowerCase());

  const healthMap = new Map<string, SkillHealth>();
  for (const h of context.skillHealthMap) {
    healthMap.set(h.skillName.toLowerCase(), h);
  }

  const recommendations: CourseRecommendation[] = [];

  for (const course of courses) {
    const tags = (course.skill_tags || []).map((t: string) => t.toLowerCase());
    const studentSkillsLower = context.studentSkills.map(s => s.toLowerCase());

    let bestScore = 0;
    let bestReason = '';
    let bestReasonType: CourseRecommendation['reasonType'] = 'complement';

    // DECAY: student has skill but it's declining
    const decayingMatches = tags.filter(tag => {
      const health = healthMap.get(tag);
      return health?.trend === 'declining' && studentSkillsLower.includes(tag);
    });
    if (decayingMatches.length > 0) {
      const score = 90 + (decayingMatches.length * 5);
      if (score > bestScore) {
        bestScore = score;
        bestReason = `Your ${decayingMatches.join(', ')} skill${decayingMatches.length > 1 ? 's are' : ' is'} declining in demand — this course helps you upgrade your trajectory`;
        bestReasonType = 'decay';
      }
    }

    // GAP: course teaches high-demand skill student doesn't have
    const gapMatches = tags.filter(tag => gapSkillNames.includes(tag));
    if (gapMatches.length > 0) {
      const gapDemand = gapMatches.reduce((sum, tag) => {
        const gap = skillGaps.find(g => g.skill_name.toLowerCase() === tag);
        return sum + (gap?.job_count ?? 0);
      }, 0);
      const demandBonus = Math.min(15, Math.floor(gapDemand / 50000));
      const score = 80 + demandBonus;
      if (score > bestScore) {
        bestScore = score;
        const topGap = gapMatches[0];
        const gapData = skillGaps.find(g => g.skill_name.toLowerCase() === topGap);
        bestReason = `${gapData?.job_count.toLocaleString() ?? 'High'} open jobs for ${topGap} — a skill gap in your portfolio`;
        bestReasonType = 'gap';
      }
    }

    // GROWTH: course complements a rising skill
    const growingMatches = tags.filter(tag => healthMap.get(tag)?.trend === 'growing');
    if (growingMatches.length > 0) {
      const score = 65 + (growingMatches.length * 5);
      if (score > bestScore) {
        bestScore = score;
        bestReason = `${growingMatches.join(', ')} ${growingMatches.length > 1 ? 'are' : 'is'} growing in demand — good time to deepen this area`;
        bestReasonType = 'growth';
      }
    }

    // COMPLEMENT: course overlaps with existing skills
    const complementMatches = tags.filter(tag => studentSkillsLower.includes(tag));
    if (complementMatches.length > 0 && bestScore === 0) {
      bestScore = 40 + (complementMatches.length * 5);
      bestReason = `Builds on your existing ${complementMatches.join(', ')} skills`;
      bestReasonType = 'complement';
    }

    if (bestScore > 0) {
      recommendations.push({
        courseId: course.id,
        courseTitle: course.title,
        provider: course.provider ?? null,
        link: course.link ?? null,
        relevanceScore: Math.min(100, bestScore),
        reason: bestReason,
        reasonType: bestReasonType,
      });
    }
  }

  const typePriority = { decay: 4, gap: 3, growth: 2, complement: 1 };
  return recommendations
    .sort((a, b) => {
      const typeDiff = typePriority[b.reasonType] - typePriority[a.reasonType];
      return typeDiff !== 0 ? typeDiff : b.relevanceScore - a.relevanceScore;
    })
    .slice(0, topN);
}