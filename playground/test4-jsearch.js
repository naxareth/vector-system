require('dotenv').config();
const axios = require('axios');

async function testJSearch() {
    console.log("🔍 Testing JSearch API...");
    
    if (!process.env.RAPIDAPI_KEY) {
        console.error("❌ RAPIDAPI_KEY missing");
        return;
    }
    
    try {
        const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
            params: { query: 'React Developer Philippines', page: '1', num_pages: '1' },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            },
            timeout: 10000
        });
        
        console.log(`✅ Found ${response.data.data?.length || 0} jobs`);
        if (response.data.data?.[0]) {
            console.log("Sample:", response.data.data[0].job_title?.substring(0, 50));
        }
    } catch (error) {
        console.error("❌ API Error:", error.message);
    }
}

testJSearch();