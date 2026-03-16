import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Init Supabase with Service Role to ensure we can fetch data securely
  // independent of restrictive RLS that might block the anon key
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
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
          } catch (error) {
            // Safe to ignore in a GET handler: happens if Next.js tries to set 
            // a session cookie in a context where headers are already sent.
          }
        },
      },
    }
  );

  try {
    // 2. 🛡️ Auth Check: Who is asking?
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. 🛡️ Data Fetch: Only fetch for THIS user's ID
    // We strictly use the session ID, ignoring any client inputs
    const { data: credentials, error } = await supabase
      .from('verified_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('revoked', false) 
      .order('issued_at', { ascending: false });

    if (error) throw error;

    // 4. 🔓 Server-Side Decryption (Category 3)
    const processedData = (credentials || []).map(cred => {
        let decryptedNote = null;
        if (cred.private_notes) {
            try {
                decryptedNote = decryptData(cred.private_notes);
            } catch (e) {
                console.error(`Decryption failed for cred: ${cred.id}`);
            }
        }
        return {
            ...cred,
            private_notes: decryptedNote
        };
    });

    return NextResponse.json(processedData);

  } catch (err: any) {
    console.error("Credential Fetch Error:", err);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}