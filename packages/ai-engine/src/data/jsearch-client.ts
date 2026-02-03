import axios from 'axios';

export interface JobSearchResult {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_country: string;
  job_employment_type: string;
  job_apply_link: string;
}

export async function fetchJobMarketData(
  skill: string,
  location: string = 'Philippines', 
): Promise<JobSearchResult[]> {
  try {
    const options = {
      method: 'GET',
      url: process.env.JOB_MARKET_API_URL,
      params: {
        // 🚀 CHANGED: Removed "developer" to support all industries
        query: `${skill} in ${location}`, 
        page: '1',
        num_pages: '20', 
        date_posted: 'month'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    };
    
    console.log(`   Calling JSearch API for query: "${skill} in ${location}"...`);
    const response = await axios.request(options);
    return response.data.data || [];
  } catch (error) {
    console.error(`   ⚠️ API Error for ${skill}:`, error);
    return [];
  }
}