import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchWalletSkillNames } from '@/lib/blockchain';
import { resumeSchema, SkillItem } from '@/lib/schemas/cvr';

export function useCVR() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  
  // UI States
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
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
    education: [] as any[],
    experience: [] as any[],
    projects: [] as any[],
    certifications: [] as any[],
    awards: [] as any[],
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
    setFormData((prev: any) => {
      const newItems = [...prev[section]];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, [section]: newItems };
    });
  };

  const removeItem = (section: keyof typeof formData, index: number) => {
    setFormData((prev: any) => ({
      ...prev, [section]: prev[section].filter((_: any, i: number) => i !== index)
    }));
  };

  const addItem = (section: keyof typeof formData, item: any) => {
    setFormData((prev: any) => ({ ...prev, [section]: [...prev[section], item] }));
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

  const handleAddVerifiedCertification = (cert: any) => {
    const exists = formData.certifications.some((c: any) => c.name === cert.skill_name && c.verified);
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
    const sanitizeArray = (arr: any[]) => arr.filter(item => Object.values(item).some((v: any) => v !== null && v !== undefined && String(v).trim() !== ''));

    const cvrData = {
        ...formData,
        education: sanitizeArray(formData.education),
        experience: sanitizeArray(formData.experience),
        projects: sanitizeArray(formData.projects),
        certifications: sanitizeArray(formData.certifications),
        awards: sanitizeArray(formData.awards),
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