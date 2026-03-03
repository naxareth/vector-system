import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/db';
import { genAI, GEMINI_MODEL } from '@/lib/gemini'; // 🛡️ Centralized Gemini (Checkpoint #2)
import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /api/cvr/analyze
//
// Authenticated endpoint. Accepts a CVR snapshot, enriches it with
// skill_health_cache market data, and returns structured Gemini feedback:
//   - overallScore, summary
//   - skillStrength (strong / moderate / weak buckets)
//   - marketAlignment (score + insight)
//   - missingKeywords (3–6 high-demand gaps)
//   - recommendations (3 actionable next steps)
//
// Consumes 1 Gemini RPD per call. No caching — always fresh analysis.
// 🛡️ SECURITY (Checkpoint #2): Uses centralized Gemini client from @/lib/gemini
// ---------------------------------------------------------------------------

const analyzeRequestSchema = z.object({
  snapshot: z.record(z.string(), z.any()),
});

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Auth
  // -------------------------------------------------------------------------
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // 2. Parse + validate body
  // -------------------------------------------------------------------------
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = analyzeRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.format() },
      { status: 400 }
    );
  }

  const { snapshot } = validation.data;

  // -------------------------------------------------------------------------
  // 3. Enrich with skill_health_cache market data
  //    skill_tags are the canonical market keywords; fall back to skill names
  // -------------------------------------------------------------------------
  const skills: { id: string; name: string; verified: boolean }[] =
    snapshot.skills || [];

  const skillNames = skills.map((s) => s.name).filter(Boolean);

  let healthData: {
    skill_name: string;
    health_score: number | null;
    trend_label: string | null;
    job_count: number | null;
    avg_salary: any;
    confidence: string | null;
  }[] = [];

  if (skillNames.length > 0) {
    try {
      healthData = await prisma.skill_health_cache.findMany({
        where: { skill_name: { in: skillNames } },
        select: {
          skill_name: true,
          health_score: true,
          trend_label: true,
          job_count: true,
          avg_salary: true,
          confidence: true,
        },
      });
    } catch (err) {
      // Non-fatal — analysis proceeds without market enrichment
      console.warn('[cvr/analyze] skill_health_cache fetch failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Build Gemini prompt context
  // -------------------------------------------------------------------------
  const skillsContext = skills
    .map((s) => {
      const health = healthData.find((h) => h.skill_name === s.name);
      let line = `- ${s.name} (${s.verified ? 'Blockchain Verified' : 'Self-reported'})`;
      if (health) {
        line += ` → Health: ${health.health_score ?? 'N/A'}/100`;
        line += `, Trend: ${health.trend_label ?? 'unknown'}`;
        line += `, Open Jobs: ${health.job_count ?? 'N/A'}`;
        if (health.avg_salary) {
          const salary = Math.round(Number(health.avg_salary)).toLocaleString();
          line += `, Avg Salary: $${salary}`;
        }
        line += ` (data confidence: ${health.confidence ?? 'low'})`;
      } else {
        line += ' → No market data available';
      }
      return line;
    })
    .join('\n');

  const titleCtx = snapshot.title ? `Professional Title: ${snapshot.title}` : '';
  const summaryCtx = snapshot.summary
    ? `Professional Summary: ${snapshot.summary}`
    : '';
  const experienceCtx =
    Array.isArray(snapshot.experience) && snapshot.experience.length > 0
      ? `Work Experience: ${snapshot.experience
        .map((e: any) =>
          [e.title, e.company].filter(Boolean).join(' at ')
        )
        .filter(Boolean)
        .join('; ')}`
      : '';
  const projectsCtx =
    Array.isArray(snapshot.projects) && snapshot.projects.length > 0
      ? `Projects: ${snapshot.projects
        .map((p: any) => p.title)
        .filter(Boolean)
        .join('; ')}`
      : '';
  const certsCtx =
    Array.isArray(snapshot.certifications) && snapshot.certifications.length > 0
      ? `Other Certifications: ${snapshot.certifications
        .map((c: any) => c.name)
        .filter(Boolean)
        .join('; ')}`
      : '';
  const educationCtx =
    Array.isArray(snapshot.education) && snapshot.education.length > 0
      ? `Education: ${snapshot.education
        .map((e: any) => [e.degree, e.school].filter(Boolean).join(' — '))
        .filter(Boolean)
        .join('; ')}`
      : '';

  const profileLines = [titleCtx, summaryCtx, educationCtx, experienceCtx, projectsCtx, certsCtx]
    .filter(Boolean)
    .join('\n');

  const prompt = `
You are an expert career advisor AI analyzing a student's Credential Verified Resume (CVR).
Blockchain-verified skills carry on-chain proof of completion and are significantly more valuable to employers than self-reported skills.

=== STUDENT CVR PROFILE ===
${profileLines || 'No profile details provided.'}

=== SKILLS WITH LIVE MARKET DATA ===
${skillsContext || 'No skills listed.'}

=== ANALYSIS INSTRUCTIONS ===
Return a single raw JSON object with EXACTLY this structure. No markdown, no code fences, no preamble — raw JSON only:

{
  "overallScore": <integer 0–100, holistic CVR strength based on skills, market alignment, and profile completeness>,
  "summary": "<2–3 sentence assessment of this student's profile strengths and primary opportunity area>",
  "skillStrength": {
    "strong": ["<skill name>"],
    "moderate": ["<skill name>"],
    "weak": ["<skill name>"]
  },
  "marketAlignment": {
    "score": <integer 0–100, how well their verified skills match current market demand>,
    "insight": "<1–2 sentences on market alignment, referencing specific job counts or salary data where available>"
  },
  "missingKeywords": ["<keyword>", "<keyword>", "<keyword>"],
  "recommendations": [
    "<specific, actionable recommendation #1>",
    "<specific, actionable recommendation #2>",
    "<specific, actionable recommendation #3>"
  ]
}

Rules:
- skillStrength: classify each skill from the student's list into exactly one bucket. Base this on health_score (>= 70 = strong, 40–69 = moderate, < 40 = weak). If no market data, default to moderate.
- missingKeywords: 3–6 high-demand skills/technologies that are ABSENT from their profile and would strengthen their market position given their existing skill set and career title.
- recommendations: exactly 3, concrete and specific. Reference their actual skills and market data where relevant.
- overallScore: penalise heavily for self-reported-only skills vs blockchain-verified, and for skills with declining trends.
`;

  // -------------------------------------------------------------------------
  // 5. Call Gemini and parse structured response
  // -------------------------------------------------------------------------
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?|```$/gm, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[cvr/analyze] JSON parse failed. Raw response:', raw);
      return NextResponse.json(
        { error: 'Analysis returned an unexpected format. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err: any) {
    console.error('[cvr/analyze] Gemini error:', err);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again later.' },
      { status: 500 }
    );
  }
}