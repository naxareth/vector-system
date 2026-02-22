import { fetchJobCount } from './adzuna-client';

export interface MarketIntelligence {
  count: number;
  mean_salary?: number;
  locations?: string[];
  raw: any; // Future-proofing: stores the full API response
}

/**
 * Unified interface for fetching job market data.
 * This makes the system "Provider Agnostic."
 */
export async function getMarketData(keyword: string, country: string = 'us'): Promise<MarketIntelligence> {
  // Currently using Adzuna, but can be swapped or multi-sourced here
  const liveCount = await fetchJobCount(keyword, country);
  
  // Note: If you update adzuna-client to return objects, map them here.
  // For now, we wrap the count in our flexible intelligence object.
  return {
    count: liveCount,
    raw: { source: 'adzuna', fetched_at: new Date().toISOString() }
  };
}