import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { decryptData } from '@/lib/encryption'; // ✅ Safe to import here (Server-Side)

export const dynamic = 'force-dynamic'; // Ensure it doesn't cache stale data

export async function GET(req: Request) {
  try {
    // 1. 🛡️ VERIFY SESSION
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 🛡️ VERIFY ROLE (RBAC)
    // We must query the DB to verify the role, don't just trust metadata if high security
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (user?.role !== 'registrar' && user?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Registrars only' }, { status: 403 });
    }

    // 3. FETCH DATA
    const { data: credentials, error } = await supabase
      .from('verified_credentials')
      .select(`
        id,
        skill_name,
        issued_at,
        transaction_hash,
        certificate_number,
        private_notes,
        user:users!user_id (
          full_name,
          wallet_address
        )
      `)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    // 4. 🔓 DECRYPT ON SERVER
    // We map over the results and decrypt 'private_notes' before sending
    const processedData = credentials.map(cred => {
      let decryptedNote = null;
      if (cred.private_notes) {
        try {
          decryptedNote = decryptData(cred.private_notes);
        } catch (e) {
          console.error(`Failed to decrypt note for ${cred.id}`);
          decryptedNote = "[Decryption Failed]";
        }
      }

      return {
        ...cred,
        private_notes: decryptedNote // Send plain text to authorized client
      };
    });

    return NextResponse.json(processedData);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}