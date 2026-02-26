import * as ss from 'simple-statistics';

export interface JobMarketData {
  date: string; // YYYY-MM-DD
  jobCount: number;
}

export interface SkillHealth {
  skillName: string;
  currentDemand: number;
  trend: 'growing' | 'stable' | 'declining';
  healthScore: number;   // 0-100
  decayRate: number;     // percentage slope per interval (e.g. 0.5 = +0.5%/interval)
  confidence: 'high' | 'medium' | 'low';
  velocityScore: number; // 0-100 composite of slope + volume + recency (Phase 13)
}

// ---------------------------------------------------------------------------
// Signal helpers
// ---------------------------------------------------------------------------

/**
 * Signal 1 — Slope (40% weight)
 * Converts percentageSlope into a 0-100 score.
 * Slope is clamped to ±5%/interval before normalization so outliers
 * (e.g. a brand-new skill minted once then seen 10x) don't dominate.
 *
 * -5% → 0, 0% → 50, +5% → 100
 */
function slopeSignal(percentageSlope: number): number {
  const CLAMP = 5; // %/interval ceiling
  const clamped = Math.max(-CLAMP, Math.min(CLAMP, percentageSlope));
  return ((clamped + CLAMP) / (2 * CLAMP)) * 100;
}

/**
 * Signal 2 — Volume (30% weight)
 * Log-normalizes currentDemand against a practical market ceiling.
 * Log scale is intentional: the gap between 100 and 1,000 jobs matters
 * far more than the gap between 50,000 and 51,000.
 *
 * Uses log2 so the scale feels intuitive (each doubling adds equal score).
 * Ceiling of 100,000 jobs = score of 100.
 * 0 jobs → 0, ~316 jobs → ~50, 100,000 jobs → 100.
 */
function volumeSignal(currentDemand: number): number {
  if (currentDemand <= 0) return 0;
  const CEILING = 100_000;
  const score = (Math.log2(currentDemand) / Math.log2(CEILING)) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Signal 3 — Recency (30% weight)
 * Exponential decay on age of the most recent snapshot.
 * Half-life of 14 days: a 14-day-old snapshot scores ~50, 30-day ~22, same-day 100.
 * Penalises stale cron runs naturally without needing special-case logic.
 */
function recencySignal(latestDateStr: string): number {
  const latestDate = new Date(latestDateStr);
  if (isNaN(latestDate.getTime())) return 50; // unparseable date — neutral
  const ageInDays = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
  const HALF_LIFE_DAYS = 14;
  return Math.max(0, Math.min(100, Math.pow(0.5, ageInDays / HALF_LIFE_DAYS) * 100));
}

/**
 * Derive trend label from composite velocityScore bands.
 * Thresholds are a deliberate design parameter (not magic numbers) —
 * tunable as data density improves in Phase 14+.
 *
 *  ≥ 65 → growing   (strong positive composite signal)
 *  35-64 → stable   (neutral zone)
 *  < 35 → declining (weak composite signal)
 */
function trendFromVelocity(velocityScore: number): SkillHealth['trend'] {
  if (velocityScore >= 65) return 'growing';
  if (velocityScore < 35)  return 'declining';
  return 'stable';
}

/**
 * Confidence from data density + recency gate.
 * Even a dense history should cap at 'medium' if the latest snapshot
 * is stale (>14 days) — stale data is less trustworthy regardless of volume.
 *
 * Count tiers: low <3, medium 3-6, high >6
 * Recency cap: if latestDate > 14 days ago, cap at 'medium'
 */
function deriveConfidence(
  dataPointCount: number,
  latestDateStr: string
): SkillHealth['confidence'] {
  const raw: SkillHealth['confidence'] =
    dataPointCount >= 7 ? 'high' :
    dataPointCount >= 3 ? 'medium' : 'low';

  // Recency cap — stale data should not carry high confidence
  const ageInDays = (Date.now() - new Date(latestDateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 14 && raw === 'high') return 'medium';

  return raw;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Calculates skill health from historical market snapshots.
 *
 * Phase 13 rewrite: replaces single-signal slope scoring with a 3-signal
 * weighted velocity model:
 *
 *   velocityScore = 0.4 * slopeSignal + 0.3 * volumeSignal + 0.3 * recencySignal
 *
 * This ensures that:
 * - A skill with flat slope but massive volume (React) still scores well.
 * - A skill with steep slope but tiny volume (niche tool) isn't over-rewarded.
 * - Stale cron data degrades both healthScore and confidence automatically.
 *
 * Output shape is backward-compatible with all skill_health_cache writes.
 * New field `velocityScore` added for Phase 13 defense metrics and the
 * planned F1 evaluation script (evaluate-extractor.ts).
 *
 * ARIMA is the documented long-term upgrade path after 6-12 months of
 * snapshot accumulation. Current data density does not justify it.
 */
export function calculateSkillDecay(
  skillName: string,
  historicalData: JobMarketData[]
): SkillHealth {
  // ── Guard: not enough data ──────────────────────────────────────────────
  if (historicalData.length < 2) {
    return {
      skillName,
      currentDemand: historicalData[0]?.jobCount ?? 0,
      trend: 'stable',
      healthScore: 50,
      decayRate: 0,
      confidence: 'low',
      velocityScore: 50,
    };
  }

  const latestEntry   = historicalData[historicalData.length - 1];
  const currentDemand = latestEntry.jobCount;
  const latestDate    = latestEntry.date;

  // ── Guard: only 2 points — skip regression, use pct change ─────────────
  if (historicalData.length < 3) {
    const first      = historicalData[0].jobCount;
    const pctChange  = first > 0 ? ((currentDemand - first) / first) * 100 : 0;

    const slope    = slopeSignal(pctChange);
    const volume   = volumeSignal(currentDemand);
    const recency  = recencySignal(latestDate);
    const velocity = 0.4 * slope + 0.3 * volume + 0.3 * recency;

    return {
      skillName,
      currentDemand,
      trend:         trendFromVelocity(velocity),
      healthScore:   Math.round(velocity),
      decayRate:     parseFloat(pctChange.toFixed(3)),
      confidence:    'low',
      velocityScore: Math.round(velocity),
    };
  }

  // ── Full path: ≥3 data points ───────────────────────────────────────────

  // Linear regression over index vs job count (same as before)
  const points     = historicalData.map((d, i) => [i, d.jobCount] as [number, number]);
  const regression = ss.linearRegression(points);
  const absoluteSlope = regression.m;

  // Percentage slope relative to average demand
  // Keeps threshold meaningful regardless of skill magnitude (unchanged from v1)
  const avgDemand       = ss.mean(historicalData.map(d => d.jobCount));
  const percentageSlope = avgDemand > 0 ? (absoluteSlope / avgDemand) * 100 : 0;

  // ── 3-signal composite ──────────────────────────────────────────────────
  const slope    = slopeSignal(percentageSlope);
  const volume   = volumeSignal(currentDemand);
  const recency  = recencySignal(latestDate);

  // Weighted blend — weights sum to 1.0
  const velocityScore = Math.round(
    0.4 * slope +
    0.3 * volume +
    0.3 * recency
  );

  // healthScore === velocityScore at this stage.
  // Keeping them as separate fields preserves the option to diverge later
  // (e.g. adding a demand-floor penalty or sector-relative adjustment).
  const healthScore = Math.max(0, Math.min(100, velocityScore));

  return {
    skillName,
    currentDemand,
    trend:         trendFromVelocity(velocityScore),
    healthScore,
    decayRate:     parseFloat(percentageSlope.toFixed(3)),
    confidence:    deriveConfidence(historicalData.length, latestDate),
    velocityScore,
  };
}