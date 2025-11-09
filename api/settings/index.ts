import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  handleOptions,
  parseJsonBody,
  sendError,
  sendJson
} from '../_lib/http';
import { getTheme, setTheme } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

type ThemeBody = {
  theme?: string;
};

const ALLOWED_THEMES = new Set(['light', 'twilight', 'dark']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'GET,PUT,OPTIONS')) {
    return;
  }
  applyCors(res, 'GET,PUT,OPTIONS');

  if (req.method === 'GET') {
    try {
      const theme = await getTheme();
      sendJson(res, 200, { theme });
    } catch (error) {
      console.error('获取主题失败', error);
      sendError(res, 500, '获取主题失败');
    }
    return;
  }

  if (req.method === 'PUT') {
    const auth = requireAuth(req, res);
    if (!auth) {
      return;
    }
    try {
      const body = await parseJsonBody<ThemeBody>(req);
      const theme = body.theme?.trim();
      if (!theme || !ALLOWED_THEMES.has(theme)) {
        sendError(res, 400, '无效的主题');
        return;
      }
      const updated = await setTheme(theme);
      sendJson(res, 200, { theme: updated });
    } catch (error) {
      console.error('更新主题失败', error);
      sendError(res, 500, '更新主题失败');
    }
    return;
  }

  sendError(res, 405, 'Method Not Allowed');
}

