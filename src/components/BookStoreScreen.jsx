import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Folder, Search } from 'lucide-react';
import { db } from '../db/LocalDB';
import { fetchBookCatalog, importCatalogBook } from '../utils/bookCatalog';

export function BookStoreScreen({ settings, themeStyles, onNotify }) {
  const [catalogs, setCatalogs] = useState([]);
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyBook, setBusyBook] = useState(null);
  const [copiedBook, setCopiedBook] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const sources = (settings.bookSources || []).filter((source) => source.enabled);

    Promise.all([
      Promise.all(sources.map(fetchBookCatalog)),
      db.getAllBooks(),
    ]).then(([loadedCatalogs, books]) => {
      if (cancelled) return;
      setCatalogs(loadedCatalogs);
      setLibraryBooks(books);
    }).catch((error) => {
      console.warn('Could not load bookstore:', error);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [settings.bookSources]);

  const books = useMemo(() => catalogs.flatMap(({ source, books: sourceBooks }) => (
    sourceBooks.map((book) => ({ ...book, source }))
  )), [catalogs]);

  const languages = useMemo(() => [...new Set(books.map((book) => book.language).filter(Boolean))].sort(), [books]);
  const filteredBooks = books.filter((book) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || [book.title, book.author, book.description, book.language]
      .some((value) => value?.toLocaleLowerCase().includes(query));
    return matchesSearch && (language === 'all' || book.language === language);
  });

  const isInLibrary = (book) => libraryBooks.some((savedBook) => (
    (book.source.url === 'builtin' && savedBook.defaultBookPath === `/books/${book.file}`)
    || (savedBook.catalogSource === book.source.url && savedBook.catalogBookId === book.id)
  ));

  const handleAddBook = async (book) => {
    const key = `${book.source.url}:${book.id}`;
    setBusyBook(key);
    try {
      await importCatalogBook(book.source, book);
      setLibraryBooks(await db.getAllBooks());
      onNotify(`Added “${book.title}” to your library.`, 'success');
    } catch {
      onNotify(`Could not download “${book.title}”. Check your connection and try again.`, 'error');
    } finally {
      setBusyBook(null);
    }
  };

  const handleCopyLink = async (book) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('addBook', book.id);
    url.searchParams.set('source', book.source.url);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedBook(`${book.source.url}:${book.id}`);
      window.setTimeout(() => setCopiedBook(null), 1800);
    } catch (error) {
      console.warn('Could not copy book link:', error);
      onNotify('Could not copy the link on this device.', 'error');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <header className="mb-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h2 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Book Store</h2>
        <p className={`text-xs ${themeStyles.textMuted}`}>Browse books from your selected sources.</p>
      </header>

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <label className={`flex items-center gap-2 rounded-md border px-3 ${themeStyles.inputBg}`}>
          <Search className="h-4 w-4 shrink-0 opacity-60" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search books"
            aria-label="Search books"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </label>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label="Filter by language"
          className={`min-w-0 w-full rounded-md border px-1.5 text-xs ${themeStyles.inputBg}`}
        >
          <option value="all">All languages</option>
          {languages.map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}
        </select>
      </div>

      {catalogs.some((catalog) => catalog.error) && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400" role="status">
          Some book sources could not be reached.
        </p>
      )}

      {loading ? (
        <p className={`py-8 text-center text-sm ${themeStyles.textMuted}`}>Loading books...</p>
      ) : (
        <div className="space-y-3">
          {catalogs.length === 0 && (
            <p className={`py-8 text-center text-sm ${themeStyles.textMuted}`}>
              No books found. Check your selected sources in Settings.
            </p>
          )}
          {catalogs.map(({ source }) => {
            const sourceBooks = filteredBooks.filter((book) => book.source.url === source.url);
            const sourceHasBooks = books.some((book) => book.source.url === source.url);

            return (
              <details key={source.url} open className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-1">
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${themeStyles.textPrimary}`}>
                    {source.name}
                  </span>
                  <span className={`text-xs ${themeStyles.textMuted}`}>{sourceBooks.length}</span>
                </summary>
                {sourceBooks.length === 0 ? (
                  <p className={`py-4 text-center text-sm ${themeStyles.textMuted}`}>
                    {sourceHasBooks ? 'No books match your search.' : 'No books in this source.'}
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-2.5">
                    {sourceBooks.map((book) => {
                      const key = `${book.source.url}:${book.id}`;
                      const added = isInLibrary(book);
                      return (
                        <article key={key} className={`rounded-md border p-3 ${themeStyles.cardBg}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className={`text-sm font-semibold ${themeStyles.textPrimary}`}>{book.title}</h3>
                              <p className={`mt-1 text-xs ${themeStyles.textMuted}`}>
                                {book.author || 'Unknown author'}{book.language ? ` · ${book.language.toUpperCase()}` : ''}
                              </p>
                            </div>
                            {book.file && (
                              <button
                                type="button"
                                onClick={() => handleCopyLink(book)}
                                aria-label={`Copy add link for ${book.title}`}
                                title="Copy automatic add link"
                                className={`shrink-0 rounded p-1.5 ${themeStyles.textMuted} hover:text-amber-500`}
                              >
                                {copiedBook === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          {book.description && <p className={`mt-2 text-sm ${themeStyles.textMuted}`}>{book.description}</p>}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {book.file && (
                              <button
                                type="button"
                                onClick={() => handleAddBook(book)}
                                disabled={added || busyBook === key}
                                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-default disabled:opacity-60"
                              >
                                {added ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                {added ? 'In Library' : busyBook === key ? 'Adding...' : book.purchaseUrl ? 'Download preview' : 'Add to Library'}
                              </button>
                            )}
                            {book.purchaseUrl && (
                              <a
                                href={book.purchaseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${themeStyles.btnSecondary}`}
                              >
                                {book.file ? 'Purchase' : 'View / purchase'}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}