'use client';

import { useState, useRef } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import type { EmailDomainResult } from '@/lib/institution-domains';

export default function CredentialUploadPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [fraudFlags, setFraudFlags] = useState<{description: string}[]>([]);
  const [fraudScore, setFraudScore] = useState<number>(0);
  const [emailDomainMatch, setEmailDomainMatch] = useState<EmailDomainResult | null>(null);
  
  // Step 2 Form State
  const [formData, setFormData] = useState({
    institution_name: '',
    credential_type: 'diploma',
    field_of_study: '',
    date_issued: '',
    skills: [] as string[],
    skillInput: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setUploading(true);

    const csrfToken = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
      : '';

    try {
      // 1. Upload
      const fd = new FormData();
      fd.append('file', file);
      
      const uploadRes = await fetch('/api/credentials/upload', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
        body: fd,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const { id } = await uploadRes.json();
      setSubmissionId(id);

      // 2. Extract
      const extractRes = await fetch('/api/credentials/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ submission_id: id }),
      });

      if (!extractRes.ok) throw new Error('Extraction failed');
      const data = await extractRes.json();
      
      setFraudFlags(data.fraud_flags || []);
      setFraudScore(data.fraud_score || 0);
      setEmailDomainMatch(data.email_domain_match || null);

      setFormData({
        institution_name: data.extracted_data?.institution_name || '',
        credential_type: data.extracted_data?.credential_type || 'diploma',
        field_of_study: data.extracted_data?.field_of_study || '',
        date_issued: data.extracted_data?.date_issued || '',
        skills: data.extracted_data?.skills || [],
        skillInput: '',
      });

      setStep(2);
    } catch (error) {
      console.error(error);
      alert('An error occurred during upload or analysis.');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: ''
      });
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSubmitReview = async () => {
    if (!submissionId) return;

    const csrfToken = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1] || ''
      : '';

    try {
      const res = await fetch('/api/credentials/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          submission_id: submissionId,
          confirmed_data: {
            institution_name: formData.institution_name,
            credential_type: formData.credential_type,
            field_of_study: formData.field_of_study,
            date_issued: formData.date_issued,
            skills: formData.skills
          }
        })
      });

      if (res.status === 409) {
        const errorData = await res.json();
        const confirmBypass = confirm(`This credential may already exist for skills: ${errorData.duplicates.join(', ')}. Submit anyway?`);
        if (confirmBypass) {
          await fetch('/api/credentials/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            body: JSON.stringify({
              submission_id: submissionId,
              confirmed_data: {
                institution_name: formData.institution_name,
                credential_type: formData.credential_type,
                field_of_study: formData.field_of_study,
                date_issued: formData.date_issued,
                skills: formData.skills
              },
              ignore_duplicates: true
            })
          });
          setStep(3);
        }
      } else if (res.ok) {
        setStep(3);
      } else {
        alert('Failed to submit credential');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/student/credentials" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-2 mb-4 transition-colors text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Credentials
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">Upload & Analyze Credential</h1>
              <p className="text-sm text-gray-500 dark:text-[#94A3B8]">Upload your diploma, certificate, or transcript for instant AI verification and data extraction.</p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-[#06B4C9] text-white shadow-sm' : 'bg-gray-200 dark:bg-[#1E2536] text-gray-500 dark:text-[#94A3B8]'}`}>1</div>
          <div className={`flex-1 h-1 mx-2 rounded ${step >= 2 ? 'bg-[#06B4C9]' : 'bg-gray-200 dark:bg-[#1E2536]'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-[#06B4C9] text-white shadow-sm' : 'bg-gray-200 dark:bg-[#1E2536] text-gray-500 dark:text-[#94A3B8]'}`}>2</div>
          <div className={`flex-1 h-1 mx-2 rounded ${step >= 3 ? 'bg-[#06B4C9]' : 'bg-gray-200 dark:bg-[#1E2536]'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 3 ? 'bg-[#06B4C9] text-white shadow-sm' : 'bg-gray-200 dark:bg-[#1E2536] text-gray-500 dark:text-[#94A3B8]'}`}>3</div>
        </div>

        <div className="bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#1E2536] rounded-xl p-6 md:p-8 shadow-sm">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>Step 1: Document Upload</span>
              </h2>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-[#06B4C9] bg-[#06B4C9]/5' : 'border-gray-300 dark:border-[#1E2536] hover:border-[#06B4C9]/50'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-[#06B4C9]/20 text-[#06B4C9] rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-[#94A3B8]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E2536] text-gray-400 dark:text-[#94A3B8] rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium mb-1">Drag and drop your credential document here</p>
                      <p className="text-sm text-gray-500 dark:text-[#94A3B8]">or click to browse (PDF, PNG, JPG up to 10MB)</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-[#1E2536] dark:hover:bg-[#2A3441] text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleUploadAndAnalyze}
                  disabled={!file || uploading}
                  className="bg-[#06B4C9] hover:bg-[#0598A9] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  {uploading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      AI Engine is extracting & analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Upload & Analyze
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Step 2: Review AI Extraction</h2>
              
              {fraudScore < 0.3 ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-bold">Legitimate Document Verified</p>
                    <p className="text-sm opacity-90">Our AI assistant verified this document and extracted all key skill attributes cleanly.</p>
                  </div>
                </div>
              ) : fraudScore < 0.6 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-bold">Medium Risk Identified</p>
                    <ul className="text-sm opacity-90 list-disc list-inside mt-1">
                      {fraudFlags.map((flag, i) => (
                        <li key={i}>{flag.description}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-bold">High Risk Identified</p>
                    <p className="text-sm opacity-90 mt-1">Registrar review may be delayed due to multiple anomalies found.</p>
                    <ul className="text-sm opacity-90 list-disc list-inside mt-2">
                      {fraudFlags.map((flag, i) => (
                        <li key={i}>{flag.description}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {emailDomainMatch && (
                <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 border ${
                  emailDomainMatch.confidence === 'high' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                  emailDomainMatch.confidence === 'partial' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400' :
                  'bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20 text-gray-700 dark:text-gray-400'
                }`}>
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-bold">
                      {emailDomainMatch.confidence === 'high' ? 'Email Domain Verified' :
                       emailDomainMatch.confidence === 'partial' ? 'Institutional Email Detected' :
                       'Standard Email'}
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {emailDomainMatch.confidence === 'high' ? `Your email @${emailDomainMatch.domain} matches this institution — this helps verify your credential faster.` :
                       emailDomainMatch.confidence === 'partial' ? `Your email @${emailDomainMatch.domain} is from an educational institution.` :
                       `Your email @${emailDomainMatch.domain} is not from an institutional domain — your credential will still be reviewed normally.`}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1">Institution Name</label>
                  <input 
                    type="text" 
                    value={formData.institution_name}
                    onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0B0F19] border border-gray-300 dark:border-[#1E2536] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#06B4C9]"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1">Credential Type</label>
                    <select 
                      value={formData.credential_type}
                      onChange={(e) => setFormData({...formData, credential_type: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#0B0F19] border border-gray-300 dark:border-[#1E2536] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#06B4C9]"
                    >
                      <option value="diploma">Diploma</option>
                      <option value="certificate">Certificate</option>
                      <option value="license">License</option>
                      <option value="transcript">Transcript</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1">Date Issued</label>
                    <input 
                      type="date" 
                      value={formData.date_issued}
                      onChange={(e) => setFormData({...formData, date_issued: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#0B0F19] border border-gray-300 dark:border-[#1E2536] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#06B4C9] [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1">Field of Study</label>
                  <input 
                    type="text" 
                    value={formData.field_of_study}
                    onChange={(e) => setFormData({...formData, field_of_study: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0B0F19] border border-gray-300 dark:border-[#1E2536] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#06B4C9]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#94A3B8] mb-1">AI Extracted Skills & Competencies</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      value={formData.skillInput}
                      onChange={(e) => setFormData({...formData, skillInput: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Add a skill..."
                      className="flex-1 bg-gray-50 dark:bg-[#0B0F19] border border-gray-300 dark:border-[#1E2536] rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-[#06B4C9]"
                    />
                    <button 
                      type="button"
                      onClick={addSkill}
                      className="bg-gray-100 hover:bg-gray-200 dark:bg-[#1E2536] dark:hover:bg-[#2A3441] text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(skill => (
                      <span key={skill} className="bg-[#06B4C9]/20 text-[#06B4C9] px-3 py-1 rounded-full text-sm flex items-center gap-2 font-medium">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleSubmitReview}
                  className="bg-[#06B4C9] hover:bg-[#0598A9] text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm shadow-sm"
                >
                  Confirm & Submit for Review
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Credential Submitted!</h2>
              <p className="text-gray-500 dark:text-[#94A3B8] mb-8 max-w-md mx-auto text-sm">
                Your credential has been submitted for institutional review. You will be notified once a registrar has reviewed it.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => {
                    setStep(1);
                    setFile(null);
                    setEmailDomainMatch(null);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-[#1E2536] dark:hover:bg-[#2A3441] text-gray-900 dark:text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
                >
                  Upload Another
                </button>
                <Link 
                  href="/student/credentials"
                  className="bg-[#06B4C9] hover:bg-[#0598A9] text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm shadow-sm"
                >
                  View My Credentials
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
