import { fetchJobCount } from '../data/adzuna-client'; 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runDailyUpdate() {
  console.log(`📅 Starting Daily Job Market Update (via Adzuna): ${new Date().toISOString()}`);

  const { data: keywords, error: fetchError } = await supabase
    .from('monitored_keywords')
    .select('keyword')
    .eq('is_active', true);

  if (fetchError || !keywords) {
    console.error("❌ Failed to fetch keywords:", fetchError);
    return;
  }

  const skillsToTrack = keywords.map(k => k.keyword);
  console.log(`📋 Tracking ${skillsToTrack.length} skills:`, skillsToTrack.join(', '));

  for (const skill of skillsToTrack) {
    try {
      console.log(`\n🔍 Checking Adzuna for: ${skill}...`);
      
      // 🚀 CHANGED: Fetch count directly
      const liveCount = await fetchJobCount(skill, 'ph'); 

      const { error } = await supabase
        .from('market_snapshots')
        .insert({
          skill_name: skill,
          job_count: liveCount,
          data_source: 'adzuna', // 🚀 Update source label
          recorded_at: new Date().toISOString()
        });

      if (error) {
        console.error(`   ❌ DB Error for ${skill}:`, error.message);
      } else {
        console.log(`   ✅ Recorded: ${liveCount} jobs for ${skill}`);
      }

      // Adzuna allows ~1 call per second on free tier
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (err) {
      console.error(`   ⚠️ Failed to update ${skill}`, err);
    }
  }

  console.log("\n✨ Daily Update Complete!");
}

runDailyUpdate();