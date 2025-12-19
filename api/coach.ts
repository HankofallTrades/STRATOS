import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

// --- Manual Env Loader for Local Dev ---
// Standard process.env doesn't always pick up VITE_ variables in vercel dev
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        // Remove trailing comments
        const commentIdx = value.indexOf(' #');
        if (commentIdx !== -1) {
          value = value.substring(0, commentIdx).trim();
        }
        if (!process.env[key]) {
          process.env[key] = value;
          // console.log(`Loaded env ${key} from .env.local`);
        }
      }
    });
  }
} catch (e) {
  console.error('Failed to load .env.local manually:', e);
}

// Import specific functions and type, adding .js extension
import {
  getLocalLlmResponse,
  getOpenRouterResponse,
  type ChatMessage
} from '../src/lib/llm/llmClient.js'; // Added .js extension

// Define possible provider types
type LlmProvider = 'openrouter' | 'local';

// Determine provider - REMOVED HARDCODED PROVIDER
// const llmProvider: LlmProvider = 'openrouter';

// --- Read ALL necessary environment variables server-side ---
// Secrets
const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

// Configs (Note: VITE_ prefix is part of the key name set in Vercel/env.local)
const openRouterModel = process.env.OPENROUTER_MODEL || process.env.VITE_OPENROUTER_MODEL;
const localLlmUrl = process.env.LOCAL_LLM_URL || process.env.VITE_LOCAL_LLM_URL;
const openRouterApiUrl = process.env.OPENROUTER_API_URL || process.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:5173';
const appName = process.env.VITE_APP_NAME || process.env.APP_NAME || 'STRATOS';

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
    if (requestedProvider === 'openrouter' && !model) {
      console.warn(`Model parameter is required for provider '${requestedProvider}' but was not provided.`);
      return res.status(400).json({ error: `Model is required for provider '${requestedProvider}' but was not provided.` });
    }

    let llmResponse: ChatMessage;

    // 2. Use the requested provider and model in the switch statement
    switch (requestedProvider) {
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
          throw new Error('LOCAL_LLM_URL (or VITE_LOCAL_LLM_URL) environment variable is not set.');
        }
        llmResponse = await getLocalLlmResponse(messages, localLlmUrl);
        break;

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