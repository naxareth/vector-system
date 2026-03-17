 'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import SchemaBuilder from '@/components/dashboard/SchemaBuilder';
import HelpTip from '@/components/shared/HelpTip';
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

interface VerifiedCredential {
  id: string;
  skill_name: string;
  issued_at: string;
  transaction_hash: string;
  token_id: string;
  revoked?: boolean;
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

// Contextual help hints for common dynamic form fields
const FIELD_HINTS: Record<string, string> = {
  score: 'The student\'s final score or grade for this certificate. Enter as a number (e.g. 85 or 3.5).',
  issuing_body: 'The organization or institution issuing this certificate (e.g. "University of the Philippines" or "AWS").',
  certification_name: 'The official name of the certification being awarded (e.g. "AWS Solutions Architect" or "CISCO CCNA").',
  valid_until: 'The expiration date of this certificate. Select a future date using the calendar — maximum 2 years from today.',
  degree_name: 'The full name of the degree being conferred (e.g. "Bachelor of Science in Computer Science").',
  major: 'The student\'s major or area of specialization.',
  graduation_date: 'The date the student graduated or will graduate.',
  gpa: 'The student\'s final Grade Point Average (e.g. 3.8 on a 4.0 scale).',
  honors: 'Any Latin honors or distinctions (e.g. "Cum Laude", "Magna Cum Laude").',
  program_name: 'The name of the training program or bootcamp.',
  hours_completed: 'Total number of training hours the student completed.',
  capstone_url: 'A link to the student\'s final capstone project (if applicable).',
  passed_with_distinction: 'Whether the student earned a distinction or passed with honors.',
  event_name: 'The name of the event, competition, or hackathon.',
  track_category: 'The specific track or category the student participated in (e.g. "AI/ML", "Web Development").',
  placement: 'The student\'s final placement (e.g. 1 for 1st place, 2 for 2nd).',
  project_name: 'The name of the project the student submitted or presented.',
};

export default function RegistrarDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issue' | 'build' | 'batch'>('issue');

  // CSV Batch Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    success?: boolean;
    rows?: Record<string, string | number | boolean | null>[];
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
  const [studentCredentials, setStudentCredentials] = useState<VerifiedCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [dynamicData, setDynamicData] = useState<Record<string, string | number | boolean | null>>({});
  const [staticData, setStaticData] = useState({ certificateNumber: '', privateNotes: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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

  // Fetch credentials whenever a student is selected
  const fetchCreds = async () => {
    if (!selectedStudent) {
      setStudentCredentials([]);
      return;
    }
    setCredentialsLoading(true);
    try {
      // Use the server-side API to bypass RLS and get decrypted notes
      const res = await fetch('/api/registrar/credentials');
      if (!res.ok) throw new Error('Failed to fetch credentials');
      const allCreds: any[] = await res.json();
      
      // Filter for the selected student
      const studentCreds = allCreds.filter(c => c.user_id === selectedStudent.id);
      setStudentCredentials(studentCreds);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
    setCredentialsLoading(false);
  };

  useEffect(() => {
    fetchCreds();
  }, [selectedStudent]);

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

  const handleDynamicInputChange = (key: string, value: string | number | boolean | null) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  };

  const handleIssueCredential = async () => {
    // 🛡️ Client-side validation with inline errors
    const errors: Record<string, string> = {};

    if (!selectedStudent) errors['student'] = 'Please select a student.';
    if (!selectedSchema) errors['schema'] = 'Please select a certificate template.';

    // Validate required dynamic fields
    if (selectedSchema) {
      const requiredKeys = selectedSchema.json_schema.required || [];
      requiredKeys.forEach((key: string) => {
        const val = dynamicData[key];
        if (val === undefined || val === null || String(val).trim() === '') {
          const fieldDef = selectedSchema.json_schema.properties[key];
          const label = fieldDef?.title || key.replace(/_/g, ' ');
          errors[key] = `${label} is required.`;
        }
      });
    }

    // skill_tags special validation
    const rawTags = dynamicData['skill_tags'];
    if (!rawTags || String(rawTags).trim() === '') {
      errors['skill_tags'] = 'Skills are required. Enter the skills this certificate represents (comma-separated).';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const skillTags = parseSkillTags(String(rawTags));
    if (skillTags.length === 0) {
      setValidationErrors({ skill_tags: 'Please enter at least one skill tag.' });
      return;
    }

    try {
      setMintingProgress({ isOpen: true, progress: 20, status: 'minting', message: 'Opening secure wallet…' });

      const { ethereum } = window as unknown as { ethereum: ethers.Eip1193Provider };
      const provider = new ethers.BrowserProvider(ethereum, "any");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);

      setMintingProgress(prev => ({ ...prev, progress: 40, message: 'Recording certificate on the blockchain…' }));
      // Use timestamp for higher uniqueness than random
      const numericTokenId = Date.now() % 100000000;
      const tx = await contract.mintSkill(selectedStudent!.wallet_address, numericTokenId, 1);

      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for confirmation…' }));
      await tx.wait();

      setMintingProgress(prev => ({ ...prev, progress: 90, message: 'Saving certificate to the database…' }));

      // Build credential_data without skill_tags (it's promoted to its own column)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { skill_tags: _removed, ...credentialDataWithoutTags } = dynamicData;

      const response = await fetch('/api/registrar/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedStudent!.id,
          schema_id: selectedSchema!.id,
          skill_name: selectedSchema!.title,       // credential display title — unchanged
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
        message: 'Certificate issued and verified successfully!',
        txHash: tx.hash
      });

      // ✅ Refresh the credentials list immediately so the new one appears in the management panel
      await fetchCreds();

      // Clear form
      setDynamicData({});
      setStaticData({ certificateNumber: '', privateNotes: '' });
      setValidationErrors({});
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setMintingProgress({ isOpen: true, progress: 0, status: 'error', message });
    }
  };

  const handleRevokeCredential = async (cred: VerifiedCredential) => {
    if (!selectedStudent || !selectedStudent.wallet_address) {
      alert("Selected student does not have a connected wallet.");
      return;
    }

    const confirmRevoke = window.confirm(
      `Are you sure you want to REVOKE "${cred.skill_name}" for ${selectedStudent.full_name}?\n\nThis will permanently burn the blockchain token and mark the credential as revoked in the database.`
    );
    if (!confirmRevoke) return;

    try {
      setMintingProgress({
        isOpen: true,
        progress: 10,
        status: 'minting',
        message: 'Requesting signature to burn token...',
      });

      const { ethereum } = window as unknown as { ethereum: ethers.Eip1193Provider };
      if (!ethereum) throw new Error('MetaMask not found. Please install MetaMask to revoke credentials.');

      const provider = new ethers.BrowserProvider(ethereum, 'any');
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);
      let tx: any = null;

      // Verify balance before burning to prevent silent reverts
      const balance = await contract.balanceOf(selectedStudent.wallet_address, cred.token_id);
      let skipBlockchain = false;

      if (balance < BigInt(1)) {
        const forceRevoke = window.confirm(
          `GHOST TOKEN DETECTED: The blockchain reports balance 0 for Token ID ${cred.token_id}.\n\nThis usually happens if the local Hardhat node was restarted. Would you like to mark this as REVOKED in the database anyway (Soft Cleanup)?`
        );
        if (forceRevoke) {
          skipBlockchain = true;
        } else {
          setMintingProgress({ isOpen: false, progress: 0, status: 'complete', message: '' });
          return;
        }
      }

      if (!skipBlockchain) {
        setMintingProgress({ isOpen: true, progress: 40, status: 'minting', message: 'Executing revoke on Polygon...' });
        
        // Execute Burn (Revoke)
        tx = await contract.revokeSkill(selectedStudent.wallet_address, cred.token_id, 1);
        
        setMintingProgress({ isOpen: true, progress: 70, status: 'minting', message: 'Waiting for blockchain confirmation...' });
        await tx.wait();
      }

      setMintingProgress({ isOpen: true, progress: 90, status: 'minting', message: skipBlockchain ? 'Performing DB cleanup...' : 'Updating database records...' });
      
      // Mark as revoked in DB via server-side API (bypasses RLS)
      const res = await fetch('/api/registrar/credentials', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: cred.id, revoked: true })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Blockchain action succeeded, but database sync failed: ${errorData.error || res.statusText}${errorData.details ? ` (${errorData.details})` : ''}`);
      }

      // Refresh local state
      setStudentCredentials(prev => prev.map(c => c.id === cred.id ? { ...c, revoked: true } : c));

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: skipBlockchain 
          ? 'Database record marked as revoked (Blockchain skip).' 
          : 'Credential successfully revoked and token burned.',
        txHash: tx?.hash,
      });
    } catch (err: any) {
      console.error('Revocation Error:', err);
      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'error',
        message: err.reason || err.message || 'Transaction failed or was rejected.',
      });
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0B0F19]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B4C9]"></div>
    </div>
  );

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-gray-200 dark:border-[#1E2536] pb-4 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Certificate Workspace <HelpTip text="This is your main workspace for managing student certificates. Use the tabs to issue individual certificates, upload in bulk, or design new certificate templates. Every certificate you issue is permanently recorded and verifiable on the blockchain." /></h1>
          <div className="flex bg-gray-100 dark:bg-[#131825] p-1 rounded-lg">
            <button onClick={() => setActiveTab('issue')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'issue' ? 'bg-white dark:bg-[#1E2536] shadow-sm text-[#06B4C9]' : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'}`}>
              Issue Certificate
            </button>
            <button onClick={() => setActiveTab('batch')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'batch' ? 'bg-white dark:bg-[#1E2536] shadow-sm text-[#06B4C9]' : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'}`}>
              Batch Import
            </button>
            <button onClick={() => setActiveTab('build')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'build' ? 'bg-white dark:bg-[#1E2536] shadow-sm text-[#06B4C9]' : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-white'}`}>
              Template Builder
            </button>
          </div>
        </div>

        {activeTab === 'build' ? (
          <SchemaBuilder />
        ) : activeTab === 'batch' ? (
          <div className="bg-white dark:bg-[#0E1220] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Batch Import <HelpTip text="Upload a spreadsheet (CSV) to issue many certificates at once. This saves time when processing graduations or group certifications. Each row in the spreadsheet becomes one certificate." /></h2>
            <p className="text-sm text-gray-500 dark:text-[#94A3B8] mb-6">
              Upload a spreadsheet to issue multiple certificates at once. Select a template first — the required columns will match the template.
            </p>

            {/* Step 1: Template selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-1">1. Choose Template <HelpTip text="Pick which certificate type you're issuing (e.g. Academic Degree, Bootcamp Certificate). The template determines what columns your spreadsheet needs. You can create new templates in the 'Template Builder' tab." /></label>
              <select
                value={batchSchemaId}
                onChange={(e) => { setBatchSchemaId(e.target.value); setCsvResult(null); }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white dark:bg-[#131825] dark:text-white"
              >
                <option value="">— Select a certificate template —</option>
                {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              {batchSchemaId && (() => {
                const s = schemas.find(x => x.id === batchSchemaId);
                const schemaFields = s ? Object.keys(s.json_schema.properties) : [];
                return (
                    <div className="mt-2 bg-accent-10 border border-accent rounded-lg px-3 py-2">
                    <p className="text-xs text-accent">
                      <span className="font-semibold">Required columns:</span>{' '}
                      <code className="bg-accent-10 px-1 rounded">student_id, wallet_address, {schemaFields.join(', ')}</code>
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Step 2: File upload */}
            <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-1">2. Upload Spreadsheet (CSV)</label>
              <div
              onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
              onDragLeave={() => setCsvDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCsvDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) { setCsvFile(file); setCsvResult(null); }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${csvDragOver ? 'border-accent bg-accent-10' : csvFile ? 'border-green-300 bg-green-50/50' : 'border-gray-300 hover:border-accent'
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
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "An unknown error occurred";
                  setCsvResult({ success: false, error: message });
                } finally {
                  setCsvUploading(false);
                }
              }}
              className={`mt-4 w-full py-3 font-bold rounded-xl transition-all ${!csvFile || csvUploading || !batchSchemaId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-accent text-white hover:opacity-90 shadow-lg'
                }`}
            >
              {csvUploading ? 'Checking file…' : !batchSchemaId ? 'Select a template first' : 'Validate & Preview'}
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
                    {csvResult.rowErrors.map((re: { row: number; issues?: string[]; message?: string; field?: string }, i: number) => (
                      <p key={i} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm">
                        Row {re.row}: {re.issues ? re.issues.join(', ') : re.message ? `${re.field}: ${re.message}` : JSON.stringify(re)}
                      </p>
                    ))}
                  </div>
                )}

                {csvResult.warnings && csvResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="font-semibold text-yellow-800 text-sm mb-1">Auto-corrections applied:</p>
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
                                    {k === 'wallet_address' ? `${String(row[k] || '').slice(0, 10)}...` : row[k]}
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

                            const { ethereum } = window as unknown as { ethereum: ethers.Eip1193Provider };
                            if (!ethereum) throw new Error('MetaMask not found. Please install it.');
                            const provider = new ethers.BrowserProvider(ethereum, 'any');
                            const signer = await provider.getSigner();
                            const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);

                            const total = rows.length;

                            // ── Build batch arrays for single ERC-1155 batchMintSkills call ──
                            const addresses: string[] = [];
                            const tokenIds: number[] = [];
                            const amounts: number[] = [];

                            for (const row of rows) {
                              addresses.push(String(row.wallet_address));
                              tokenIds.push(Math.floor(Math.random() * 1000000));
                              amounts.push(1);
                            }

                            // Phase 1: Single on-chain transaction (1 MetaMask popup)
                            setMintingProgress(prev => ({
                              ...prev,
                              progress: 15,
                              message: `Minting ${total} credential${total > 1 ? 's' : ''} — sign once in MetaMask...`,
                            }));

                            const tx = await contract.batchMintSkills(addresses, tokenIds, amounts);

                            // Phase 2: Wait for chain confirmation
                            setMintingProgress(prev => ({
                              ...prev,
                              progress: 45,
                              message: `Confirming batch transaction on Polygon...`,
                            }));
                            await tx.wait();

                            // Phase 3: Save each credential to database
                            let completed = 0;
                            for (let idx = 0; idx < rows.length; idx++) {
                              const row = rows[idx];
                              setMintingProgress(prev => ({
                                ...prev,
                                progress: 50 + Math.round((idx / total) * 45),
                                message: `Saving record ${idx + 1} of ${total} to database...`,
                              }));

                              const { student_id, wallet_address: _wallet_address, skill_tags: rawTags, ...credentialData } = row;
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
                                  token_id: tokenIds[idx].toString(),
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
                              message: `Successfully issued ${completed} certificate${completed > 1 ? 's' : ''}.`,
                            });
                          } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : 'Batch processing failed';
                            setMintingProgress({ isOpen: true, progress: 0, status: 'error', message });
                          }
                        }}
                        className="mt-4 w-full py-3 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg"
                      >
                        Issue {csvResult.rows.length} Certificate{csvResult.rows.length > 1 ? 's' : ''}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Help text */}
            <div className="mt-5 bg-gray-50 dark:bg-[#131825] rounded-xl p-4 border border-gray-100 dark:border-[#1E2536]">
              <p className="text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-2">Spreadsheet Format Tips</p>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Select a template above to see the exact columns needed. <strong>student_id</strong> and <strong>wallet_address</strong> are always required.</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-gray-400 dark:text-[#64748B]">• Special characters are automatically cleaned</p>
                <p className="text-xs text-gray-400 dark:text-[#64748B]">• Maximum file size: 1 MB — Maximum rows: 500</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0E1220] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Issue Certificate <HelpTip text="Fill out the form below to create and send a verified certificate to one student. You'll need to select a student, choose a template, fill in the details, and approve the transaction in your wallet. The certificate will be permanently recorded on the blockchain." /></h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Student Search */}
              <div className="md:col-span-2 relative" ref={searchRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-2">Find Student</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedStudent(null); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white dark:bg-[#131825] dark:text-white"
                  placeholder="Search by name or student ID..."
                />
                {validationErrors['student'] && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors['student']}</p>
                )}
                {showDropdown && searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#283042] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1E2536] flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-[#94A3B8]">No student found</p>
                        <p className="text-xs text-gray-400 dark:text-[#64748B] mt-0.5">Try a different name or student ID</p>
                      </div>
                    ) : filteredStudents.map((s) => (
                      <div key={s.id} onClick={() => { setSelectedStudent(s); setSearchQuery(`${s.full_name}${s.student_id ? ` (${s.student_id})` : ''}`); setShowDropdown(false); }} className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-[#1E2536] flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-[#64748B]">ID: {s.student_id || 'Not Assigned'}</p>
                        </div>
                        {s.wallet_address ?
                          <span className="text-[10px] bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-1 rounded font-bold">Wallet Ready ✓</span>
                          : <span className="text-[10px] bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-1 rounded font-bold">No Wallet <HelpTip size={12} text="This student hasn't connected a digital wallet (MetaMask) yet. They'll need to set one up from their dashboard before you can issue them a blockchain-verified certificate. You can still prepare the certificate, but the final step requires a wallet." /></span>
                        }
                      </div>
                    ))}
                  </div>
                )}
                {selectedStudent && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-[#94A3B8]">
                    <span className="font-medium">Selected:</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{selectedStudent.full_name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-mono">ID: {selectedStudent.student_id || 'Not Assigned'}</span>
                  </div>
                )}
              </div>
              
              {/* Schema Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-2">Certificate Template <HelpTip text="Each template defines different fields to fill in. For example, an Academic Degree template asks for degree name, GPA, and graduation date, while a Bootcamp template asks for program name and hours completed. Create new templates under the 'Template Builder' tab." /></label>
                <select
                  value={selectedSchema?.id || ''}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white dark:bg-[#131825] dark:text-white"
                >
                  {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>

              {/* Dynamic Fields Renderer */}
              {selectedSchema && (
                <div className="md:col-span-2 bg-[#06B4C9]/5 dark:bg-[#06B4C9]/10 p-6 rounded-xl border border-[#06B4C9]/20 dark:border-[#06B4C9]/30 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white border-b border-[#06B4C9]/20 dark:border-[#06B4C9]/30 pb-2 mb-4 flex items-center gap-1">
                    Fields in this template
                    <HelpTip text="These are the specific details required for the selected certificate type. Fill in each field with the student's information. Fields marked with * are required and must be completed before you can issue the certificate." />
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedSchema.json_schema.properties).map(([key, fieldDetails]) => {
                      const isSkillTags = key === 'skill_tags';
                      // Humanize label: use display title, or convert snake_case to Title Case
                      const humanLabel = fieldDetails.title && fieldDetails.title !== key
                        ? fieldDetails.title
                        : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      // Date field constraints: today to 2 years from now
                      const isDateField = fieldDetails.type === 'date' || key.includes('date') || key.includes('until') || key.includes('expir') || key.includes('graduation');
                      const today = new Date().toISOString().split('T')[0];
                      const maxDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      return (
                        <div key={key} className={isSkillTags ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-1">
                            {humanLabel}
                            {selectedSchema.json_schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                            {FIELD_HINTS[key] && !isSkillTags && <HelpTip size={13} text={FIELD_HINTS[key]} />}
                            {isSkillTags && (
                              <span className="ml-2 text-xs text-[#06B4C9] bg-[#06B4C9]/10 px-2 py-0.5 rounded font-semibold">
                                Suggested Skills
                              </span>
                            )}
                          </label>
                          {isSkillTags ? (
                            <>
                              <input
                                type="text"
                                onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                                placeholder="e.g. React, Node.js, PostgreSQL, Express"
                              />
                              <p className="text-xs text-[#06B4C9] mt-1">
                                These become the student&apos;s skill tags shown on their profile.
                              </p>
                            </>
                          ) : fieldDetails.type === 'boolean' ? (
                            <select
                              onChange={(e) => handleDynamicInputChange(key, e.target.value === 'true')}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                            >
                              <option value="">Select...</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : isDateField ? (
                            <>
                              <input
                                type="date"
                                min={key.includes('graduation') || key.includes('issued') || key.includes('completed') ? undefined : today}
                                max={maxDate}
                                onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                              />
                              {(key.includes('until') || key.includes('expir') || key.includes('valid')) && (
                                <p className="text-xs text-gray-500 dark:text-[#64748B] mt-1">
                                  Select a future date (up to 2 years from today).
                                </p>
                              )}
                            </>
                          ) : (
                            <input
                              type={fieldDetails.type === 'number' ? 'number' : 'text'}
                              onChange={(e) => handleDynamicInputChange(key, fieldDetails.type === 'number' ? Number(e.target.value) : e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                              placeholder={`Enter ${humanLabel.toLowerCase()}...`}
                            />
                          )}
                          {validationErrors[key] && (
                            <p className="text-xs text-red-500 mt-1">{validationErrors[key]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Static Metadata */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-2">Certificate / Serial Number <HelpTip text="Enter a unique identifier for this certificate (like a serial number on a diploma). This helps you track and reference it later. Use any format your institution prefers, e.g. CERT-2027-001 or CS-BSc-0042." /></label>
                <input
                  type="text"
                  onChange={(e) => setStaticData({ ...staticData, certificateNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                  placeholder="e.g. CERT-2027-001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#CBD5E1] mb-2">Internal Notes <HelpTip text="Optional private notes only visible to registrars. Use this for internal memos, special circumstances, or anything you want to remember about this certificate. Students will not see these notes." /></label>
                <textarea
                  onChange={(e) => setStaticData({ ...staticData, privateNotes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                  rows={3}
                  placeholder="Internal notes (only visible to registrars)..."
                />
              </div>
            </div>

            <button
              onClick={handleIssueCredential}
              className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Issue Verified Certificate
            </button>
          </div>
        )}

        {/* Minting Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#131825] rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {mintingProgress.status === 'complete' ? 'Success!' : mintingProgress.status === 'error' ? 'Something went wrong' : 'Processing…'}
              </h2>
              <p className="mb-4 text-gray-600 dark:text-[#94A3B8]">{mintingProgress.message}</p>
              <div className="w-full bg-gray-100 dark:bg-[#1E2536] rounded-full h-2 overflow-hidden mb-6">
                <div
                  className={`h-full transition-all duration-500 ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-[#06B4C9]'}`}
                  style={{ width: `${mintingProgress.progress}%` }}
                />
              </div>
              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (
                <button
                  onClick={() => setMintingProgress({ isOpen: false, progress: 0, status: 'minting', message: '' })}
                  className="w-full py-3 bg-[#06B4C9] hover:bg-[#0496a3] text-white font-bold rounded-xl transition-all"
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