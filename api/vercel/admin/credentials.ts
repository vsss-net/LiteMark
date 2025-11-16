import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import {
  applyCors,
  handleOptions,
  parseJsonBody,
  sendError,
  sendJson
} from '../_lib/http.js';
import { getAdminCredentials, updateAdminCredentials } from '../_lib/db.js';

type UpdateBody = {
  username?: string;
  password?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'GET,PUT,OPTIONS')) {
    return;
  }
  applyCors(res, 'GET,PUT,OPTIONS');

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  if (req.method === 'GET') {
    try {
      const creds = await getAdminCredentials();
      // 只返回用户名，不返回密码
      sendJson(res, 200, { username: creds.username });
    } catch (error) {
      console.error('获取管理员账号失败', error);
      sendError(res, 500, '获取管理员账号失败');
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const body = await parseJsonBody<UpdateBody>(req);
      const username = body.username?.trim();
      const password = body.password ?? '';

      if (!username) {
        sendError(res, 400, '用户名不能为空');
        return;
      }
      if (!password || password.length < 6) {
        sendError(res, 400, '密码长度至少为 6 位');
        return;
      }

      const updated = await updateAdminCredentials(username, password);
      sendJson(res, 200, { username: updated.username });
    } catch (error) {
      console.error('更新管理员账号失败', error);
      sendError(res, 500, '更新管理员账号失败');
    }
    return;
  }

  sendError(res, 405, 'Method Not Allowed');
}


