import { getMarketData } from '../data/market-provider'; 
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Parse CLI arguments for GitHub Actions manual triggers
const args = process.argv.slice(2);
const manualKeyword = args.find(arg => arg.startsWith('--keyword='))?.split('=')[1];

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runDailyUpdate() {
  console.log(`📅 Starting Market Update: ${new Date().toISOString()}`);

  let skillsToTrack: string[] = [];

  // 1. Check for Manual Override (Flexibility for specific re-scans)
  if (manualKeyword && manualKeyword !== "''" && manualKeyword !== "") {
    console.log(`🎯 Manual trigger detected for: "${manualKeyword}"`);
    skillsToTrack = [manualKeyword];
  } else {
    // 2. Auto-Discovery: Combine monitored keywords + organic skills from W3C credentials
    console.log("🔍 Discovering skills from database...");
    
    const [monitoredRes, credentialRes] = await Promise.all([
      supabase.from('monitored_keywords').select('keyword').eq('is_active', true),
      supabase.from('verified_credentials').select('skill_name')
    ]);

    const monitored = monitoredRes.data?.map(k => k.keyword) || [];
    const fromCredentials = credentialRes.data?.map(c => c.skill_name) || [];

    // Deduplicate to save API credits
    skillsToTrack = Array.from(new Set([...monitored, ...fromCredentials]));
  }

  if (skillsToTrack.length === 0) {
    console.warn("⚠️ No skills found to track. Update your monitored_keywords table.");
    return;
  }

  console.log(`📋 Processing ${skillsToTrack.length} unique skills...`);

  for (const skill of skillsToTrack) {
    try {
      console.log(`\n🔍 Fetching Intelligence: ${skill}`);
      
      // Use the Provider Layer instead of calling the client directly
      const intelligence = await getMarketData(skill, 'us'); 

      // 3. Store in metadata (JSONB) for W3C-style flexibility
      const { error } = await supabase
        .from('market_snapshots')
        .insert({
          skill_name: skill,
          job_count: intelligence.count,
          data_source: 'adzuna',
          recorded_at: new Date().toISOString(),
          metadata: {
            ...intelligence.raw,
            average_salary: intelligence.mean_salary || null,
            top_locations: intelligence.locations || []
          }
        });

      if (error) {
        console.error(`   ❌ DB Error for ${skill}:`, error.message);
      } else {
        console.log(`   ✅ Recorded: ${intelligence.count} jobs for ${skill}`);
      }

      // 4. Rate Limiting: Be kind to the free-tier API
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      console.error(`   ⚠️ Failed to update ${skill}`, err);
    }
  }

  console.log("\n✨ Daily Update Complete!");
}

// Global catch for script-level failures (notifies GitHub Actions)
runDailyUpdate().catch(err => {
  console.error("💀 Fatal script failure:", err);
  process.exit(1);
});