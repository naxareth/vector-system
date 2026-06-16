import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: userData } = await supabase.from('users').select('role, full_name').eq('id', user.id).single();
  if (userData?.role !== 'student') {
      return NextResponse.json({ error: 'Only students can apply' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const job = await prisma.job_postings.findUnique({
      where: { id },
      include: { employer: true }
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const application = await prisma.job_applications.create({
      data: {
        job_id: id,
        student_id: user.id,
        cvr_export_id: body.cvr_export_id,
        cover_note: body.cover_note,
        status: 'pending'
      }
    });

    // Create notification for employer
    await prisma.notifications.create({
      data: {
        user_id: job.employer.user_id,
        title: 'New Job Application',
        message: `${userData.full_name || 'A student'} applied for ${job.title}`,
        type: 'application',
        link_url: `/employer/postings/${id}/applications`
      }
    });

    return NextResponse.json(application);
  } catch (error: any) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'You have already applied for this job' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
