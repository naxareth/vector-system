import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    // 🛡️ Auth check - this is a student-facing endpoint
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

    const body = await req.json();
    const { skillNames } = body;

    if (!Array.isArray(skillNames) || skillNames.length === 0) {
      return NextResponse.json({ skills: [] });
    }

    // Sanitize: ensure strings only, deduplicate
    const sanitized: string[] = [...new Set(
      skillNames.filter((s: any) => typeof s === 'string' && s.length > 0 && s.length < 100)
    )];

    if (sanitized.length === 0) {
      return NextResponse.json({ skills: [] });
    }

    // Read from cache - fast, no AI call
    const cached = await prisma.skill_health_cache.findMany({
      where: { skill_name: { in: sanitized } },
      select: {
        skill_name: true,
        status: true,
        trend_slope: true,
        last_updated: true,
      }
    });

    // Build a lookup map
    const cacheMap = new Map(cached.map(c => [c.skill_name, c]));

    // Return results for ALL requested skills, including those not yet in cache
    const skills = sanitized.map(name => {
      const hit = cacheMap.get(name);
      if (hit) {
        return {
          skillName: name,
          status: hit.status ?? 'Stable',
          trend_slope: hit.trend_slope ?? 0,
          last_updated: hit.last_updated,
          fromCache: true,
        };
      }
      // Cache miss — skill hasn't been analyzed yet
      return {
        skillName: name,
        status: 'Pending',
        trend_slope: null,
        last_updated: null,
        fromCache: false,
      };
    });

    return NextResponse.json({ skills });

  } catch (error) {
    console.error('[skill-health] Route error:', error);
    return NextResponse.json({ error: 'Failed to fetch skill health' }, { status: 500 });
  }
}