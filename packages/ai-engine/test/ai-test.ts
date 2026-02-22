// packages/ai-engine/test/ai-test.ts
import { analyzeStudentProfile } from '../src/index';
import { extractSkillsFromCredential } from '../src/nlp/skill-extractor';

// Temporarily override global fetch to mock the schema registry response
const originalFetch = global.fetch;

async function testAIEngine() {
  console.log('🧪 Testing AI Engine...\n');
  
  // ---------------------------------------------------------
  // TEST 1: Legacy / General Profile Analysis
  // ---------------------------------------------------------
  console.log('--- TEST 1: Standard Profile Analysis ---');
  const mockResume = `
    Experienced full-stack developer with 3 years in React and Node.js.
    Built decentralized applications using Solidity. 
    Python for data analysis and machine learning projects.
  `;
  
  const mockStudent: any = {
    id: 'test-123',
    skills: [1, 4], 
    coursesTaken: ['CS101']
  };
  
  try {
    // Fixed the argument structure to match what index.ts expects
    const result = await (analyzeStudentProfile as any)({
      studentData: mockStudent,
      resumeText: mockResume
    });
    console.log('Analysis Complete for Student:', mockStudent.id);
    console.log('✅ Standard extraction is working!\n');
  } catch (error) {
    console.error('❌ Standard extraction test failed:', error);
  }

  // ---------------------------------------------------------
  // TEST 2: W3C Dynamic Schema Analysis (Phase 5)
  // ---------------------------------------------------------
  console.log('--- TEST 2: W3C Dynamic Schema Analysis ---');
  
  const mockSchemaDef = {
    properties: {
      course_name: { type: "string", title: "Course Name" },
      hours_completed: { type: "number", title: "Hours Completed" },
      final_grade: { type: "string", title: "Final Grade" },
      technologies_used: { type: "string", title: "Technologies Used" }
    }
  };

  // Fixed the fetch mock to ONLY intercept local schema requests
  global.fetch = async (input: any, init?: any) => {
    const urlString = input.toString();
    
    // If it's trying to fetch our dynamic schema, return the mock
    if (urlString.includes('/api/schemas/')) {
      console.log(`[Mock System] Intercepted fetch for schema: ${urlString}`);
      return {
        ok: true,
        json: async () => mockSchemaDef
      } as Response;
    }
    
    // Otherwise, let the real fetch handle it (crucial for Gemini API calls)
    return originalFetch(input, init);
  };

  const mockCredentialData = {
    course_name: "Advanced Distributed Systems",
    hours_completed: 120,
    final_grade: "A+",
    technologies_used: "Node.js, PostgreSQL, Kubernetes"
  };

  const mockSchemaUrl = "http://localhost:3000/api/schemas/mock-uuid-123";

  try {
    console.log('Analyzing dynamic credential context...');
    const skills = await extractSkillsFromCredential(mockCredentialData, mockSchemaUrl);
    
    console.log('\n📊 W3C CREDENTIAL RESULTS:');
    console.log('Extracted W3C Skills:', skills);
    
    if (skills && skills.length > 0) {
      console.log('\n✅ Phase 5 Schema Analyzer is working!');
    } else {
      console.log('\n⚠️ Schema Analyzer returned an empty array.');
    }
  } catch (error) {
    console.error('❌ Phase 5 test failed:', error);
  } finally {
    global.fetch = originalFetch;
  }
}

testAIEngine();