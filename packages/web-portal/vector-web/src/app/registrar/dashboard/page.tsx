 'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RegistrarLayout from '@/components/dashboard/RegistrarLayout';
import SchemaBuilder from '@/components/dashboard/SchemaBuilder';
import HelpTip from '@/components/shared/HelpTip';
import { supabase } from '@/lib/supabaseClient';
import type { EmailDomainResult } from '@/lib/institution-domains';

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

}

interface VerifiedCredential {
  id: string;
  user_id: string;
  skill_name: string;
  issued_at: string;

  revoked?: boolean;
}

interface IssuanceProgress {
  isOpen: boolean;
  progress: number;
  status: 'processing' | 'complete' | 'error';
  message: string;
  errorDetails?: string[];
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
  const [activeTab, setActiveTab] = useState<'issue' | 'build' | 'batch' | 'review'>('issue');
  interface ReviewItem {
    id: string;
    student_name: string;
    student_id: string;
    student_email: string;
    extracted_data?: Record<string, string>;
    fraud_score: number;
    email_domain_match?: EmailDomainResult;
    fraud_flags?: Array<{ type: string; description: string; severity: string }>;
    created_at: string;
    file_url: string;
    file_name: string;
  }
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedFlags, setExpandedFlags] = useState<Record<string, boolean>>({});

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [studentCredentials, setStudentCredentials] = useState<VerifiedCredential[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [dynamicData, setDynamicData] = useState<Record<string, string | number | boolean | null>>({});
  const [staticData, setStaticData] = useState({ certificateNumber: '', privateNotes: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [issuanceProgress, setIssuanceProgress] = useState<IssuanceProgress>({
    isOpen: false, progress: 0, status: 'processing', message: ''
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.replace('/login');
        // eslint-disable-next-line react-hooks/immutability
        await Promise.all([fetchSchemas(), fetchStudents(), fetchReviewQueue()]);
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
      const allCreds: VerifiedCredential[] = await res.json();
      
      // Filter for the selected student
      const studentCreds = allCreds.filter(c => c.user_id === selectedStudent.id);
      setStudentCredentials(studentCreds);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
    setCredentialsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCreds();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent]);

  const fetchSchemas = async () => {
    const { data } = await supabase.from('credential_schemas').select('*').order('created_at', { ascending: false });
    if (data) {
      setSchemas(data);
      if (data.length > 0) setSelectedSchema(data[0]);
    }
  };

  const fetchReviewQueue = async () => {
    try {
      const res = await fetch('/api/credentials/review');
      if (res.ok) setReviewQueue(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleReviewAction = async (id: string, action: 'approve' | 'reject') => {
    setIssuanceProgress({ isOpen: true, progress: 50, status: 'processing', message: `Processing ${action}...` });
    try {
      // 🛡️ CSRF - Extract token from cookies
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const res = await fetch('/api/credentials/review', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ submission_id: id, action, notes: reviewNotes[id] || '' })
      });
      if (!res.ok) throw new Error('Failed to process review');
      setIssuanceProgress({ isOpen: true, progress: 100, status: 'complete', message: `Credential ${action}d successfully` });
      await fetchReviewQueue();
    } catch (e) {
      setIssuanceProgress({ isOpen: true, progress: 100, status: 'error', message: e instanceof Error ? e.message : 'Error processing review' });
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('users').select('id, full_name, student_id').eq('role', 'student').order('full_name');
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
      setIssuanceProgress({ isOpen: true, progress: 20, status: 'processing', message: 'Preparing certificate...' });
      setIssuanceProgress(prev => ({ ...prev, progress: 80, message: 'Saving certificate to the database…' }));

      // Build credential_data without skill_tags (it's promoted to its own column)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { skill_tags: _removed, ...credentialDataWithoutTags } = dynamicData;

      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      const response = await fetch('/api/registrar/credentials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          user_id: selectedStudent!.id,
          schema_id: selectedSchema!.id,
          skill_name: selectedSchema!.title,       // credential display title — unchanged
          skill_tags: skillTags,                   // ✅ extracted marketable skills array
          credential_data: credentialDataWithoutTags,
          private_notes: staticData.privateNotes,
          certificate_number: staticData.certificateNumber
        })
      });

      if (!response.ok) throw new Error(await response.text());

      setIssuanceProgress({
        isOpen: true, progress: 100, status: 'complete',
        message: 'Certificate issued and verified successfully!'
      });

      // ✅ Refresh the credentials list immediately so the new one appears in the management panel
      await fetchCreds();

      // Clear form
      setDynamicData({});
      setStaticData({ certificateNumber: '', privateNotes: '' });
      setValidationErrors({});
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setIssuanceProgress({ isOpen: true, progress: 0, status: 'error', message });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRevokeCredential = async (cred: VerifiedCredential) => {
    if (!selectedStudent) {
      alert("Please select a student.");
      return;
    }

    const confirmRevoke = window.confirm(
      `Are you sure you want to REVOKE "${cred.skill_name}" for ${selectedStudent.full_name}?\n\nThis will mark the credential as revoked in the database.`
    );
    if (!confirmRevoke) return;

    try {
      setIssuanceProgress({ isOpen: true, progress: 50, status: 'processing', message: 'Updating database records...' });
      
      // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
      const csrfToken = typeof document !== 'undefined' 
        ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
        : '';

      // Mark as revoked in DB via server-side API (bypasses RLS)
      const res = await fetch('/api/registrar/credentials', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({ id: cred.id, revoked: true })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Database sync failed: ${errorData.error || res.statusText}${errorData.details ? ` (${errorData.details})` : ''}`);
      }

      // Refresh local state
      setStudentCredentials(prev => prev.map(c => c.id === cred.id ? { ...c, revoked: true } : c));

      setIssuanceProgress({
        isOpen: true,
        progress: 100,
        status: 'complete',
        message: 'Credential successfully revoked.',
      });
    } catch (err: unknown) {
      console.error('Revocation Error:', err);
      const typedErr = err as { reason?: string; message?: string };
      setIssuanceProgress({
        isOpen: true,
        progress: 100,
        status: 'error',
        message: typedErr.reason || typedErr.message || 'Transaction failed.',
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
      <div className="max-w-7xl mx-auto pb-12">
        {/* Page Top Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificate Workspace</h1>
            <HelpTip text="This is your main workspace for managing student certificates. Use the tabs to issue individual certificates, upload in bulk, or design new certificate templates. Every certificate you issue is permanently recorded and verifiable." />
          </div>
          <p className="text-sm text-gray-500 dark:text-[#94A3B8] mb-5">
            Issue, batch-import, and review the credentials your institution has verified.
          </p>

          {/* Horizontal Navigation Tabs */}
          <div className="flex items-center border-b border-gray-200 dark:border-[#1E2536] gap-8">
            <button
              onClick={() => setActiveTab('issue')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'issue'
                  ? 'border-[#06B4C9] text-[#06B4C9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              Issue Certificate
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'batch'
                  ? 'border-[#06B4C9] text-[#06B4C9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              Batch Import
            </button>
            <button
              onClick={() => setActiveTab('build')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'build'
                  ? 'border-[#06B4C9] text-[#06B4C9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              Template Builder
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'review'
                  ? 'border-[#06B4C9] text-[#06B4C9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              Credential Reviews
              {reviewQueue.length > 0 && (
                <span className="bg-[#F97316] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {reviewQueue.length}
                </span>
              )}
            </button>
          </div>

          {/* Required Fields Sub-label */}
          {activeTab === 'issue' && (
            <div className="mt-3 text-xs text-red-500 font-medium">
              * Indicates a required field
            </div>
          )}
        </div>

        {activeTab === 'review' ? (
          <div className="bg-white dark:bg-[#0E1220] rounded-2xl shadow-sm border border-gray-200 dark:border-[#1E2536] p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Pending Credential Reviews</h2>
            {reviewQueue.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-[#1E2536] rounded-xl">
                <p className="text-gray-500 dark:text-[#94A3B8]">No pending reviews found.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviewQueue.map((item) => {
                  const fraudScore = item.fraud_score || 0;
                  const isHighRisk = fraudScore > 0.6;
                  const isMediumRisk = fraudScore > 0.3 && fraudScore <= 0.6;
                  const isExpanded = expandedFlags[item.id] || false;
                  
                  return (
                    <div key={item.id} className="border border-gray-200 dark:border-[#1E2536] rounded-xl p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {item.student_name} <span className="text-sm font-normal text-gray-500 dark:text-[#94A3B8]">({item.student_id})</span>
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-[#94A3B8]">{item.student_email}</p>
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.extracted_data?.credential_type || 'Unknown Credential'}</p>
                            <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{item.extracted_data?.institution_name || 'Unknown Institution'}</p>
                            <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(item.created_at).toLocaleString()}</p>
                            <a href={item.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#06B4C9] hover:underline mt-1 inline-block">View Document: {item.file_name}</a>
                          </div>
                        </div>
                        <div className="md:text-right flex flex-col items-end gap-2">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${isHighRisk ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : isMediumRisk ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'}`}>
                            {isHighRisk ? '🔴 High Risk' : isMediumRisk ? '🟡 Medium Risk' : '🟢 Low Risk'} ({(fraudScore * 100).toFixed(0)}%)
                          </div>
                          {item.email_domain_match && (
                            <div title={item.email_domain_match.reason} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                              item.email_domain_match.confidence === 'high' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                              item.email_domain_match.confidence === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                              'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20'
                            }`}>
                              {item.email_domain_match.confidence === 'high' ? '🟢 Email Verified' :
                               item.email_domain_match.confidence === 'partial' ? '🔵 Institutional Email' :
                               '⚪ Personal Email'}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.fraud_flags && item.fraud_flags.length > 0 && (
                        <div className="mb-4 bg-gray-50 dark:bg-[#131825] rounded-lg border border-gray-100 dark:border-[#1E2536] overflow-hidden">
                          <button onClick={() => setExpandedFlags(prev => ({...prev, [item.id]: !isExpanded}))} className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-[#CBD5E1] flex justify-between items-center hover:bg-gray-100 dark:hover:bg-[#1E2536] transition-colors">
                            <span>AI Analysis ({item.fraud_flags.length} flags)</span>
                            <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-100 dark:border-[#1E2536] space-y-2">
                              {item.fraud_flags.map((flag, i: number) => (
                                <div key={i} className="flex gap-2 text-sm">
                                  <span className={`shrink-0 ${flag.severity === 'high' ? 'text-red-500' : flag.severity === 'medium' ? 'text-yellow-500' : 'text-gray-400'}`}>•</span>
                                  <div>
                                    <p className="text-gray-800 dark:text-[#E2E8F0]"><span className="font-semibold capitalize">{flag.type}:</span> {flag.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        <textarea
                          placeholder="Optional notes to student (required for rejection)"
                          value={reviewNotes[item.id] || ''}
                          onChange={(e) => setReviewNotes(prev => ({...prev, [item.id]: e.target.value}))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#131825] dark:text-white"
                          rows={2}
                        />
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => handleReviewAction(item.id, 'reject')} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 font-medium rounded-lg transition-colors text-sm">
                            ✗ Reject
                          </button>
                          <button onClick={() => handleReviewAction(item.id, 'approve')} className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 font-medium rounded-lg transition-colors text-sm">
                            ✓ Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'build' ? (
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
                      <code className="bg-accent-10 px-1 rounded">student_id, {schemaFields.join(', ')}</code>
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
                <div className="flex items-center justify-between w-full px-4">
                  <div className="text-left min-w-0 pr-4">
                    <p className="font-semibold text-green-700 truncate">{csvFile.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{(csvFile.size / 1024).toFixed(1)} KB — click or drag to replace</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      setCsvResult(null);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                setIssuanceProgress({
                  isOpen: true,
                  progress: 30,
                  status: 'processing',
                  message: 'Uploading and validating batch CSV file...'
                });
                try {
                  const form = new FormData();
                  form.append('file', csvFile);
                  if (batchSchemaId) form.append('schema_id', batchSchemaId);
                  // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
                  const csrfToken = typeof document !== 'undefined' 
                    ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
                    : '';

                  const res = await fetch('/api/registrar/csv-upload', { 
                    method: 'POST', 
                    body: form,
                    headers: {
                      'x-csrf-token': csrfToken || ''
                    }
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setCsvResult({ success: true, rows: data.rows, warnings: data.warnings });
                    setIssuanceProgress({
                      isOpen: true,
                      progress: 100,
                      status: 'complete',
                      message: `Successfully validated ${data.rows?.length || 0} record(s). Ready for issuance.`
                    });
                  } else {
                    setCsvResult({ success: false, error: data.error, rowErrors: data.rowErrors });
                    const details: string[] = [];
                    if (data.rowErrors && data.rowErrors.length > 0) {
                      data.rowErrors.forEach((re: { row: number; issues?: string[]; message?: string; field?: string }) => {
                        if (re.issues && re.issues.length > 0) {
                          details.push(`Row ${re.row}: ${re.issues.join(', ')}`);
                        } else if (re.message) {
                          details.push(`Row ${re.row}${re.field ? ` (${re.field})` : ''}: ${re.message}`);
                        }
                      });
                    }
                    setIssuanceProgress({
                      isOpen: true,
                      progress: 0,
                      status: 'error',
                      message: data.error || 'Invalid CSV file format or missing required headers.',
                      errorDetails: details.length > 0 ? details : undefined
                    });
                  }
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "An unknown error occurred";
                  setCsvResult({ success: false, error: message });
                  setIssuanceProgress({
                    isOpen: true,
                    progress: 0,
                    status: 'error',
                    message: 'Unreadable or invalid CSV file attached.',
                    errorDetails: [message]
                  });
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

            {/* Validation Results (Only render preview table on successful validation) */}
            {csvResult && csvResult.success && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                <h3 className="font-bold mb-3 text-green-800">
                  {csvResult.rows?.length} record(s) ready for issuance
                </h3>

                {csvResult.warnings && csvResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="font-semibold text-yellow-800 text-sm mb-1">Auto-corrections applied:</p>
                    {csvResult.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-yellow-700">• {w}</p>
                    ))}
                  </div>
                )}

                {/* Validated rows table */}
                {csvResult.rows && csvResult.rows.length > 0 && (() => {
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
                                    {String(row[k] || '')}
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
                            setIssuanceProgress({ isOpen: true, progress: 5, status: 'processing', message: 'Preparing batch...' });

                            const total = rows.length;

                            // Phase 3: Save each credential to database
                            let completed = 0;
                            for (let idx = 0; idx < rows.length; idx++) {
                              const row = rows[idx];
                              setIssuanceProgress(prev => ({
                                ...prev,
                                progress: 50 + Math.round((idx / total) * 45),
                                message: `Saving record ${idx + 1} of ${total} to database...`,
                              }));

                              const { student_id, skill_tags: rawTags, ...credentialData } = row;
                              const skillTags = rawTags ? String(rawTags).split(',').map((t: string) => t.trim()).filter(Boolean) : [];

                              // 🛡️ CSRF - Extract token from cookies (Task 9 integration)
                              const csrfToken = typeof document !== 'undefined' 
                                ? document.cookie.split('; ').find(row => row.startsWith('vector-csrf-token='))?.split('=')[1]
                                : '';

                              const saveRes = await fetch('/api/registrar/credentials', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'x-csrf-token': csrfToken || ''
                                },
                                body: JSON.stringify({
                                  user_id: student_id,
                                  schema_id: batchSchemaId,
                                  skill_name: batchSchema.title,
                                  skill_tags: skillTags,
                                  credential_data: credentialData,
                                  private_notes: '',
                                  certificate_number: `BATCH-${Date.now()}-${idx + 1}`
                                }),
                              });

                              if (!saveRes.ok) {
                                const errText = await saveRes.text().catch(() => 'Unknown error');
                                throw new Error(`Failed to save record ${idx + 1}: ${errText}`);
                              }

                              completed++;
                            }

                            setIssuanceProgress({
                              isOpen: true, progress: 100, status: 'complete',
                              message: `Successfully issued ${completed} certificate${completed > 1 ? 's' : ''}.`,
                            });
                          } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : 'Batch processing failed';
                            setIssuanceProgress({ isOpen: true, progress: 0, status: 'error', message });
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
              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">Select a template above to see the exact columns needed. <strong>student_id</strong> is always required.</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-gray-400 dark:text-[#64748B]">• Special characters are automatically cleaned</p>
                <p className="text-xs text-gray-400 dark:text-[#64748B]">• Maximum file size: 1 MB — Maximum rows: 500</p>
              </div>
            </div>
          </div>
        ) : (
          /* Issue Certificate Main Two-Column Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Main Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* CARD 1: Find Student */}
              <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Find Student</h2>
                <div className="relative" ref={searchRef}>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#CBD5E1] mb-1.5">
                    Search by name or student ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedStudent(null); }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-10 pr-8 py-2.5 text-sm border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white placeholder-gray-400"
                      placeholder="Start typing a name or student ID..."
                    />
                    {selectedStudent && (
                      <button
                        type="button"
                        onClick={() => { setSelectedStudent(null); setSearchQuery(''); }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {validationErrors['student'] && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors['student']}</p>
                  )}

                  {showDropdown && searchQuery && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#131825] border border-gray-200 dark:border-[#283042] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredStudents.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm font-medium text-gray-600 dark:text-[#94A3B8]">No student found</p>
                          <p className="text-xs text-gray-400 dark:text-[#64748B] mt-0.5">Try a different name or student ID</p>
                        </div>
                      ) : filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedStudent(s);
                            setSearchQuery(`${s.full_name}${s.student_id ? ` (${s.student_id})` : ''}`);
                            setShowDropdown(false);
                          }}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-[#1E2536] flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                            <p className="text-xs text-gray-500 dark:text-[#64748B]">ID: {s.student_id || 'Not Assigned'}</p>
                          </div>
                          <span className="text-[10px] bg-[#06B4C9]/10 text-[#06B4C9] px-2 py-0.5 rounded font-bold">Verified User ✓</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedStudent && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-[#06B4C9] bg-[#06B4C9]/5 p-2.5 rounded-lg border border-[#06B4C9]/20">
                      <span className="font-semibold">Selected Student:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{selectedStudent.full_name}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono">ID: {selectedStudent.student_id || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: Certificate Template */}
              <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Certificate Template</h2>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#CBD5E1] mb-1.5">
                  Choose a template <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchema?.id || ''}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-[#283042] rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
                >
                  {schemas.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                {validationErrors['schema'] && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors['schema']}</p>
                )}
              </div>

              {/* CARD 3: Fields in this template */}
              {selectedSchema && (
                <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Fields in this template</h2>
                  
                  {/* Cyan Tint Box */}
                  <div className="bg-[#06B4C9]/5 dark:bg-[#06B4C9]/10 border border-[#06B4C9]/20 dark:border-[#06B4C9]/30 rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedSchema.json_schema.properties).map(([key, fieldDetails]) => {
                        const isSkillTags = key === 'skill_tags';
                        const humanLabel = fieldDetails.title && fieldDetails.title !== key
                          ? fieldDetails.title
                          : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const isDateField = fieldDetails.type === 'date' || key.includes('date') || key.includes('until') || key.includes('expir') || key.includes('graduation');
                        const today = new Date().toISOString().split('T')[0];
                        const maxDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                        const currentSkillVal = String(dynamicData['skill_tags'] || '');
                        const parsedSkills = parseSkillTags(currentSkillVal);
                        const sampleSkills = ['React', 'Node.js', 'PostgreSQL', 'Express'];
                        const displaySkills = parsedSkills.length > 0 ? parsedSkills : sampleSkills;

                        return (
                          <div key={key} className={isSkillTags ? 'md:col-span-2' : ''}>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-[#CBD5E1] mb-1">
                              {humanLabel}
                              {selectedSchema.json_schema.required?.includes(key) && <span className="text-red-500 ml-1">*</span>}
                              {FIELD_HINTS[key] && !isSkillTags && <HelpTip size={13} text={FIELD_HINTS[key]} />}
                            </label>
                            
                            {isSkillTags ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={currentSkillVal}
                                  onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
                                  placeholder="e.g. React, Node.js, PostgreSQL, Express"
                                />
                                <p className="text-xs text-[#06B4C9] font-medium">
                                  These become the student&apos;s verified skill tags shown on their profile.
                                </p>

                                {/* Capsule Pills */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {displaySkills.map((tag, idx) => {
                                    const isIncluded = parsedSkills.includes(tag);
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          if (!isIncluded) {
                                            const newTags = parsedSkills.concat(tag).join(', ');
                                            handleDynamicInputChange(key, newTags);
                                          } else {
                                            const newTags = parsedSkills.filter(t => t !== tag).join(', ');
                                            handleDynamicInputChange(key, newTags);
                                          }
                                        }}
                                        className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                                          isIncluded
                                            ? 'bg-[#06B4C9] text-white'
                                            : 'bg-white dark:bg-[#192030] text-[#06B4C9] border border-[#06B4C9]/30 hover:bg-[#06B4C9]/10'
                                        }`}
                                      >
                                        <span>+</span>
                                        <span>{tag}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : fieldDetails.type === 'boolean' ? (
                              <select
                                value={dynamicData[key] === true ? 'true' : dynamicData[key] === false ? 'false' : ''}
                                onChange={(e) => handleDynamicInputChange(key, e.target.value === 'true')}
                                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
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
                                  value={String(dynamicData[key] || '')}
                                  onChange={(e) => handleDynamicInputChange(key, e.target.value)}
                                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
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
                                value={dynamicData[key] !== undefined && dynamicData[key] !== null ? String(dynamicData[key]) : ''}
                                onChange={(e) => handleDynamicInputChange(key, fieldDetails.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white placeholder-gray-400"
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
                </div>
              )}

              {/* CARD 4: Additional Metadata & Action */}
              <div className="bg-white dark:bg-[#131825] rounded-xl border border-gray-200 dark:border-[#1E2536] p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#CBD5E1] mb-1.5">
                    Certificate / Serial Number <HelpTip text="Enter a unique identifier for this certificate. E.g. CERT-2027-001" />
                  </label>
                  <input
                    type="text"
                    value={staticData.certificateNumber}
                    onChange={(e) => setStaticData({ ...staticData, certificateNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
                    placeholder="e.g. CERT-2027-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#CBD5E1] mb-1.5">
                    Internal Notes <HelpTip text="Optional private notes only visible to registrars." />
                  </label>
                  <textarea
                    value={staticData.privateNotes}
                    onChange={(e) => setStaticData({ ...staticData, privateNotes: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-[#283042] rounded-lg outline-none focus:ring-2 focus:ring-[#06B4C9] bg-white dark:bg-[#151C2A] text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="Internal notes (only visible to registrars)..."
                  />
                </div>

                <button
                  onClick={handleIssueCredential}
                  className="w-full py-3.5 bg-[#06B4C9] hover:bg-[#0496a3] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                >
                  Issue Verified Certificate
                </button>
              </div>

            </div>

            {/* Right Sidebar Column (4 cols) */}
            <div className="lg:col-span-4 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-[#CBD5E1] mb-3">Live Certificate Preview</h2>
              <div className="border-2 border-[#06B4C9] rounded-2xl p-6 bg-white dark:bg-[#131825] relative overflow-hidden">
                
                {/* Circular Cyan Badge with Checkmark */}
                <div className="w-10 h-10 rounded-full border-2 border-[#06B4C9] text-[#06B4C9] flex items-center justify-center absolute top-6 right-6 bg-[#06B4C9]/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <p className="text-[11px] font-bold text-[#06B4C9] tracking-wider uppercase mb-1">CERTIFICATE OF COMPLETION</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {selectedStudent ? selectedStudent.full_name : 'Select a student'}
                </h3>
                <p className="text-xs text-gray-400 dark:text-[#64748B] mt-0.5 mb-6">
                  {selectedStudent ? `ID: ${selectedStudent.student_id || 'N/A'}` : 'Choose a template and student to begin'}
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] tracking-wider uppercase">PROGRAM</p>
                    <p className="text-sm font-medium italic text-gray-700 dark:text-gray-200">
                      {String(dynamicData['program_name'] || selectedSchema?.title || 'Full-Stack Web Development Bootcamp')}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] tracking-wider uppercase">HOURS COMPLETED</p>
                    <p className={`text-sm font-medium italic ${dynamicData['hours_completed'] ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-[#64748B]'}`}>
                      {dynamicData['hours_completed'] ? `${dynamicData['hours_completed']} hours` : 'Not yet entered'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] tracking-wider uppercase">VERIFIED SKILLS</p>
                    {dynamicData['skill_tags'] && String(dynamicData['skill_tags']).trim() ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {parseSkillTags(String(dynamicData['skill_tags'])).map((sk, i) => (
                          <span key={i} className="text-xs bg-[#06B4C9]/10 text-[#06B4C9] px-2 py-0.5 rounded font-semibold border border-[#06B4C9]/20">
                            {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium italic text-gray-400 dark:text-[#64748B]">Not yet entered</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 dark:border-[#1E2536] my-6" />

                <p className="font-mono text-xs text-gray-500 dark:text-[#94A3B8]">
                  Serial: {staticData.certificateNumber ? staticData.certificateNumber : 'pending'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Batch Import & Issuance Loading Status Progress Modal */}
        {issuanceProgress.isOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <div className="bg-white dark:bg-[#0E1220] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#1E2536] max-w-md w-full p-7 text-center relative overflow-hidden">
              {/* Background glows */}
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#06B4C9]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Status Animated Icon */}
              <div className="flex justify-center mb-4 relative">
                {issuanceProgress.status === 'processing' && (
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-[#06B4C9]/20 border-t-[#06B4C9] animate-spin" />
                    <svg className="w-7 h-7 text-[#06B4C9] absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                )}

                {issuanceProgress.status === 'complete' && (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {issuanceProgress.status === 'error' && (
                  <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Modal Title & Primary Message */}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {issuanceProgress.status === 'complete'
                  ? 'Batch Operation Complete!'
                  : issuanceProgress.status === 'error'
                  ? 'Batch Validation Unsuccessful'
                  : 'Processing Batch Import…'}
              </h2>

              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">
                {issuanceProgress.message}
              </p>

              {/* Detailed Error Breakdown (For Failure state) */}
              {issuanceProgress.status === 'error' && (
                <div className="mb-5 space-y-3 text-left">
                  {issuanceProgress.errorDetails && issuanceProgress.errorDetails.length > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3 max-h-36 overflow-y-auto">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1.5 flex items-center justify-between">
                        <span>Row & Field Errors</span>
                        <span className="font-mono text-[10px] bg-rose-200 dark:bg-rose-500/30 px-1.5 py-0.5 rounded">{issuanceProgress.errorDetails.length} issue(s)</span>
                      </p>
                      <ul className="space-y-1 text-xs text-rose-800 dark:text-rose-300 font-mono">
                        {issuanceProgress.errorDetails.map((err, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-rose-500 font-bold shrink-0">•</span>
                            <span className="break-words">{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-1">Checklist to fix file:</p>
                    <ul className="space-y-0.5 text-[11px] opacity-90 list-disc list-inside">
                      <li>Ensure file is saved as a <strong>valid .CSV file</strong></li>
                      <li>Verify required column header <strong>student_id</strong> exists</li>
                      <li>Confirm field names match the selected template schema</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Progress Bar (For Processing & Success states) */}
              {issuanceProgress.status !== 'error' && (
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-slate-400">
                    <span>Progress Status</span>
                    <span className="text-[#06B4C9] font-mono font-bold">{issuanceProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-[#131825] rounded-full h-3 overflow-hidden p-0.5 border border-gray-200/60 dark:border-[#1E2536]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        issuanceProgress.status === 'complete'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-[#06B4C9] to-cyan-400'
                      }`}
                      style={{ width: `${issuanceProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {issuanceProgress.status === 'error' ? (
                <button
                  onClick={() => setIssuanceProgress({ isOpen: false, progress: 0, status: 'processing', message: '' })}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-rose-500/20"
                >
                  Try Again & Fix File
                </button>
              ) : issuanceProgress.status === 'complete' ? (
                <button
                  onClick={() => setIssuanceProgress({ isOpen: false, progress: 0, status: 'processing', message: '' })}
                  className="w-full py-3 bg-[#06B4C9] hover:bg-[#059ab0] active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#06B4C9]/20"
                >
                  Close
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}