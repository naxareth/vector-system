import { createGeminiProvider } from '@/lib/gemini-adapter';
import { createGroqProvider } from '@/lib/groq-adapter';
import { createOllamaProvider } from '@/lib/ollama-adapter';

export type AIProviderName = 'gemini' | 'groq' | 'ollama';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AIProvider {
  name: AIProviderName;
  generateText(prompt: string): Promise<string>;
  generateChat(messages: ChatMessage[]): Promise<string>;
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

export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    const providerName = resolveProviderName();
    cachedProvider = PROVIDERS[providerName]();
  }
  return cachedProvider;
}

export async function generateText(prompt: string): Promise<string> {
  return getAIProvider().generateText(prompt);
}

export async function generateChat(messages: ChatMessage[]): Promise<string> {
  return getAIProvider().generateChat(messages);
}
