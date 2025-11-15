import type { VercelRequest, VercelResponse } from '@vercel/node';
import { issueToken, validateAdminCredentials } from '../_lib/auth.js';
import { applyCors, handleOptions, parseJsonBody, sendError, sendJson } from '../_lib/http.js';

type LoginBody = {
  username?: string;
  password?: string;
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

  try {
    const body = await parseJsonBody<LoginBody>(req);
    const username = body.username?.trim();
    const password = body.password ?? '';

    if (!username || !password) {
      sendError(res, 400, '请输入用户名和密码');
      return;
    }

    if (!validateAdminCredentials(username, password)) {
      sendError(res, 401, '用户名或密码错误');
      return;
    }

    const token = issueToken(username);
    sendJson(res, 200, { token, username });
  } catch (error) {
    console.error('登录失败', error);
    sendError(res, 500, '登录失败');
  }
}

