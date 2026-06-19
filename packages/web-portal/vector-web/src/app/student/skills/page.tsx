'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/shared/Pagination';
import HelpTip from '@/components/shared/HelpTip';
import Link from 'next/link';

interface RawCredential {
  id: string;
  skill_name: string;
  skill_tags: string[];
  issued_at?: string;

  source: 'university';
}

interface SkillCard {
  skillName: string;
  parentCredentialId: string;
  parentCredentialTitle: string;
  source: 'university';
}

interface SkillHealth {
  skillName: string;
  status: 'Rising' | 'Stable' | 'Decaying' | 'Pending';
  trend_slope: number | null;
  last_updated: string | null;
  fromCache: boolean;
}

function slopeToVelocity(slope: number | null): string {
  if (slope === null) return 'No data';
  if (slope > 0.5) return 'Strong Growth';
  if (slope > 0.1) return 'Growing';
  if (slope > -0.1) return 'Stable';
  if (slope > -0.5) return 'Cooling';
  return 'Declining';
}

function slopeToColors(slope: number | null) {
  if (slope === null) return { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-300', value: 'text-gray-400' };
  if (slope > 0.5) return { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', bar: 'bg-emerald-500', value: 'text-emerald-600' };
  if (slope > 0.1) return { badge: 'bg-green-50 text-green-700 border border-green-200', bar: 'bg-green-500', value: 'text-green-600' };
  if (slope > -0.1) return { badge: 'bg-blue-50 text-blue-700 border border-blue-200', bar: 'bg-blue-400', value: 'text-blue-500' };
  if (slope > -0.5) return { badge: 'bg-amber-50 text-amber-700 border border-amber-200', bar: 'bg-amber-400', value: 'text-amber-600' };
  return { badge: 'bg-red-50 text-red-700 border border-red-200', bar: 'bg-red-500', value: 'text-red-600' };
}

function slopeToPercent(slope: number | null): number {
  if (slope === null) return 0;
  return Math.round((Math.max(-1, Math.min(1, slope)) + 1) / 2 * 100);
}

function SlopeArrow({ slope }: { slope: number | null }) {
  if (slope === null) return <span className="text-gray-400 text-xs">–</span>;
  if (slope > 0.5) return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
  if (slope > 0.1) return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
  if (slope > -0.1) return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>;
  if (slope > -0.5) return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
}

function SkillCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1"><div className="h-5 w-32 bg-gray-200 rounded" /><div className="h-3 w-48 bg-gray-100 rounded" /></div>
        <div className="h-6 w-20 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-1.5 mt-4"><div className="h-1.5 w-full bg-gray-100 rounded-full" /></div>
    </div>
  );
}

function SkillCardItem({ card, health }: { card: SkillCard; health: SkillHealth | undefined }) {
  const slope = health?.trend_slope ?? null;
  const status = health?.status ?? 'Pending';
  const isPending = status === 'Pending' || !health?.fromCache;
  const colors = slopeToColors(slope);
  const fillPct = slopeToPercent(slope);

  return (
    <Link href={`/student/skills/${card.parentCredentialId}`} className="block">
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#06B4C9]/30 transition-all group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#06B4C9] transition-colors truncate">{card.skillName}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">via {card.parentCredentialTitle}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#06B4C9] bg-[#06B4C9]/10 px-2 py-0.5 rounded-full border border-[#06B4C9]/20 font-semibold shrink-0">University</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${colors.badge}`}>
            <SlopeArrow slope={slope} />
            {isPending ? 'Pending' : slopeToVelocity(slope)}
          </div>
          {!isPending && slope !== null && (
            <span className={`text-xs font-bold tabular-nums ${colors.value}`}>{slope > 0 ? '+' : ''}{slope.toFixed(2)}</span>
          )}
        </div>

        {isPending ? (
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden"><div className="h-full bg-gray-200 animate-pulse w-1/4 rounded-full" /></div>
        ) : (
          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${colors.bar}`} style={{ width: `${fillPct}%` }} />
          </div>
        )}

        {health?.last_updated && (
          <p className="text-[10px] text-gray-400 mt-2">
            Analyzed {new Date(health.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function SkillsPage() {
  const [credentials, setCredentials] = useState<RawCredential[]>([]);
  const [skillCards, setSkillCards] = useState<SkillCard[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [healthMap, setHealthMap] = useState<Map<string, SkillHealth>>(new Map());
  const [healthLoading, setHealthLoading] = useState(false);
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setCredentialsLoading(false); return; }



        const found: RawCredential[] = [];

        const dbRes = await fetch('/api/student/credentials');
        if (dbRes.ok) {
          const dbCreds = await dbRes.json();
          dbCreds.forEach((c: { id: string; skill_name: string; skill_tags?: string[]; issued_at?: string }) => {
            found.push({
              id: c.id,
              skill_name: c.skill_name,
              skill_tags: Array.isArray(c.skill_tags) && c.skill_tags.length > 0
                ? c.skill_tags
                : [c.skill_name],
              issued_at: c.issued_at,

              source: 'university',
            });
          });
        }



        setCredentials(found);

        // Fan out: one SkillCard per unique tag
        const seen = new Set<string>();
        const cards: SkillCard[] = [];
        for (const cred of found) {
          for (const tag of cred.skill_tags) {
            const key = tag.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              cards.push({ skillName: tag, parentCredentialId: cred.id, parentCredentialTitle: cred.skill_name, source: cred.source });
            }
          }
        }
        setSkillCards(cards);
      } catch (error) {
        console.error('Credentials fetch error:', error);
      } finally {
        setCredentialsLoading(false);
      }
    };
    fetchCredentials();
  }, []);

  useEffect(() => {
    if (skillCards.length === 0) return;
    const fetchHealth = async () => {
      setHealthLoading(true);
      try {
        // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
        const csrfToken = typeof document !== 'undefined' 
          ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
          : '';

        const res = await fetch('/api/student/skill-health', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || ''
          },
          body: JSON.stringify({ skillNames: skillCards.map(c => c.skillName) }),
        });
        if (res.ok) {
          const json = await res.json();
          const map = new Map<string, SkillHealth>();
          (json.skills as SkillHealth[]).forEach(h => map.set(h.skillName, h));
          setHealthMap(map);
        }
      } catch (err) { console.error('Health fetch error:', err); }
      finally { setHealthLoading(false); }
    };
    fetchHealth();
  }, [skillCards]);

  const [cardsPage, setCardsPage] = useState(1);
  const CARDS_PER_PAGE = 6;

  const paginatedCards = skillCards.slice((cardsPage - 1) * CARDS_PER_PAGE, cardsPage * CARDS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Skills <HelpTip text="All skills extracted from your certificates, with live job-market demand tracking." /></h1>
        <p className="text-sm text-gray-500">Your verified credentials and how they&apos;re trending in the job market</p>
      </div>

      {credentialsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkillCardSkeleton key={i} />)}
        </div>
      )}

      {!credentialsLoading && skillCards.length === 0 && (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="4" y="10" width="3" height="7" rx="1" />
              <rect x="10.5" y="7" width="3" height="10" rx="1" />
              <rect x="17" y="4" width="3" height="13" rx="1" />
              <path d="M3 20h18" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">No skill analytics available yet</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Your credentials will appear here once issued by your registrar
          </p>
        </div>
      )}

      {!credentialsLoading && skillCards.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center text-sm text-gray-500">
            <span><span className="font-bold text-gray-900">{skillCards.length}</span> skill{skillCards.length !== 1 ? 's' :''}</span>
            <span className="text-gray-300">·</span>
            <span>from <span className="font-bold text-gray-900">{credentials.length}</span> credential{credentials.length !== 1 ? 's' : ''}</span>
            {healthLoading && (
              <span className="flex items-center gap-1.5 text-[#06B4C9] text-xs">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                Loading market data...
              </span>
            )}
          </div>

          {skillCards.length > 0 && (
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCards.map((card, i) => <SkillCardItem key={`card-${i}`} card={card} health={healthMap.get(card.skillName)} />)}
              </div>
              <Pagination currentPage={cardsPage} totalItems={skillCards.length} itemsPerPage={CARDS_PER_PAGE} onPageChange={setCardsPage} />
            </section>
          )}

          <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Market Trend Guide</p>
            <div className="flex flex-wrap gap-3">
              {[{ label: 'Strong Growth', slope: 0.8 }, { label: 'Growing', slope: 0.3 }, { label: 'Stable', slope: 0 }, { label: 'Cooling', slope: -0.3 }, { label: 'Declining', slope: -0.8 }].map(item => {
                const c = slopeToColors(item.slope);
                return (
                  <span key={item.label} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${c.badge}`}>
                    <SlopeArrow slope={item.slope} />{item.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}