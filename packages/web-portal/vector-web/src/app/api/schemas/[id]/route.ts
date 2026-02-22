import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // ✅ Changed 'db' to 'prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the schema from the database
    // ✅ Changed db.credential_schemas to prisma.credential_schemas
    const schemaRecord = await prisma.credential_schemas.findUnique({
      where: { id },
      select: {
        title: true,
        json_schema: true,
        issuer_id: true,
        created_at: true,
      },
    });

    // Return a 404 if the schema ID doesn't exist
    if (!schemaRecord) {
      return NextResponse.json(
        { error: "Schema not found" },
        { status: 404 }
      );
    }

    // Serve the raw W3C JSON-LD schema
    return NextResponse.json(schemaRecord.json_schema, {
      status: 200,
      headers: {
        // Set standard caching headers for public schemas
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Type": "application/ld+json",
      },
    });

  } catch (error) {
    console.error("GET /api/schemas/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}