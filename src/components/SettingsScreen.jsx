import { useState } from "react";
import { BookOpen, Download, HelpCircle, Plus, Smartphone, Trash2, Upload, X } from "lucide-react";
import packageInfo from "../../package.json";
import { DEFAULT_BOOK_SOURCES } from "../utils/bookCatalog";
import { READER_BACKGROUND_OPTIONS } from "../utils/theme";

export function SettingsScreen({ settings, onSaveSettings, onNotify, onExport, onImport, deferredPrompt, isInstalledPwa, installInstructions, onClearPrompt, themeStyles }) {
  const [showHelp, setShowHelp] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const CURRENT_VERSION = `v${packageInfo.version}`;
  const bookSources = settings?.bookSources || DEFAULT_BOOK_SOURCES;

  const saveBookSources = (updatedSources) => {
    onSaveSettings({ ...settings, bookSources: updatedSources });
  };

  const handleAddSource = (event) => {
    event.preventDefault();
    const url = newSourceUrl.trim();
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Use an HTTP or HTTPS URL.');
      if (bookSources.some((source) => source.url === url)) throw new Error('This source is already listed.');
      saveBookSources([...bookSources, { id: url, name: parsedUrl.hostname, url, enabled: true }]);
      setNewSourceUrl('');
      onNotify('Book source added.', 'success');
    } catch (error) {
      onNotify(error.message || 'Enter a valid catalog URL.', 'error');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      onNotify(installInstructions);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      onNotify(outcome === 'accepted' ? 'Lute is being installed.' : 'Installation was dismissed.');
    } catch (error) {
      console.error('Could not open the install prompt:', error);
      onNotify(installInstructions, 'error');
    } finally {
      onClearPrompt?.();
    }
  };

  return (
    <div className="h-full max-w-md mx-auto overflow-y-auto overscroll-contain p-4 space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Title */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      <section className="space-y-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <label htmlFor="reader-theme" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          App theme
        </label>
        <select
          id="reader-theme"
          value={settings?.readerTheme || 'system'}
          onChange={(event) => onSaveSettings({ ...settings, readerTheme: event.target.value })}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="sepia">Sepia</option>
        </select>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Reader background</legend>
          <div className="grid grid-cols-3 gap-2">
            {READER_BACKGROUND_OPTIONS.map((option) => {
              const selected = (settings?.readerBackground || 'theme') === option.value;
              const preview = option.backgroundColor
                ? { backgroundColor: option.backgroundColor }
                : themeStyles.readerBackground;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSaveSettings({ ...settings, readerBackground: option.value })}
                  aria-pressed={selected}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs transition ${selected ? 'border-amber-500 ring-1 ring-amber-500' : 'border-zinc-300 dark:border-zinc-700'}`}
                >
                  <span className="h-5 w-8 rounded-sm border border-black/15" style={preview} aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="flex w-full items-center gap-3 rounded-md border border-zinc-300 bg-white p-3 text-left text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        <HelpCircle className="h-5 w-5" />
        How to use Lute
      </button>

      <section className="border-y border-zinc-200 py-3 dark:border-zinc-800">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Book sources ({bookSources.filter((source) => source.enabled).length} selected)
          </summary>
          <div className="mt-3 space-y-2">
            {bookSources.map((source) => (
              <div key={source.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={source.enabled}
                  onChange={(event) => saveBookSources(bookSources.map((entry) => (
                    entry.id === source.id ? { ...entry, enabled: event.target.checked } : entry
                  )))}
                  aria-label={`Use ${source.name}`}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="min-w-0 flex-1 truncate" title={source.url}>{source.name}</span>
                {source.url !== 'builtin' && (
                  <button
                    type="button"
                    onClick={() => saveBookSources(bookSources.filter((entry) => entry.id !== source.id))}
                    aria-label={`Remove ${source.name}`}
                    className="rounded p-1 text-zinc-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <form onSubmit={handleAddSource} className="flex gap-2 pt-2">
              <input
                type="url"
                value={newSourceUrl}
                onChange={(event) => setNewSourceUrl(event.target.value)}
                placeholder="https://example.com/books/index.json"
                aria-label="Book catalog URL"
                className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              />
              <button
                type="submit"
                aria-label="Add book source"
                title="Add book source"
                className="rounded-md bg-amber-500 px-2 text-zinc-950 hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </details>
      </section>

      {!isInstalledPwa && (
        <div>
          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center gap-3 rounded-md bg-amber-500 p-3 text-left text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            <Smartphone className="h-5 w-5" />
            Install Lute PWA
          </button>
        </div>
      )}

      {/* Backup and Restore */}
      <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Database Backup
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium py-2 px-3 rounded-md transition"
          >
            <Download className="w-4 h-4" />
            Export DB
          </button>
          <label className="flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-medium py-2 px-3 rounded-md transition cursor-pointer">
            <Upload className="w-4 h-4" />
            Import DB
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Version Information */}
      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          About
        </label>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400">App Version</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {CURRENT_VERSION}
            </span>
          </div>

          
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="help-title" className="flex items-center gap-2 text-lg font-semibold">
                <BookOpen className="h-5 w-5" /> Using Lute
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                aria-label="Close help"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm leading-relaxed">
              <section>
                <h4 className="mb-1 font-semibold">Read a book</h4>
                <p className="text-zinc-600 dark:text-zinc-300">Choose a book in Library, or upload an EPUB, Markdown, or text file. Tap a word to see its English translation and set its learning level.</p>
              </section>
              <section>
                <h4 className="mb-1 font-semibold">Turn pages</h4>
                <p className="text-zinc-600 dark:text-zinc-300">Tap the right side of the page to go forward and the left side to go back. Use the A− and A+ controls to change text size. The page counter shows your position.</p>
              </section>
              <section>
                <h4 className="mb-2 font-semibold">Word levels</h4>
                <dl className="space-y-2">
                  <div><dt className="inline font-semibold">1 · New</dt><dd className="inline text-zinc-600 dark:text-zinc-300"> — a word you do not know yet.</dd></div>
                  <div><dt className="inline font-semibold">2 · Learning</dt><dd className="inline text-zinc-600 dark:text-zinc-300"> — a word you are actively studying.</dd></div>
                  <div><dt className="inline font-semibold">3 · Familiar</dt><dd className="inline text-zinc-600 dark:text-zinc-300"> — a word you usually recognize.</dd></div>
                  <div><dt className="inline font-semibold">4 · Known</dt><dd className="inline text-zinc-600 dark:text-zinc-300"> — a word you know well.</dd></div>
                  <div><dt className="inline font-semibold">Ign · Ignore</dt><dd className="inline text-zinc-600 dark:text-zinc-300"> — leave this word out of your learning list.</dd></div>
                </dl>
                <p className="mt-2 text-xs text-zinc-500">Words are unmarked until you choose a level. English lookup requires an internet connection; you can also type or edit a translation.</p>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}