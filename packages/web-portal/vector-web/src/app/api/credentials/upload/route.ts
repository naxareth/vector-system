import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden. Only students can upload credentials.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Request must be multipart/form-data with a file.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file attached.' }, { status: 400 });
  }

  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF, PNG, and JPG are allowed.' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'pdf';
  const uuid = uuidv4();
  const filePath = `${user.id}/${uuid}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('credential-uploads')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    // If bucket doesn't exist or RLS issue, we could fallback, but let's assume bucket exists
    return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from('credential-uploads')
    .getPublicUrl(filePath);

  const submission = await prisma.credential_submissions.create({
    data: {
      user_id: user.id,
      file_url: publicUrlData.publicUrl || filePath,
      file_name: file.name,
      file_type: file.type,
      status: 'pending',
    }
  });

  return NextResponse.json({ id: submission.id, status: 'pending' });
}
