import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import specific functions and type
import {
  getLocalLlmResponse,
  getOpenAiResponse,
  getOpenRouterResponse,
  type ChatMessage
} from '../src/lib/llm/llmClient';

// Define possible provider types
type LlmProvider = 'openai' | 'openrouter' | 'local';

// Determine provider - For now, hardcode to OpenAI
// TODO: Implement logic to select provider dynamically if needed
const llmProvider: LlmProvider = 'openai'; // Explicitly type the constant

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body: messages array is required.' });
    }

    let llmResponse: ChatMessage;

    // Call the appropriate LLM function based on the selected provider
    switch (llmProvider) {
      case 'openai':
        // Read the secret key from backend environment variables
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set.');
        }
        llmResponse = await getOpenAiResponse(messages, openaiApiKey);
        break;

      case 'openrouter':
        // Read the secret key from backend environment variables
        const openRouterApiKey = process.env.OPENROUTER_API_KEY;
        const openRouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free'; // Example model
        if (!openRouterApiKey) {
          throw new Error('OPENROUTER_API_KEY environment variable is not set.');
        }
        llmResponse = await getOpenRouterResponse(messages, openRouterApiKey, openRouterModel);
        break;

      case 'local':
        // Local doesn't typically require an API key in this setup
        llmResponse = await getLocalLlmResponse(messages);
        break;

      default:
        throw new Error(`Unsupported LLM provider configured: ${llmProvider}`);
    }

    return res.status(200).json(llmResponse);

  } catch (error: any) {
    console.error(`Error in /api/coach (Provider: ${llmProvider}):`, error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred';
    // Add provider info to the error response for easier debugging
    return res.status(500).json({ error: `Failed to get LLM response from ${llmProvider}.`, details: errorMessage });
  }
} 