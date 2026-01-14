import { extractSkillsFromResume } from './nlp/skill-extractor';
import { calculateSkillDecay, SkillHealth } from './predictions/decay-forecaster';
import { recommendCourses, StudentProfile } from './recommendations/course-recommender';
import { fetchJobMarketData, countJobsBySkill } from './data/jsearch-client';

export interface AnalysisResult {
  extractedSkills: string[];
  skillHealth: SkillHealth[];
  recommendations: any[]; // Course recommendations
  analysisDate: Date;
}

export async function analyzeStudentProfile(
  resumeText: string,
  studentProfile: StudentProfile
): Promise<AnalysisResult> {
  console.log('🔍 Starting AI analysis...');
  
  // 1. NLP: Extract skills from resume
  const extractedSkills = await extractSkillsFromResume(resumeText);
  console.log('✅ Extracted skills:', extractedSkills);
  
  // 2. Prediction: Analyze skill decay for each skill
  const skillHealthPromises = extractedSkills.map(async (skill) => {
 const jobData = await fetchJobMarketData(skill);
const jobCount = jobData.length;
    
    // Mock historical data (in real app, fetch from Supabase)
    const historicalData = [
      { date: '2024-01-01', jobCount: Math.floor(jobCount * 0.8) },
      { date: '2024-01-15', jobCount: Math.floor(jobCount * 0.9) },
      { date: '2024-02-01', jobCount: jobCount }
    ];
    
    return calculateSkillDecay(skill, historicalData);
  });
  
  const skillHealth = await Promise.all(skillHealthPromises);
  
  // 3. Recommendation: Suggest courses (mock other students for now)
  const mockStudents: StudentProfile[] = [
    { id: '1', skills: [1, 2], coursesTaken: ['CS101', 'WEB301'] },
    { id: '2', skills: [1, 3], coursesTaken: ['CS101', 'BLOCK401'] },
    { id: '3', skills: [2, 5], coursesTaken: ['CS101', 'AI201'] }
  ];
  
  const recommendations = recommendCourses(studentProfile, mockStudents, [
    'CS101', 'WEB301', 'AI201', 'BLOCK401', 'NODE301'
  ]);
  
  return {
    extractedSkills,
    skillHealth,
    recommendations,
    analysisDate: new Date()
  };
}