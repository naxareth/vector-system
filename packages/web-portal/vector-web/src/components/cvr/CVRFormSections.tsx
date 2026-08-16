// Barrel export for all CVR form section components.
// Import from this file instead of individual component paths.

export { default as PersonalDetailsSection } from './PersonalDetailsSection';
export { default as EducationSection } from './EducationSection';
export { default as ExperienceSection } from './ExperienceSection';
export { default as ProjectsSection } from './ProjectsSection';
export { default as CertificationsSection } from './CertificationsSection';
export { default as VerifiedCertificationsBlock } from './VerifiedCertificationsBlock';
export { default as SkillsSection } from './SkillsSection';
export { default as TemplateSelector } from './TemplateSelector';
export { templateList } from './TemplateSelector';
export { default as LivePreviewPanel } from './LivePreviewPanel';

// Re-export shared types used across CVR components
export type { SkillItem } from './SkillsSection';