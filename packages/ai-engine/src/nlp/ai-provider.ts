import { createGeminiProvider } from './providers/gemini-adapter';
import { createGroqProvider } from './providers/groq-adapter';
import { createOllamaProvider } from './providers/ollama-adapter';

export type AIProviderName = 'gemini' | 'groq' | 'ollama';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AIProvider {
  name: AIProviderName;
  generateText(prompt: string): Promise<string>;
}

const PROVIDERS: Record<AIProviderName, () => AIProvider> = {
  gemini: createGeminiProvider,
  groq: createGroqProvider,
  ollama: createOllamaProvider,
};

let cachedProvider: AIProvider | null = null;

function resolveProviderName(): AIProviderName {
  const raw = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (raw === 'gemini' || raw === 'groq' || raw === 'ollama') {
    return raw;
  }
  throw new Error(
    `Unsupported AI_PROVIDER "${raw}". Expected "gemini", "groq", or "ollama".`
  );
}

function normalizePrompt(prompt: string | string[]): string {
  return Array.isArray(prompt) ? prompt.join('\n\n') : prompt;
}

export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    const providerName = resolveProviderName();
    cachedProvider = PROVIDERS[providerName]();
  }
  return cachedProvider;
}

export async function generateText(prompt: string | string[]): Promise<string> {
  return getAIProvider().generateText(normalizePrompt(prompt));
}
