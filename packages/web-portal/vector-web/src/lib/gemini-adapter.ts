import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from '@/lib/env-guard';
import type { AIProvider, ChatMessage } from '@/lib/ai-provider';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

function toGeminiRole(role: ChatMessage['role']): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user';
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
    async generateChat(messages: ChatMessage[]) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Gemini chat requires the last message to be from the user.');
      }

      const history = messages.slice(0, -1).map((message) => ({
        role: toGeminiRole(message.role),
        parts: [{ text: message.content }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      return result.response.text();
    },
  };
}
