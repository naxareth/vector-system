'use client';
import { useState, useEffect } from 'react';

// MOCK LOGIN: We are simulating that "Ace" is logged in.
const MOCK_USER_WALLET = "0x123...ace"; // Must match the wallet you used in the Registrar upload!

export default function StudentDashboard() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyCredentials() {
      try {
        // Calls the API we just created above
        const res = await fetch(`/api/student/credentials?wallet=${MOCK_USER_WALLET}`);
        const data = await res.json();
        
        if (data.status === 'success') {
          setCredentials(data.credentials);
        }
      } catch (error) {
        console.error("Failed to fetch credentials", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyCredentials();
  }, []);

  return (
    <div className="p-10 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <header className="mb-10 flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👋 Student Portal</h1>
          <p className="text-gray-500 font-mono text-sm mt-1">Wallet: {MOCK_USER_WALLET}</p>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200">
          Verified Account
        </div>
      </header>

      <h2 className="text-xl font-semibold mb-6 text-gray-800">🏆 Your Verified Credentials</h2>

      {loading ? (
        <div className="text-center p-10 text-gray-500">Loading your profile...</div>
      ) : credentials.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-400 bg-white">
          <p className="mb-2 text-lg">No credentials found.</p>
          <p className="text-sm">Have you asked your Registrar to mint one for wallet <span className="font-mono text-gray-600">{MOCK_USER_WALLET}</span>?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((cred) => (
            <div key={cred.id} className="bg-white border border-l-4 border-l-green-500 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-1 rounded-bl-lg">
                OFFICIAL
              </div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <span className="text-2xl">🎓</span>
                </div>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded font-mono">
                  Token #{cred.token_id}
                </span>
              </div>
              
              <h3 className="font-bold text-lg mb-2 text-gray-800">{cred.skill_name}</h3>
              <p className="text-sm text-gray-500 mb-6">Issued by PHINMA Registrar</p>
              
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                  ✅ Verified
                </span>
                <button className="text-sm text-purple-600 font-semibold hover:text-purple-800 hover:underline">
                  View Proof →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}