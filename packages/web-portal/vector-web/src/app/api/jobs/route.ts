import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().optional().nullable(),
  job_type: z.string().optional().nullable(),
  salary_range: z.string().optional().nullable(),
  required_skills: z.array(z.string()).default([]),
  preferred_skills: z.array(z.string()).default([]),
  status: z.string().default('active'),
  expires_at: z.string().optional().nullable()
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const skillsParam = searchParams.get('skills');
  const location = searchParams.get('location');
  const job_type = searchParams.get('job_type');
  const employer_id = searchParams.get('employer_id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'active' };

  if (skillsParam) {
    const skills = skillsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (skills.length > 0) {
      where.required_skills = { hasSome: skills };
    }
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (job_type) {
    where.job_type = job_type;
  }

  // Support querying by employer user ID
  if (employer_id) {
    where.employer = { user_id: employer_id };
    delete where.status;
  }

  try {
    const [jobs, total] = await Promise.all([
      prisma.job_postings.findMany({
        where,
        include: { 
           employer: true,
           _count: { select: { applications: true } }
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.job_postings.count({ where })
    ]);

    return NextResponse.json({ jobs, total, page });
  } catch (error) {
    console.error('[GET /api/jobs error]:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const userData = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true, full_name: true, email: true }
    });

    if (userData?.role !== 'employer' && userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Employer access required.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = jobSchema.parse(body);
    
    let employerProfile = await prisma.employer_profiles.findUnique({
      where: { user_id: user.id }
    });
    
    // Auto-create basic profile if user is employer but profile record is missing
    if (!employerProfile) {
      try {
        employerProfile = await prisma.employer_profiles.create({
          data: {
            user_id: user.id,
            company_name: userData?.full_name || 'Company',
          }
        });
      } catch (profileErr) {
        console.error('Failed to auto-create employer profile:', profileErr);
        return NextResponse.json({ error: 'Employer profile required. Please complete your profile first.' }, { status: 400 });
      }
    }

    const job = await prisma.job_postings.create({
      data: {
        employer_id: employerProfile.id,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location || null,
        job_type: parsed.job_type || 'Full-time',
        salary_range: parsed.salary_range || null,
        required_skills: parsed.required_skills,
        preferred_skills: parsed.preferred_skills,
        status: parsed.status || 'active',
        expires_at: parsed.expires_at ? new Date(parsed.expires_at) : null
      }
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('[POST /api/jobs error]:', error);
    if (error instanceof z.ZodError) {
      const flattened = error.flatten().fieldErrors;
      const firstMsg = Object.values(flattened).flat()[0] || 'Validation error';
      return NextResponse.json({ error: firstMsg, details: flattened }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create job posting' }, { status: 500 });
  }
}
