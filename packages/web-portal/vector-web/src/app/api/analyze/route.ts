import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🛠️ DEBUG: Check your server terminal to see what's actually arriving
    console.log("DEBUG: /api/analyze received body:", body);

    // Pick up the identifier from common keys
    const identifier = body.studentId || body.userId || body.id;

    if (!identifier) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'No identifier found (studentId or userId required)' 
      }, { status: 400 });
    }

    // 1. 🛡️ Flexible Fetch: Search by UUID (id) OR University ID (student_id)
    const student = await prisma.users.findFirst({
      where: {
        OR: [
          { id: identifier.length === 36 ? identifier : undefined }, // Only check UUID if it matches length
          { student_id: identifier }
        ]
      },
      include: {
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    // Strategy: If user is missing from DB, we treat them as a "Guest" for the demo
    const verifiedNames = student?.verified_credentials.map(c => c.skill_name) || [];
    const selfReportedNames = student?.self_reported_skills.map(s => s.skill_name) || [];
    
    let allSkills = body.skillsOverride?.length > 0 
      ? body.skillsOverride 
      : Array.from(new Set([...verifiedNames, ...selfReportedNames]));

    // 🚀 Fallback to Monitored Keywords so the chart isn't empty
    if (allSkills.length === 0) {
        const monitored = await prisma.monitored_keywords.findMany({ 
            where: { is_active: true },
            take: 5 
        });
        allSkills = monitored.length > 0 ? monitored.map(k => k.keyword) : ['React', 'Node.js', 'Solidity'];
    }

    // 2. Fetch Market History
    const marketHistoryRaw = await prisma.market_snapshots.findMany({
      where: { skill_name: { in: allSkills } },
      orderBy: { recorded_at: 'asc' }
    });

    // Process History for the Graph
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
        credentials: student?.verified_credentials || []
      }, 
      marketData: marketHistoryRaw, 
      resumeText: body.resumeText || "" 
    });

    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        history: Object.values(chartDataMap),
        credentials: student?.verified_credentials || [] 
      }
    });

  } catch (error) {
    console.error('AI Analysis Route Failed:', error);
    return NextResponse.json({ status: 'error', message: 'Internal analysis failure' }, { status: 500 });
  }
}