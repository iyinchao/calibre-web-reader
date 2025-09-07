// /src/db/index.ts
import Dexie, { type Table } from 'dexie';
import { v1Schema, type BookInfoV1, type BookCacheV1 } from './v1';

// --- 1. 导出公开的数据模型 ---
export type BookInfo = BookInfoV1;
export type BookCache = BookCacheV1;

// --- 2. Dexie 数据库类 ---
class CalibreWebReaderDB extends Dexie {
  bookInfo!: Table<BookInfo>;
  bookCache!: Table<BookCache>;

  constructor() {
    super('CalibreWebReaderDB');
    this.version(1).stores(v1Schema);
  }
}

// --- 3. 导出数据库单例 ---
export const db = new CalibreWebReaderDB();

// --- 4. 核心缓存管理逻辑 ---

/**
 * 检查存储配额并根据需要清理空间。
 * @param neededSize - 新文件需要占用的空间大小
 * @param highWaterMark - 存储占用率达到多少时触发清理 (例如 0.9 表示 90%)
 * @param lowWaterMark - 清理到占用率低于多少时停止 (例如 0.7 表示 70%)
 */
async function ensureStorage(
  neededSize: number,
  highWaterMark = 0.9,
  lowWaterMark = 0.7
) {
  if (!navigator.storage?.estimate) {
    console.warn(
      'StorageManager API not supported. Cannot perform automatic cache eviction.'
    );
    return;
  }

  const estimate = await navigator.storage.estimate();
  const quota = estimate.quota ?? 0;
  const currentUsage = estimate.usage ?? 0;

  if (quota === 0) return; // No quota limit

  const usageRatio = currentUsage / quota;

  // 如果当前使用率加上新文件大小超过了高水位线，则开始清理
  if (
    usageRatio > highWaterMark ||
    (currentUsage + neededSize) / quota > highWaterMark
  ) {
    console.log(
      `Storage usage ${usageRatio.toFixed(2)} > ${highWaterMark}. Evicting old cache...`
    );

    const targetUsage = quota * lowWaterMark;
    let usageAfterEviction = currentUsage;

    // 找到所有书籍信息，按 LRU 排序 (最旧的在前)
    const lruBooks = await db.bookInfo.orderBy('lastOpenedAt').toArray();

    for (const book of lruBooks) {
      if (usageAfterEviction <= targetUsage) {
        break; // 已经清理到足够空间
      }

      const cachesToDelete = await db.bookCache
        .where('bookId')
        .equals(book.id)
        .toArray();
      const sizeToFree = cachesToDelete.reduce(
        (sum, cache) => sum + cache.size,
        0
      );

      console.log(`Evicting book "${book.id}" to free ${sizeToFree} bytes.`);
      await deleteBook(book.id); // 使用下面的 deleteBook 事务
      usageAfterEviction -= sizeToFree;
    }
  }
}

/**
 * 添加书籍缓存，并在此之前自动管理存储空间。
 * 这是推荐使用的添加缓存的方法。
 * @param cache - 要添加的书籍缓存对象
 */
export async function addBookCacheWithManagement(cache: BookCache) {
  await ensureStorage(cache.size);
  await db.bookCache.put(cache);
}

// --- 5. 数据库操作辅助函数 ---

/**
 * 添加或更新书籍的元数据信息。
 * @param info - 书籍信息
 */
export async function addBookInfo(info: BookInfo): Promise<string> {
  return await db.bookInfo.put(info);
}

/**
 * 更新一本书的 "上次打开时间" 为当前时间。
 * @param bookId - 书籍 ID
 */
export async function touchBook(bookId: string): Promise<void> {
  await db.bookInfo.update(bookId, { lastOpenedAt: new Date() });
}

/**
 * 获取书籍信息
 * @param id - 书籍 ID
 */
export async function getBookInfo(id: string): Promise<BookInfo | undefined> {
  return await db.bookInfo.get(id);
}

/**
 * 获取所有书籍信息，按上次打开时间降序排列 (最近打开的在前)
 */
export async function getAllBookInfoByLastOpened(): Promise<BookInfo[]> {
  return await db.bookInfo.orderBy('lastOpenedAt').reverse().toArray();
}

/**
 * 获取一本书的特定格式缓存
 * @param bookId - 书籍 ID
 * @param format - 文件格式
 */
export async function getBookCache(
  bookId: string,
  format: string
): Promise<BookCache | undefined> {
  return await db.bookCache.get([bookId, format]);
}

/**
 * 获取一本书的所有可用格式缓存
 * @param bookId - 书籍 ID
 */
export async function getAllBookCaches(bookId: string): Promise<BookCache[]> {
  return await db.bookCache.where('bookId').equals(bookId).toArray();
}

/**
 * 删除一本书籍（包括其所有格式的缓存和元数据）
 * @param id - 书籍 ID
 */
export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', db.bookInfo, db.bookCache, async () => {
    // 查找并删除所有关联的缓存
    const cachesToDelete = await db.bookCache
      .where('bookId')
      .equals(id)
      .primaryKeys();
    if (cachesToDelete.length > 0) {
      await db.bookCache.bulkDelete(cachesToDelete);
    }
    // 删除书籍信息
    await db.bookInfo.delete(id);
  });
}

/**
 * 获取当前所有缓存占用的总空间大小
 */
export async function getStorageUsage(): Promise<number> {
  const caches = await db.bookCache.toArray();
  return caches.reduce((total, cache) => total + cache.size, 0);
}
