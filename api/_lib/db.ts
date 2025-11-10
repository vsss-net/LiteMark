import { randomUUID } from 'crypto';
import { readJson, writeJson } from './storage.js';

export type BookmarkRecord = {
  id: string;
  title: string;
  url: string;
  category?: string;
  description?: string;
  visible: boolean;
};

type BookmarkInput = {
  title: string;
  url: string;
  category?: string;
  description?: string;
  visible: boolean;
};

type SettingsData = {
  theme: string;
  siteTitle: string;
  siteIcon: string;
};

const DEFAULT_SETTINGS: SettingsData = {
  theme: 'light',
  siteTitle: '个人书签',
  siteIcon: '🔖'
};

const SETTINGS_CACHE_TTL = Number(process.env.SETTINGS_CACHE_TTL_MS ?? '60000');
const BOOKMARKS_CACHE_TTL = Number(process.env.BOOKMARKS_CACHE_TTL_MS ?? '60000');

type SettingsCache = {
  value: SettingsData;
};

let settingsCache: SettingsCache | null = null;
let settingsRefreshTimer: NodeJS.Timeout | null = null;

type StoredBookmark = BookmarkRecord & { weight?: number };

type BookmarksCache = {
  value: BookmarkRecord[];
};

let bookmarksCache: BookmarksCache | null = null;
let bookmarksRefreshTimer: NodeJS.Timeout | null = null;

function normalizeCategoryValue(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function bookmarkCategoryKey(bookmark: BookmarkRecord | StoredBookmark): string {
  return normalizeCategoryValue(bookmark.category) ?? '';
}

function normalizeCategoryKeyInput(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function refreshSettingsCache() {
  readJson('settings', DEFAULT_SETTINGS)
    .then((settings) => {
      settingsCache = {
        value: settings
      };
    })
    .catch((error) => {
      console.error('刷新站点设置缓存失败：', error);
    })
    .finally(() => {
      if (SETTINGS_CACHE_TTL > 0) {
        settingsRefreshTimer = setTimeout(refreshSettingsCache, SETTINGS_CACHE_TTL);
      }
    });
}

export async function forceRefreshSettingsCache(): Promise<SettingsData> {
  if (settingsRefreshTimer) {
    clearTimeout(settingsRefreshTimer);
    settingsRefreshTimer = null;
  }
  const settings = await readJson('settings', DEFAULT_SETTINGS);
  settingsCache = {
    value: settings
  };
  ensureSettingsRefreshTimer();
  return settings;
}

function ensureSettingsRefreshTimer() {
  if (SETTINGS_CACHE_TTL <= 0) {
    return;
  }
  if (!settingsRefreshTimer) {
    settingsRefreshTimer = setTimeout(refreshSettingsCache, SETTINGS_CACHE_TTL);
  }
}

function refreshBookmarksCache() {
  readJson('bookmarks', [] as StoredBookmark[])
    .then((records) => {
      bookmarksCache = {
        value: records.map(stripWeight)
      };
    })
    .catch((error) => {
      console.error('刷新书签缓存失败：', error);
    })
    .finally(() => {
      if (BOOKMARKS_CACHE_TTL > 0) {
        bookmarksRefreshTimer = setTimeout(refreshBookmarksCache, BOOKMARKS_CACHE_TTL);
      }
    });
}

function ensureBookmarksRefreshTimer() {
  if (BOOKMARKS_CACHE_TTL <= 0) {
    return;
  }
  if (!bookmarksRefreshTimer) {
    bookmarksRefreshTimer = setTimeout(refreshBookmarksCache, BOOKMARKS_CACHE_TTL);
  }
}

async function loadBookmarks(): Promise<BookmarkRecord[]> {
  if (bookmarksCache) {
    ensureBookmarksRefreshTimer();
    return [...bookmarksCache.value];
  }
  const data = await readJson('bookmarks', [] as StoredBookmark[]);
  const sanitized = data.map(stripWeight);
  bookmarksCache = {
    value: sanitized
  };
  ensureBookmarksRefreshTimer();
  return [...sanitized];
}

async function loadBookmarksFresh(): Promise<BookmarkRecord[]> {
  const data = await readJson('bookmarks', [] as StoredBookmark[]);
  const sanitized = data.map(stripWeight);
  bookmarksCache = {
    value: sanitized
  };
  ensureBookmarksRefreshTimer();
  return [...sanitized];
}

function stripWeight(bookmark: StoredBookmark): BookmarkRecord {
  const { weight: _weight, ...rest } = bookmark;
  return {
    ...rest,
    category: normalizeCategoryValue(rest.category)
  };
}

async function saveBookmarks(bookmarks: BookmarkRecord[]) {
  const sanitized = bookmarks.map((bookmark) => ({
    ...bookmark,
    category: normalizeCategoryValue(bookmark.category)
  }));
  await writeJson('bookmarks', sanitized);
  bookmarksCache = {
    value: sanitized
  };
  if (bookmarksRefreshTimer) {
    clearTimeout(bookmarksRefreshTimer);
    bookmarksRefreshTimer = null;
  }
  ensureBookmarksRefreshTimer();
}

export async function forceRefreshBookmarksCache(): Promise<BookmarkRecord[]> {
  if (bookmarksRefreshTimer) {
    clearTimeout(bookmarksRefreshTimer);
    bookmarksRefreshTimer = null;
  }
  const data = await readJson('bookmarks', [] as StoredBookmark[]);
  const sanitized = data.map(stripWeight);
  bookmarksCache = {
    value: sanitized
  };
  ensureBookmarksRefreshTimer();
  return [...sanitized];
}

async function loadSettings(): Promise<SettingsData> {
  if (settingsCache) {
    ensureSettingsRefreshTimer();
    return settingsCache.value;
  }
  const settings = await readJson('settings', DEFAULT_SETTINGS);
  settingsCache = {
    value: settings
  };
  ensureSettingsRefreshTimer();
  return settings;
}

async function saveSettings(settings: SettingsData) {
  await writeJson('settings', settings);
  settingsCache = {
    value: settings
  };
  if (settingsRefreshTimer) {
    clearTimeout(settingsRefreshTimer);
    settingsRefreshTimer = null;
  }
  ensureSettingsRefreshTimer();
}

export async function getSettings(): Promise<SettingsData> {
  return loadSettings();
}

export async function updateSettings(partial: Partial<SettingsData>): Promise<SettingsData> {
  const current = await loadSettings();
  const next: SettingsData = {
    ...current,
    ...partial,
    theme: partial.theme ?? current.theme,
    siteTitle: partial.siteTitle ?? current.siteTitle,
    siteIcon: partial.siteIcon ?? current.siteIcon
  };
  await saveSettings(next);
  return next;
}

ensureSettingsRefreshTimer();
ensureBookmarksRefreshTimer();

export async function listBookmarks(): Promise<BookmarkRecord[]> {
  return loadBookmarks();
}

export async function createBookmark(data: BookmarkInput): Promise<BookmarkRecord> {
  const bookmarks = await loadBookmarksFresh();
  const bookmark: BookmarkRecord = {
    id: randomUUID(),
    title: data.title,
    url: data.url,
    category: normalizeCategoryValue(data.category),
    description: data.description,
    visible: data.visible
  };
  bookmarks.push(bookmark);
  await saveBookmarks(bookmarks);
  return bookmark;
}

export async function reorderBookmarks(order: string[]): Promise<BookmarkRecord[]> {
  const bookmarks = await loadBookmarksFresh();
  const map = new Map<string, BookmarkRecord>();
  bookmarks.forEach((bookmark) => {
    map.set(bookmark.id, bookmark);
  });

  const reordered: BookmarkRecord[] = [];
  order.forEach((id) => {
    const record = map.get(id);
    if (record) {
      reordered.push(record);
      map.delete(id);
    }
  });

  map.forEach((bookmark) => {
    reordered.push(bookmark);
  });

  await saveBookmarks(reordered);
  return reordered;
}

export async function reorderBookmarkCategories(order: string[]): Promise<BookmarkRecord[]> {
  const bookmarks = await loadBookmarksFresh();
  const categoryMap = new Map<string, BookmarkRecord[]>();
  const originalOrder: string[] = [];

  bookmarks.forEach((bookmark) => {
    const key = bookmarkCategoryKey(bookmark);
    if (!categoryMap.has(key)) {
      categoryMap.set(key, []);
      originalOrder.push(key);
    }
    categoryMap.get(key)!.push(bookmark);
  });

  const requestedOrder: string[] = [];
  order.forEach((value) => {
    const key = normalizeCategoryKeyInput(value);
    if (categoryMap.has(key) && !requestedOrder.includes(key)) {
      requestedOrder.push(key);
    }
  });

  originalOrder.forEach((key) => {
    if (!requestedOrder.includes(key)) {
      requestedOrder.push(key);
    }
  });

  const reordered: BookmarkRecord[] = [];
  requestedOrder.forEach((key) => {
    const items = categoryMap.get(key);
    if (items) {
      reordered.push(...items);
    }
  });

  await saveBookmarks(reordered);
  return reordered;
}

export async function updateBookmark(
  id: string,
  data: BookmarkInput
): Promise<BookmarkRecord | null> {
  const bookmarks = await loadBookmarksFresh();
  const index = bookmarks.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  const existing = bookmarks[index];
  const updated: BookmarkRecord = {
    ...existing,
    title: data.title,
    url: data.url,
    category: normalizeCategoryValue(data.category),
    description: data.description,
    visible: data.visible
  };
  bookmarks[index] = updated;
  await saveBookmarks(bookmarks);
  return updated;
}

export async function deleteBookmark(id: string): Promise<BookmarkRecord | null> {
  const bookmarks = await loadBookmarksFresh();
  const index = bookmarks.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  const [removed] = bookmarks.splice(index, 1);
  await saveBookmarks(bookmarks);
  return removed;
}

