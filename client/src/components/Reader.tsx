import { useContext, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../context';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { View } from '../../3rdparty/foliate-js/view.js';

const supportedBookFormat = ['pdf', 'epub', 'mobi', 'fb2', 'cbz'] as const;

let isCustomElementInit = false;
const initCustomElement = () => {
  if (isCustomElementInit) {
    return;
  }
  customElements.define('foliate-view', View);
  isCustomElementInit = true;
};

export const Reader = () => {
  const { bookId } = useParams();
  const { bookIdMap } = useContext(AppContext);
  const readerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewRef = useRef<any>(null);

  useEffect(() => {
    if (!bookId || !readerRef.current) {
      return;
    }
    const bookInfo = bookIdMap.get(parseInt(bookId));
    if (!bookInfo) {
      return;
    }

    initCustomElement();
    const renderEl = readerRef.current;
    const view = document.createElement('foliate-view');
    view.id = 'foliate-view';
    renderEl.appendChild(view);

    const supportedFormats = bookInfo.formats.filter(filePath => {
      if (supportedBookFormat.some(format => filePath.endsWith(`.${format}`))) {
        return true;
      }
      return false;
    });

    if (supportedFormats.length === 0) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewTyped = view as any;

    viewTyped.className = 'h-full w-full';

    viewRef.current = viewTyped;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewTyped.addEventListener('relocate', (e: any) => {
      console.log('location changed');
      console.log(e.detail);
    });
    viewTyped.addEventListener('load', () => {
      console.log('load');
    });
    viewTyped.addEventListener('relocate', () => {
      console.log('relocate');
    });

    const loadBook = async () => {
      const blobData = await (await fetch(supportedFormats[0])).blob();
      const file = new File([blobData], bookInfo.title);

      await viewTyped.open(file);
      viewTyped.renderer.next();
    };

    loadBook();

    return () => {
      renderEl.removeChild(view);
      viewTyped.close();
    };
  }, [bookId, bookIdMap]);

  // console.log(bookId, bookIdMap, bookIdMap.get(parseInt(bookId as any)));

  return (
    <div className="h-full">
      <div ref={readerRef} className="h-full w-full relative">
        <div className="absolute w-full h-full z-1 flex">
          <div
            className="h-full flex-1"
            onClick={() => {
              viewRef.current?.renderer?.prev();
            }}
          ></div>
          <div
            className="h-full flex-1"
            onClick={() => {
              viewRef.current?.renderer?.next();
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};
