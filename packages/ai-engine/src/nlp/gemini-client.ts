import dotenv from "dotenv";
import { generateText } from "./ai-provider";

// Load environment variables from .env file
dotenv.config();

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
1. Extract ALL core skills implied by the credential — technical, professional,
   vocational, and academic. Cover the key competencies the credential holder
   would be expected to have.
2. Normalize variations to standard names:
   - "React.js", "ReactJS" → "React"
   - "Python 3", "Python3" → "Python"
   - "Node", "NodeJS" → "Node.js"
   - "Machine Learning", "ML" → "Machine Learning"
   - "UI/UX", "UX Design" → "UI/UX Design"
   - "k8s" → "Kubernetes"
3. For degree names, extract the core professional skills the discipline teaches,
   not the degree title itself. Think: "what would a graduate of this program
   be able to do professionally?"
4. For government certifications (TESDA, DICT, etc.), extract the specific
   vocational or professional skills the certification validates.
5. For event badges (hackathons, competitions, summits), extract the skills
   demonstrated by participating, including both domain skills and soft skills
   like Problem Solving, Teamwork, Presentation Skills, or Public Speaking.
6. For bootcamp certificates, extract both the primary technology/domain AND
   the component sub-skills (e.g. a Full-Stack bootcamp implies Frontend
   Development, Backend Development, Database Management, API Development).
7. Return 4-7 skills per credential. Aim for comprehensive coverage.
8. Return ONLY valid JSON — no markdown fences, no explanation, no preamble.

Few-shot examples (follow this granularity and naming style):

Input: "Bachelor of Science in Information Technology"
Output: { "skills": ["Database Management", "System Administration", "Networking", "IT Support", "Software Development"] }

Input: "Bachelor of Science in Accountancy"
Output: { "skills": ["Accounting", "Auditing", "Taxation", "Financial Reporting", "Financial Analysis"] }

Input: "Full-Stack Web Development Bootcamp"
Output: { "skills": ["Web Development", "Frontend Development", "Backend Development", "Database Management", "API Development", "JavaScript"] }

Input: "TESDA National Certificate II in Computer Systems Servicing"
Output: { "skills": ["Computer Hardware Repair", "Network Configuration", "Operating System Installation", "Troubleshooting", "Preventive Maintenance"] }

Input: "Regional Hackathon 2026"
Output: { "skills": ["Problem Solving", "Programming", "Teamwork", "Prototyping", "Software Development"] }

Input: "University Data Science Summit — Best Presenter Award"
Output: { "skills": ["Data Science", "Public Speaking", "Presentation Skills", "Data Visualization", "Research"] }

Input: "Bachelor of Science in Criminology"
Output: { "skills": ["Criminal Justice", "Forensic Science", "Criminology", "Legal Procedures", "Investigative Techniques"] }

Input: "Fintech Innovation Challenge 2025 — Finalist"
Output: { "skills": ["Financial Technology", "Innovation", "Business Strategy", "Problem Solving", "Prototyping"] }

Input: "TESDA National Certificate III in Bookkeeping"
Output: { "skills": ["Bookkeeping", "Accounting", "Financial Record Keeping", "Financial Reporting", "Payroll"] }

Input: "Bachelor of Science in Computer Science"
Output: { "skills": ["Programming", "Data Structures", "Algorithms", "Software Development", "Computer Architecture"] }

Input: "AWS Cloud Practitioner Bootcamp"
Output: { "skills": ["AWS", "Cloud Computing", "Cloud Security", "Cloud Architecture", "Scalability"] }

Input: "Cybersecurity Fundamentals Bootcamp"
Output: { "skills": ["Cybersecurity", "Network Security", "Information Security", "Threat Analysis", "Incident Response"] }

Input: "TESDA National Certificate II in Electrical Installation and Maintenance"
Output: { "skills": ["Electrical Installation", "Electrical Maintenance", "Electrical Wiring", "Troubleshooting", "Electrical Safety"] }

Input: "TESDA National Certificate II in Bread and Pastry Production"
Output: { "skills": ["Baking", "Food Safety", "Pastry Making", "Bread Making", "Kitchen Operations"] }

Input: "DICT Digital Literacy Certificate"
Output: { "skills": ["Digital Literacy", "Computer Fundamentals", "Online Safety", "Internet Navigation", "Productivity Software"] }

Input: "DICT Cybersecurity Essentials Certification"
Output: { "skills": ["Cybersecurity", "Network Security", "Information Security", "Risk Management", "Incident Response"] }

Input: "Bachelor of Science in Business Administration major in Financial Management"
Output: { "skills": ["Financial Analysis", "Financial Management", "Investment Management", "Corporate Finance", "Business Administration"] }

Input: "UI/UX Design Intensive Bootcamp"
Output: { "skills": ["UI/UX Design", "Prototyping", "User Research", "Wireframing", "Usability Testing"] }

Input: "Python"
Output: { "skills": ["Python", "Programming", "Scripting"] }

Input: "National Cybersecurity CTF Competition 2025"
Output: { "skills": ["Cybersecurity", "Network Security", "Cryptography", "Problem Solving", "Penetration Testing"] }

Return format: { "skills": ["Skill1", "Skill2", "Skill3", ...] }
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
  * Calls the configured AI provider to generate 2-3 realistic courses for a given skill tag.
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
    const text = await generateText(prompt);

    // Strip any accidental markdown fences the model might wrap around the JSON
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

    console.log(`[ai-client] Generated ${valid.length} course(s) for tag: "${tag}"`);
    return valid;
  } catch (err) {
    // Non-fatal: log and return empty so the caller can continue
    console.error(`[ai-client] generateCoursesForTag failed for "${tag}":`, err);
    return [];
  }
}
