import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// ---------------------------------------------------------------------------
// POST /api/cvr/export
//
// Authenticated endpoint. Called when a student generates a CVR.
// Saves a snapshot of the CVR data into cvr_exports and returns the UUID.
// That UUID is used as the credentialId in ExportCVRModal QR code,
// pointing to /verify/cvr/[id] instead of /verify/[id].
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Auth check
  // -------------------------------------------------------------------------
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // 2. Parse body
  // -------------------------------------------------------------------------
  let body: {
    template: string;
    credential_ids: string[];
    snapshot: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { template, credential_ids, snapshot } = body;

  if (!snapshot || typeof snapshot !== 'object') {
    return NextResponse.json({ error: 'snapshot is required.' }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 3. Insert into cvr_exports
  // -------------------------------------------------------------------------
  let cvrExport;
  try {
    cvrExport = await prisma.cvr_exports.create({
      data: {
        user_id: session.user.id,
        template: template || 'professional',
        credential_ids: credential_ids || [],
        snapshot,
      },
    });
  } catch (err) {
    console.error('[cvr/export] DB error:', err);
    return NextResponse.json({ error: 'Failed to save CVR export.' }, { status: 500 });
  }

  // -------------------------------------------------------------------------
  // 4. Return the new UUID
  // -------------------------------------------------------------------------
  return NextResponse.json({ id: cvrExport.id }, { status: 201 });
}