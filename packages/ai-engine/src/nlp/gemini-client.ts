import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// 🛡️ SECURITY (Checkpoint #2): Lazy guard — only crashes when Gemini is
// actually used, not at import time. This lets Adzuna-only daily runs work
// even when GEMINI_API_KEY isn't set.
let _genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0) {
      throw new Error(
        '🛡️ SECURITY: GEMINI_API_KEY is not set. ' +
        'The AI engine cannot use Gemini features without it.'
      );
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

// Backward-compatible export — existing code using `genAI` will still work
// when the key IS available. For lazy usage, prefer `getGenAI()`.
export const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : (null as unknown as GoogleGenerativeAI);

/**
 * Open-domain skill extraction prompt.
 *
 * Phase 13b fix: removed hardcoded 5-skill taxonomy that was silently returning
 * empty results for any non-IT credential (accounting, TESDA, nursing, etc.).
 *
 * The extractor now uses zero-shot extraction across all domains — this is the
 * core architectural decision documented in the defense: no retraining needed
 * when new credential types arrive (e.g. TESDA NC II in Bread and Pastry Production
 * correctly extracts ["Food Production", "Baking", "Food Safety"] on first mint).
 *
 * Normalization rules are kept so tag consistency is maintained across similar
 * credentials (React.js → React, NodeJS → Node.js, etc).
 */
export const skillExtractionPrompt = `
You are a skill extraction expert for a decentralized micro-credentialing platform.
You extract and normalize professional and technical skills from credential titles,
degree names, bootcamp certificates, government certifications, and event badges.

Input: A credential title, degree name, or certification label
Output: A JSON object with a "skills" array of normalized skill tag strings

Rules:
1. Extract ALL skills implied by the credential — technical, professional, vocational,
   and academic. Do not limit to any fixed taxonomy.
2. Normalize variations to standard names:
   - "React.js", "ReactJS" → "React"
   - "Python 3", "Python3" → "Python"
   - "Node", "NodeJS" → "Node.js"
   - "Machine Learning", "ML" → "Machine Learning"
   - "UI/UX", "UX Design" → "UI/UX Design"
   - "k8s" → "Kubernetes"
3. For degree names (e.g. "Bachelor of Science in Accountancy"), extract the core
   skills that discipline teaches — not the degree title itself.
4. For government certifications (e.g. TESDA NC II, DICT certificates), extract the
   vocational or professional skills the certification represents.
5. For event badges (e.g. hackathons, competitions), extract the skills demonstrated
   or the domain of the event.
6. Return 2-6 skills per credential. Do not over-extract.
7. Return ONLY valid JSON — no markdown fences, no explanation, no preamble.

Return format: { "skills": ["Skill1", "Skill2", "Skill3"] }
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
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