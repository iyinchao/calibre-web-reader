import clsx from 'clsx';
import { TocItem, type TocItemProps } from './TocItem';
import { useCallback, useEffect, useRef } from 'react';
import { TocTreeContext, type TocTreeContextType } from './TocTreeContext';

export interface TocTreeProps {
  className?: string;
  style?: React.CSSProperties;
  toc: TocItemProps[];
  onClick: (href: string, id: number) => void;
}

export const TocTree = ({ className, style, toc, onClick }: TocTreeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<{
    expandedItems: Map<
      number,
      Parameters<TocTreeContextType['addExpandItem']>[0]
    >;
    expandedItemsSorted: Parameters<TocTreeContextType['addExpandItem']>[0][];
    observer: IntersectionObserver | null;
  }>({
    expandedItems: new Map(),
    expandedItemsSorted: [],
    observer: null,
  });

  const sortExpandedItems = useCallback(() => {
    stateRef.current.expandedItemsSorted = Array.from(
      stateRef.current.expandedItems.values()
    ).sort((a, b) => {
      return a.id - b.id;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const containerEl = containerRef.current;

    const onScroll = () => {
      let hasReachedLastSticky = false;
      const stickyItems: { id: number; level: number }[] = [];
      for (const item of stateRef.current.expandedItemsSorted) {
        if (hasReachedLastSticky) {
          item.setSticky(false);
          item.setStickyZ();
          continue;
        }

        const itemRect = item.el.getBoundingClientRect();
        if (!item.el.nextSibling) {
          item.setSticky(false);
          item.setStickyZ();
          continue;
        }
        const nextItemRect = (
          item.el.nextSibling as HTMLDivElement
        ).getBoundingClientRect();

        if (itemRect.bottom >= nextItemRect.top + 1) {
          item.setSticky(true);
          item.setStickyZ();
          stickyItems.push({ id: item.id, level: item.level });
        } else {
          item.setSticky(false);
          item.setStickyZ();
          hasReachedLastSticky = true;
        }
      }

      const maxLevel = Math.max(...stickyItems.map(item => item.level));
      for (const item of stickyItems) {
        stateRef.current.expandedItems
          .get(item.id)
          ?.setStickyZ(maxLevel + 1 - item.level);
      }
    };

    containerEl.addEventListener('scroll', onScroll, {
      passive: true,
    });
    return () => {
      containerEl.removeEventListener('scroll', onScroll);
    };
  }, []);

  const addExpandItem = useCallback<TocTreeContextType['addExpandItem']>(
    data => {
      stateRef.current.expandedItems.set(data.id, data);
      sortExpandedItems();
    },
    []
  );
  const removeExpandItem = useCallback<TocTreeContextType['removeExpandItem']>(
    id => {
      if (stateRef.current.expandedItems.has(id)) {
        const item = stateRef.current.expandedItems.get(id)!;
        stateRef.current.observer?.unobserve(item.el);
        stateRef.current.expandedItems.delete(id);
        sortExpandedItems();
      }
    },
    []
  );

  return (
    <TocTreeContext.Provider value={{ addExpandItem, removeExpandItem }}>
      <div
        className={clsx('overflow-y-auto overflow-x-hidden h-full', className)}
        style={style}
        ref={containerRef}
      >
        {toc.map(item => {
          return <TocItem key={item.id} {...item} onClick={onClick}></TocItem>;
        })}
      </div>
    </TocTreeContext.Provider>
  );
};
