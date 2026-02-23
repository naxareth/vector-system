import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const skillExtractionPrompt = `
You are a skill extraction expert. Extract and normalize technical skills from resume text.
Input: Raw resume text
Output: JSON array of normalized skill names
Rules:
1. Map variations to standard names:
   - "React.js", "ReactJS" → "React"
   - "Python 3", "Python3" → "Python"
   - "Node", "NodeJS" → "Node.js"
   - "Solidity" → "Solidity"
   - "AI/ML", "Machine Learning" → "AI/ML"
2. Only include technical skills from our taxonomy
3. Return JSON format: { "skills": ["React", "Python"] }
Taxonomy: React, Python, Solidity, Node.js, AI/ML
`;

// --- Types ---

export interface GeneratedCourse {
  title: string;
  provider: string;
  link: string;
  skill_tags: string[];
}

// --- Course Generation ---

/**
 * Calls Gemini to generate 2-3 realistic courses for a given skill tag.
 *
 * Called as a fire-and-forget side effect when a new skill_tag arrives
 * via credential minting that has zero coverage in the courses table.
 *
 * Returns an empty array on any failure — never throws — so the calling
 * mint flow is never interrupted.
 *
 * NOTE: Generated links follow real provider URL patterns but are not
 * verified to resolve. Mark as unverified until a link-validation pass
 * is added in a future phase.
 */
export async function generateCoursesForTag(tag: string): Promise<GeneratedCourse[]> {
  const prompt = `
You are a course catalog generator for an academic micro-credentialing platform.

Given a skill tag, return 2-3 realistic online courses that teach this skill.

RULES:
1. Return ONLY valid JSON — no markdown fences, no explanation, no preamble.
2. Use only these providers: Coursera, edX, Udemy, LinkedIn Learning, Google, Microsoft.
3. skill_tags on each course must include the input tag plus 1-2 closely related tags.
   Related tags must come from the same domain (e.g. a healthcare tag pairs with other
   healthcare tags — never mix healthcare with DevOps or unrelated tech).
4. Links must follow real provider URL patterns:
   - Coursera: https://www.coursera.org/learn/<slug>
   - edX: https://www.edx.org/learn/<subject>/<slug>
   - Udemy: https://www.udemy.com/course/<slug>
   - LinkedIn Learning: https://www.linkedin.com/learning/<slug>
   - Google: https://grow.google/certificates/
   - Microsoft: https://learn.microsoft.com/en-us/training/
5. If the tag is too niche for a standalone course, bundle it with its parent domain
   (e.g. "Anatomy" → pair with "Patient Care" or "Clinical Assessment").
6. Course titles must sound like real courses — not generic.

OUTPUT FORMAT (strict JSON array, nothing else):
[
  {
    "title": "Course Title Here",
    "provider": "Coursera",
    "link": "https://www.coursera.org/learn/course-slug",
    "skill_tags": ["${tag}", "RelatedTag1"]
  }
]

Input tag: "${tag}"
`.trim();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip any accidental markdown fences Gemini might wrap around the JSON
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed: GeneratedCourse[] = JSON.parse(cleaned);

    // Validate shape — reject any entry missing required fields
    const valid = parsed.filter(
      (c) =>
        typeof c.title === 'string' &&
        typeof c.provider === 'string' &&
        typeof c.link === 'string' &&
        Array.isArray(c.skill_tags) &&
        c.skill_tags.length > 0
    );

    console.log(`[gemini-client] Generated ${valid.length} course(s) for tag: "${tag}"`);
    return valid;

  } catch (err) {
    // Non-fatal: log and return empty so the caller can continue
    console.error(`[gemini-client] generateCoursesForTag failed for "${tag}":`, err);
    return [];
  }
}