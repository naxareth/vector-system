import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { submission_id, confirmed_data } = body;

  if (!submission_id || !confirmed_data) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const submission = await prisma.credential_submissions.findUnique({
    where: { id: submission_id },
  });

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 });
  }

  if (submission.status !== 'ai_reviewed') {
    return NextResponse.json({ error: 'Submission is not in a reviewable state' }, { status: 400 });
  }

  // Check for duplicates
  const skills: string[] = confirmed_data.skills || [];
  if (skills.length > 0) {
    const duplicates = await prisma.verified_credentials.findMany({
      where: {
        user_id: user.id,
        skill_name: { in: skills }
      }
    });

    if (duplicates.length > 0) {
      // The instructions say: "If found, return 409 with warning"
      // Wait, is it a hard block or a warning? The instruction says: "If duplicate found, return 409 with warning"
      // "Handle 409 duplicate response: show modal 'This credential may already exist: {skill_name}. Submit anyway?'"
      // To allow bypass, the client could pass `ignore_duplicates: true`.
      if (!body.ignore_duplicates) {
        return NextResponse.json({ 
          error: "Duplicate credential detected", 
          duplicates: duplicates.map(d => d.skill_name) 
        }, { status: 409 });
      }
    }
  }

  await prisma.credential_submissions.update({
    where: { id: submission.id },
    data: {
      extracted_data: confirmed_data,
      status: 'pending' // awaiting registrar
    }
  });

  // Notify all registrars
  const registrars = await prisma.users.findMany({
    where: { role: 'registrar' },
    select: { id: true }
  });

  if (registrars.length > 0) {
    await prisma.notifications.createMany({
      data: registrars.map(r => ({
        user_id: r.id,
        title: 'New Credential Submission',
        message: `${profile.full_name || 'A student'} submitted a ${confirmed_data.credential_type || 'credential'} for review`,
        type: 'submission',
        link_url: '/registrar/dashboard',
      }))
    });
  }

  return NextResponse.json({ status: 'pending', message: 'Submitted for institutional review' });
}
