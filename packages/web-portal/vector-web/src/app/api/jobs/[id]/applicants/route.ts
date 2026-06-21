import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    
    // Ensure the user owns the job
    const job = await prisma.job_postings.findUnique({
      where: { id },
      include: { employer: true }
    });

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.employer.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch applications
    const applications = await prisma.job_applications.findMany({
      where: { job_id: id },
      include: {
        student: {
          select: {
             id: true,
             full_name: true,
             email: true
          }
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Update application status
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
    const { id } = await params; // application id is passed in body, this is the job id
    const body = await req.json();
    const { application_id, status } = body;

    if (!application_id || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const VALID_STATUSES = ['pending', 'reviewing', 'accepted', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const application = await prisma.job_applications.findUnique({
      where: { id: application_id },
      include: { job: { include: { employer: true } } }
    });

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    if (application.job.id !== id) return NextResponse.json({ error: 'Mismatch' }, { status: 400 });
    if (application.job.employer.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.job_applications.update({
      where: { id: application_id },
      data: { status }
    });

    // Notify student of status change
    try {
      await prisma.notifications.create({
        data: {
          user_id: application.student_id,
          title: 'Application Status Updated',
          message: `Your application for ${application.job.title} is now ${status}`,
          type: 'application_update',
          link_url: '/student/applications'
        }
      });
    } catch (notifErr) {
      console.error('[applicants] Notification insert failed:', notifErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
