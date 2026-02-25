import { genAI, skillExtractionPrompt } from "./gemini-client";

// Legacy: Standard text-based extraction
export async function extractSkillsFromResume(resumeText: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
  const result = await model.generateContent([
    skillExtractionPrompt,
    `Resume Text: ${resumeText}`
  ]);
  
  const response = result.response.text();
  // Parse JSON response
  const parsed = JSON.parse(response.replace(/```json|```/g, ''));
  return parsed.skills || [];
}

// Phase 5: W3C Dynamic Schema Analyzer
export async function extractSkillsFromCredential(
  credentialData: Record<string, any>, 
  schemaUrl: string
): Promise<string[]> {
  try {
    // 1. Fetch the JSON-LD schema definition to understand the fields
    const schemaResponse = await fetch(schemaUrl);
    if (!schemaResponse.ok) {
      throw new Error(`Failed to fetch schema from ${schemaUrl}`);
    }
    const schemaDef = await schemaResponse.json() as any;

    // 2. Build the context-aware prompt using your working model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const dynamicPrompt = `
      You are an expert AI skill extractor for a decentralized micro-credentialing platform.
      
      Below is a W3C Verifiable Credential data payload, along with its JSON-LD schema definition. 
      Use the schema to understand the exact context of the custom fields before extracting skills.
      
      Schema Definition (Context):
      ${JSON.stringify(schemaDef.properties || schemaDef.json_schema?.properties || schemaDef, null, 2)}
      
      Student's Credential Data (Payload):
      ${JSON.stringify(credentialData, null, 2)}
      
      Analyze the student's data using the schema context. Extract a list of standardized professional skills demonstrated by this credential.
      Return ONLY a valid JSON object with a "skills" array containing strings.
    `;

    // 3. Generate and parse the context-aware response
    const result = await model.generateContent([
      skillExtractionPrompt, 
      dynamicPrompt
    ]);
    
    const response = result.response.text();
    const parsed = JSON.parse(response.replace(/```json|```/g, ''));
    return parsed.skills || [];

  } catch (error) {
    console.error("AI Schema Analysis Error:", error);
    return []; 
  }
}