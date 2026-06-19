import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/app/student/cvr/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update the supabase profile fetch
content = content.replace(
    ".select('phone, major, bio, linkedin_url')",
    ".select('phone, major, bio, linkedin_url, specialization, industry_sector, work_experience, education_history')"
)

# 2. Update the dbData definition and add mapping
dbData_replacement = """        const rawWork = Array.isArray(profileRecord?.work_experience) ? profileRecord.work_experience : typeof profileRecord?.work_experience === 'string' ? JSON.parse(profileRecord.work_experience) : [];
        const mappedWork = rawWork.map((w: any) => ({
          title: w.title || '',
          company: w.company || '',
          dates: w.current ? `${w.start_date || ''} - Present` : `${w.start_date || ''} - ${w.end_date || ''}`,
          description: w.description || ''
        }));
        
        const rawEdu = Array.isArray(profileRecord?.education_history) ? profileRecord.education_history : typeof profileRecord?.education_history === 'string' ? JSON.parse(profileRecord.education_history) : [];
        const mappedEdu = rawEdu.map((e: any) => ({
          school: e.school || '',
          degree: `${e.degree || ''} ${e.field || ''}`.trim(),
          location: '',
          year: e.start_year && e.end_year ? `${e.start_year} - ${e.end_year}` : e.end_year || e.start_year || '',
          honors: ''
        }));

        const dbData = {
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.specialization || profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || '',
          experience: mappedWork,
          education: mappedEdu,
        };"""
content = re.sub(
    r'const dbData = \{[\s\S]*?portfolio: profileRecord\?\.linkedin_url \|\| \'\',\s*\};',
    dbData_replacement,
    content
)

# 3. Remove EducationSection and ExperienceSection from JSX
content = re.sub(
    r'<EducationSection[\s\S]*?onUpdate=\{\(i, f, v\) => updateItem\(\'education\', i, f, v\)\}\s*/>',
    '{/* Education section removed, display-only from profile */}',
    content
)

content = re.sub(
    r'<ExperienceSection[\s\S]*?onUpdate=\{\(i, f, v\) => updateItem\(\'experience\', i, f, v\)\}\s*/>',
    '{/* Experience section removed, display-only from profile */}',
    content
)

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
