import { calculateSkillDecay } from './predictions/decay-forecaster';
import { recommendCourses } from './recommendations/course-recommender';
import { extractSkillsFromResume } from './nlp/skill-extractor';

interface AIInputParams {
  studentData: {
    id: string;
    name: string;
    skills: string[];
    credentials: any[];
  };
  marketData: any[]; // Raw Supabase rows from market_snapshots
  resumeText?: string;
}

export async function analyzeStudentProfile(params: AIInputParams) {
  const { studentData, marketData, resumeText } = params;
  console.log("🔍 AI Engine: Processing profile for", studentData?.name);

  if (!studentData) {
    throw new Error("❌ AI Engine Error: 'studentData' is missing.");
  }

  // 1. NLP Extraction
  let extractedSkills: string[] = [];
  if (resumeText) {
    try {
      extractedSkills = await extractSkillsFromResume(resumeText);
      console.log("✅ NLP Extracted:", extractedSkills);
    } catch (e) {
      console.warn("⚠️ NLP extraction skipped:", e);
    }
  }

  const finalSkills = Array.from(new Set([...studentData.skills, ...extractedSkills]));

  // 2. PREDICTION (Skill Decay)
  // Map Supabase rows (recorded_at/job_count) → forecaster format (date/jobCount)
  const skillHealth = finalSkills.map(skill => {
    const rawHistory = marketData.filter(row =>
      row.skill_name.toLowerCase() === skill.toLowerCase()
    );
    const formattedHistory = rawHistory.map(row => ({
      date: row.recorded_at,
      jobCount: row.job_count,
    }));
    return calculateSkillDecay(skill, formattedHistory);
  });

  // 3. DOMAIN TAG EXTRACTION
  //
  // Flatten skill_tags from all verified credentials into a single deduplicated
  // array. This tells the recommender what field/domain the student belongs to
  // so it can filter courses to domain-relevant ones first (Tier 1) before
  // falling back to general high-demand courses (Tier 2 / explore).
  //
  // Rules:
  //   - Only include credentials that have a non-empty skill_tags array
  //   - Deduplicate across all credentials (Set)
  //   - If no credentials have tags, studentDomainTags = [] which safely
  //     triggers the Tier 2 explore fallback in the recommender
  const studentDomainTags: string[] = Array.from(
    new Set(
      studentData.credentials
        .filter(
          (cred) => Array.isArray(cred.skill_tags) && cred.skill_tags.length > 0
        )
        .flatMap((cred) => cred.skill_tags as string[])
    )
  );

  console.log(`🏷️  AI Engine: Domain tags resolved (${studentDomainTags.length}):`, studentDomainTags);

  // 4. RECOMMENDATION + GAP ANALYSIS
  // ✅ Now domain-aware — passes studentDomainTags so the recommender can
  // filter courses to the student's field before scoring by market demand.
  const recommendations = await recommendCourses({
    studentSkills: finalSkills,
    skillHealthMap: skillHealth,
    studentDomainTags,
    topN: 5,
  });

  // 5. Surface skill gaps explicitly for the AI context
  // Declining or low-confidence skills the student has → flag as at-risk
  const atRiskSkills = skillHealth
    .filter(s => s.trend === 'declining' || (s.healthScore < 40 && s.confidence !== 'low'))
    .map(s => ({
      skill: s.skillName,
      healthScore: s.healthScore,
      trend: s.trend,
      confidence: s.confidence,
    }));

  return {
    studentId: studentData.id,
    skillHealth,
    recommendations,
    atRiskSkills,
  };
}