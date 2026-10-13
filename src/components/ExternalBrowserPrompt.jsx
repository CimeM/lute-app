import { BookOpen, Copy, ExternalLink, GraduationCap, Headphones, Languages, Library, Plane, TrendingUp } from 'lucide-react';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Read at your level',
    description: 'Find stories and books to meet you where you are, from A1 to C1.',
  },
  {
    icon: Library,
    title: 'Free books, ready to read',
    description: 'Start right away with free books already waiting in your library.',
  },
  {
    icon: Languages,
    title: 'Tap for a translation',
    description: 'Look up unfamiliar words without losing your place in the story.',
  },
  {
    icon: GraduationCap,
    title: 'Build your vocabulary',
    description: 'Mark words by how well you know them and grow at your own pace.',
  },
  {
    icon: Headphones,
    title: 'Hear pronunciation',
    description: 'Listen to words aloud as you read.',
  },
  {
    icon: TrendingUp,
    title: 'See your progress',
    description: 'Track the words you are learning in every book.',
  },
  {
    icon: Plane,
    title: 'Get a head start before you land',
    description: 'Make airport waiting time count with a few pages and new words in the language you are learning.',
  },
];

export function ExternalBrowserPrompt({
  isInstagramBrowser,
  isIOS,
  isAndroid,
  browserName,
  openInBrowserHref,
  onCopyLink,
  linkCopied,
  themeStyles,
}) {
  if (isInstagramBrowser) {
    return (
      <div className={`min-h-dvh w-full overflow-y-auto px-5 py-10 sm:px-8 ${themeStyles.bodyBg}`}>
        <main className="mx-auto w-full max-w-5xl">
          <section className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center sm:py-14">
            <img src="/icons/icon-192.png" alt="Lute" className="mb-5 h-16 w-16 rounded-2xl object-cover shadow-sm" />
            <h1 className="max-w-xl text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Your next language, one good read away.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              Build confidence with stories at your level and useful new words, whether you are learning for fun or getting ready to travel.
            </p>
            <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
              <a
                href={openInBrowserHref}
                target={isAndroid ? undefined : '_blank'}
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in browser
              </a>
              <button
                type="button"
                onClick={onCopyLink}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {linkCopied ? 'URL copied' : 'Copy URL'}
              </button>
            </div>
          </section>

          <section className="border-t border-zinc-200 py-9 dark:border-zinc-800 sm:py-12">
            <h2 className="text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Join thousands of language learners
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center px-4 py-8 ${themeStyles.bodyBg}`}>
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-xl backdrop-blur-sm ${themeStyles.modalBg}`}>
        <div className="mb-4 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Lute app</p>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Open in {browserName}</h1>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          This app&apos;s built-in browser can interrupt reading. Open the page in a regular browser to keep going.
        </p>

        <div className="space-y-3">
          <a
            href={openInBrowserHref}
            target={isAndroid ? undefined : '_blank'}
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Try opening in {browserName}
          </a>

          <button
            type="button"
            onClick={onCopyLink}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${themeStyles.navInactive}`}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {linkCopied ? 'Link copied' : 'Copy page link'}
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {isIOS
            ? 'If it stays here, tap the three dots in the top-right corner and choose “Open in Safari”.'
            : 'If it stays here, tap the menu and choose “Open in browser” or copy the link into your browser.'}
        </p>
      </div>
    </div>
  );
}