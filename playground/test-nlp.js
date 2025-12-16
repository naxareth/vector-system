require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("🤖 Asking Gemini...");
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  // The Prompt: Ask it to behave like an API
  const prompt = `
    Extract skills from this bio and return ONLY a JSON array of strings. 
    Bio: "I have been coding in Python for 3 years and I know a bit of ReactJS and MongoDB."
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log("✅ RAW RESPONSE:", response);
    
    // Clean up markdown formatting if Gemini adds ```json
    const cleanJson = response.replace(/```json|```/g, '').trim();
    const skills = JSON.parse(cleanJson);
    
    console.log("✅ PARSED SKILLS:", skills); 
    // Should print: [ 'Python', 'ReactJS', 'MongoDB' ]
  } catch (err) {
    console.error("❌ FAILED:", err.message);
  }
}

run();