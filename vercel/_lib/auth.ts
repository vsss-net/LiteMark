import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { sendError } from './http.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'bookmark-secret';

export type AuthPayload = {
  username: string;
};

export function issueToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: VercelRequest, res: VercelResponse): AuthPayload | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    sendError(res, 401, '未授权');
    return null;
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const payload = verifyToken(token);
  if (!payload) {
    sendError(res, 401, '令牌无效或已过期');
    return null;
  }
  return payload;
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return username === adminUsername && password === adminPassword;
}

