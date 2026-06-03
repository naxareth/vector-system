import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RevokeSchema = z.object({
  credentialId: z.string().uuid(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // 1. Auth check - must be registrar
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {}
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is registrar or super_admin
    const currentUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (currentUser?.role !== 'registrar' && currentUser?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validate request payload
    const body = await req.json();
    const { credentialId } = RevokeSchema.parse(body);

    // 3. Fetch the credential to be revoked
    const credential = await prisma.verified_credentials.findUnique({
      where: { id: credentialId },
      include: { student: { select: { wallet_address: true } } },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (credential.revoked) {
      return NextResponse.json({ error: 'Credential is already revoked' }, { status: 400 });
    }

    // 4. Mark credential as revoked in database
    const updated = await prisma.verified_credentials.update({
      where: { id: credentialId },
      data: {
        revoked: true,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('[registrar/revoke-credential] POST error:', error);
    return NextResponse.json({ error: 'Failed to revoke credential' }, { status: 500 });
  }
}
