import { createContext } from 'react';
import type { BookInfo } from './utils/types';

export const AppContext = createContext<{
  bookList: BookInfo[];
  bookIdMap: Map<number, BookInfo>;
}>({
  bookList: [],
  bookIdMap: new Map(),
});
