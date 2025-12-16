require('dotenv').config();
const axios = require('axios');

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;
const COUNTRY = 'us'; 
const SKILL = 'React';

async function checkMarket() {
  console.log(`🌍 Fetching '${SKILL}' jobs in ${COUNTRY}...`);
  
  // Adzuna API Endpoint structure
  const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&what=${SKILL}&content-type=application/json`;

  try {
    const res = await axios.get(url);
    const count = res.data.count; // Total jobs found
    
    console.log(`✅ SUCCESS: Found ${count} active jobs.`);
    console.log("Sample Title:", res.data.results[0]?.title || "No titles found");
  } catch (err) {
    console.error("❌ FAILED:", err.response ? err.response.status : err.message);
    console.log("Hint: Did you sign up for Adzuna API and put keys in .env?");
  }
}

checkMarket();