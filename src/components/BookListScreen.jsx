import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, BookMarked, Trash2 } from 'lucide-react';
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

export function BookListScreen({ onOpenBook, themeStyles, wordsDb }) {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      await db.ensureReady();
      await seedDefaultBooks(db);
      const list = await db.getAllBooks();
      setBooks(list || []);
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

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto space-y-4">
      <div className={`flex items-center justify-between border-b pb-3 ${themeStyles.cardBg.includes('amber') ? 'border-amber-200' : themeStyles.cardBg.includes('slate') ? 'border-slate-200' : 'border-zinc-800'}`}>
        <div>
          <h2 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Library</h2>
          <p className={`text-xs ${themeStyles.textMuted}`}>Offline database books</p>
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
        <div className="grid grid-cols-1 gap-2.5">
          {books.map((b) => {
            const counts = bookWordCounts[b.id] || {};
            const totalWords = counts.total || 0;
            const markedWords = [1, 2, 3, 4, 99].reduce((total, level) => total + (counts[level] || 0), 0);

            return (
            <div 
              key={b.id}
              onClick={() => onOpenBook(b.id)}
              className={`p-3.5 border rounded-xl cursor-pointer flex items-center justify-between transition group ${themeStyles.cardBg} ${themeStyles.cardHover}`}
            >
              <div className="flex-1 pr-3 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium text-sm truncate group-hover:text-amber-500 ${themeStyles.textPrimary}`}>{b.title}</h3>
                  {b.hasBeenOpened === false && (
                    <span className="shrink-0 rounded-sm bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-zinc-950">NEW</span>
                  )}
                </div>
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

              <button 
                onClick={(e) => handleDeleteBook(e, b.id)}
                className={`p-1.5 ${themeStyles.textMuted} hover:text-red-400 rounded-md transition`}
                title="Delete book"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}