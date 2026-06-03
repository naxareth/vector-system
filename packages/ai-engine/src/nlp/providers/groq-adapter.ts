import type { AIProvider, ChatMessage } from '../ai-provider';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `AI Provider error: Required environment variable "${key}" is not set.`
    );
  }
  return value;
}

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function createGroqCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = requireEnv('GROQ_API_KEY');
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Groq request failed (${response.status}): ${errorText || 'No response body'}`
    );
  }

  const payload = (await response.json()) as GroqResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq response did not include any content.');
  }
  return content;
}

export function createGroqProvider(): AIProvider {
  return {
    name: 'groq',
    async generateText(prompt: string) {
      return createGroqCompletion([{ role: 'user', content: prompt }]);
    },
  };
}
