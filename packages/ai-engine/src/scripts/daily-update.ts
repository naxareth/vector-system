import { getMarketData } from '../data/market-provider';
import { extractSkillsFromCredential } from '../nlp/skill-extractor';
import { genAI } from '../nlp/gemini-client';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import dotenv from 'dotenv';
dotenv.config();

// Parse CLI arguments for GitHub Actions manual triggers
const args = process.argv.slice(2);
const manualKeyword = args.find(arg => arg.startsWith('--keyword='))?.split('=')[1];

// ---------------------------------------------------------------------------
// --with-gemini flag
//
// By default the daily cron runs WITHOUT any Gemini calls so it never hits
// the free-tier RPD quota (20 req/day). Gemini is only used for:
//   1. W3C credential skill extraction (extractSkillsFromCredential)
//   2. Related skill expansion (expandToRelatedSkills)
//
// Pass --with-gemini explicitly to enable these features:
//   npm run daily-update -- --with-gemini
//   (or use the "daily-update:full" package.json script)
//
// In GitHub Actions, add --with-gemini to the run command only on the
// weekly/manual workflow, not the daily one.
// ---------------------------------------------------------------------------
const withGemini = args.includes('--with-gemini');

if (withGemini) {
  console.log('🤖 Gemini mode: ENABLED (W3C sync + skill expansion will run)');
} else {
  console.log('⚡ Gemini mode: DISABLED (Adzuna-only run — no quota consumed)');
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ---------------------------------------------------------------------------
// Concurrency config
// ---------------------------------------------------------------------------
// Max 3 simultaneous Adzuna API calls — safe for the free tier and well within
// GitHub Actions runner limits. Raise to 5 only if Adzuna confirms higher quota.
const CONCURRENCY_LIMIT = 3;

// Courtesy delay between each completed task (ms) — prevents burst-spamming
// Adzuna even when slots free up at the same instant.
const INTER_TASK_DELAY_MS = 500;

/**
 * Asks Gemini to suggest related job-market skills for a given extracted skill.
 * e.g. "React" → ["Vue.js", "Angular", "Svelte", "Next.js", "TypeScript"]
 *
 * This gives the AI a broader market picture — not just what students have,
 * but the surrounding ecosystem so gap analysis is meaningful.
 *
 * Only called when --with-gemini is passed. Never called in standard daily runs.
 */
async function expandToRelatedSkills(skill: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are a job market analyst for a tech credentialing platform.
      
      Given the skill: "${skill}"
      
      Return a JSON object with a "related" array of 3-5 closely related, 
      in-demand job-market skills that employers frequently list alongside "${skill}".
      
      Rules:
      - Only include real, searchable tech/professional skills (not course titles or degrees)
      - Each skill must be 1-4 words max
      - Do not include "${skill}" itself
      - Return ONLY valid JSON, no markdown
      
      Example for "React": {"related": ["Vue.js", "TypeScript", "Next.js", "Angular", "Svelte"]}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return parsed.related || [];
  } catch (err) {
    console.error(`   ⚠️  Gemini expansion failed for "${skill}":`, err);
    return [];
  }
}

/**
 * PHASE 5 — W3C Skill Sync + Gemini Expansion
 *
 * Step 1: Extract constituent skills from W3C credentials via Gemini + JSON-LD schema
 * Step 2: For each extracted skill, ask Gemini to suggest related market skills
 * Step 3: Upsert all new skills into monitored_keywords
 *
 * Result: The market tracker automatically widens its scope as new credential
 * types are issued — no manual intervention required.
 *
 * NOTE: This section runs serially — Gemini calls are chained per-credential and
 * per-skill. p-limit is intentionally NOT applied here; the W3C sync is a one-shot
 * setup pass, not a high-volume loop. Parallelizing it would risk Gemini quota errors.
 *
 * QUOTA NOTE: Only runs when --with-gemini is passed. Each credential costs
 * 1 Gemini call for extraction + 1 per extracted skill for expansion.
 * Run this at most weekly to stay within free tier limits.
 */
async function syncExtractedSkillsToMonitored(): Promise<void> {
  console.log("\n🔗 W3C Sync: Extracting skills from verified credentials...");

  // 1. Fetch credentials that have W3C schema context
  const { data: credentials, error } = await supabase
    .from('verified_credentials')
    .select('id, skill_name, schema_url, credential_data')
    .not('schema_url', 'is', null)
    .not('credential_data', 'is', null);

  if (error || !credentials || credentials.length === 0) {
    console.log("   ℹ️  No W3C credentials with schema context found. Skipping sync.");
    return;
  }

  console.log(`   📄 Found ${credentials.length} W3C credential(s) to analyze...`);

  // 2. Load existing monitored keywords to avoid redundant upserts
  const { data: existingKeywords } = await supabase
    .from('monitored_keywords')
    .select('keyword');

  const existingSet = new Set(
    (existingKeywords || []).map(k => k.keyword.toLowerCase())
  );

  const toUpsert: { keyword: string; category: string; is_active: boolean }[] = [];

  // 3. Process each W3C credential
  for (const cred of credentials) {
    if (!cred.schema_url || cred.schema_url.includes('undefined')) continue;

    let absoluteSchemaUrl = cred.schema_url;
    if (absoluteSchemaUrl.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      absoluteSchemaUrl = `${baseUrl}${absoluteSchemaUrl}`;
    }

    try {
      // Step 1: Extract direct skills from the credential's W3C schema
      const extracted = await extractSkillsFromCredential(
        cred.credential_data as Record<string, any>,
        absoluteSchemaUrl
      );

      const novelDirect = extracted.filter(
        s => s.length > 1 && !existingSet.has(s.toLowerCase())
      );

      for (const skill of novelDirect) {
        toUpsert.push({ keyword: skill, category: 'w3c-extracted', is_active: true });
        existingSet.add(skill.toLowerCase());
      }

      if (novelDirect.length > 0) {
        console.log(`   ✨ "${cred.skill_name}" → extracted: ${novelDirect.join(', ')}`);
      }

      // Step 2: Gemini expansion — find related market skills for each extracted skill
      // Run for all extracted skills (not just novel ones) to catch related gaps
      for (const skill of extracted) {
        const related = await expandToRelatedSkills(skill);

        const novelRelated = related.filter(
          s => s.length > 1 && !existingSet.has(s.toLowerCase())
        );

        for (const relSkill of novelRelated) {
          toUpsert.push({ keyword: relSkill, category: 'auto-expanded', is_active: true });
          existingSet.add(relSkill.toLowerCase());
        }

        if (novelRelated.length > 0) {
          console.log(`   🔗 "${skill}" related → ${novelRelated.join(', ')}`);
        }
      }
    } catch (err) {
      console.error(`   ⚠️  Failed processing credential ${cred.id}:`, err);
    }
  }

  if (toUpsert.length === 0) {
    console.log("   ✅ No new skills to sync — monitored_keywords is up to date.");
    return;
  }

  // 4. Upsert all discovered + expanded skills
  const { error: upsertError } = await supabase
    .from('monitored_keywords')
    .upsert(toUpsert, { onConflict: 'keyword', ignoreDuplicates: true });

  if (upsertError) {
    console.error("   ❌ Failed to upsert skills:", upsertError.message);
  } else {
    const extracted = toUpsert.filter(r => r.category === 'w3c-extracted').length;
    const expanded = toUpsert.filter(r => r.category === 'auto-expanded').length;
    console.log(`   📥 Synced ${toUpsert.length} new skill(s): ${extracted} from W3C extraction, ${expanded} from Gemini expansion`);
  }
}

/**
 * Sanitizes raw skill_name values from verified_credentials.
 * Only applied to credential-derived skills — monitored_keywords are always trusted.
 */
function sanitizeCredentialSkill(raw: string): string | null {
  const trimmed = raw.trim();

  const academicStopwords = [
    'bachelor', 'master', 'associate', 'diploma', 'certificate',
    'bootcamp', 'boot camp', 'information technology', 'computer science',
    'bs ', 'ms ', 'bsit', 'bscs', 'course', 'program', 'degree',
    'full-stack', 'full stack', 'web development bootcamp', 'nursing',
  ];

  const lower = trimmed.toLowerCase();
  if (academicStopwords.some(stop => lower.includes(stop))) return null;
  if (trimmed.length > 40) return null;

  return trimmed;
}

/**
 * Fetches market intelligence for a single skill and writes it to market_snapshots.
 * Wrapped in a courtesy delay after completion so concurrent slots don't burst-fire.
 */
async function processSkill(skill: string): Promise<void> {
  try {
    console.log(`\n🔍 Fetching Intelligence: ${skill}`);

    const intelligence = await getMarketData(skill, 'us');

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
          top_locations: intelligence.locations || [],
        },
      });

    if (error) {
      console.error(`   ❌ DB Error for ${skill}:`, error.message);
    } else {
      console.log(`   ✅ Recorded: ${intelligence.count} jobs for ${skill}`);
    }
  } catch (err) {
    console.error(`   ⚠️ Failed to update ${skill}`, err);
  } finally {
    // Courtesy delay: applied regardless of success/failure so we don't burst
    // the next task immediately when this slot frees up.
    await new Promise(resolve => setTimeout(resolve, INTER_TASK_DELAY_MS));
  }
}

async function runDailyUpdate() {
  console.log(`📅 Starting Market Update: ${new Date().toISOString()}`);
  let skillsToTrack: string[] = [];

  // Manual override — bypass sync, trust the keyword as-is
  if (manualKeyword && manualKeyword !== "''" && manualKeyword !== "") {
    console.log(`🎯 Manual trigger detected for: "${manualKeyword}"`);
    skillsToTrack = [manualKeyword];
  } else {
    // W3C sync — only runs when --with-gemini flag is present
    // Skipped on standard daily runs to preserve free-tier Gemini quota
    if (withGemini) {
      await syncExtractedSkillsToMonitored();
    } else {
      console.log("\n⏭️  Skipping W3C sync (run with --with-gemini to enable)");
    }

    console.log("\n🔍 Building skills list from database...");

    const [monitoredRes, credentialRes] = await Promise.all([
      supabase.from('monitored_keywords').select('keyword').eq('is_active', true),
      supabase.from('verified_credentials').select('skill_name'),
    ]);

    const monitored = monitoredRes.data?.map(k => k.keyword) || [];

    const rawFromCredentials = credentialRes.data?.map(c => c.skill_name) || [];
    const cleanFromCredentials = rawFromCredentials
      .map(sanitizeCredentialSkill)
      .filter((s): s is string => s !== null);

    console.log(`   📌 Monitored keywords (including auto-discovered): ${monitored.length}`);
    console.log(`   🎓 Credential skills: ${rawFromCredentials.length} raw → ${cleanFromCredentials.length} usable`);

    skillsToTrack = Array.from(new Set([...monitored, ...cleanFromCredentials]));
  }

  if (skillsToTrack.length === 0) {
    console.warn("⚠️ No valid job-market skills to track. Seed the monitored_keywords table.");
    return;
  }

  console.log(`\n📋 Processing ${skillsToTrack.length} unique skills with concurrency limit of ${CONCURRENCY_LIMIT}...`);

  // ---------------------------------------------------------------------------
  // p-limit controlled batch processing
  // ---------------------------------------------------------------------------
  // Previously: serial for-loop with a flat 2000ms setTimeout per skill.
  //   → 100 skills × 2s = ~3.5 min minimum, wasted waiting even on fast responses.
  //
  // Now: up to CONCURRENCY_LIMIT skills run simultaneously.
  //   → Fast responses immediately free their slot for the next skill.
  //   → INTER_TASK_DELAY_MS (500ms) is applied per-task after completion,
  //     not as a global stall — so throughput scales with actual API speed.
  //   → Estimated time for 100 skills at avg 1.5s/call with concurrency 3:
  //     ~(100 / 3) × (1.5s + 0.5s) ≈ ~67s vs ~200s serial. ~3× faster.
  // ---------------------------------------------------------------------------
  const limit = pLimit(CONCURRENCY_LIMIT);

  const tasks = skillsToTrack.map(skill => limit(() => processSkill(skill)));

  await Promise.all(tasks);

  console.log("\n✨ Daily Update Complete!");
}

runDailyUpdate().catch(err => {
  console.error("💀 Fatal script failure:", err);
  process.exit(1);
});