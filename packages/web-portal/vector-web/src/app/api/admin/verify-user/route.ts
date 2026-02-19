import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const { targetUserId, newRole } = await req.json();

  // 1. Initialize Supabase with Master Key (Service Role)
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
    // 2. Auth Check: Verify who is clicking the button
    const { data: { user: requestor } } = await supabase.auth.getUser();
    if (!requestor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: actorProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', requestor.id)
      .single();

    if (actorProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin only.' }, { status: 403 });
    }

    // 3. Execute the Database Function (RPC)
    // This bypasses the casting issues that caused the "0 rows changed" error
    const { error: rpcError } = await supabase.rpc('verify_and_promote_user', {
      target_user_id: targetUserId,
      new_role_text: newRole
    });

    if (rpcError) {
      console.error("Database Function Error:", rpcError);
      return NextResponse.json({ error: 'Update failed in database', details: rpcError }, { status: 500 });
    }

    // 4. AUDIT: Only log if the database actually updated
    await recordAuditLog(supabase, {
      actorId: requestor.id,
      targetId: targetUserId,
      action: 'ROLE_CHANGE',
      description: `Promoted user to ${newRole.toUpperCase()}`,
    });

    return NextResponse.json({ 
      success: true, 
      message: `User ${targetUserId} is now ${newRole} (Active)`
    });

  } catch (err: any) {
    console.error("Critical API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}