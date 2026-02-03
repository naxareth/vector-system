import { fetchJobMarketData } from '../data/jsearch-client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runDailyUpdate() {
  console.log(`📅 Starting Daily Job Market Update: ${new Date().toISOString()}`);

  // 1. 🚀 FETCH DYNAMIC SKILLS FROM DB
  // We only get skills marked as 'is_active'
  const { data: keywords, error: fetchError } = await supabase
    .from('monitored_keywords')
    .select('keyword')
    .eq('is_active', true);

  if (fetchError || !keywords) {
    console.error("❌ Failed to fetch keywords from DB:", fetchError);
    return;
  }

  const skillsToTrack = keywords.map(k => k.keyword);
  console.log(`📋 Found ${skillsToTrack.length} skills to track:`, skillsToTrack.join(', '));

  // 2. Iterate and Update
  for (const skill of skillsToTrack) {
    try {
      console.log(`\n🔍 Checking market for: ${skill}...`);
      
      // Fetch real job data
      const jobs = await fetchJobMarketData(skill);
      const liveCount = jobs.length;

      // Insert record
      const { error } = await supabase
        .from('market_snapshots')
        .insert({
          skill_name: skill,
          job_count: liveCount,
          data_source: 'jsearch',
          recorded_at: new Date().toISOString()
        });

      if (error) {
        console.error(`   ❌ DB Error for ${skill}:`, error.message);
      } else {
        console.log(`   ✅ Recorded: ${liveCount} jobs for ${skill}`);
      }

      // Pause to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      console.error(`   ⚠️ Failed to update ${skill}`, err);
    }
  }

  console.log("\n✨ Daily Update Complete!");
}

runDailyUpdate();