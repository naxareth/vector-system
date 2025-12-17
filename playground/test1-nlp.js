require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    console.log("🤖 Testing Gemini API...");
    
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY missing in .env");
        return;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const prompt = "Extract ONLY JSON array of skills from: 'I know Python, JavaScript, and React Native.'";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        console.log("✅ Gemini Response:", response.text());
    } catch (error) {
        console.error("❌ Gemini Error:", error.message);
    }
}

testGemini();