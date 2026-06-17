import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const useAI = url.searchParams.get('ai') === 'true';

    // 1. Fetch student's verified skill tags
    const creds = await prisma.verified_credentials.findMany({
      where: { user_id: user.id, revoked: false },
      select: { skill_tags: true, skill_name: true }
    });

    const studentSkills = new Set(
      creds.flatMap(c => [...c.skill_tags, c.skill_name]).map(s => s.toLowerCase().trim())
    );

    const jobId = url.searchParams.get('jobId');

    // 2. Fetch active jobs
    const jobs = await prisma.job_postings.findMany({
      where: { status: 'open', ...(jobId ? { id: jobId } : {}) },
      include: { 
         employer: true, 
         _count: { select: { applications: true } } 
      }
    });

    // 3. Score each job
    let scored = jobs.map(job => {
      const required = job.required_skills.map(s => s.toLowerCase().trim());
      const matched = required.filter(s => studentSkills.has(s));
      const missing = required.filter(s => !studentSkills.has(s));
      return {
        job: {
          ...job,
          employer: {
             company_name: job.employer.company_name,
             logo_url: job.employer.logo_url
          }
        },
        matchScore: required.length > 0 ? matched.length / required.length : 0,
        matchedSkills: matched,
        missingSkills: missing,
      };
    }).filter(m => jobId ? true : m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    // 4. If AI mode, generate insights for top 5
    if (useAI) {
      scored = await Promise.all(scored.map(async (match, idx) => {
        if (idx >= 5) return match; // Only top 5
        
        try {
          const prompt = `
          Given a student with these verified skills: ${[...studentSkills].join(', ')}
          And a job titled "${match.job.title}" requiring: ${match.job.required_skills.join(', ')}
          
          In 2 short sentences, explain why this student is a good fit and what skills they should develop.
          Be specific, professional, and encouraging. Return plain text only.
          `;
          
          const { text } = await generateText({
            model: google('gemini-1.5-pro'),
            prompt
          });
          
          return { ...match, aiInsight: text.trim() };
        } catch (e) {
          console.error('Failed to generate AI insight', e);
          return match;
        }
      }));
    }

    return NextResponse.json({ matches: scored });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
