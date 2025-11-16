import type { Env } from '../index.js';
import { validateAdminCredentials, issueToken } from '../auth.js';

type LoginBody = {
  username?: string;
  password?: string;
};

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as LoginBody;
    const username = body.username?.trim();
    const password = body.password ?? '';

    console.log('登录请求:', { username, hasPassword: !!password });
    console.log('环境变量:', {
      adminUsername: env.ADMIN_USERNAME || 'admin',
      hasAdminPassword: !!env.ADMIN_PASSWORD,
    });

    if (!username || !password) {
      return new Response(JSON.stringify({ error: '请输入用户名和密码' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = validateAdminCredentials(username, password, env);
    console.log('验证结果:', isValid);
    
    if (!isValid) {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = await issueToken(username, env);
    return new Response(JSON.stringify({ token, username }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('登录失败', error);
    return new Response(JSON.stringify({ error: '登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

