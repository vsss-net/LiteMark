import type { Env } from './index.js';

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

