import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { message, studentId } = await req.json();

    // 1. Fetch Student Context
    const student = await prisma.users.findUnique({
      where: { student_id: studentId },
      include: {
        verified_credentials: true,
        self_reported_skills: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. 🚀 NEW: Fetch Recent Market Snapshots (Last 7 Days)
    // We get the latest job counts to give the AI "Market Awareness"
    const rawMarketData = await prisma.market_snapshots.findMany({
      where: {
        recorded_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { recorded_at: 'desc' },
      take: 100 // Grab enough recent data points
    });

    // Deduplicate: Keep only the latest count for each skill
    const marketMap: Record<string, number> = {};
    rawMarketData.forEach(record => {
      if (!marketMap[record.skill_name]) {
        marketMap[record.skill_name] = record.job_count;
      }
    });

    // Format for AI prompt
    const marketContextList = Object.entries(marketMap)
      .map(([skill, count]) => `- ${skill}: ${count} active job postings`)
      .join('\n');

    // 3. Construct System Prompt
    const skillsList = [
      ...student.verified_credentials.map(c => c.skill_name + " (Verified)"),
      ...student.self_reported_skills.map(s => s.skill_name + " (Self-Reported)")
    ].join(', ');

    const systemContext = `
      You are 'Vector', an AI Career Coach for a student named ${student.full_name}.
      
      === STUDENT PROFILE ===
      Skills: ${skillsList || "None yet (Student is new)"}
      
      === REAL-TIME MARKET DATA (Job Openings right now) ===
      ${marketContextList || "No market data available currently."}
      
      === YOUR GOAL ===
      The student is looking at their Career Intelligence Report.
      Help them interpret the data. 
      
      GUIDELINES:
      1. COMPARE: Always compare their skills to the market data. (e.g., "You have React, which is huge right now with ${marketMap['React'] || 'many'} jobs.")
      2. RECOMMEND: If they lack a high-demand skill shown in the Market Data (like Python or Node.js), suggest they learn it.
      3. TONE: Professional, encouraging, and data-driven. Keep answers concise.
      4. FORMATTING: Use Markdown for bolding key terms (e.g., **React**, **+15%**) and lists.
    `;

    // 4. Call Gemini
    // Using gemini-1.5-flash for faster response times and lower latency
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemContext }] },
        { role: "model", parts: [{ text: "Understood. I have loaded the student's profile and the latest job market data. I am ready to advise." }] },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ reply: response });

  } catch (error) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}