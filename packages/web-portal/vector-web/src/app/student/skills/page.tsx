'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchWalletSkillNames } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/shared/Pagination';
import HelpTip from '@/components/shared/HelpTip';
import Link from 'next/link';

interface RawCredential {
  id: string;
  skill_name: string;
  skill_tags: string[];
  issued_at?: string;
  transaction_hash?: string;
  source: 'university' | 'blockchain';
}

interface SkillCard {
  skillName: string;
  parentCredentialId: string;
  parentCredentialTitle: string;
  source: 'university' | 'blockchain';
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
          {card.source === 'university' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#06B4C9] bg-[#06B4C9]/10 px-2 py-0.5 rounded-full border border-[#06B4C9]/20 font-semibold shrink-0">University</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-semibold shrink-0">On-Chain <HelpTip size={10} text="This skill was verified directly on the blockchain, not through a university record." /></span>
          )}
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
  const [userWallet, setUserWallet] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setCredentialsLoading(false); return; }

        const { data: profile } = await supabase
          .from('users').select('wallet_address, student_id').eq('id', session.user.id).single();
        setUserWallet(profile?.wallet_address || null);

        const found: RawCredential[] = [];

        const dbRes = await fetch('/api/student/credentials');
        if (dbRes.ok) {
          const dbCreds = await dbRes.json();
          dbCreds.forEach((c: any) => {
            found.push({
              id: c.id,
              skill_name: c.skill_name,
              skill_tags: Array.isArray(c.skill_tags) && c.skill_tags.length > 0
                ? c.skill_tags
                : [c.skill_name],
              issued_at: c.issued_at,
              transaction_hash: c.transaction_hash,
              source: 'university',
            });
          });
        }

        if (profile?.wallet_address) {
          try {
            const dbNames = found.map(c => c.skill_name.toLowerCase());
            const walletSkills = await fetchWalletSkillNames(profile.wallet_address);
            walletSkills.forEach((skillName, index) => {
              if (!dbNames.includes(skillName.toLowerCase())) {
                found.push({
                  id: `bc-${skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
                  skill_name: skillName,
                  skill_tags: [skillName],
                  source: 'blockchain'
                });
              }
            });
          } catch (err) { console.warn('Blockchain scan failed:', err); }
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

  const universityCards = skillCards.filter(c => c.source === 'university');
  const blockchainCards = skillCards.filter(c => c.source === 'blockchain');

  const [uniPage, setUniPage] = useState(1);
  const [bcPage, setBcPage] = useState(1);
  const CARDS_PER_PAGE = 6;

  const paginatedUni = universityCards.slice((uniPage - 1) * CARDS_PER_PAGE, uniPage * CARDS_PER_PAGE);
  const paginatedBc = blockchainCards.slice((bcPage - 1) * CARDS_PER_PAGE, bcPage * CARDS_PER_PAGE);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Skills <HelpTip text="All skills extracted from your certificates, with live job-market demand tracking." /></h1>
        <p className="text-sm text-gray-500">Your verified credentials and how they're trending in the job market</p>
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
            Connect your wallet and upload credentials to see performance trends
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

          {universityCards.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#06B4C9]/10 rounded-md flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[#06B4C9]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" /></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-900">University</h2>
                <span className="text-xs text-gray-400">{universityCards.length} skill{universityCards.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedUni.map((card, i) => <SkillCardItem key={`u-${i}`} card={card} health={healthMap.get(card.skillName)} />)}
              </div>
              <Pagination currentPage={uniPage} totalItems={universityCards.length} itemsPerPage={CARDS_PER_PAGE} onPageChange={setUniPage} />
            </section>
          )}

          {blockchainCards.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-indigo-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
                <h2 className="text-sm font-bold text-gray-900">On-Chain</h2>
                <span className="text-xs text-gray-400">{blockchainCards.length} skill{blockchainCards.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedBc.map((card, i) => <SkillCardItem key={`bc-${i}`} card={card} health={healthMap.get(card.skillName)} />)}
              </div>
              <Pagination currentPage={bcPage} totalItems={blockchainCards.length} itemsPerPage={CARDS_PER_PAGE} onPageChange={setBcPage} />
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