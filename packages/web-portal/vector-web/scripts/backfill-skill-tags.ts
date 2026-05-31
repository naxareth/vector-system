/**
 * One-time backfill script: populates skill_tags on existing verified_credentials
 * 
 * Strategy per credential:
 *   1. If credential_data has a 'skill_tags' or 'primary_skills' field → parse it directly
 *   2. Otherwise → ask the AI to infer skills from the credential title (skill_name)
 * 
 * Run from the web-portal root:
 *   npx ts-node --project tsconfig.json scripts/backfill-skill-tags.ts
 * 
 * Or with tsx (faster, no tsconfig needed):
 *   npx tsx scripts/backfill-skill-tags.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple AI inference via your existing /api/analyze endpoint is overkill here.
// Instead we use a static map for common credential titles, then fall back to
// a keyword extraction heuristic. Replace with an LLM call if you want richer results.
const KNOWN_SKILL_MAP: Record<string, string[]> = {
  // Degrees
  'bs information technology':     ['Information Technology', 'Systems Analysis', 'Networking', 'Database Management'],
  'bs nursing':                    ['Patient Care', 'Clinical Assessment', 'Medical Records', 'Healthcare'],
  'bs computer science':           ['Algorithms', 'Data Structures', 'Software Engineering', 'Python'],
  'bs computer engineering':       ['Embedded Systems', 'Circuit Design', 'C++', 'Hardware'],
  'bs business administration':    ['Business Management', 'Finance', 'Marketing', 'Operations'],

  // Bootcamps / courses
  'full-stack web development bootcamp': ['React', 'Node.js', 'Express', 'PostgreSQL', 'HTML', 'CSS', 'JavaScript'],
  'full stack web development bootcamp': ['React', 'Node.js', 'Express', 'PostgreSQL', 'HTML', 'CSS', 'JavaScript'],
  'react development':             ['React', 'JavaScript', 'TypeScript', 'JSX', 'State Management'],
  'python programming':            ['Python', 'Data Analysis', 'Scripting', 'Automation'],
  'data science bootcamp':         ['Python', 'Machine Learning', 'Pandas', 'Data Visualization', 'SQL'],
  'cybersecurity fundamentals':    ['Network Security', 'Penetration Testing', 'SIEM', 'Incident Response'],
  'ui/ux design':                  ['Figma', 'User Research', 'Prototyping', 'Wireframing'],
  'mobile development':            ['React Native', 'Flutter', 'iOS', 'Android', 'Swift'],
  'blockchain development':        ['Solidity', 'Ethereum', 'Smart Contracts', 'Web3.js'],

  // Events / hackathons — map to tech skills likely used
  'regional hackathon 2026':       ['Problem Solving', 'Rapid Prototyping', 'Teamwork', 'Presentation'],
  'national hackathon':            ['Problem Solving', 'Rapid Prototyping', 'Teamwork'],
};

/**
 * Tries to extract skill_tags from credential_data JSON.
 * Looks for common field names registrars might have used.
 */
function extractFromCredentialData(credentialData: Record<string, unknown> | null | undefined): string[] | null {
  if (!credentialData || typeof credentialData !== 'object') return null;

  // Check known field names
  const candidates = ['skill_tags', 'primary_skills', 'skills', 'tech_stack', 'technologies'];
  for (const key of candidates) {
    const val = credentialData[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      const parsed = val.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (parsed.length > 0) return parsed;
    }
    if (Array.isArray(val) && val.length > 0) {
      return val.map((s: unknown) => String(s).trim()).filter(s => s.length > 0);
    }
  }
  return null;
}

/**
 * Looks up the known skill map by normalized credential title.
 */
function inferFromTitle(skillName: string): string[] | null {
  const normalized = skillName.toLowerCase().trim();

  // Exact match
  if (KNOWN_SKILL_MAP[normalized]) return KNOWN_SKILL_MAP[normalized];

  // Partial match — find any key that appears in the title or vice versa
  for (const [key, tags] of Object.entries(KNOWN_SKILL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return tags;
    }
  }

  return null;
}

async function main() {
  console.log('🔍 Fetching credentials with empty skill_tags...\n');

  const credentials = await prisma.verified_credentials.findMany({
    where: {
      skill_tags: { equals: [] }
    },
    select: {
      id: true,
      skill_name: true,
      credential_data: true,
    }
  });

  console.log(`Found ${credentials.length} credential(s) to backfill.\n`);

  let successCount = 0;
  const skippedCount = 0;

  for (const cred of credentials) {
    process.stdout.write(`  Processing: "${cred.skill_name}" (${cred.id.slice(0, 8)})... `);

    // Strategy 1: extract from existing credential_data
    let tags = extractFromCredentialData(cred.credential_data);

    // Strategy 2: infer from the credential title
    if (!tags || tags.length === 0) {
      tags = inferFromTitle(cred.skill_name);
    }

    // Strategy 3: fallback — use the credential title itself as a single tag
    // This is a last resort so the field is never left empty
    if (!tags || tags.length === 0) {
      tags = [cred.skill_name];
      process.stdout.write(`⚠️  No match found, using title as tag → [${tags.join(', ')}]\n`);
    } else {
      process.stdout.write(`✅ → [${tags.join(', ')}]\n`);
    }

    await prisma.verified_credentials.update({
      where: { id: cred.id },
      data: { skill_tags: tags }
    });

    successCount++;
  }

  console.log(`\n✅ Backfill complete: ${successCount} updated, ${skippedCount} skipped.`);

  // Also add newly inferred skills to monitored_keywords so they're eligible for cache
  console.log('\n🔑 Syncing new tags to monitored_keywords...');
  const allTags = await prisma.verified_credentials.findMany({
    select: { skill_tags: true }
  });
  const uniqueTags = [...new Set(allTags.flatMap(c => c.skill_tags))].filter(t => t.length > 0);

  await prisma.monitored_keywords.createMany({
    data: uniqueTags.map(keyword => ({ keyword, is_active: true })),
    skipDuplicates: true,
  });

  console.log(`✅ Synced ${uniqueTags.length} unique tag(s) to monitored_keywords.\n`);
}

main()
  .catch(e => { console.error('❌ Backfill failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());