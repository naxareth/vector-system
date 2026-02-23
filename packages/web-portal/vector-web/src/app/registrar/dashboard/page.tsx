'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import SchemaBuilder from '@/components/dashboard/SchemaBuilder';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabaseClient';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain';

interface CredentialSchema {
  id: string;
  title: string;
  json_schema: {
    properties: Record<string, { type: string; title: string }>;
    required: string[];
  };
}

interface StudentRecord {
  id: string;
  full_name: string;
  student_id: string;
  wallet_address: string | null;
}

interface MintingProgress {
  isOpen: boolean;
  progress: number;
  status: 'minting' | 'complete' | 'error';
  message: string;
  txHash?: string;
}

// Parses the registrar's comma-separated skill_tags input into a clean string array
// e.g. "React, Node.js,  PostgreSQL " → ["React", "Node.js", "PostgreSQL"]
function parseSkillTags(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function RegistrarDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issue' | 'build'>('issue');

  const [schemas, setSchemas] = useState<CredentialSchema[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<CredentialSchema | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [staticData, setStaticData] = useState({ certificateNumber: '', privateNotes: '' });
  const [mintingProgress, setMintingProgress] = useState<MintingProgress>({
    isOpen: false, progress: 0, status: 'minting', message: ''
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.replace('/login');
        await Promise.all([fetchSchemas(), fetchStudents()]);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    initData();

    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const fetchSchemas = async () => {
    const { data } = await supabase.from('credential_schemas').select('*').order('created_at', { ascending: false });
    if (data) {
      setSchemas(data);
      if (data.length > 0) setSelectedSchema(data[0]);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('users').select('id, full_name, student_id, wallet_address').eq('role', 'student').order('full_name');
    if (data) setStudents(data);
  };

  const handleSchemaChange = (schemaId: string) => {
    const schema = schemas.find(s => s.id === schemaId) || null;
    setSelectedSchema(schema);
    setDynamicData({});
  };

  const handleDynamicInputChange = (key: string, value: any) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  };

  const handleIssueCredential = async () => {
    if (!selectedStudent || !selectedSchema) {
      return alert("Please select a student and a schema template.");
    }

    // 🛡️ Validate skill_tags is filled before minting
    const rawTags = dynamicData['skill_tags'];
    if (!rawTags || String(rawTags).trim() === '') {
      return alert("Skill Tags are required. Enter the marketable skills this credential represents (comma-separated).");
    }

    const skillTags = parseSkillTags(String(rawTags));
    if (skillTags.length === 0) {
      return alert("Please enter at least one skill tag.");
    }

    try {
      setMintingProgress({ isOpen: true, progress: 20, status: 'minting', message: 'Connecting to Digital Vault...' });

      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum, "any");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);

      setMintingProgress(prev => ({ ...prev, progress: 40, message: 'Securing W3C Proof on Polygon...' }));
      const numericTokenId = Math.floor(Math.random() * 1000000);
      const tx = await contract.mintSkill(selectedStudent.wallet_address, numericTokenId, 1);

      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for network confirmation...' }));
      await tx.wait();

      setMintingProgress(prev => ({ ...prev, progress: 90, message: 'Generating JSON-LD Payload...' }));

      // Build credential_data without skill_tags (it's promoted to its own column)
      const { skill_tags: _removed, ...credentialDataWithoutTags } = dynamicData;

      const response = await fetch('/api/registrar/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedStudent.id,
          schema_id: selectedSchema.id,
          skill_name: selectedSchema.title,       // credential display title — unchanged
          skill_tags: skillTags,                   // ✅ extracted marketable skills array
          credential_data: credentialDataWithoutTags,
          private_notes: staticData.privateNotes,
          certificate_number: staticData.certificateNumber,
          token_id: numericTokenId.toString(),
          transaction_hash: tx.hash
        })
      });

      if (!response.ok) throw new Error(await response.text());

      setMintingProgress({
        isOpen: true, progress: 100, status: 'complete',
        message: 'Verifiable Credential successfully issued!',
        txHash: tx.hash
      });
    } catch (error: any) {
      setMintingProgress({ isOpen: true, progress: 0, status: 'error', message: error.message || "Minting failed" });
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Credential Management</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('issue')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'issue' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Issue Record
            </button>
            <button onClick={() => setActiveTab('build')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'build' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Template Builder
            </button>
          </div>
        </div>

        {activeTab === 'build' ? (
          <SchemaBuilder />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Issue Verifiable Credential</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Student Search */}
              <div className="md:col-span-2 relative" ref={searchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Find Student</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedStudent(null); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Search by name or student ID..."
                />
                {showDropdown && searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredStudents.map((s) => (
                      <div key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(s.full_name); setShowDropdown(false); }} className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                        </div>
                        {s.wallet_address
                          ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Vault Linked</span>
                          : <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">No Vault</span>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schema Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Credential Template (W3C Schema)</label>
                <select
                  value={selectedSchema?.id || ''}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>

              {/* Dynamic Fields Renderer */}
              {selectedSchema && (
                <div className="md:col-span-2 bg-purple-50/50 p-6 rounded-xl border border-purple-100 space-y-4">
                  <h3 className="text-sm font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4">Dynamic Schema Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedSchema.json_schema.properties).map(([key, fieldDetails]) => {
                      const isSkillTags = key === 'skill_tags';
                      return (
                        <div key={key} className={isSkillTags ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                            {fieldDetails.title}
                            {selectedSchema.json_schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                            {isSkillTags && (
                              <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded font-semibold">
                                Market Intelligence
                              </span>
                            )}
                          </label>
                          {isSkillTags ? (
                            <>
                              <input
                                type="text"
                                onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                placeholder="e.g. React, Node.js, PostgreSQL, Express"
                              />
                              <p className="text-xs text-purple-600 mt-1">
                                These become the student's individual skill cards with live market health scores.
                              </p>
                            </>
                          ) : fieldDetails.type === 'boolean' ? (
                            <select
                              onChange={(e) => handleDynamicInputChange(key, e.target.value === 'true')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                            >
                              <option value="">Select...</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <input
                              type={fieldDetails.type === 'number' ? 'number' : fieldDetails.type === 'date' ? 'date' : 'text'}
                              onChange={(e) => handleDynamicInputChange(key, fieldDetails.type === 'number' ? Number(e.target.value) : e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder={`Enter ${fieldDetails.title.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Static Metadata */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Certificate / Serial Number</label>
                <input
                  type="text"
                  onChange={(e) => setStaticData({ ...staticData, certificateNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. W3C-2027-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Confidential Remarks</span>
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-bold">🔒 Encrypted Storage</span>
                </label>
                <textarea
                  onChange={(e) => setStaticData({ ...staticData, privateNotes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Internal registrar notes..."
                />
              </div>
            </div>

            <button
              onClick={handleIssueCredential}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Issue W3C Verified Credential
            </button>
          </div>
        )}

        {/* Minting Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {mintingProgress.status === 'complete' ? 'Success!' : mintingProgress.status === 'error' ? 'Failed' : 'Processing'}
              </h2>
              <p className="mb-4 text-gray-600">{mintingProgress.message}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-6">
                <div
                  className={`h-full transition-all duration-500 ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-purple-600'}`}
                  style={{ width: `${mintingProgress.progress}%` }}
                />
              </div>
              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (
                <button
                  onClick={() => setMintingProgress({ isOpen: false, progress: 0, status: 'minting', message: '' })}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}