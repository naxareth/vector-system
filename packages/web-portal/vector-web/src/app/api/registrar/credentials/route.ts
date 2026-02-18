import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData } from '@/lib/encryption'; // ✅ Safe to import here (Server-Side)

export const dynamic = 'force-dynamic'; 

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Initialize Supabase with the MASTER KEY (Service Role)
  // We use the Master Key here so the API can check roles and read the 
  // verified_credentials table even if RLS is tight.
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
    // 2. 🛡️ VERIFY AUTHENTICATION
    // getUser() is the most secure way to verify the user from the cookie session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("API Auth Error:", authError);
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    // 3. 🛡️ VERIFY AUTHORIZATION (RBAC)
    // We check the DB to ensure this UUID belongs to a registrar or super_admin
    const { data: userRecord, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userRecord) {
      return NextResponse.json({ error: 'Forbidden: User record not found' }, { status: 403 });
    }

    if (userRecord.role !== 'registrar' && userRecord.role !== 'super_admin') {
      return NextResponse.json({ 
        error: `Forbidden: Access restricted for role ${userRecord.role}` 
      }, { status: 403 });
    }

    // 4. FETCH CREDENTIAL DATA
    const { data: credentials, error: fetchError } = await supabase
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

    if (fetchError) throw fetchError;

    // 5. 🔓 DECRYPT ON SERVER
    // The browser never sees the raw encrypted string or the decryption key
    const processedData = credentials.map(cred => {
      let decryptedNote = null;
      if (cred.private_notes) {
        try {
          decryptedNote = decryptData(cred.private_notes);
        } catch (e) {
          console.error(`Failed to decrypt note for ID: ${cred.id}`);
          decryptedNote = "[Decryption Failed]";
        }
      }

      return {
        ...cred,
        private_notes: decryptedNote 
      };
    });

    return NextResponse.json(processedData);

  } catch (error: any) {
    console.error('Fatal API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}