import type { Env } from './index.js';
import { listBookmarks, getSettings, createBookmark, updateSettings } from './db-d1.js';
import { requireAuth } from './auth.js';

type BackupData = {
  version?: string;
  bookmarks?: Array<{
    title: string;
    url: string;
    category?: string;
    description?: string;
    visible?: boolean;
  }>;
  settings?: {
    theme?: string;
    siteTitle?: string;
    siteIcon?: string;
  };
};

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function handleBackup(
  request: Request,
  env: Env,
  action: string
): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'export') {
    try {
      const bookmarks = await listBookmarks(env.DB);
      const settings = await getSettings(env.DB);

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        bookmarks,
        settings,
      };

      return new Response(JSON.stringify(backup), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('导出备份失败', error);
      return new Response(JSON.stringify({ error: '导出备份失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (action === 'import') {
    try {
      const body = (await request.json()) as BackupData;

      // 导入书签
      let importedCount = 0;
      if (Array.isArray(body.bookmarks)) {
        for (const item of body.bookmarks) {
          const title = item.title?.trim();
          const url = item.url?.trim();

          if (!title || !url) {
            continue;
          }

          try {
            await createBookmark(env.DB, {
              title,
              url: sanitizeUrl(url),
              category: item.category?.trim() || undefined,
              description: item.description?.trim() || undefined,
              visible: item.visible ?? true,
            });
            importedCount++;
          } catch (error) {
            console.error('导入书签项失败', error);
          }
        }
      }

      // 导入设置
      if (body.settings) {
        try {
          await updateSettings(env.DB, body.settings);
        } catch (error) {
          console.error('导入设置失败', error);
        }
      }

      const allBookmarks = await listBookmarks(env.DB);
      return new Response(
        JSON.stringify({
          imported: importedCount,
          bookmarks: allBookmarks,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('导入备份失败', error);
      return new Response(JSON.stringify({ error: '导入备份失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

