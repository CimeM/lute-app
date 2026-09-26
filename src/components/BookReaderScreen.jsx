import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { db } from '../db/LocalDB';
import { chunkTextIntoPagesAsync, splitTextPageInHalf } from '../utils/epubParser';

export function BookReaderScreen({ bookId, wordsDb, onUpdateWord, settings, onBack, themeStyles }) {
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.max(1, pages.length);
  const [selectedWord, setSelectedWord] = useState(null);
  const [customTranslation, setCustomTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [popupPosition, setPopupPosition] = useState('bottom');
  const [fontSize, setFontSize] = useState(18);
  const pageContainerRef = useRef(null);
  const pageContentRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setIsPreparing(true);
    setLoadingProgress(0);
    setLoadError('');
    setBook(null);
    setPages([]);

    db.getBook(bookId).then(async (data) => {
      if (!data) throw new Error('This book could not be found in the local library.');
      if (cancelled) return;

      setBook(data);
      setCurrentPage(data.currentPage || 0);
      const preparedPages = await chunkTextIntoPagesAsync(data.content || '', 100, (progress) => {
        if (!cancelled) setLoadingProgress(progress);
      });
      if (!cancelled) setPages(preparedPages);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'Unable to load this book.');
    }).finally(() => {
      if (!cancelled) setIsPreparing(false);
    });

    return () => { cancelled = true; };
  }, [bookId]);

  // Make sure page is within bounds when total pages change
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages]);

  useEffect(() => {
    if (isPreparing || !pages[currentPage]) return;

    const container = pageContainerRef.current;
    const content = pageContentRef.current;
    if (!container || !content) return;

    let frameId;
    const checkOverflow = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (content.scrollHeight <= content.clientHeight + 1) return;

        const overflowingPage = pages[currentPage];
        const splitPage = splitTextPageInHalf(overflowingPage);
        if (!splitPage) return;

        setPages((currentPages) => {
          if (currentPages[currentPage] !== overflowingPage) return currentPages;
          return [
            ...currentPages.slice(0, currentPage),
            ...splitPage,
            ...currentPages.slice(currentPage + 1),
          ];
        });
      });
    };

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    checkOverflow();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [pages, currentPage, fontSize, isPreparing]);

  useEffect(() => {
    if (!selectedWord || selectedWord.translation) {
      setIsTranslating(false);
      setTranslationError('');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsTranslating(false);
      setTranslationError('Automatic translation timed out. Enter an English translation.');
      controller.abort();
    }, 8000);
    setCustomTranslation('');
    setIsTranslating(true);
    setTranslationError('');

    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: 'en',
      dt: 't',
      q: selectedWord.text,
    });

    fetch(`https://translate.googleapis.com/translate_a/single?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Translation service unavailable.');
        return response.json();
      })
      .then((result) => {
        const translation = Array.isArray(result?.[0])
          ? result[0].map((part) => part[0] || '').join('').trim()
          : '';
        if (!translation) throw new Error('No English translation found.');
        setCustomTranslation(translation);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setTranslationError('Automatic translation unavailable. Enter an English translation.');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setIsTranslating(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedWord]);

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
    const existing = wordsDb[normalized] || { text: normalized, status: 0 };
    
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
    const pageText = pages[currentPage] || '';
    if (!pageText) return null;
    const tokens = pageText.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) || [];

    return tokens.map((token, index) => {
      const isWord = /[\p{L}\p{M}\p{N}]/u.test(token);
      if (!isWord) {
        return <span key={index}>{token}</span>;
      }

      const normalized = token.toLowerCase();
      const wordObj = wordsDb[normalized];
      const statusClass = wordObj?.status ? `word-status-${wordObj.status}` : '';

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
  }, [pages, currentPage, wordsDb]);

  if (isPreparing) {
    return <div className="p-4">Preparing book... {loadingProgress}%</div>;
  }

  if (loadError || !book) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p>{loadError || 'Unable to load this book.'}</p>
        <button onClick={onBack} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-zinc-800/10">
          <ArrowLeft className="w-4 h-4" /> Back to library
        </button>
      </div>
    );
  }

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
        ref={pageContainerRef}
        onClick={handleCanvasClick}
        className="flex-1 min-h-0 p-6 overflow-hidden font-serif-reader cursor-pointer relative"
        style={{ fontSize: `${fontSize}px` }}
      >
        <div ref={pageContentRef} className="h-full overflow-hidden whitespace-pre-wrap leading-relaxed">
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
            placeholder={isTranslating ? 'Translating to English...' : 'Enter English translation...'}
            aria-label="English translation"
            className={`w-full text-xs p-2 rounded-md mb-3 border ${themeStyles.inputBg}`}
          />
          <p className="text-[10px] text-zinc-500 mb-3" aria-live="polite">
            {isTranslating ? 'Looking up an English translation...' : translationError || 'English translation'}
          </p>

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