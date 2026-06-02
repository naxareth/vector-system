import type { AIProvider, ChatMessage } from '../ai-provider';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1:8b';

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

async function createOllamaCompletion(messages: ChatMessage[]): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama request failed (${response.status}): ${errorText || 'No response body'}`
    );
  }

  const payload = (await response.json()) as OllamaResponse;
  const content = payload.message?.content;
  if (!content) {
    throw new Error('Ollama response did not include any content.');
  }
  return content;
}

export function createOllamaProvider(): AIProvider {
  return {
    name: 'ollama',
    async generateText(prompt: string) {
      return createOllamaCompletion([{ role: 'user', content: prompt }]);
    },
  };
}
