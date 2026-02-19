import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { encryptData } from '@/lib/encryption'; 
import { z } from 'zod';

// 1. 🛡️ Server-Side Validation Schema (Category 2)
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
      .select('role')
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

    // 5. 🔓 Server-Side Encryption (Category 3)
    // The browser never handles the encryption key
    const encryptedNotes = private_notes ? encryptData(private_notes) : null;

    // 6. Database Insertion
    // We fetch the internal user_id based on the wallet address provided
    const { data: student } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    const { error: dbError } = await supabase
      .from('verified_credentials')
      .insert({
        user_id: student?.id || user.id, // Fallback to current user if student not in DB
        skill_name: skillName,
        token_id: tokenId,
        transaction_hash: txHash,
        certificate_number: certificateNumber,
        private_notes: encryptedNotes,
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    // 7. 🛡️ Secure Error Handling (Prevent Information Leakage)
    console.error("CRITICAL LOGGING ERROR:", error.message);
    
    // Do NOT return the raw error.message to the client as it may reveal 
    // database table names or schema details.
    return NextResponse.json(
      { error: 'Failed to process secure audit log' }, 
      { status: 500 }
    );
  }
}