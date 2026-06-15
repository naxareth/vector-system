import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/src/app/student/dashboard/page.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add topSkills state
content = content.replace(
    "const [activities, setActivities] = useState<ActivityItem[]>([]);",
    "const [activities, setActivities] = useState<ActivityItem[]>([]);\n  const [topSkills, setTopSkills] = useState<{name: string, job_count: number}[]>([]);"
)

# Add fetch logic in initDashboard
fetch_logic = """
          const { data: cvrExports } = await supabase
            .from('cvr_exports')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);
          if (cvrExports && cvrExports.length > 0) setHasCVRExport(true);

          const { data: skillsData } = await supabase
            .from('skill_health_cache')
            .select('skill_name, job_count')
            .order('job_count', { ascending: false })
            .limit(10);
          
          if (skillsData) {
            setTopSkills(skillsData.map(s => ({ name: s.skill_name, job_count: s.job_count || 0 })));
          }
"""
content = content.replace("""          const { data: cvrExports } = await supabase
            .from('cvr_exports')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1);
          if (cvrExports && cvrExports.length > 0) setHasCVRExport(true);""", fetch_logic)

# Insert the Top In-Demand Skills UI after Skill Health Trends
ui_addition = """
          {/* ── Top In-Demand Skills ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top In-Demand Skills <HelpTip text="The most sought-after skills across the job market right now, based on live job posting data." />
            </h3>
            <div className="space-y-3">
              {topSkills.length > 0 ? (
                (() => {
                  const maxCount = Math.max(...topSkills.map(s => s.job_count), 1);
                  return topSkills.map(skill => (
                    <div key={skill.name} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-32 truncate font-medium">{skill.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-[#06B4C9] h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${(skill.job_count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right font-medium">{skill.job_count.toLocaleString()} jobs</span>
                    </div>
                  ));
                })()
              ) : (
                <div className="py-4 text-center">
                   <p className="text-sm text-gray-500">Loading market data...</p>
                </div>
              )}
            </div>
          </div>
"""

# We'll replace the closing div of "Skill Health Trends" to insert this after it.
# The Skill Health Trends block ends with:
#             )}
#           </div>
#
#           {/* ── Pending CVR Banner ── */}
# I will replace `{/* ── Pending CVR Banner ── */}` with the new block + `{/* ── Pending CVR Banner ── */}`.

content = content.replace("{/* ── Pending CVR Banner ── */}", ui_addition + "\n          {/* ── Pending CVR Banner ── */}")

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
