import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { analyzeStudentProfile } from '../../../../../../ai-engine/src/index'; 

export async function POST(req: Request) {
  try {
    // 1. Validation
    const text = await req.text();
    if (!text) return NextResponse.json({ status: 'error', message: 'Empty request' }, { status: 400 });
    
    const body = JSON.parse(text);
    const { studentId, resumeText } = body;

    if (!studentId) {
      return NextResponse.json({ status: 'error', message: 'Student ID required' }, { status: 400 });
    }

    // 2. Fetch Student Data (Raw DB Format)
    const student = await prisma.users.findUnique({
      where: { student_id: studentId },
      include: {
        verified_credentials: true, // DB Field 1
        self_reported_skills: true  // DB Field 2
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
    // 🛠️ Transform DB Data -> AI Data
    // We combine Verified Credentials + Self-Reported Skills into one list
    // ============================================================
    
    // Extract skill names from verified credentials
    const verifiedNames = student.verified_credentials.map(c => c.skill_name);
    
    // Extract skill names from self-reported skills
    const selfReportedNames = student.self_reported_skills.map(s => s.skill_name);

    // Combine them into a single array for the AI
    const allSkills = [...verifiedNames, ...selfReportedNames];

    // Create a clean object that matches what the AI expects
    const aiInput = {
      id: student.student_id || "unknown",
      name: student.full_name || "Student",
      skills: allSkills, // <--- The AI Engine is looking for THIS
      credentials: student.verified_credentials
    };

    // 4. Call AI Engine with the CLEAN object
    const analysisResult = await analyzeStudentProfile({
      studentData: aiInput, 
      marketData: marketHistory,
      resumeText: resumeText || "" 
    });

    // 5. Return Intelligence + RAW CREDENTIALS
    return NextResponse.json({
      status: 'success',
      data: {
        ...analysisResult,
        // ✅ CRITICAL ADDITION: Pass the raw DB credentials to the frontend
        credentials: student.verified_credentials 
      }
    });

  } catch (error) {
    console.error('AI Analysis Failed:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}