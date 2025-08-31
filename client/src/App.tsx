import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useMatch,
  useNavigate,
} from 'react-router-dom';
import { type BookInfo } from './utils/types';
import { BookList } from './components/BookList';
import { Reader } from './components/Reader';
import { AppContext } from './context';

// const getCSS = ({ spacing, justify, hyphenate }) => `
//     @namespace epub "http://www.idpf.org/2007/ops";
//     html {
//         color-scheme: light dark;
//         font-family: 'LXGW WenKai Screen';
//     }
//     /* https://github.com/whatwg/html/issues/5426 */
//     @media (prefers-color-scheme: dark) {
//         a:link {
//             color: lightblue;
//         }
//     }
//     p, li, blockquote, dd {
//         line-height: ${spacing};
//         text-align: ${justify ? 'justify' : 'start'};
//         -webkit-hyphens: ${hyphenate ? 'auto' : 'manual'};
//         hyphens: ${hyphenate ? 'auto' : 'manual'};
//         -webkit-hyphenate-limit-before: 3;
//         -webkit-hyphenate-limit-after: 2;
//         -webkit-hyphenate-limit-lines: 2;
//         hanging-punctuation: allow-end last;
//         widows: 2;
//     }
//     /* prevent the above from overriding the align attribute */
//     [align="left"] { text-align: left; }
//     [align="right"] { text-align: right; }
//     [align="center"] { text-align: center; }
//     [align="justify"] { text-align: justify; }

//     pre {
//         white-space: pre-wrap !important;
//     }
//     aside[epub|type~="endnote"],
//     aside[epub|type~="footnote"],
//     aside[epub|type~="note"],
//     aside[epub|type~="rearnote"] {
//         display: none;
//     }
// `

function App() {
  const stateRef = useRef<{
    foliateInited: boolean;
  }>({
    foliateInited: false,
  });

  const [bookList, setBookList] = useState<BookInfo[]>([]);
  const bookIdMap = useMemo(() => {
    return bookList.reduce((acc, cur) => {
      acc.set(cur.uuid, cur);
      return acc;
    }, new Map<BookInfo['uuid'], BookInfo>());
  }, [bookList]);

  const navigate = useNavigate();

  useEffect(() => {
    // if (!stateRef.current.foliateInited) {
    //   console.log(View);
    //   customElements.define('foliate-view', View);
    //   const view = document.createElement('foliate-view');
    //   document.body.append(view);
    //   view.style.width = '100vw';
    //   view.style.height = '100vh';
    //   view.style.position = 'absolute';
    //   view.style.left = '0';
    //   view.style.top = '0';
    //   view.addEventListener('relocate', e => {
    //     console.log('location changed');
    //     console.log(e.detail);
    //   });
    //   stateRef.current.foliateInited = true;
    //   const loadBook = async function () {
    //     const blob = await (await fetch(bookFile)).blob();
    //     const file = new File([blob], '我的第一本算法书 - [日]石田保辉.epub');
    //     console.log(blob);
    //     await view.open(file);
    //     view.addEventListener('load', () => {
    //       console.log('load')
    //     })
    //     view.addEventListener('relocate', () => {
    //       console.log('relocate')
    //     })
    //     const { book } = view
    //     book.transformTarget?.addEventListener('data', ({ detail }) => {
    //       detail.data = Promise.resolve(detail.data).catch(e => {
    //         console.error(new Error(`Failed to load ${detail.name}`, { cause: e }))
    //         return ''
    //       })
    //     })
    //     view.renderer.setStyles?.(getCSS({
    //       spacing: 1.4,
    //       justify: true,
    //       hyphenate: true,
    //     }))
    //     view.renderer.next();
    //     console.log(view);
    //     window.addEventListener('keydown', (e) => {
    //       if (e.key === 'ArrowLeft') {
    //         view.goLeft();
    //       } else if (e.key === 'ArrowRight') {
    //         view.goRight();
    //       }
    //     }, {
    //       capture: true
    //     })
    //   }
    //   loadBook();
    // }
  }, []);

  // console.log(bookFile)

  useEffect(() => {
    const abortController = new AbortController();
    const getBookList = async () => {
      try {
        const list = await fetch('/api/list', {
          signal: abortController.signal,
        });
        const listData = await list.json();
        return listData;
      } catch (e) {
        throw e;
      }
    };

    getBookList().then(list => {
      console.log(list);
      setBookList(list);
    });

    return () => {
      abortController.abort('cancel');
    };
  }, []);

  return (
    <AppContext.Provider value={{ bookList, bookIdMap }}>
      <div className="w-screen h-[100dvh] flex flex-col">
        <nav className="bg-gray-100 h-0">
          {/* <Link to="/" className="mr-4">
          Home
        </Link>
        <Link to="/about">About</Link> */}
        </nav>
        <div className="text-primary-0 flex-1 min-h-0">
          <Routes>
            <Route
              path="/"
              element={
                <BookList
                  books={bookList}
                  onOpenBook={id => {
                    const bookInfo = bookIdMap.get(id);
                    if (bookInfo) {
                      // router go to /read
                      navigate(`/read/${bookInfo?.uuid}`);
                    }
                  }}
                ></BookList>
              }
            />
            <Route path="/read/:bookId" element={<Reader />} />
          </Routes>
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;
