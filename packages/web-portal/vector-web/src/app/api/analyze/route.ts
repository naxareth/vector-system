import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 

export async function POST(req: Request) {
  try {
    // 1. Validation
    const text = await req.text();
    if (!text) return NextResponse.json({ status: 'error', message: 'Empty request' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { studentId, resumeText, skillsOverride } = body; // ✅ Added skillsOverride

    if (!studentId) {
      return NextResponse.json({ status: 'error', message: 'Student ID required' }, { status: 400 });
    }

    // 2. Fetch Student Data (Raw DB Format)
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

    // 3. Fetch Market History
    const marketHistory = await prisma.market_snapshots.findMany({
      orderBy: { recorded_at: 'asc' }
    });

    // ============================================================
    // 🛠️ DATA MERGE STRATEGY
    // If 'skillsOverride' is provided (from Client-Side Blockchain Read), use it.
    // Otherwise, fall back to what is currently in the Database.
    // ============================================================
    
    let allSkills: string[] = [];

    if (skillsOverride && Array.isArray(skillsOverride) && skillsOverride.length > 0) {
      console.log("⚡ Using Live Blockchain Skills for Analysis:", skillsOverride);
      allSkills = skillsOverride;
    } else {
      const verifiedNames = student.verified_credentials.map(c => c.skill_name);
      const selfReportedNames = student.self_reported_skills.map(s => s.skill_name);
      allSkills = [...verifiedNames, ...selfReportedNames];
    }

    // Create a clean object that matches what the AI expects
    const aiInput = {
      id: student.student_id || "unknown",
      name: student.full_name || "Student",
      skills: allSkills, 
      credentials: student.verified_credentials
    };

    // 4. Call AI Engine
    const analysisResult = await analyzeStudentProfile({
      studentData: aiInput, 
      marketData: marketHistory,
      resumeText: resumeText || "" 
    });

    // 5. Return Intelligence
    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        credentials: student.verified_credentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Failed:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}