import axios from 'axios';

export async function fetchJobCount(skill: string, country: string = 'us'): Promise<number> {
  try {
    // Adzuna Search Endpoint
    const response = await axios.get(`${process.env.ADZUNA_BASE_URL}/${country}/search/1`, {
      params: {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_APP_KEY,
        what: skill // The query (e.g., "React")
      },
      // If you strictly needed headers, they would go here:
      headers: {
        'Accept': 'application/json'
      }
    });

    // Adzuna returns the total count in the top-level 'count' property
    return response.data.count || 0;

  } catch (error) {
    console.error(`⚠️ Adzuna API Error for ${skill}:`, error);
    return 0;
  }
}