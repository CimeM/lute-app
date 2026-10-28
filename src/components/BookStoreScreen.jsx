import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Folder, Search, X } from 'lucide-react';
import { db } from '../db/LocalDB';
import { fetchBookCatalog, getCatalogBookCoverUrl, importCatalogBook } from '../utils/bookCatalog';

const LANGUAGE_FLAGS = {
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  hr: '🇭🇷',
  it: '🇮🇹',
  nl: '🇳🇱',
  ru: '🇷🇺',
  sl: '🇸🇮',
  sk: '🇸🇰',
  sr: '🇷🇸',
};

const getLanguageLabel = (code) => {
  const baseLanguage = code.toLowerCase().split(/[-_]/)[0];
  return `${LANGUAGE_FLAGS[baseLanguage] || '🌐'} ${code.toUpperCase()}`;
};

export function BookStoreScreen({ settings, themeStyles, onNotify, onBookAdded, onSaveSettings }) {
  const [catalogs, setCatalogs] = useState([]);
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState(settings.storeLanguage || 'all');
  const [loading, setLoading] = useState(true);
  const [busyBook, setBusyBook] = useState(null);
  const [copiedBook, setCopiedBook] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    if (!selectedBook) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedBook(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBook]);

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
    sourceBooks
      .filter((book) => book.addToLibrary !== true)
      .map((book) => ({ ...book, source }))
  )), [catalogs]);

  const languages = useMemo(() => [...new Set(books.map((book) => book.language).filter(Boolean))].sort(), [books]);
  const filteredBooks = books.filter((book) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || [book.title, book.author, book.description, book.language, ...(book.tags || [])]
      .some((value) => value?.toLocaleLowerCase().includes(query));
    return matchesSearch && (language === 'all' || book.language === language);
  });

  const isInLibrary = (book) => libraryBooks.some((savedBook) => (
    (book.source.url === 'builtin' && savedBook.defaultBookPath === `/books/${book.file}`)
    || (savedBook.catalogSource === book.source.url && savedBook.catalogBookId === book.id)
  ));

  const selectLanguage = (storeLanguage) => {
    setLanguage(storeLanguage);
    onSaveSettings({ ...settings, storeLanguage });
  };

  const handleAddBook = async (book) => {
    const key = `${book.source.url}:${book.id}`;
    setBusyBook(key);
    try {
      await importCatalogBook(book.source, book);
      setLibraryBooks(await db.getAllBooks());
      onNotify(`Added “${book.title}” to your library.`, 'success');
      onBookAdded?.();
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
      {!loading && !settings.storeLanguage && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-language-title"
            className={`max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-lg border p-5 shadow-xl ${themeStyles.cardBg} ${themeStyles.textPrimary}`}
          >
            <h2 id="store-language-title" className="text-lg font-semibold">Choose a language</h2>
            <p className={`mb-4 mt-1 text-sm ${themeStyles.textMuted}`}>
              Choose which language to browse in the store.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectLanguage('all')}
                className={`col-span-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium ${themeStyles.btnSecondary}`}
              >
                🌐 All languages
              </button>
              {languages.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => selectLanguage(code)}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm font-medium ${themeStyles.btnSecondary}`}
                >
                  {getLanguageLabel(code)}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <header className="mb-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h2 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Book Store</h2>
        <p className={`text-xs ${themeStyles.textMuted}`}>Browse books from your selected sources.</p>
      </header>

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-2">
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
        <label className={`flex min-w-0 flex-col gap-1 text-[11px] ${themeStyles.textMuted}`}>
          Material language
          <select
            value={language}
            onChange={(event) => selectLanguage(event.target.value)}
            className={`min-w-0 w-full rounded-md border px-1.5 py-2 text-xs ${themeStyles.inputBg}`}
          >
            <option value="all">🌐 All languages</option>
            {languages.map((code) => <option key={code} value={code}>{getLanguageLabel(code)}</option>)}
          </select>
        </label>
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
                  <div className="mt-2 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {sourceBooks.map((book) => {
                      const key = `${book.source.url}:${book.id}`;
                      const added = isInLibrary(book);
                      return (
                        <article key={key} className={`rounded-md border p-3 shadow-md transition-shadow hover:shadow-lg ${themeStyles.cardBg}`}>
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedBook(book)}
                              aria-label={`View details for ${book.title}`}
                              className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
                            >
                              <img
                                src={getCatalogBookCoverUrl(book.source, book)}
                                alt={`Cover of ${book.title}`}
                                onError={(event) => { event.currentTarget.src = '/images/default-book-cover.svg'; }}
                                className="h-[5.5rem] w-16 rounded-md border border-black/10 object-cover shadow-sm"
                              />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className={`break-words text-sm font-semibold ${themeStyles.textPrimary}`}>
                                    <button type="button" onClick={() => setSelectedBook(book)} className="text-left hover:text-amber-500">
                                      {book.title}
                                    </button>
                                  </h3>
                                  <p className={`mt-1 text-xs ${themeStyles.textMuted}`}>
                                    {book.author || 'Unknown author'}{book.language ? ` · ${getLanguageLabel(book.language)}` : ''}
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
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {book.file && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddBook(book)}
                                    disabled={added || busyBook === key}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-default disabled:opacity-60"
                                  >
                                    {added ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                    {added ? 'In Library' : busyBook === key ? 'Adding...' : book.purchaseUrl ? 'Get preview' : 'Add to Library'}
                                  </button>
                                )}
                                {book.purchaseUrl && (
                                  <a
                                    href={book.purchaseUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-1.5 bg-amber-500 rounded-md border px-3 py-1.5 text-xs font-medium ${themeStyles.btnSecondary}`}
                                  >
                                    {book.file ? book.price? book.price.toFixed(2) + '€' : 'Purchase' : 'View / purchase'}
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
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

      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedBook(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-details-title"
            className={`max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-lg border p-4 shadow-xl sm:p-6 ${themeStyles.cardBg} ${themeStyles.textPrimary}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="book-details-title" className="text-lg font-semibold">{selectedBook.title}</h2>
                <p className={`mt-1 text-sm ${themeStyles.textMuted}`}>
                  {selectedBook.author || 'Unknown author'}{selectedBook.language ? ` · ${getLanguageLabel(selectedBook.language)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                aria-label="Close book details"
                className={`shrink-0 rounded p-1.5 ${themeStyles.textMuted} hover:bg-black/5 hover:text-amber-500 dark:hover:bg-white/10`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <img
                src={getCatalogBookCoverUrl(selectedBook.source, selectedBook)}
                alt={`Cover of ${selectedBook.title}`}
                onError={(event) => { event.currentTarget.src = '/images/default-book-cover.svg'; }}
                className="h-44 w-32 rounded-md border border-black/10 object-cover shadow-sm"
              />
              <div className="min-w-0 space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className={`font-semibold ${themeStyles.textMuted}`}>Language</dt>
                    <dd>{selectedBook.language ? getLanguageLabel(selectedBook.language) : 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className={`font-semibold ${themeStyles.textMuted}`}>Source</dt>
                    <dd>{selectedBook.source.name}</dd>
                  </div>
                  {selectedBook.tags?.length > 0 && (
                    <div className="col-span-2">
                      <dt className={`font-semibold ${themeStyles.textMuted}`}>Topics</dt>
                      <dd>{selectedBook.tags.join(', ')}</dd>
                    </div>
                  )}
                </dl>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">About this book</h3>
                  <p className={`whitespace-pre-line text-sm leading-relaxed ${themeStyles.textMuted}`}>
                    {selectedBook.description || 'No description is available for this book.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {selectedBook.file && (
                <button
                  type="button"
                  onClick={() => handleAddBook(selectedBook)}
                  disabled={isInLibrary(selectedBook) || busyBook === `${selectedBook.source.url}:${selectedBook.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-default disabled:opacity-60"
                >
                  {isInLibrary(selectedBook) ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  {isInLibrary(selectedBook) ? 'In Library' : busyBook === `${selectedBook.source.url}:${selectedBook.id}` ? 'Adding...' : selectedBook.purchaseUrl ? 'Download preview' : 'Add to Library'}
                </button>
              )}
              {selectedBook.purchaseUrl && (
                <a
                  href={selectedBook.purchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium ${themeStyles.btnSecondary}`}
                >
                  {selectedBook.file ? 'Purchase' : 'View / purchase'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}