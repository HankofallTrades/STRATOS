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
  handleCoachAgentRequest,
  resolveCoachAgentEnvironment,
} from '../src/domains/guidance/agent/http.js';

const coachAgentEnvironment = resolveCoachAgentEnvironment(process.env);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const response = await handleCoachAgentRequest({
    body: req.body,
    env: coachAgentEnvironment,
  });

  return res.status(response.status).json(response.body);
}
