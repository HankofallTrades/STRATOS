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

import {
  coachAgentRequestSchema,
  createCoachErrorResponse,
} from '../src/domains/guidance/agent/contracts.js';
import { runCoachAgentTurn } from '../src/domains/guidance/agent/runtime.js';

// --- Read ALL necessary environment variables server-side ---
// Secrets
const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

// Configs (Note: VITE_ prefix is part of the key name set in Vercel/env.local)
const openRouterModel = process.env.OPENROUTER_MODEL || process.env.VITE_OPENROUTER_MODEL;
const localLlmUrl = process.env.LOCAL_LLM_URL || process.env.VITE_LOCAL_LLM_URL;
const openRouterApiUrl = process.env.OPENROUTER_API_URL || process.env.VITE_OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:5173';
const appName = process.env.VITE_APP_NAME || process.env.APP_NAME || 'STRATOS';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const parsedRequest = coachAgentRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({
        error: 'Invalid request body for coach agent.',
        details: parsedRequest.error.flatten(),
      });
    }

    const agentResponse = await runCoachAgentTurn({
      ...parsedRequest.data,
      env: {
        localLlmUrl,
        openRouterApiKey,
        openRouterApiUrl,
        openRouterAppName: appName,
        openRouterReferer: appUrl,
        supabaseAnonKey,
        supabaseUrl,
      },
    });

    return res.status(200).json(agentResponse);

  } catch (error) {
    console.error('Error in /api/coach:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An internal server error occurred';
    return res.status(200).json(
      createCoachErrorResponse(
        `Sorry, STRATOS Coach could not respond: ${errorMessage}.`
      )
    );
  }
}
