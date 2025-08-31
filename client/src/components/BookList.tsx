import React from 'react';
import type { BookInfo } from '../utils/types';

export interface BookListProps {
  className?: string;
  style?: React.CSSProperties;
  books: BookInfo[];
  onOpenBook?: (id: BookInfo['uuid']) => void;
}

export const BookList = ({
  style,
  className,
  books,
  onOpenBook,
}: BookListProps) => {
  return (
    <div className="grid gap-16 lt-sm:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 p-8 cursor-pointer overflow-y-auto overflow-x-hidden">
      {books.map(({ uuid, cover, title }) => {
        return (
          <div
            key={uuid}
            className="flex flex-col items-center gap-4"
            onClick={() => {
              onOpenBook?.(uuid);
            }}
          >
            {/* border radius classname */}
            <div className="w-16 h-auto flex rounded-md overflow-hidden lg:w-[10vw] max-w-60 min-w-26 outline-width-1 outline-solid outline-[#aaa]">
              <img
                className="w-full h-full object-cover position-relative"
                src={`${cover}`}
              />
            </div>
            <span className="text-size-sm text-align-center">{title}</span>
          </div>
        );
      })}
    </div>
  );
};
