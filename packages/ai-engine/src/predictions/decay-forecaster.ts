import * as ss from 'simple-statistics';

export interface JobMarketData {
  date: string;  // YYYY-MM-DD
  jobCount: number;
}

export interface SkillHealth {
  skillName: string;
  currentDemand: number;
  trend: 'growing' | 'stable' | 'declining';
  healthScore: number; // 0-100
  decayRate: number; // slope from regression
}

export function calculateSkillDecay(
  skillName: string,
  historicalData: JobMarketData[]
): SkillHealth {
  if (historicalData.length < 3) {
    return {
      skillName,
      currentDemand: 0,
      trend: 'stable',
      healthScore: 50,
      decayRate: 0
    };
  }
  
  // Prepare data for linear regression
  const points = historicalData.map((data, index) => [index, data.jobCount]);
  
  // Calculate linear regression
  const regression = ss.linearRegression(points);
  const slope = regression.m;
  
  // Calculate current demand (latest job count)
  const currentDemand = historicalData[historicalData.length - 1].jobCount;
  
  // Determine trend
  let trend: 'growing' | 'stable' | 'declining';
  if (slope > 0.1) trend = 'growing';
  else if (slope < -0.1) trend = 'declining';
  else trend = 'stable';
  
  // Calculate health score (0-100)
  const maxDemand = Math.max(...historicalData.map(d => d.jobCount));
  const minDemand = Math.min(...historicalData.map(d => d.jobCount));
  const healthScore = maxDemand === minDemand 
    ? 50 
    : ((currentDemand - minDemand) / (maxDemand - minDemand)) * 100;
  
  return {
    skillName,
    currentDemand,
    trend,
    healthScore: Math.round(healthScore),
    decayRate: parseFloat(slope.toFixed(3))
  };
}