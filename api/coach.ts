import type { VercelRequest, VercelResponse } from '@vercel/node';
// Import specific functions and type, adding .js extension
import {
  getLocalLlmResponse,
  getOpenAiResponse,
  getOpenRouterResponse,
  type ChatMessage
} from '../src/lib/llm/llmClient.js'; // Added .js extension

// Define possible provider types
type LlmProvider = 'openai' | 'openrouter' | 'local' | 'anthropic' | 'google' | 'xai' | 'custom';

// Determine provider - REMOVED HARDCODED PROVIDER
// const llmProvider: LlmProvider = 'openrouter';

// --- Read ALL necessary environment variables server-side ---
// Secrets
const openaiApiKey = process.env.OPENAI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

// Configs (Note: VITE_ prefix is part of the key name set in Vercel/env.local)
const openRouterModel = process.env.OPENROUTER_MODEL; // Read env var, maybe use as fallback if needed?
const localLlmUrl = process.env.VITE_LOCAL_LLM_URL;
const openaiApiUrl = process.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const openRouterApiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
const appName = process.env.VITE_APP_NAME || 'STRATOS';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Define a variable to hold the provider determined from the request
  let requestedProvider: LlmProvider | undefined;

  try {
    // 1. Receive provider and model from the request body
    const { messages, provider, model } = req.body as {
      messages: ChatMessage[];
      provider?: LlmProvider;
      model?: string;
    };

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body: messages array is required.' });
    }

    // Determine the provider to use - prioritize request body, fallback maybe later?
    requestedProvider = provider;
    if (!requestedProvider) {
        // Maybe fallback to an environment variable or default? For now, treat as error.
        console.warn('LLM Provider not specified in request body.');
        // Fallback to a default if needed, e.g.:
        // requestedProvider = 'openrouter';
        // Or return an error:
        return res.status(400).json({ error: 'LLM Provider not specified in request.' });
    }

    // Validate the model is provided if needed by the provider
    if ((requestedProvider === 'openrouter' || requestedProvider === 'openai') && !model) {
      console.warn(`Model parameter is required for provider '${requestedProvider}' but was not provided.`);
      // Decide how to handle: fallback to env var? default? error?
      // Example: Use env var as fallback specifically for openRouter if model is missing
      // const effectiveModel = (requestedProvider === 'openrouter' && !model) ? openRouterModel : model;
      // if (!effectiveModel) { ... return error ... }
      // For now, return an error if model is missing for providers that need it:
      return res.status(400).json({ error: `Model is required for provider '${requestedProvider}' but was not provided.` });
    }

    let llmResponse: ChatMessage;

    // 2. Use the requested provider and model in the switch statement
    switch (requestedProvider) {
      case 'openai':
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set.');
        }
        // Pass apiKey, URL, and the requested model
        llmResponse = await getOpenAiResponse(messages, openaiApiKey, openaiApiUrl, model); // Pass model
        break;

      // Handle 'deepseek' provider value which uses OpenRouter client - REMOVED
      // case 'deepseek': // Treat deepseek as an alias for openrouter for now
      case 'openrouter': // Use 'openrouter' key directly
        if (!openRouterApiKey) {
          throw new Error('OPENROUTER_API_KEY environment variable is not set.');
        }
        // Use the model from the request body. Fallback handled above if needed.
        if (!model) throw new Error('Model is required for OpenRouter but was missing after check.'); // Should not happen due to check above
        llmResponse = await getOpenRouterResponse(
          messages,
          openRouterApiKey,
          model, // Use model from request
          openRouterApiUrl,
          appUrl,
          appName
        );
        break;

      case 'local':
        if (!localLlmUrl) {
          throw new Error('VITE_LOCAL_LLM_URL environment variable is not set.');
        }
        llmResponse = await getLocalLlmResponse(messages, localLlmUrl);
        break;

      // Add cases for anthropic, google, xai, custom if/when implemented
      // case 'anthropic': ...
      // case 'google': ...

      default:
        // Use requestedProvider in the error message
        throw new Error(`Unsupported LLM provider specified in request: ${requestedProvider}`);
    }

    return res.status(200).json(llmResponse);

  } catch (error) {
    // Use requestedProvider in the error message if available
    const providerInfo = requestedProvider ? ` (Provider: ${requestedProvider})` : '';
    console.error(`Error in /api/coach${providerInfo}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred';
    return res.status(500).json({ error: `Failed to get LLM response${providerInfo}.`, details: errorMessage });
  }
} 