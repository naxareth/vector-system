// playground/test-jsearch.js
require('dotenv').config();
const axios = require('axios');

async function checkPHMarket() {
  const SKILL = "React Developer";
  console.log(`🇵🇭 Fetching '${SKILL}' jobs in Philippines...`);

  const options = {
    method: 'GET',
    url: 'https://jsearch.p.rapidapi.com/search',
    params: {
      query: `${SKILL} in Philippines`, // Natural language query
      num_pages: '1',
      date_posted: 'month' // Get jobs from last 30 days
    },
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    // JSearch returns a list of jobs, not a total count metadata, so we count the array
    const jobs = response.data.data;
    
    console.log(`✅ SUCCESS: Found ${jobs.length} jobs in this batch.`);
    console.log("Sample:", jobs[0]?.job_title, "at", jobs[0]?.employer_name);
  } catch (error) {
    console.error("❌ FAILED:", error.message);
  }
}

checkPHMarket();