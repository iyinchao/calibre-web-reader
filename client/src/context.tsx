import { createContext } from 'react';
import type { BookInfo } from './utils/types';

export const AppContext = createContext<{
  bookList: BookInfo[];
  bookIdMap: Map<BookInfo['uuid'], BookInfo>;
}>({
  bookList: [],
  bookIdMap: new Map(),
});
