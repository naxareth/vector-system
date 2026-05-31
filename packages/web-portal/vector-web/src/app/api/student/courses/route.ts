import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/courses — DB-backed course catalogue with filtering
//
// Query params:
//   q       — search query (matches title, provider, or tags)
//   tags    — comma-separated skill tags to filter by
//   page    — 1-indexed page number (default: 1)
//   limit   — items per page (default: 30, max: 100)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const tagsParam = url.searchParams.get('tags')?.trim() || '';
  const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean) : [];
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30')));

  try {
    // Build the where clause dynamically
    const where: Record<string, unknown> = {};
    const conditions: Record<string, unknown>[] = [];

    // Text search across title and provider
    if (q) {
      conditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { provider: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Skill tag filter
    if (tags.length > 0) {
      conditions.push({
        skill_tags: { hasSome: tags },
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [courses, totalCount] = await Promise.all([
      prisma.courses.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          provider: true,
          link: true,
          skill_tags: true,
        },
      }),
      prisma.courses.count({ where }),
    ]);

    return NextResponse.json({
      courses,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('[student/courses] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
