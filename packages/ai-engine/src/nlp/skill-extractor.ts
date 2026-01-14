import { genAI, skillExtractionPrompt } from "./gemini-client";

export async function extractSkillsFromResume(resumeText: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const result = await model.generateContent([
    skillExtractionPrompt,
    `Resume Text: ${resumeText}`
  ]);
  
  const response = result.response.text();
  // Parse JSON response
  const parsed = JSON.parse(response.replace(/```json|```/g, ''));
  return parsed.skills || [];
}