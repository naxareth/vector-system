import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Validate the incoming JSON-LD schema payload
const CreateSchemaValidator = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  json_schema: z.record(z.any(), "A valid JSON object is required for the schema"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the session via Supabase
    const cookieStore = await cookies();
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
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify the user is a Registrar
    const dbUser = await db.users.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (dbUser?.role !== "registrar") {
      return NextResponse.json({ error: "Forbidden: Registrars only" }, { status: 403 });
    }

    // 3. Parse and Validate the W3C template payload
    const body = await req.json();
    const { title, json_schema } = CreateSchemaValidator.parse(body);

    // 4. Save the schema to the database registry
    const newSchema = await db.credential_schemas.create({
      data: {
        issuer_id: user.id,
        title,
        json_schema,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Schema published successfully",
        data: newSchema,
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors }, 
        { status: 400 }
      );
    }
    
    console.error("POST /api/schemas error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}