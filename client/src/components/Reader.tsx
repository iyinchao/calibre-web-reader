import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { AppContext } from '../context';
import type { BookTocType } from '../utils/types';
import { TocItem, type TocItemProps } from './TocItem';
import { TocTree } from './TocTree';

// import { View } from '/3rdparty/foliate-js/view.js?url';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const View = window.__foliateView;

const supportedBookFormat = [
  'pdf',
  'epub',
  'mobi',
  'fb2',
  'cbz',
  'azw3',
] as const;

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
  const bgClickerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewRef = useRef<any>(null);

  const [showCotrols, setShowControls] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toc, setToc] = useState<TocItemProps[]>([]);

  useEffect(() => {
    if (!showCotrols) {
      setShowMenu(false);
    }
  }, [showCotrols]);

  useEffect(() => {
    if (!bookId || !readerRef.current) {
      return;
    }
    const bookInfo = bookIdMap.get(bookId);
    if (!bookInfo) {
      return;
    }

    initCustomElement();
    const renderEl = readerRef.current;
    const view = document.createElement('foliate-view');
    view.id = 'foliate-view';
    // view.setAttribute('autohide-cursor', '');
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
      // console.log('location changed');
      // console.log(e.detail);
    });
    viewTyped.addEventListener('load', () => {
      // console.log('load');
    });
    viewTyped.addEventListener('relocate', () => {
      // console.log('relocate');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewTyped.addEventListener('click-background', (e: any) => {
      if (bgClickerRef.current) {
        // console.log('click background', e.detail);
        const { clientX, clientY } = e.detail;
        console.log(clientX, clientY);

        const candidates = bgClickerRef.current.querySelectorAll(
          '[data-click-receiver]'
        );
        let target: null | HTMLElement = null;
        for (const el of candidates) {
          const rect = el.getBoundingClientRect();
          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            target = el as HTMLElement;
            break;
          }
        }

        if (target) {
          target.dispatchEvent(
            new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: e.detail.clientX,
              clientY: e.detail.clientY,
            })
          );
        }
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewTyped.history.addEventListener('index-change', (e: any) => {
      console.log(e);
      setCanGoForward(viewTyped.history.canGoForward);
      setCanGoBack(viewTyped.history.canGoBack);
    });

    const loadBook = async () => {
      const blobData = await (await fetch(supportedFormats[0])).blob();
      const file = new File([blobData], bookInfo.title);

      await viewTyped.open(file);
      viewTyped.renderer.next();
    };

    loadBook()
      .then(() => {
        const processTocItem = (
          item: BookTocType
        ): TocItemProps & { id: number } => {
          return {
            id: item.id,
            label: item.label,
            href: item.href,
            subitems: item.subitems?.map(processTocItem),
          };
        };

        setToc((viewTyped.book.toc as BookTocType[]).map(processTocItem));
      })
      .catch(e => {
        console.log(e);
      });

    return () => {
      renderEl.removeChild(view);
      viewTyped.close();
    };
  }, [bookId, bookIdMap]);

  // console.log(bookId, bookIdMap, bookIdMap.get(parseInt(bookId as any)));

  return (
    <div className="h-full">
      <div className="absolute w-full h-full flex" ref={bgClickerRef}>
        <div
          data-click-receiver
          className="h-full flex-1"
          onClick={() => {
            viewRef.current?.renderer?.prev();
          }}
        />
        <div
          data-click-receiver
          className="h-full flex-1"
          onClick={() => {
            setShowControls(v => !v);
          }}
        />
        <div
          data-click-receiver
          className="h-full flex-1"
          onClick={() => {
            viewRef.current?.renderer?.next();
          }}
        />
      </div>
      <div ref={readerRef} className="h-full w-full relative" />
      <div
        className={clsx(
          'absolute w-full h-full flex left-0 top-0 transition-all transition-duration-300 pointer-events-none',
          {
            ['opacity-0']: !showCotrols,
            ['opacity-100']: showCotrols,
          }
        )}
      >
        <div
          className={clsx(
            'h-100vh h-[100dvh] pt-[40px] absolute left-0 min-w-60 max-w-80 w-30vw bg-[rgba(180,180,180,0.5)] transition-all duration-200 shadow backdrop-blur-10',
            {
              ['translate-x--100%']: !showMenu,
              ['translate-x-0 pointer-events-auto']: showMenu,
            }
          )}
        >
          <TocTree
            toc={toc}
            onClick={href => {
              viewRef.current?.goTo(href);
            }}
          ></TocTree>
        </div>
        <div className="flex gap-2 h-fit">
          <div
            className={clsx('text-3xl i-mdi-menu cursor-pointer', {
              ['pointer-events-none']: !showCotrols,
              ['pointer-events-auto']: showCotrols,
            })}
            onClick={() => {
              setShowMenu(v => !v);
            }}
          />
          <div
            className={clsx('flex gap-2', {
              ['pointer-events-none']: !showCotrols,
              ['pointer-events-auto']: showCotrols,
            })}
          >
            <div
              className={clsx('text-3xl i-mdi-chevron-left cursor-pointer', {
                ['color-black']: canGoBack,
                ['color-gray-400']: !canGoBack,
              })}
            ></div>
            <div
              className={clsx('text-3xl i-mdi-chevron-right cursor-pointer', {
                ['color-black']: canGoBack,
                ['color-gray-400']: !canGoBack,
              })}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
