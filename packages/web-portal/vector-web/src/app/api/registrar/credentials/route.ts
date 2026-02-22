import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/encryption'; 
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic'; 

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Initialize Supabase with the MASTER KEY (Service Role)
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("API Auth Error:", authError);
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    // 3. 🛡️ VERIFY AUTHORIZATION (RBAC)
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

    // 4. FETCH CREDENTIAL DATA (Updated to include W3C fields)
    const { data: credentials, error: fetchError } = await supabase
      .from('verified_credentials')
      .select(`
        id,
        skill_name,
        issued_at,
        transaction_hash,
        certificate_number,
        private_notes,
        schema_url,
        credential_data,
        user:users!user_id (
          full_name,
          wallet_address
        )
      `)
      .order('issued_at', { ascending: false });

    if (fetchError) throw fetchError;

    // 5. 🔓 DECRYPT ON SERVER
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

// Validation schema for incoming mint requests
const MintCredentialValidator = z.object({
  user_id: z.string().uuid("Invalid student ID"),
  schema_id: z.string().uuid("Invalid schema ID"),
  skill_name: z.string().min(1, "Skill name is required"),
  credential_data: z.record(z.any(), "Credential data must be an object"),
  private_notes: z.string().optional(),
  certificate_number: z.string().optional(),
  token_id: z.string().min(1, "Token ID is required"),
  transaction_hash: z.string().optional()
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  );

  try {
    // 1. Verify Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.users.findUnique({ where: { id: user.id }, select: { role: true, wallet_address: true } });
    if (dbUser?.role !== 'registrar') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Parse and validate base request
    const body = await req.json();
    const validatedData = MintCredentialValidator.parse(body);

    // 3. Fetch the requested schema template
    const schemaTemplate = await db.credential_schemas.findUnique({
      where: { id: validatedData.schema_id }
    });

    if (!schemaTemplate) {
      return NextResponse.json({ error: 'Schema template not found' }, { status: 404 });
    }

    // 4. Validate incoming student data against the specific schema (Basic Key Match)
    const requiredKeys = Object.keys(schemaTemplate.json_schema as object);
    const providedKeys = Object.keys(validatedData.credential_data);
    const missingKeys = requiredKeys.filter(key => !providedKeys.includes(key));

    if (missingKeys.length > 0) {
      return NextResponse.json({ 
        error: 'Credential data does not match W3C schema requirements',
        missing_fields: missingKeys 
      }, { status: 400 });
    }

    // 5. Generate standard W3C JSON-LD payload
    const issuerDid = dbUser.wallet_address ? `did:polygon:amoy:${dbUser.wallet_address}` : `did:web:yourdomain.com:registrar:${user.id}`;
    const schemaUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/schemas/${schemaTemplate.id}`;

    const w3cPayload = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        schemaUrl
      ],
      "type": ["VerifiableCredential", schemaTemplate.title.replace(/\s+/g, '')],
      "issuer": issuerDid,
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": `did:vector:student:${validatedData.user_id}`,
        ...validatedData.credential_data
      }
    };

    // 6. Encrypt private notes if present
    const encryptedNotes = validatedData.private_notes 
      ? encryptData(validatedData.private_notes) 
      : null;

    // 7. Save to database
    const newCredential = await db.verified_credentials.create({
      data: {
        user_id: validatedData.user_id,
        skill_name: validatedData.skill_name,
        token_id: validatedData.token_id,
        transaction_hash: validatedData.transaction_hash,
        issuer_did: issuerDid,
        schema_url: schemaUrl,
        credential_data: w3cPayload.credentialSubject,
        private_notes: encryptedNotes,
        certificate_number: validatedData.certificate_number
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: newCredential,
      w3c_document: w3cPayload 
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/registrar/credentials error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}