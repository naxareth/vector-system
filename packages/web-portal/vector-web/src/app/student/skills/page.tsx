'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerifiedSkill {
  id: string;           // credential UUID or 'bc-{skillId}'
  name: string;
  source: 'university' | 'blockchain';
  issuedAt?: string;
  transactionHash?: string;
}

interface SkillHealth {
  skillName: string;
  status: 'Rising' | 'Stable' | 'Decaying' | 'Pending';
  trend_slope: number | null;
  last_updated: string | null;
  fromCache: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 
 * Converts trend_slope float into a human-readable velocity label.
 * slope > 0.5  → "Strong Growth"
 * slope > 0.1  → "Growing"
 * slope > -0.1 → "Stable"
 * slope > -0.5 → "Cooling"
 * else         → "Declining"
 */
function slopeToVelocity(slope: number | null): string {
  if (slope === null) return 'No data';
  if (slope > 0.5) return 'Strong Growth';
  if (slope > 0.1) return 'Growing';
  if (slope > -0.1) return 'Stable';
  if (slope > -0.5) return 'Cooling';
  return 'Declining';
}

function slopeToColors(slope: number | null): { badge: string; bar: string; icon: string } {
  if (slope === null) return { badge: 'bg-gray-100 text-gray-500', bar: 'bg-gray-300', icon: 'text-gray-400' };
  if (slope > 0.5) return { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', bar: 'bg-emerald-500', icon: 'text-emerald-600' };
  if (slope > 0.1) return { badge: 'bg-green-50 text-green-700 border border-green-200', bar: 'bg-green-500', icon: 'text-green-600' };
  if (slope > -0.1) return { badge: 'bg-blue-50 text-blue-700 border border-blue-200', bar: 'bg-blue-400', icon: 'text-blue-500' };
  if (slope > -0.5) return { badge: 'bg-amber-50 text-amber-700 border border-amber-200', bar: 'bg-amber-400', icon: 'text-amber-600' };
  return { badge: 'bg-red-50 text-red-700 border border-red-200', bar: 'bg-red-500', icon: 'text-red-600' };
}

/** 
 * Converts slope to a fill percentage for the trend bar (0-100).
 * Centers at 50 — positive slope fills right, negative fills left (shown as less).
 */
function slopeToPercent(slope: number | null): number {
  if (slope === null) return 0;
  const clamped = Math.max(-1, Math.min(1, slope));
  return Math.round((clamped + 1) / 2 * 100);
}

function SlopeArrow({ slope }: { slope: number | null }) {
  if (slope === null) return <span className="text-gray-400 text-xs">–</span>;
  if (slope > 0.5) return (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
  if (slope > 0.1) return (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
  if (slope > -0.1) return (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
  if (slope > -0.5) return (
    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
  return (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkillCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded-full" />
        </div>
        <div className="h-7 w-20 bg-gray-100 rounded-lg" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-3 w-full bg-gray-100 rounded-full" />
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-gray-100 rounded" />
          <div className="h-3 w-10 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Skill Card ────────────────────────────────────────────────────────────────

function SkillCard({ skill, health }: { skill: VerifiedSkill; health: SkillHealth | undefined }) {
  const slope = health?.trend_slope ?? null;
  const status = health?.status ?? 'Pending';
  const velocity = slopeToVelocity(slope);
  const colors = slopeToColors(slope);
  const fillPct = slopeToPercent(slope);
  const isPending = status === 'Pending' || !health?.fromCache;

  return (
    <Link href={`/student/skills/${skill.id}`} className="block">
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-purple-700 transition-colors truncate">
              {skill.name}
            </h3>
            <div className="flex items-center gap-2">
              {skill.source === 'university' ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                    <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  University
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  On-Chain
                </span>
              )}
            </div>
          </div>

          {/* Velocity badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg shrink-0 ${colors.badge}`}>
            <SlopeArrow slope={slope} />
            <span>{isPending ? 'Pending' : velocity}</span>
          </div>
        </div>

        {/* Market Demand Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-500 font-medium">
              {isPending ? 'Awaiting market analysis' : `Market: ${status}`}
            </span>
            {!isPending && slope !== null && (
              <span className={`font-bold tabular-nums ${colors.icon}`}>
                {slope > 0 ? '+' : ''}{slope.toFixed(2)}
              </span>
            )}
          </div>

          {isPending ? (
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gray-300 rounded-full animate-pulse w-1/3" />
            </div>
          ) : (
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Last updated */}
        {health?.last_updated && (
          <p className="text-[10px] text-gray-400 mt-3">
            Analyzed {new Date(health.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  // Phase 1: credential identity (blockchain + DB) — fast
  const [skills, setSkills] = useState<VerifiedSkill[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);

  // Phase 2: market health from cache — secondary, non-blocking
  const [healthMap, setHealthMap] = useState<Map<string, SkillHealth>>(new Map());
  const [healthLoading, setHealthLoading] = useState(false);

  const [userWallet, setUserWallet] = useState<string | null>(null);

  // ── Phase 1: Load credential identities ──────────────────────────────────
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setCredentialsLoading(false); return; }

        const { data: profile } = await supabase
          .from('users')
          .select('wallet_address, student_id')
          .eq('id', session.user.id)
          .single();

        setUserWallet(profile?.wallet_address || null);

        const foundSkills: VerifiedSkill[] = [];

        // 1a. University DB credentials
        const dbRes = await fetch('/api/student/credentials');
        if (dbRes.ok) {
          const dbCreds = await dbRes.json();
          dbCreds.forEach((c: any) => {
            foundSkills.push({
              id: c.id,
              name: c.skill_name,
              source: 'university',
              issuedAt: c.issued_at,
              transactionHash: c.transaction_hash,
            });
          });
        }

        // 1b. Blockchain credentials
        if (profile?.wallet_address && ethers.isAddress(profile.wallet_address)) {
          try {
            const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
            const code = await provider.getCode(CONTRACT_ADDRESS);
            if (code !== "0x") {
              const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
              const processedIds = new Set<number>();
              const dbSkillNames = foundSkills.map(s => s.name);

              for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
                if (typeof skillId !== 'number' || processedIds.has(skillId)) continue;
                try {
                  const balance = await contract.balanceOf(profile.wallet_address, skillId);
                  if (balance > 0n) {
                    processedIds.add(skillId);
                    // Only add if not already present from DB (avoid duplicate cards)
                    if (!dbSkillNames.includes(skillName)) {
                      foundSkills.push({
                        id: `bc-${skillId}`,
                        name: skillName,
                        source: 'blockchain',
                      });
                    }
                  }
                } catch (e) {
                  console.warn(`Error scanning skill ${skillName}:`, e);
                }
              }
            } else {
              console.error("Contract not found at address.");
            }
          } catch (blockchainErr) {
            console.warn("Blockchain scan failed:", blockchainErr);
          }
        }

        setSkills(foundSkills);
      } catch (error) {
        console.error("Credentials fetch error:", error);
      } finally {
        setCredentialsLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  // ── Phase 2: Load health data from cache once we have skill names ─────────
  useEffect(() => {
    if (skills.length === 0) return;

    const fetchHealth = async () => {
      setHealthLoading(true);
      try {
        const res = await fetch('/api/student/skill-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillNames: skills.map(s => s.name) }),
        });

        if (res.ok) {
          const json = await res.json();
          const map = new Map<string, SkillHealth>();
          (json.skills as SkillHealth[]).forEach(h => map.set(h.skillName, h));
          setHealthMap(map);
        }
      } catch (err) {
        console.error("Health fetch error:", err);
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealth();
  }, [skills]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const universitySkills = skills.filter(s => s.source === 'university');
  const blockchainSkills = skills.filter(s => s.source === 'blockchain');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="mb-6 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Skills</h1>
        <p className="text-sm md:text-base text-gray-500">Your verified credentials and market health</p>
      </div>

      {/* ── Loading: Phase 1 ── */}
      {credentialsLoading && (
        <div>
          <div className="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => <SkillCardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!credentialsLoading && skills.length === 0 && (
        <div className="bg-white rounded-xl p-12 border-2 border-dashed border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Verified Skills Found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
            {!userWallet
              ? "Connect your wallet on the dashboard to view your blockchain credentials."
              : "We checked the blockchain and your university records, but no VECTOR credentials were found."}
          </p>
          <Link
            href="/student/dashboard"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {/* ── Skills content ── */}
      {!credentialsLoading && skills.length > 0 && (
        <div className="space-y-8">

          {/* Pending health notice (only show while cache loading and there are pending skills) */}
          {healthLoading && (
            <div className="flex items-center gap-2.5 text-sm text-purple-700 bg-purple-50 border border-purple-100 px-4 py-2.5 rounded-lg">
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Fetching market health data...
            </div>
          )}

          {/* University Credentials Section */}
          {universitySkills.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                    <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">University Credentials</h2>
                  <p className="text-xs text-gray-500">{universitySkills.length} issued credential{universitySkills.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {universitySkills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    health={healthMap.get(skill.name)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Blockchain-only Credentials Section */}
          {blockchainSkills.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">On-Chain Only</h2>
                  <p className="text-xs text-gray-500">{blockchainSkills.length} blockchain credential{blockchainSkills.length !== 1 ? 's' : ''} · not yet in university records</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {blockchainSkills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    health={healthMap.get(skill.name)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Legend */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Market Trend Guide</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: 'Strong Growth', slope: 0.8, desc: 'slope > 0.5' },
                { label: 'Growing', slope: 0.3, desc: 'slope > 0.1' },
                { label: 'Stable', slope: 0, desc: 'near zero' },
                { label: 'Cooling', slope: -0.3, desc: 'slope < -0.1' },
                { label: 'Declining', slope: -0.8, desc: 'slope < -0.5' },
              ].map(item => {
                const c = slopeToColors(item.slope);
                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${c.badge}`}>
                      <SlopeArrow slope={item.slope} />
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}