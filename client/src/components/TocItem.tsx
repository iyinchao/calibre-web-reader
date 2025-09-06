import clsx from 'clsx';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { TocTreeContext } from './TocTreeContext';

export interface TocItemProps {
  id: number;
  label: ReactNode;
  href?: string;
  onClick?: (href: string, id: number) => void;
  subitems?: TocItemProps[];
  level?: number;
}

export const TocItem = ({
  id,
  label,
  href,
  onClick,
  subitems,
  level = 0,
}: TocItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [stickyZ, setStickyZ] = useState<number | undefined>(undefined);
  const titleRowRef = useRef<HTMLDivElement>(null);
  const TreeContext = useContext(TocTreeContext);

  useEffect(() => {
    if (!titleRowRef.current) {
      return;
    }

    if (expanded) {
      TreeContext.addExpandItem({
        id,
        el: titleRowRef.current,
        level,
        setSticky,
        setStickyZ,
      });
    }

    return () => {
      TreeContext.removeExpandItem(id);
    };
  }, [expanded, TreeContext]);

  return (
    <div className="flex flex-col">
      <div
        onClick={() => {
          if (href) {
            onClick?.(href, id);
          }
        }}
        data-id={id}
        className={clsx(
          'p-x-2 p-y-1 cursor-pointer relative flex items-center',
          {
            ['sticky']: expanded,
            ['bg-gray-2']: sticky,
          }
        )}
        style={{
          top: expanded ? level * 32 : undefined,
          zIndex: sticky ? stickyZ : undefined,
        }}
        ref={titleRowRef}
      >
        <div className="shrink-0" style={{ marginLeft: level * 20 }}>
          {subitems?.length ? (
            <div
              className={clsx(
                'size-[20px] scale-120',
                expanded ? 'i-mdi-menu-down' : 'i-mdi-menu-right'
              )}
              onClick={e => {
                e.stopPropagation();
                setExpanded(v => !v);
              }}
            ></div>
          ) : (
            <div className={'size-[20px]'}></div>
          )}
        </div>
        <span className="text-ellipsis whitespace-nowrap overflow-hidden">
          {label}
        </span>
      </div>
      {subitems?.length && expanded && (
        <div>
          {subitems?.map(props => {
            return (
              <TocItem
                {...props}
                level={level + 1}
                onClick={onClick}
                key={props.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
