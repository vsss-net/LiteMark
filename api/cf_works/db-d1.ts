/**
 * Cloudflare D1 数据库适配层
 */

// D1 数据库类型定义
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

export interface BookmarkRecord {
  id: string;
  title: string;
  url: string;
  category?: string | null;
  description?: string | null;
  visible?: boolean;
  order?: number;
  categoryOrder?: number;
}

export interface Settings {
  theme?: string;
  siteTitle?: string;
  siteIcon?: string;
}

// 初始化数据库表
export async function initTables(db: D1Database) {
  try {
    // 创建书签表
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT,
        description TEXT,
        visible INTEGER DEFAULT 1,
        "order" INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )`
    ).run();

    // 创建分类顺序表
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS category_order (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT UNIQUE NOT NULL,
        "order" INTEGER NOT NULL
      )`
    ).run();

    // 创建设置表
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      )`
    ).run();

    // 创建索引
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)`
    ).run();
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_bookmarks_order ON bookmarks("order")`
    ).run();
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_category_order_order ON category_order("order")`
    ).run();
  } catch (error) {
    console.error('初始化数据库表失败', error);
    // 不抛出错误，允许表已存在的情况
  }
}

// 确保表已初始化
let tablesInitialized = false;
export async function ensureTables(db: D1Database) {
  if (!tablesInitialized) {
    await initTables(db);
    tablesInitialized = true;
  }
}

function normalizeCategory(category?: string | null): string {
  return (category ?? '').trim() || '';
}

export async function listBookmarks(db: D1Database): Promise<BookmarkRecord[]> {
  await ensureTables(db);
  
  // 获取分类顺序
  const categoryOrderResult = await db.prepare(`
    SELECT category FROM category_order ORDER BY "order" ASC
  `).all();
  const categoryOrder = (categoryOrderResult.results as any[]).map(row => row.category as string);
  
  // 获取所有书签
  const bookmarksResult = await db.prepare(`
    SELECT id, title, url, category, description, visible, "order"
    FROM bookmarks
    ORDER BY "order" ASC
  `).all();
  
  const bookmarks = (bookmarksResult.results as any[]).map(row => ({
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    category: (row.category as string) || null,
    description: (row.description as string) || null,
    visible: row.visible !== 0,
    order: (row.order as number) || 0
  }));
  
  // 按分类顺序排序
  const sorted = [...bookmarks].sort((a, b) => {
    const catA = normalizeCategory(a.category);
    const catB = normalizeCategory(b.category);
    
    // 先按分类顺序
    const indexA = categoryOrder.indexOf(catA);
    const indexB = categoryOrder.indexOf(catB);
    if (indexA !== indexB) {
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }
    
    // 再按分类内顺序
    return (a.order ?? 0) - (b.order ?? 0);
  });
  
  return sorted;
}

export async function createBookmark(
  db: D1Database,
  data: Omit<BookmarkRecord, 'id' | 'order'>
): Promise<BookmarkRecord> {
  await ensureTables(db);
  
  const category = normalizeCategory(data.category);
  
  // 找到同分类中最大的 order
  const maxOrderResult = await db.prepare(`
    SELECT COALESCE(MAX("order"), -1) as max_order
    FROM bookmarks
    WHERE category = ?
  `).bind(category || null).first<{ max_order: number }>();
  
  const maxOrder = maxOrderResult?.max_order ?? -1;
  const id = crypto.randomUUID();
  const order = maxOrder + 1;
  
  await db.prepare(`
    INSERT INTO bookmarks (id, title, url, category, description, visible, "order")
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.title,
    data.url,
    category || null,
    data.description || null,
    data.visible ? 1 : 0,
    order
  ).run();
  
  return {
    ...data,
    id,
    order,
    category: category || null
  };
}

export async function updateBookmark(
  db: D1Database,
  id: string,
  data: Partial<Omit<BookmarkRecord, 'id'>>
): Promise<BookmarkRecord | null> {
  await ensureTables(db);
  
  // 获取当前书签
  const currentResult = await db.prepare(`
    SELECT * FROM bookmarks WHERE id = ?
  `).bind(id).first<any>();
  
  if (!currentResult) {
    return null;
  }
  
  const oldCategory = normalizeCategory(currentResult.category as string);
  const newCategory = normalizeCategory(data.category);
  
  // 如果分类改变，需要调整顺序
  if (newCategory !== oldCategory) {
    // 从旧分类移除，调整其他书签的顺序
    await db.prepare(`
      UPDATE bookmarks
      SET "order" = "order" - 1
      WHERE category = ? AND "order" > ?
    `).bind(oldCategory || null, currentResult.order).run();
    
    // 添加到新分类末尾
    const maxOrderResult = await db.prepare(`
      SELECT COALESCE(MAX("order"), -1) as max_order
      FROM bookmarks
      WHERE category = ?
    `).bind(newCategory || null).first<{ max_order: number }>();
    
    const maxOrder = maxOrderResult?.max_order ?? -1;
    data.order = maxOrder + 1;
  }
  
  // 更新书签
  const title = data.title !== undefined ? data.title : (currentResult.title as string);
  const url = data.url !== undefined ? data.url : (currentResult.url as string);
  const category = data.category !== undefined 
    ? (normalizeCategory(data.category) || null)
    : (currentResult.category as string || null);
  const description = data.description !== undefined 
    ? (data.description || null)
    : (currentResult.description as string || null);
  const visible = data.visible !== undefined 
    ? (data.visible ? 1 : 0)
    : (currentResult.visible !== 0 ? 1 : 0);
  const order = data.order !== undefined 
    ? data.order 
    : (currentResult.order as number || 0);
  
  await db.prepare(`
    UPDATE bookmarks
    SET 
      title = ?,
      url = ?,
      category = ?,
      description = ?,
      visible = ?,
      "order" = ?,
      updated_at = unixepoch()
    WHERE id = ?
  `).bind(title, url, category, description, visible, order, id).run();
  
  // 返回更新后的书签
  const updatedResult = await db.prepare(`
    SELECT * FROM bookmarks WHERE id = ?
  `).bind(id).first<any>();
  
  if (!updatedResult) {
    return null;
  }
  
  return {
    id: updatedResult.id as string,
    title: updatedResult.title as string,
    url: updatedResult.url as string,
    category: (updatedResult.category as string) || null,
    description: (updatedResult.description as string) || null,
    visible: updatedResult.visible !== 0,
    order: (updatedResult.order as number) || 0
  };
}

export async function deleteBookmark(db: D1Database, id: string): Promise<BookmarkRecord | null> {
  await ensureTables(db);
  
  // 获取要删除的书签
  const currentResult = await db.prepare(`
    SELECT * FROM bookmarks WHERE id = ?
  `).bind(id).first<any>();
  
  if (!currentResult) {
    return null;
  }
  
  const category = normalizeCategory(currentResult.category as string);
  const order = currentResult.order as number;
  
  // 调整同分类中其他书签的顺序
  await db.prepare(`
    UPDATE bookmarks
    SET "order" = "order" - 1
    WHERE category = ? AND "order" > ?
  `).bind(category || null, order).run();
  
  // 删除书签
  await db.prepare(`
    DELETE FROM bookmarks WHERE id = ?
  `).bind(id).run();
  
  return {
    id: currentResult.id as string,
    title: currentResult.title as string,
    url: currentResult.url as string,
    category: (currentResult.category as string) || null,
    description: (currentResult.description as string) || null,
    visible: currentResult.visible !== 0,
    order: (currentResult.order as number) || 0
  };
}

export async function reorderBookmarks(db: D1Database, order: string[]): Promise<BookmarkRecord[]> {
  await ensureTables(db);
  
  // 更新每个书签的顺序
  for (let i = 0; i < order.length; i++) {
    await db.prepare(`
      UPDATE bookmarks
      SET "order" = ?
      WHERE id = ?
    `).bind(i, order[i]).run();
  }
  
  // 未出现的 ID 追加到末尾
  const allBookmarksResult = await db.prepare(`
    SELECT id FROM bookmarks
  `).all();
  const allIds = (allBookmarksResult.results as any[]).map(row => row.id as string);
  const missingIds = allIds.filter(id => !order.includes(id));
  
  let nextOrder = order.length;
  for (const id of missingIds) {
    await db.prepare(`
      UPDATE bookmarks
      SET "order" = ?
      WHERE id = ?
    `).bind(nextOrder, id).run();
    nextOrder++;
  }
  
  return await listBookmarks(db);
}

export async function reorderBookmarkCategories(db: D1Database, order: string[]): Promise<BookmarkRecord[]> {
  await ensureTables(db);
  
  // 清空现有分类顺序
  await db.prepare(`DELETE FROM category_order`).run();
  
  // 插入新的分类顺序
  for (let i = 0; i < order.length; i++) {
    await db.prepare(`
      INSERT INTO category_order (category, "order")
      VALUES (?, ?)
      ON CONFLICT (category) DO UPDATE SET "order" = ?
    `).bind(order[i], i, i).run();
  }
  
  return await listBookmarks(db);
}

export async function getSettings(db: D1Database): Promise<Settings> {
  await ensureTables(db);
  
  const result = await db.prepare(`
    SELECT key, value FROM settings
    WHERE key IN ('theme', 'siteTitle', 'siteIcon')
  `).all();
  
  const settings: Settings = {
    theme: 'light',
    siteTitle: '个人书签',
    siteIcon: '🔖'
  };
  
  (result.results as any[]).forEach(row => {
    const key = row.key as string;
    const value = row.value as string;
    if (key === 'theme') {
      settings.theme = value;
    } else if (key === 'siteTitle') {
      settings.siteTitle = value;
    } else if (key === 'siteIcon') {
      settings.siteIcon = value;
    }
  });
  
  return settings;
}

export async function updateSettings(db: D1Database, data: Partial<Settings>): Promise<Settings> {
  await ensureTables(db);
  
  // 验证 theme
  const validThemes = ['light', 'dark', 'forest', 'ocean', 'sunrise', 'twilight'];
  if (data.theme && !validThemes.includes(data.theme)) {
    throw new Error('主题必须是 light/dark/forest/ocean/sunrise/twilight 之一');
  }
  
  // 验证 siteTitle
  if (data.siteTitle && data.siteTitle.length > 60) {
    throw new Error('站点标题不能超过 60 个字符');
  }
  
  // 验证 siteIcon
  if (data.siteIcon && data.siteIcon.length > 512) {
    throw new Error('站点图标不能超过 512 个字符');
  }
  
  // 更新设置
  if (data.theme !== undefined) {
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('theme', ?, unixepoch())
      ON CONFLICT (key) DO UPDATE SET value = ?, updated_at = unixepoch()
    `).bind(data.theme, data.theme).run();
  }
  
  if (data.siteTitle !== undefined) {
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('siteTitle', ?, unixepoch())
      ON CONFLICT (key) DO UPDATE SET value = ?, updated_at = unixepoch()
    `).bind(data.siteTitle, data.siteTitle).run();
  }
  
  if (data.siteIcon !== undefined) {
    await db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('siteIcon', ?, unixepoch())
      ON CONFLICT (key) DO UPDATE SET value = ?, updated_at = unixepoch()
    `).bind(data.siteIcon, data.siteIcon).run();
  }
  
  return await getSettings(db);
}

