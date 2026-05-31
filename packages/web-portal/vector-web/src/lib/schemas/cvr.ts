import { z } from 'zod';

export interface SkillItem {
  id: string;
  name: string;
  verified: boolean;
}

export interface CVREducation { degree?: string; school?: string; location?: string; year?: string; honors?: string; }
export interface CVRExperience { title?: string; company?: string; dates?: string; description?: string; }
export interface CVRProject { title?: string; description?: string; technologies?: string; role?: string; }
export interface CVRCertification { name?: string; issuer?: string; date?: string; verified?: boolean; }
export interface CVRAward { title?: string; description?: string; }

export const resumeSchema = z.object({
  fullName: z.string().min(2, "Full Name is required (min 2 chars)"),
  title: z.string().min(2, "Professional Title is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal('')),
  linkedin: z.string().url("Must be a valid URL (https://...)").optional().or(z.literal('')),
  portfolio: z.string().url("Must be a valid URL (https://...)").optional().or(z.literal('')),
  summary: z.string().max(600, "Summary must be under 600 characters").optional(),
  
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string().optional(),
    location: z.string().optional(),
    year: z.string().optional(),
    honors: z.string().optional(),
  })).optional(),
  
  experience: z.array(z.object({
    title: z.string().optional(),
    company: z.string().optional(),
    dates: z.string().optional(),
    description: z.string().optional(),
  })).optional(),

  projects: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    technologies: z.string().optional(),
    role: z.string().optional(),
  })).optional(),

  certifications: z.array(z.object({
    name: z.string().optional(),
    issuer: z.string().optional(),
    date: z.string().optional(),
    verified: z.boolean().optional(),
  })).optional(),

  awards: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});

export type CVRFormData = z.infer<typeof resumeSchema>;

export interface CVRData extends Partial<CVRFormData> {
  generatedAt?: string;
  color?: string;
  template?: string;
  credentialId?: string;
  isCvrExport?: boolean;
  skills?: SkillItem[];
  education?: CVREducation[];
  experience?: CVRExperience[];
  projects?: CVRProject[];
  certifications?: CVRCertification[];
  awards?: CVRAward[];
}