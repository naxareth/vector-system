import axios from 'axios';

// --- Type Definitions ---

export interface LocationDemand {
  location: string;
  count: number;
}

export interface SalaryInsights {
  min: number | null;
  max: number | null;
  avg: number | null;
  currency: string;
}

export interface RichMarketData {
  job_count: number;
  salary: SalaryInsights;
  top_locations: LocationDemand[];
  fetched_at: string;
}

// --- Helper: Extract location demand from Adzuna results ---

function extractTopLocations(results: any[]): LocationDemand[] {
  const locationMap: Record<string, number> = {};

  for (const job of results) {
    const display = job?.location?.display_name as string | undefined;
    if (display) {
      locationMap[display] = (locationMap[display] || 0) + 1;
    }
  }

  return Object.entries(locationMap)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// --- Helper: Extract salary insights from Adzuna results ---

function extractSalaryInsights(results: any[]): SalaryInsights {
  const salaries = results
    .filter(job => job.salary_min != null && job.salary_max != null)
    .map(job => ({
      min: Number(job.salary_min),
      max: Number(job.salary_max),
    }));

  if (salaries.length === 0) {
    return { min: null, max: null, avg: null, currency: 'USD' };
  }

  const allMins = salaries.map(s => s.min);
  const allMaxes = salaries.map(s => s.max);
  const allAvgs = salaries.map(s => (s.min + s.max) / 2);

  return {
    min: Math.round(Math.min(...allMins)),
    max: Math.round(Math.max(...allMaxes)),
    avg: Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length),
    currency: 'USD',
  };
}

// --- Main Export ---

export async function fetchRichMarketData(
  skill: string,
  country: string = 'us'
): Promise<RichMarketData> {
  const fallback: RichMarketData = {
    job_count: 0,
    salary: { min: null, max: null, avg: null, currency: 'USD' },
    top_locations: [],
    fetched_at: new Date().toISOString(),
  };

  try {
    const response = await axios.get(
      `${process.env.ADZUNA_BASE_URL}/${country}/search/1`,
      {
        params: {
          app_id: process.env.ADZUNA_APP_ID,
          app_key: process.env.ADZUNA_APP_KEY,
          what: skill,
          results_per_page: 50,
          // ✅ content_type intentionally omitted — not a valid Adzuna param, caused 400s
        },
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const data = response.data;
    const results: any[] = data?.results ?? [];

    return {
      job_count: data?.count ?? 0,
      salary: extractSalaryInsights(results),
      top_locations: extractTopLocations(results),
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`⚠️ Adzuna API Error for "${skill}":`, error);
    return fallback;
  }
}

// --- Backward-compatible shim ---

export async function fetchJobCount(
  skill: string,
  country: string = 'us'
): Promise<number> {
  const data = await fetchRichMarketData(skill, country);
  return data.job_count;
}