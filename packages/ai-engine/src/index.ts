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

  // 3. RECOMMENDATION + GAP ANALYSIS
  // ✅ Now async — queries real courses table + market_snapshots for gap analysis
  const recommendations = await recommendCourses({
    studentSkills: finalSkills,
    skillHealthMap: skillHealth,
    topN: 5,
  });

  // 4. Surface skill gaps explicitly for the AI context
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
    atRiskSkills, // Replaces hardcoded gaps: []
  };
}