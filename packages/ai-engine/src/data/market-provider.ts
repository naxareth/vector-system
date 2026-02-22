import { fetchRichMarketData, RichMarketData } from './adzuna-client';

// --- Type Definitions ---

export interface MarketIntelligence {
  count: number;
  mean_salary: number | null;
  locations: string[];         // Flat list of location names for backward compat
  raw: RichMarketData;         // Full structured payload written to metadata JSONB
}

/**
 * Unified interface for fetching job market data.
 * Provider-agnostic: swap or multi-source Adzuna here without touching daily-update.ts.
 */
export async function getMarketData(
  keyword: string,
  country: string = 'us'
): Promise<MarketIntelligence> {
  const rich = await fetchRichMarketData(keyword, country);

  return {
    count: rich.job_count,
    mean_salary: rich.salary.avg,
    locations: rich.top_locations.map(l => l.location), // Flat names for simple consumers
    raw: rich, // Full object (with counts per location, salary min/max) goes to JSONB
  };
}