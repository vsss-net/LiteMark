import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  handleOptions,
  parseJsonBody,
  sendError,
  sendJson
} from '../_lib/http';
import { deleteBookmark, updateBookmark } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

type BookmarkBody = {
  title?: string;
  url?: string;
  category?: string;
  description?: string;
  visible?: boolean;
};

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    sendError(res, 400, '缺少书签 ID');
    return;
  }

  if (handleOptions(req, res, 'PUT,DELETE,OPTIONS')) {
    return;
  }

  applyCors(res, 'PUT,DELETE,OPTIONS');

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  if (req.method === 'PUT') {
    try {
      const body = await parseJsonBody<BookmarkBody>(req);
      const title = body.title?.trim();
      const url = body.url?.trim();

      if (!title || !url) {
        sendError(res, 400, '标题和链接不能为空');
        return;
      }

      const updated = await updateBookmark(id, {
        title,
        url: sanitizeUrl(url),
        category: body.category?.trim() || undefined,
        description: body.description?.trim() || undefined,
        visible: body.visible ?? true
      });

      if (!updated) {
        sendError(res, 404, '未找到指定书签');
        return;
      }

      sendJson(res, 200, updated);
    } catch (error) {
      console.error('更新书签失败', error);
      sendError(res, 500, '更新书签失败');
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const removed = await deleteBookmark(id);
      if (!removed) {
        sendError(res, 404, '未找到指定书签');
        return;
      }
      sendJson(res, 200, removed);
    } catch (error) {
      console.error('删除书签失败', error);
      sendError(res, 500, '删除书签失败');
    }
    return;
  }

  sendError(res, 405, 'Method Not Allowed');
}

