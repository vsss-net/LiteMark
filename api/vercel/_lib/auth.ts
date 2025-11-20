import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { sendError } from './http.js';
import { getAdminCredentials, verifyPassword } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * 校验管理员账号密码
 * 使用安全的 bcrypt 验证，并支持自动迁移旧格式密码
 */
export async function validateAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const creds = await getAdminCredentials();
  if (!creds.username) return false;
  
  // 验证用户名
  if (username !== creds.username) {
    return false;
  }
  
  // 使用安全的密码验证（支持旧格式自动迁移）
  return await verifyPassword(password, creds.passwordHash);
}

export function issueToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: VercelRequest, res: VercelResponse): { username: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, '未授权：请提供有效的认证令牌');
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    sendError(res, 401, '未授权：令牌无效或已过期');
    return null;
  }

  return decoded;
}

// 非强制认证：如果有合法 token 就返回用户信息，否则返回 null，不报错
export function getAuthFromRequest(req: VercelRequest): { username: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

