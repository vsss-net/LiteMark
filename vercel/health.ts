import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions, sendJson } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'GET,OPTIONS')) {
    return;
  }
  applyCors(res, 'GET,OPTIONS');
  sendJson(res, 200, { status: 'ok' });
}

