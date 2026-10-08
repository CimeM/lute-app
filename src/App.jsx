import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Copy, ExternalLink, Settings, Smartphone, Store, X } from 'lucide-react';
import { db, DEFAULT_GITHUB_REPO } from './db/LocalDB';
import { useResolvedTheme, getThemeStyles } from './utils/theme';
import { DEFAULT_BOOK_SOURCES, fetchBookCatalog, importCatalogBook } from './utils/bookCatalog';
import { BookListScreen } from './components/BookListScreen';
import { BookStoreScreen } from './components/BookStoreScreen';
import { BookReaderScreen } from './components/BookReaderScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Notification } from './components/Notification';

const getInstallEnvironment = () => {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isEmbedded = window.self !== window.top
    || /FBAN|FBAV|Instagram|Twitter|TikTok|Snapchat|LinkedInApp|; wv\)/i.test(userAgent);
  const displayModes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
  const isStandalone = displayModes.some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches)
    || navigator.standalone === true;
  let browser = 'this browser';

  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/SamsungBrowser/i.test(userAgent)) browser = 'Samsung Internet';
  else if (/OPR\//i.test(userAgent)) browser = 'Opera';
  else if (/CriOS|Chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/FxiOS|Firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//i.test(userAgent)) browser = 'Safari';

  return { browser, isEmbedded, isIOS, isStandalone };
};

const getInstallInstructions = ({ browser, isEmbedded, isIOS }) => {
  if (isEmbedded) return 'Open this link in Safari or Chrome first; in-app browsers may not support installation.';
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
  const processedImportLink = useRef(false);
  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);
  const dismissNotification = useCallback(() => setNotification(null), []);

  const activeThemeSetting = settings?.readerTheme || 'system';
  const effectiveTheme = useResolvedTheme(activeThemeSetting);
  const themeStyles = getThemeStyles(effectiveTheme);
  const installInstructions = deferredPrompt
    ? 'Add Lute to your device with the install prompt below.'
    : getInstallInstructions(installEnvironment);

  useEffect(() => {
    if (!settings || isInstalledPwa || isInstallDismissed) return undefined;
    const timeoutId = window.setTimeout(() => setShowInstallReminder(true), 60_000);
    return () => window.clearTimeout(timeoutId);
  }, [settings, isInstalledPwa, isInstallDismissed]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.body.className = `h-dvh overflow-hidden flex flex-col transition-colors duration-200 ${themeStyles.bodyBg}`;
  }, [effectiveTheme, themeStyles.bodyBg]);

  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', themeStyles.statusBarColor);
    });
  }, [themeStyles.statusBarColor]);

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
      if (displayModeQueries.some((query) => query.matches) || navigator.standalone === true) {
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
    setActiveBookId(id);
    setCurrentScreen('reader');
    try {
      const book = await db.getBook(id);
      if (book && book.hasBeenOpened !== true) {
        await db.saveBook({ ...book, hasBeenOpened: true });
      }
    } catch (error) {
      console.warn('Could not mark book as opened:', error);
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

  const handleInstallAction = async () => {
    if (installEnvironment.isEmbedded) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        notify('URL copied. Open it in Safari or Chrome to install Lute.', 'success');
      } catch {
        notify(installInstructions);
      }
      return;
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
            themeStyles={themeStyles}
            wordsDb={wordsDb}
          />
        )}

        {currentScreen === 'store' && (
          <BookStoreScreen
            settings={settings}
            themeStyles={themeStyles}
            onNotify={notify}
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
            themeStyles={themeStyles}
          />
        )}
      </main>

      <Notification notification={notification} onDismiss={dismissNotification} />

      {showInstallReminder && !isInstalledPwa && (
        <aside
          className="install-reminder fixed inset-x-3 z-40 mx-auto max-w-md rounded-lg border border-amber-500/40 bg-white p-3 text-zinc-900 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
          style={{ bottom: currentScreen === 'reader' ? 'calc(12px + env(safe-area-inset-bottom))' : 'calc(3.5rem + env(safe-area-inset-bottom) + 12px)' }}
          aria-label="Install Lute"
        >
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Install Lute?</h2>
                <button type="button" onClick={dismissInstallReminder} aria-label="Dismiss install reminder" title="Dismiss" className="rounded p-1 text-zinc-500 transition hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{installInstructions}</p>
              <div className="mt-2 flex justify-end">
                {installEnvironment.isEmbedded ? (
                  <>
                    <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      <ExternalLink className="h-3.5 w-3.5" /> Open in browser
                    </a>
                    <button type="button" onClick={handleInstallAction} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-95">
                      <Copy className="h-3.5 w-3.5" /> Copy URL
                    </button>
                  </>
                ) : deferredPrompt ? (
                  <button type="button" onClick={handleInstallAction} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-95">
                    <Smartphone className="h-3.5 w-3.5" /> Install
                  </button>
                ) : (
                  <button type="button" onClick={dismissInstallReminder} className="rounded-md px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    Got it
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}

      {currentScreen !== 'reader' && (
        <nav className={`bottom-nav border-t flex items-center justify-around z-20 px-2 transition-colors duration-200 ${themeStyles.navBg}`}>
          <button 
            onClick={() => setCurrentScreen('books')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition ${currentScreen === 'books' ? themeStyles.navActive : themeStyles.navInactive}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Library</span>
          </button>

          <button
            onClick={() => setCurrentScreen('store')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition ${currentScreen === 'store' ? themeStyles.navActive : themeStyles.navInactive}`}
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
    </div>
  );
}