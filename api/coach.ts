import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  handleCoachAgentRequest,
  resolveCoachAgentEnvironment,
} from '../src/domains/guidance/agent/http.js';
import { loadLocalEnv } from '../src/lib/server/loadLocalEnv.js';

loadLocalEnv();

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
