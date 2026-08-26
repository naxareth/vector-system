import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
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
    const { id, appId } = await params;

    // 1. Verify job ownership
    const job = await prisma.job_postings.findUnique({
      where: { id },
      include: { employer: true }
    });

    if (!job) return NextResponse.json({ error: 'Job posting not found' }, { status: 404 });
    if (job.employer.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch application
    const application = await prisma.job_applications.findUnique({
      where: { id: appId },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            email: true,
          }
        }
      }
    });

    if (!application || application.job_id !== id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // 3. Fetch CVR export snapshot if exists
    let cvrExport = null;
    if (application.cvr_export_id) {
      cvrExport = await prisma.cvr_exports.findUnique({
        where: { id: application.cvr_export_id },
        select: {
          id: true,
          template: true,
          credential_ids: true,
          snapshot: true,
          generated_at: true,
        }
      });
    }

    // 4. Calculate skill matching score
    const requiredSkills = job.required_skills || [];
    const credentials = await prisma.verified_credentials.findMany({
      where: { user_id: application.student.id },
      select: { skill_tags: true }
    });

    const studentSkills = Array.from(new Set(credentials.flatMap(c => c.skill_tags || [])));
    const matchedSkills = requiredSkills.filter(s =>
      studentSkills.some(ss => ss.toLowerCase() === s.toLowerCase())
    );
    const missingSkills = requiredSkills.filter(s =>
      !studentSkills.some(ss => ss.toLowerCase() === s.toLowerCase())
    );
    const matchScore = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0;
    const isVerified = credentials.length > 0;

    return NextResponse.json({
      application,
      jobTitle: job.title,
      matchScore,
      matchedSkills,
      missingSkills,
      isVerified,
      cvrExport
    });
  } catch (error) {
    console.error('[API Single Applicant]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
