// Define what a Course looks like in our catalog
interface Course {
  id: string;
  title: string;
  tags: string[];
}

// 1. THE CATALOG (Mock Database of Courses)
// In a real app, this would come from your 'courses' table in Supabase
const COURSE_CATALOG: Course[] = [
  { id: 'WEB301', title: 'Advanced React Patterns', tags: ['react', 'javascript', 'frontend'] },
  { id: 'BLOCK401', title: 'Solidity Smart Contracts', tags: ['blockchain', 'solidity', 'web3'] },
  { id: 'AI201', title: 'Machine Learning Fundamentals', tags: ['python', 'ai', 'data science'] },
  { id: 'NODE301', title: 'Backend Development with Node.js', tags: ['node.js', 'backend', 'javascript'] },
  { id: 'CS101', title: 'Intro to Computer Science', tags: ['basics', 'algorithms'] },
  { id: 'SEC501', title: 'Cybersecurity Essentials', tags: ['security', 'network', 'admin'] }
];

export function recommendCourses(student: { skills: string[] }) {
  

  // 🛡️ Defensive Check
  if (!student || !student.skills) {
    return [];
  }

  const mySkills = student.skills.map(s => s.toLowerCase());

  // 2. THE MATCHING ENGINE (Tag-Based)
  const recommendations = COURSE_CATALOG.map(course => {
    // Count how many tags match the student's skills
    const overlap = course.tags.filter(tag => mySkills.includes(tag)).length;
    
    let score = 0; 
    let reason = "General Recommendation";

    if (overlap > 0) {
      // High score if skills match
      score = 70 + (overlap * 10); 
      reason = `Matches your skills: ${course.tags.filter(t => mySkills.includes(t)).join(', ')}`;
    } else {
      // Low score, but suggest it as a new path
      score = 30;
      reason = "Expand your horizons";
    }

    return {
      courseCode: course.id,
      courseName: course.title,
      relevanceScore: Math.min(score, 100), // Max 100
      reason
    };
  });

  // 3. SORT & FILTER
  // Return top 3 highest scores
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}