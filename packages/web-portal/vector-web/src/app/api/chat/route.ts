import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 1. UPDATE SCHEMA: Expect 'userId' instead of 'studentId'
// We also use .passthrough() to allow extra fields like 'context' without crashing
const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  userId: z.string().uuid("Invalid User ID format"), 
}).passthrough();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 2. Validate
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation Failed:", validation.error.format()); // Log the error so you can see it
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { message, userId } = validation.data;

    // 3. Fetch User by ID (UUID) - Much safer than student_id
    const student = await prisma.users.findUnique({
      where: { id: userId }, // <--- Changed from student_id
      include: {
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // ... (Keep the rest of the Market Data & Gemini logic exactly the same) ...
    // 4. Fetch Recent Market Snapshots
    const rawMarketData = await prisma.market_snapshots.findMany({
      where: {
        recorded_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { recorded_at: 'desc' },
      take: 100 
    });

    const marketMap: Record<string, number> = {};
    rawMarketData.forEach(record => {
      if (!marketMap[record.skill_name]) marketMap[record.skill_name] = record.job_count;
    });

    const marketContextList = Object.entries(marketMap)
      .map(([skill, count]) => `- ${skill}: ${count} active job postings`)
      .join('\n');

    const skillsList = [
      ...student.verified_credentials.map(c => c.skill_name + " (Verified)"),
      ...student.self_reported_skills.map(s => s.skill_name + " (Self-Reported)")
    ].join(', ');

    const systemContext = `
      You are 'Vector', an AI Career Coach for a student named ${student.full_name || "Student"}.
      === STUDENT PROFILE ===
      Skills: ${skillsList || "None yet"}
      === MARKET DATA ===
      ${marketContextList || "No data available."}
      === GOAL ===
      Help them interpret their data. Compare their skills to market demand.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemContext }] },
        { role: "model", parts: [{ text: "I am ready to help." }] },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ reply: response });

  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}