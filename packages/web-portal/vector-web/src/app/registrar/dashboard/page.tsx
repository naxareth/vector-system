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
  const [activeTab, setActiveTab] = useState<'issue' | 'build' | 'batch'>('issue');

  // CSV Batch Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success?: boolean;
    rows?: any[];
    warnings?: string[];
    error?: string;
    rowErrors?: { row: number; issues: string[] }[];
  } | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [batchSchemaId, setBatchSchemaId] = useState<string>('');

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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div>
    </div>
  );

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Credential Management</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('issue')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'issue' ? 'bg-white shadow-sm text-[#06B4C9]' : 'text-gray-500 hover:text-gray-700'}`}>
              Issue Record
            </button>
            <button onClick={() => setActiveTab('batch')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'batch' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Batch Upload
            </button>
            <button onClick={() => setActiveTab('build')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'build' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Template Builder
            </button>
          </div>
        </div>

        {activeTab === 'build' ? (
          <SchemaBuilder />
        ) : activeTab === 'batch' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Batch Upload</h2>
            <p className="text-sm text-gray-500 mb-6">
              Upload a CSV file to issue credentials in bulk. Select a template first — the required columns will match the template.
            </p>

            {/* Step 1: Template selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">1. Choose Template</label>
              <select
                value={batchSchemaId}
                onChange={(e) => { setBatchSchemaId(e.target.value); setCsvResult(null); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              >
                <option value="">— Select a credential template —</option>
                {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              {batchSchemaId && (() => {
                const s = schemas.find(x => x.id === batchSchemaId);
                const schemaFields = s ? Object.keys(s.json_schema.properties) : [];
                return (
                  <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-purple-700">
                      <span className="font-semibold">Required columns:</span>{' '}
                      <code className="bg-purple-100 px-1 rounded">student_id, wallet_address, {schemaFields.join(', ')}</code>
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Step 2: File upload */}
            <label className="block text-sm font-medium text-gray-700 mb-1">2. Upload CSV File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
              onDragLeave={() => setCsvDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCsvDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) { setCsvFile(file); setCsvResult(null); }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${csvDragOver ? 'border-purple-400 bg-purple-50' : csvFile ? 'border-green-300 bg-green-50/50' : 'border-gray-300 hover:border-purple-300'
                }`}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { setCsvFile(e.target.files[0]); setCsvResult(null); } }}
              />
              {csvFile ? (
                <div>
                  <p className="font-semibold text-green-700">{csvFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(csvFile.size / 1024).toFixed(1)} KB — click or drag to replace</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-600">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Max 1 MB, up to 500 rows</p>
                </div>
              )}
            </div>

            {/* Validate button */}
            <button
              disabled={!csvFile || csvUploading || !batchSchemaId}
              onClick={async () => {
                if (!csvFile) return;
                setCsvUploading(true);
                setCsvResult(null);
                try {
                  const form = new FormData();
                  form.append('file', csvFile);
                  if (batchSchemaId) form.append('schema_id', batchSchemaId);
                  const res = await fetch('/api/registrar/csv-upload', { method: 'POST', body: form });
                  const data = await res.json();
                  if (res.ok) {
                    setCsvResult({ success: true, rows: data.rows, warnings: data.warnings });
                  } else {
                    setCsvResult({ success: false, error: data.error, rowErrors: data.rowErrors });
                  }
                } catch (err: any) {
                  setCsvResult({ success: false, error: err.message });
                } finally {
                  setCsvUploading(false);
                }
              }}
              className={`mt-4 w-full py-3 font-bold rounded-xl transition-all ${!csvFile || csvUploading || !batchSchemaId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black shadow-lg'
                }`}
            >
              {csvUploading ? 'Validating...' : !batchSchemaId ? 'Select a template first' : 'Validate CSV'}
            </button>

            {/* Validation Results */}
            {csvResult && (
              <div className={`mt-6 rounded-xl border p-5 ${csvResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`font-bold mb-3 ${csvResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {csvResult.success ? `${csvResult.rows?.length} record(s) ready` : 'Validation failed'}
                </h3>

                {csvResult.error && (
                  <p className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm mb-3">{csvResult.error}</p>
                )}

                {csvResult.rowErrors && csvResult.rowErrors.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {csvResult.rowErrors.map((re, i) => (
                      <p key={i} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm">
                        Row {re.row}: {re.issues.join(', ')}
                      </p>
                    ))}
                  </div>
                )}

                {csvResult.warnings && csvResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="font-semibold text-yellow-800 text-sm mb-1">Sanitization applied:</p>
                    {csvResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-yellow-700">• {w}</p>
                    ))}
                  </div>
                )}

                {/* Validated rows table */}
                {csvResult.success && csvResult.rows && csvResult.rows.length > 0 && (() => {
                  const allKeys = Object.keys(csvResult.rows[0]);
                  return (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-green-200">
                        <table className="w-full text-sm">
                          <thead className="bg-green-100/50">
                            <tr>
                              <th className="text-left py-2 px-3 text-green-800 font-medium">#</th>
                              {allKeys.map(k => (
                                <th key={k} className="text-left py-2 px-3 text-green-800 font-medium capitalize">{k.replace(/_/g, ' ')}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvResult.rows.map((row, i) => (
                              <tr key={i} className="border-t border-green-100">
                                <td className="py-2 px-3 text-green-700">{i + 1}</td>
                                {allKeys.map(k => (
                                  <td key={k} className="py-2 px-3 text-xs">
                                    {k === 'wallet_address' ? `${(row[k] || '').slice(0, 10)}...` : row[k]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Step 3: Mint All */}
                      <button
                        onClick={async () => {
                          const rows = csvResult.rows!;
                          const batchSchema = schemas.find(s => s.id === batchSchemaId);
                          if (!batchSchema) return alert('Template not found.');

                          try {
                            setMintingProgress({ isOpen: true, progress: 5, status: 'minting', message: 'Connecting wallet...' });

                            const { ethereum } = window as any;
                            if (!ethereum) throw new Error('MetaMask not found. Please install it.');
                            const provider = new ethers.BrowserProvider(ethereum, 'any');
                            const signer = await provider.getSigner();
                            const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);

                            let completed = 0;
                            const total = rows.length;

                            for (let idx = 0; idx < rows.length; idx++) {
                              const row = rows[idx];

                              // Phase 1: Request signature
                              setMintingProgress(prev => ({
                                ...prev,
                                progress: Math.round(((idx) / total) * 85) + 10,
                                message: `Record ${idx + 1} of ${total} — sign in MetaMask...`,
                              }));

                              const numericTokenId = Math.floor(Math.random() * 1000000);
                              const tx = await contract.mintSkill(row.wallet_address, numericTokenId, 1);

                              // Phase 2: Wait for chain confirmation
                              setMintingProgress(prev => ({
                                ...prev,
                                message: `Record ${idx + 1} of ${total} — confirming on chain...`,
                              }));
                              await tx.wait();

                              // Phase 3: Save to database
                              setMintingProgress(prev => ({
                                ...prev,
                                message: `Record ${idx + 1} of ${total} — saving to database...`,
                              }));

                              const { student_id, wallet_address, skill_tags: rawTags, ...credentialData } = row;
                              const skillTags = rawTags ? String(rawTags).split(',').map((t: string) => t.trim()).filter(Boolean) : [];

                              const saveRes = await fetch('/api/registrar/credentials', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  user_id: student_id,
                                  schema_id: batchSchemaId,
                                  skill_name: batchSchema.title,
                                  skill_tags: skillTags,
                                  credential_data: credentialData,
                                  private_notes: '',
                                  certificate_number: `BATCH-${Date.now()}-${idx + 1}`,
                                  token_id: numericTokenId.toString(),
                                  transaction_hash: tx.hash,
                                }),
                              });

                              if (!saveRes.ok) {
                                const errText = await saveRes.text().catch(() => 'Unknown error');
                                throw new Error(`Minted on-chain but failed to save record ${idx + 1}: ${errText}`);
                              }

                              completed++;
                            }

                            setMintingProgress({
                              isOpen: true, progress: 100, status: 'complete',
                              message: `Successfully issued ${completed} credential${completed > 1 ? 's' : ''}.`,
                            });
                          } catch (error: any) {
                            setMintingProgress({ isOpen: true, progress: 0, status: 'error', message: error.message || 'Batch minting failed' });
                          }
                        }}
                        className="mt-4 w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg"
                      >
                        Mint {csvResult.rows.length} Credential{csvResult.rows.length > 1 ? 's' : ''} on Blockchain
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Help text */}
            <div className="mt-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">CSV Format</p>
              <p className="text-xs text-gray-500">Select a template above to see the exact columns needed. <strong>student_id</strong> and <strong>wallet_address</strong> are always required.</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-gray-400">• Dangerous characters (=, +, -, @) in cells are automatically neutralized</p>
                <p className="text-xs text-gray-400">• Max file size: 1 MB — Max rows: 500</p>
              </div>
            </div>
          </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white"
                >
                  {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>

              {/* Dynamic Fields Renderer */}
              {selectedSchema && (
                <div className="md:col-span-2 bg-[#06B4C9]/5 p-6 rounded-xl border border-[#06B4C9]/20 space-y-4">
                  <h3 className="text-sm font-bold text-[#157942] border-b border-[#06B4C9]/20 pb-2 mb-4">Dynamic Schema Fields</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedSchema.json_schema.properties).map(([key, fieldDetails]) => {
                      const isSkillTags = key === 'skill_tags';
                      return (
                        <div key={key} className={isSkillTags ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                            {fieldDetails.title}
                            {selectedSchema.json_schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                            {isSkillTags && (
                              <span className="ml-2 text-xs text-[#06B4C9] bg-[#06B4C9]/10 px-2 py-0.5 rounded font-semibold">
                                Market Intelligence
                              </span>
                            )}
                          </label>
                          {isSkillTags ? (
                            <>
                              <input
                                type="text"
                                onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                className="w-full px-3 py-2 border border-[#06B4C9]/30 rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white"
                                placeholder="e.g. React, Node.js, PostgreSQL, Express"
                              />
                              <p className="text-xs text-[#06B4C9] mt-1">
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