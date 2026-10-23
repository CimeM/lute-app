import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Settings, Smartphone, Store, X } from 'lucide-react';
import { db, DEFAULT_GITHUB_REPO } from './db/LocalDB';
import { useResolvedTheme, getThemeStyles } from './utils/theme';
import { DEFAULT_BOOK_SOURCES, fetchBookCatalog, importCatalogBook } from './utils/bookCatalog';
import { BookListScreen } from './components/BookListScreen';
import { BookStoreScreen } from './components/BookStoreScreen';
import { BookReaderScreen } from './components/BookReaderScreen';
import { ExternalBrowserPrompt } from './components/ExternalBrowserPrompt';
import { SettingsScreen } from './components/SettingsScreen';
import { Notification } from './components/Notification';
import { ReaderTutorial } from './components/ReaderTutorial';

const READER_TUTORIAL_KEY = 'lute-reader-tutorial-complete';
const APP_OPENED_KEY = 'lute-app-opened';

const isRunningAsInstalledApp = () => {
  const displayModes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
  return displayModes.some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches)
    || navigator.standalone === true;
};

const getInstallEnvironment = () => {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isInstagramBrowser = /Instagram/i.test(userAgent);
  const isEmbedded = window.self !== window.top
    || /FBAN|FBAV|Instagram|Twitter|TikTok|Snapchat|LinkedInApp|; wv\)/i.test(userAgent);
  const isStandalone = isRunningAsInstalledApp();
  let browser = 'this browser';

  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/SamsungBrowser/i.test(userAgent)) browser = 'Samsung Internet';
  else if (/OPR\//i.test(userAgent)) browser = 'Opera';
  else if (/CriOS|Chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//i.test(userAgent)) browser = 'Safari';

  return { browser, isEmbedded, isInstagramBrowser, isIOS, isAndroid, isStandalone };
};

const getInstallInstructions = ({ browser, isEmbedded, isIOS, isAndroid }) => {
  if (isEmbedded && isIOS) {
    return 'In Instagram, tap the three-dot menu, then choose Open in Safari or Open in external browser. If that option is missing, copy the link below and paste it into Safari.';
  }
  if (isEmbedded && isAndroid) {
    return 'In Instagram, tap the three-dot menu, then choose Open in Chrome or Open in external browser. If that option is missing, copy the link below and paste it into Chrome.';
  }
  if (isEmbedded) return 'Open the in-app browser menu and choose Open in external browser. Otherwise, copy the link below and paste it into Chrome or Safari.';
  if (isIOS) return 'In Safari, tap Share, then choose Add to Home Screen.';
  if (browser === 'Safari') return 'In Safari, choose File, then Add to Dock.';
  if (['Chrome', 'Edge', 'Opera', 'Samsung Internet'].includes(browser)) {
    return `Open the ${browser} menu and choose Install Lute or Add to Home Screen.`;
  }
  return 'Open this page in Chrome, Edge, or Safari to install Lute.';
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('books');
  const [activeBookId, setActiveBookId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [wordsDb, setWordsDb] = useState({});
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallReminder, setShowInstallReminder] = useState(false);
  const [isInstallDismissed, setIsInstallDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('lute-install-reminder-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [installEnvironment] = useState(getInstallEnvironment);
  const [isInstalledPwa, setIsInstalledPwa] = useState(installEnvironment.isStandalone);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [forceBrowserPrompt, setForceBrowserPrompt] = useState(false);
  const [hasSeenReaderTutorial, setHasSeenReaderTutorial] = useState(() => {
    try {
      return localStorage.getItem(READER_TUTORIAL_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isFirstAppOpen] = useState(() => {
    try {
      return localStorage.getItem(APP_OPENED_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [showReaderTutorial, setShowReaderTutorial] = useState(isFirstAppOpen);
  const hasSeenReaderTutorialRef = useRef(hasSeenReaderTutorial);
  const [isLibraryEmpty, setIsLibraryEmpty] = useState(false);
  const [isLibraryPulseActive, setIsLibraryPulseActive] = useState(false);
  const [libraryPulseSequence, setLibraryPulseSequence] = useState(0);
  const libraryPulseTimeoutRef = useRef(null);
  const processedImportLink = useRef(false);
  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);
  const dismissNotification = useCallback(() => setNotification(null), []);
  const openInBrowserHref = typeof window === 'undefined'
    ? ''
    : installEnvironment.isAndroid
      ? `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
      : window.location.href;
  const browserName = installEnvironment.isIOS ? 'Safari' : installEnvironment.isAndroid ? 'your browser' : 'a regular browser';

  const copyPageLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(openInBrowserHref);
      setLinkCopied(true);
      notify(`Link copied. Open it in ${browserName} to continue.`, 'success');
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      notify(`Copy this page URL and open it in ${browserName}.`, 'error');
    }
  }, [browserName, notify, openInBrowserHref]);

  const activeThemeSetting = settings?.readerTheme || 'system';
  const effectiveTheme = useResolvedTheme(activeThemeSetting);
  const themeStyles = getThemeStyles(effectiveTheme);
  const installInstructions = deferredPrompt
    ? 'Add Lute to your device with the install prompt below.'
    : getInstallInstructions(installEnvironment);
  const isInstalledApp = isInstalledPwa || isRunningAsInstalledApp();
  const shouldShowExternalBrowserPrompt = installEnvironment.isEmbedded || forceBrowserPrompt;

  useEffect(() => {
    document.title = shouldShowExternalBrowserPrompt ? 'Landing page sandbox' : 'Lute Reader';
  }, [shouldShowExternalBrowserPrompt]);

  useEffect(() => {
    if (!settings || shouldShowExternalBrowserPrompt || !isFirstAppOpen) return;
    try {
      localStorage.setItem(APP_OPENED_KEY, 'true');
    } catch {
      // Keep the first-open decision for this session if storage is unavailable.
    }
  }, [settings, isFirstAppOpen, shouldShowExternalBrowserPrompt]);

  useEffect(() => {
    if (installEnvironment.isEmbedded || forceBrowserPrompt) return undefined;
    if (!settings || isInstalledApp || isInstallDismissed) return undefined;
    const timeoutId = window.setTimeout(() => {
      if (isRunningAsInstalledApp()) {
        setIsInstalledPwa(true);
        return;
      }
      setShowInstallReminder(true);
    }, 30_000);
    return () => window.clearTimeout(timeoutId);
  }, [settings, isInstalledPwa, isInstalledApp, isInstallDismissed, installEnvironment, forceBrowserPrompt]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.documentElement.style.colorScheme = effectiveTheme;
    document.body.className = `h-dvh overflow-hidden flex flex-col transition-colors duration-200 ${themeStyles.bodyBg}`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      effectiveTheme === 'dark' ? '#09090b' : '#e2e8f0',
    );
  }, [effectiveTheme, themeStyles.bodyBg]);

  useEffect(() => {
    let isMounted = true;

    db.ensureReady()
      .then(async () => {
        if (!isMounted) return;
        try {
          const savedSettings = await db.getSettings();
          if (isMounted) setSettings(savedSettings);
          const savedWords = await db.getAllWords();
          if (isMounted) setWordsDb(savedWords);
        } catch (err) {
          console.warn("Error loading database content:", err);
        }
      })
      .catch((err) => {
        console.warn("Unhandled DB error safely caught:", err);
        if (isMounted) {
          setSettings({
            key: 'user_config',
            username: '',
            readerTheme: 'system',
            readerBackground: 'theme',
            speechVoiceURI: '',
            githubRepo: DEFAULT_GITHUB_REPO,
            bookSources: DEFAULT_BOOK_SOURCES,
            enableSync: false,
            isLoggedIn: false,
            syncApiUrl: 'https://api.example.com/lute/sync'
          });
        }
      });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      if (isRunningAsInstalledApp()) {
        setIsInstalledPwa(true);
        return;
      }
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalledPwa(true);
      setDeferredPrompt(null);
      setShowInstallReminder(false);
      setIsInstallDismissed(true);
    };
    const displayModeQueries = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
      .map((mode) => window.matchMedia(`(display-mode: ${mode})`));
    const handleDisplayModeChange = () => {
      if (isRunningAsInstalledApp()) {
        handleAppInstalled();
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    displayModeQueries.forEach((query) => query.addEventListener('change', handleDisplayModeChange));

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      displayModeQueries.forEach((query) => query.removeEventListener('change', handleDisplayModeChange));
    };
  }, []);

  useEffect(() => {
    if (!settings || processedImportLink.current) return;
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('addBook');
    if (!bookId) return;

    processedImportLink.current = true;
    let isMounted = true;
    const sourceUrl = params.get('source');
    const sources = sourceUrl
      ? [{ id: sourceUrl, name: sourceUrl === 'builtin' ? 'Built-in books' : sourceUrl, url: sourceUrl, enabled: true }]
      : (settings.bookSources || DEFAULT_BOOK_SOURCES).filter((source) => source.enabled);

    const importLinkedBook = async () => {
      notify('Adding linked book...');
      try {
        let match = null;
        for (const source of sources) {
          const catalog = await fetchBookCatalog(source);
          const book = catalog.books.find((entry) => String(entry.id) === bookId);
          if (book) {
            match = { source, book };
            break;
          }
        }
        if (!match) throw new Error('Book was not found in the selected sources.');

        await importCatalogBook(match.source, match.book);
        if (isMounted) notify(`Added “${match.book.title}” to your library.`, 'success');
        setCurrentScreen('books');
      } catch (error) {
        console.warn('Could not add linked book:', error);
        if (isMounted) notify('Could not add this book. Check the link and your connection.', 'error');
      } finally {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('addBook');
        cleanUrl.searchParams.delete('source');
        window.history.replaceState({}, '', cleanUrl);
      }
    };

    importLinkedBook();
    return () => { isMounted = false; };
  }, [settings, notify]);

  const updateWordStatus = async (text, status, translation) => {
    const wordObj = { text: text.toLowerCase(), status, translation, updatedAt: new Date().toISOString() };
    const updated = { ...wordsDb, [wordObj.text]: wordObj };
    setWordsDb(updated);
    await db.saveWord(wordObj);
  };

  const exportDatabase = async () => {
    try {
      await db.ensureReady();
      const [books, words, savedSettings] = await Promise.all([
        db.getAllBooks(),
        db.getAllWords(),
        db.getSettings(),
      ]);
      const backup = {
        format: 'lute-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        books,
        words,
        settings: savedSettings,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lute-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to export database:', error);
      alert('Could not export the database. Please try again.');
    }
  };

  const openBook = async (id) => {
    clearLibraryPulse();
    setActiveBookId(id);
    setCurrentScreen('reader');
    if (!hasSeenReaderTutorial) setShowReaderTutorial(true);
    try {
      const book = await db.getBook(id);
      if (book && book.hasBeenOpened !== true) {
        await db.saveBook({ ...book, hasBeenOpened: true });
      }
    } catch (error) {
      console.warn('Could not mark book as opened:', error);
    }
  };

  const handleLibraryLoaded = (isEmpty) => {
    setIsLibraryEmpty(isEmpty);
    if (isEmpty && !hasSeenReaderTutorialRef.current) setShowReaderTutorial(true);
  };

  const handleStoreBookAdded = () => {
    window.clearTimeout(libraryPulseTimeoutRef.current);
    setIsLibraryEmpty(false);
    setIsLibraryPulseActive(true);
    setLibraryPulseSequence((sequence) => sequence + 1);
    libraryPulseTimeoutRef.current = window.setTimeout(() => {
      setIsLibraryPulseActive(false);
      libraryPulseTimeoutRef.current = null;
    }, 950);
  };

  const clearLibraryPulse = () => {
    window.clearTimeout(libraryPulseTimeoutRef.current);
    libraryPulseTimeoutRef.current = null;
    setIsLibraryPulseActive(false);
  };

  const closeReaderTutorial = () => {
    setShowReaderTutorial(false);
    hasSeenReaderTutorialRef.current = true;
    setHasSeenReaderTutorial(true);
    try {
      localStorage.setItem(READER_TUTORIAL_KEY, 'true');
    } catch {
      // Keep the tutorial dismissed for this session if storage is unavailable.
    }
  };

  const dismissInstallReminder = () => {
    try {
      sessionStorage.setItem('lute-install-reminder-dismissed', 'true');
    } catch {
      // Keep the dismissal for this render when storage is unavailable.
    }
    setShowInstallReminder(false);
    setIsInstallDismissed(true);
  };

  const handleCopyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify(`Link copied. Paste it into ${installEnvironment.isIOS ? 'Safari' : 'Chrome'} to open Lute outside this preview.`, 'success');
    } catch {
      notify(installInstructions, 'error');
    }
  };

  const handleInstallAction = async () => {
    if (installEnvironment.isEmbedded) {
      return handleCopyAppLink();
    }

    if (!deferredPrompt) {
      notify(installInstructions);
      dismissInstallReminder();
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      notify(outcome === 'accepted' ? 'Lute is being installed.' : 'Installation was dismissed.');
    } catch (error) {
      console.error('Could not open the install prompt:', error);
      notify(installInstructions);
    } finally {
      setDeferredPrompt(null);
      dismissInstallReminder();
    }
  };

  if (shouldShowExternalBrowserPrompt) {
    return (
      <ExternalBrowserPrompt
        isInstagramBrowser={installEnvironment.isInstagramBrowser}
        isIOS={installEnvironment.isIOS}
        isAndroid={installEnvironment.isAndroid}
        browserName={browserName}
        openInBrowserHref={openInBrowserHref}
        onCopyLink={copyPageLink}
        linkCopied={linkCopied}
        themeStyles={themeStyles}
      />
    );
  }

  if (!settings) {
    return (
      <div className={`h-dvh w-screen flex items-center justify-center font-mono text-xs ${themeStyles.bodyBg}`}>
        Loading Lute...
      </div>
    );
  }

  return (
    <div className={`h-dvh w-screen flex flex-col overflow-hidden transition-colors duration-200 ${themeStyles.appBg}`}>
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {currentScreen === 'books' && (
          <BookListScreen 
            onOpenBook={openBook}
            onLibraryLoaded={handleLibraryLoaded}
            themeStyles={themeStyles}
            wordsDb={wordsDb}
          />
        )}

        {currentScreen === 'store' && (
          <BookStoreScreen
            settings={settings}
            themeStyles={themeStyles}
            onNotify={notify}
            onBookAdded={handleStoreBookAdded}
            onSaveSettings={async (updated) => {
              setSettings(updated);
              await db.saveSettings(updated);
            }}
          />
        )}
        
        {currentScreen === 'reader' && activeBookId && (
          <BookReaderScreen 
            bookId={activeBookId} 
            wordsDb={wordsDb} 
            onUpdateWord={updateWordStatus}
            settings={settings}
            onBack={() => {
              setActiveBookId(null);
              setCurrentScreen('books');
            }}
            onRequireExternalBrowser={() => setForceBrowserPrompt(true)}
            themeStyles={themeStyles}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen 
            settings={settings} 
            onNotify={notify}
            onSaveSettings={async (updated) => {
              setSettings(updated);
              await db.saveSettings(updated);
            }}
            onExport={exportDatabase}
            deferredPrompt={deferredPrompt}
            isInstalledPwa={isInstalledPwa}
            installInstructions={installInstructions}
            onClearPrompt={() => setDeferredPrompt(null)}
            onStartReaderTutorial={() => setShowReaderTutorial(true)}
            themeStyles={themeStyles}
          />
        )}
      </main>

      <Notification notification={notification} onDismiss={dismissNotification} />

      {showReaderTutorial && (
        <ReaderTutorial onClose={closeReaderTutorial} themeStyles={themeStyles} />
      )}


      {currentScreen !== 'reader' && (
        <nav className={`bottom-nav border-t flex items-center justify-around z-20 px-2 transition-colors duration-200 ${themeStyles.navBg}`}>
          <button 
            key={libraryPulseSequence}
            onClick={() => setCurrentScreen('books')}
            className={`relative flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition ${isLibraryPulseActive ? 'library-new-book-pulse' : ''} ${currentScreen === 'books' ? themeStyles.navActive : themeStyles.navInactive}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Library</span>
          </button>

          <button
            onClick={() => setCurrentScreen('store')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition ${isLibraryEmpty && currentScreen !== 'store' && !showReaderTutorial ? 'reader-tutorial-target' : ''} ${currentScreen === 'store' ? themeStyles.navActive : themeStyles.navInactive}`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] font-medium">Store</span>
          </button>

          <button 
            onClick={() => setCurrentScreen('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition ${currentScreen === 'settings' ? themeStyles.navActive : themeStyles.navInactive}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </nav>
      )}

      {showInstallReminder && !isInstalledApp && !installEnvironment.isEmbedded && (
        <div className={`fixed bottom-20 left-3 right-3 z-30 mx-auto flex max-w-md items-center gap-3 rounded-lg border p-3 shadow-lg ${themeStyles.modalBg}`}>
          <Smartphone className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Install Lute?</span>
          <button
            type="button"
            onClick={handleInstallAction}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismissInstallReminder}
            className="rounded p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}