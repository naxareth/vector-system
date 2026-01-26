import { GoogleGenerativeAI } from "@google/generative-ai";

import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const skillExtractionPrompt = `
You are a skill extraction expert. Extract and normalize technical skills from resume text.

Input: Raw resume text
Output: JSON array of normalized skill names

Rules:
1. Map variations to standard names:
   - "React.js", "ReactJS" → "React"
   - "Python 3", "Python3" → "Python"
   - "Node", "NodeJS" → "Node.js"
   - "Solidity" → "Solidity"
   - "AI/ML", "Machine Learning" → "AI/ML"
2. Only include technical skills from our taxonomy
3. Return JSON format: { "skills": ["React", "Python"] }

Taxonomy: React, Python, Solidity, Node.js, AI/ML
`;