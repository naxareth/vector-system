import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateChat } from '@/lib/ai-provider'; // 🛡️ Centralized AI provider (Checkpoint #2)
import { z } from 'zod';


const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  userId: z.string().uuid("Invalid User ID format"),
}).passthrough();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      console.error("Validation Failed:", validation.error.format());
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { message, userId } = validation.data;

    // Fetch student profile
    const student = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        verified_credentials: true,
        self_reported_skills: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // PHASE 3: Rich market context — salary + locations from metadata JSONB
    //
    // Previously: only job_count per skill → flat list of counts
    // Now: most recent snapshot per skill includes salary range, avg salary,
    //      and top hiring locations so the AI provider can give salary-aware,
    //      location-specific career advice.
    //
    // Strategy: fetch the single most recent snapshot per skill (via distinct
    // on skill_name ordered by recorded_at desc) and read its metadata JSONB.
    // -------------------------------------------------------------------------
    const rawMarketData = await prisma.market_snapshots.findMany({
      where: {
        recorded_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { recorded_at: 'desc' },
      take: 30, // capped to keep prompt under free-tier TPM limits
    });

    // Deduplicate: keep only the most recent snapshot per skill
    // (findMany returns desc order so first occurrence = most recent)
    const seenSkills = new Set<string>();
    const latestPerSkill = rawMarketData.filter((record) => {
      if (seenSkills.has(record.skill_name)) return false;
      seenSkills.add(record.skill_name);
      return true;
    }).slice(0, 15); // cap context to stay under provider token limits

    // Build rich context string for each skill
    const marketContextList = latestPerSkill
      .map((record) => {
        const meta = (record.metadata as Record<string, unknown>) || {};

        // Job count line — always present
        let line = `- ${record.skill_name}: ${record.job_count} active job postings`;

        // Salary enrichment — from Adzuna metadata shape:
        // { average_salary, salary: { min, max, avg, currency }, ... }
        const salary = (meta.salary as Record<string, unknown>) || {};
        const avgSalary = (salary.avg || meta.average_salary) as number | undefined;
        const minSalary = salary.min as number | undefined;
        const maxSalary = salary.max as number | undefined;
        const currency = (salary.currency as string) || 'USD';

        if (avgSalary) {
          const avg = Math.round(avgSalary).toLocaleString();
          line += ` | avg salary: ${currency} ${avg}`;
        }
        if (minSalary && maxSalary) {
          const min = Math.round(minSalary).toLocaleString();
          const max = Math.round(maxSalary).toLocaleString();
          line += ` (range: ${min}–${max})`;
        }

        // Top locations enrichment — from metadata shape:
        // { top_locations: [{ location, count }] }
        const locations: { location: string; count: number }[] = (meta.top_locations as { location: string; count: number }[]) || [];
        if (locations.length > 0) {
          const topCities = locations
            .slice(0, 3)
            .map((l) => l.location)
            .join(', ');
          line += ` | top hiring: ${topCities}`;
        }

        return line;
      })
      .join('\n');

    // Student skills summary
    const skillsList = [
      ...student.verified_credentials.map((c) => c.skill_name + ' (Verified)'),
      ...student.self_reported_skills.map((s) => s.skill_name + ' (Self-Reported)'),
    ].join(', ');

    // -------------------------------------------------------------------------
    // System prompt — now salary-aware and location-specific
    // -------------------------------------------------------------------------
    const systemContext = `
      You are 'Vector', an AI Career Coach for a student named ${student.full_name || 'Student'}.

      === STUDENT PROFILE ===
      Skills: ${skillsList || 'None yet'}

      === MARKET DATA (last 7 days) ===
      Format per skill: job count | avg salary (range) | top hiring locations
      ${marketContextList || 'No data available.'}

      === GOAL ===
      Help them interpret their data. Compare their skills to market demand.
      When relevant, reference specific salary figures and locations from the
      market data above to give concrete, actionable career advice.
      If a student's verified skill has strong salary data, highlight it.
      If a skill has high demand in specific cities, mention those cities.
    `;

    const response = await generateChat([
      { role: 'system', content: systemContext },
      { role: 'assistant', content: 'I am ready to help.' },
      { role: 'user', content: message },
    ]);

    return NextResponse.json({ reply: response });
  } catch (error: unknown) {
    console.error('Chat Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
