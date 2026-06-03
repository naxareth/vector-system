/**
 * evaluate-extractor.ts
 *
 * Phase 13b — F1 Evaluation Script
 * Runs the AI skill extractor against a golden dataset and outputs
 * Precision, Recall, and F1 per test case plus an aggregate summary.
 *
 * Usage:
 *   npx ts-node packages/ai-engine/src/scripts/evaluate-extractor.ts
 *   npx ts-node packages/ai-engine/src/scripts/evaluate-extractor.ts --verbose
 *   npx ts-node packages/ai-engine/src/scripts/evaluate-extractor.ts --json
 *
 * Flags:
 *   --verbose   Print per-case TP/FP/FN tag lists in addition to scores
 *   --json      Dump full results as JSON to stdout (useful for CI pipelines)
 *
 * Matching strategy: SOFT match (lowercase, trimmed substring containment).
 * "machine learning" expected matches "machine-learning" or "ml" extracted — 
 * this is intentional since models normalize tags inconsistently.
 * See MATCH_MODE constant to switch to EXACT if you need stricter eval.
 *
 * Rate limiting: 1 call per case with a 4-second delay between calls.
 * 20 cases = ~80 seconds total. Stays within free tier (20 RPD / 10 RPM).
 */

import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Must use require() here — import statements are hoisted above dotenv.config()
// which can leave AI provider env vars unavailable during evaluation runs.
const { extractSkillsFromResume } = require('../nlp/skill-extractor');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GOLDEN_DATASET_PATH = path.resolve(
  __dirname,
  './golden-dataset.json'
);

/**
 * EXACT  — extracted tag must equal expected tag (after normalisation)
 * SOFT   — extracted tag is accepted if it contains OR is contained by
 *          an expected tag (handles "ml" ↔ "machine learning" etc.)
 */
const MATCH_MODE: 'EXACT' | 'SOFT' = 'SOFT';

/** Milliseconds to wait between AI provider calls to respect rate limits */
const DELAY_MS = 13_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoldenCase {
  id: number;
  input: string;
  expected: string[];
}

interface CaseResult {
  id: number;
  input: string;
  expected: string[];
  extracted: string[];
  tp: string[];
  fp: string[];
  fn: string[];
  precision: number;
  recall: number;
  f1: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR';
  error?: string;
}

interface SummaryResult {
  totalCases: number;
  errorCases: number;
  precision: number;
  recall: number;
  f1: number;
  passCases: number;
  partialCases: number;
  failCases: number;
  cases: CaseResult[];
}

// ---------------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------------

function normalise(tag: string): string {
  return tag.toLowerCase().trim().replace(/[-_]/g, ' ');
}

/**
 * Returns true if `extracted` matches `expected` under the configured MATCH_MODE.
 * SOFT mode: bidirectional substring check after normalisation.
 */
function isMatch(extracted: string, expected: string): boolean {
  const e = normalise(extracted);
  const x = normalise(expected);
  if (MATCH_MODE === 'EXACT') return e === x;
  // SOFT: accept if either contains the other
  return e === x || e.includes(x) || x.includes(e);
}

/**
 * For a single extracted tag, find if it matches ANY expected tag.
 */
function matchesAnyExpected(extracted: string, expected: string[]): boolean {
  return expected.some(exp => isMatch(extracted, exp));
}

/**
 * For a single expected tag, find if it was covered by ANY extracted tag.
 */
function coveredByAnyExtracted(expected: string, extracted: string[]): boolean {
  return extracted.some(ext => isMatch(ext, expected));
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function computeMetrics(extracted: string[], expected: string[]): {
  tp: string[];
  fp: string[];
  fn: string[];
  precision: number;
  recall: number;
  f1: number;
} {
  const tp = extracted.filter(e => matchesAnyExpected(e, expected));
  const fp = extracted.filter(e => !matchesAnyExpected(e, expected));
  const fn = expected.filter(e => !coveredByAnyExtracted(e, extracted));

  const precision = tp.length + fp.length > 0
    ? tp.length / (tp.length + fp.length)
    : 0;

  const recall = tp.length + fn.length > 0
    ? tp.length / (tp.length + fn.length)
    : 0;

  const f1 = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;

  return { tp, fp, fn, precision, recall, f1 };
}

function statusFromMetrics(precision: number, recall: number, f1: number): CaseResult['status'] {
  if (f1 >= 0.85) return 'PASS';
  if (f1 >= 0.4) return 'PARTIAL';
  return 'FAIL';
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function colourStatus(status: CaseResult['status']): string {
  switch (status) {
    case 'PASS': return `${GREEN}[PASS]${RESET}`;
    case 'PARTIAL': return `${YELLOW}[PARTIAL]${RESET}`;
    case 'FAIL': return `${RED}[FAIL]${RESET}`;
    case 'ERROR': return `${RED}[ERROR]${RESET}`;
  }
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function printCaseResult(r: CaseResult, verbose: boolean): void {
  const label = pad(r.input.slice(0, 45), 45);
  if (r.status === 'ERROR') {
    console.log(`${colourStatus(r.status)} ${label}  ${DIM}${r.error}${RESET}`);
    return;
  }
  console.log(
    `${colourStatus(r.status)} ${label}  ` +
    `P:${CYAN}${fmt(r.precision)}${RESET}  ` +
    `R:${CYAN}${fmt(r.recall)}${RESET}  ` +
    `F1:${CYAN}${fmt(r.f1)}${RESET}`
  );
  if (verbose) {
    if (r.tp.length) console.log(`  ${DIM}  ✓ TP: ${r.tp.join(', ')}${RESET}`);
    if (r.fp.length) console.log(`  ${RED}  ✗ FP: ${r.fp.join(', ')}${RESET}`);
    if (r.fn.length) console.log(`  ${YELLOW}  ✗ FN: ${r.fn.join(', ')}${RESET}`);
  }
}

function printSummary(summary: SummaryResult): void {
  const evaluated = summary.totalCases - summary.errorCases;
  console.log('\n' + '─'.repeat(70));
  console.log(
    `${BOLD}Overall${RESET} — ` +
    `Precision: ${CYAN}${fmt(summary.precision)}${RESET}  ` +
    `Recall: ${CYAN}${fmt(summary.recall)}${RESET}  ` +
    `F1: ${BOLD}${CYAN}${fmt(summary.f1)}${RESET}`
  );
  console.log(
    `${DIM}${evaluated}/${summary.totalCases} cases evaluated  ` +
    `(${GREEN}${summary.passCases} PASS${RESET}${DIM}, ` +
    `${YELLOW}${summary.partialCases} PARTIAL${RESET}${DIM}, ` +
    `${RED}${summary.failCases} FAIL${RESET}${DIM}, ` +
    `${summary.errorCases} ERROR)${RESET}`
  );
  console.log(`${DIM}Match mode: ${MATCH_MODE}${RESET}\n`);
}

// ---------------------------------------------------------------------------
// Delay helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const jsonOut = args.includes('--json');

  // Load golden dataset
  if (!fs.existsSync(GOLDEN_DATASET_PATH)) {
    console.error(`Golden dataset not found at: ${GOLDEN_DATASET_PATH}`);
    process.exit(1);
  }
  const goldenCases: GoldenCase[] = JSON.parse(
    fs.readFileSync(GOLDEN_DATASET_PATH, 'utf-8')
  );

  if (!jsonOut) {
    console.log(`\n${BOLD}VECTOR — Skill Extractor F1 Evaluation${RESET}`);
    console.log(`${DIM}${goldenCases.length} cases · match mode: ${MATCH_MODE} · delay: ${DELAY_MS}ms/call${RESET}\n`);
  }

  const results: CaseResult[] = [];

  // Aggregate accumulators (macro averaging across cases)
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  for (let i = 0; i < goldenCases.length; i++) {
    const c = goldenCases[i];

    if (!jsonOut) {
      process.stdout.write(`${DIM}[${i + 1}/${goldenCases.length}] Extracting: ${c.input.slice(0, 50)}...${RESET}\r`);
    }

    let extracted: string[] = [];
    let error: string | undefined;

    try {
      extracted = await extractSkillsFromResume(c.input);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
    }

    if (error) {
      const result: CaseResult = {
        id: c.id,
        input: c.input,
        expected: c.expected,
        extracted: [],
        tp: [], fp: [], fn: c.expected,
        precision: 0, recall: 0, f1: 0,
        status: 'ERROR',
        error,
      };
      results.push(result);
      if (!jsonOut) printCaseResult(result, verbose);

      // Still delay to avoid hammering quota after an error
      if (i < goldenCases.length - 1) await sleep(DELAY_MS);
      continue;
    }

    const { tp, fp, fn, precision, recall, f1 } = computeMetrics(extracted, c.expected);

    totalTP += tp.length;
    totalFP += fp.length;
    totalFN += fn.length;

    const status = statusFromMetrics(precision, recall, f1);
    const result: CaseResult = {
      id: c.id,
      input: c.input,
      expected: c.expected,
      extracted,
      tp, fp, fn,
      precision, recall, f1,
      status,
    };
    results.push(result);
    if (!jsonOut) printCaseResult(result, verbose);

    // Respect 10 RPM — skip delay after the last case
    if (i < goldenCases.length - 1) await sleep(DELAY_MS);
  }

  // Micro-averaged aggregate (better than macro for unequal expected-set sizes)
  const aggPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const aggRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const aggF1 = aggPrecision + aggRecall > 0
    ? 2 * (aggPrecision * aggRecall) / (aggPrecision + aggRecall)
    : 0;

  const summary: SummaryResult = {
    totalCases: goldenCases.length,
    errorCases: results.filter(r => r.status === 'ERROR').length,
    precision: aggPrecision,
    recall: aggRecall,
    f1: aggF1,
    passCases: results.filter(r => r.status === 'PASS').length,
    partialCases: results.filter(r => r.status === 'PARTIAL').length,
    failCases: results.filter(r => r.status === 'FAIL').length,
    cases: results,
  };

  if (jsonOut) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  } else {
    printSummary(summary);
  }

  // Exit non-zero if aggregate F1 is below a minimum threshold
  // Useful for CI — adjust threshold as extraction improves over time
  const F1_THRESHOLD = 0.90;
  if (summary.f1 < F1_THRESHOLD) {
    if (!jsonOut) {
      console.error(
        `${RED}F1 ${fmt(summary.f1)} is below threshold ${fmt(F1_THRESHOLD)}. ` +
        `Review FP/FN patterns above.${RESET}\n`
      );
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error in evaluate-extractor:', err);
  process.exit(1);
});
