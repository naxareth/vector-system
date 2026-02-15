'use client';
import { useState, useEffect } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabaseClient';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI } from '@/lib/blockchain'; // ❌ Removed SKILL_MAP
import { encryptData } from '@/lib/encryption';

// --- Types ---
interface CredentialType {
  id: number; // This maps to the Blockchain Token ID
  name: string;
  code?: string;
}

interface FileUploadState {
  file: File | null;
  dragActive: boolean;
  parsedData?: {
    count: number;
    preview: string[];
  };
}

interface MintingProgress {
  isOpen: boolean;
  progress: number;
  status: 'minting' | 'complete' | 'error';
  message: string;
  txHash?: string;
}

export default function RegistrarDashboard() {
  // --- 1. Dynamic Data State ---
  const [availableCredentials, setAvailableCredentials] = useState<CredentialType[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false); // Toggle for "New" vs "Existing"

  const [csvUpload, setCsvUpload] = useState<FileUploadState>({
    file: null,
    dragActive: false,
  });

  const [mintingProgress, setMintingProgress] = useState<MintingProgress>({
    isOpen: false,
    progress: 0,
    status: 'minting',
    message: '',
  });

  const [singleCredential, setSingleCredential] = useState({
    walletAddress: '',
    credentialId: '', // Stores the ID (number)
    newCredentialName: '', // Only used if isCreatingNew === true
    courseCode: '',
    issuanceDate: new Date().toISOString().split('T')[0],
    certificateNumber: '',
    privateNotes: '',
  });

  // --- 2. Load Credentials on Mount ---
  useEffect(() => {
    fetchCredentialDefinitions();
  }, []);

  const fetchCredentialDefinitions = async () => {
    const { data, error } = await supabase
      .from('credential_definitions')
      .select('id, name, code')
      .order('name');
    
    if (data) {
      setAvailableCredentials(data);
      // Set default selection to the first item if available
      if (data.length > 0) {
        setSingleCredential(prev => ({ ...prev, credentialId: data[0].id.toString() }));
      }
    }
  };

  // --- Blockchain Helper ---
  const getContract = async () => {
    if (typeof window === 'undefined') return null;
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("MetaMask is not installed!");
      throw new Error("No crypto wallet found");
    }
    const provider = new ethers.BrowserProvider(ethereum, "any"); 
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);
  };

  // --- Input Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSingleCredential(prev => ({ ...prev, [name]: value }));
  };

  // --- 3. CSV Logic (Placeholder for Dynamic IDs) ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setCsvUpload(prev => ({ ...prev, dragActive: true }));
    else if (e.type === 'dragleave') setCsvUpload(prev => ({ ...prev, dragActive: false }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvUpload(prev => ({ ...prev, dragActive: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = (file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        setCsvUpload({
          file: file,
          dragActive: false,
          parsedData: { count: lines.length, preview: lines.slice(0, 3) }
        });
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a valid .csv file");
    }
  };

  const removeFile = () => {
    setCsvUpload({ file: null, dragActive: false });
  };

  const handleBatchMint = async () => {
    // Note: This needs to be updated to match names to IDs from `availableCredentials`
    alert("Batch minting needs to be updated to support dynamic IDs. Please use Single Issue for now."); 
  };

  // --- 4. Main Minting Logic ---
  const handleMintToken = async () => {
    if (!singleCredential.walletAddress || !singleCredential.issuanceDate) {
      alert('Please fill in wallet and date.');
      return;
    }

    try {
      setMintingProgress({ isOpen: true, progress: 10, status: 'minting', message: 'Initializing...' });

      // Step A: Determine Token ID & Name
      let finalTokenId = 0;
      let finalSkillName = '';

      if (isCreatingNew) {
        // Scenario: CREATE NEW
        if (!singleCredential.newCredentialName) throw new Error("Credential Name is required");
        
        setMintingProgress(prev => ({ ...prev, message: 'Registering new credential type in DB...' }));
        
        const { data: newType, error: dbError } = await supabase
          .from('credential_definitions')
          .insert({
            name: singleCredential.newCredentialName,
            code: singleCredential.courseCode
          })
          .select()
          .single();

        if (dbError || !newType) throw new Error("Failed to register new credential type. It might already exist.");
        
        finalTokenId = newType.id;
        finalSkillName = newType.name;
        
        // Refresh list instantly
        await fetchCredentialDefinitions();

      } else {
        // Scenario: SELECT EXISTING
        finalTokenId = parseInt(singleCredential.credentialId);
        const selected = availableCredentials.find(c => c.id === finalTokenId);
        finalSkillName = selected?.name || 'Unknown Credential';
      }

      // Step B: Connect to Blockchain
      const contract = await getContract();
      if (!contract) throw new Error("Contract connection failed");

      setMintingProgress(prev => ({ ...prev, progress: 40, message: `Minting "${finalSkillName}" (Token ID: ${finalTokenId})... Please sign in Wallet.` }));

      // Step C: Mint on Blockchain
      const tx = await contract.mintSkill(
        singleCredential.walletAddress,
        finalTokenId,
        1 // Amount
      );

      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for blockchain confirmation...' }));
      await tx.wait();

      // Step D: Log to Database (Ledger)
      setMintingProgress(prev => ({ ...prev, progress: 90, message: 'Encrypting & Logging to Audit Ledger...' }));

      const { data: studentUser } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', singleCredential.walletAddress.toLowerCase())
        .single();

      if (studentUser) {
        // 🔒 Encrypt Note
        const encryptedNote = encryptData(singleCredential.privateNotes);

        // Insert Record
        await supabase.from('verified_credentials').insert({
          user_id: studentUser.id,
          skill_name: finalSkillName,
          token_id: finalTokenId.toString(),
          transaction_hash: tx.hash,
          issuer_did: 'Vector Registrar',
          issued_at: new Date(singleCredential.issuanceDate).toISOString(),
          certificate_number: singleCredential.certificateNumber,
          private_notes: encryptedNote
        });

        // Send Notification
        await supabase.from('notifications').insert({
          user_id: studentUser.id,
          title: 'Credential Verified!',
          message: `You have received a verified credential for: ${finalSkillName}`,
          type: 'success'
        });
      } else {
        console.warn("Wallet not linked to a registered student. Ledger entry skipped, but Token was minted.");
      }

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Credential successfully minted & logged!',
        txHash: tx.hash
      });

    } catch (error: any) {
      console.error(error);
      setMintingProgress({
        isOpen: true,
        progress: 0,
        status: 'error',
        message: error.reason || error.message || "Minting failed",
      });
    }
  };

  const closeMintingModal = () => {
    setMintingProgress({ isOpen: false, progress: 0, status: 'minting', message: '' });
    if (mintingProgress.status === 'complete') {
      // Reset form
      setSingleCredential(prev => ({
        ...prev,
        newCredentialName: '',
        certificateNumber: '',
        privateNotes: ''
      }));
      setIsCreatingNew(false);
    }
  };

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Issue Credentials</h1>
        </div>

        {/* Tour Anchor ID */}
        <div id="reg-tour-mint">
          
          {/* CSV Upload Section */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 md:p-10 mb-8 text-center transition-all">
            <div
              className={`${csvUpload.dragActive ? 'bg-green-50' : ''} h-full w-full rounded-xl transition-colors`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                {!csvUpload.file ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">Batch Upload (CSV)</h3>
                    <p className="text-sm text-gray-500 mb-4">Drag & drop your student list here</p>
                    <input type="file" id="csv-upload" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="csv-upload" className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 cursor-pointer transition-colors shadow-sm">Select CSV File</label>
                  </>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between bg-green-50 px-4 py-3 rounded-lg border border-green-200 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-md">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{csvUpload.file.name}</p>
                          <p className="text-xs text-green-700">{csvUpload.parsedData?.count} rows detected</p>
                        </div>
                      </div>
                      <button onClick={removeFile} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <button onClick={handleBatchMint} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">Process Batch Mint</button>
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
                  Issue Single Credential
                </h2>
                
                {/* 🔄 TOGGLE: Create New vs Select */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setIsCreatingNew(false)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${!isCreatingNew ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                  >
                    Select Existing
                  </button>
                  <button 
                    onClick={() => setIsCreatingNew(true)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${isCreatingNew ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Wallet Address</label>
                  <input type="text" name="walletAddress" value={singleCredential.walletAddress} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0x..." />
                </div>
                
                {/* 🔄 DYNAMIC INPUT SECTION */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isCreatingNew ? "New Credential Name" : "Select Credential"}
                  </label>
                  
                  {isCreatingNew ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        name="newCredentialName" 
                        value={singleCredential.newCredentialName} 
                        onChange={handleInputChange} 
                        className="w-full px-4 py-3 border border-purple-300 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                        placeholder="e.g. Bachelor of Science in Nursing" 
                      />
                      <div className="px-3 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg flex items-center max-w-[200px]">
                        ⚠️ Creates new Token ID
                      </div>
                    </div>
                  ) : (
                    <select 
                      name="credentialId" 
                      value={singleCredential.credentialId} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      {availableCredentials.length === 0 && <option>Loading credentials...</option>}
                      {availableCredentials.map(cred => (
                        <option key={cred.id} value={cred.id}>{cred.name} (ID: {cred.id})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
                  <input type="text" name="courseCode" value={singleCredential.courseCode} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. ITE-314" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certificate / Serial No.</label>
                  <input type="text" name="certificateNumber" value={singleCredential.certificateNumber} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. SN-2027-001" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issuance Date</label>
                  <input type="date" name="issuanceDate" value={singleCredential.issuanceDate} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                    <span>Confidential Registrar Notes</span>
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">🔒 Encrypted Storage</span>
                  </label>
                  <textarea 
                    name="privateNotes" 
                    value={singleCredential.privateNotes} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                    rows={3}
                    placeholder="Internal remarks..."
                  />
                </div>
              </div>

              <button onClick={handleMintToken} className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {isCreatingNew ? 'Create & Issue Credential' : 'Issue Credential'}
              </button>
            </div>
          )}
        </div>

        {/* Minting Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in-up">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${mintingProgress.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                  {mintingProgress.status === 'complete' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : mintingProgress.status === 'error' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {mintingProgress.status === 'complete' ? 'Success!' : mintingProgress.status === 'error' ? 'Failed' : 'Processing'}
                </h2>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span className="text-sm font-bold text-purple-600">{mintingProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full transition-all duration-500 ease-out ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-purple-600'}`} style={{ width: `${mintingProgress.progress}%` }}></div>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 font-medium break-all">{mintingProgress.message}</p>
                  {mintingProgress.txHash && (
                    <a href={`https://amoy.polygonscan.com/tx/${mintingProgress.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-purple-600 mt-1 truncate hover:underline block">
                      View TX: {mintingProgress.txHash.slice(0, 20)}...
                    </a>
                  )}
                </div>
              </div>

              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (
                <button onClick={closeMintingModal} className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all">
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