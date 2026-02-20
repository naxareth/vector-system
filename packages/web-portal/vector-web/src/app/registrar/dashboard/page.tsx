'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabaseClient';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain';
import { z } from 'zod'; 

// 2. Define Validation Schema (No Web3 Jargon)
const mintingSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Student must have a linked Digital Vault"),
  credentialId: z.string().min(1, "Please select a credential type"),
  newCredentialName: z.string().optional(),
  courseCode: z.string().max(20, "Course code too long").optional(),
  issuanceDate: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', "Invalid Date"),
  certificateNumber: z.string()
    .min(3, "Too short")
    .max(50, "Too long")
    .regex(/^[a-zA-Z0-9-]+$/, "Serial number can only contain letters, numbers, and dashes"), 
  privateNotes: z.string().max(1000, "Notes too long").optional(),
}).refine((data) => {
  if (data.credentialId === 'new' && !data.newCredentialName) return false;
  return true;
}, { message: "Credential Name is required for new types", path: ["newCredentialName"] });

interface CredentialType { id: number; name: string; code?: string; }
interface StudentRecord { id: string; full_name: string; student_id: string; wallet_address: string | null; }
interface FileUploadState { file: File | null; dragActive: boolean; parsedData?: { count: number; preview: string[]; }; }
interface MintingProgress { isOpen: boolean; progress: number; status: 'minting' | 'complete' | 'error'; message: string; txHash?: string; }

export default function RegistrarDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [availableCredentials, setAvailableCredentials] = useState<CredentialType[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Search & Student Selection State
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [csvUpload, setCsvUpload] = useState<FileUploadState>({ file: null, dragActive: false });
  const [mintingProgress, setMintingProgress] = useState<MintingProgress>({ isOpen: false, progress: 0, status: 'minting', message: '' });

  const [singleCredential, setSingleCredential] = useState({
    walletAddress: '', credentialId: '', newCredentialName: '', courseCode: '',
    issuanceDate: new Date().toISOString().split('T')[0], certificateNumber: '', privateNotes: '',
  });

  // --- 3. Role-Based Access & Data Fetching ---
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace('/login'); return; }
        
        const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (user?.role !== 'registrar' && user?.role !== 'super_admin') { router.replace('/student/dashboard'); return; }
        
        await Promise.all([
          fetchCredentialDefinitions(),
          fetchStudents()
        ]);
        setLoading(false);
      } catch (error) { router.replace('/login'); }
    };
    initData();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const fetchCredentialDefinitions = async () => {
    const { data } = await supabase.from('credential_definitions').select('id, name, code').order('name');
    if (data) {
      setAvailableCredentials(data);
      if (data.length > 0 && !singleCredential.credentialId) {
        setSingleCredential(prev => ({ ...prev, credentialId: data[0].id.toString() }));
      }
    }
  };

  const fetchStudents = async () => {
    // 🛡️ Only fetch students to prevent issuing credentials to other registrars
    const { data } = await supabase.from('users')
      .select('id, full_name, student_id, wallet_address')
      .eq('role', 'student')
      .order('full_name');
    if (data) setStudents(data);
  };

  const getContract = async () => {
    if (typeof window === 'undefined') return null;
    const { ethereum } = window as any;
    if (!ethereum) { alert("Digital Vault extension (MetaMask) is not installed."); throw new Error("No vault found"); }
    const provider = new ethers.BrowserProvider(ethereum, "any");
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSingleCredential(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleStudentSelect = (student: StudentRecord) => {
    if (!student.wallet_address) {
      setErrors({ walletAddress: "This student has not linked their Digital Vault yet." });
      return;
    }
    setSelectedStudent(student);
    setSearchQuery(student.full_name || student.student_id);
    setSingleCredential(prev => ({ ...prev, walletAddress: student.wallet_address! }));
    setShowDropdown(false);
    setErrors(prev => { const n = { ...prev }; delete n['walletAddress']; return n; });
  };

  const filteredStudents = students.filter(s => 
    (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (s.student_id?.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 5); // Limit dropdown results

  // CSV Handlers 
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.type === 'dragenter' || e.type === 'dragover' ? setCsvUpload(prev => ({ ...prev, dragActive: true })) : setCsvUpload(prev => ({ ...prev, dragActive: false })); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setCsvUpload(prev => ({ ...prev, dragActive: false })); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const processFile = (file: File) => { if (file.type === 'text/csv' || file.name.endsWith('.csv')) { const reader = new FileReader(); reader.onload = (e) => { const lines = (e.target?.result as string).split('\n').filter(l => l.trim() !== ''); setCsvUpload({ file, dragActive: false, parsedData: { count: lines.length, preview: lines.slice(0, 3) } }); }; reader.readAsText(file); } else alert("Invalid CSV"); };
  const removeFile = () => setCsvUpload({ file: null, dragActive: false });
  const handleBatchMint = async () => alert("Batch issuance requires dynamic ID update.");

  // --- 4. Main Issue Logic ---
  const handleMintToken = async () => {
    setErrors({});
    const payload = { ...singleCredential, credentialId: isCreatingNew ? 'new' : singleCredential.credentialId };
    const result = mintingSchema.safeParse(payload);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach(i => { if(i.path[0]) newErrors[i.path[0].toString()] = i.message; });
      setErrors(newErrors);
      alert("Please fix form errors before issuing.");
      return;
    }

    try {
      setMintingProgress({ isOpen: true, progress: 10, status: 'minting', message: 'Initializing System...' });

      let finalTokenId = 0;
      let finalSkillName = '';

      if (isCreatingNew) {
        setMintingProgress(prev => ({ ...prev, message: 'Registering new credential standard...' }));
        const { data: newType, error: dbError } = await supabase.from('credential_definitions').insert({ name: singleCredential.newCredentialName, code: singleCredential.courseCode }).select().single();
        if (dbError || !newType) throw new Error("Failed to register new type.");
        finalTokenId = newType.id;
        finalSkillName = newType.name;
        await fetchCredentialDefinitions();
      } else {
        finalTokenId = parseInt(singleCredential.credentialId);
        const selected = availableCredentials.find(c => c.id === finalTokenId);
        finalSkillName = selected?.name || 'Unknown Credential';
      }

      // Blockchain Interaction (De-jargonized for UI)
      const contract = await getContract();
      if (!contract) throw new Error("System authorization failed");

      setMintingProgress(prev => ({ ...prev, progress: 40, message: `Securing "${finalSkillName}"... Please confirm in your admin vault.` }));
      const tx = await contract.mintSkill(singleCredential.walletAddress, finalTokenId, 1);
      
      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for network confirmation...' }));
      await tx.wait();

      // 🛡️ SECURE LOGGING via API
      setMintingProgress(prev => ({ ...prev, progress: 90, message: 'Encrypting internal records...' }));

      const logResponse = await fetch('/api/registrar/log-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: singleCredential.walletAddress,
          tokenId: finalTokenId.toString(),
          skillName: finalSkillName,
          txHash: tx.hash,
          certificateNumber: singleCredential.certificateNumber,
          private_notes: singleCredential.privateNotes,
          issuanceDate: singleCredential.issuanceDate
        })
      });

      if (!logResponse.ok) throw new Error("Credential secured, but failed to log internal audit.");

      setMintingProgress({ isOpen: true, progress: 100, status: 'complete', message: 'Record successfully secured & issued!', txHash: tx.hash });

    } catch (error: any) {
      console.error(error);
      setMintingProgress({ isOpen: true, progress: 0, status: 'error', message: error.reason || error.message || "Process failed" });
    }
  };

  const closeMintingModal = () => {
    setMintingProgress({ isOpen: false, progress: 0, status: 'minting', message: '' });
    if (mintingProgress.status === 'complete') {
      setSingleCredential(prev => ({ ...prev, newCredentialName: '', certificateNumber: '', privateNotes: '', walletAddress: '' }));
      setSelectedStudent(null);
      setSearchQuery('');
      setIsCreatingNew(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Issue Credentials</h1>
        </div>

        <div id="reg-tour-mint">
          {/* CSV Section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 md:p-10 mb-8 text-center transition-all">
             <div className={`${csvUpload.dragActive ? 'bg-green-50' : ''} h-full w-full rounded-xl transition-colors`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <div className="flex flex-col items-center">
                {!csvUpload.file ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg></div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Batch Upload (CSV)</h3>
                    <p className="text-sm text-gray-500 mb-4">Drag & drop your student list here</p>
                    <input type="file" id="csv-upload" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="csv-upload" className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 cursor-pointer transition-colors shadow-sm">Select CSV File</label>
                  </>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg border border-green-200 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-md"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                        <div className="text-left"><p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{csvUpload.file.name}</p><p className="text-xs text-green-700">{csvUpload.parsedData?.count} records detected</p></div>
                      </div>
                      <button onClick={removeFile} className="text-gray-400 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <button onClick={handleBatchMint} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md transition-all">Process Batch Record</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Single Credential Form */}
          {!csvUpload.file && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">1</span>
                  Issue Individual Record
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setIsCreatingNew(false)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${!isCreatingNew ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Select Existing</button>
                  <button onClick={() => setIsCreatingNew(true)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${isCreatingNew ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}>Create New</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* 🎯 Updated Autocomplete Student Search */}
                <div className="md:col-span-2 relative" ref={searchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Find Student</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                        setSelectedStudent(null);
                        setSingleCredential(prev => ({ ...prev, walletAddress: '' }));
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 outline-none ${errors.walletAddress ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-purple-500 bg-white'}`} 
                      placeholder="Search by name or student ID..." 
                    />
                  </div>
                  
                  {showDropdown && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => (
                          <div 
                            key={s.id} 
                            onClick={() => handleStudentSelect(s)}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 ${!s.wallet_address ? 'opacity-50' : ''}`}
                          >
                            <div>
                              <p className="text-sm font-bold text-gray-900">{s.full_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">ID: {s.student_id}</p>
                            </div>
                            <div>
                               {s.wallet_address ? (
                                 <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Vault Linked</span>
                               ) : (
                                 <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold">No Vault</span>
                               )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">No students found matching "{searchQuery}"</div>
                      )}
                    </div>
                  )}
                  {selectedStudent && selectedStudent.wallet_address && (
                     <div className="mt-2 text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded border border-gray-100 w-max">
                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                        System Vault ID: <span className="font-mono text-gray-400">{selectedStudent.wallet_address.slice(0,6)}...{selectedStudent.wallet_address.slice(-4)}</span>
                     </div>
                  )}
                  {errors.walletAddress && <p className="text-xs text-red-500 mt-1 font-medium">{errors.walletAddress}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{isCreatingNew ? "New Credential Name" : "Credential Type"}</label>
                  {isCreatingNew ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                            <input type="text" name="newCredentialName" value={singleCredential.newCredentialName} onChange={handleInputChange} 
                                className={`w-full px-4 py-3 border bg-purple-50 rounded-lg focus:ring-2 outline-none ${errors.newCredentialName ? 'border-red-500' : 'border-purple-300 focus:ring-purple-500'}`} placeholder="e.g. Bachelor of Science in Information Technology" />
                            <div className="px-3 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg flex items-center max-w-[200px]">⚠️ Registers new standard</div>
                        </div>
                        {errors.newCredentialName && <p className="text-xs text-red-500">{errors.newCredentialName}</p>}
                    </div>
                  ) : (
                    <select name="credentialId" value={singleCredential.credentialId} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                      {availableCredentials.length === 0 && <option>Loading records...</option>}
                      {availableCredentials.map(cred => (<option key={cred.id} value={cred.id}>{cred.name} (Code: {cred.code || 'SYS-' + cred.id})</option>))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code / Subject Area</label>
                  <input type="text" name="courseCode" value={singleCredential.courseCode} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. ITE-314" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certificate / Serial Number</label>
                  <input type="text" name="certificateNumber" value={singleCredential.certificateNumber} onChange={handleInputChange} 
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none ${errors.certificateNumber ? 'border-red-500' : 'border-gray-300 focus:ring-purple-500'}`} placeholder="e.g. SN-2027-001" />
                   {errors.certificateNumber && <p className="text-xs text-red-500 mt-1">{errors.certificateNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuance Date</label>
                  <input type="date" name="issuanceDate" value={singleCredential.issuanceDate} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between"><span>Confidential Registrar Notes</span><span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-bold">🔒 Encrypted Storage</span></label>
                  <textarea name="privateNotes" value={singleCredential.privateNotes} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" rows={3} placeholder="Internal remarks regarding student performance..." />
                </div>
              </div>

              <button onClick={handleMintToken} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {isCreatingNew ? 'Register & Issue Record' : 'Issue Secured Record'}
              </button>
            </div>
          )}
        </div>

        {/* Issuance Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
               <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${mintingProgress.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                  {mintingProgress.status === 'complete' ? ( <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> ) : mintingProgress.status === 'error' ? ( <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> ) : ( <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{mintingProgress.status === 'complete' ? 'Success!' : mintingProgress.status === 'error' ? 'Failed' : 'Processing'}</h2>
              </div>
              <div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-700">Status</span><span className="text-sm font-bold text-purple-600">{mintingProgress.progress}%</span></div><div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-full transition-all duration-500 ease-out ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-purple-600'}`} style={{ width: `${mintingProgress.progress}%` }}></div></div></div>
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100"><div className="min-w-0 flex-1"><p className="text-sm text-gray-700 font-medium break-all">{mintingProgress.message}</p>{mintingProgress.txHash && (<a href={`https://amoy.polygonscan.com/tx/${mintingProgress.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-purple-600 mt-1 truncate hover:underline flex items-center gap-1">View Digital Receipt <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>)}</div></div>
              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (<button onClick={closeMintingModal} className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md">Close</button>)}
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}