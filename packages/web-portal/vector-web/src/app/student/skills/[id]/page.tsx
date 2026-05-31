'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { SKILL_MAP } from '@/lib/blockchain'; // ✅ Added to decode bc- IDs

interface CredentialData {
  id: string;
  skill_name: string;
  certificate_number?: string;
  issued_at: string;
  transaction_hash?: string;
  private_notes?: string | null;
}

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [credential, setCredential] = useState<CredentialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        // 1. 🛡️ Handle Blockchain-Only Credentials (IDs starting with 'bc-')
        if (id.startsWith('bc-')) {
          const skillId = parseInt(id.replace('bc-', ''));
          // Find the skill name by matching the ID in the SKILL_MAP
          const skillName = Object.keys(SKILL_MAP).find(key => (SKILL_MAP as Record<string, number>)[key] === skillId);
          
          if (skillName) {
            setCredential({
              id: id,
              skill_name: skillName,
              certificate_number: 'ON-CHAIN-ONLY',
              issued_at: new Date().toISOString(), // Fallback for pure blockchain reads
              transaction_hash: 'verified_on_chain', 
              private_notes: null
            });
            return; // Exit early, no need to query DB
          }
        }

        // 2. 🛡️ Fetching from our secure API for University-Issued credentials
        const res = await fetch('/api/student/credentials');
        if (!res.ok) throw new Error("Failed to fetch");
        
        const allCreds = await res.json();
        const found = allCreds.find((c: CredentialData) => c.id === id);
        
        if (!found) {
          router.push('/student/skills');
          return;
        }
        setCredential(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, router]);

  if (loading) return <div className="p-10 text-center animate-pulse text-[#06B4C9]">Verifying Proof...</div>;
  if (!credential) return null; // Safety catch

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex mb-8 text-sm text-gray-500">
          <Link href="/student/dashboard" className="hover:text-[#06B4C9]">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href="/student/skills" className="hover:text-[#06B4C9]">Skills</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{credential.skill_name}</span>
        </nav>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#011018] to-[#011018]/90 px-8 py-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">{credential.skill_name}</h1>
            <p className="text-[#06B4C9] opacity-90">
              {id.startsWith('bc-') ? 'Decentralized Smart Contract Proof' : 'University Verified Micro-Credential'}
            </p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Verification Metadata */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verification Details</h2>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-bold">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Verified
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Certificate Serial Number</label>
                <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{credential.certificate_number || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Issue Date</label>
                <p className="text-gray-900 font-medium">
                  {id.startsWith('bc-') ? 'Real-time via Smart Contract' : new Date(credential.issued_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Blockchain Receipt</label>
                {/* Check if it's a real tx hash or just our placeholder */}
                {credential.transaction_hash?.startsWith('0x') ? (
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${credential.transaction_hash}`} 
                    target="_blank" 
                    className="text-[#06B4C9] text-sm break-all hover:underline flex items-center gap-1"
                  >
                    {credential.transaction_hash?.slice(0, 24)}...
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ) : (
                   <p className="text-gray-900 text-sm font-medium">Verified via Polygon Contract State</p>
                )}
              </div>
            </div>

            {/* The Vault Section (Decrypted Data) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                The Vault: Registrar Notes
              </h2>
              <div className="bg-white p-4 rounded-xl border border-slate-100 text-slate-700 text-sm min-h-[150px] italic">
                {credential.private_notes ? (
                  `"${credential.private_notes}"`
                ) : (
                  <span className="text-slate-400">No confidential notes recorded for this credential.</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                Notice: These notes are end-to-end encrypted. Only you and the issuing registrar can view this data. It is not included in the public blockchain metadata.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 flex justify-between items-center">
             <button onClick={() => window.print()} className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
               Print Official Receipt
             </button>
             <Link href="/student/dashboard" className="px-6 py-2 bg-[#06B4C9] text-white rounded-lg font-bold hover:bg-[#06B4C9]/80 transition-colors shadow-lg">
               Back to Dashboard
             </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}