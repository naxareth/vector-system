// packages/ai-engine/test/ai-test.ts
import { analyzeStudentProfile } from '../src/index';

async function testAIEngine() {
  console.log('🧪 Testing AI Engine...');
  
  const mockResume = `
    Experienced full-stack developer with 3 years in React and Node.js.
    Built decentralized applications using Solidity. 
    Python for data analysis and machine learning projects.
  `;
  
  const mockStudent: any = {
    id: 'test-123',
    skills: [1, 4], // React, Node.js
    coursesTaken: ['CS101']
  };
  
  try {
    const result = await analyzeStudentProfile(mockResume, mockStudent);
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('Extracted Skills:', result.extractedSkills);
    console.log('\nSkill Health:');
    result.skillHealth.forEach(skill => {
      console.log(`  ${skill.skillName}: ${skill.trend} (Score: ${skill.healthScore})`);
    });
    console.log('\nRecommendations:');
    result.recommendations.forEach(rec => {
      console.log(`  ${rec.courseCode}: ${rec.relevanceScore}% - ${rec.reason}`);
    });
    
    console.log('\n✅ AI Engine is working!');
  } catch (error) {
    console.error('❌ AI Engine test failed:', error);
  }
}

testAIEngine();