import * as ss from 'simple-statistics';

export interface JobMarketData {
  date: string; // YYYY-MM-DD
  jobCount: number;
}

export interface SkillHealth {
  skillName: string;
  currentDemand: number;
  trend: 'growing' | 'stable' | 'declining';
  healthScore: number; // 0-100
  decayRate: number;   // percentage change per day (e.g. 0.5 = +0.5%/day)
  confidence: 'high' | 'medium' | 'low'; // based on how many data points we have
}

/**
 * Calculates skill health from historical market snapshots.
 *
 * Key fix from v1: trend detection now uses PERCENTAGE slope, not absolute slope.
 * A slope of +500 jobs/day on a skill with 500,000 total jobs is +0.1%/day (stable).
 * A slope of +500 jobs/day on a skill with 1,000 total jobs is +50%/day (growing fast).
 * The old threshold of > 0.1 (absolute) was meaningless at real job count magnitudes.
 */
export function calculateSkillDecay(
  skillName: string,
  historicalData: JobMarketData[]
): SkillHealth {
  // Not enough data — return neutral with low confidence
  if (historicalData.length < 2) {
    return {
      skillName,
      currentDemand: historicalData[0]?.jobCount ?? 0,
      trend: 'stable',
      healthScore: 50,
      decayRate: 0,
      confidence: 'low',
    };
  }

  const currentDemand = historicalData[historicalData.length - 1].jobCount;

  // Need at least 3 points for meaningful regression
  if (historicalData.length < 3) {
    // Fall back to simple first-to-last percentage change
    const first = historicalData[0].jobCount;
    const pctChange = first > 0 ? ((currentDemand - first) / first) * 100 : 0;
    return {
      skillName,
      currentDemand,
      trend: pctChange > 2 ? 'growing' : pctChange < -2 ? 'declining' : 'stable',
      healthScore: 50,
      decayRate: parseFloat(pctChange.toFixed(3)),
      confidence: 'low',
    };
  }

  // Linear regression over index vs job count
  const points = historicalData.map((d, i) => [i, d.jobCount] as [number, number]);
  const regression = ss.linearRegression(points);
  const absoluteSlope = regression.m; // jobs per day (absolute)

  // Convert to percentage slope relative to average demand
  // This makes the threshold meaningful regardless of skill magnitude
  const avgDemand = ss.mean(historicalData.map(d => d.jobCount));
  const percentageSlope = avgDemand > 0 ? (absoluteSlope / avgDemand) * 100 : 0;

  // Trend thresholds: > +0.5%/day = growing, < -0.5%/day = declining
  // At React's scale (~50k jobs), this means ~250 jobs/day movement to register
  // At Svelte's scale (~460 jobs), this means ~2.3 jobs/day movement to register
  let trend: 'growing' | 'stable' | 'declining';
  if (percentageSlope > 0.5) trend = 'growing';
  else if (percentageSlope < -0.5) trend = 'declining';
  else trend = 'stable';

  // Health score: blend of current position in historical range (50%)
  // and trend direction (50%) so both demand level and momentum matter
  const maxDemand = Math.max(...historicalData.map(d => d.jobCount));
  const minDemand = Math.min(...historicalData.map(d => d.jobCount));
  const rangeScore = maxDemand === minDemand
    ? 50
    : ((currentDemand - minDemand) / (maxDemand - minDemand)) * 100;

  // Trend bonus: growing adds up to +10, declining subtracts up to -10
  const trendBonus = Math.max(-10, Math.min(10, percentageSlope * 2));
  const healthScore = Math.round(Math.max(0, Math.min(100, rangeScore + trendBonus)));

  // Confidence based on data point count
  const confidence: SkillHealth['confidence'] =
    historicalData.length >= 7 ? 'high' :
    historicalData.length >= 4 ? 'medium' : 'low';

  return {
    skillName,
    currentDemand,
    trend,
    healthScore,
    decayRate: parseFloat(percentageSlope.toFixed(3)),
    confidence,
  };
}