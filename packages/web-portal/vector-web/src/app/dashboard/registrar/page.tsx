'use client';
import { useState } from 'react';

export default function RegistrarDashboard() {
  const [status, setStatus] = useState('idle'); // idle | processing | success | error
  const [logs, setLogs] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);

  // 1. The CSV Parsing Logic (Pure Backend Logic running in Browser)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      // Split by line break
      const lines = text.split('\n');
      
      // Remove empty lines and headers (assuming first row is header)
      // Format: Full Name, Student ID, Wallet Address, Skill Name
      const data = lines
        .slice(1) // Skip header row
        .filter(line => line.trim() !== '') // Skip empty lines
        .map(line => {
          const [full_name, student_id, wallet_address, skill_name] = line.split(',');
          return {
            full_name: full_name?.trim(),
            student_id: student_id?.trim(),
            wallet_address: wallet_address?.trim(),
            skill_name: skill_name?.trim()
          };
        });

      setParsedData(data);
      setLogs(`📂 Loaded ${data.length} students from CSV.`);
    };
    
    reader.readAsText(file);
  };

  // 2. The API Call (Same as before)
  async function handleMint() {
    if (parsedData.length === 0) {
      setLogs('❌ No data to mint. Please upload a CSV first.');
      return;
    }

    setStatus('processing');
    setLogs('🚀 Initializing Batch Mint...');

    try {
      const res = await fetch('/api/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: `Batch Upload ${new Date().toLocaleDateString()}`,
          students: parsedData
        })
      });

      const data = await res.json();
      
      if (data.status === 'success') {
        setStatus('success');
        setLogs(`✅ Success! Minted ${data.mintedCount} credentials.`);
      } else {
        setStatus('error');
        setLogs(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setStatus('error');
      setLogs('❌ Network Error');
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🎓 Registrar Dashboard (CSV Mode)</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-md border">
        
        {/* Step 1: Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Step 1: Upload Class List (CSV)</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
          <p className="text-xs text-gray-400 mt-1">Format: Full Name, Student ID, Wallet Address, Skill Name</p>
        </div>

        {/* Step 2: Preview */}
        {parsedData.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-md mb-4 font-mono text-xs max-h-40 overflow-y-auto">
            <p className="text-gray-500 mb-2 sticky top-0 bg-gray-50 pb-2">// Previewing {parsedData.length} records:</p>
            <pre>{JSON.stringify(parsedData, null, 2)}</pre>
          </div>
        )}

        {/* Step 3: Action */}
        <button 
          onClick={handleMint}
          disabled={status === 'processing' || parsedData.length === 0}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'processing' ? 'Minting...' : 'Mint Credentials'}
        </button>

        {/* Logs */}
        {logs && (
          <div className={`mt-6 p-4 rounded-lg border ${status === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200'}`}>
            {logs}
          </div>
        )}
      </div>
    </div>
  );
}