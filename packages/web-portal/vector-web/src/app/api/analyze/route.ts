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
// Extract deeper context from any W3C credentials concurrently
    const dynamicSkillsPromises = dbCredentials
      .filter(cred => 
        cred.schema_url && 
        cred.credential_data && 
        !cred.schema_url.includes('undefined') // 🛡️ Skip broken legacy records
      )
      .map(cred => {
        // 🛠️ Construct Absolute URL if relative, and ensure protocol exists
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
    // ---------------------------------------------

    const verifiedNames = dbCredentials.map(c => c.skill_name);
    const selfReportedNames = student?.self_reported_skills.map(s => s.skill_name) || [];
    
    // Merge standard skill names, override parameters, and the deep W3C extractions
    let allSkills = Array.from(new Set([
      ...skillsOverride,
      ...verifiedNames,
      ...selfReportedNames,
      ...dynamicW3CSkills
    ]));

    // Fallback logic
    if (allSkills.length === 0) {
        const monitored = await prisma.monitored_keywords.findMany({ 
            where: { is_active: true },
            take: 5 
        });
        allSkills = monitored.length > 0 ? monitored.map(k => k.keyword) : ['React', 'Node.js', 'Solidity'];
    }

    const marketHistoryRaw = await prisma.market_snapshots.findMany({
      where: { skill_name: { in: allSkills } },
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