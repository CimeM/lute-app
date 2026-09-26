import React, { useState, useEffect } from 'react';
import { BookOpen, Settings } from 'lucide-react';
import { db, DEFAULT_GITHUB_REPO } from './db/LocalDB';
import { useResolvedTheme, getThemeStyles } from './utils/theme';
import { BookListScreen } from './components/BookListScreen';
import { BookReaderScreen } from './components/BookReaderScreen';
import { SettingsScreen } from './components/SettingsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('books');
  const [activeBookId, setActiveBookId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [wordsDb, setWordsDb] = useState({});
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const activeThemeSetting = settings?.readerTheme || 'system';
  const effectiveTheme = useResolvedTheme(activeThemeSetting);
  const themeStyles = getThemeStyles(effectiveTheme);

  useEffect(() => {
    document.body.className = `h-dvh overflow-hidden flex flex-col transition-colors duration-200 ${themeStyles.bodyBg}`;
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
            githubRepo: DEFAULT_GITHUB_REPO,
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

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
            onOpenBook={(id) => { setActiveBookId(id); setCurrentScreen('reader'); }} 
            themeStyles={themeStyles}
            wordsDb={wordsDb}
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
            onExport={exportDatabase}
            onSaveSettings={async (updated) => {
              setSettings(updated);
              await db.saveSettings(updated);
            }}
            deferredPrompt={deferredPrompt}
            onClearPrompt={() => setDeferredPrompt(null)}
            themeStyles={themeStyles}
          />
        )}
      </main>

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