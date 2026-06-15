import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/app/student/profile/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update ProfileData interface
content = content.replace(
    "  studentId: string;\n}",
    "  studentId: string;\n  specialization: string;\n  industrySector: string;\n  workExperience: any[];\n  educationHistory: any[];\n}"
)

# 2. Update initial formData
content = content.replace(
    "    studentId: '',\n  });",
    "    studentId: '',\n    specialization: '',\n    industrySector: '',\n    workExperience: [],\n    educationHistory: [],\n  });"
)

# 3. Update loadUserProfile query
content = content.replace(
    "profiles ( phone, bio, university, major, graduation_year )",
    "profiles ( phone, bio, university, major, graduation_year, specialization, industry_sector, work_experience, education_history )"
)

# 4. Update loadUserProfile setFormData
content = content.replace(
    "            graduationYear: profile?.graduation_year || '',\n          });",
    "            graduationYear: profile?.graduation_year || '',\n            specialization: profile?.specialization || '',\n            industrySector: profile?.industry_sector || '',\n            workExperience: Array.isArray(profile?.work_experience) ? profile.work_experience : typeof profile?.work_experience === 'string' ? JSON.parse(profile.work_experience) : [],\n            educationHistory: Array.isArray(profile?.education_history) ? profile.education_history : typeof profile?.education_history === 'string' ? JSON.parse(profile.education_history) : [],\n          });"
)

# 5. Update supabase update 'profiles'
content = content.replace(
    "          graduation_year: formData.graduationYear\n        });",
    "          graduation_year: formData.graduationYear,\n          specialization: formData.specialization,\n          industry_sector: formData.industrySector,\n          work_experience: formData.workExperience,\n          education_history: formData.educationHistory\n        });"
)

# 6. Add handlers
functions = """
  const addWorkExperience = () => {
    setFormData({ ...formData, workExperience: [...formData.workExperience, { title: '', company: '', start_date: '', end_date: '', current: false, description: '' }] });
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updated = [...formData.workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, workExperience: updated });
  };

  const removeWorkExperience = (index: number) => {
    const updated = formData.workExperience.filter((_, i) => i !== index);
    setFormData({ ...formData, workExperience: updated });
  };

  const addEducation = () => {
    setFormData({ ...formData, educationHistory: [...formData.educationHistory, { school: '', degree: '', field: '', start_year: '', end_year: '' }] });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updated = [...formData.educationHistory];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, educationHistory: updated });
  };

  const removeEducation = (index: number) => {
    const updated = formData.educationHistory.filter((_, i) => i !== index);
    setFormData({ ...formData, educationHistory: updated });
  };
"""
content = content.replace("  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {", functions + "\n  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {")


ui_addition = """
                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Professional Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                      <select name="specialization" value={formData.specialization} onChange={handleChange} disabled={!isEditing} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50">
                        <option value="">Select Specialization...</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Business Administration">Business Administration</option>
                        <option value="Education">Education</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Arts & Humanities">Arts & Humanities</option>
                        <option value="Sciences">Sciences</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry Sector</label>
                      <select name="industrySector" value={formData.industrySector} onChange={handleChange} disabled={!isEditing} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50">
                        <option value="">Select Industry...</option>
                        <option value="Technology">Technology</option>
                        <option value="Finance & Banking">Finance & Banking</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Government">Government</option>
                        <option value="Retail">Retail</option>
                        <option value="Media">Media</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Work Experience</h2>
                    {isEditing && (
                      <button type="button" onClick={addWorkExperience} className="text-sm text-[#06B4C9] hover:underline">+ Add Experience</button>
                    )}
                  </div>
                  {formData.workExperience.map((exp, index) => (
                    <div key={index} className="mb-4 pb-4 border-b border-gray-100 last:mb-0 last:pb-0 last:border-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                          <input type="text" value={exp.title} onChange={e => updateWorkExperience(index, 'title', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                          <input type="text" value={exp.company} onChange={e => updateWorkExperience(index, 'company', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                          <input type="month" value={exp.start_date} onChange={e => updateWorkExperience(index, 'start_date', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                          <div className="flex gap-2 items-center">
                            <input type="month" value={exp.end_date} onChange={e => updateWorkExperience(index, 'end_date', e.target.value)} disabled={!isEditing || exp.current}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                            <label className="flex items-center gap-1 text-xs text-gray-600">
                              <input type="checkbox" checked={exp.current} onChange={e => updateWorkExperience(index, 'current', e.target.checked)} disabled={!isEditing} /> Present
                            </label>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <textarea value={exp.description} onChange={e => updateWorkExperience(index, 'description', e.target.value)} disabled={!isEditing} rows={2}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => removeWorkExperience(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {formData.workExperience.length === 0 && <p className="text-sm text-gray-500">No work experience added.</p>}
                </div>
"""
content = content.replace("                {/* Education */}", ui_addition + "\n                {/* Education */}")

# Replace Zod schema requirement for university
content = content.replace('university: z.string().min(2, "University name is required"),', 'university: z.string().optional().or(z.literal("")),')

edu_addition = """
                <div className={`bg-white rounded-xl border p-5 mb-4 transition-all ${isEditing ? 'border-[#06B4C9]' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Education History</h2>
                    {isEditing && (
                      <button type="button" onClick={addEducation} className="text-sm text-[#06B4C9] hover:underline">+ Add Education</button>
                    )}
                  </div>
                  {formData.educationHistory.map((edu, index) => (
                    <div key={index} className="mb-4 pb-4 border-b border-gray-100 last:mb-0 last:pb-0 last:border-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">School / University</label>
                          <input type="text" value={edu.school} onChange={e => updateEducation(index, 'school', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Degree</label>
                          <input type="text" value={edu.degree} onChange={e => updateEducation(index, 'degree', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Field of Study</label>
                          <input type="text" value={edu.field} onChange={e => updateEducation(index, 'field', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Start Year</label>
                          <input type="text" placeholder="YYYY" value={edu.start_year} onChange={e => updateEducation(index, 'start_year', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">End Year</label>
                          <input type="text" placeholder="YYYY" value={edu.end_year} onChange={e => updateEducation(index, 'end_year', e.target.value)} disabled={!isEditing}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#06B4C9] outline-none disabled:bg-gray-50" />
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => removeEducation(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {formData.educationHistory.length === 0 && <p className="text-sm text-gray-500">No education history added.</p>}
                </div>
"""

# Replace old Education section with the new one
content = re.sub(r'\{\/\* Education \*\/}.*?(?=\{\/\* \=\=\= PREFERENCES TAB \=\=\= \*\/})', edu_addition + """
                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mb-4">
                    <button type="button" onClick={handleCancel} className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                    <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-2 bg-[#06B4C9] text-white rounded-lg hover:bg-[#06B4C9]/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            )}

            """, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(content)
print("done")
