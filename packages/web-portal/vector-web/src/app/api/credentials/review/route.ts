import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export async function GET() {
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'registrar' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const submissions = await prisma.credential_submissions.findMany({
      where: {
        status: { in: ['pending', 'ai_reviewed'] }
      },
      include: {
        student: {
          select: {
            full_name: true,
            email: true,
            student_id: true,
          }
        }
      },
      orderBy: { fraud_score: 'desc' }
    });

    const formatted = submissions.map(sub => ({
      id: sub.id,
      student_name: sub.student?.full_name || 'Unknown',
      student_email: sub.student?.email || 'Unknown',
      student_id: sub.student?.student_id || 'Unknown',
      file_name: sub.file_name,
      file_url: sub.file_url,
      extracted_data: sub.extracted_data,
      fraud_flags: sub.fraud_flags,
      fraud_score: sub.fraud_score,
      email_domain_match: sub.email_domain_match,
      status: sub.status,
      created_at: sub.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const reviewSchema = z.object({
  submission_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(req: Request) {
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'registrar' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = reviewSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input data', details: parseResult.error }, { status: 400 });
  }

  const { submission_id, action, notes } = parseResult.data;

  try {
    const submission = await prisma.credential_submissions.findUnique({
      where: { id: submission_id },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending' && submission.status !== 'ai_reviewed') {
      return NextResponse.json({ error: 'Submission is no longer pending' }, { status: 400 });
    }

    interface ExtractedData {
      skills?: string[];
      credential_number?: string;
      credential_type?: string;
      institution_name?: string;
      [key: string]: unknown;
    }
    const extractedData = (submission.extracted_data as ExtractedData) || {};

    if (action === 'approve') {
      // 1. Create verified_credentials
      const skills: string[] = extractedData.skills || [];
      
      const credentialPromises = skills.map(skill => 
        prisma.verified_credentials.create({
          data: {
            user_id: submission.user_id,
            skill_name: skill,
            skill_tags: [skill],
            issuer_did: `did:vector:registrar:${user.id}`,
            certificate_number: extractedData.credential_number || null,
            credential_data: extractedData,
          }
        })
      );

      await Promise.all(credentialPromises);

      // 2. Update submission
      await prisma.credential_submissions.update({
        where: { id: submission_id },
        data: {
          status: 'approved',
          reviewer_id: user.id,
          reviewed_at: new Date(),
          reviewer_notes: notes,
        }
      });

      // 3. Notify student
      await prisma.notifications.create({
        data: {
          user_id: submission.user_id,
          title: 'Credential Verified! ✓',
          message: `Your ${extractedData.credential_type || 'credential'} from ${extractedData.institution_name || 'the institution'} has been verified.`,
          type: 'info',
          link_url: '/student/credentials',
        }
      });

    } else if (action === 'reject') {
      // 1. Update submission
      await prisma.credential_submissions.update({
        where: { id: submission_id },
        data: {
          status: 'rejected',
          reviewer_id: user.id,
          reviewed_at: new Date(),
          reviewer_notes: notes,
        }
      });

      // 2. Notify student
      await prisma.notifications.create({
        data: {
          user_id: submission.user_id,
          title: 'Credential Rejected ✗',
          message: `Your ${extractedData.credential_type || 'credential'} submission was rejected. Reason: ${notes || 'Not provided'}`,
          type: 'info',
          link_url: '/student/credentials',
        }
      });
    }

    return NextResponse.json({ success: true, message: `Submission ${action}d successfully` });
  } catch (error) {
    console.error('Error processing review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
