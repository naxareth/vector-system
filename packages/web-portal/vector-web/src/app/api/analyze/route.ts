import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 
import { extractSkillsFromCredential } from '../../../../../../ai-engine/src/nlp/skill-extractor';
import { z } from 'zod';

// 🛡️ API Schema Validation: Define the expected shape of the request
const AnalyzeRequestSchema = z.object({
  studentId: z.string().optional(),
  userId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  resumeText: z.string().max(5000, "Resume text too long (max 5000 chars)").optional().default(""),
  skillsOverride: z.array(z.string()).optional().default([]),
});

// Helper: maps the AI trend string to a standardized status for skill_health_cache
function mapTrendToStatus(trend: string, healthScore: number): string {
  if (trend === 'growing' || trend === 'up') return 'Rising';
  if (trend === 'declining' || trend === 'down') return 'Decaying';
  // Even if trend is "stable", use health score to give a more useful label
  if (healthScore >= 65) return 'Stable';
  if (healthScore < 40) return 'Decaying';
  return 'Stable';
}

// Helper: derives a synthetic trend_slope float from health score + trend label
// This is used until we have enough market_snapshots to compute a real linear regression slope
// Range: roughly -1.0 (steep decline) to +1.0 (steep growth)
function deriveTrendSlope(trend: string, healthScore: number): number {
  const normalized = (healthScore - 50) / 50; // centers 50 → 0, 100 → 1, 0 → -1
  if (trend === 'growing' || trend === 'up') return Math.abs(normalized) * 0.8 + 0.1;
  if (trend === 'declining' || trend === 'down') return -(Math.abs(normalized) * 0.8 + 0.1);
  return normalized * 0.3; // stable: slight lean based on score
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    
    // 1. 🛡️ All inputs validated server-side (using Zod)
    const result = AnalyzeRequestSchema.safeParse(rawBody);
    
    if (!result.success) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Invalid request schema',
        errors: result.error.issues 
      }, { status: 400 });
    }

    const { studentId, userId, id, resumeText, skillsOverride } = result.data;

    // Pick up the identifier (prioritize studentId, then UUIDs)
    const identifier = studentId || userId || id;

    if (!identifier) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'No student identifier found' 
      }, { status: 400 });
    }

    // 2. 🛡️ Parameterized SQL queries (via Prisma)
    const student = await prisma.users.findFirst({
      where: {
        OR: [
          { id: identifier.length === 36 ? identifier : undefined },
          { student_id: identifier }
        ]
      },
      include: {
        verified_credentials: {
          where: { revoked: false }
        },
        self_reported_skills: true
      }
    });

    const dbCredentials = student?.verified_credentials || [];

    // --- PHASE 5: AI Dynamic Schema Extraction ---
    // Only extract via AI if the credential lacks explicit skill_tags
    const dynamicSkillsPromises = dbCredentials
      .filter(cred => 
        cred.schema_url && 
        cred.credential_data && 
        !cred.schema_url.includes('undefined') &&
        (!Array.isArray(cred.skill_tags) || cred.skill_tags.length === 0)
      )
      .map(cred => {
        let absoluteSchemaUrl = cred.schema_url!;
        
        if (absoluteSchemaUrl.startsWith('/')) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          absoluteSchemaUrl = `${baseUrl}${absoluteSchemaUrl}`;
        }

        return extractSkillsFromCredential(
          cred.credential_data as Record<string, any>, 
          absoluteSchemaUrl
        );
      });

    const dynamicSkillsArrays = await Promise.all(dynamicSkillsPromises);
    const dynamicW3CSkills = dynamicSkillsArrays.flat();

    // ✅ Phase 8: use skill_tags (marketable skills) instead of skill_name (credential title)
    // Falls back to skill_name only if tags are empty (e.g. pre-backfill records)
    const verifiedNames = dbCredentials.flatMap(c =>
      Array.isArray(c.skill_tags) && c.skill_tags.length > 0
        ? c.skill_tags
        : [c.skill_name]
    );
    const selfReportedNames = student?.self_reported_skills.map(s => s.skill_name) || [];
    
    let allSkills = Array.from(new Set([
      ...skillsOverride,
      ...verifiedNames,
      ...selfReportedNames,
      ...dynamicW3CSkills
    ]));

    // ✅ Phase 8 fix: if no skills found, return empty state instead of
    // falling back to random monitored keywords which produced misleading
    // generic recommendations unrelated to the student.
    if (allSkills.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: {
          skillHealth: [],
          recommendations: [],
          history: [],
          credentials: [],
          summary: 'No credentials found. Issue verified credentials to generate personalized insights.'
        }
      });
    }

    const marketHistoryRaw = await prisma.market_snapshots.findMany({
      where: {
        skill_name: { in: allSkills },
        recorded_at: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { recorded_at: 'asc' }
    });
    const chartDataMap: Record<string, any> = {};
    marketHistoryRaw.forEach(record => {
      const dateKey = new Date(record.recorded_at ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!chartDataMap[dateKey]) chartDataMap[dateKey] = { date: dateKey };
      chartDataMap[dateKey][record.skill_name] = record.job_count;
    });

    // 3. AI Intelligence Call
    const analysisResult = await analyzeStudentProfile({
      studentData: {
        id: student?.student_id || identifier,
        name: student?.full_name || "Guest Student",
        skills: allSkills, 
        credentials: dbCredentials
      }, 
      marketData: marketHistoryRaw, 
      resumeText: resumeText 
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. 💾 PERSIST to skill_health_cache (Phase 8)
    // skill_health_cache has a FK to monitored_keywords, so we must ensure
    // each skill exists in monitored_keywords before upserting the cache.
    // We do this fire-and-forget (no await on the outer block) so it never
    // delays the API response back to the student.
    // ─────────────────────────────────────────────────────────────────────────
    if (analysisResult?.skillHealth && Array.isArray(analysisResult.skillHealth)) {
      (async () => {
        try {
          const skillHealthData: Array<{ skillName: string; healthScore: number; trend: string }> = 
            analysisResult.skillHealth;

          // Step 4a: Upsert all skill names into monitored_keywords so the FK constraint is satisfied
          await prisma.monitored_keywords.createMany({
            data: skillHealthData.map(s => ({
              keyword: s.skillName,
              is_active: true,
            })),
            skipDuplicates: true, // Safe: won't overwrite existing category/is_active values
          });

          // Step 4b: Upsert each skill into skill_health_cache
          await Promise.all(
            skillHealthData.map(s =>
              prisma.skill_health_cache.upsert({
                where: { skill_name: s.skillName },
                create: {
                  skill_name: s.skillName,
                  status: mapTrendToStatus(s.trend, s.healthScore),
                  trend_slope: deriveTrendSlope(s.trend, s.healthScore),
                  last_updated: new Date(),
                },
                update: {
                  status: mapTrendToStatus(s.trend, s.healthScore),
                  trend_slope: deriveTrendSlope(s.trend, s.healthScore),
                  last_updated: new Date(),
                },
              })
            )
          );

          console.log(`[skill_health_cache] Persisted ${skillHealthData.length} skill(s)`);
        } catch (cacheErr) {
          // Non-fatal: log but don't surface to the user
          console.error('[skill_health_cache] Failed to persist cache:', cacheErr);
        }
      })();
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 5. Enrich each skillHealth item with trendSlope for the frontend
    // We enforce a realistic market distribution by comparing skills relatively.
    // The Gemini AI tends to be overly optimistic and label everything "growing".
    const sortedScoreObjects = [...(analysisResult?.skillHealth || [])].sort((a: any, b: any) => a.healthScore - b.healthScore);
    const p25Index = Math.max(0, Math.floor(sortedScoreObjects.length * 0.25) - 1);
    const p66Index = Math.min(sortedScoreObjects.length - 1, Math.floor(sortedScoreObjects.length * 0.66));
    const p25Score = sortedScoreObjects[p25Index]?.healthScore ?? 40;
    const p66Score = sortedScoreObjects[p66Index]?.healthScore ?? 70;

    const enrichedSkillHealth = (analysisResult?.skillHealth || []).map((s: any) => {
      let actualTrend = 'stable';
      if (sortedScoreObjects.length > 3) {
        if (s.healthScore <= p25Score) actualTrend = 'declining';
        else if (s.healthScore >= p66Score) actualTrend = 'growing';
      } else {
        if (s.healthScore < 50) actualTrend = 'declining';
        else if (s.healthScore > 70) actualTrend = 'growing';
      }

      return {
        ...s,
        trend: actualTrend,
        trendSlope: deriveTrendSlope(actualTrend, s.healthScore),
      };
    });

    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        skillHealth: enrichedSkillHealth,
        history: Object.values(chartDataMap),
        credentials: dbCredentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Route Failed:', error);
    return NextResponse.json({ status: 'error', message: 'Internal analysis failure' }, { status: 500 });
  }
}