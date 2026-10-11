import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { marked } from 'marked';
import { db } from '../db/LocalDB';
import { chunkTextIntoPagesAsync, splitTextPageInHalf } from '../utils/epubParser';
import { getReaderBackgroundStyles } from '../utils/theme';

const splitMarkdownTableRow = (line) => {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);

  const cells = [];
  let cell = '';
  for (let index = 0; index < row.length; index++) {
    if (row[index] === '\\' && row[index + 1] === '|') {
      cell += '|';
      index++;
    } else if (row[index] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += row[index];
    }
  }
  cells.push(cell.trim());
  return cells;
};

const isMarkdownTableSeparator = (line) =>
  line.includes('|') && splitMarkdownTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));

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
  const readerBackgroundStyles = getReaderBackgroundStyles(settings?.readerBackground || 'theme', themeStyles);
  const pageContainerRef = useRef(null);
  const pageContentRef = useRef(null);
  const canSpeakWords = typeof window !== 'undefined'
    && typeof window.speechSynthesis?.speak === 'function'
    && typeof window.SpeechSynthesisUtterance === 'function';

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

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
    window.speechSynthesis?.cancel();
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

  const playSelectedWord = () => {
    if (!canSpeakWords || !selectedWord?.text) return;
    const utterance = new window.SpeechSynthesisUtterance(selectedWord.text);
    const voices = window.speechSynthesis.getVoices();
    const language = book?.language?.toLowerCase().replace('_', '-');
    const matchesBookLanguage = (voice) => !language
      || voice.lang.toLowerCase().split('-')[0] === language.split('-')[0];
    const selectedVoice = voices.find((voice) => voice.voiceURI === settings?.speechVoiceURI);
    const voice = selectedVoice && matchesBookLanguage(selectedVoice)
      ? selectedVoice
      : language && voices.find((candidate) => matchesBookLanguage(candidate));

    if (voice) {
      utterance.voice = voice;
      utterance.lang = book?.language || voice.lang;
    } else if (book?.language) {
      utterance.lang = book.language;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const closeWordSheet = () => {
    window.speechSynthesis?.cancel();
    setSelectedWord(null);
  };

  const handleCanvasClick = (e) => {
    if (selectedWord) {
      closeWordSheet();
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
    closeWordSheet();
  };

  // Process text into clickable tokens
  const renderedContent = useMemo(() => {
    const pageText = pages[currentPage] || '';
    if (!pageText) return null;
    const lines = pageText.split(/\r?\n/);
    const renderWords = (text) => {
      const tokens = text.match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu) || [];
      return tokens.map((token, index) => {
        if (!/[\p{L}\p{M}\p{N}]/u.test(token)) return <span key={index}>{token}</span>;

        const normalized = token.toLowerCase();
        const wordObj = wordsDb[normalized];
        const statusClass = wordObj?.status ? `word-status-${wordObj.status}` : '';
        return (
          <span
            key={index}
            onClick={(event) => handleWordClick(event, token)}
            className={`cursor-pointer inline-block rounded-sm px-0.5 transition ${statusClass}`}
          >
            {token}
          </span>
        );
      });
    };
    const renderInlineTokens = (tokens) => tokens.map((token, index) => {
      if (token.type === 'strong' || token.type === 'em') {
        const Tag = token.type === 'strong' ? 'strong' : 'em';
        return <Tag key={index}>{renderInlineTokens(token.tokens || [])}</Tag>;
      }
      return <React.Fragment key={index}>{renderWords(token.text ?? token.raw ?? '')}</React.Fragment>;
    });
    const renderInlineMarkdown = (text) => {
      const blocks = marked.lexer(text, { gfm: false });
      return renderInlineTokens(blocks.flatMap((block) => block.tokens || [block]));
    };

    const renderedLines = [];
    for (let index = 0; index < lines.length;) {
      const line = lines[index];
      const heading = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
      if (heading) {
        const Heading = `h${heading[1].length}`;
        const headingSize = ['text-[1.6em]', 'text-[1.4em]', 'text-[1.2em]', 'text-[1.1em]', 'text-[1em]', 'text-[1em]'][heading[1].length - 1];
        renderedLines.push(
          <Heading key={index} className={`my-3 font-bold leading-tight ${headingSize}`}>
            {renderInlineMarkdown(heading[2])}
          </Heading>
        );
        index++;
        continue;
      }

      if (line.includes('|')) {
        const tableRows = [];
        while (index < lines.length && lines[index].includes('|')) {
          tableRows.push(lines[index]);
          index++;
        }
        const separatorIndex = tableRows.findIndex(isMarkdownTableSeparator);
        const headerCells = separatorIndex === 1 ? splitMarkdownTableRow(tableRows[0]) : null;
        const bodyRows = tableRows
          .filter((_, rowIndex) => rowIndex !== separatorIndex && rowIndex !== (headerCells ? 0 : -1))
          .map(splitMarkdownTableRow);

        renderedLines.push(
          <div key={`table-${index}`} className="my-3 max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.85em]">
              {headerCells && (
                <thead>
                  <tr>
                    {headerCells.map((cell, cellIndex) => (
                      <th key={cellIndex} scope="col" className="border border-current/20 px-2 py-1 font-semibold">
                        {renderInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((cells, rowIndex) => (
                  <tr key={rowIndex}>
                    {cells.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-current/20 px-2 py-1 align-top">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      renderedLines.push(
        <div key={index} className="min-h-[1em]">
          {renderInlineMarkdown(line)}
        </div>
      );
      index++;
    }

    return renderedLines;
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
        <button type="button" onClick={onBack} aria-label="Back to library" title="Back to library" className="shrink-0 rounded-md p-1 transition hover:bg-zinc-800/20 active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1 truncate text-center text-xs font-medium">
          {book.title}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            aria-label="Previous page"
            title="Previous page"
            className="rounded-md p-1 transition hover:bg-zinc-800/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-[10px] font-mono tabular-nums text-zinc-500" aria-live="polite">
            {currentPage + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            aria-label="Next page"
            title="Next page"
            className="rounded-md p-1 transition hover:bg-zinc-800/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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

      </div>

      {/* Column Reader View */}
      <div 
        ref={pageContainerRef}
        onClick={handleCanvasClick}
        className="flex-1 min-h-0 p-6 overflow-hidden font-serif-reader cursor-pointer relative"
        style={{ ...readerBackgroundStyles, fontSize: `${fontSize}px` }}
      >
        <div key={currentPage} ref={pageContentRef} className="reader-page-enter h-full overflow-hidden leading-relaxed">
          {renderedContent}
        </div>
      </div>

      {/* Word Interaction Sheet */}
      {selectedWord && (
        <div className={`fixed left-4 right-4 z-30 p-4 border rounded-xl shadow-2xl transition ${themeStyles.modalBg} ${popupPosition === 'top' ? 'top-16' : 'bottom-16'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg capitalize">{selectedWord.text}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={playSelectedWord} disabled={!canSpeakWords} aria-label={`Play pronunciation of ${selectedWord.text}`} title={canSpeakWords ? 'Play pronunciation' : 'Speech synthesis is unavailable in this browser'} className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800/20 hover:text-zinc-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-zinc-100">
                <Play className="w-4 h-4" />
              </button>
              <button type="button" onClick={closeWordSheet} aria-label="Close word details" title="Close" className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800/20 hover:text-zinc-900 active:scale-95 dark:hover:text-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
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