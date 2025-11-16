import type { Env } from './index.js';
import { getSettings, updateSettings } from './db-d1.js';
import { requireAuth } from './auth.js';

type SettingsBody = {
  theme?: string;
  siteTitle?: string;
  siteIcon?: string;
};

export async function handleSettings(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const settings = await getSettings(env.DB);
      return new Response(JSON.stringify(settings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('获取设置失败', error);
      return new Response(JSON.stringify({ error: '获取设置失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as SettingsBody;
      const updated = await updateSettings(env.DB, body);
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('更新设置失败', error);
      const message = error instanceof Error ? error.message : '更新设置失败';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

