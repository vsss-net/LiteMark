import type { Env } from './index.js';
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  reorderBookmarks,
  reorderBookmarkCategories,
  type BookmarkRecord,
} from './db-d1.js';
import { requireAuth } from './auth.js';

type BookmarkBody = {
  title?: string;
  url?: string;
  category?: string;
  description?: string;
  visible?: boolean;
};

type ReorderBody = {
  order?: string[];
};

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function handleBookmarks(
  request: Request,
  env: Env,
  action?: string
): Promise<Response> {
  if (action === 'reorder') {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as ReorderBody;
      const order = body.order;

      if (!Array.isArray(order)) {
        return new Response(JSON.stringify({ error: 'order 必须是数组' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const bookmarks = await reorderBookmarks(env.DB, order);
      return new Response(JSON.stringify(bookmarks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('重排序书签失败', error);
      return new Response(JSON.stringify({ error: '重排序书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (action === 'reorder-categories') {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as ReorderBody;
      const order = body.order;

      if (!Array.isArray(order)) {
        return new Response(JSON.stringify({ error: 'order 必须是数组' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const bookmarks = await reorderBookmarkCategories(env.DB, order);
      return new Response(JSON.stringify(bookmarks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('重排序分类失败', error);
      return new Response(JSON.stringify({ error: '重排序分类失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (action === 'import') {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as { bookmarks?: BookmarkBody[] };
      const bookmarks = body.bookmarks;

      if (!Array.isArray(bookmarks)) {
        return new Response(JSON.stringify({ error: 'bookmarks 必须是数组' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const created: BookmarkRecord[] = [];
      for (const item of bookmarks) {
        const title = item.title?.trim();
        const url = item.url?.trim();

        if (!title || !url) {
          continue;
        }

        try {
          const bookmark = await createBookmark(env.DB, {
            title,
            url: sanitizeUrl(url),
            category: item.category?.trim() || undefined,
            description: item.description?.trim() || undefined,
            visible: item.visible ?? true,
          });
          created.push(bookmark);
        } catch (error) {
          console.error('导入书签项失败', error);
        }
      }

      const allBookmarks = await listBookmarks(env.DB);
      return new Response(JSON.stringify({ imported: created.length, bookmarks: allBookmarks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('导入书签失败', error);
      return new Response(JSON.stringify({ error: '导入书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'GET') {
    try {
      const bookmarks = await listBookmarks(env.DB);
      return new Response(JSON.stringify(bookmarks), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (error) {
      console.error('获取书签失败', error);
      return new Response(JSON.stringify({ error: '获取书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as BookmarkBody;
      const title = body.title?.trim();
      const url = body.url?.trim();

      if (!title || !url) {
        return new Response(JSON.stringify({ error: '标题和链接不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const bookmark = await createBookmark(env.DB, {
        title,
        url: sanitizeUrl(url),
        category: body.category?.trim() || undefined,
        description: body.description?.trim() || undefined,
        visible: body.visible ?? true,
      });

      return new Response(JSON.stringify(bookmark), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('新增书签失败', error);
      return new Response(JSON.stringify({ error: '新增书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleBookmarkById(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: '未授权：请提供有效的认证令牌' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'PUT') {
    try {
      const body = (await request.json()) as BookmarkBody;
      const title = body.title?.trim();
      const url = body.url?.trim();

      if (!title || !url) {
        return new Response(JSON.stringify({ error: '标题和链接不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const updated = await updateBookmark(env.DB, id, {
        title,
        url: sanitizeUrl(url),
        category: body.category?.trim() || undefined,
        description: body.description?.trim() || undefined,
        visible: body.visible ?? true,
      });

      if (!updated) {
        return new Response(JSON.stringify({ error: '书签不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('更新书签失败', error);
      return new Response(JSON.stringify({ error: '更新书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const deleted = await deleteBookmark(env.DB, id);
      if (!deleted) {
        return new Response(JSON.stringify({ error: '书签不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(deleted), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('删除书签失败', error);
      return new Response(JSON.stringify({ error: '删除书签失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}

