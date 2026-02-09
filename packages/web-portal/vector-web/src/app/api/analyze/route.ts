import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 

export async function POST(req: Request) {
  try {
    // 1. Validation
    const text = await req.text();
    if (!text) return NextResponse.json({ status: 'error', message: 'Empty request' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { studentId, resumeText, skillsOverride } = body;

    if (!studentId) {
      return NextResponse.json({ status: 'error', message: 'Student ID required' }, { status: 400 });
    }

    // 2. Fetch Student Data
    const student = await prisma.users.findUnique({
      where: { student_id: studentId },
      include: {
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    if (!student) {
      return NextResponse.json({ status: 'error', message: 'Student not found' }, { status: 404 });
    }

    // ============================================================
    // 🛠️ DATA MERGE STRATEGY (UPDATED FOR DEMO)
    // ============================================================
    let allSkills: string[] = [];

    if (skillsOverride && Array.isArray(skillsOverride) && skillsOverride.length > 0) {
      allSkills = skillsOverride;
    } else {
      const verifiedNames = student.verified_credentials.map(c => c.skill_name);
      const selfReportedNames = student.self_reported_skills.map(s => s.skill_name);
      allSkills = [...verifiedNames, ...selfReportedNames];
    }

    // 🚀 FORCE FIX: If still empty, fetch ALL monitored skills so the graph isn't empty
    if (allSkills.length === 0) {
        console.log("⚠️ No student skills found. Defaulting to Global Market View.");
        const monitored = await prisma.monitored_keywords.findMany({
            where: { is_active: true },
            select: { keyword: true }
        });
        
        if (monitored.length > 0) {
            allSkills = monitored.map(k => k.keyword);
        } else {
            // Ultimate fallback if DB is empty
            allSkills = ['React', 'Solidity', 'Python', 'Node.js', 'Cybersecurity'];
        }
    }

    // 3. Fetch Market History (Last 30 Days)
    const marketHistoryRaw = await prisma.market_snapshots.findMany({
      where: {
        skill_name: { in: allSkills },
        recorded_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { recorded_at: 'asc' }
    });

    // Process for Chart
    const chartDataMap: Record<string, any> = {};
    marketHistoryRaw.forEach(record => {
      const dateKey = new Date(record.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = { date: dateKey };
      }
      chartDataMap[dateKey][record.skill_name] = record.job_count;
    });

    const chartHistory = Object.values(chartDataMap);

    // 4. Create AI Input
    const aiInput = {
      id: student.student_id || "unknown",
      name: student.full_name || "Student",
      skills: allSkills, 
      credentials: student.verified_credentials
    };

    // 5. Call AI Engine
    const analysisResult = await analyzeStudentProfile({
      studentData: aiInput, 
      marketData: marketHistoryRaw, 
      resumeText: resumeText || "" 
    });

    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        history: chartHistory,
        credentials: student.verified_credentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Failed:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}