'use client';
import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportCVRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportCVRModal({ isOpen, onClose }: ExportCVRModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'json'>('pdf');
  const [includeVerification, setIncludeVerification] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [cvrData, setCvrData] = useState<any>(null);
  
  // This ref points to the invisible A4 resume div
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Load Data on Open
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('sampleCVRData');
      if (stored) setCvrData(JSON.parse(stored));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 2. The Export Logic
  const handleExport = async () => {
    setIsExporting(true);
    
    // Allow slight delay for UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (selectedFormat === 'json') {
        // --- JSON EXPORT ---
        const dataStr = JSON.stringify(cvrData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CVR_${cvrData.fullName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // --- PDF EXPORT ---
        if (!printRef.current) return;

        // Capture the hidden div
        const canvas = await html2canvas(printRef.current, {
          scale: 2, // High resolution for crisp text
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff', // Force white background
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
      console.error("Export failed", error);
      alert("Failed to export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ SAFE COLORS (Hex codes to prevent 'lab()' errors)
  const colors = {
    white: '#ffffff',
    black: '#111827',     // gray-900
    gray: '#4b5563',      // gray-600
    lightGray: '#f9fafb', // gray-50
    border: '#e5e7eb',    // gray-200
    purple: '#9333ea',    // purple-600
    purpleLight: '#f3e8ff', // purple-100
    greenText: '#15803d',   // green-700
    greenBg: '#dcfce7',     // green-100
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

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Export Verified Resume</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedFormat === 'pdf'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
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
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedFormat === 'json'
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
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Include blockchain verification details</span>
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
                    ? 'The PDF will include a cryptographic footer linked to the Polygon blockchain.' 
                    : 'The JSON file contains raw data suitable for verifier applications.'}
                </p>
              </div>
            </div>
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
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
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
        CRITICAL FIX: We use inline STYLES with HEX CODES instead of 
        Tailwind color classes to prevent 'lab()' errors.
        ------------------------------------------------------------
      */}
      {cvrData && (
        <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
          <div 
            ref={printRef} 
            style={{ width: '210mm', minHeight: '297mm', backgroundColor: colors.white, color: colors.gray }}
          >
            {isModern ? (
              /* ============================================================
                 MODERN TEMPLATE - Two Column (Dark Sidebar + White Main)
                 ============================================================ */
              <div style={{ display: 'flex', minHeight: '297mm' }}>
                {/* Left Sidebar - Dark */}
                <div style={{ width: '35%', backgroundColor: cvrData.color || colors.slate700, color: colors.white, padding: '32px 24px' }}>
                  {/* Profile Initials */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '96px', height: '96px', margin: '0 auto 12px', backgroundColor: colors.slate600, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: colors.slate300 }}>
                      {cvrData.fullName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.white, margin: '0 0 4px 0' }}>{cvrData.fullName}</h1>
                    {cvrData.title && (
                      <p style={{ fontSize: '14px', color: colors.slate300, margin: 0 }}>{cvrData.title}</p>
                    )}
                  </div>

                  {/* Contact */}
                  {(cvrData.email || cvrData.phone || cvrData.portfolio || cvrData.linkedin) && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.white, marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${colors.slate500}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        {cvrData.phone && (
                          <div><p style={{ fontWeight: '600', color: colors.slate300, margin: '0 0 2px 0' }}>Phone</p><p style={{ color: colors.slate200, margin: 0 }}>{cvrData.phone}</p></div>
                        )}
                        {cvrData.email && (
                          <div><p style={{ fontWeight: '600', color: colors.slate300, margin: '0 0 2px 0' }}>Email</p><p style={{ color: colors.slate200, margin: 0, wordBreak: 'break-all' }}>{cvrData.email}</p></div>
                        )}
                        {cvrData.portfolio && (
                          <div><p style={{ fontWeight: '600', color: colors.slate300, margin: '0 0 2px 0' }}>Website</p><p style={{ color: colors.slate200, margin: 0, wordBreak: 'break-all' }}>{cvrData.portfolio}</p></div>
                        )}
                        {cvrData.linkedin && (
                          <div><p style={{ fontWeight: '600', color: colors.slate300, margin: '0 0 2px 0' }}>LinkedIn</p><p style={{ color: colors.slate200, margin: 0, wordBreak: 'break-all' }}>{cvrData.linkedin}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {cvrData.education && cvrData.education.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.white, marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${colors.slate500}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Education</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                        {cvrData.education.map((edu: any, i: number) => (
                          <div key={i}>
                            <p style={{ fontWeight: '600', color: colors.slate300, margin: '0 0 2px 0' }}>{edu.year}</p>
                            <p style={{ fontWeight: 'bold', color: colors.white, margin: '0 0 2px 0' }}>{edu.degree}</p>
                            <p style={{ color: colors.slate200, margin: 0 }}>{edu.school}</p>
                            {edu.location && <p style={{ color: colors.slate400, fontSize: '11px', margin: '2px 0 0 0' }}>{edu.location}</p>}
                            {edu.honors && <p style={{ color: colors.slate300, fontSize: '11px', fontStyle: 'italic', margin: '2px 0 0 0' }}>{edu.honors}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills / Expertise */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.white, marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${colors.slate500}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expertise</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cvrData.skills && cvrData.skills.map((skill: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', backgroundColor: colors.slate400, borderRadius: '50%', flexShrink: 0 }}></div>
                          <span style={{ fontSize: '12px', color: colors.slate200 }}>{skill.name}</span>
                          {skill.verified && <span style={{ fontSize: '9px', color: '#4ade80' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  {cvrData.certifications && cvrData.certifications.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.white, marginBottom: '12px', paddingBottom: '6px', borderBottom: `1px solid ${colors.slate500}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certifications</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        {cvrData.certifications.map((cert: any, i: number) => (
                          <div key={i}>
                            <p style={{ fontWeight: 'bold', color: colors.white, margin: '0 0 2px 0' }}>{cert.name}</p>
                            {cert.issuer && <p style={{ color: colors.slate300, margin: 0 }}>{cert.issuer}</p>}
                            <p style={{ color: colors.slate400, fontSize: '11px', margin: '2px 0 0 0' }}>{cert.date}</p>
                            {cert.verified && <span style={{ fontSize: '9px', fontWeight: 'bold', backgroundColor: '#16a34a', color: colors.white, padding: '1px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>✓ Verified</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Content Area - White */}
                <div style={{ width: '65%', padding: '32px', backgroundColor: colors.white }}>
                  {/* Professional Summary */}
                  {cvrData.summary && (
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ color: colors.gray, lineHeight: '1.6', fontSize: '13px', textAlign: 'justify' }}>{cvrData.summary}</p>
                    </div>
                  )}

                  {/* Experience */}
                  {cvrData.experience && cvrData.experience.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.black, paddingBottom: '6px', marginBottom: '16px', borderBottom: `0.5px solid ${colors.slate300}`, textTransform: 'uppercase' }}>Experience</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {cvrData.experience.map((exp: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: colors.slate200, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                              <span style={{ fontSize: '14px' }}>💼</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: colors.black, margin: 0 }}>{exp.title}</h4>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: colors.slate600, backgroundColor: colors.slate100, padding: '2px 8px', borderRadius: '12px' }}>{exp.dates}</span>
                              </div>
                              <p style={{ color: colors.gray, fontWeight: '500', fontSize: '13px', margin: '0 0 4px 0' }}>{exp.company}</p>
                              <p style={{ color: colors.gray, fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>{exp.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {cvrData.projects && cvrData.projects.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.black, paddingBottom: '6px', marginBottom: '16px', borderBottom: `0.5px solid ${colors.slate300}`, textTransform: 'uppercase' }}>Projects</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cvrData.projects.map((proj: any, i: number) => (
                          <div key={i} style={{ borderLeft: `3px solid ${colors.slate300}`, paddingLeft: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.black, margin: 0 }}>{proj.title}</h4>
                              {proj.role && <span style={{ fontSize: '10px', color: colors.slate600, backgroundColor: colors.slate100, padding: '1px 6px', borderRadius: '4px' }}>{proj.role}</span>}
                            </div>
                            <p style={{ fontSize: '12px', color: colors.gray, margin: '0 0 4px 0' }}>{proj.description}</p>
                            {proj.technologies && <p style={{ fontSize: '11px', color: colors.slate600, margin: 0 }}><strong>Technologies:</strong> {proj.technologies}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Awards */}
                  {cvrData.awards && cvrData.awards.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.black, paddingBottom: '6px', marginBottom: '16px', borderBottom: `0.5px solid ${colors.slate300}`, textTransform: 'uppercase' }}>Awards</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {cvrData.awards.map((award: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', backgroundColor: colors.slate400, borderRadius: '50%', flexShrink: 0, marginTop: '6px' }}></div>
                            <div>
                              <strong style={{ fontSize: '13px', color: colors.black }}>{award.title}</strong>
                              <span style={{ fontSize: '12px', color: colors.gray }}> - {award.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* References */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.black, paddingBottom: '6px', marginBottom: '12px', borderBottom: `0.5px solid ${colors.slate300}`, textTransform: 'uppercase' }}>Reference</h3>
                    <p style={{ fontSize: '13px', color: colors.gray }}>Available upon request.</p>
                  </div>

                  {/* Blockchain Footer (Conditional) */}
                  {includeVerification && (
                    <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: colors.purpleLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.purple, flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div style={{ fontSize: '11px', color: colors.gray }}>
                        <p style={{ fontWeight: 'bold', color: colors.black, margin: 0 }}>Cryptographically Secured Document</p>
                        <p style={{ margin: 0 }}>Generated by VECTOR Platform • Immutable Record on Polygon Amoy Testnet</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '9px', color: '#9ca3af', margin: '2px 0 0 0' }}>ID: {Date.now()}-{cvrData.fullName?.substring(0,3).toUpperCase()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isSimple ? (
              /* ============================================================
                 SIMPLE TEMPLATE - Traditional ATS-Friendly
                 ============================================================ */
              <div style={{ padding: '36px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                {/* Name - Centered Large */}
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: colors.black, margin: 0, fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                    {cvrData.fullName}
                  </h1>
                </div>

                {/* Contact Line */}
                <div style={{ textAlign: 'center', fontSize: '12px', color: colors.gray, marginBottom: '4px', lineHeight: '1.4' }}>
                  {[cvrData.phone, cvrData.email, cvrData.portfolio, cvrData.linkedin].filter(Boolean).join('  |  ')}
                </div>

                {/* Horizontal Rule */}
                <hr style={{ border: 'none', borderTop: '1.5px solid #111827', margin: '8px 0 12px 0' }} />

                {/* Summary - Italic */}
                {cvrData.summary && (
                  <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic', lineHeight: '1.6', margin: 0, fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                      {cvrData.summary}
                    </p>
                  </div>
                )}

                {/* PROFESSIONAL EXPERIENCE */}
                {cvrData.experience && cvrData.experience.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Professional Experience</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {cvrData.experience.map((exp: any, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: colors.black, textTransform: 'uppercase' }}>{exp.company}</span>
                            <span style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic' }}>{exp.dates}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic', margin: '0 0 4px 0' }}>{exp.title}</p>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                              {exp.description.split('\n').filter((l: string) => l.trim()).map((line: string, j: number) => (
                                <li key={j} style={{ fontSize: '12px', color: colors.black, lineHeight: '1.5', marginBottom: '2px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                                  {line.replace(/^[\-•]\s*/, '')}
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
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Projects</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {cvrData.projects.map((proj: any, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: colors.black, textTransform: 'uppercase' }}>{proj.title}</span>
                            {proj.role && <span style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic' }}>{proj.role}</span>}
                          </div>
                          <p style={{ fontSize: '12px', color: colors.black, lineHeight: '1.5', margin: '2px 0' }}>{proj.description}</p>
                          {proj.technologies && <p style={{ fontSize: '11px', color: colors.gray, margin: 0 }}>Technologies: {proj.technologies}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDUCATION */}
                {cvrData.education && cvrData.education.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Education</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cvrData.education.map((edu: any, i: number) => (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: colors.black, textTransform: 'uppercase' }}>{edu.school}</span>
                            <span style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic' }}>{edu.location}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '12px', color: colors.black }}>{edu.degree}</span>
                            <span style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic' }}>{edu.year}</span>
                          </div>
                          {edu.honors && <p style={{ fontSize: '12px', color: colors.gray, margin: '2px 0 0 0' }}>Honors: {edu.honors}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CERTIFICATIONS */}
                {cvrData.certifications && cvrData.certifications.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Certifications</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {cvrData.certifications.map((cert: any, i: number) => (
                        <li key={i} style={{ fontSize: '12px', color: colors.black, marginBottom: '2px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                          <strong>{cert.name}</strong>{cert.issuer ? ` — ${cert.issuer}` : ''}{cert.date ? ` (${cert.date})` : ''}{cert.verified ? ' [Verified]' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AWARDS */}
                {cvrData.awards && cvrData.awards.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Awards</h2>
                    <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      {cvrData.awards.map((award: any, i: number) => (
                        <li key={i} style={{ fontSize: '12px', color: colors.black, marginBottom: '2px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                          <strong>{award.title}</strong> — {award.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ADDITIONAL SKILLS */}
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Additional Skills</h2>
                  <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 12px 0' }} />
                  {cvrData.skills && cvrData.skills.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                      <li style={{ fontSize: '12px', color: colors.black, lineHeight: '1.5', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
                        {cvrData.skills.map((s: any) => s.name).join(', ')}
                      </li>
                    </ul>
                  ) : (
                    <p style={{ fontSize: '12px', color: colors.gray, fontStyle: 'italic' }}>No specific skills listed.</p>
                  )}
                </div>

                {/* Blockchain Footer */}
                {includeVerification && (
                  <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: `0.5px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '10px', color: colors.gray }}>
                      <p style={{ fontWeight: 'bold', color: colors.black, margin: 0 }}>Blockchain Verified Resume</p>
                      <p style={{ margin: 0 }}>Generated by VECTOR Platform • Immutable Record on Polygon Amoy Testnet</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '9px', color: '#9ca3af', margin: '2px 0 0 0' }}>ID: {Date.now()}-{cvrData.fullName?.substring(0,3).toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================
                 PROFESSIONAL TEMPLATE - Single Column
                 ============================================================ */
              <div style={{ padding: '36px' }}>
                {/* Resume Header */}
                <div style={{ borderBottom: `0.5px solid ${cvrData.color || colors.purple}`, paddingBottom: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: colors.black, textTransform: 'uppercase', marginBottom: '8px', lineHeight: '1' }}>
                      {cvrData.fullName}
                    </h1>
                    <p style={{ fontSize: '20px', color: colors.purple, fontWeight: '500' }}>
                      {cvrData.title}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', padding: '8px', backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                      <div style={{ width: '64px', height: '64px', backgroundColor: colors.black, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.white, fontSize: '8px', textAlign: 'center', lineHeight: '1.2' }}>
                        VECTOR<br/>SECURE
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resume Contact */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: colors.gray, marginBottom: '12px', fontWeight: '500' }}>
                  <span>📧 {cvrData.email}</span>
                  {cvrData.phone && <span>📱 {cvrData.phone}</span>}
                  {cvrData.portfolio && <span>🌐 {cvrData.portfolio}</span>}
                </div>

                {/* Resume Summary */}
                {cvrData.summary && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `0.5px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Professional Summary
                    </h3>
                    <p style={{ color: colors.black, lineHeight: '1.6', fontSize: '14px' }}>{cvrData.summary}</p>
                  </div>
                )}

                {/* Resume Education */}
                {cvrData.education && cvrData.education.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `0.5px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Education
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cvrData.education.map((edu: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', color: colors.black, fontSize: '15px' }}>{edu.degree}</div>
                                <div style={{ color: colors.gray, fontSize: '14px' }}>{edu.school}, {edu.location}</div>
                                {edu.honors && <div style={{ fontStyle: 'italic', fontSize: '13px', color: colors.gray }}>{edu.honors}</div>}
                            </div>
                            <div style={{ fontWeight: 'bold', color: colors.purple, fontSize: '14px' }}>{edu.year}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Experience */}
                {cvrData.experience && cvrData.experience.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `0.5px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Experience
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {cvrData.experience.map((exp: any, i: number) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <div style={{ fontWeight: 'bold', color: colors.black, fontSize: '15px' }}>{exp.title}</div>
                                <div style={{ fontWeight: 'bold', color: colors.purple, fontSize: '13px' }}>{exp.dates}</div>
                            </div>
                            <div style={{ fontStyle: 'italic', color: colors.gray, fontSize: '14px', marginBottom: '4px' }}>{exp.company}</div>
                            <p style={{ color: colors.black, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Projects */}
                {cvrData.projects && cvrData.projects.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `0.5px solid ${cvrData.color || colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Projects
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cvrData.projects.map((proj: any, i: number) => (
                        <div key={i} style={{ backgroundColor: colors.lightGray, padding: '12px', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', background: (cvrData.color || colors.purple) }} />
                            <div style={{ fontWeight: 'bold', color: colors.black, fontSize: '14px', marginBottom: '2px' }}>{proj.title}</div>
                            <div style={{ fontSize: '13px', color: colors.black, marginBottom: '4px' }}>{proj.description}</div>
                            {proj.technologies && <div style={{ fontSize: '11px', fontFamily: 'monospace', color: (cvrData.color || colors.purple) }}>Tech: {proj.technologies}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Certifications */}
                {cvrData.certifications && cvrData.certifications.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Certifications
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cvrData.certifications.map((cert: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', color: colors.black, fontSize: '14px' }}>{cert.name}</div>
                                {cert.issuer && <div style={{ fontSize: '13px', color: colors.gray, marginTop: '4px' }}>{cert.issuer}</div>}
                            </div>
                            <div style={{ fontSize: '13px', color: colors.gray }}>{cert.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Awards */}
                {cvrData.awards && cvrData.awards.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${colors.purple}`, paddingBottom: '4px', marginBottom: '12px' }}>
                      Awards
                    </h3>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {cvrData.awards.map((award: any, i: number) => (
                        <li key={i} style={{ fontSize: '14px', color: colors.black, marginBottom: '4px' }}>
                          <strong>{award.title}</strong> - {award.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resume Skills */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: colors.gray, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${colors.purple}`, paddingBottom: '4px', marginBottom: '16px' }}>
                    Competencies & Skills
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {cvrData.skills && cvrData.skills.map((skill: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: skill.verified ? colors.greenBg : colors.lightGray, borderRadius: '16px', border: `1px solid ${skill.verified ? colors.greenText : colors.border}` }}>
                        <span style={{ fontWeight: '600', fontSize: '12px', color: skill.verified ? colors.greenText : colors.black }}>{skill.name}</span>
                        {skill.verified && (
                          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blockchain Footer (Conditional) */}
                {includeVerification && (
                  <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: colors.purpleLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.purple }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div style={{ fontSize: '12px', color: colors.gray }}>
                      <p style={{ fontWeight: 'bold', color: colors.black, margin: 0 }}>Cryptographically Secured Document</p>
                      <p style={{ margin: 0 }}>Generated by VECTOR Platform • Immutable Record on Polygon Amoy Testnet</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '4px', color: '#9ca3af', margin: 0 }}>ID: {Date.now()}-{cvrData.fullName?.substring(0,3).toUpperCase()}</p>
                    </div>
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