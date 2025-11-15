import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions, parseJsonBody, sendError, sendJson } from '../_lib/http.js';
import { reorderBookmarks } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

type ReorderBody = {
  order?: string[];
};

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
    console.log('书签排序');
    const body = await parseJsonBody<ReorderBody>(req);
    console.log('书签排序body', body);
    if (!body.order || !Array.isArray(body.order)) {
      sendError(res, 400, '请求体需要提供 order 数组');
      return;
    }
    console.log('书签排序order', body.order);
    const reordered = await reorderBookmarks(body.order);
    console.log('书签排序reordered', reordered);
    sendJson(res, 200, reordered);
  } catch (error) {
    console.error('书签排序失败', error);  
    sendError(res, 500, '书签排序失败');
  }
}
