/**
 * Cloudflare Workers API 路由处理器
 */
import type { Env } from './index.js';
import { handleHealth } from './health.js';
import { handleLogin } from './auth/login.js';
import { handleBookmarks, handleBookmarkById } from './bookmarks.js';
import { handleSettings } from './settings.js';
import { handleBackup } from './backup.js';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // 应用 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
  };

  try {
    // 路由分发
    if (pathname === '/api/health') {
      return addCors(await handleHealth(request, env), corsHeaders);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      return addCors(await handleLogin(request, env), corsHeaders);
    }

    if (pathname === '/api/bookmarks') {
      if (method === 'GET' || method === 'POST') {
        return addCors(await handleBookmarks(request, env), corsHeaders);
      }
    }

    // 动态路由：/api/bookmarks/:id
    const bookmarkIdMatch = pathname.match(/^\/api\/bookmarks\/([^/]+)$/);
    if (bookmarkIdMatch) {
      const id = bookmarkIdMatch[1];
      if (method === 'PUT' || method === 'DELETE') {
        return addCors(await handleBookmarkById(request, env, id), corsHeaders);
      }
    }

    if (pathname === '/api/bookmarks/reorder' && method === 'POST') {
      return addCors(await handleBookmarks(request, env, 'reorder'), corsHeaders);
    }

    if (pathname === '/api/bookmarks/reorder-categories' && method === 'POST') {
      return addCors(await handleBookmarks(request, env, 'reorder-categories'), corsHeaders);
    }

    if (pathname === '/api/bookmarks/import' && method === 'POST') {
      return addCors(await handleBookmarks(request, env, 'import'), corsHeaders);
    }

    if (pathname === '/api/settings') {
      if (method === 'GET' || method === 'PUT') {
        return addCors(await handleSettings(request, env), corsHeaders);
      }
    }

    if (pathname === '/api/backup/export' && method === 'GET') {
      return addCors(await handleBackup(request, env, 'export'), corsHeaders);
    }

    if (pathname === '/api/backup/import' && method === 'POST') {
      return addCors(await handleBackup(request, env, 'import'), corsHeaders);
    }

    // 404
    return addCors(
      new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
      corsHeaders
    );
  } catch (error) {
    console.error('API error:', error);
    return addCors(
      new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
      corsHeaders
    );
  }
}

function addCors(response: Response, headers: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

