import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions, sendError, sendJson } from '../_lib/http.js';
import { forceRefreshSettingsCache } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'POST,OPTIONS')) {
    return;
  }

  applyCors(res, 'POST,OPTIONS');

  if (req.method !== 'POST') {
    sendError(res, 405, 'Method Not Allowed');
    return;
  }

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  try {
    const settings = await forceRefreshSettingsCache();
    sendJson(res, 200, settings);
  } catch (error) {
    console.error('刷新站点设置缓存失败', error);
    sendError(res, 500, '刷新站点设置缓存失败');
  }
}
