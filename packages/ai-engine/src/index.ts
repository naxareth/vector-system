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
  marketData: any[]; // Raw Supabase rows
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
  // We process each skill one by one
  const skillHealth = finalSkills.map(skill => {
    // Find rows in 'marketData' that match this skill (case-insensitive)
    const rawHistory = marketData.filter(row => 
      row.skill_name.toLowerCase() === skill.toLowerCase()
    );

    // ✅ FIX 2: Map Supabase data (recorded_at/job_count) -> Predictor data (date/jobCount)
    const formattedHistory = rawHistory.map(row => ({
      date: row.recorded_at, 
      jobCount: row.job_count
    }));

    // Call the correct function
    return calculateSkillDecay(skill, formattedHistory); 
  });

  // 3. RECOMMENDATION
  const recommendations = recommendCourses({
    ...studentData,
    skills: finalSkills
  });

  return {
    studentId: studentData.id,
    skillHealth, // This now contains the calculated health/decay scores
    recommendations,
    gaps: []
  };
}