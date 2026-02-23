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
        errors: result.error.errors 
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
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    const dbCredentials = student?.verified_credentials || [];

    // --- PHASE 5: AI Dynamic Schema Extraction ---
    const dynamicSkillsPromises = dbCredentials
      .filter(cred => 
        cred.schema_url && 
        cred.credential_data && 
        !cred.schema_url.includes('undefined')
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

    const verifiedNames = dbCredentials.map(c => c.skill_name);
    const selfReportedNames = student?.self_reported_skills.map(s => s.skill_name) || [];
    
    let allSkills = Array.from(new Set([
      ...skillsOverride,
      ...verifiedNames,
      ...selfReportedNames,
      ...dynamicW3CSkills
    ]));

    if (allSkills.length === 0) {
        const monitored = await prisma.monitored_keywords.findMany({ 
            where: { is_active: true },
            take: 5 
        });
        allSkills = monitored.length > 0 ? monitored.map(k => k.keyword) : ['React', 'Node.js', 'Solidity'];
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
      const dateKey = new Date(record.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        history: Object.values(chartDataMap),
        credentials: dbCredentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Route Failed:', error);
    return NextResponse.json({ status: 'error', message: 'Internal analysis failure' }, { status: 500 });
  }
}