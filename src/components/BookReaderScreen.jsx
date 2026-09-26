import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, X, Minus, Plus } from 'lucide-react';
import { db } from '../db/LocalDB';

export function BookReaderScreen({ bookId, wordsDb, onUpdateWord, settings, onBack, themeStyles }) {
  const [book, setBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWord, setSelectedWord] = useState(null);
  const [customTranslation, setCustomTranslation] = useState('');
  const [popupPosition, setPopupPosition] = useState('bottom');
  const [fontSize, setFontSize] = useState(18);

  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    db.getBook(bookId).then(data => {
      if (data) {
        setBook(data);
        setCurrentPage(data.currentPage || 0);
      }
    });
  }, [bookId]);

  // Recalculate total pages based on scrollWidth vs clientWidth
  const updatePageCount = () => {
    if (contentRef.current && containerRef.current) {
      const scrollWidth = contentRef.current.scrollWidth;
      const clientWidth = containerRef.current.clientWidth;
      if (clientWidth > 0) {
        const pages = Math.max(1, Math.round(scrollWidth / clientWidth));
        setTotalPages(pages);
      }
    }
  };

  useEffect(() => {
    updatePageCount();
    window.addEventListener('resize', updatePageCount);
    return () => window.removeEventListener('resize', updatePageCount);
  }, [book?.content, fontSize]);

  // Make sure page is within bounds when total pages change
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedWord) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, selectedWord]);

  const saveProgress = async (newPageIdx) => {
    const safeIndex = Math.max(0, Math.min(newPageIdx, totalPages - 1));
    setCurrentPage(safeIndex);
    if (book) {
      const updatedBook = { ...book, currentPage: safeIndex };
      setBook(updatedBook);
      await db.saveBook(updatedBook);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) saveProgress(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) saveProgress(currentPage - 1);
  };

  const handleCanvasClick = (e) => {
    if (selectedWord) {
      setSelectedWord(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left third goes prev, right two thirds goes next
    if (clickX < width * 0.35) {
      handlePrevPage();
    } else {
      handleNextPage();
    }
  };

  const handleWordClick = (e, wordText) => {
    e.stopPropagation();
    const normalized = wordText.toLowerCase();
    const existing = wordsDb[normalized] || { text: normalized, status: 1 };
    
    const wordRect = e.currentTarget.getBoundingClientRect();
    const isLowerHalf = wordRect.top > window.innerHeight / 2;
    setPopupPosition(isLowerHalf ? 'top' : 'bottom');

    setSelectedWord(existing);
    setCustomTranslation(existing.translation || '');
  };

  const handleSetWordStatus = (status) => {
    if (!selectedWord) return;
    onUpdateWord(selectedWord.text, status, customTranslation);
    setSelectedWord(null);
  };

  // Process text into clickable tokens
  const renderedContent = useMemo(() => {
    if (!book?.content) return null;
    const tokens = book.content.match(/[\w\u00C0-\u024F]+|[^\w\u00C0-\u024F]+/g) || [];

    return tokens.map((token, index) => {
      const isWord = /[\w\u00C0-\u024F]/.test(token);
      if (!isWord) {
        return <span key={index}>{token}</span>;
      }

      const normalized = token.toLowerCase();
      const wordObj = wordsDb[normalized];
      const statusClass = wordObj ? `word-status-${wordObj.status}` : 'word-status-1';

      return (
        <span
          key={index}
          onClick={(e) => handleWordClick(e, token)}
          className={`cursor-pointer inline-block rounded-sm px-0.5 transition ${statusClass}`}
        >
          {token}
        </span>
      );
    });
  }, [book?.content, wordsDb]);

  if (!book) return <div className="p-4">Loading book...</div>;

  return (
    <div className="h-full flex flex-col relative select-none overflow-hidden">
      {/* Top Bar with Integrated Font Controls */}
      <div className={`h-12 border-b flex items-center justify-between px-3 z-10 gap-2 transition ${themeStyles.headerBg}`}>
        <button onClick={onBack} className="p-1 rounded-md hover:bg-zinc-800/20">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="truncate text-center flex-1 font-medium text-xs">
          {book.title}
        </div>

        {/* Font Controls */}
        <div className="flex items-center gap-1 bg-zinc-800/10 rounded-lg p-0.5 border border-zinc-700/20">
          <button 
            onClick={() => setFontSize(s => Math.max(12, s - 2))} 
            className="p-1 rounded hover:bg-zinc-800/30 text-xs font-semibold px-1.5"
            title="Decrease font size"
          >
            A-
          </button>
          <span className="text-[10px] font-mono w-6 text-center text-zinc-500">
            {fontSize}
          </span>
          <button 
            onClick={() => setFontSize(s => Math.min(32, s + 2))} 
            className="p-1 rounded hover:bg-zinc-800/30 text-xs font-semibold px-1.5"
            title="Increase font size"
          >
            A+
          </button>
        </div>

        {/* Page Counter */}
        <div className="text-xs font-mono text-zinc-500 min-w-[40px] text-right">
          {currentPage + 1}/{totalPages}
        </div>
      </div>

      {/* Column Reader View */}
      <div 
        ref={containerRef}
        onClick={handleCanvasClick}
        className="flex-1 p-6 overflow-hidden font-serif-reader cursor-pointer relative"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div
          ref={contentRef}
          className="h-full transition-transform duration-300 ease-out whitespace-pre-wrap leading-relaxed"
          style={{
            columnWidth: '100vw',
            columnGap: '3rem',
            columnFill: 'auto',
            height: '100%',
            transform: `translateX(calc(-${currentPage} * (100% + 3rem)))`,
          }}
          onLoad={updatePageCount}
        >
          {renderedContent}
        </div>
      </div>

      {/* Word Interaction Sheet */}
      {selectedWord && (
        <div className={`fixed left-4 right-4 z-30 p-4 border rounded-xl shadow-2xl transition ${themeStyles.modalBg} ${popupPosition === 'top' ? 'top-16' : 'bottom-16'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg capitalize">{selectedWord.text}</span>
            <button onClick={() => setSelectedWord(null)} className="p-1 text-zinc-400 hover:text-zinc-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input 
            type="text" 
            value={customTranslation} 
            onChange={(e) => setCustomTranslation(e.target.value)}
            placeholder="Enter translation..." 
            className={`w-full text-xs p-2 rounded-md mb-3 border ${themeStyles.inputBg}`}
          />

          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 99].map(st => (
              <button 
                key={st} 
                onClick={() => handleSetWordStatus(st)}
                className={`py-1.5 rounded text-xs font-bold transition border word-status-${st}`}
              >
                {st === 99 ? 'Ign' : st}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}