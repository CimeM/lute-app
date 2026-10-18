import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, BookMarked, MoreHorizontal, Pin, PinOff, Trash2 } from 'lucide-react';
import { db } from '../db/LocalDB';
import { parseEPUBFile } from '../utils/epubParser';
import { seedDefaultBooks } from '../utils/defaultBooks';

const LEVEL_BAR_COLORS = {
  1: 'bg-amber-400',
  2: 'bg-orange-500',
  3: 'bg-green-500',
  4: 'bg-zinc-500',
  99: 'bg-zinc-400',
};

const MONTHLY_LIBRARY_DECORATIONS = {
  1: '❄️',
  2: '💘',
  3: '🌷',
  4: '',
  5: '',
  6: '',
  7: '',
  8: '🌊',
  9: '🌾',
  10: '🎃',
  11: '',
  12: '🎄',
};

export function BookListScreen({ onOpenBook, onLibraryLoaded, themeStyles, wordsDb }) {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const seasonalDecoration = MONTHLY_LIBRARY_DECORATIONS[new Date().getMonth() + 1];

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      await db.ensureReady();
      await seedDefaultBooks(db);
      const list = await db.getAllBooks();
      const loadedBooks = (list || []).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
      setBooks(loadedBooks);
      onLibraryLoaded?.(loadedBooks.length === 0);
    } catch (err) {
      console.error("Error loading books:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const bookWordCounts = useMemo(() => {
    const countsByBook = {};

    for (const book of books) {
      const counts = { total: 0, 1: 0, 2: 0, 3: 0, 4: 0, 99: 0 };
      const wordPattern = /[\p{L}\p{M}\p{N}]+/gu;
      const content = book.content || '';
      let match;

      while ((match = wordPattern.exec(content)) !== null) {
        counts.total++;
        const status = wordsDb[match[0].toLowerCase()]?.status;
        if (counts[status] !== undefined) counts[status]++;
      }

      countsByBook[book.id] = counts;
    }

    return countsByBook;
  }, [books, wordsDb]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let content = "";
      const title = file.name.replace(/\.[^/.]+$/, "");

      if (file.name.endsWith('.epub')) {
        content = await parseEPUBFile(file);
      } else {
        content = await file.text();
      }

      if (!content.trim()) {
        alert("Unable to extract text from file.");
        setIsUploading(false);
        return;
      }

      const newBook = {
        id: Date.now(),
        title: title || "Untitled Book",
        content: content,
        currentPage: 0,
        hasBeenOpened: false,
        addedAt: new Date().toISOString()
      };

      const id = await db.saveBook(newBook);
      await loadBooks();
      onOpenBook(id);
    } catch (err) {
      console.error(err);
      alert("Error parsing file: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBook = async (e, id) => {
    e.stopPropagation();
    if (confirm("Delete this book from local storage?")) {
      await db.deleteBook(id);
      await loadBooks();
    }
  };

  const handleTogglePin = async (e, book) => {
    e.stopPropagation();
    if (!book.pinned && books.filter((item) => item.pinned).length >= 4) return;
    await db.saveBook({ ...book, pinned: !book.pinned });
    await loadBooks();
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-4">
      <div className={`flex items-center justify-between border-b pb-3 ${themeStyles.cardBg.includes('amber') ? 'border-amber-200' : themeStyles.cardBg.includes('slate') ? 'border-slate-200' : 'border-zinc-800'}`}>
        <div>
          <h2 className={`text-lg font-bold ${themeStyles.textPrimary}`}>
            Library{seasonalDecoration && <span className="ml-1" aria-hidden="true">{seasonalDecoration}</span>}
          </h2>
          <p className={`text-xs ${themeStyles.textMuted}`}>Offline database</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
        >
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Parsing...' : 'Upload'}</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".txt,.epub,.md" 
          className="hidden" 
        />
      </div>

      {books.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 ${themeStyles.textMuted}`}>
          <BookMarked className="w-12 h-12 stroke-1 mb-2" />
          <p className="text-sm">No books loaded in offline database.</p>
          <p className={`text-xs mt-1 ${themeStyles.textSubtle}`}>Upload `.epub` or `.txt` to start reading.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {books.map((b) => {
            const counts = bookWordCounts[b.id] || {};
            const totalWords = counts.total || 0;
            const markedWords = [1, 2, 3, 4, 99].reduce((total, level) => total + (counts[level] || 0), 0);

            return (
            <div
              key={b.id}
              onClick={() => onOpenBook(b.id)}
              className={`p-3.5 border rounded-xl cursor-pointer flex items-center gap-3 shadow-md transition group hover:shadow-lg ${themeStyles.cardBg} ${themeStyles.cardHover}`}
            >
              <img
                src={b.coverUrl || '/images/default-book-cover.svg'}
                alt={`Cover of ${b.title}`}
                onError={(event) => { event.currentTarget.src = '/images/default-book-cover.svg'; }}
                className="h-[5.5rem] w-16 shrink-0 rounded-sm border border-black/10 object-cover shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h3 className={`break-words font-medium text-sm leading-snug group-hover:text-amber-500 ${themeStyles.textPrimary}`}>{b.title}</h3>
                {(b.pinned || b.hasBeenOpened === false) && (
                  <div className="mt-1 flex items-center gap-2">
                    {b.pinned && <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-amber-500" aria-label="Pinned" />}
                    {b.hasBeenOpened === false && (
                      <span className="shrink-0 rounded-sm bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-zinc-950">NEW</span>
                    )}
                  </div>
                )}
                <div className={`flex items-center gap-2 mt-1 text-[11px] ${themeStyles.textMuted}`}>
                  <span>{bookWordCounts[b.id]?.total || 0} words</span>
                  <span>•</span>
                  <span>Page {(b.currentPage || 0) + 1}</span>
                </div>
                <div
                  className="mt-2 flex h-2 w-full overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-700"
                  role="img"
                  aria-label={`${markedWords} marked and ${totalWords - markedWords} unmarked word occurrences`}
                  title={`${markedWords} marked · ${totalWords - markedWords} unmarked`}
                >
                  {[1, 2, 3, 4, 99].map((level) => counts[level] > 0 && (
                    <span
                      key={level}
                      className={LEVEL_BAR_COLORS[level]}
                      style={{ width: `${(counts[level] / Math.max(totalWords, 1)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>

              <details className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
                <summary
                  className={`flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md ${themeStyles.textMuted} transition hover:bg-black/5 hover:text-amber-500 dark:hover:bg-white/10`}
                  aria-label={`Book actions for ${b.title}`}
                  title="Book actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </summary>
                <div className={`absolute right-0 top-full z-10 mt-1 min-w-44 rounded-md border p-1 shadow-lg ${themeStyles.cardBg}`}>
                  <button
                    type="button"
                    onClick={(event) => {
                      handleTogglePin(event, b);
                      event.currentTarget.closest('details').open = false;
                    }}
                    disabled={!b.pinned && books.filter((item) => item.pinned).length >= 4}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${themeStyles.textPrimary} hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10`}
                  >
                    {b.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    {b.pinned ? 'Unpin from top' : 'Pin to top'}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      handleDeleteBook(event, b.id);
                      event.currentTarget.closest('details').open = false;
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete book
                  </button>
                </div>
              </details>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}