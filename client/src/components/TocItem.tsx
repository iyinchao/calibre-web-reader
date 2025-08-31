import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

export interface TocItemProps {
  label: ReactNode;
  href?: string;
  onClick?: (href: string) => void;
  subitems?: TocItemProps[];
  level?: number;
}

export const TocItem = ({
  label,
  href,
  onClick,
  subitems,
  level = 0,
}: TocItemProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1" style={{ paddingLeft: 20 }}>
      <div
        onClick={() => {
          if (href) {
            onClick?.(href);
          }
        }}
        className={clsx(
          'p-x-2 p-y-1 cursor-pointer relative flex items-center',
          {
            ['sticky top-0']: subitems?.length && expanded,
          }
        )}
      >
        {subitems?.length ? (
          <div
            className={clsx(
              'size-[20px]',
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
        {label}
      </div>
      {subitems?.length && expanded && (
        <div>
          {subitems?.map((props, idx) => {
            return (
              <TocItem
                {...props}
                level={level + 1}
                onClick={onClick}
                key={idx}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
