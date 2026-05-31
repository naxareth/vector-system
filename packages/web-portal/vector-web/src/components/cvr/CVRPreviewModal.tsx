'use client';
import { useRef } from 'react';

import { CVRData, CVREducation, CVRExperience, CVRProject, CVRCertification, CVRAward, SkillItem } from '@/lib/schemas/cvr';

interface CVRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isGenerating: boolean;
  data: CVRData | null;
}

/* ── Inline color tokens (hex only — avoids lab() issues with html2canvas) ── */
const C = {
  white: '#ffffff',
  black: '#111827',
  gray: '#4b5563',
  lightGray: '#f9fafb',
  border: '#e5e7eb',
  purple: '#9333ea',
  purpleLight: '#f3e8ff',
  greenText: '#15803d',
  greenBg: '#dcfce7',
  s700: '#334155',
  s600: '#475569',
  s500: '#64748b',
  s400: '#94a3b8',
  s300: '#cbd5e1',
  s200: '#e2e8f0',
  s100: '#f1f5f9',
};

/* ======================================================================== */
/*  PROFESSIONAL TEMPLATE                                                    */
/* ======================================================================== */
function ProfessionalTemplate({ d }: { d: CVRData }) {
  const accent = d.color || C.purple;
  return (
    <div style={{ padding: '36px 40px', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${accent}`, paddingBottom: '14px', marginBottom: '14px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: C.black, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
          {d.fullName}
        </h1>
        {d.title && <p style={{ fontSize: '14px', color: accent, fontWeight: 500, margin: 0, letterSpacing: '0.01em' }}>{d.title}</p>}
      </div>

      {/* Contact */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: C.gray, marginBottom: '16px' }}>
        {d.email && <div><span style={{ fontWeight: 700, color: C.black, marginRight: '4px' }}>Email:</span>{d.email}</div>}
        {d.phone && <div><span style={{ fontWeight: 700, color: C.black, marginRight: '4px' }}>Phone:</span>{d.phone}</div>}
        {d.portfolio && <div><span style={{ fontWeight: 700, color: C.black, marginRight: '4px' }}>Website:</span>{d.portfolio}</div>}
        {d.linkedin && <div><span style={{ fontWeight: 700, color: C.black, marginRight: '4px' }}>LinkedIn:</span>{d.linkedin}</div>}
      </div>

      {/* Summary */}
      {d.summary && (
        <Section title="Professional Summary" accent={accent}>
          <p style={{ color: C.gray, lineHeight: 1.65, fontSize: '11px', margin: 0, fontWeight: 400 }}>{d.summary}</p>
        </Section>
      )}

      {/* Education */}
      {(d.education?.length ?? 0) > 0 && (
        <Section title="Education" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {d.education?.map((edu: CVREducation, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.black, fontSize: '13px' }}>{edu.degree}</div>
                  <div style={{ color: C.gray, fontSize: '11px', fontWeight: 400 }}>{edu.school}{edu.location ? `, ${edu.location}` : ''}</div>
                  {edu.honors && <div style={{ fontStyle: 'italic', fontSize: '10.5px', color: C.gray, fontWeight: 400 }}>{edu.honors}</div>}
                </div>
                <div style={{ fontWeight: 700, color: accent, fontSize: '11px', flexShrink: 0 }}>{edu.year}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {(d.experience?.length ?? 0) > 0 && (
        <Section title="Experience" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {d.experience?.map((exp: CVRExperience, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <div style={{ fontWeight: 700, color: C.black, fontSize: '13px' }}>{exp.title}</div>
                  <div style={{ fontWeight: 600, color: accent, fontSize: '11px', flexShrink: 0 }}>{exp.dates}</div>
                </div>
                <div style={{ fontWeight: 600, color: C.gray, fontSize: '11px', marginBottom: '3px' }}>{exp.company}</div>
                {exp.description && <p style={{ color: C.gray, fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0, fontWeight: 400 }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {(d.projects?.length ?? 0) > 0 && (
        <Section title="Projects" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {d.projects?.map((proj: CVRProject, i: number) => (
              <div key={i} style={{ backgroundColor: C.lightGray, padding: '10px 12px', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', background: accent }} />
                <div style={{ fontWeight: 700, color: C.black, fontSize: '12px', marginBottom: '2px' }}>{proj.title}</div>
                <div style={{ fontSize: '11px', color: C.gray, marginBottom: '3px', fontWeight: 400, lineHeight: 1.5 }}>{proj.description}</div>
                {proj.technologies && <div style={{ fontSize: '10px', color: C.s600, fontWeight: 500 }}><strong style={{ fontWeight: 700 }}>Tech:</strong> {proj.technologies}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {(d.certifications?.length ?? 0) > 0 && (
        <Section title="Certifications" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {d.certifications?.map((cert: CVRCertification, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.black, fontSize: '12px' }}>{cert.name}</div>
                  {cert.issuer && <div style={{ fontSize: '11px', color: C.gray, marginTop: '1px', fontWeight: 400 }}>{cert.issuer}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: C.gray, fontWeight: 400 }}>{cert.date}</span>
                  {cert.verified && <span style={{ fontSize: '8px', fontWeight: 700, backgroundColor: C.greenBg, color: C.greenText, padding: '1px 5px', borderRadius: '3px' }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {(d.skills?.length ?? 0) > 0 && (
        <Section title="Competencies & Skills" accent={accent}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {d.skills?.map((skill: SkillItem, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: skill.verified ? C.greenBg : C.lightGray, borderRadius: '14px', border: `1px solid ${skill.verified ? C.greenText : C.border}` }}>
                <span style={{ fontWeight: 600, fontSize: '10px', color: skill.verified ? C.greenText : C.black }}>{skill.name}</span>
                {skill.verified && <span style={{ fontSize: '8px', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* Section heading helper for Professional */
function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '11px', fontWeight: 700, color: C.black, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${accent}`, paddingBottom: '4px', marginBottom: '10px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ======================================================================== */
/*  MODERN TEMPLATE                                                          */
/* ======================================================================== */
function ModernTemplate({ d }: { d: CVRData }) {
  const accent = d.color || C.s700;
  return (
    <div style={{ display: 'flex', minHeight: '100%', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: '35%', backgroundColor: accent, color: C.white, padding: '32px 22px' }}>
        {/* Profile */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 10px', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: C.s200, letterSpacing: '0.02em' }}>
            {d.fullName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: C.white, margin: '0 0 4px 0', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{d.fullName}</h1>
          {d.title && <p style={{ fontSize: '12px', color: C.s300, margin: 0, fontWeight: 400, letterSpacing: '0.01em' }}>{d.title}</p>}
        </div>

        {/* Contact */}
        {(d.email || d.phone || d.portfolio || d.linkedin) && (
          <SidebarSection title="Contact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {d.phone && <SidebarItem label="Phone" value={d.phone} />}
              {d.email && <SidebarItem label="Email" value={d.email} />}
              {d.portfolio && <SidebarItem label="Website" value={d.portfolio} />}
              {d.linkedin && <SidebarItem label="LinkedIn" value={d.linkedin} />}
            </div>
          </SidebarSection>
        )}

        {/* Education */}
        {(d.education?.length ?? 0) > 0 && (
          <SidebarSection title="Education">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px' }}>
              {d.education?.map((edu: CVREducation, i: number) => (
                <div key={i}>
                  <p style={{ fontWeight: 600, color: C.s300, margin: '0 0 2px 0' }}>{edu.year}</p>
                  <p style={{ fontWeight: 'bold', color: C.white, margin: '0 0 2px 0' }}>{edu.degree}</p>
                  <p style={{ color: C.s200, margin: 0 }}>{edu.school}</p>
                  {edu.location && <p style={{ color: C.s400, fontSize: '10px', margin: '2px 0 0 0' }}>{edu.location}</p>}
                </div>
              ))}
            </div>
          </SidebarSection>
        )}

        {/* Skills */}
        {(d.skills?.length ?? 0) > 0 && (
          <SidebarSection title="Expertise">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {d.skills?.map((skill: SkillItem, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '5px', height: '5px', backgroundColor: C.s400, borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: C.s200 }}>{skill.name}</span>
                  {skill.verified && <span style={{ fontSize: '8px', color: '#4ade80' }}>✓</span>}
                </div>
              ))}
            </div>
          </SidebarSection>
        )}

        {/* Certifications */}
        {(d.certifications?.length ?? 0) > 0 && (
          <SidebarSection title="Certifications">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              {d.certifications?.map((cert: CVRCertification, i: number) => (
                <div key={i}>
                  <p style={{ fontWeight: 'bold', color: C.white, margin: '0 0 2px 0' }}>{cert.name}</p>
                  {cert.issuer && <p style={{ color: C.s300, margin: 0 }}>{cert.issuer}</p>}
                  <p style={{ color: C.s400, fontSize: '10px', margin: '2px 0 0 0' }}>{cert.date}</p>
                  {cert.verified && <span style={{ fontSize: '9px', fontWeight: 'bold', backgroundColor: '#16a34a', color: C.white, padding: '1px 5px', borderRadius: '4px', marginTop: '3px', display: 'inline-block' }}>✓ Verified</span>}
                </div>
              ))}
            </div>
          </SidebarSection>
        )}
      </div>

      {/* Main Content */}
      <div style={{ width: '65%', padding: '32px 28px', backgroundColor: C.white }}>
        {d.summary && (
          <div style={{ marginBottom: '22px' }}>
            <p style={{ color: C.gray, lineHeight: 1.65, fontSize: '11px', textAlign: 'justify', margin: 0, fontWeight: 400 }}>{d.summary}</p>
          </div>
        )}

        {(d.experience?.length ?? 0) > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: C.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${C.s200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Experience</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {d.experience?.map((exp: CVRExperience, i: number) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: C.black, margin: 0, letterSpacing: '-0.01em' }}>{exp.title}</h4>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: C.s600, backgroundColor: C.s100, padding: '2px 8px', borderRadius: '10px', flexShrink: 0 }}>{exp.dates}</span>
                  </div>
                  <p style={{ color: C.gray, fontWeight: 600, fontSize: '11px', margin: '0 0 3px 0' }}>{exp.company}</p>
                  {exp.description && <p style={{ color: C.gray, fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0, fontWeight: 400 }}>{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(d.projects?.length ?? 0) > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: C.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${C.s200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Projects</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {d.projects?.map((proj: CVRProject, i: number) => (
                <div key={i} style={{ borderLeft: `3px solid ${C.s300}`, paddingLeft: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: C.black, margin: 0 }}>{proj.title}</h4>
                    {proj.role && <span style={{ fontSize: '9px', fontWeight: 600, color: C.s600, backgroundColor: C.s100, padding: '1px 6px', borderRadius: '4px' }}>{proj.role}</span>}
                  </div>
                  <p style={{ fontSize: '11px', color: C.gray, margin: '0 0 3px 0', lineHeight: 1.5, fontWeight: 400 }}>{proj.description}</p>
                  {proj.technologies && <p style={{ fontSize: '10px', color: C.s600, margin: 0, fontWeight: 500 }}><strong style={{ fontWeight: 700 }}>Tech:</strong> {proj.technologies}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(d.awards?.length ?? 0) > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 700, color: C.black, paddingBottom: '5px', marginBottom: '12px', borderBottom: `1px solid ${C.s200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Awards</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {d.awards?.map((award: CVRAward, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <div style={{ width: '5px', height: '5px', backgroundColor: C.s400, borderRadius: '50%', flexShrink: 0, marginTop: '5px' }} />
                  <div><strong style={{ fontSize: '12px', fontWeight: 700, color: C.black }}>{award.title}</strong><span style={{ fontSize: '11px', color: C.gray, fontWeight: 400 }}> — {award.description}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, color: C.black, paddingBottom: '5px', marginBottom: '10px', borderBottom: `1px solid ${C.s200}`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>References</h3>
          <p style={{ fontSize: '11px', color: C.gray, fontWeight: 400 }}>Available upon request.</p>
        </div>
      </div>
    </div>
  );
}

/* Sidebar sub-components */
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <h3 style={{ fontSize: '10px', fontWeight: 700, color: C.white, marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</h3>
      {children}
    </div>
  );
}

function SidebarItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontWeight: 700, color: C.s200, margin: '0 0 1px 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ color: C.s300, margin: 0, wordBreak: 'break-all', fontSize: '11px' }}>{value}</p>
    </div>
  );
}

/* ======================================================================== */
/*  SIMPLE TEMPLATE                                                          */
/* ======================================================================== */
function SimpleTemplate({ d }: { d: CVRData }) {
  return (
    <div style={{ padding: '32px', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: C.black, margin: 0, fontFamily: 'inherit' }}>{d.fullName}</h1>
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', color: C.gray, marginBottom: '4px', lineHeight: 1.4 }}>
        {[d.phone, d.email, d.portfolio, d.linkedin].filter(Boolean).join('  |  ')}
      </div>
      <hr style={{ border: 'none', borderTop: '1.5px solid #111827', margin: '8px 0 12px 0' }} />

      {d.summary && (
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic', lineHeight: 1.6, margin: 0, fontFamily: 'inherit' }}>{d.summary}</p>
        </div>
      )}

      {(d.experience?.length ?? 0) > 0 && (
        <SimpleSection title="Professional Experience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {d.experience?.map((exp: CVRExperience, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: C.black, textTransform: 'uppercase' }}>{exp.company}</span>
                  <span style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic' }}>{exp.dates}</span>
                </div>
                <p style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic', margin: '0 0 3px 0' }}>{exp.title}</p>
                {exp.description && (
                  <ul style={{ margin: '3px 0 0 0', paddingLeft: '16px' }}>
                    {exp.description.split('\n').filter((l: string) => l.trim()).map((line: string, j: number) => (
                      <li key={j} style={{ fontSize: '11px', color: C.black, lineHeight: 1.5, marginBottom: '1px', fontFamily: 'inherit' }}>
                        {line.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SimpleSection>
      )}

      {(d.projects?.length ?? 0) > 0 && (
        <SimpleSection title="Projects">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {d.projects?.map((proj: CVRProject, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: C.black, textTransform: 'uppercase' }}>{proj.title}</span>
                  {proj.role && <span style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic' }}>{proj.role}</span>}
                </div>
                <p style={{ fontSize: '11px', color: C.black, lineHeight: 1.5, margin: '2px 0' }}>{proj.description}</p>
                {proj.technologies && <p style={{ fontSize: '10px', color: C.gray, margin: 0 }}>Technologies: {proj.technologies}</p>}
              </div>
            ))}
          </div>
        </SimpleSection>
      )}

      {(d.education?.length ?? 0) > 0 && (
        <SimpleSection title="Education">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {d.education?.map((edu: CVREducation, i: number) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: C.black, textTransform: 'uppercase' }}>{edu.school}</span>
                  <span style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic' }}>{edu.location}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', color: C.black }}>{edu.degree}</span>
                  <span style={{ fontSize: '11px', color: C.gray, fontStyle: 'italic' }}>{edu.year}</span>
                </div>
                {edu.honors && <p style={{ fontSize: '11px', color: C.gray, margin: '2px 0 0 0' }}>Honors: {edu.honors}</p>}
              </div>
            ))}
          </div>
        </SimpleSection>
      )}

      {(d.certifications?.length ?? 0) > 0 && (
        <SimpleSection title="Certifications">
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {d.certifications?.map((cert: CVRCertification, i: number) => (
              <li key={i} style={{ fontSize: '11px', color: C.black, marginBottom: '2px', fontFamily: 'inherit' }}>
                <strong>{cert.name}</strong>{cert.issuer ? ` — ${cert.issuer}` : ''}{cert.date ? ` (${cert.date})` : ''}{cert.verified ? ' [Verified]' : ''}
              </li>
            ))}
          </ul>
        </SimpleSection>
      )}

      {(d.awards?.length ?? 0) > 0 && (
        <SimpleSection title="Awards">
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {d.awards?.map((award: CVRAward, i: number) => (
              <li key={i} style={{ fontSize: '11px', color: C.black, marginBottom: '2px', fontFamily: 'inherit' }}>
                <strong>{award.title}</strong> — {award.description}
              </li>
            ))}
          </ul>
        </SimpleSection>
      )}

      {(d.skills?.length ?? 0) > 0 && (
        <SimpleSection title="Additional Skills">
          <p style={{ fontSize: '11px', color: C.black, lineHeight: 1.5, margin: 0, fontFamily: 'inherit' }}>
            {d.skills?.map((s: SkillItem) => s.name).join(', ')}
          </p>
        </SimpleSection>
      )}
    </div>
  );
}

function SimpleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ fontSize: '11px', fontWeight: 700, color: C.black, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 2px 0', fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>{title}</h2>
      <hr style={{ border: 'none', borderTop: '0.5px solid #94a3b8', margin: '0 0 10px 0' }} />
      {children}
    </div>
  );
}

/* ======================================================================== */
/*  PREVIEW MODAL                                                            */
/* ======================================================================== */
export default function CVRPreviewModal({ isOpen, onClose, onConfirm, isGenerating, data }: CVRPreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const templateName = (data.template || 'professional').charAt(0).toUpperCase() + (data.template || 'professional').slice(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#131825] border-b border-gray-200 dark:border-[#1E2536] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">CVR Preview</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{templateName} template • Review before generating</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#283042] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Back to Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isGenerating}
            className="px-5 py-2 text-sm font-semibold !text-white bg-[#06B4C9] hover:bg-[#06B4C9]/80 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm & Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Scrollable A4 Preview ───────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-8 px-4" style={{ background: '#e5e7eb' }}>
        <div className="mx-auto" style={{ width: '210mm', maxWidth: '100%' }}>
          {/* Paper */}
          <div
            className="bg-white shadow-xl mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            {data.template === 'modern' ? (
              <ModernTemplate d={data} />
            ) : data.template === 'simple' ? (
              <SimpleTemplate d={data} />
            ) : (
              <ProfessionalTemplate d={data} />
            )}
          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-gray-500 mt-4 mb-2">
            This is a preview. Click <strong>Confirm & Generate</strong> to save and export your CVR.
          </p>
        </div>
      </div>
    </div>
  );
}
