import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored for SSR
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const applications = await prisma.job_applications.findMany({
      where: {
        student_id: user.id
      },
      include: {
        job: {
          include: {
            employer: true
          }
        }
      },
      orderBy: {
        applied_at: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.job_applications.count({
      where: {
        student_id: user.id
      }
    });

    return NextResponse.json({
      applications: applications.map((app) => ({
        id: app.id,
        status: app.status,
        applied_at: app.applied_at,
        job_posting: {
          id: app.job.id,
          title: app.job.title,
          location: app.job.location,
          job_type: app.job.job_type,
          employer: app.job.employer ? {
             company_name: app.job.employer.company_name,
             logo_url: app.job.employer.logo_url
          } : { company_name: 'Unknown Employer', logo_url: null }
        }
      })),
      total
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
