import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/encryption';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { genAI, GEMINI_MODEL } from '@/lib/gemini'; // 🛡️ Centralized Gemini (Checkpoint #2)
import { buildIpfsMetadata, validateIpfsPayload } from '@/lib/ipfs'; // 🛡️ IPFS Privacy (Checkpoint #2)

// ---------------------------------------------------------------------------
// Inline course generator — uses the centralized Gemini client from
// @/lib/gemini. All API key management is handled by env-guard.ts.
// Mirrors generateCoursesForTag from ai-engine/src/nlp/gemini-client.ts.
// ---------------------------------------------------------------------------

interface GeneratedCourse {
  title: string;
  provider: string;
  link: string;
  skill_tags: string[];
}

async function generateCoursesForTag(tag: string): Promise<GeneratedCourse[]> {
  const prompt = `
You are a course catalog generator for an academic micro-credentialing platform.

Given a skill tag, return 2-3 realistic online courses that teach this skill.

RULES:
1. Return ONLY valid JSON — no markdown fences, no explanation, no preamble.
2. Use only these providers: Coursera, edX, Udemy, LinkedIn Learning, Google, Microsoft.
3. skill_tags on each course must include the input tag plus 1-2 closely related tags.
   Related tags must come from the same domain (e.g. a healthcare tag pairs with other
   healthcare tags — never mix healthcare with DevOps or unrelated tech).
4. Links must follow real provider URL patterns:
   - Coursera: https://www.coursera.org/learn/<slug>
   - edX: https://www.edx.org/learn/<subject>/<slug>
   - Udemy: https://www.udemy.com/course/<slug>
   - LinkedIn Learning: https://www.linkedin.com/learning/<slug>
   - Google: https://grow.google/certificates/
   - Microsoft: https://learn.microsoft.com/en-us/training/
5. If the tag is too niche for a standalone course, bundle it with its parent domain.
6. Course titles must sound like real courses — not generic.

OUTPUT FORMAT (strict JSON array, nothing else):
[
  {
    "title": "Course Title Here",
    "provider": "Coursera",
    "link": "https://www.coursera.org/learn/course-slug",
    "skill_tags": ["${tag}", "RelatedTag1"]
  }
]

Input tag: "${tag}"
`.trim();

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
    const parsed: GeneratedCourse[] = JSON.parse(cleaned);
    const valid = parsed.filter(
      (c) =>
        typeof c.title === 'string' &&
        typeof c.provider === 'string' &&
        typeof c.link === 'string' &&
        Array.isArray(c.skill_tags) &&
        c.skill_tags.length > 0
    );
    console.log(`[course-gen] Gemini generated ${valid.length} course(s) for tag: "${tag}"`);
    return valid;
  } catch (err) {
    console.error(`[course-gen] generateCoursesForTag failed for "${tag}":`, err);
    return [];
  }
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Auth Client (Anon) to get current session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // 2. Admin Client (Service Role) - absolute RLS bypass for data fetch
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. 🛡️ VERIFY AUTHENTICATION (Using Auth Client)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("API Auth Error:", authError);
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    // 3. 🛡️ VERIFY AUTHORIZATION (RBAC) (Using Admin Client for reliable role check)
    const { data: userRecord, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userRecord) {
      console.error("Role Check Error:", roleError);
      return NextResponse.json({ error: 'Forbidden: User record not found' }, { status: 403 });
    }

    if (userRecord.role !== 'registrar' && userRecord.role !== 'super_admin') {
      return NextResponse.json({
        error: `Forbidden: Access restricted for role ${userRecord.role}`
      }, { status: 403 });
    }

    // 4. FETCH CREDENTIAL DATA (Using Admin Client)
    const { data: credentials, error: fetchError } = await supabaseAdmin
      .from('verified_credentials')
      .select(`
        id,
        skill_name,
        issued_at,
        transaction_hash,
        certificate_number,
        private_notes,
        schema_url,
        token_id,
        revoked,
        user_id,
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

  } catch (error: unknown) {
    console.error('Fatal API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Validation schema for incoming mint requests
const MintCredentialValidator = z.object({
  user_id: z.string().uuid("Invalid student ID"),
  schema_id: z.string().uuid("Invalid schema ID"),
  skill_name: z.string().min(1, "Skill name is required"),
  skill_tags: z.array(z.string()).default([]),         // ✅ Phase 8: marketable skill tags
  credential_data: z.record(z.string(), z.any()),      // ✅ Fixed Zod syntax
  private_notes: z.string().optional(),
  certificate_number: z.string().optional(),
  token_id: z.string().min(1, "Token ID is required"),
  transaction_hash: z.string().optional()
});

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // POST uses ANON key for auth session reading
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
        },
      },
    }
  );

  // Service role client - use base createClient for absolute RLS bypass
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Verify Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true, wallet_address: true, full_name: true },
    });
    if (dbUser?.role !== 'registrar') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Parse and validate base request
    const body = await req.json();
    const validatedData = MintCredentialValidator.parse(body);

    // 3. Fetch the requested schema template
    const schemaTemplate = await prisma.credential_schemas.findUnique({
      where: { id: validatedData.schema_id }
    });

    if (!schemaTemplate) {
      return NextResponse.json({ error: 'Schema template not found' }, { status: 404 });
    }

    // 4. Validate incoming student data against the specific schema fields
    const schemaObj = schemaTemplate.json_schema as { properties?: Record<string, unknown>; required?: string[] };
    const definedProperties = schemaObj.properties || {};
    const requiredKeys = schemaObj.required || [];

    const providedData = validatedData.credential_data;
    const providedKeys = Object.keys(providedData);

    // Check if any truly REQUIRED fields are missing
    // skill_tags is excluded — it is promoted to its own DB column and
    // validated separately at the top level, not inside credential_data
    const missingFields = requiredKeys.filter((key: string) =>
      key !== 'skill_tags' && !providedKeys.includes(key)
    );

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Credential data does not match W3C schema requirements',
        missing_fields: missingFields
      }, { status: 400 });
    }

    // 5. Generate standard W3C JSON-LD payload
    const issuerDid = dbUser.wallet_address
      ? `did:polygon:amoy:${dbUser.wallet_address}`
      : `did:web:yourdomain.com:registrar:${user.id}`;
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');
    const schemaUrl = `${baseUrl}/api/schemas/${schemaTemplate.id}`;

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

    // 6.5. Create or get a default batch for this registrar
    // This ensures all credentials are tied to a batch with the registrar_id
    let batchId: string;
    try {
      const existingBatch = await prisma.minting_batches.findFirst({
        where: { registrar_id: user.id, batch_name: 'Individual Issuances' },
        select: { id: true }
      });

      if (existingBatch) {
        batchId = existingBatch.id;
      } else {
        const newBatch = await prisma.minting_batches.create({
          data: {
            registrar_id: user.id,
            batch_name: 'Individual Issuances',
            total_students: 0 // Will be updated dynamically
          }
        });
        batchId = newBatch.id;
      }
    } catch (batchError) {
      console.warn('[credentials] Batch creation warning:', batchError);
      // Continue without batch if it fails - non-fatal
      batchId = '';
    }

    // 7. Save credential to database
    const newCredential = await prisma.verified_credentials.create({
      data: {
        user_id: validatedData.user_id,
        batch_id: batchId || null,
        skill_name: validatedData.skill_name,
        skill_tags: validatedData.skill_tags,          // ✅ Phase 8: persist marketable skill tags
        token_id: validatedData.token_id,
        transaction_hash: validatedData.transaction_hash,
        issuer_did: issuerDid,
        schema_url: schemaUrl,
        credential_data: w3cPayload.credentialSubject,
        private_notes: encryptedNotes,
        certificate_number: validatedData.certificate_number
      }
    });

    // 8. ✅ Phase 8: Sync skill_tags into monitored_keywords so they're
    //    eligible for skill_health_cache population on next /api/analyze call
    if (validatedData.skill_tags.length > 0) {
      await prisma.monitored_keywords.createMany({
        data: validatedData.skill_tags.map(keyword => ({ keyword, is_active: true })),
        skipDuplicates: true,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8b. 🔔 MINT NOTIFICATION
    //
    // Insert a notification for the student so their bell updates immediately
    // via the Realtime subscription in TopBar.tsx.
    //
    // Uses supabaseAdmin (service role) so it can bypass RLS and write to the
    // student's notifications row without the student being the auth actor.
    //
    // Non-fatal — credential is already saved, notification failure never
    // blocks the 201 response back to the registrar.
    // ─────────────────────────────────────────────────────────────────────────
    if (newCredential?.id) {
      const issuerName = dbUser.full_name || 'Your institution';
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: validatedData.user_id,
          title: `New Credential Issued: ${validatedData.skill_name}`,
          message: `${issuerName} has issued you a verified credential for "${validatedData.skill_name}". Tap to view your verified record.`,
          type: 'success',
          is_read: false,
          link_url: `/verify/${newCredential.id}`,
        });

      if (notifError) {
        // Non-fatal — log but do not surface to registrar
        console.error('[credentials] Notification insert failed:', notifError.message);
      } else {
        console.log(`[credentials] Notification sent to student ${validatedData.user_id} for credential ${newCredential.id}`);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // 9. 🎓 DYNAMIC COURSE GENERATION (Phase 9)
    //
    // For each incoming skill_tag, check if the courses table already has
    // coverage. If a tag has zero matching courses, call Gemini to generate
    // 2-3 relevant courses and insert them.
    //
    // Fire-and-forget — never delays the 201 response back to the registrar.
    // ─────────────────────────────────────────────────────────────────────────
    if (validatedData.skill_tags.length > 0) {
      (async () => {
        try {
          const coveredCourses = await prisma.courses.findMany({
            where: {
              skill_tags: {
                hasSome: validatedData.skill_tags,
              },
            },
            select: { skill_tags: true },
          });

          const coveredTags = new Set(
            coveredCourses.flatMap((c) => c.skill_tags ?? [])
          );

          const uncoveredTags = validatedData.skill_tags.filter(
            (tag) => !coveredTags.has(tag)
          );

          if (uncoveredTags.length === 0) {
            console.log('[course-gen] All tags already covered — skipping generation');
            return;
          }

          console.log(`[course-gen] Uncovered tags detected: ${uncoveredTags.join(', ')} — generating courses`);

          const generatedBatches = await Promise.all(
            uncoveredTags.map((tag) => generateCoursesForTag(tag))
          );

          const allGenerated = generatedBatches.flat();

          if (allGenerated.length === 0) {
            console.warn('[course-gen] Gemini returned no courses for uncovered tags');
            return;
          }

          await prisma.courses.createMany({
            data: allGenerated.map((c) => ({
              title: c.title,
              provider: c.provider,
              link: c.link,
              // TODO: Links are Gemini-generated and unverified.
              // Add a link-validation pass in a future phase.
              skill_tags: c.skill_tags,
            })),
            skipDuplicates: false,
          });

          console.log(`[course-gen] Inserted ${allGenerated.length} course(s) for tags: ${uncoveredTags.join(', ')}`);

        } catch (courseGenErr) {
          console.error('[course-gen] Dynamic course generation failed:', courseGenErr);
        }
      })();
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // 10. 🛡️ IPFS METADATA PRIVACY (Checkpoint #2)
    //
    // Build a privacy-safe metadata payload using buildIpfsMetadata().
    // This strips all PII (email, student_id, wallet_address, private_notes,
    // etc.) and keeps only publicly verifiable credential data.
    //
    // validateIpfsPayload() runs a final safety scan for any leaked fields.
    // In production, this payload would be pinned to IPFS via Pinata/nft.storage.
    // ─────────────────────────────────────────────────────────────────────────
    const ipfsMetadata = buildIpfsMetadata({
      id: newCredential.id,
      skill_name: newCredential.skill_name,
      issued_at: newCredential.issued_at ?? undefined,
      issuer_did: newCredential.issuer_did ?? undefined,
      certificate_number: newCredential.certificate_number ?? undefined,
      schema_url: newCredential.schema_url ?? undefined,
      transaction_hash: newCredential.transaction_hash ?? undefined,
      token_id: newCredential.token_id ?? undefined,
      credential_data: w3cPayload.credentialSubject,
      // These sensitive fields exist in DB but must NOT appear in IPFS payload:
      private_notes: validatedData.private_notes,
      user_id: validatedData.user_id,
      wallet_address: body.wallet_address,
      email: body.email,
      student_id: body.student_id,
    });

    const ipfsViolations = validateIpfsPayload(ipfsMetadata as Record<string, unknown>);
    if (ipfsViolations.length > 0) {
      console.error('[ipfs-privacy] BLOCKED — sensitive fields leaked:', ipfsViolations);
    } else {
      console.log('[ipfs-privacy] Payload is clean — 0 sensitive fields detected');
    }
    console.log('[ipfs-privacy] IPFS-safe metadata:', JSON.stringify(ipfsMetadata, null, 2));
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: newCredential,
      w3c_document: w3cPayload,
      ipfs_metadata: ipfsMetadata,
      ipfs_privacy_check: {
        sensitive_fields_found: ipfsViolations.length,
        violations: ipfsViolations,
        status: ipfsViolations.length === 0 ? 'CLEAN — safe to pin to IPFS' : 'BLOCKED — sensitive data detected',
      },
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/registrar/credentials error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  
  // 1. Auth Client (Anon) to get current session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // 2. Admin Client (Service Role) - use base createClient for absolute RLS bypass
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify role via supabaseAdmin (bypasses port 6543)
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || dbUser?.role !== 'registrar') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, revoked } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });

    const isRevoked = revoked ?? true;

    // Perform update via supabaseAdmin (HTTPS port 443 - stable)
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('verified_credentials')
      .update({ revoked: isRevoked }, { count: 'exact' })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('[API] Update failed:', updateError.message);
      throw new Error(updateError.message);
    }

    const rowsAffected = updateData?.length || 0;
    return NextResponse.json({ success: true, rowsAffected });

  } catch (error: unknown) {
    console.error('PATCH /api/registrar/credentials error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Database Sync Failed', 
      details: errMsg 
    }, { status: 500 });
  }
}