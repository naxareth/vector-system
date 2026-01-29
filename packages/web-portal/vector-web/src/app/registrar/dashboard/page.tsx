'use client';
import { useState } from 'react';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import { ethers } from 'ethers'; // ✅ Import Ethers
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain'; // ✅ Import Blockchain Config

interface PDFUploadState {
  files: File[];
  dragActive: boolean;
}

interface MintingProgress {
  isOpen: boolean;
  progress: number;
  status: 'minting' | 'complete' | 'error';
  message: string;
  txHash?: string; // ✅ Added to show Transaction Hash
}

export default function RegistrarDashboard() {
  const [pdfUpload, setPdfUpload] = useState<PDFUploadState>({
    files: [],
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
    credentialType: 'Machine Learning',
    courseCode: '',
    issuanceDate: '',
    metadata: '',
  });

  // ⚡⚡⚡ HELPER: Safe Contract Connection ⚡⚡⚡
  const getContract = async () => {
    if (typeof window === 'undefined') return null;

    // 1. Safe access to Ethereum provider
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("MetaMask is not installed!");
      throw new Error("No crypto wallet found");
    }

    // 👇👇👇 CHANGE THIS LINE 👇👇👇
    // We add "any" to allow the network to switch (e.g. from Mainnet to Localhost) without crashing
    const provider = new ethers.BrowserProvider(ethereum, "any"); 
    
    const signer = await provider.getSigner();

    // 2. Check Network (Allow Hardhat Localhost)
    const network = await provider.getNetwork();
    if (network.chainId !== 31337n && network.chainId !== 1337n) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337
        });
      } catch (error) {
        alert("Please switch MetaMask to Localhost 8545");
      }
    }

    return new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, signer);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setPdfUpload(prev => ({ ...prev, dragActive: true }));
    } else if (e.type === 'dragleave') {
      setPdfUpload(prev => ({ ...prev, dragActive: false }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPdfUpload(prev => ({ ...prev, dragActive: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setPdfUpload(prev => ({ ...prev, files: [...prev.files, file] }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfUpload(prev => ({ ...prev, files: [...prev.files, e.target.files![0]] }));
    }
  };

  const removeFile = (index: number) => {
    setPdfUpload(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSingleCredential(prev => ({ ...prev, [name]: value }));
  };

  // ⚡ REAL BATCH MINTING LOGIC
  const handleBatchMint = async () => {
    if (pdfUpload.files.length === 0) {
      alert('Please upload at least one PDF file');
      return;
    }

    try {
      setMintingProgress({
        isOpen: true,
        progress: 10,
        status: 'minting',
        message: 'Analyzing PDF files...',
      });

      const contract = await getContract();
      if (!contract) return;

      setMintingProgress(prev => ({ ...prev, progress: 30, message: 'Preparing batch transaction...' }));

      // Demo: Minting to the connected wallet for demonstration
      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const students: string[] = [];
      const skillIds: number[] = [];
      const amounts: number[] = [];

      // Create entries for each file
      for (let i = 0; i < pdfUpload.files.length; i++) {
        students.push(signerAddress); 
        skillIds.push(2); // Defaulting to Python (ID 2) for demo
        amounts.push(1);
      }

      setMintingProgress(prev => ({ ...prev, progress: 50, message: 'Please sign in MetaMask...' }));

      // Call Contract
      const tx = await contract.batchMintSkills(students, skillIds, amounts);
      
      setMintingProgress(prev => ({ ...prev, progress: 75, message: 'Mining transaction...' }));
      
      await tx.wait(); // Wait for confirmation

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Batch Minting Successful!',
        txHash: tx.hash
      });

    } catch (error: any) {
      console.error(error);
      setMintingProgress({
        isOpen: true,
        progress: 0,
        status: 'error',
        message: error.reason || error.message || 'Transaction failed',
      });
    }
  };

  // ⚡ REAL SINGLE MINTING LOGIC
  const handleMintToken = async () => {
    if (!singleCredential.walletAddress || !singleCredential.courseCode || !singleCredential.issuanceDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setMintingProgress({
        isOpen: true,
        progress: 10,
        status: 'minting',
        message: 'Connecting to wallet...',
      });

      const contract = await getContract();
      if (!contract) throw new Error("Contract connection failed");

      // Get Skill ID from mapping
      const skillId = SKILL_MAP[singleCredential.credentialType] || 1;

      setMintingProgress(prev => ({ ...prev, progress: 40, message: 'Please sign transaction...' }));

      // Call Contract
      const tx = await contract.mintSkill(
        singleCredential.walletAddress,
        skillId,
        1
      );

      setMintingProgress(prev => ({ ...prev, progress: 70, message: 'Waiting for confirmation...' }));

      await tx.wait();

      setMintingProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Credential successfully issued on-chain!',
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
    setMintingProgress({
      isOpen: false,
      progress: 0,
      status: 'minting',
      message: '',
    });
    if (mintingProgress.status === 'complete') {
      // Reset form on success
      setSingleCredential({
        walletAddress: '',
        credentialType: 'Machine Learning',
        courseCode: '',
        issuanceDate: '',
        metadata: '',
      });
      setPdfUpload({ files: [], dragActive: false });
    }
  };

  return (
    <RegistrarLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Batch Issue Micro-Credentials</h1>
        </div>

        {/* PDF Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-6 md:p-12 mb-6 md:mb-8 text-center">
          <div
            className={`${pdfUpload.dragActive ? 'bg-purple-50' : ''} transition-colors`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6">
                <svg className="w-full h-full text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  <path d="M14 2v6h6M12 18v-6m-3 3l3-3 3 3" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              </div>
              
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">Upload PDF File</h3>
              <p className="text-sm md:text-base text-gray-600 mb-2 md:mb-3 font-medium">Drag and drop or click to upload</p>
              <p className="text-xs md:text-sm text-gray-600 mb-2 font-medium">
                Format: Last Name, First Name, Middle Name
              </p>
              <p className="text-xs text-gray-500 max-w-xl mb-4 md:mb-6 leading-relaxed px-4">
                Document must include: Student full name, professional title, email address, phone number, portfolio website (optional), professional summary, and skills
              </p>

              <input
                type="file"
                id="pdf-upload"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="pdf-upload"
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
              >
                {pdfUpload.files.length > 0 ? 'Add More Files' : 'Choose File'}
              </label>

              {pdfUpload.files.length > 0 && (
                <div className="mt-6 w-full max-w-md space-y-3">
                  {pdfUpload.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove file"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Single Credential Form */}
        {pdfUpload.files.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Or Issue Single Credential</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Student Wallet Address */}
            <div>
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Student Wallet Address
              </label>
              <input
                type="text"
                id="walletAddress"
                name="walletAddress"
                value={singleCredential.walletAddress}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
                placeholder="0x..."
              />
            </div>

            {/* Credential Type */}
            <div>
              <label htmlFor="credentialType" className="block text-sm font-medium text-gray-700 mb-2">
                Credential Type
              </label>
              <select
                id="credentialType"
                name="credentialType"
                value={singleCredential.credentialType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium"
              >
                <option value="Web Development">Web Development (React)</option>
                <option value="Python Programming">Python Programming</option>
                <option value="Solidity Smart Contracts">Solidity Smart Contracts</option>
                <option value="Node.js Backend Development">Node.js Backend</option>
                <option value="AI/ML Fundamentals">AI/ML Fundamentals</option>
              </select>
            </div>

            {/* Course Code */}
            <div>
              <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-2">
                Course Code
              </label>
              <input
                type="text"
                id="courseCode"
                name="courseCode"
                value={singleCredential.courseCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-medium placeholder:text-gray-400"
                placeholder="CS401"
              />
            </div>

            {/* Issuance Date */}
            <div>
              <label htmlFor="issuanceDate" className="block text-sm font-medium text-gray-700 mb-2">
                Issuance Date
              </label>
              <input
                type="date"
                id="issuanceDate"
                name="issuanceDate"
                value={singleCredential.issuanceDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
              Metadata (IPFS)
            </label>
            <textarea
              id="metadata"
              name="metadata"
              value={singleCredential.metadata}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm text-gray-900 font-medium placeholder:text-gray-400"
              placeholder='{"instructor": "Dr. Smith", "grade": "A", "project_links": [...]}'
            />
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMintToken}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Mint ERC-1155 Token
          </button>
          </div>
        )}

        {/* Mint Button for PDF Upload */}
        {pdfUpload.files.length > 0 && (
          <button
            onClick={handleBatchMint}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Batch Mint ERC-1155 Tokens
          </button>
        )}

        {/* Minting Progress Modal */}
        {mintingProgress.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  {mintingProgress.status === 'complete' ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : mintingProgress.status === 'error' ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {mintingProgress.status === 'complete' ? 'Minting Complete!' : mintingProgress.status === 'error' ? 'Minting Failed' : 'Minting Progress'}
                </h2>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-purple-600">{mintingProgress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${mintingProgress.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 to-purple-700'}`}
                    style={{ width: `${mintingProgress.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 font-medium break-all">{mintingProgress.message}</p>
                  {mintingProgress.txHash && (
                    <p className="text-xs text-purple-600 mt-1 truncate">Tx: {mintingProgress.txHash}</p>
                  )}
                </div>
              </div>

              {/* Close Button (only show when complete or error) */}
              {(mintingProgress.status === 'complete' || mintingProgress.status === 'error') && (
                <button
                  onClick={closeMintingModal}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
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