import { createContext } from 'react';

export interface TocTreeContextType {
  addExpandItem: (info: {
    id: number;
    el: HTMLDivElement;
    level: number;
    setSticky: (sticky: boolean) => void;
    setStickyZ: (z?: number) => void;
  }) => void;
  removeExpandItem: (id: number) => void;
}

export const TocTreeContext = createContext<TocTreeContextType>({
  addExpandItem: () => {},
  removeExpandItem: () => {},
});
