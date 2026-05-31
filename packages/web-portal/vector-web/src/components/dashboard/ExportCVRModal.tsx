'use client';
import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { CVRData, CVREducation, CVRExperience, CVRProject, CVRCertification, CVRAward, SkillItem } from '@/lib/schemas/cvr';

interface ExportCVRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportCVRModal({ isOpen, onClose }: ExportCVRModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'json'>('pdf');
  const [includeVerification, setIncludeVerification] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [cvrData, setCvrData] = useState<CVRData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // This ref points to the invisible A4 resume div
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Load Data on Open
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('sampleCVRData');
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCvrData(parsed);

        // Generate a stable credential ID
        const credentialId =
          parsed.credentialId ||
          `${Date.now()}-${parsed.fullName?.substring(0, 3).toUpperCase()}`;

        // Use /verify/cvr/[id] for full CVR exports, /verify/[id] for legacy single-credential
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        const verifyUrl = parsed.isCvrExport
          ? `${baseUrl}/verify/cvr/${credentialId}`
          : `${baseUrl}/verify/${credentialId}`;

        QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 })
          .then((url) => setQrDataUrl(url))
          .catch((err) => console.error('QR generation failed:', err));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 2. The Export Logic
  const handleExport = async () => {
    setIsExporting(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      if (selectedFormat === 'json') {
        const dataStr = JSON.stringify(cvrData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CVR_${cvrData.fullName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        if (!printRef.current) return;

        const canvas = await html2canvas(printRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`CVR_${cvrData.fullName.replace(/\s+/g, '_')}.pdf`);
      }

      onClose();
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ SAFE COLORS (Hex codes to prevent 'lab()' errors)
  const colors = {
    white: '#ffffff',
    black: '#111827',
    gray: '#4b5563',
    lightGray: '#f9fafb',
    border: '#e5e7eb',
    purple: '#06B4C9',
    purpleLight: '#e0f7fa',
    greenText: '#15803d',
    greenBg: '#dcfce7',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
    slate100: '#f1f5f9',
  };

  const isModern = cvrData?.template === 'modern';
  const isSimple = cvrData?.template === 'simple';

  // Shared QR block used in all three ghost templates
  const QRBlock = () =>
    qrDataUrl ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="Verification QR"
          style={{ width: '64px', height: '64px', flexShrink: 0 }}
        />
        <div style={{ fontSize: '10px', color: colors.gray }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', color: colors.black }}>
            Scan to Verify
          </p>
          <p style={{ margin: 0 }}>
            Scan this QR code to verify credentials on the VECTOR platform.
          </p>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Export Verified Resume</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedFormat === 'pdf'
                      ? 'border-[#06B4C9] bg-[#06B4C9]/10 text-[#06B4C9]'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">PDF Document</span>
                </button>
                <button
                  onClick={() => setSelectedFormat('json')}
                  className={`p-3 rounded-lg border-2 transition-all ${selectedFormat === 'json'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="text-sm font-medium">JSON Data</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVerification}
                  onChange={(e) => setIncludeVerification(e.target.checked)}
                  className="w-4 h-4 text-[#06B4C9] rounded focus:ring-[#06B4C9]"
                />
                <span className="text-sm text-gray-700">Include verification details</span>
              </label>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-800">
                  {selectedFormat === 'pdf'
                    ? 'The PDF will include a QR code and secure verification footer.'
                    : 'The JSON file contains raw data suitable for verifier applications.'}
                </p>
              </div>
            </div>

            {/* QR Preview — only shown for PDF mode */}
            {qrDataUrl && selectedFormat === 'pdf' && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Verification QR" className="w-16 h-16 rounded" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">Verification QR Code</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Will be embedded in the exported PDF. Employers can scan to verify your credentials.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 bg-[#06B4C9] hover:bg-[#06B4C9]/80 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------
        THE "GHOST" TEMPLATE
        Rendered off-screen for html2canvas to capture.
        Uses inline STYLES with HEX CODES to prevent 'lab()' errors.
        Font: Inter / system-ui for Professional & Modern,
              Georgia serif for Simple.
        ------------------------------------------------------------ */}
      {cvrData && (
        <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
          <div
            ref={printRef}
            style={{ width: '210mm', minHeight: '297mm', backgroundColor: colors.white, color: colors.gray, fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            {isModern ? (
              /* ============================================================
                 MODERN TEMPLATE — Two Column (Sidebar + Main)
                 ============================================================ */
              <div style={{ display: 'flex', minHeight: '297mm', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
                {/* Left Sidebar */}
                <div style={{ width: '35%', backgroundColor: cvrData.color || colors.slate700, color: colors.white, padding: '32px 22px' }}>
                  {/* Profile */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '80px', height: '80px', margin: '0 auto 10px', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: colors.slate200, letterSpacing: '0.02em' }}>
                      {cvrData.fullName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.white, margin: '0 0 4px 0', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{cvrData.fullName}</h1>
                    {cvrData.title && (
                      <p style={{ fontSize: '12px', color: colors.slate300, margin: 0, fontWeight: 400, letterSpacing: '0.01em' }}>{cvrData.title}</p>
                    )}
                  </div>

                  {/* Contact */}
                  {(cvrData.email || cvrData.phone || cvrData.portfolio || cvrData.linkedin) && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '10px', fontWeight: 700, color: colors.white, marginBottom: '10px', paddingBottom: '5px', borderBottom: `1px solid rgba(255,255,255,0.2)`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contact</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px' }}>
                        {cvrData.phone && (
                          <div><p style={{ fontWeight: 700, color: colors.slate200, margin: '0 0 1px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</p><p style={{ color: colors.slate300, margin: 0 }}>{cvrData.phone}</p></div>
                        )}
                        {cvrData.email && (
                          <div><p style={{ fontWeight: 700, color: colors.slate200, margin: '0 0 1px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</p><p style={{ color: colors.slate300, margin: 0, wordBreak: 'break-all' }}>{cvrData.email}</p></div>
                        )}
                        {cvrData.portfolio && (
                          <div><p style={{ fontWeight: 700, color: colors.slate200, margin: '0 0 1px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Website</p><p style={{ color: colors.slate300, margin: 0, wordBreak: 'break-all' }}>{cvrData.portfolio}</p></div>
                        )}
                        {cvrData.linkedin && (
                          <div><p style={{ fontWeight: 700, color: colors.slate200, margin: '0 0 1px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LinkedIn</p><p style={{ color: colors.slate300, margin: 0, wordBreak: 'break-all' }}>{cvrData.linkedin}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {cvrData.education && cvrData.education.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '10px', fontWeight: 700, color: colors.white, marginBottom: '10px', paddingBottom: '5px', borderBottom: `1px solid rgba(255,255,255,0.2)`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Education</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
                        {cvrData.education.map((edu: CVREducation, i: number) => (
                          <div key={i}>
                            <p style={{ fontWeight: 600, color: colors.slate400, margin: '0 0 1px 0', fontSize: '10px' }}>{edu.year}</p>
                            <p style={{ fontWeight: 700, color: colors.white, margin: '0 0 1px 0', fontSize: '11px' }}>{edu.degree}</p>
                            <p style={{ color: colors.slate300, margin: 0, fontSize: '11px' }}>{edu.school}</p>
                            {edu.location && <p style={{ color: colors.slate400, fontSize: '10px', margin: '1px 0 0 0' }}>{edu.location}</p>}
                            {edu.honors && <p style={{ color: colors.slate300, fontSize: '10px', fontStyle: 'italic', margin: '1px 0 0 0' }}>{edu.honors}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {cvrData.skills && cvrData.skills.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '10px', fontWeight: 700, color: colors.white, marginBottom: '10px', paddingBottom: '5px', borderBottom: `1px solid rgba(255,255,255,0.2)`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expertise</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {cvrData.skills.map((skill: SkillItem, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '5px', height: '5px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '50%', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: colors.slate200, fontWeight: 400 }}>{skill.name}</span>
                            {skill.verified && <span style={{ fontSize: '8px', color: '#4ade80', fontWeight: 700 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {cvrData.certifications && cvrData.certifications.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '10px', fontWeight: 700, color: colors.white, marginBottom: '10px', paddingBottom: '5px', borderBottom: `1px solid rgba(255,255,255,0.2)`, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certifications</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                        {cvrData.certifications.map((cert: CVRCertification, i: number) => (
                          <div key={i}>
                            <p style={{ fontWeight: 700, color: colors.white, margin: '0 0 1px 0', fontSize: '11px' }}>{cert.name}</p>
                            {cert.issuer && <p style={{ color: colors.slate300, margin: 0, fontSize: '10px' }}>{cert.issuer}</p>}
                            <p style={{ color: colors.slate400, fontSize: '10px', margin: '1px 0 0 0' }}>{cert.date}</p>
                            {cert.verified && <span style={{ fontSize: '8px', fontWeight: 700, backgroundColor: '#16a34a', color: colors.white, padding: '1px 5px', borderRadius: '3px', marginTop: '3px', display: 'inline-block' }}>✓ Verified</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Content Area */}
                <div style={{ width: '65%', padding: '32px 28px', backgroundColor: colors.white }}>
                  {/* Summary */}
                  {cvrData.summary && (
                    <div style={{ marginBottom: '22px' }}>
                      <p style={{ color: colors.gray, lineHeight: 1.65, fontSize: '11px', textAlign: 'justify', margin: 0, fontWeight: 400 }}>{cvrData.summary}</p>
                    </div>
                  )}

                  {/* Experience */}
                  {cvrData.experience && cvrData.experience.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${colors.slate200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Experience</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {cvrData.experience.map((exp: CVRExperience, i: number) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: colors.black, margin: 0, letterSpacing: '-0.01em' }}>{exp.title}</h4>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: colors.slate600, backgroundColor: colors.slate100, padding: '2px 8px', borderRadius: '10px', flexShrink: 0 }}>{exp.dates}</span>
                            </div>
                            <p style={{ color: colors.gray, fontWeight: 600, fontSize: '11px', margin: '0 0 3px 0' }}>{exp.company}</p>
                            <p style={{ color: colors.gray, fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0, fontWeight: 400 }}>{exp.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {cvrData.projects && cvrData.projects.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${colors.slate200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projects</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {cvrData.projects.map((proj: CVRProject, i: number) => (
                          <div key={i} style={{ borderLeft: `3px solid ${colors.slate300}`, paddingLeft: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                              <h4 style={{ fontSize: '12px', fontWeight: 700, color: colors.black, margin: 0 }}>{proj.title}</h4>
                              {proj.role && <span style={{ fontSize: '9px', fontWeight: 600, color: colors.slate600, backgroundColor: colors.slate100, padding: '1px 6px', borderRadius: '4px' }}>{proj.role}</span>}
                            </div>
                            <p style={{ fontSize: '11px', color: colors.gray, margin: '0 0 3px 0', lineHeight: 1.5, fontWeight: 400 }}>{proj.description}</p>
                            {proj.technologies && <p style={{ fontSize: '10px', color: colors.slate600, margin: 0, fontWeight: 500 }}><strong style={{ fontWeight: 700 }}>Tech:</strong> {proj.technologies}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Awards */}
                  {cvrData.awards && cvrData.awards.length > 0 && (
                    <div style={{ marginBottom: '22px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${colors.slate200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Awards</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {cvrData.awards.map((award: CVRAward, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <div style={{ width: '5px', height: '5px', backgroundColor: colors.slate400, borderRadius: '50%', flexShrink: 0, marginTop: '5px' }} />
                            <div><strong style={{ fontSize: '12px', fontWeight: 700, color: colors.black }}>{award.title}</strong><span style={{ fontSize: '11px', color: colors.gray, fontWeight: 400 }}> — {award.description}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* References */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, paddingBottom: '5px', marginBottom: '10px', borderBottom: `1px solid ${colors.slate200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>References</h3>
                    <p style={{ fontSize: '11px', color: colors.gray, fontWeight: 400 }}>Available upon request.</p>
                  </div>

                  {/* Verification Footer + QR (Modern) */}
                  {includeVerification && (
                    <div style={{ marginTop: '28px', paddingTop: '14px', borderTop: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: qrDataUrl ? '10px' : '0' }}>
                        <div style={{ width: '28px', height: '28px', backgroundColor: colors.purpleLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.purple, flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div style={{ fontSize: '10px', color: colors.gray }}>
                          <p style={{ fontWeight: 700, color: colors.black, margin: 0 }}>Securely Verified Document</p>
                          <p style={{ margin: 0, fontWeight: 400 }}>Generated by VECTOR Platform • Permanent Verified Record</p>
                          <p style={{ fontFamily: 'monospace', fontSize: '8px', color: '#9ca3af', margin: '2px 0 0 0' }}>ID: {cvrData.credentialId}</p>
                        </div>
                      </div>
                      // eslint-disable-next-line react-hooks/static-components
                      {qrDataUrl && <QRBlock />}
                    </div>
                  )}
                </div>
              </div>
            ) : isSimple ? (
              /* ============================================================
                 SIMPLE TEMPLATE — Traditional ATS-Friendly (Serif)
                 ============================================================ */
              <div style={{ padding: '36px 40px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                {/* Name */}
                <div style={{ textAlign: 'center', marginBottom: '2px' }}>
                  <h1 style={{ fontSize: '26px', fontWeight: 700, color: colors.black, margin: 0, fontFamily: 'Georgia, "Times New Roman", Times, serif', letterSpacing: '0.02em' }}>
                    {cvrData.fullName}
                  </h1>
                  {cvrData.title && (
                    <p style={{ fontSize: '12px', color: colors.gray, margin: '2px 0 0 0', fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>{cvrData.title}</p>
                  )}
                </div>

                {/* Contact Line */}
                <div style={{ textAlign: 'center', fontSize: '10.5px', color: colors.gray, marginBottom: '4px', lineHeight: 1.4, fontWeight: 400 }}>
                  {[cvrData.phone, cvrData.email, cvrData.portfolio, cvrData.linkedin].filter(Boolean).join('  |  ')}
                </div>

                <hr style={{ border: 'none', borderTop: '1.5px solid #111827', margin: '6px 0 14px 0' }} />

                {/* Summary */}
                {cvrData.summary && (
                  <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: colors.gray, fontStyle: 'italic', lineHeight: 1.65, margin: 0, fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 400 }}>
                      {cvrData.summary}
                    </p>
                  </div>
                )}

                {/* PROFESSIONAL EXPERIENCE */}
                {cvrData.experience && cvrData.experience.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Professional Experience</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cvrData.experience.map((exp: CVRExperience, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: colors.black }}>{exp.company}</span>
                            <span style={{ fontSize: '10.5px', color: colors.gray, fontStyle: 'italic', fontWeight: 400 }}>{exp.dates}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: colors.gray, fontStyle: 'italic', margin: '0 0 3px 0', fontWeight: 400 }}>{exp.title}</p>
                          {exp.description && (
                            <ul style={{ margin: '3px 0 0 0', paddingLeft: '16px' }}>
                              {exp.description.split('\n').filter((l: string) => l.trim()).map((line: string, j: number) => (
                                <li key={j} style={{ fontSize: '11px', color: colors.black, lineHeight: 1.55, marginBottom: '1px', fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 400 }}>
                                  {line.replace(/^[-•]\s*/, '')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROJECTS */}
                {cvrData.projects && cvrData.projects.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Projects</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cvrData.projects.map((proj: CVRProject, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: colors.black }}>{proj.title}</span>
                            {proj.role && <span style={{ fontSize: '10.5px', color: colors.gray, fontStyle: 'italic', fontWeight: 400 }}>{proj.role}</span>}
                          </div>
                          <p style={{ fontSize: '11px', color: colors.black, lineHeight: 1.55, margin: '2px 0', fontWeight: 400 }}>{proj.description}</p>
                          {proj.technologies && <p style={{ fontSize: '10px', color: colors.gray, margin: 0, fontWeight: 400 }}>Technologies: {proj.technologies}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDUCATION */}
                {cvrData.education && cvrData.education.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Education</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cvrData.education.map((edu: CVREducation, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: colors.black }}>{edu.school}</span>
                            <span style={{ fontSize: '10.5px', color: colors.gray, fontStyle: 'italic', fontWeight: 400 }}>{edu.location}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: colors.black, fontWeight: 400 }}>{edu.degree}</span>
                            <span style={{ fontSize: '10.5px', color: colors.gray, fontStyle: 'italic', fontWeight: 400 }}>{edu.year}</span>
                          </div>
                          {edu.honors && <p style={{ fontSize: '10.5px', color: colors.gray, margin: '1px 0 0 0', fontWeight: 400 }}>Honors: {edu.honors}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CERTIFICATIONS */}
                {cvrData.certifications && cvrData.certifications.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Certifications</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {cvrData.certifications.map((cert: CVRCertification, i: number) => (
                        <li key={i} style={{ fontSize: '11px', color: colors.black, marginBottom: '2px', fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 400, lineHeight: 1.5 }}>
                          <strong style={{ fontWeight: 700 }}>{cert.name}</strong>{cert.issuer ? ` — ${cert.issuer}` : ''}{cert.date ? ` (${cert.date})` : ''}{cert.verified ? ' [Verified]' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AWARDS */}
                {cvrData.awards && cvrData.awards.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Awards</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {cvrData.awards.map((award: CVRAward, i: number) => (
                        <li key={i} style={{ fontSize: '11px', color: colors.black, marginBottom: '2px', fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 400, lineHeight: 1.5 }}>
                          <strong style={{ fontWeight: 700 }}>{award.title}</strong> — {award.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ADDITIONAL SKILLS */}
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Additional Skills</h2>
                  <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
                  {cvrData.skills && cvrData.skills.length > 0 ? (
                    <p style={{ fontSize: '11px', color: colors.black, lineHeight: 1.55, margin: 0, fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 400 }}>
                      {cvrData.skills.map((s: SkillItem) => s.name).join(', ')}
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: colors.gray, fontStyle: 'italic', fontWeight: 400 }}>No specific skills listed.</p>
                  )}
                </div>

                {/* Verification Footer + QR (Simple) */}
                {includeVerification && (
                  <div style={{ marginTop: '28px', paddingTop: '10px', borderTop: `0.5px solid ${colors.border}` }}>
                    <div style={{ fontSize: '9px', color: colors.gray, marginBottom: qrDataUrl ? '10px' : '0', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
                      <p style={{ fontWeight: 700, color: colors.black, margin: 0 }}>Verified Resume</p>
                      <p style={{ margin: 0, fontWeight: 400 }}>Generated by VECTOR Platform • Permanent Verified Record</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '8px', color: '#9ca3af', margin: '2px 0 0 0' }}>ID: {cvrData.credentialId}</p>
                    </div>
                    // eslint-disable-next-line react-hooks/static-components
                    {qrDataUrl && <QRBlock />}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================
                 PROFESSIONAL TEMPLATE — Single Column (Sans-serif)
                 ============================================================ */
              <div style={{ padding: '36px 40px', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
                {/* Header */}
                <div style={{ borderBottom: `2px solid ${cvrData.color || colors.purple}`, paddingBottom: '14px', marginBottom: '14px' }}>
                  <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
                    {cvrData.fullName}
                  </h1>
                  {cvrData.title && (
                    <p style={{ fontSize: '14px', color: cvrData.color || colors.purple, fontWeight: 500, margin: 0, letterSpacing: '0.01em' }}>
                      {cvrData.title}
                    </p>
                  )}
                </div>

                {/* Contact Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: colors.gray, marginBottom: '16px' }}>
                  {cvrData.email && (
                    <div><span style={{ fontWeight: 700, color: colors.black, marginRight: '4px' }}>Email:</span>{cvrData.email}</div>
                  )}
                  {cvrData.phone && (
                    <div><span style={{ fontWeight: 700, color: colors.black, marginRight: '4px' }}>Phone:</span>{cvrData.phone}</div>
                  )}
                  {cvrData.portfolio && (
                    <div><span style={{ fontWeight: 700, color: colors.black, marginRight: '4px' }}>Website:</span>{cvrData.portfolio}</div>
                  )}
                  {cvrData.linkedin && (
                    <div><span style={{ fontWeight: 700, color: colors.black, marginRight: '4px' }}>LinkedIn:</span>{cvrData.linkedin}</div>
                  )}
                </div>

                {/* Summary */}
                {cvrData.summary && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Professional Summary
                    </h3>
                    <p style={{ color: colors.gray, lineHeight: 1.65, fontSize: '11px', fontWeight: 400, margin: 0 }}>{cvrData.summary}</p>
                  </div>
                )}

                {/* Education */}
                {cvrData.education && cvrData.education.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Education
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cvrData.education.map((edu: CVREducation, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: colors.black, fontSize: '13px' }}>{edu.degree}</div>
                            <div style={{ color: colors.gray, fontSize: '11px', fontWeight: 400 }}>{edu.school}{edu.location ? `, ${edu.location}` : ''}</div>
                            {edu.honors && <div style={{ fontStyle: 'italic', fontSize: '10.5px', color: colors.gray, fontWeight: 400 }}>{edu.honors}</div>}
                          </div>
                          <div style={{ fontWeight: 700, color: cvrData.color || colors.purple, fontSize: '11px', flexShrink: 0 }}>{edu.year}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {cvrData.experience && cvrData.experience.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Experience
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {cvrData.experience.map((exp: CVRExperience, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <div style={{ fontWeight: 700, color: colors.black, fontSize: '13px' }}>{exp.title}</div>
                            <div style={{ fontWeight: 600, color: cvrData.color || colors.purple, fontSize: '11px', flexShrink: 0 }}>{exp.dates}</div>
                          </div>
                          <div style={{ fontWeight: 600, color: colors.gray, fontSize: '11px', marginBottom: '3px' }}>{exp.company}</div>
                          <p style={{ color: colors.gray, fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0, fontWeight: 400 }}>{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {cvrData.projects && cvrData.projects.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Projects
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cvrData.projects.map((proj: CVRProject, i: number) => (
                        <div key={i} style={{ backgroundColor: colors.lightGray, padding: '10px 12px', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', background: cvrData.color || colors.purple }} />
                          <div style={{ fontWeight: 700, color: colors.black, fontSize: '12px', marginBottom: '2px' }}>{proj.title}</div>
                          <div style={{ fontSize: '11px', color: colors.gray, marginBottom: '3px', fontWeight: 400, lineHeight: 1.5 }}>{proj.description}</div>
                          {proj.technologies && <div style={{ fontSize: '10px', color: colors.slate600, fontWeight: 500 }}><strong style={{ fontWeight: 700 }}>Tech:</strong> {proj.technologies}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {cvrData.certifications && cvrData.certifications.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Certifications
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cvrData.certifications.map((cert: CVRCertification, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: colors.black, fontSize: '12px' }}>{cert.name}</div>
                            {cert.issuer && <div style={{ fontSize: '11px', color: colors.gray, marginTop: '1px', fontWeight: 400 }}>{cert.issuer}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: colors.gray, fontWeight: 400 }}>{cert.date}</span>
                            {cert.verified && <span style={{ fontSize: '8px', fontWeight: 700, backgroundColor: colors.greenBg, color: colors.greenText, padding: '1px 5px', borderRadius: '3px' }}>✓</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Awards */}
                {cvrData.awards && cvrData.awards.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '10px' }}>
                      Awards
                    </h3>
                    <ul style={{ paddingLeft: '18px', margin: 0 }}>
                      {cvrData.awards.map((award: CVRAward, i: number) => (
                        <li key={i} style={{ fontSize: '11px', color: colors.black, marginBottom: '3px', fontWeight: 400, lineHeight: 1.5 }}>
                          <strong style={{ fontWeight: 700 }}>{award.title}</strong> — {award.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                    Competencies & Skills
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {cvrData.skills && cvrData.skills.map((skill: SkillItem, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: skill.verified ? colors.greenBg : colors.lightGray, borderRadius: '14px', border: `1px solid ${skill.verified ? colors.greenText : colors.border}` }}>
                        <span style={{ fontWeight: 600, fontSize: '10px', color: skill.verified ? colors.greenText : colors.black }}>{skill.name}</span>
                        {skill.verified && <span style={{ fontSize: '8px', fontWeight: 700 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Footer + QR (Professional) */}
                {includeVerification && (
                  <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: qrDataUrl ? '12px' : '0' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: colors.purpleLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.purple, flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div style={{ fontSize: '10px', color: colors.gray }}>
                        <p style={{ fontWeight: 700, color: colors.black, margin: 0 }}>Securely Verified Document</p>
                        <p style={{ margin: 0, fontWeight: 400 }}>Generated by VECTOR Platform • Permanent Verified Record</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '8px', color: '#9ca3af', margin: '2px 0 0 0' }}>ID: {cvrData.credentialId}</p>
                      </div>
                    </div>
                    // eslint-disable-next-line react-hooks/static-components
                    {qrDataUrl && <QRBlock />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}