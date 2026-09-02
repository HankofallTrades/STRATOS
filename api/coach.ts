import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  parseAllowedCoachOrigins,
  resolveCoachCorsHeaders,
} from '../src/domains/guidance/agent/cors.js';
import {
  handleCoachAgentRequest,
  resolveCoachAgentEnvironment,
} from '../src/domains/guidance/agent/http.js';
import { loadLocalEnv } from '../src/lib/server/loadLocalEnv.js';

loadLocalEnv();

const coachAgentEnvironment = resolveCoachAgentEnvironment(process.env);
const allowedOrigins = parseAllowedCoachOrigins(process.env.COACH_ALLOWED_ORIGINS);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // The iOS wrap calls this cross-origin from capacitor://localhost, so every
  // response needs the grant headers — the browser reads them on the error
  // responses too, and without them a 400 surfaces to the app as an opaque
  // network failure instead of its actual message.
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  for (const [name, value] of Object.entries(
    resolveCoachCorsHeaders({ allowedOrigins, origin }),
  )) {
    res.setHeader(name, value);
  }

  // Preflight. An origin that was not granted above simply arrives here without
  // an Access-Control-Allow-Origin header, which is what the browser rejects
  // on; there is nothing to gain from failing the status code as well.
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const response = await handleCoachAgentRequest({
    body: req.body,
    env: coachAgentEnvironment,
  });

  return res.status(response.status).json(response.body);
}
