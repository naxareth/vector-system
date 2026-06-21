import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [employers, activeJobs, totalApplications, credentialsReviewed] = await Promise.all([
      prisma.employer_profiles.count(),
      prisma.job_postings.count({ where: { status: 'active' } }),
      prisma.job_applications.count(),
      prisma.credential_submissions.count({
        where: { status: { in: ['approved', 'rejected'] } }
      })
    ]);

    return NextResponse.json({
      employers,
      activeJobs,
      totalApplications,
      credentialsReviewed
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
