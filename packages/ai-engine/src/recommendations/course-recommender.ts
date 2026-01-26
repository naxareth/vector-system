const { Matrix } = require('ml-matrix');

export interface StudentProfile {
  id: string;
  skills: number[]; // Skill IDs (1=React, 2=Python, etc.)
  coursesTaken: string[]; // Course codes
  successScore?: number; // GPA or completion rate
}

export interface CourseRecommendation {
  courseCode: string;
  courseName: string;
  relevanceScore: number; // 0-100
  reason: string;
}

export function recommendCourses(
  targetStudent: StudentProfile,
  allStudents: StudentProfile[],
  availableCourses: string[]
): CourseRecommendation[] {
  if (allStudents.length === 0) return [];
  
  // Create skill vectors for all students
  const skillVectors = allStudents.map(student => 
    [1, 2, 3, 4, 5].map(skillId => 
      student.skills.includes(skillId) ? 1 : 0
    )
  );
  
  const targetVector = [1, 2, 3, 4, 5].map(skillId =>
    targetStudent.skills.includes(skillId) ? 1 : 0
  );
  
  // Calculate cosine similarity
  const matrix = new Matrix(skillVectors);
  const targetMatrix = new Matrix([targetVector]);
  
  // Find most similar students (nearest neighbors)
  const similarities = skillVectors.map((vector, idx) => ({
    studentId: allStudents[idx].id,
    similarity: cosineSimilarity(targetVector, vector),
    coursesTaken: allStudents[idx].coursesTaken
  }));
  
  // Filter to similar students (similarity > 0.3)
  const similarStudents = similarities.filter(s => s.similarity > 0.3);
  
  // Find courses taken by similar students that target hasn't taken
  const candidateCourses = new Map<string, { count: number, students: string[] }>();
  
  similarStudents.forEach(s => {
    s.coursesTaken.forEach(course => {
      if (!targetStudent.coursesTaken.includes(course)) {
        if (!candidateCourses.has(course)) {
          candidateCourses.set(course, { count: 0, students: [] });
        }
        const data = candidateCourses.get(course)!;
        data.count++;
        data.students.push(s.studentId);
      }
    });
  });
  
  // Convert to recommendations
  return Array.from(candidateCourses.entries())
    .map(([courseCode, data]) => {
      const popularity = (data.count / similarStudents.length) * 100;
      return {
        courseCode,
        courseName: getCourseName(courseCode), // You'll need a course database
        relevanceScore: Math.min(100, Math.round(popularity * 1.5)),
        reason: `Taken by ${data.count} similar students (${Math.round(popularity)}%)`
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5); // Top 5 recommendations
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA * magnitudeB === 0 ? 0 : dotProduct / (magnitudeA * magnitudeB);
}

function getCourseName(code: string): string {
  // Mock data - replace with actual course database
  const courses: Record<string, string> = {
    'CS101': 'Introduction to Programming',
    'WEB301': 'Advanced React Patterns',
    'AI201': 'Machine Learning Fundamentals',
    'BLOCK401': 'Smart Contract Development',
    'NODE301': 'Backend Development with Node.js'
  };
  return courses[code] || code;
}