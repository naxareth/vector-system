import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// --- Types mirroring RichMarketData from adzuna-client ---

interface LocationDemand {
  location: string;
  count: number;
}

interface SalaryInsights {
  min: number | null;
  max: number | null;
  avg: number | null;
  currency: string;
}

interface SnapshotMetadata {
  job_count: number;
  salary: SalaryInsights;
  top_locations: LocationDemand[];
  fetched_at: string;
}

export interface SkillInsight {
  skill_name: string;
  latest_job_count: number;
  salary: SalaryInsights;
  top_locations: LocationDemand[];
  last_updated: string;
  history: { date: string; job_count: number }[]; // Sparkline data
}

// --- Validation ---

const QuerySchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
});

// --- Route Handler ---

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ userId: searchParams.get('userId') });

    if (!parsed.success) {
      return NextResponse.json(
        { status: 'error', message: 'Missing or invalid userId query parameter' },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    // 1. Resolve all skills for this student (verified + self-reported)
    const [verified, selfReported] = await Promise.all([
      prisma.verified_credentials.findMany({
        where: { user_id: userId },
        select: { skill_name: true, skill_tags: true },
      }),
      prisma.self_reported_skills.findMany({
        where: { user_id: userId },
        select: { skill_name: true },
      }),
    ]);

    const allSkills = Array.from(
      new Set([
        ...verified.flatMap(c => 
          (Array.isArray(c.skill_tags) && c.skill_tags.length > 0) ? c.skill_tags : [c.skill_name]
        ),
        ...selfReported.map(s => s.skill_name),
      ])
    );

    if (allSkills.length === 0) {
      return NextResponse.json({ status: 'success', data: [] });
    }

    // 2. Fetch all snapshots for those skills, newest first
    const snapshots = await prisma.market_snapshots.findMany({
      where: { skill_name: { in: allSkills } },
      orderBy: { recorded_at: 'desc' },
      select: {
        skill_name: true,
        job_count: true,
        recorded_at: true,
        metadata: true,
      },
    });

    // 3. Group snapshots by skill and build SkillInsight objects
    const skillMap = new Map<string, typeof snapshots>();

    for (const snap of snapshots) {
      if (!skillMap.has(snap.skill_name)) {
        skillMap.set(snap.skill_name, []);
      }
      skillMap.get(snap.skill_name)!.push(snap);
    }

    const insights: SkillInsight[] = [];

    for (const skill of allSkills) {
      const records = skillMap.get(skill);

      // No market data yet for this skill — still include it with nulls
      // so the UI can show "no data yet" gracefully
      if (!records || records.length === 0) {
        insights.push({
          skill_name: skill,
          latest_job_count: 0,
          salary: { min: null, max: null, avg: null, currency: 'USD' },
          top_locations: [],
          last_updated: '',
          history: [],
        });
        continue;
      }

      // Most recent snapshot drives the headline numbers
      const latest = records[0];
      const meta = latest.metadata as SnapshotMetadata | null;

      // Build sparkline history from all snapshots (oldest → newest)
      const history = [...records]
        .reverse()
        .map(r => ({
          date: new Date(r.recorded_at!).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          job_count: r.job_count,
        }));

      insights.push({
        skill_name: skill,
        latest_job_count: latest.job_count,
        salary: meta?.salary ?? { min: null, max: null, avg: null, currency: 'USD' },
        top_locations: meta?.top_locations ?? [],
        last_updated: latest.recorded_at
          ? new Date(latest.recorded_at).toISOString()
          : '',
        history,
      });
    }

    // 4. Sort by job_count descending so highest-demand skills surface first
    insights.sort((a, b) => b.latest_job_count - a.latest_job_count);

    return NextResponse.json({ status: 'success', data: insights });
  } catch (error) {
    console.error('Market Insights Route Failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch market insights' },
      { status: 500 }
    );
  }
}