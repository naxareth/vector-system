import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    validateCsvFile,
    parseCsvContent,
    BASE_HEADERS,
} from '@/lib/csv-validator';

// ---------------------------------------------------------------------------
// POST /api/registrar/csv-upload
//
// Secure, schema-aware CSV bulk-upload endpoint for registrars.
// 1. Auth + RBAC (registrar / super_admin only)
// 2. Fetch schema fields if schema_id is provided
// 3. File-level validation (MIME type, size)
// 4. Row-level validation + sanitization (formula injection, field formats)
// 5. Returns sanitized rows or detailed errors
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { /* read-only in some contexts */ }
                },
            },
        }
    );

    // 1. 🛡️ Authentication
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 🛡️ RBAC — registrar or super_admin only
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'registrar' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Extract the file + optional schema_id from multipart form data
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json(
            { error: 'Request must be multipart/form-data with a CSV file.' },
            { status: 400 }
        );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
        return NextResponse.json(
            { error: 'No file attached. Send a CSV file with field name "file".' },
            { status: 400 }
        );
    }

    // 4. 🛡️ Schema-aware header resolution
    const schemaId = formData.get('schema_id')?.toString() || null;
    let requiredHeaders = [...BASE_HEADERS, 'skill_name']; // default fallback
    let schemaFields: string[] = ['skill_name']; // dynamic fields from schema

    if (schemaId) {
        // Fetch the schema's fields from DB
        const { data: schema, error: schemaError } = await supabase
            .from('credential_schemas')
            .select('json_schema')
            .eq('id', schemaId)
            .single();

        if (schemaError || !schema) {
            return NextResponse.json(
                { error: 'Selected credential template not found.' },
                { status: 400 }
            );
        }

        // Extract field keys from the schema's properties
        const schemaProperties = schema.json_schema?.properties || {};
        schemaFields = Object.keys(schemaProperties).map(k => k.toLowerCase());

        // Build required headers: base fields + schema fields
        requiredHeaders = [...BASE_HEADERS, ...schemaFields];
    }

    // 5. 🛡️ File-level validation (MIME type + size)
    const fileCheck = validateCsvFile(file.type, file.size);
    if (!fileCheck.valid) {
        return NextResponse.json({ error: fileCheck.error }, { status: 400 });
    }

    // 6. Read content and parse
    const csvText = await file.text();

    // 7. 🛡️ Row-level validation + sanitization (schema-aware)
    const result = parseCsvContent(csvText, requiredHeaders, schemaFields);

    if (!result.ok) {
        return NextResponse.json(
            {
                error: result.error,
                rowErrors: result.rowErrors ?? [],
            },
            { status: 400 }
        );
    }

    // 8. Return sanitized data
    return NextResponse.json({
        success: true,
        message: `Successfully validated ${result.rows.length} row(s).`,
        rows: result.rows,
        warnings: result.warnings,
        requiredHeaders, // return so the frontend knows which headers were expected
    });
}
