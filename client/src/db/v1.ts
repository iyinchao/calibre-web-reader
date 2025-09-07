// /src/db/v1.ts

// --- 版本 1 的数据模型 ---

/**
 * 书籍元数据。只包含书本自身的信息，与文件格式无关。
 */
export interface BookInfoV1 {
  id: string; // 书籍的唯一标识
  lastOpenedAt: Date; // 上次打开这本书 (无论何种格式) 的时间
}

/**
 * 书籍文件缓存。代表一个特定格式的缓存文件。
 */
export interface BookCacheV1 {
  bookId: string; // 关联 BookInfo 的 id
  format: 'epub' | 'pdf' | 'mobi' | string; // 文件格式, e.g., 'epub'
  bookHash: string; // 此文件的哈希值
  size: number; // 此文件的大小（字节）
  data: Blob; // 文件本身
}

// --- 版本 1 的 Schema 定义 ---

export const v1Schema = {
  // bookInfo:
  // &id: 主键
  // lastOpenedAt: 索引，用于 LRU
  bookInfo: '&id, lastOpenedAt',

  // bookCache:
  // [bookId+format]: 复合主键，确保一本书的同一种格式只有一个缓存
  // bookId: 索引，用于快速查找一本书的所有缓存格式
  bookCache: '[bookId+format], bookId',
};
