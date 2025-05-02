import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import specific functions and type, adding .js extension
import {
  getLocalLlmResponse,
  getOpenAiResponse,
  getOpenRouterResponse,
  type ChatMessage
} from '../src/lib/llm/llmClient.js'; // Added .js extension

// Define possible provider types
type LlmProvider = 'openai' | 'openrouter' | 'local';

// Determine provider - For now, hardcode to OpenRouter
// TODO: Implement logic to select provider dynamically if needed
const llmProvider: LlmProvider = 'openrouter'; // Changed from 'openai'

// --- Read ALL necessary environment variables server-side ---
// Secrets
const openaiApiKey = process.env.OPENAI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

// Configs (Note: VITE_ prefix is part of the key name set in Vercel/env.local)
const openRouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';
const localLlmUrl = process.env.VITE_LOCAL_LLM_URL;
const openaiApiUrl = process.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const openRouterApiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'; // OpenRouter has a fixed URL, but allow override
const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173'; // Used for OpenRouter Referer
const appName = process.env.VITE_APP_NAME || 'STRATOS'; // Used for OpenRouter X-Title

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
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set.');
        }
        // Pass apiKey and URL
        llmResponse = await getOpenAiResponse(messages, openaiApiKey, openaiApiUrl);
        break;

      case 'openrouter':
        if (!openRouterApiKey) {
          throw new Error('OPENROUTER_API_KEY environment variable is not set.');
        }
        // Pass apiKey, model, URL, referer (appUrl), and appName
        llmResponse = await getOpenRouterResponse(
          messages,
          openRouterApiKey,
          openRouterModel,
          openRouterApiUrl,
          appUrl,
          appName
        );
        break;

      case 'local':
        if (!localLlmUrl) {
          throw new Error('VITE_LOCAL_LLM_URL environment variable is not set.');
        }
        // Pass URL
        llmResponse = await getLocalLlmResponse(messages, localLlmUrl);
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