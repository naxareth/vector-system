import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from '../ai-provider';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `AI Provider error: Required environment variable "${key}" is not set.`
    );
  }
  return value;
}

export function createGeminiProvider(): AIProvider {
  const apiKey = requireEnv('GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  return {
    name: 'gemini',
    async generateText(prompt: string) {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}
