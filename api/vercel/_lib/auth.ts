import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { sendError } from './http.js';
import { getAdminCredentials } from './db.js';
import { createHash } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// 校验管理员账号密码（从数据库读取，不再依赖环境变量）
export async function validateAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const creds = await getAdminCredentials();
  if (!creds.username) return false;
  const hash = hashPassword(password);
  return username === creds.username && hash === creds.passwordHash;
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

