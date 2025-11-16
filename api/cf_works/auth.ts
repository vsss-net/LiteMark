import type { Env } from './index.js';
import { signJWT, verifyJWT } from './jwt.js';

const JWT_SECRET_DEFAULT = 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export function validateAdminCredentials(
  username: string,
  password: string,
  env: Env
): boolean {
  const adminUsername = env.ADMIN_USERNAME || 'admin';
  const adminPassword = env.ADMIN_PASSWORD || 'admin123';
  return username === adminUsername && password === adminPassword;
}

export async function issueToken(username: string, env: Env): Promise<string> {
  const secret = env.JWT_SECRET || JWT_SECRET_DEFAULT;
  return await signJWT({ username }, secret, JWT_EXPIRES_IN);
}

export async function verifyToken(token: string, env: Env): Promise<{ username: string } | null> {
  const secret = env.JWT_SECRET || JWT_SECRET_DEFAULT;
  const decoded = await verifyJWT(token, secret);
  return decoded;
}

export async function requireAuth(request: Request, env: Env): Promise<{ username: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await verifyToken(token, env);
}

