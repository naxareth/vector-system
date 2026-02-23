import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { encryptData } from '@/lib/encryption';
import { z } from 'zod';

// 1. 🛡️ Server-Side Validation Schema
const logSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenId: z.string(),
  skillName: z.string().min(1),
  txHash: z.string().startsWith('0x'),
  certificateNumber: z.string(),
  private_notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
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
    // 2. 🛡️ Session Verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. 🛡️ Role Authorization (RBAC)
    const { data: profile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'registrar' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Input Validation & Cleansing
    const body = await req.json();
    const validation = logSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid payload', details: validation.error.format() }, { status: 400 });
    }

    const { walletAddress, tokenId, skillName, txHash, certificateNumber, private_notes } = validation.data;

    // 5. 🔓 Server-Side Encryption
    const encryptedNotes = private_notes ? encryptData(private_notes) : null;

    // 6. Resolve student by wallet address
    const { data: student } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('wallet_address', walletAddress)
      .single();

    const studentId = student?.id || user.id;

    // 7. Insert credential — select id back so we can build the verify link
    const { data: newCredential, error: dbError } = await supabase
      .from('verified_credentials')
      .insert({
        user_id: studentId,
        skill_name: skillName,
        token_id: tokenId,
        transaction_hash: txHash,
        certificate_number: certificateNumber,
        private_notes: encryptedNotes,
      })
      .select('id')
      .single();

    if (dbError) throw dbError;

    // 8. 🔔 Mint Notification
    // Insert a notification for the student so they see it in the bell dropdown.
    // link_url points to the public verification portal for this credential.
    // Non-fatal: if this fails we log it but don't fail the whole mint response.
    if (newCredential?.id) {
      const issuerName = profile?.full_name || 'Your institution';
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          title: `New Credential Issued: ${skillName}`,
          message: `${issuerName} has issued you a verified credential for "${skillName}". Tap to view your verified record.`,
          type: 'success',
          is_read: false,
          link_url: `/verify/${newCredential.id}`,
        });

      if (notifError) {
        // Non-fatal — credential is already saved, just log the notification failure
        console.error('[log-mint] Notification insert failed:', notifError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // 🛡️ Secure Error Handling — don't leak schema/table details to client
    console.error('CRITICAL LOGGING ERROR:', error.message);
    return NextResponse.json(
      { error: 'Failed to process secure audit log' },
      { status: 500 }
    );
  }
}