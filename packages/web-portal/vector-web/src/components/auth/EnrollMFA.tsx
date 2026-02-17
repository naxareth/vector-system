'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import QRCode from 'qrcode';

export default function EnrollMFA({ onComplete }: { onComplete: () => void }) {
  const [factorId, setFactorId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Generate Secret & QR Code on Mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setFactorId(data.id);

      // Convert the TOTP URI to a QR Code Image URL
      // data.totp.uri comes from Supabase
      const url = await QRCode.toDataURL(data.totp.uri);
      setQrCodeUrl(url);
      setLoading(false);
    })();
  }, []);

  // 2. Verify and Activate
  const handleEnable = async () => {
    setError('');
    
    // MFA requires a "Challenge" before verification
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      setError(challengeError.message);
      return;
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError(verifyError.message);
    } else {
      onComplete(); // Success!
    }
  };

  if (loading) return <div className="text-center p-4">Generating Security Key...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Setup 2-Factor Auth</h3>
      
      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}

      <div className="flex justify-center mb-6">
        {qrCodeUrl && <img src={qrCodeUrl} alt="Scan this QR Code" className="border rounded-lg" />}
      </div>

      <p className="text-sm text-gray-600 mb-4 text-center">
        1. Install Google Authenticator.<br/>
        2. Scan the QR code above.<br/>
        3. Enter the 6-digit code below.
      </p>

      <input
        type="text"
        value={verifyCode}
        onChange={(e) => setVerifyCode(e.target.value)}
        placeholder="000000"
        maxLength={6}
        className="w-full text-center text-2xl tracking-[0.5em] font-mono border-gray-300 rounded-lg py-2 mb-4 focus:ring-purple-500 focus:border-purple-500"
      />

      <button
        onClick={handleEnable}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-colors"
      >
        Activate 2FA
      </button>
    </div>
  );
}