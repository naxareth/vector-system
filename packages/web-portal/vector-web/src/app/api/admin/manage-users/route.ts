import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// RBAC helper — ensures the calling user is a super_admin
// ─────────────────────────────────────────────────────────────────────────────
async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { authorized: false as const, error: 'Unauthorized' };

  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== 'super_admin') return { authorized: false as const, error: 'Forbidden' };
  return { authorized: true as const, userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Archive / restore a user (soft-delete)
// Body: { targetUserId: string, action: 'archive' | 'restore' }
// ─────────────────────────────────────────────────────────────────────────────
const PatchSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['suspend', 'restore']),
});

export async function PATCH(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  try {
    const body = await req.json();
    const { targetUserId, action } = PatchSchema.parse(body);

    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    await prisma.users.update({
      where: { id: targetUserId },
      data: { status: newStatus as any },
    });

    // Log the action
    await prisma.audit_logs.create({
      data: {
        actor_id: auth.userId,
        action_type: action === 'suspend' ? 'user_suspended' : 'user_restored',
        target_id: targetUserId,
        description: `User ${action === 'suspend' ? 'suspended' : 'restored'} by admin`,
        metadata: { newStatus },
      },
    }).catch(() => {}); // non-fatal

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('[admin/manage-users] PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Hard-delete a user and cascade credentials
// Body: { targetUserId: string }
// ─────────────────────────────────────────────────────────────────────────────
const DeleteSchema = z.object({
  targetUserId: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.error === 'Unauthorized' ? 401 : 403 });

  try {
    const body = await req.json();
    const { targetUserId } = DeleteSchema.parse(body);

    // Prevent self-deletion
    if (targetUserId === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Cascade: delete credentials first, then user
    await prisma.verified_credentials.deleteMany({ where: { user_id: targetUserId } });
    await prisma.self_reported_skills.deleteMany({ where: { user_id: targetUserId } });
    await prisma.notifications.deleteMany({ where: { user_id: targetUserId } });
    await prisma.users.delete({ where: { id: targetUserId } });

    // Log the action
    await prisma.audit_logs.create({
      data: {
        actor_id: auth.userId,
        action_type: 'user_deleted',
        target_id: targetUserId,
        description: `User permanently deleted with cascaded data`,
        metadata: { cascaded: true },
      },
    }).catch(() => {}); // non-fatal

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('[admin/manage-users] DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
