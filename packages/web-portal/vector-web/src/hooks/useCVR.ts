import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchWalletSkillNames } from '@/lib/blockchain';
import { resumeSchema, SkillItem, CVRData, CVREducation, CVRExperience, CVRProject, CVRCertification, CVRAward } from '@/lib/schemas/cvr';

// Type for the dynamic section fields
type CVRFormSection = CVREducation | CVRExperience | CVRProject | CVRCertification | CVRAward;

export function useCVR() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [availableCertifications, setAvailableCertifications] = useState<Record<string, unknown>[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  
  // UI States
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<CVRData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form Data State (Exact match to your original)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    linkedin: '',
    title: '',
    summary: '',
    education: [] as CVREducation[],
    experience: [] as CVRExperience[],
    projects: [] as CVRProject[],
    certifications: [] as CVRCertification[],
    awards: [] as CVRAward[],
  });

  // --- Fetching Logic ---
  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, wallet_address')
          .eq('id', session.user.id)
          .single();

        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('phone, major, bio, linkedin_url')
          .eq('id', session.user.id)
          .maybeSingle();

        setFormData(prev => ({
          ...prev,
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || ''
        }));

        if (userRecord?.wallet_address) {
          // eslint-disable-next-line react-hooks/immutability
          await fetchVerifiedSkills(userRecord.wallet_address);
        }

        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (certs) setAvailableCertifications(certs);

      } catch (error) {
        console.error("CVR Data Error:", error);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  const fetchVerifiedSkills = async (walletAddress: string) => {
    try {
      const foundSkills: SkillItem[] = (await fetchWalletSkillNames(walletAddress)).map((skillName, index) => ({
        id: `chain-${skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
        name: skillName,
        verified: true,
      }));
      setAvailableSkills(foundSkills);
      setSelectedSkillIds(foundSkills.map(s => s.id));
    } catch (error) {
      console.error("Blockchain Scan Failed:", error);
    }
  };

  // --- Handlers ---
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
        setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const updateItem = (section: keyof typeof formData, index: number, field: string, value: string) => {
    setFormData((prev: typeof formData) => {
      const newItems = [...prev[section]] as Record<string, unknown>[]; // Safe cast to array for mutation
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, [section]: newItems };
    });
  };

  const removeItem = (section: keyof typeof formData, index: number) => {
    setFormData((prev: typeof formData) => ({
      ...prev, [section]: (prev[section] as unknown[]).filter((_, i: number) => i !== index)
    }));
  };

  const addItem = (section: keyof typeof formData, item: CVRFormSection) => {
    setFormData((prev: typeof formData) => ({ ...prev, [section]: [...(prev[section] as unknown[]), item] }));
  };

  // Skill Handlers
  const handleSkillToggle = (skillId: string) => {
    setSelectedSkillIds(prev => prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]);
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim()) {
      const newId = `custom-${Date.now()}`;
      setAvailableSkills(prev => [...prev, { id: newId, name: customSkill, verified: false }]);
      setSelectedSkillIds(prev => [...prev, newId]);
      setCustomSkill('');
    }
  };

  const handleAddVerifiedCertification = (cert: { skill_name: string; issued_at: string }) => {
    const exists = formData.certifications.some((c: CVRCertification) => c.name === cert.skill_name && c.verified);
    if (exists) return;
    addItem('certifications', {
      name: cert.skill_name,
      issuer: 'Vector University (Blockchain Verified)',
      date: new Date(cert.issued_at).toLocaleDateString(),
      verified: true
    });
  };

  // Generation Handler
  const validateAndGenerate = (selectedTemplate: string, selectedColor: string) => {
    setErrors({});
    const validation = resumeSchema.safeParse(formData);

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        if (issue.path[0]) newErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(newErrors);
      alert("Please fix the errors in the form before generating.");
      return false;
    }

    const finalSkills = availableSkills.filter(s => selectedSkillIds.includes(s.id));
    const sanitizeArray = (arr: Record<string, unknown>[]) => arr.filter(item => Object.values(item).some((v: unknown) => v !== null && v !== undefined && String(v).trim() !== ''));

    const cvrData = {
        ...formData,
        education: sanitizeArray(formData.education as Record<string, unknown>[]),
        experience: sanitizeArray(formData.experience as Record<string, unknown>[]),
        projects: sanitizeArray(formData.projects as Record<string, unknown>[]),
        certifications: sanitizeArray(formData.certifications as Record<string, unknown>[]),
        awards: sanitizeArray(formData.awards as Record<string, unknown>[]),
        skills: finalSkills,
        generatedAt: new Date().toISOString(),
        template: selectedTemplate,
        color: selectedColor,
    };

    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    localStorage.setItem('pendingCVR', 'true');
    setGeneratedData(cvrData);
    setIsGenerated(true);
    return true;
  };

  const resetGenerator = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setSelectedSkillIds(availableSkills.filter(s => s.verified).map(s => s.id));
  };

  return {
    loading, formData, errors, availableSkills, selectedSkillIds, customSkill, availableCertifications, isGenerated, generatedData,
    setCustomSkill, handleChange, updateItem, removeItem, addItem, handleSkillToggle, handleAddCustomSkill, handleAddVerifiedCertification, validateAndGenerate, resetGenerator
  };
}