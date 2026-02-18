import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // 1. Initialize Supabase with SERVICE ROLE KEY
  // We need this high-level permission to bypass RLS and update the user's role.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  );

  try {
    // 2. SECURITY CHECK: Who is making this request?
    const { data: { user: requestor } } = await supabase.auth.getUser();

    if (!requestor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check the database to see if this user is actually a super_admin
    const { data: requestorProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', requestor.id)
      .single();

    if (requestorProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin privileges required.' }, { status: 403 });
    }

    // 3. EXECUTE: Get the data and perform the update
    const { targetUserId, newRole } = await req.json();

    // Validate the role to prevent injection of invalid roles
    const validRoles = ['student', 'registrar', 'super_admin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Update the user
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: newRole, 
        status: 'active' // Automatically activate them upon role change
      })
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    // 4. AUDIT: Log the action
    await recordAuditLog(supabase, {
      actorId: requestor.id,
      targetId: targetUserId,
      action: 'ROLE_CHANGE',
      description: `Promoted user to ${newRole}`,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Admin API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}