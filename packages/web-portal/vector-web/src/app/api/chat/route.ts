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

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // 2. Construct System Prompt
    const skillsList = [
      ...student.verified_credentials.map(c => c.skill_name + " (Verified)"),
      ...student.self_reported_skills.map(s => s.skill_name + " (Self-Reported)")
    ].join(', ');

    const systemContext = `
      You are 'Vector', an AI Career Coach for a student named ${student.full_name}.
      
      THE STUDENT'S PROFILE:
      - Skills: ${skillsList}
      
      YOUR GOAL:
      The student is looking at their Career Intelligence Report.
      Help them interpret the data. If they ask about skill trends, explain why certain tech (like React/Python) is rising while others (PHP/jQuery) are falling.
      Keep answers concise, encouraging, and action-oriented.
    `;

    // 3. Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemContext }] },
        { role: "model", parts: [{ text: "I am ready to coach the student." }] },
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